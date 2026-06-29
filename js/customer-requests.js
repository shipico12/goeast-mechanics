/* =========================================================
   CUSTOMER REQUESTS MODULE
   File: js/customer-requests.js

   Purpose:
   - Loads the logged-in customer’s service requests.
   - Loads customer-visible repair updates.
   - Splits requests into Current Repairs and Service History.
   - Updates dashboard request statistics.

   Notes:
   - This file depends on shared state from customer-auth.js:
     currentUser, customerRequests, repairUpdatesByRequest.
   ========================================================= */


/* =========================================================
   1. LOAD CUSTOMER SERVICE REQUESTS
   ========================================================= */

   async function loadCustomerRequests() {
    if (!currentUser) return;
  
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
        admin_notes,
        estimated_cost,
        final_cost
      `)
      .eq("email", currentUser.email)
      .order("created_at", { ascending: false });
  
    if (error) {
      if (requestsContainer) {
        requestsContainer.innerHTML = `
          <div class="empty-message">${escapeHtml(error.message)}</div>
        `;
      }
      return;
    }
  
    customerRequests = data || [];
  }
  
  
  /* =========================================================
     2. LOAD CUSTOMER-VISIBLE REPAIR UPDATES
     ========================================================= */
  
  async function loadCustomerRepairUpdates() {
    repairUpdatesByRequest = {};
  
    if (customerRequests.length === 0) {
      renderCustomerRequests();
      return;
    }
  
    const requestIds = customerRequests.map((request) => request.id);
  
    const { data, error } = await supabaseClient
      .from("repair_updates")
      .select("id, service_request_id, title, message, visible_to_customer, created_at")
      .in("service_request_id", requestIds)
      .eq("visible_to_customer", true)
      .order("created_at", { ascending: false });
  
    if (error) {
      console.error("Could not load customer repair updates:", error.message);
      renderCustomerRequests();
      return;
    }
  
    (data || []).forEach((update) => {
      if (!repairUpdatesByRequest[update.service_request_id]) {
        repairUpdatesByRequest[update.service_request_id] = [];
      }
  
      repairUpdatesByRequest[update.service_request_id].push(update);
    });
  
    renderCustomerRequests();
  }
  
  
  /* =========================================================
     3. RENDER CUSTOMER REQUESTS
     ========================================================= */
  
  function renderCustomerRequests() {
    if (!requestsContainer) return;
  
    if (customerRequests.length === 0) {
      requestsContainer.innerHTML = `<div class="empty-message">No service requests yet.</div>`;
      return;
    }
  
    const currentRepairs = customerRequests.filter((request) => {
      const status = request.status || "new";
      return !["closed", "cancelled"].includes(status);
    });
  
    const serviceHistory = customerRequests.filter((request) => {
      const status = request.status || "new";
      return ["closed", "cancelled"].includes(status);
    });
  
    requestsContainer.innerHTML = `
      <div class="customer-subsection">
        <h3>Current Repairs</h3>
        <div id="currentRepairsList"></div>
      </div>
  
      <div class="customer-subsection">
        <h3>Service History</h3>
        <div id="serviceHistoryList"></div>
      </div>
    `;
  
    renderCustomerRequestGroup("currentRepairsList", currentRepairs, "No active repairs right now.");
    renderCustomerRequestGroup("serviceHistoryList", serviceHistory, "No completed service history yet.");
  }
  
  
  /* =========================================================
     4. RENDER ONE REQUEST GROUP
     ========================================================= */
  
  function renderCustomerRequestGroup(containerId, group, emptyMessage) {
    const container = document.getElementById(containerId);
  
    if (!container) return;
  
    if (group.length === 0) {
      container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      return;
    }
  
    container.innerHTML = "";
  
    group.forEach((request) => {
      const status = request.status || "new";
  
      const card = document.createElement("div");
      card.className = "request-card";
  
      card.innerHTML = `
        <div class="card-top">
          <h3>${safeText(request.vehicle, "Vehicle")}</h3>
          <span class="status-badge status-${escapeHtml(status)}">
            ${escapeHtml(status.replaceAll("_", " "))}
          </span>
        </div>
  
        <div class="card-grid">
          <p><strong>Submitted</strong><br>${formatDate(request.created_at)}</p>
          <p><strong>Name</strong><br>${safeText(request.name)}</p>
          <p><strong>Phone</strong><br>${safeText(request.phone, "-")}</p>
          <p><strong>Vehicle</strong><br>${safeText(request.vehicle, "-")}</p>
          <p><strong>Estimated Cost</strong><br>${money(request.estimated_cost)}</p>
          <p><strong>Final Cost</strong><br>${money(request.final_cost)}</p>
        </div>
  
        <div class="card-message">
          <strong>Problem Reported</strong>
          <p>${safeText(request.message, "No message provided.")}</p>
        </div>
  
        ${renderCustomerLatestUpdate(request.id)}
        ${renderCustomerRepairTimeline(request.id)}
      `;
  
      container.appendChild(card);
    });
  }
  
  
  /* =========================================================
     5. LATEST CUSTOMER-VISIBLE UPDATE
     ========================================================= */
  
  function renderCustomerLatestUpdate(requestId) {
    const updates = repairUpdatesByRequest[requestId] || [];
  
    if (updates.length === 0) {
      return `
        <div class="card-notes">
          <strong>Latest Update</strong>
          <p>Waiting for shop update.</p>
        </div>
      `;
    }
  
    const latest = updates[0];
  
    return `
      <div class="card-notes">
        <strong>Latest Update</strong>
        <p>${safeText(latest.message)}</p>
        <small>${formatDate(latest.created_at)}</small>
      </div>
    `;
  }
  
  
  /* =========================================================
     6. CUSTOMER REPAIR TIMELINE
     ========================================================= */
  
  function renderCustomerRepairTimeline(requestId) {
    const updates = repairUpdatesByRequest[requestId] || [];
  
    if (updates.length === 0) {
      return `
        <div class="card-notes">
          <strong>Repair Timeline</strong>
          <p>No repair updates available yet.</p>
        </div>
      `;
    }
  
    const items = updates.map((update) => {
      return `
        <div class="timeline-item">
          <strong>${safeText((update.title || "update").replaceAll("_", " "))}</strong>
          <small>${formatDate(update.created_at)}</small>
          <p>${safeText(update.message)}</p>
        </div>
      `;
    }).join("");
  
    return `
      <div class="card-notes">
        <strong>Repair Timeline</strong>
        <div class="timeline-list">
          ${items}
        </div>
      </div>
    `;
  }
  
  
  /* =========================================================
     7. CUSTOMER DASHBOARD STATISTICS
     ========================================================= */
  
  function updateCustomerStatistics() {
    if (totalRequests) {
      totalRequests.textContent = customerRequests.length;
    }
  
    if (newRequests) {
      newRequests.textContent = customerRequests.filter((request) => {
        return (request.status || "new") === "new";
      }).length;
    }
  
    if (ongoingRequests) {
      ongoingRequests.textContent = customerRequests.filter((request) => {
        const status = request.status || "new";
        return ["acknowledged", "diagnosing", "waiting_parts", "repairing"].includes(status);
      }).length;
    }
  
    if (finishedRequests) {
      finishedRequests.textContent = customerRequests.filter((request) => {
        const status = request.status || "new";
        return ["ready_for_pickup", "closed"].includes(status);
      }).length;
    }
  }