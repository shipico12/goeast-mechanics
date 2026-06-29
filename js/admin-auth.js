/* =========================================================
   ADMIN AUTH MODULE
   File: js/admin-auth.js

   Purpose:
   This file handles staff authentication and authorization.

   Responsibilities:
   - Check whether a user is logged in.
   - Load the logged-in user's profile.
   - Confirm the user has a staff role.
   - Store the active user/profile for other admin modules.
   - Provide role helper functions for the dashboard.
   - Handle logout.

   This file does NOT:
   - Render service request cards.
   - Save repair updates.
   - Calculate dashboard statistics.
   ========================================================= */


/* =========================================================
   1. SHARED ADMIN STATE

   These variables are global on purpose because the admin modules
   are loaded as normal browser scripts, not ES modules.

   Other files will use:
   - currentUser
   - currentProfile
   ========================================================= */

   let currentUser = null;
   let currentProfile = null;
   
   
   /* =========================================================
      2. ROLE HELPER FUNCTIONS
   
      These functions keep role checks readable across the dashboard.
   
      Example:
      Instead of writing:
      currentProfile.role === "developer"
   
      Other modules can call:
      isDeveloper()
      ========================================================= */
   
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
     return (
       currentProfile &&
       ["developer", "upper_admin", "mechanic", "receptionist"].includes(currentProfile.role)
     );
   }
   
   function roleAllowsElement(element) {
     if (!currentProfile || !element.dataset.roles) return true;
   
     return element.dataset.roles
       .split(",")
       .map((role) => role.trim())
       .includes(currentProfile.role);
   }
   
   
   /* =========================================================
      3. STAFF ACCESS CHECK
   
      This function is called by admin.js when the dashboard starts.
   
      Flow:
      1. Get current Supabase session.
      2. Redirect to login if no session exists.
      3. Load profile from public.profiles.
      4. Confirm profile role is a staff role.
      5. Save user/profile into shared state.
      6. Return true if authorized.
      ========================================================= */
   
   async function checkStaffAccess() {
     const { data: sessionData, error: sessionError } =
       await supabaseClient.auth.getSession();
   
     if (sessionError || !sessionData.session) {
       window.location.href = "login.html";
       return false;
     }
   
     currentUser = sessionData.session.user;
   
     const { data: profile, error: profileError } = await supabaseClient
       .from("profiles")
       .select("id, email, full_name, role")
       .eq("id", currentUser.id)
       .single();
   
     if (profileError || !profile || !STAFF_ROLES.includes(profile.role)) {
       alert("Access denied. Staff only.");
       window.location.href = "customer.html";
       return false;
     }
   
     currentProfile = profile;
     return true;
   }
   
   
   /* =========================================================
      4. LOGOUT
   
      This signs the current staff user out of Supabase Auth and
      returns them to the login page.
      ========================================================= */
   
   async function logoutStaffUser() {
     await supabaseClient.auth.signOut();
     window.location.href = "login.html";
   }