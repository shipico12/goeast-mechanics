/* =========================================================
   ADMIN APP CONTROLLER
   File: js/admin.js

   Purpose:
   This file is now the startup controller for the admin dashboard.

   It does NOT contain heavy business logic anymore.

   It only:
   1. Checks staff access.
   2. Applies dashboard UI for the logged-in role.
   3. Loads service request data.
   4. Starts realtime updates.
   5. Connects logout.

   Other files will handle the actual feature logic.
   ========================================================= */


/* =========================================================
   1. APP STARTUP

   initializeAdminDashboard() is the main entry point.

   It runs after:
   - auth-config.js
   - admin-auth.js
   - admin-dashboard.js
   - admin-updates.js
   - admin-requests.js

   have already loaded.
   ========================================================= */

   async function initializeAdminDashboard() {
    /*
      Step 1:
      Verify that the logged-in user is allowed to access admin.html.
  
      checkStaffAccess() comes from admin-auth.js.
    */
    const isAuthorized = await checkStaffAccess();
  
    if (!isAuthorized) {
      return;
    }
  
    /*
      Step 2:
      Apply role-based UI.
  
      applyAdminProfileUI() and applyRoleUI() will come from
      admin-dashboard.js in the next step.
    */
    if (typeof applyAdminProfileUI === "function") {
      applyAdminProfileUI();
    }
  
    if (typeof applyRoleUI === "function") {
      applyRoleUI();
    }
  
    /*
      Step 3:
      Show the first section this user is allowed to access.
  
      showFirstAllowedSection() will come from admin-dashboard.js.
    */
    if (typeof showFirstAllowedSection === "function") {
      showFirstAllowedSection();
    }
  
    /*
      Step 4:
      Load service requests.
  
      loadServiceRequests() will come from admin-requests.js.
    */
    if (typeof loadServiceRequests === "function") {
      await loadServiceRequests();
    }
    if (typeof loadAdminPayments === "function") {
      await loadAdminPayments();
    }

    if (typeof loadMechanicBoard === "function") {
      await loadMechanicBoard();
    }
    
    if (typeof loadAdminInvoices === "function") {
      await loadAdminInvoices();
    }
  
    /*
      Step 5:
      Start realtime updates.
  
      subscribeStaffRealtime() will come from admin-requests.js later.
    */
    if (typeof subscribeStaffRealtime === "function") {
      subscribeStaffRealtime();
    }
  
    /*
      Step 6:
      Connect logout button.
  
      logoutStaffUser() comes from admin-auth.js.
    */
    const logoutBtn = document.getElementById("logoutBtn");
  
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logoutStaffUser);
    }
  }
  
  
  /* =========================================================
     2. START APPLICATION
  
     This starts the dashboard once the browser has loaded this file.
     ========================================================= */
  
  initializeAdminDashboard();