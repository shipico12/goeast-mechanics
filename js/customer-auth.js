/* =========================================================
   CUSTOMER AUTH MODULE
   File: js/customer-auth.js

   Purpose:
   - Stores shared customer dashboard state.
   - Connects JavaScript to customer.html elements.
   - Checks if the user is logged in.
   - Loads the customer profile.
   - Redirects staff users to admin.html.
   - Updates the customer profile card in the UI.

   Notes for future developers:
   - This file must load AFTER auth-config.js.
   - This file must load BEFORE customer-requests.js,
     customer-invoices.js, customer-payments.js, and customer.js.
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
      2. SHARED CUSTOMER DASHBOARD STATE
      ========================================================= */
   
   let currentUser = null;
   let currentProfile = null;
   
   let customerRequests = [];
   let customerInvoices = [];
   let customerPayments = [];
   
   let repairUpdatesByRequest = {};
   
   
   /* =========================================================
      3. CUSTOMER SESSION CHECK
      ========================================================= */
   
   async function checkCustomerSession() {
     const { data: userData, error: userError } = await supabaseClient.auth.getUser();
   
     if (userError || !userData.user) {
       window.location.href = "login.html";
       return false;
     }
   
     currentUser = userData.user;
   
     let { data: profile, error: profileError } = await supabaseClient
       .from("profiles")
       .select("id, email, full_name, role")
       .eq("id", currentUser.id)
       .maybeSingle();
   
     if (profileError) {
       alert("Profile loading failed: " + profileError.message);
       return false;
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
         return false;
       }
   
       profile = newProfile;
     }
   
     if (STAFF_ROLES.includes(profile.role)) {
       window.location.href = "admin.html";
       return false;
     }
   
     currentProfile = profile;
     renderCustomerProfile();
   
     return true;
   }
   
   
   /* =========================================================
      4. RENDER CUSTOMER PROFILE CARD
      ========================================================= */
   
   function renderCustomerProfile() {
     if (!currentUser || !currentProfile) return;
   
     const displayName = currentProfile.full_name || currentUser.email || "Customer";
   
     if (customerEmail) {
       customerEmail.textContent = displayName;
     }
   
     if (customerRoleBadge) {
       customerRoleBadge.textContent = `${currentUser.email} • ${formatRole(currentProfile.role)}`;
     }
   
     if (customerInitials) {
       customerInitials.textContent = displayName.trim().slice(0, 1).toUpperCase();
     }
   }
   
   
   /* =========================================================
      5. LOGOUT
      ========================================================= */
   
   if (logoutBtn) {
     logoutBtn.addEventListener("click", async function () {
       await supabaseClient.auth.signOut();
       window.location.href = "login.html";
     });
   }