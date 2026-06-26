const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphanB6b2JvZmhhanNveGtzemR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM5MTUsImV4cCI6MjA5NzY0OTkxNX0.jH6oD-yc3M5NolFVKDG4NV_z2UVsJfF_Rkk25VqLzms";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const button = loginForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("Login failed: " + error.message);
    button.disabled = false;
    button.textContent = "Login";
    return;
  }

  const userId = data.user.id;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError) {
    alert("Could not check your role. Please try again.");
    button.disabled = false;
    button.textContent = "Login";
    return;
  }

  if (profile.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "customer.html";
  }
});