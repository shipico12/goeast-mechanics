/* =========================================================
   ADMIN SERVICE REQUESTS MODULE
   File: js/admin-requests.js

   Purpose:
   Handles service request loading, searching, filtering, rendering,
   and realtime refreshes.

   Responsibilities:
   - Load service requests from Supabase.
   - Apply Active / Closed / All filters.
   - Render request cards.
   - Show repair update history.
   - Show repair update form.
   - Connect filter/search/refresh events.

   This file depends on:
   - auth-config.js for helpers: safeText, escapeHtml, money, formatDate
   - admin-auth.js for role helpers: hasFullAccess, canSaveRepairUpdate
   - admin-dashboard.js for updateDashboardStats
   - admin-updates.js for repair update functions
   ========================================================= */


/* =========================================================
   1. HTML ELEMENT REFERENCES

   These are the request-specific DOM elements.
   ========================================================= */

   const requestsList = document.getElementById("requestsList");
   const requestSearch = document.getElementById("requestSearch");
   const requestStatusFilter = document.getElementById("requestStatusFilter");
   const refreshRequestsBtn = document.getElementById("refreshRequestsBtn");
   
   
   /* =========================================================
      2. REQUEST STATE
   
      allRequests stores the current service request records loaded
      from Supabase.
   
      Other modules, especially admin-dashboard.js and admin-updates.js,
      also read this value.
      ========================================================= */
   
   let allRequests = [];
   
   
   /* =========================================================
      3. LOAD SERVICE REQUESTS
   
      Loads all service requests visible to the current staff user.
   
      Database RLS still controls what the user is truly allowed to see.
      The frontend only presents the records returned by Supabase.
      ========================================================= */
   
   async function loadServiceRequests() {
     if (!requestsList) return;
   
     requestsList.innerHTML = `<p class="empty-message">Loading service requests...</p>`;
   
     const { data, error } = await supabaseClient
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
         admin_notes,
         estimated_cost,
         final_cost
       `)
       .order("created_at", { ascending: false });
   
     if (error) {
       requestsList.innerHTML = `
         <p class="empty-message">
           Could not load requests: ${escapeHtml(error.message)}
         </p>
       `;
       return;
     }
   
     allRequests = data || [];
   
     /*
       Repair updates are loaded after requests because updates are grouped
       by service_request_id.
     */
     if (typeof loadRepairUpdates === "function") {
       await loadRepairUpdates();
     }
   
     if (typeof updateDashboardStats === "function") {
       updateDashboardStats();
     }
   
     renderServiceRequests();
   }
   
   
   /* =========================================================
      4. FILTER REQUESTS
   
      This is where we avoid a separate archive table.
   
      active:
      - Shows everything except closed/cancelled.
   
      closed:
      - Shows only closed jobs.
   
      all:
      - Shows every job.
   
      specific status:
      - Shows only that status.
      ========================================================= */
   
   function getFilteredRequests() {
     const searchText = requestSearch
       ? requestSearch.value.trim().toLowerCase()
       : "";
   
     const selectedStatus = requestStatusFilter
       ? requestStatusFilter.value
       : "active";
   
     return allRequests.filter((request) => {
       const status = request.status || "new";
   
       const searchableText = `
         ${request.name || ""}
         ${request.email || ""}
         ${request.phone || ""}
         ${request.vehicle || ""}
         ${request.message || ""}
         ${status}
       `.toLowerCase();
   
       const matchesSearch = searchableText.includes(searchText);
   
       let matchesStatus = true;
   
       if (selectedStatus === "active") {
         matchesStatus = !["closed", "cancelled"].includes(status);
       } else if (selectedStatus === "all") {
         matchesStatus = true;
       } else {
         matchesStatus = status === selectedStatus;
       }
   
       return matchesSearch && matchesStatus;
     });
   }
   
   
   /* =========================================================
      5. RENDER SERVICE REQUESTS
   
      Converts filtered request data into HTML cards.
      ========================================================= */
   
   function renderServiceRequests() {
     if (!requestsList) return;
   
     const filteredRequests = getFilteredRequests();
   
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
   
           <p>
             <strong>Priority:</strong>
             <span class="priority-badge priority-${escapeHtml(priority)}">
               ${escapeHtml(priority)}
             </span>
           </p>
   
           ${
             hasFullAccess()
               ? `
                 <p><strong>Estimated:</strong> ${money(request.estimated_cost)}</p>
                 <p><strong>Final:</strong> ${money(request.final_cost)}</p>
               `
               : ""
           }
         </div>
   
         <div class="card-message">
           <strong>Customer Message:</strong>
           <p>${safeText(request.message, "No message provided.")}</p>
         </div>
   
         ${
           hasFullAccess()
             ? `
               <div class="card-notes">
                 <strong>Admin Notes:</strong>
                 <p>${safeText(request.admin_notes, "No admin notes yet.")}</p>
               </div>
             `
             : ""
         }
   
         ${
           typeof renderUpdateHistory === "function"
             ? renderUpdateHistory(request.id)
             : ""
         }
   
         ${
           canSaveRepairUpdate() && typeof renderRepairUpdateForm === "function"
             ? renderRepairUpdateForm(request, status, priority)
             : ""
         }
       `;
   
       requestsList.appendChild(card);
     });
   
     if (typeof bindRepairUpdateButtons === "function") {
       bindRepairUpdateButtons();
     }
   }
   
   
   /* =========================================================
      6. REALTIME SUBSCRIPTION
   
      This listens for database changes and refreshes the request list.
   
      Result:
      - Staff dashboard updates when requests change.
      - Repair updates appear after they are saved.
      ========================================================= */
   
   function subscribeStaffRealtime() {
     supabaseClient
       .channel("staff-dashboard")
       .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "service_requests" },
         loadServiceRequests
       )
       .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "repair_updates" },
         loadServiceRequests
       )
       .subscribe();
   }
   
   
   /* =========================================================
      7. FILTER / SEARCH / REFRESH EVENT BINDINGS
   
      These events are attached once when the file loads.
      ========================================================= */
   
   if (requestSearch) {
     requestSearch.addEventListener("input", renderServiceRequests);
   }
   
   if (requestStatusFilter) {
     requestStatusFilter.addEventListener("change", renderServiceRequests);
   }
   
   if (refreshRequestsBtn) {
     refreshRequestsBtn.addEventListener("click", loadServiceRequests);
   }