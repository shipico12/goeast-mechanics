const SUPABASE_URL = "https://jajpzobofhajsoxkszdx.supabase.co";

const SUPABASE_ANON_KEY =
"YOUR_ANON_KEY_HERE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// -------------------------------
// ELEMENTS
// -------------------------------

const customerEmail =
document.getElementById("customerEmail");

const logoutBtn =
document.getElementById("logoutBtn");

const requestsContainer =
document.getElementById("customerRequests");

const invoicesContainer =
document.getElementById("customerInvoices");

const paymentsContainer =
document.getElementById("customerPayments");

const totalRequests =
document.getElementById("totalRequests");

const newRequests =
document.getElementById("newRequests");

const ongoingRequests =
document.getElementById("ongoingRequests");

const finishedRequests =
document.getElementById("finishedRequests");

const navButtons =
document.querySelectorAll(".nav-btn");

const sections =
document.querySelectorAll(".admin-section");

// -------------------------------
// DATA
// -------------------------------

let currentUser;

let requests=[];

let invoices=[];

let payments=[];

// -------------------------------
// SIDEBAR
// -------------------------------

navButtons.forEach(function(button){

button.addEventListener("click",function(){

navButtons.forEach(function(btn){

btn.classList.remove("active");

});

sections.forEach(function(section){

section.classList.remove("active-section");

});

button.classList.add("active");

const id=
button.dataset.section;

document
.getElementById(id)
.classList
.add("active-section");

});

});

// -------------------------------
// LOGIN
// -------------------------------

async function checkSession(){

const {data}=await supabaseClient
.auth
.getSession();

if(!data.session){

window.location.href="login.html";

return;

}

currentUser=data.session.user;

customerEmail.textContent=currentUser.email;

await loadDashboard();

}

// -------------------------------
// DASHBOARD
// -------------------------------

async function loadDashboard(){

await loadRequests();

await loadInvoices();

await loadPayments();

updateStatistics();

}

// -------------------------------
// REQUESTS
// -------------------------------

async function loadRequests(){

const {data,error}=await supabaseClient

.from("service_requests")

.select("*")

.eq("email",currentUser.email)

.order("created_at",{

ascending:false

});

if(error){

requestsContainer.innerHTML=`

<div class="empty-message">

${error.message}

</div>

`;

return;

}

requests=data;

renderRequests();

}

function renderRequests(){

requestsContainer.innerHTML="";

if(requests.length===0){

requestsContainer.innerHTML=`

<div class="empty-message">

No service requests yet.

</div>

`;

return;

}

requests.forEach(function(request){

const card=document.createElement("div");

card.className="request-card";

card.innerHTML=`

<div class="card-top">

<h2>

${request.vehicle||"Vehicle"}

</h2>

<span class="status-badge status-${request.status}">

${request.status}

</span>

</div>

<div class="card-body">

<p>

<strong>Date</strong><br>

${new Date(request.created_at).toLocaleString()}

</p>

<p>

<strong>Name</strong><br>

${request.name}

</p>

<p>

<strong>Phone</strong><br>

${request.phone||"-"}

</p>

<p>

<strong>Vehicle</strong><br>

${request.vehicle||"-"}

</p>

<p>

<strong>Problem</strong><br>

${request.message}

</p>

<p>

<strong>Admin Notes</strong><br>

${request.admin_notes||"Waiting for mechanic..."}

</p>

<p>

<strong>Estimated Cost</strong><br>

$${Number(request.estimated_cost||0).toFixed(2)}

</p>

<p>

<strong>Final Cost</strong><br>

$${Number(request.final_cost||0).toFixed(2)}

</p>

</div>

`;

requestsContainer.appendChild(card);

});

}
// -------------------------------
// DASHBOARD STATISTICS
// -------------------------------

function updateStatistics(){

totalRequests.textContent=requests.length;

newRequests.textContent=requests.filter(function(r){

return r.status==="new";

}).length;

ongoingRequests.textContent=requests.filter(function(r){

return r.status==="ongoing";

}).length;

finishedRequests.textContent=requests.filter(function(r){

return r.status==="finished";

}).length;

}

