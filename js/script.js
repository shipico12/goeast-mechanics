/* =========================================================
   PUBLIC WEBSITE SCRIPT
   File: js/script.js

   Purpose:
   - Controls the mobile navbar.
   - Detects whether a user is logged in.
   - Updates public navigation based on user role.
   - Shows a small logged-in profile badge on the public website.

   Correct public navbar behavior:
   - Logged out: Login | Sign Up
   - Customer: My Dashboard | Logout + customer profile badge
   - Staff: Dashboard | Logout + staff profile badge
   ========================================================= */


/* =========================================================
   1. PAGE ELEMENT REFERENCES
   ========================================================= */

   const menuBtn = document.getElementById("menuBtn");
   const navLinks = document.getElementById("navLinks");
   const authNavLinks = document.getElementById("authNavLinks");
   const publicProfileBadge = document.getElementById("publicProfileBadge");
   
   
   /* =========================================================
      2. MOBILE MENU TOGGLE
      ========================================================= */
   
   if (menuBtn && navLinks) {
     menuBtn.addEventListener("click", function () {
       navLinks.classList.toggle("active");
     });
   }
   
   
   /* =========================================================
      3. CLOSE MOBILE MENU AFTER LINK CLICK
      ========================================================= */
   
   function bindMobileNavClose() {
     const allNavLinks = document.querySelectorAll(".nav-links a");
   
     allNavLinks.forEach(function (link) {
       link.addEventListener("click", function () {
         if (navLinks) {
           navLinks.classList.remove("active");
         }
       });
     });
   }
   
   
   /* =========================================================
      4. LOAD CURRENT PROFILE
      ========================================================= */
   
   async function getCurrentProfile(userId) {
     const { data, error } = await supabaseClient
       .from("profiles")
       .select("id, email, full_name, role")
       .eq("id", userId)
       .maybeSingle();
   
     if (error) {
       console.error("Navbar profile lookup failed:", error.message);
       return null;
     }
   
     return data;
   }
   
   
   /* =========================================================
      5. PROFILE BADGE
      ========================================================= */
   
   function hidePublicProfileBadge() {
     if (!publicProfileBadge) return;
   
     publicProfileBadge.innerHTML = "";
     publicProfileBadge.classList.add("hidden");
   }
   
   function renderPublicProfileBadge(profile) {
     if (!publicProfileBadge || !profile) return;
   
     const displayName = profile.full_name || profile.email || "Customer";
     const roleLabel = formatRole(profile.role || "customer");
   
     publicProfileBadge.innerHTML = `
       <strong>${safeText(displayName)}</strong>
       <span>${safeText(roleLabel)}</span>
     `;
   
     publicProfileBadge.classList.remove("hidden");
   }
   
   
   /* =========================================================
      6. LOGGED-OUT NAVBAR
      ========================================================= */
   
   function renderLoggedOutNavbar() {
     if (!authNavLinks) return;
   
     authNavLinks.innerHTML = `
       <a href="login.html">Login</a>
       <a href="signup.html">Sign Up</a>
     `;
   
     hidePublicProfileBadge();
     bindMobileNavClose();
   }
   
   
   /* =========================================================
      7. CUSTOMER NAVBAR
      ========================================================= */
   
   function renderCustomerNavbar(profile) {
     if (!authNavLinks) return;
   
     authNavLinks.innerHTML = `
       <a href="customer.html">My Dashboard</a>
       <a href="#" id="publicLogoutBtn">Logout</a>
     `;
   
     renderPublicProfileBadge(profile);
     bindPublicLogout();
     bindMobileNavClose();
   }
   
   
   /* =========================================================
      8. STAFF NAVBAR
      ========================================================= */
   
   function renderStaffNavbar(profile) {
     if (!authNavLinks) return;
   
     authNavLinks.innerHTML = `
       <a href="admin.html">Dashboard</a>
       <a href="#" id="publicLogoutBtn">Logout</a>
     `;
   
     renderPublicProfileBadge(profile);
     bindPublicLogout();
     bindMobileNavClose();
   }
   
   
   /* =========================================================
      9. PUBLIC LOGOUT
      ========================================================= */
   
   function bindPublicLogout() {
     const publicLogoutBtn = document.getElementById("publicLogoutBtn");
   
     if (!publicLogoutBtn) return;
   
     publicLogoutBtn.addEventListener("click", async function (event) {
       event.preventDefault();
   
       await supabaseClient.auth.signOut();
       window.location.href = "login.html";
     });
   }
   
   
   /* =========================================================
      10. INITIALIZE PUBLIC NAVBAR
      ========================================================= */
   
   async function initializePublicNavbar() {
     if (!authNavLinks) {
       bindMobileNavClose();
       return;
     }
   
     const { data: sessionData, error: sessionError } =
       await supabaseClient.auth.getSession();
   
     if (sessionError || !sessionData.session) {
       renderLoggedOutNavbar();
       return;
     }
   
     const user = sessionData.session.user;
     const profile = await getCurrentProfile(user.id);
   
     if (!profile) {
       renderLoggedOutNavbar();
       return;
     }
   
     if (STAFF_ROLES.includes(profile.role)) {
       renderStaffNavbar(profile);
     } else {
       renderCustomerNavbar(profile);
     }
   }
   
   
   /* =========================================================
      11. START SCRIPT
      ========================================================= */
   
   initializePublicNavbar();
   bindMobileNavClose();