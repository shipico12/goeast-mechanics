const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const button = loginForm.querySelector("button");

  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    const { data: loginData, error: loginError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      alert("Login failed: " + loginError.message);
      return;
    }

    const user = loginData.user;

    let { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: createError } = await supabaseClient
        .from("profiles")
        .insert([
          {
            id: user.id,
            email: user.email,
            role: "customer",
          },
        ])
        .select("id, email, role")
        .single();

      if (createError) {
        alert("Profile setup failed: " + createError.message);
        return;
      }

      profile = newProfile;
    }

    if (profile.role === "developer") {
      window.location.href = "admin.html";
    } else if (profile.role === "upper_admin") {
      window.location.href = "admin.html";
    } else if (profile.role === "receptionist") {
      window.location.href = "admin.html";
    } else if (profile.role === "mechanic") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "customer.html";
    }
  } catch (err) {
    alert("Unexpected login error: " + err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Login";
  }
});