// -------------------------------
// LOAD INVOICES
// -------------------------------

async function loadInvoices(){

const {data,error}=await supabaseClient

.from("invoices")

.select("*")

.eq("customer_email",currentUser.email)

.order("created_at",{

ascending:false

});

if(error){

invoicesContainer.innerHTML=`

<div class="empty-message">

Unable to load invoices.

</div>

`;

return;

}

invoices=data||[];

renderInvoices();

}

// -------------------------------
// SHOW INVOICES
// -------------------------------

function renderInvoices(){

invoicesContainer.innerHTML="";

if(invoices.length===0){

invoicesContainer.innerHTML=`

<div class="empty-message">

No invoices available.

</div>

`;

return;

}

invoices.forEach(function(invoice){

const card=document.createElement("div");

card.className="request-card";

card.innerHTML=`

<div class="card-top">

<h2>

${invoice.invoice_number}

</h2>

<span class="status-badge status-${invoice.payment_status}">

${invoice.payment_status}

</span>

</div>

<div class="card-body">

<p>

<strong>Vehicle</strong><br>

${invoice.vehicle}

</p>

<p>

<strong>Subtotal</strong><br>

$${Number(invoice.subtotal).toFixed(2)}

</p>

<p>

<strong>Tax</strong><br>

$${Number(invoice.tax).toFixed(2)}

</p>

<p>

<strong>Total</strong><br>

$${Number(invoice.total).toFixed(2)}

</p>

<p>

<strong>Paid</strong><br>

$${Number(invoice.amount_paid).toFixed(2)}

</p>

<p>

<strong>Balance</strong><br>

$${Number(invoice.balance_due).toFixed(2)}

</p>

<p>

<strong>Status</strong><br>

${invoice.invoice_status}

</p>

</div>

`;

invoicesContainer.appendChild(card);

});

}

// -------------------------------
// LOAD PAYMENTS
// -------------------------------

async function loadPayments(){

const {data,error}=await supabaseClient

.from("payments")

.select("*")

.order("created_at",{

ascending:false

});

if(error){

paymentsContainer.innerHTML=`

<div class="empty-message">

Unable to load payments.

</div>

`;

return;

}

payments=data.filter(function(payment){

return invoices.some(function(invoice){

return invoice.id===payment.invoice_id;

});

});

renderPayments();

}
// -------------------------------
// SHOW PAYMENTS
// -------------------------------

function renderPayments(){

paymentsContainer.innerHTML="";

if(payments.length===0){

paymentsContainer.innerHTML=`

<div class="empty-message">

No payment history available.

</div>

`;

return;

}

payments.forEach(function(payment){

const invoice=invoices.find(function(item){

return item.id===payment.invoice_id;

});

const card=document.createElement("div");

card.className="request-card";

card.innerHTML=`

<div class="card-top">

<h2>

Payment

</h2>

<span class="status-badge status-finished">

Completed

</span>

</div>

<div class="card-body">

<p>

<strong>Invoice</strong><br>

${invoice?invoice.invoice_number:"Unknown"}

</p>

<p>

<strong>Amount</strong><br>

$${Number(payment.amount).toFixed(2)}

</p>

<p>

<strong>Method</strong><br>

${payment.payment_method||"-"}

</p>

<p>

<strong>Reference</strong><br>

${payment.reference_number||"-"}

</p>

<p>

<strong>Date</strong><br>

${new Date(payment.created_at).toLocaleString()}

</p>

<p>

<strong>Notes</strong><br>

${payment.notes||"No notes"}

</p>

</div>

`;

paymentsContainer.appendChild(card);

});

}

// -------------------------------
// LIVE UPDATES
// -------------------------------

function subscribeRealtime(){

supabaseClient

.channel("customer-dashboard")

.on(

"postgres_changes",

{

event:"UPDATE",

schema:"public",

table:"service_requests"

},

async function(){

await loadRequests();

updateStatistics();

}

)

.subscribe();

supabaseClient

.channel("invoice-dashboard")

.on(

"postgres_changes",

{

event:"*",

schema:"public",

table:"invoices"

},

async function(){

await loadInvoices();

}

)

.subscribe();

supabaseClient

.channel("payment-dashboard")

.on(

"postgres_changes",

{

event:"*",

schema:"public",

table:"payments"

},

async function(){

await loadPayments();

}

)

.subscribe();

}

