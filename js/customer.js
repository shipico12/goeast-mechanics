/* =========================================================
   CUSTOMER DASHBOARD APP CONTROLLER
   File: js/customer.js

   Purpose:
   This is the main startup file for the customer dashboard.

   It coordinates the customer modules:
   - customer-auth.js
   - customer-requests.js
   - customer-invoices.js
   - customer-payments.js

   This file should stay small.
   Feature logic belongs in the module files.
   ========================================================= */


/* =========================================================
   1. DASHBOARD NAVIGATION
   ========================================================= */

   function initializeCustomerNavigation() {
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
  }
  
  
  /* =========================================================
     2. LOAD FULL CUSTOMER DASHBOARD
     ========================================================= */
  
  async function loadCustomerDashboard() {
    await loadCustomerRequests();
    await loadCustomerRepairUpdates();
  
    await loadCustomerInvoices();
    await loadCustomerPayments();
  
    updateCustomerStatistics();
  }
  
  
  /* =========================================================
     3. REALTIME SUBSCRIPTIONS
     ========================================================= */
  
  function subscribeCustomerRealtime() {
    supabaseClient
      .channel("customer-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        loadCustomerDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "repair_updates" },
        loadCustomerDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        loadCustomerDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        loadCustomerDashboard
      )
      .subscribe();
  }
  
  
  /* =========================================================
     4. START CUSTOMER DASHBOARD
     ========================================================= */
  
  async function initializeCustomerDashboard() {
    initializeCustomerNavigation();
  
    const isAuthorizedCustomer = await checkCustomerSession();
  
    if (!isAuthorizedCustomer) {
      return;
    }
  
    await loadCustomerDashboard();
    subscribeCustomerRealtime();
  }
  
  initializeCustomerDashboard();