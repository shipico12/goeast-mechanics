/* =========================================================
   ADMIN DASHBOARD UI MODULE
   File: js/admin-dashboard.js

   Purpose:
   Handles staff dashboard presentation.

   Responsibilities:
   - Connects to topbar/profile/sidebar HTML elements.
   - Shows the logged-in staff profile.
   - Shows/hides UI based on role.
   - Controls section navigation.
   - Updates dashboard statistics.

   This file does NOT:
   - Check authentication.
   - Load service requests from Supabase.
   - Save repair updates.
   ========================================================= */


/* =========================================================
   1. HTML ELEMENT REFERENCES
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
   
   
   /* =========================================================
      2. PROFILE UI
      ========================================================= */
   
   function applyAdminProfileUI() {
     const displayName = currentProfile.full_name || currentUser.email;
   
     adminName.textContent = displayName;
     adminEmail.textContent = currentUser.email;
     adminRoleBadge.textContent = formatRole(currentProfile.role);
   
     staffRoleLabel.textContent = formatRole(currentProfile.role);
     sidebarRoleLabel.textContent = formatRole(currentProfile.role);
   
     profileInitials.textContent = getInitials(displayName);
   }
   
   function getInitials(value) {
     const parts = String(value || "U").trim().split(/\s+/);
   
     if (parts.length >= 2) {
       return (parts[0][0] + parts[1][0]).toUpperCase();
     }
   
     return parts[0].slice(0, 2).toUpperCase();
   }
   
   
   /* =========================================================
      3. ROLE-BASED UI
      ========================================================= */
   
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
     }
   
     if (isUpperAdmin()) {
       staffDashboardTitle.textContent = "Upper Admin Dashboard";
       dashboardSectionTitle.textContent = "Business Overview";
       dashboardSubtitle.textContent = "Business operations workspace.";
       roleNotice.textContent = "Upper Admin can manage business records.";
       roleNotice.classList.remove("hidden");
     }
   
     if (isReceptionist()) {
       staffDashboardTitle.textContent = "Reception Dashboard";
       dashboardSectionTitle.textContent = "Front Desk Overview";
       dashboardSubtitle.textContent = "Service requests, pickup updates, and customer check-in.";
       roleNotice.textContent = "Receptionist can acknowledge requests and update customer-facing progress.";
       permissionNotice.textContent = "Receptionist cannot edit inventory, invoices, payments, or developer settings.";
       roleNotice.classList.remove("hidden");
       permissionNotice.classList.remove("hidden");
     }
   
     if (isMechanic()) {
       staffDashboardTitle.textContent = "Mechanic Dashboard";
       dashboardSectionTitle.textContent = "Workshop Overview";
       dashboardSubtitle.textContent = "Repair progress and mechanic updates.";
       roleNotice.textContent = "Mechanic can update repair progress and notes.";
       roleNotice.classList.remove("hidden");
     }
   }
   
   
   /* =========================================================
      4. SECTION NAVIGATION
      ========================================================= */
   
   function showSection(sectionId) {
     const button = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
     const section = document.getElementById(sectionId);
   
     if (!button || !section || !roleAllowsElement(button)) {
       return;
     }
   
     navButtons.forEach((btn) => btn.classList.remove("active"));
     sections.forEach((item) => item.classList.remove("active-section"));
   
     button.classList.add("active");
     section.classList.add("active-section");
   }
   
   function firstAllowedSection() {
     const firstButton = Array.from(navButtons).find((button) => roleAllowsElement(button));
     return firstButton ? firstButton.dataset.section : "dashboardSection";
   }
   
   function showFirstAllowedSection() {
     showSection(firstAllowedSection());
   }
   
   navButtons.forEach((button) => {
     button.addEventListener("click", function () {
       showSection(button.getAttribute("data-section"));
     });
   });
   
   
   /* =========================================================
      5. DASHBOARD STATISTICS
      ========================================================= */
   
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
   
     if (canceledRequests) {
       canceledRequests.textContent = countByStatus("cancelled");
     }
   
     if (inventoryCount) inventoryCount.textContent = "Ready";
     if (lowStockCount) lowStockCount.textContent = "Ready";
     if (paidInvoices) paidInvoices.textContent = "Manual";
   }