// -------------------------------
// LOGOUT
// -------------------------------

logoutBtn.addEventListener(

"click",

async function(){

await supabaseClient.auth.signOut();

window.location.href="login.html";

}

);

// -------------------------------
// STARTUP
// -------------------------------

checkSession();

subscribeRealtime();
// -------------------------------------
// NOTIFICATION COUNTER
// -------------------------------------

function updateNotificationBadge(){

let unread=0;

requests.forEach(function(request){

if(request.status==="finished"){

unread++;

}

if(request.status==="canceled"){

unread++;

}

});

let badge=document.getElementById("notificationBadge");

if(!badge)return;

badge.textContent=unread;

if(unread===0){

badge.style.display="none";

}else{

badge.style.display="flex";

}

}

// -------------------------------------
// STATUS TIMELINE
// -------------------------------------

function buildTimeline(status){

const steps=[

"new",

"diagnosing",

"waiting_parts",

"repairing",

"quality_check",

"ready",

"finished"

];

let html=`<div class="timeline">`;

steps.forEach(function(step){

let active=false;

if(steps.indexOf(step)<=steps.indexOf(status)){

active=true;

}

html+=`

<div class="timeline-step ${active?"active":""}">

<div class="timeline-circle"></div>

<div class="timeline-label">

${step.replaceAll("_"," ")}

</div>

</div>

`;

});

html+=`</div>`;

return html;

}

// -------------------------------------
// ENHANCED REQUEST CARDS
// -------------------------------------

function renderRequests(){

requestsContainer.innerHTML="";

if(requests.length===0){

requestsContainer.innerHTML=`

<div class="empty-message">

No service requests yet.

</div>

`;

return;

}

requests.forEach(function(request){

const card=document.createElement("div");

card.className="request-card";

card.innerHTML=`

<div class="card-top">

<h2>

${request.vehicle||"Vehicle"}

</h2>

<span class="status-badge status-${request.status}">

${request.status}

</span>

</div>

${buildTimeline(request.status)}

<div class="card-body">

<p>

<strong>Submitted</strong><br>

${new Date(request.created_at).toLocaleString()}

</p>

<p>

<strong>Vehicle</strong><br>

${request.vehicle||"-"}

</p>

<p>

<strong>Problem</strong><br>

${request.message}

</p>

<p>

<strong>Mechanic Notes</strong><br>

${request.admin_notes||"No updates yet"}

</p>

<p>

<strong>Estimated Cost</strong><br>

$${Number(request.estimated_cost||0).toFixed(2)}

</p>

<p>

<strong>Final Cost</strong><br>

$${Number(request.final_cost||0).toFixed(2)}

</p>

</div>

`;

requestsContainer.appendChild(card);

});

updateNotificationBadge();

}

// -------------------------------------
// SERVICE HISTORY
// -------------------------------------

async function loadHistory(){

const {data}=await supabaseClient

.from("service_requests")

.select("*")

.eq("email",currentUser.email)

.eq("status","finished")

.order("created_at",{

ascending:false

});

console.log("History",data);

}

// -------------------------------------
// PROFILE
// -------------------------------------

function loadProfile(){

const welcome=document.getElementById("customerWelcome");

if(welcome){

welcome.innerHTML=`

Welcome,

<strong>

${currentUser.email}

</strong>

`;

}

}

// -------------------------------------
// DASHBOARD REFRESH
// -------------------------------------

async function refreshDashboard(){

await loadRequests();

await loadInvoices();

await loadPayments();

updateStatistics();

updateNotificationBadge();

}

// -------------------------------------
// AUTO REFRESH
// -------------------------------------

setInterval(function(){

refreshDashboard();

},30000);

// -------------------------------------
// INITIALIZE
// -------------------------------------

loadProfile();

loadHistory();

refreshDashboard();