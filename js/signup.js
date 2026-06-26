const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphanB6b2JvZmhhanNveGtzemR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM5MTUsImV4cCI6MjA5NzY0OTkxNX0.jH6oD-yc3M5NolFVKDG4NV_z2UVsJfF_Rkk25VqLzms";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const button = signupForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Creating account...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    button.disabled = false;
    button.textContent = "Create Account";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    alert("Signup failed: " + error.message);
    button.disabled = false;
    button.textContent = "Create Account";
    return;
  }

  if (data.session) {
    alert("Account created successfully.");
    window.location.href = "customer.html";
  } else {
    alert("Account created. Please check your email to confirm your account, then login.");
    window.location.href = "login.html";
  }
});