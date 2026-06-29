/* =========================================================
   ADMIN REPAIR UPDATES MODULE
   File: js/admin-updates.js

   Purpose:
   Handles repair update history and saving repair progress.

   Main idea:
   Staff should only need to choose a status, write one update,
   and click Save. The customer can see the update unless staff
   marks it as internal only.
   ========================================================= */


/* =========================================================
   1. REPAIR UPDATE STATE

   repairUpdatesByRequest stores updates grouped by service request ID.

   Example:
   {
     12: [update1, update2],
     15: [update1]
   }
   ========================================================= */

   let repairUpdatesByRequest = {};


   /* =========================================================
      2. LOAD REPAIR UPDATES
   
      This loads all repair updates connected to the service requests
      currently displayed in the admin dashboard.
   
      Staff can see customer-visible and internal-only notes.
      ========================================================= */
   
   async function loadRepairUpdates() {
     repairUpdatesByRequest = {};
   
     if (!allRequests || allRequests.length === 0) {
       return;
     }
   
     const requestIds = allRequests.map((request) => request.id);
   
     const { data, error } = await supabaseClient
       .from("repair_updates")
       .select("id, service_request_id, title, message, visible_to_customer, created_at")
       .in("service_request_id", requestIds)
       .order("created_at", { ascending: false });
   
     if (error) {
       console.error("Could not load repair updates:", error.message);
       return;
     }
   
     (data || []).forEach((update) => {
       if (!repairUpdatesByRequest[update.service_request_id]) {
         repairUpdatesByRequest[update.service_request_id] = [];
       }
   
       repairUpdatesByRequest[update.service_request_id].push(update);
     });
   }
   
   
   /* =========================================================
      3. RENDER UPDATE HISTORY
   
      This creates the visible update trail under each request card.
   
      Staff sees:
      - Status title
      - Date/time
      - Whether customer can see it
      - Update message
      ========================================================= */
   
   function renderUpdateHistory(requestId) {
     const updates = repairUpdatesByRequest[requestId] || [];
   
     if (updates.length === 0) {
       return `
         <div class="card-notes">
           <strong>Update History:</strong>
           <p>No repair updates saved yet.</p>
         </div>
       `;
     }
   
     const items = updates.map((update) => {
       const visibility = update.visible_to_customer
         ? "Customer visible"
         : "Internal only";
   
       return `
         <div class="timeline-item">
           <strong>${safeText((update.title || "update").replaceAll("_", " "))}</strong>
           <small>${formatDate(update.created_at)} • ${visibility}</small>
           <p>${safeText(update.message)}</p>
         </div>
       `;
     }).join("");
   
     return `
       <div class="card-notes">
         <strong>Update History:</strong>
         <div class="timeline-list">
           ${items}
         </div>
       </div>
     `;
   }
   
   
   /* =========================================================
      4. RENDER REPAIR UPDATE FORM
   
      This is the simple workflow form shown on each request card.
   
      Staff can:
      - Change status
      - Add repair update
      - Mark update internal-only
      - Developer/Upper Admin can also edit priority and costs
      ========================================================= */
   
   function renderRepairUpdateForm(request, status, priority) {
     return `
       <div class="action-row repair-update-box">
         <label>
           Status
           <select class="status-select" data-id="${request.id}">
             <option value="new" ${status === "new" ? "selected" : ""}>New</option>
             <option value="acknowledged" ${status === "acknowledged" ? "selected" : ""}>Acknowledged</option>
             <option value="diagnosing" ${status === "diagnosing" ? "selected" : ""}>Diagnosing</option>
             <option value="waiting_parts" ${status === "waiting_parts" ? "selected" : ""}>Waiting Parts</option>
             <option value="repairing" ${status === "repairing" ? "selected" : ""}>Repairing</option>
             <option value="ready_for_pickup" ${status === "ready_for_pickup" ? "selected" : ""}>Ready for Pickup</option>
             <option value="closed" ${status === "closed" ? "selected" : ""}>Closed</option>
             <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
           </select>
         </label>
   
         ${hasFullAccess() ? `
           <label>
             Priority
             <select class="priority-select" data-id="${request.id}">
               <option value="low" ${priority === "low" ? "selected" : ""}>Low</option>
               <option value="normal" ${priority === "normal" ? "selected" : ""}>Normal</option>
               <option value="high" ${priority === "high" ? "selected" : ""}>High</option>
               <option value="urgent" ${priority === "urgent" ? "selected" : ""}>Urgent</option>
             </select>
           </label>
   
           <label>
             Estimated Cost
             <input class="estimated-cost-input" data-id="${request.id}" type="number" min="0" step="0.01" value="${Number(request.estimated_cost || 0)}">
           </label>
   
           <label>
             Final Cost
             <input class="final-cost-input" data-id="${request.id}" type="number" min="0" step="0.01" value="${Number(request.final_cost || 0)}">
           </label>
         ` : ""}
   
         <label class="wide-field">
           Repair Update
           <textarea class="repair-update-input" data-id="${request.id}" placeholder="Example: Mechanic has started checking the overheating issue."></textarea>
         </label>
   
         <label class="checkbox-line">
           <input type="checkbox" class="internal-only-checkbox" data-id="${request.id}">
           Internal note only
         </label>
   
         <button class="save-repair-update-btn" data-id="${request.id}">
           Save Update
         </button>
       </div>
     `;
   }
   
   
   /* =========================================================
      5. SAVE REPAIR UPDATE
   
      This saves the status and note in one action by calling the
      Supabase function save_repair_update().
   
      Developer/Upper Admin can also save priority and cost fields.
      ========================================================= */
   
   async function saveRepairUpdate(requestId, button) {
     const statusValue = document.querySelector(`.status-select[data-id="${requestId}"]`).value;
     const messageValue = document.querySelector(`.repair-update-input[data-id="${requestId}"]`).value.trim();
     const internalOnly = document.querySelector(`.internal-only-checkbox[data-id="${requestId}"]`).checked;
   
     if (!messageValue) {
       alert("Please write a repair update before saving.");
       return;
     }
   
     button.disabled = true;
     button.textContent = "Saving...";
   
     if (hasFullAccess()) {
       const priorityValue = document.querySelector(`.priority-select[data-id="${requestId}"]`).value;
       const estimatedCostValue = document.querySelector(`.estimated-cost-input[data-id="${requestId}"]`).value;
       const finalCostValue = document.querySelector(`.final-cost-input[data-id="${requestId}"]`).value;
   
       const { error: requestUpdateError } = await supabaseClient
         .from("service_requests")
         .update({
           priority: priorityValue,
           estimated_cost: Number(estimatedCostValue || 0),
           final_cost: Number(finalCostValue || 0)
         })
         .eq("id", requestId);
   
       if (requestUpdateError) {
         alert("Could not update costs/priority: " + requestUpdateError.message);
         button.disabled = false;
         button.textContent = "Save Update";
         return;
       }
     }
   
     const { error } = await supabaseClient.rpc("save_repair_update", {
       p_service_request_id: Number(requestId),
       p_status: statusValue,
       p_message: messageValue,
       p_internal_only: internalOnly
     });
   
     if (error) {
       alert("Could not save update: " + error.message);
     } else {
       alert("Repair update saved successfully.");
       await loadServiceRequests();
     }
   
     button.disabled = false;
     button.textContent = "Save Update";
   }
   
   
   /* =========================================================
      6. BUTTON BINDINGS
   
      This attaches click events after request cards are rendered.
      ========================================================= */
   
   function bindRepairUpdateButtons() {
     document.querySelectorAll(".save-repair-update-btn").forEach((button) => {
       button.addEventListener("click", async function () {
         await saveRepairUpdate(button.getAttribute("data-id"), button);
       });
     });
   }