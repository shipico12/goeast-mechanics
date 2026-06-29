const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphanB6b2JvZmhhanNveGtzemR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM5MTUsImV4cCI6MjA5NzY0OTkxNX0.jH6oD-yc3M5NolFVKDG4NV_z2UVsJfF_Rkk25VqLzms";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ROLES = {
  DEVELOPER: "developer",
  UPPER_ADMIN: "upper_admin",
  RECEPTIONIST: "receptionist",
  MECHANIC: "mechanic",
  CUSTOMER: "customer",
};

const ROLE_LABELS = {
  developer: "Developer",
  upper_admin: "Upper Admin",
  receptionist: "Receptionist",
  mechanic: "Mechanic",
  customer: "Customer",
};

const STAFF_ROLES = [
  ROLES.DEVELOPER,
  ROLES.UPPER_ADMIN,
  ROLES.RECEPTIONIST,
  ROLES.MECHANIC,
];

const FULL_ACCESS_ROLES = [ROLES.DEVELOPER, ROLES.UPPER_ADMIN];

function formatRole(role) {
  return ROLE_LABELS[role] || "Customer";
}

function escapeHtml(value) {
  if (value === null || value === undefined || value === "") return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeText(value, fallback = "Not provided") {
  const text = escapeHtml(value);
  return text || fallback;
}

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function formatDate(value) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleString();
}
