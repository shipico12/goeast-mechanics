/* =========================================================
   CUSTOMER SIGNUP CONTROLLER
   File: js/signup.js

   Purpose:
   - Creates a Supabase Auth customer account.
   - Saves full_name into Supabase user metadata.
   - Creates/updates the matching row in public.profiles.
   - Prevents customer portal from showing email as the name.

   Business rule:
   Every customer account should have a real full name because Go East
   Mechanics needs customer-facing portals, invoices, receipts, and service
   history to look professional.
   ========================================================= */

   const signupForm = document.getElementById("signupForm");

   signupForm.addEventListener("submit", async function (event) {
     event.preventDefault();
   
     const button = signupForm.querySelector("button");
     button.disabled = true;
     button.textContent = "Creating account...";
   
     const fullName = document.getElementById("fullName").value.trim();
     const email = document.getElementById("email").value.trim().toLowerCase();
     const password = document.getElementById("password").value.trim();
     const confirmPassword = document.getElementById("confirmPassword").value.trim();
   
     if (!fullName) {
       alert("Please enter your full name.");
       button.disabled = false;
       button.textContent = "Create Account";
       return;
     }
   
     if (fullName.length < 2) {
       alert("Full name must be at least 2 characters.");
       button.disabled = false;
       button.textContent = "Create Account";
       return;
     }
   
     if (password !== confirmPassword) {
       alert("Passwords do not match.");
       button.disabled = false;
       button.textContent = "Create Account";
       return;
     }
   
     if (password.length < 8) {
       alert("Password must be at least 8 characters.");
       button.disabled = false;
       button.textContent = "Create Account";
       return;
     }
   
     const { data, error } = await supabaseClient.auth.signUp({
       email,
       password,
       options: {
         data: {
           full_name: fullName,
           role: "customer"
         }
       }
     });
   
     if (error) {
       alert("Signup failed: " + error.message);
       button.disabled = false;
       button.textContent = "Create Account";
       return;
     }
   
     if (data.user) {
       await upsertCustomerProfile(data.user.id, email, fullName);
     }
   
     if (data.session) {
       window.location.href = "customer.html";
     } else {
       alert("Account created. Please check your email to confirm your account, then login.");
       window.location.href = "login.html";
     }
   });
   
   
   async function upsertCustomerProfile(userId, email, fullName) {
     const { error } = await supabaseClient
       .from("profiles")
       .upsert(
         {
           id: userId,
           email,
           full_name: fullName,
           role: "customer"
         },
         {
           onConflict: "id"
         }
       );
   
     if (error) {
       console.error("Profile creation warning:", error.message);
     }
   }