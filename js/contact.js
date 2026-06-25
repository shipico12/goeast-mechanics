const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphanB6b2JvZmhhanNveGtzemR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM5MTUsImV4cCI6MjA5NzY0OTkxNX0.jH6oD-yc3M5NolFVKDG4NV_z2UVsJfF_Rkk25VqLzms";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const contactForm = document.getElementById("contactForm");

contactForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = contactForm.querySelector("button");

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const requestData = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    vehicle: document.getElementById("vehicle").value.trim(),
    message: document.getElementById("message").value.trim()
  };

  console.log("Sending this data to Supabase:");
  console.log(requestData);

  try {
    const { error } = await supabaseClient
      .from("service_requests")
      .insert([requestData]);

    if (error) {
      console.log("Full Supabase error:", error);
      console.log("Error message:", error.message);
      console.log("Error details:", error.details);
      console.log("Error hint:", error.hint);
      console.log("Error code:", error.code);

      alert(
        "Something went wrong.\n\n" +
        "Message: " + error.message + "\n" +
        "Code: " + error.code + "\n" +
        "Details: " + error.details
      );
    } else {
      alert("✅ Service request submitted successfully!");
      contactForm.reset();
    }
  } catch (err) {
    console.log("Unexpected error:", err);

    alert(
      "Unexpected error happened.\n\n" +
      err.message
    );
  }

  submitButton.disabled = false;
  submitButton.textContent = "Submit Request";
});