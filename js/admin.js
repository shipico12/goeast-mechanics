const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphanB6b2JvZmhhanNveGtzemR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM5MTUsImV4cCI6MjA5NzY0OTkxNX0.jH6oD-yc3M5NolFVKDG4NV_z2UVsJfF_Rkk25VqLzms";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".admin-section");

const totalRequests = document.getElementById("totalRequests");
const newRequests = document.getElementById("newRequests");
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

let allRequests = [];

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function safe(value, fallback = "Not provided") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleString();
}

navButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    navButtons.forEach(function (btn) {
      btn.classList.remove("active");
    });

    sections.forEach(function (section) {
      section.classList.remove("active-section");
    });

    button.classList.add("active");

    const sectionId = button.getAttribute("data-section");
    const activeSection = document.getElementById(sectionId);

    if (activeSection) {
      activeSection.classList.add("active-section");
    }
  });
});

async function checkAdminAccess() {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.href = "login.html";
    return;
  }

  const user = sessionData.session.user;
  adminEmail.textContent = user.email;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    alert("Access denied. Admins only.");
    window.location.href = "customer.html";
    return;
  }

  await loadServiceRequests();
}

async function loadServiceRequests() {
  requestsList.innerHTML = `<p class="empty-message">Loading service requests...</p>`;

  const { data, error } = await supabaseClient
    .from("service_requests")
    .select(
      "id, created_at, name, email, phone, vehicle, message, status, priority, admin_notes, estimated_cost, final_cost"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    requestsList.innerHTML = `
      <p class="empty-message">Could not load requests: ${error.message}</p>
    `;
    return;
  }

  allRequests = data || [];

  updateDashboardStats();
  renderServiceRequests();
}

function updateDashboardStats() {
  totalRequests.textContent = allRequests.length;

  newRequests.textContent = allRequests.filter(function (request) {
    return request.status === "new";
  }).length;

  ongoingRequests.textContent = allRequests.filter(function (request) {
    return request.status === "ongoing";
  }).length;

  finishedRequests.textContent = allRequests.filter(function (request) {
    return request.status === "finished";
  }).length;

  canceledRequests.textContent = allRequests.filter(function (request) {
    return request.status === "canceled";
  }).length;

  if (inventoryCount) inventoryCount.textContent = "0";
  if (lowStockCount) lowStockCount.textContent = "0";
  if (paidInvoices) paidInvoices.textContent = "0";
}

function renderServiceRequests() {
  const searchText = requestSearch ? requestSearch.value.trim().toLowerCase() : "";
  const selectedStatus = requestStatusFilter ? requestStatusFilter.value : "all";

  const filteredRequests = allRequests.filter(function (request) {
    const searchableText = `
      ${request.name || ""}
      ${request.email || ""}
      ${request.phone || ""}
      ${request.vehicle || ""}
      ${request.message || ""}
      ${request.status || ""}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchText);
    const matchesStatus =
      selectedStatus === "all" || request.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (filteredRequests.length === 0) {
    requestsList.innerHTML = `
      <p class="empty-message">No service requests found.</p>
    `;
    return;
  }

  requestsList.innerHTML = "";

  filteredRequests.forEach(function (request) {
    const status = request.status || "new";
    const priority = request.priority || "normal";

    const card = document.createElement("div");
    card.className = "request-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${safe(request.name, "No Name")}</h3>
          <p>${safe(request.vehicle, "Vehicle not provided")}</p>
        </div>

        <span class="status-badge status-${status}">
          ${status}
        </span>
      </div>

      <div class="card-grid">
        <p><strong>Email:</strong> ${safe(request.email)}</p>
        <p><strong>Phone:</strong> ${safe(request.phone)}</p>
        <p><strong>Date:</strong> ${formatDate(request.created_at)}</p>

        <p>
          <strong>Priority:</strong>
          <span class="priority-badge priority-${priority}">
            ${priority}
          </span>
        </p>

        <p><strong>Estimated:</strong> ${money(request.estimated_cost)}</p>
        <p><strong>Final:</strong> ${money(request.final_cost)}</p>
      </div>

      <div class="card-message">
        <strong>Customer Message:</strong>
        <p>${safe(request.message, "No message provided.")}</p>
      </div>

      <div class="card-notes">
        <strong>Admin Notes:</strong>
        <p>${safe(request.admin_notes, "No admin notes yet.")}</p>
      </div>

      <div class="action-row">
        <select class="status-select" data-id="${request.id}">
          <option value="new" ${status === "new" ? "selected" : ""}>New</option>
          <option value="ongoing" ${status === "ongoing" ? "selected" : ""}>Ongoing</option>
          <option value="finished" ${status === "finished" ? "selected" : ""}>Finished</option>
          <option value="canceled" ${status === "canceled" ? "selected" : ""}>Canceled</option>
        </select>

        <select class="priority-select" data-id="${request.id}">
          <option value="low" ${priority === "low" ? "selected" : ""}>Low</option>
          <option value="normal" ${priority === "normal" ? "selected" : ""}>Normal</option>
          <option value="high" ${priority === "high" ? "selected" : ""}>High</option>
          <option value="urgent" ${priority === "urgent" ? "selected" : ""}>Urgent</option>
        </select>

        <input
          class="estimated-cost-input"
          data-id="${request.id}"
          type="number"
          min="0"
          step="0.01"
          value="${request.estimated_cost || 0}"
        >

        <input
          class="final-cost-input"
          data-id="${request.id}"
          type="number"
          min="0"
          step="0.01"
          value="${request.final_cost || 0}"
        >

        <textarea
          class="admin-notes-input"
          data-id="${request.id}"
          placeholder="Admin notes..."
        >${request.admin_notes || ""}</textarea>

        <button class="save-request-btn" data-id="${request.id}">
          Save Changes
        </button>
      </div>
    `;

    requestsList.appendChild(card);
  });

  const saveButtons = document.querySelectorAll(".save-request-btn");

  saveButtons.forEach(function (button) {
    button.addEventListener("click", async function () {
      const requestId = button.getAttribute("data-id");
      await saveRequestChanges(requestId, button);
    });
  });
}

async function saveRequestChanges(requestId, button) {
  const statusValue = document.querySelector(
    `.status-select[data-id="${requestId}"]`
  ).value;

  const priorityValue = document.querySelector(
    `.priority-select[data-id="${requestId}"]`
  ).value;

  const estimatedCostValue = document.querySelector(
    `.estimated-cost-input[data-id="${requestId}"]`
  ).value;

  const finalCostValue = document.querySelector(
    `.final-cost-input[data-id="${requestId}"]`
  ).value;

  const adminNotesValue = document.querySelector(
    `.admin-notes-input[data-id="${requestId}"]`
  ).value.trim();

  button.disabled = true;
  button.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("service_requests")
    .update({
      status: statusValue,
      priority: priorityValue,
      estimated_cost: Number(estimatedCostValue || 0),
      final_cost: Number(finalCostValue || 0),
      admin_notes: adminNotesValue
    })
    .eq("id", requestId);

  if (error) {
    console.error(error);
    alert("Could not update request: " + error.message);
  } else {
    alert("Request updated successfully.");
    await loadServiceRequests();
  }

  button.disabled = false;
  button.textContent = "Save Changes";
}

if (requestSearch) {
  requestSearch.addEventListener("input", renderServiceRequests);
}

if (requestStatusFilter) {
  requestStatusFilter.addEventListener("change", renderServiceRequests);
}

if (refreshRequestsBtn) {
  refreshRequestsBtn.addEventListener("click", loadServiceRequests);
}

logoutBtn.addEventListener("click", async function () {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

checkAdminAccess();