/* =========================================================
   CUSTOMER DASHBOARD CONTROLLER
   File: js/customer.js

   Purpose:
   - Protects the customer dashboard.
   - Loads the logged-in customer profile.
   - Loads customer service requests.
   - Shows current repairs and service history.
   - Shows customer-visible repair updates.
   - Shows simple invoices/job bills.
   - Shows external/manual payment records.
   - Calculates invoice paid/balance from actual payments.
   - Refreshes when Supabase data changes.
   ========================================================= */


/* =========================================================
   1. PAGE ELEMENT REFERENCES
   ========================================================= */

   const customerEmail = document.getElementById("customerEmail");
   const customerRoleBadge = document.getElementById("customerRoleBadge");
   const customerInitials = document.getElementById("customerInitials");
   const logoutBtn = document.getElementById("logoutBtn");
   
   const requestsContainer = document.getElementById("customerRequests");
   const invoicesContainer = document.getElementById("customerInvoices");
   const paymentsContainer = document.getElementById("customerPayments");
   
   const totalRequests = document.getElementById("totalRequests");
   const newRequests = document.getElementById("newRequests");
   const ongoingRequests = document.getElementById("ongoingRequests");
   const finishedRequests = document.getElementById("finishedRequests");
   
   const navButtons = document.querySelectorAll(".nav-btn");
   const sections = document.querySelectorAll(".admin-section");
   
   
   /* =========================================================
      2. CUSTOMER DASHBOARD STATE
      ========================================================= */
   
   let currentUser = null;
   let currentProfile = null;
   let requests = [];
   let invoices = [];
   let payments = [];
   let repairUpdatesByRequest = {};
   
   
   /* =========================================================
      3. NAVIGATION
      ========================================================= */
   
   navButtons.forEach((button) => {
     button.addEventListener("click", function () {
       navButtons.forEach((btn) => btn.classList.remove("active"));
       sections.forEach((section) => section.classList.remove("active-section"));
   
       button.classList.add("active");
   
       const targetSection = document.getElementById(button.dataset.section);
       if (targetSection) {
         targetSection.classList.add("active-section");
       }
     });
   });
   
   
   /* =========================================================
      4. SESSION + PROFILE CHECK
      ========================================================= */
   
   async function checkSession() {
     const { data: userData, error: userError } = await supabaseClient.auth.getUser();
   
     if (userError || !userData.user) {
       window.location.href = "login.html";
       return;
     }
   
     currentUser = userData.user;
   
     let { data: profile, error: profileError } = await supabaseClient
       .from("profiles")
       .select("id, email, full_name, role")
       .eq("id", currentUser.id)
       .maybeSingle();
   
     if (profileError) {
       alert("Profile loading failed: " + profileError.message);
       return;
     }
   
     if (!profile) {
       const { data: newProfile, error: createError } = await supabaseClient
         .from("profiles")
         .insert([
           {
             id: currentUser.id,
             email: currentUser.email,
             role: "customer"
           }
         ])
         .select("id, email, full_name, role")
         .single();
   
       if (createError) {
         alert("Profile setup failed: " + createError.message);
         return;
       }
   
       profile = newProfile;
     }
   
     if (STAFF_ROLES.includes(profile.role)) {
       window.location.href = "admin.html";
       return;
     }
   
     currentProfile = profile;
   
     const displayName = profile.full_name || currentUser.email || "Customer";
   
     customerEmail.textContent = displayName;
     customerRoleBadge.textContent = `${currentUser.email} • ${formatRole(profile.role)}`;
     customerInitials.textContent = displayName.trim().slice(0, 1).toUpperCase();
   
     await loadDashboard();
     subscribeRealtime();
   }
   
   
   /* =========================================================
      5. LOAD FULL DASHBOARD
      ========================================================= */
   
   async function loadDashboard() {
     await loadRequests();
     await loadRepairUpdates();
     await loadInvoices();
     await loadPayments();
     updateStatistics();
   }
   
   
   /* =========================================================
      6. LOAD SERVICE REQUESTS
      ========================================================= */
   
   async function loadRequests() {
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
       requestsContainer.innerHTML = `<div class="empty-message">${escapeHtml(error.message)}</div>`;
       return;
     }
   
     requests = data || [];
   }
   
   
   /* =========================================================
      7. LOAD CUSTOMER-VISIBLE REPAIR UPDATES
      ========================================================= */
   
   async function loadRepairUpdates() {
     repairUpdatesByRequest = {};
   
     if (requests.length === 0) {
       renderRequests();
       return;
     }
   
     const requestIds = requests.map((request) => request.id);
   
     const { data, error } = await supabaseClient
       .from("repair_updates")
       .select("id, service_request_id, title, message, visible_to_customer, created_at")
       .in("service_request_id", requestIds)
       .eq("visible_to_customer", true)
       .order("created_at", { ascending: false });
   
     if (error) {
       console.error("Could not load customer repair updates:", error.message);
       renderRequests();
       return;
     }
   
     (data || []).forEach((update) => {
       if (!repairUpdatesByRequest[update.service_request_id]) {
         repairUpdatesByRequest[update.service_request_id] = [];
       }
   
       repairUpdatesByRequest[update.service_request_id].push(update);
     });
   
     renderRequests();
   }
   
   
   /* =========================================================
      8. RENDER SERVICE REQUESTS
      ========================================================= */
   
   function renderRequests() {
     if (requests.length === 0) {
       requestsContainer.innerHTML = `<div class="empty-message">No service requests yet.</div>`;
       return;
     }
   
     const currentRepairs = requests.filter((request) => {
       const status = request.status || "new";
       return !["closed", "cancelled"].includes(status);
     });
   
     const serviceHistory = requests.filter((request) => {
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
   
     renderRequestGroup("currentRepairsList", currentRepairs, "No active repairs right now.");
     renderRequestGroup("serviceHistoryList", serviceHistory, "No completed service history yet.");
   }
   
   
   /* =========================================================
      9. RENDER REQUEST GROUP
      ========================================================= */
   
   function renderRequestGroup(containerId, group, emptyMessage) {
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
   
         ${renderLatestUpdate(request.id)}
         ${renderCustomerRepairTimeline(request.id)}
       `;
   
       container.appendChild(card);
     });
   }
   
   
   /* =========================================================
      10. LATEST UPDATE
      ========================================================= */
   
   function renderLatestUpdate(requestId) {
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
      11. REPAIR TIMELINE
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
      12. DASHBOARD STATISTICS
      ========================================================= */
   
   function updateStatistics() {
     totalRequests.textContent = requests.length;
   
     newRequests.textContent = requests.filter((r) => {
       return (r.status || "new") === "new";
     }).length;
   
     ongoingRequests.textContent = requests.filter((r) => {
       const status = r.status || "new";
       return ["acknowledged", "diagnosing", "waiting_parts", "repairing"].includes(status);
     }).length;
   
     finishedRequests.textContent = requests.filter((r) => {
       const status = r.status || "new";
       return ["ready_for_pickup", "closed"].includes(status);
     }).length;
   }
   
   
   /* =========================================================
      13. LOAD CUSTOMER INVOICES
      ========================================================= */
   
   async function loadInvoices() {
     const { data, error } = await supabaseClient
       .from("invoices")
       .select("*")
       .eq("customer_email", currentUser.email)
       .order("invoice_date", { ascending: false });
   
     if (error) {
       invoicesContainer.innerHTML = `<div class="empty-message">Unable to load invoices.</div>`;
       return;
     }
   
     invoices = data || [];
   }
   
   
   /* =========================================================
      14. LOAD CUSTOMER PAYMENT RECORDS
      ========================================================= */
   
   async function loadPayments() {
     if (invoices.length === 0) {
       payments = [];
       renderInvoices();
       renderPayments();
       return;
     }
   
     const invoiceIds = invoices.map((invoice) => invoice.id);
   
     const { data, error } = await supabaseClient
       .from("payments")
       .select("*")
       .in("invoice_id", invoiceIds)
       .order("payment_date", { ascending: false });
   
     if (error) {
       payments = [];
       invoicesContainer.innerHTML = `<div class="empty-message">Unable to load invoice payment records.</div>`;
       paymentsContainer.innerHTML = `<div class="empty-message">Unable to load payments.</div>`;
       return;
     }
   
     payments = data || [];
   
     renderInvoices();
     renderPayments();
   }
   
   
   /* =========================================================
      15. RENDER CUSTOMER SIMPLE INVOICES / JOB BILLS
      ========================================================= */
   
   function renderInvoices() {
     if (invoices.length === 0) {
       invoicesContainer.innerHTML = `<div class="empty-message">No invoices available.</div>`;
       return;
     }
   
     invoicesContainer.innerHTML = "";
   
     invoices.forEach((invoice) => {
       const invoicePayments = getPaymentsForInvoice(invoice.id);
       const totals = calculateInvoiceTotals(invoice, invoicePayments);
       const status = getInvoicePaymentStatus(totals);
   
       const card = document.createElement("div");
       card.className = "request-card";
   
       card.innerHTML = `
         <div class="card-top">
           <div>
             <h3>${safeText(invoice.invoice_number, "Invoice")}</h3>
             <p>${safeText(invoice.customer_name, "Customer")} • ${safeText(invoice.vehicle, "Vehicle")}</p>
           </div>
   
           <span class="status-badge status-${escapeHtml(status.key)}">
             ${safeText(status.label)}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Invoice Date</strong><br>${formatDate(invoice.invoice_date || invoice.created_at)}</p>
           <p><strong>Vehicle</strong><br>${safeText(invoice.vehicle, "-")}</p>
           <p><strong>Estimated Cost</strong><br>${money(invoice.subtotal)}</p>
           <p><strong>Final Amount</strong><br>${money(totals.total)}</p>
           <p><strong>Amount Paid</strong><br>${money(totals.amountPaid)}</p>
           <p><strong>Balance</strong><br>${money(totals.balance)}</p>
           <p><strong>Payment Status</strong><br>${safeText(status.label)}</p>
           <p><strong>Invoice Status</strong><br>${safeText(invoice.invoice_status, "-")}</p>
         </div>
   
         <div class="card-notes">
           <strong>Payment Notice</strong>
           <p>
             Payments are handled outside this website. This invoice only reflects
             payments manually recorded by Go East Mechanics staff.
           </p>
         </div>
   
         <div class="card-notes">
           <strong>Invoice / Job Bill Notes</strong>
           <p>${safeText(invoice.notes, "No invoice notes recorded.")}</p>
         </div>
   
         <div class="card-notes">
           <strong>Payment History</strong>
           ${renderCustomerPaymentHistory(invoicePayments)}
         </div>
       `;
   
       invoicesContainer.appendChild(card);
     });
   }
   
   
   /* =========================================================
      16. RENDER CUSTOMER PAYMENT RECORDS
      ========================================================= */
   
   function renderPayments() {
     if (invoices.length === 0) {
       paymentsContainer.innerHTML = `<div class="empty-message">No payment records available.</div>`;
       return;
     }
   
     paymentsContainer.innerHTML = "";
   
     invoices.forEach((invoice) => {
       const invoicePayments = getPaymentsForInvoice(invoice.id);
       const totals = calculateInvoiceTotals(invoice, invoicePayments);
       const status = getInvoicePaymentStatus(totals);
   
       const card = document.createElement("div");
       card.className = "request-card";
   
       card.innerHTML = `
         <div class="card-top">
           <div>
             <h3>${safeText(invoice.invoice_number, "Invoice")}</h3>
             <p>${safeText(invoice.vehicle, "Vehicle")}</p>
           </div>
   
           <span class="status-badge status-${escapeHtml(status.key)}">
             ${safeText(status.label)}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Invoice Total</strong><br>${money(totals.total)}</p>
           <p><strong>Amount Paid</strong><br>${money(totals.amountPaid)}</p>
           <p><strong>Balance Due</strong><br>${money(totals.balance)}</p>
           <p><strong>Payment Status</strong><br>${safeText(status.label)}</p>
           <p><strong>Invoice Date</strong><br>${formatDate(invoice.invoice_date || invoice.created_at)}</p>
           <p><strong>Customer</strong><br>${safeText(invoice.customer_name, currentProfile.full_name || currentUser.email)}</p>
         </div>
   
         <div class="card-notes">
           <strong>Payment History</strong>
           ${renderCustomerPaymentHistory(invoicePayments)}
         </div>
       `;
   
       paymentsContainer.appendChild(card);
     });
   }
   
   
   /* =========================================================
      17. CUSTOMER PAYMENT HISTORY
      ========================================================= */
   
   function renderCustomerPaymentHistory(invoicePayments) {
     if (invoicePayments.length === 0) {
       return `<p>No payments have been recorded yet.</p>`;
     }
   
     return `
       <div class="timeline-list">
         ${invoicePayments.map((payment) => `
           <div class="timeline-item">
             <strong>${money(payment.amount)} • ${formatPaymentMethod(payment.payment_method)}</strong>
             <small>${formatDate(payment.payment_date || payment.paid_at || payment.created_at)}</small>
             <p>
               Reference: ${safeText(payment.reference_number, "-")}<br>
               Status: ${safeText(formatPaymentStatus(payment.payment_status))}<br>
               Notes: ${safeText(payment.notes, "No notes")}
             </p>
           </div>
         `).join("")}
       </div>
     `;
   }
   
   
   /* =========================================================
      18. PAYMENT + INVOICE HELPERS
      ========================================================= */
   
   function getPaymentsForInvoice(invoiceId) {
     return payments.filter((payment) => {
       return Number(payment.invoice_id) === Number(invoiceId);
     });
   }
   
   function calculateInvoiceTotals(invoice, invoicePayments) {
     const total = Number(invoice.total || invoice.subtotal || 0);
   
     const amountPaid = invoicePayments.reduce((sum, payment) => {
       return sum + Number(payment.amount || 0);
     }, 0);
   
     const balance = Math.max(total - amountPaid, 0);
   
     return {
       total,
       amountPaid,
       balance
     };
   }
   
   function getInvoicePaymentStatus(totals) {
     if (totals.total > 0 && totals.amountPaid >= totals.total && totals.balance <= 0) {
       return {
         key: "paid_in_full",
         label: "Paid in Full"
       };
     }
   
     if (totals.amountPaid > 0 && totals.balance > 0) {
       return {
         key: "partially_paid",
         label: "Partially Paid"
       };
     }
   
     return {
       key: "unpaid",
       label: "Unpaid"
     };
   }
   
   function formatPaymentMethod(method) {
     const methods = {
       cash: "Cash",
       debit: "Debit",
       credit_card: "Credit Card",
       etransfer: "E-transfer",
       cheque: "Cheque",
       other: "Other"
     };
   
     return methods[method] || safeText(method, "Payment Method");
   }
   
   function formatPaymentStatus(status) {
     const statuses = {
       paid: "Paid",
       pending: "Pending",
       failed: "Failed",
       refunded: "Refunded",
       cancelled: "Cancelled"
     };
   
     return statuses[status] || safeText(status, "Recorded");
   }
   
   
   /* =========================================================
      19. REALTIME SUBSCRIPTIONS
      ========================================================= */
   
   function subscribeRealtime() {
     supabaseClient
       .channel("customer-dashboard")
       .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, loadDashboard)
       .on("postgres_changes", { event: "*", schema: "public", table: "repair_updates" }, loadDashboard)
       .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, loadDashboard)
       .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, loadDashboard)
       .subscribe();
   }
   
   
   /* =========================================================
      20. LOGOUT
      ========================================================= */
   
   logoutBtn.addEventListener("click", async function () {
     await supabaseClient.auth.signOut();
     window.location.href = "login.html";
   });
   
   
   /* =========================================================
      21. START CUSTOMER DASHBOARD
      ========================================================= */
   
   checkSession();