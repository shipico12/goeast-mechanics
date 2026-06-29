/* =========================================================
   ADMIN / STAFF DASHBOARD CONTROLLER
   File: js/admin.js
   ========================================================= */

   const adminName = document.getElementById("adminName");
   const adminEmail = document.getElementById("adminEmail");
   const adminRoleBadge = document.getElementById("adminRoleBadge");
   const profileInitials = document.getElementById("profileInitials");
   const staffRoleLabel = document.getElementById("staffRoleLabel");
   const sidebarRoleLabel = document.getElementById("sidebarRoleLabel");
   const staffDashboardTitle = document.getElementById("staffDashboardTitle");
   const dashboardSubtitle = document.getElementById("dashboardSubtitle");
   const dashboardSectionTitle = document.getElementById("dashboardSectionTitle");
   const roleNotice = document.getElementById("roleNotice");
   const permissionNotice = document.getElementById("permissionNotice");
   const logoutBtn = document.getElementById("logoutBtn");
   
   const navButtons = document.querySelectorAll(".nav-btn");
   const sections = document.querySelectorAll(".admin-section");
   
   const totalRequests = document.getElementById("totalRequests");
   const newRequests = document.getElementById("newRequests");
   const acknowledgedRequests = document.getElementById("acknowledgedRequests");
   const ongoingRequests = document.getElementById("ongoingRequests");
   const finishedRequests = document.getElementById("finishedRequests");
   const canceledRequests = document.getElementById("canceledRequests");
   const inventoryCount = document.getElementById("inventoryCount");
   const lowStockCount = document.getElementById("lowStockCount");
   const paidInvoices = document.getElementById("paidInvoices");
   
   const requestsList = document.getElementById("requestsList");
   const requestSearch = document.getElementById("requestSearch");
   const requestStatusFilter = document.getElementById("requestStatusFilter");
   const refreshRequestsBtn = document.getElementById("refreshRequestsBtn");
   
   let currentUser = null;
   let currentProfile = null;
   let allRequests = [];
   let repairUpdatesByRequest = {};
   
   function hasFullAccess() {
     return currentProfile && FULL_ACCESS_ROLES.includes(currentProfile.role);
   }
   
   function isDeveloper() {
     return currentProfile && currentProfile.role === ROLES.DEVELOPER;
   }
   
   function isUpperAdmin() {
     return currentProfile && currentProfile.role === ROLES.UPPER_ADMIN;
   }
   
   function isReceptionist() {
     return currentProfile && currentProfile.role === ROLES.RECEPTIONIST;
   }
   
   function isMechanic() {
     return currentProfile && currentProfile.role === ROLES.MECHANIC;
   }
   
   function canSaveRepairUpdate() {
     return currentProfile && ["developer", "upper_admin", "mechanic", "receptionist"].includes(currentProfile.role);
   }
   
   function roleAllowsElement(element) {
     if (!currentProfile || !element.dataset.roles) return true;
     return element.dataset.roles.split(",").includes(currentProfile.role);
   }
   
   function showSection(sectionId) {
     const button = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
     const section = document.getElementById(sectionId);
   
     if (!button || !section || !roleAllowsElement(button)) return;
   
     navButtons.forEach((btn) => btn.classList.remove("active"));
     sections.forEach((item) => item.classList.remove("active-section"));
   
     button.classList.add("active");
     section.classList.add("active-section");
   }
   
   function applyRoleUI() {
     document.querySelectorAll("[data-roles]").forEach((element) => {
       element.classList.toggle("hidden", !roleAllowsElement(element));
     });
   
     if (isDeveloper()) {
       staffDashboardTitle.textContent = "Developer Control Center";
       dashboardSectionTitle.textContent = "System Overview";
       dashboardSubtitle.textContent = "Full platform access.";
       roleNotice.textContent = "Developer access is unrestricted. Use carefully.";
       roleNotice.classList.remove("hidden");
     } else if (isUpperAdmin()) {
       staffDashboardTitle.textContent = "Upper Admin Dashboard";
       dashboardSectionTitle.textContent = "Business Overview";
       dashboardSubtitle.textContent = "Business operations workspace.";
       roleNotice.textContent = "Upper Admin can manage business records.";
       roleNotice.classList.remove("hidden");
     } else if (isReceptionist()) {
       staffDashboardTitle.textContent = "Reception Dashboard";
       dashboardSectionTitle.textContent = "Front Desk Overview";
       dashboardSubtitle.textContent = "Service requests, customer check-in, and pickup updates.";
       roleNotice.textContent = "Receptionist can acknowledge requests and update customer-facing progress.";
       permissionNotice.textContent = "Receptionist cannot edit inventory, invoices, payments, or developer settings.";
       roleNotice.classList.remove("hidden");
       permissionNotice.classList.remove("hidden");
     } else if (isMechanic()) {
       staffDashboardTitle.textContent = "Mechanic Dashboard";
       dashboardSectionTitle.textContent = "Workshop Overview";
       dashboardSubtitle.textContent = "Repair progress and mechanic updates.";
       roleNotice.textContent = "Mechanic can update repair progress and notes.";
       roleNotice.classList.remove("hidden");
     }
   }
   
   function firstAllowedSection() {
     const firstButton = Array.from(navButtons).find((button) => roleAllowsElement(button));
     return firstButton ? firstButton.dataset.section : "dashboardSection";
   }
   
   navButtons.forEach((button) => {
     button.addEventListener("click", function () {
       showSection(button.getAttribute("data-section"));
     });
   });
   
   async function checkStaffAccess() {
     const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
   
     if (sessionError || !sessionData.session) {
       window.location.href = "login.html";
       return;
     }
   
     currentUser = sessionData.session.user;
   
     const { data: profile, error: profileError } = await supabaseClient
       .from("profiles")
       .select("id, full_name, role")
       .eq("id", currentUser.id)
       .single();
   
     if (profileError || !profile || !STAFF_ROLES.includes(profile.role)) {
       alert("Access denied. Staff only.");
       window.location.href = "customer.html";
       return;
     }
   
     currentProfile = profile;
     const displayName = profile.full_name || currentUser.email;
   
     adminName.textContent = displayName;
     adminEmail.textContent = currentUser.email;
     adminRoleBadge.textContent = formatRole(profile.role);
     staffRoleLabel.textContent = formatRole(profile.role);
     sidebarRoleLabel.textContent = formatRole(profile.role);
     profileInitials.textContent = getInitials(displayName);
   
     applyRoleUI();
     showSection(firstAllowedSection());
   
     await loadServiceRequests();
     subscribeStaffRealtime();
   }
   
   function getInitials(value) {
     const parts = String(value || "U").trim().split(/\s+/);
     if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
     return parts[0].slice(0, 2).toUpperCase();
   }
   
   async function loadServiceRequests() {
     if (!requestsList) return;
   
     requestsList.innerHTML = `<p class="empty-message">Loading service requests...</p>`;
   
     const { data, error } = await supabaseClient
       .from("service_requests")
       .select("id, created_at, name, email, phone, vehicle, message, status, priority, admin_notes, estimated_cost, final_cost")
       .order("created_at", { ascending: false });
   
     if (error) {
       requestsList.innerHTML = `<p class="empty-message">Could not load requests: ${escapeHtml(error.message)}</p>`;
       return;
     }
   
     allRequests = data || [];
   
     await loadRepairUpdates();
   
     updateDashboardStats();
     renderServiceRequests();
   }
   
   async function loadRepairUpdates() {
     repairUpdatesByRequest = {};
   
     if (allRequests.length === 0) return;
   
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
   
   function countByStatus(status) {
     return allRequests.filter((request) => (request.status || "new") === status).length;
   }
   
   function updateDashboardStats() {
     if (totalRequests) totalRequests.textContent = allRequests.length;
     if (newRequests) newRequests.textContent = countByStatus("new");
     if (acknowledgedRequests) acknowledgedRequests.textContent = countByStatus("acknowledged");
   
     if (ongoingRequests) {
       ongoingRequests.textContent =
         countByStatus("diagnosing") +
         countByStatus("waiting_parts") +
         countByStatus("repairing");
     }
   
     if (finishedRequests) {
       finishedRequests.textContent =
         countByStatus("ready_for_pickup") +
         countByStatus("closed");
     }
   
     if (canceledRequests) canceledRequests.textContent = countByStatus("cancelled");
     if (inventoryCount) inventoryCount.textContent = "Ready";
     if (lowStockCount) lowStockCount.textContent = "Ready";
     if (paidInvoices) paidInvoices.textContent = "Manual";
   }
   
   function renderServiceRequests() {
     if (!requestsList) return;
   
     const searchText = requestSearch ? requestSearch.value.trim().toLowerCase() : "";
     const selectedStatus = requestStatusFilter ? requestStatusFilter.value : "all";
   
     const filteredRequests = allRequests.filter((request) => {
       const searchableText =
         `${request.name || ""} ${request.email || ""} ${request.phone || ""} ${request.vehicle || ""} ${request.message || ""} ${request.status || ""}`.toLowerCase();
   
       return (
         searchableText.includes(searchText) &&
         (selectedStatus === "all" || (request.status || "new") === selectedStatus)
       );
     });
   
     if (filteredRequests.length === 0) {
       requestsList.innerHTML = `<p class="empty-message">No service requests found.</p>`;
       return;
     }
   
     requestsList.innerHTML = "";
   
     filteredRequests.forEach((request) => {
       const status = request.status || "new";
       const priority = request.priority || "normal";
   
       const card = document.createElement("div");
       card.className = "request-card";
   
       card.innerHTML = `
         <div class="card-top">
           <div>
             <h3>${safeText(request.name, "No Name")}</h3>
             <p>${safeText(request.vehicle, "Vehicle not provided")}</p>
           </div>
           <span class="status-badge status-${escapeHtml(status)}">
             ${escapeHtml(status.replaceAll("_", " "))}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Email:</strong> ${safeText(request.email)}</p>
           <p><strong>Phone:</strong> ${safeText(request.phone)}</p>
           <p><strong>Date:</strong> ${formatDate(request.created_at)}</p>
           <p><strong>Priority:</strong> <span class="priority-badge priority-${escapeHtml(priority)}">${escapeHtml(priority)}</span></p>
           ${hasFullAccess() ? `<p><strong>Estimated:</strong> ${money(request.estimated_cost)}</p><p><strong>Final:</strong> ${money(request.final_cost)}</p>` : ""}
         </div>
   
         <div class="card-message">
           <strong>Customer Message:</strong>
           <p>${safeText(request.message, "No message provided.")}</p>
         </div>
   
         ${hasFullAccess() ? `
           <div class="card-notes">
             <strong>Admin Notes:</strong>
             <p>${safeText(request.admin_notes, "No admin notes yet.")}</p>
           </div>
         ` : ""}
   
         ${renderUpdateHistory(request.id)}
   
         ${canSaveRepairUpdate() ? renderRepairUpdateForm(request, status, priority) : ""}
       `;
   
       requestsList.appendChild(card);
     });
   
     bindRequestButtons();
   }
   
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
       const visibility = update.visible_to_customer ? "Customer visible" : "Internal only";
   
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
   
   function bindRequestButtons() {
     document.querySelectorAll(".save-repair-update-btn").forEach((button) => {
       button.addEventListener("click", async function () {
         await saveRepairUpdate(button.getAttribute("data-id"), button);
       });
     });
   }
   
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
   
   function subscribeStaffRealtime() {
     supabaseClient
       .channel("staff-dashboard")
       .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, loadServiceRequests)
       .on("postgres_changes", { event: "*", schema: "public", table: "repair_updates" }, loadServiceRequests)
       .subscribe();
   }
   
   if (requestSearch) requestSearch.addEventListener("input", renderServiceRequests);
   if (requestStatusFilter) requestStatusFilter.addEventListener("change", renderServiceRequests);
   if (refreshRequestsBtn) refreshRequestsBtn.addEventListener("click", loadServiceRequests);
   
   logoutBtn.addEventListener("click", async function () {
     await supabaseClient.auth.signOut();
     window.location.href = "login.html";
   });
   
   checkStaffAccess();