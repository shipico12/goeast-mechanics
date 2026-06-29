/* =========================================================
   ADMIN MECHANIC JOB BOARD MODULE
   File: js/admin-mechanic-board.js

   Purpose:
   - Shows active workshop jobs.
   - Lets mechanics update repair progress only.
   - Keeps pricing away from mechanics for cleaner business workflow.

   Business rule:
   Mechanics should focus on repair work, not billing.
   Pricing stays in Service Requests, Invoices, and Payments.
   ========================================================= */

   let mechanicBoardJobs = [];
   let mechanicBoardUpdates = [];
   
   const mechanicJobsContainer = document.getElementById("mechanicJobsList");
   
   
   async function loadMechanicBoard() {
     if (!mechanicJobsContainer) return;
   
     mechanicJobsContainer.innerHTML = `<p class="empty-message">Loading mechanic jobs...</p>`;
   
     if (!["developer", "upper_admin", "mechanic"].includes(currentProfile.role)) {
       mechanicJobsContainer.innerHTML = `
         <p class="empty-message">
           Mechanic job board is reserved for mechanics and authorized staff.
         </p>
       `;
       return;
     }
   
     const { data: jobs, error: jobsError } = await supabaseClient
       .from("service_requests")
       .select(`
         id,
         created_at,
         name,
         email,
         phone,
         vehicle,
         message,
         status,
         priority,
         admin_notes
       `)
       .in("status", [
         "new",
         "acknowledged",
         "diagnosing",
         "waiting_parts",
         "repairing",
         "testing",
         "ready_for_pickup"
       ])
       .order("created_at", { ascending: false });
   
     if (jobsError) {
       mechanicJobsContainer.innerHTML = `
         <p class="empty-message">
           Could not load mechanic jobs: ${escapeHtml(jobsError.message)}
         </p>
       `;
       return;
     }
   
     mechanicBoardJobs = jobs || [];
   
     await loadMechanicBoardUpdates();
     renderMechanicBoard();
   }
   
   
   async function loadMechanicBoardUpdates() {
     mechanicBoardUpdates = [];
   
     if (mechanicBoardJobs.length === 0) return;
   
     const jobIds = mechanicBoardJobs.map((job) => job.id);
   
     const { data, error } = await supabaseClient
       .from("repair_updates")
       .select("id, service_request_id, title, message, visible_to_customer, created_at")
       .in("service_request_id", jobIds)
       .order("created_at", { ascending: false });
   
     if (error) {
       console.error("Could not load mechanic repair updates:", error.message);
       return;
     }
   
     mechanicBoardUpdates = data || [];
   }
   
   
   function renderMechanicBoard() {
     if (!mechanicJobsContainer) return;
   
     if (mechanicBoardJobs.length === 0) {
       mechanicJobsContainer.innerHTML = `
         <div class="module-card">
           <h3>No active mechanic jobs</h3>
           <p>Active workshop jobs will appear here when vehicles are being worked on.</p>
         </div>
       `;
       return;
     }
   
     mechanicJobsContainer.innerHTML = "";
   
     mechanicBoardJobs.forEach((job) => {
       const status = job.status || "new";
       const latestUpdate = getLatestMechanicUpdate(job.id);
   
       const card = document.createElement("div");
       card.className = "request-card mechanic-job-card";
   
       card.innerHTML = `
         <div class="card-top">
           <div>
             <h3>${safeText(job.vehicle, "Vehicle")}</h3>
             <p>${safeText(job.name, "Customer")} • ${safeText(job.phone, "No phone")}</p>
           </div>
   
           <span class="status-badge status-${escapeHtml(status)}">
             ${safeText(status.replaceAll("_", " "))}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Customer</strong><br>${safeText(job.name, "-")}</p>
           <p><strong>Email</strong><br>${safeText(job.email, "-")}</p>
           <p><strong>Phone</strong><br>${safeText(job.phone, "-")}</p>
           <p><strong>Submitted</strong><br>${formatDate(job.created_at)}</p>
           <p><strong>Priority</strong><br>${safeText(job.priority || "normal")}</p>
         </div>
   
         <div class="card-message">
           <strong>Customer Problem</strong>
           <p>${safeText(job.message, "No problem description provided.")}</p>
         </div>
   
         <div class="card-notes">
           <strong>Latest Repair Update</strong>
           ${latestUpdate ? `
             <p>${safeText(latestUpdate.message)}</p>
             <small>
               ${safeText(latestUpdate.title || "update")} •
               ${formatDate(latestUpdate.created_at)} •
               ${latestUpdate.visible_to_customer ? "Customer visible" : "Internal only"}
             </small>
           ` : `
             <p>No repair updates saved yet.</p>
           `}
         </div>
   
         <div class="mechanic-form-grid">
           <label>
             Status
             <select id="mechanicStatus-${job.id}">
               ${renderMechanicStatusOptions(status)}
             </select>
           </label>
   
           <label class="mechanic-update-field">
             Repair Update
             <textarea
               id="mechanicMessage-${job.id}"
               placeholder="Example: Diagnosed overheating issue. Replaced thermostat. Vehicle is now being tested."
             ></textarea>
           </label>
   
           <label class="checkbox-label">
             <input type="checkbox" id="mechanicInternal-${job.id}">
             Internal note only
           </label>
   
           <button class="save-btn" onclick="saveMechanicBoardUpdate(${job.id}, this)">
             Save Job Update
           </button>
         </div>
       `;
   
       mechanicJobsContainer.appendChild(card);
     });
   }
   
   
   function renderMechanicStatusOptions(currentStatus) {
     const statuses = [
       ["new", "New"],
       ["acknowledged", "Acknowledged"],
       ["diagnosing", "Diagnosing"],
       ["waiting_parts", "Waiting Parts"],
       ["repairing", "Repairing"],
       ["testing", "Testing"],
       ["ready_for_pickup", "Ready For Pickup"],
       ["closed", "Closed"],
       ["cancelled", "Cancelled"]
     ];
   
     return statuses.map(([value, label]) => {
       const selected = value === currentStatus ? "selected" : "";
       return `<option value="${value}" ${selected}>${label}</option>`;
     }).join("");
   }
   
   
   async function saveMechanicBoardUpdate(jobId, button) {
     const statusInput = document.getElementById(`mechanicStatus-${jobId}`);
     const messageInput = document.getElementById(`mechanicMessage-${jobId}`);
     const internalInput = document.getElementById(`mechanicInternal-${jobId}`);
   
     if (!statusInput || !messageInput || !internalInput) {
       alert("Could not find mechanic update form fields.");
       return;
     }
   
     const statusValue = statusInput.value;
     const messageValue = messageInput.value.trim();
     const internalOnly = internalInput.checked;
   
     if (!messageValue) {
       alert("Please enter a repair update before saving.");
       return;
     }
   
     button.disabled = true;
     button.textContent = "Saving...";
   
     const { error: requestError } = await supabaseClient
       .from("service_requests")
       .update({
         status: statusValue,
         updated_by: currentProfile.id,
         updated_at: new Date().toISOString()
       })
       .eq("id", jobId);
   
     if (requestError) {
       alert("Could not update job: " + requestError.message);
       button.disabled = false;
       button.textContent = "Save Job Update";
       return;
     }
   
     const { error: updateError } = await supabaseClient.rpc("save_repair_update", {
       p_service_request_id: Number(jobId),
       p_status: statusValue,
       p_message: messageValue,
       p_internal_only: internalOnly
     });
   
     if (updateError) {
       alert("Job status saved, but repair note failed: " + updateError.message);
       button.disabled = false;
       button.textContent = "Save Job Update";
       return;
     }
   
     alert("Mechanic job update saved successfully.");
   
     button.disabled = false;
     button.textContent = "Save Job Update";
   
     await loadMechanicBoard();
   
     if (typeof loadServiceRequests === "function") {
       await loadServiceRequests();
     }
   
     if (typeof loadDashboardStats === "function") {
       await loadDashboardStats();
     }
   }
   
   
   function getLatestMechanicUpdate(jobId) {
     return mechanicBoardUpdates.find((update) => {
       return Number(update.service_request_id) === Number(jobId);
     });
   }