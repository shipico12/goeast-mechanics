/* =========================================================
   ADMIN SIMPLE INVOICE / JOB BILL MODULE
   File: js/admin-invoices.js

   Purpose:
   Displays simple job bills for Go East Mechanics.

   Business rule:
   Payments are external/manual. This module does not process payment.
   It reads invoice records and payment records, then calculates:
   - Total
   - Paid
   - Balance
   - Payment status
   ========================================================= */

   let adminInvoiceRecords = [];
   let adminInvoicePayments = [];
   
   const invoicesList = document.getElementById("invoicesList");
   
   
   /* =========================================================
      1. LOAD ADMIN INVOICES + PAYMENTS
      ========================================================= */
   
   async function loadAdminInvoices() {
     if (!invoicesList) return;
   
     invoicesList.innerHTML = `<p class="empty-message">Loading invoices...</p>`;
   
     if (!hasFullAccess()) {
       invoicesList.innerHTML = `
         <p class="empty-message">
           Invoice module is reserved for Developer and Upper Admin access.
         </p>
       `;
       return;
     }
   
     const { data: invoiceData, error: invoiceError } = await supabaseClient
       .from("invoices")
       .select("*")
       .order("invoice_date", { ascending: false });
   
     if (invoiceError) {
       invoicesList.innerHTML = `
         <p class="empty-message">
           Could not load invoices: ${escapeHtml(invoiceError.message)}
         </p>
       `;
       return;
     }
   
     const { data: paymentData, error: paymentError } = await supabaseClient
       .from("payments")
       .select("*")
       .order("payment_date", { ascending: false });
   
     if (paymentError) {
       invoicesList.innerHTML = `
         <p class="empty-message">
           Could not load payments for invoices: ${escapeHtml(paymentError.message)}
         </p>
       `;
       return;
     }
   
     adminInvoiceRecords = invoiceData || [];
     adminInvoicePayments = paymentData || [];
   
     renderAdminInvoices();
   }
   
   
   /* =========================================================
      2. RENDER ADMIN INVOICES
      ========================================================= */
   
   function renderAdminInvoices() {
     if (!invoicesList) return;
   
     if (adminInvoiceRecords.length === 0) {
       invoicesList.innerHTML = `
         <div class="module-card">
           <h3>No invoices yet</h3>
           <p>
             Invoices will appear here after a simple job bill is created from a
             service request.
           </p>
         </div>
       `;
       return;
     }
   
     invoicesList.innerHTML = "";
   
     adminInvoiceRecords.forEach((invoice) => {
       const relatedPayments = getPaymentsForInvoice(invoice.id);
       const totals = calculateInvoiceTotals(invoice, relatedPayments);
       const status = getAdminInvoicePaymentStatus(totals);
   
       const card = document.createElement("div");
       card.className = "request-card";
   
       card.innerHTML = `
         <div class="card-top">
           <div>
             <h3>${safeText(invoice.invoice_number, "Invoice")}</h3>
             <p>${safeText(invoice.customer_name, "Customer")} • ${safeText(invoice.vehicle, "Vehicle")}</p>
           </div>
   
           <span class="status-badge status-${escapeHtml(status.key)}">
             ${safeText(status.label)}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Customer</strong><br>${safeText(invoice.customer_name, "-")}</p>
           <p><strong>Email</strong><br>${safeText(invoice.customer_email, "-")}</p>
           <p><strong>Phone</strong><br>${safeText(invoice.customer_phone, "-")}</p>
           <p><strong>Vehicle</strong><br>${safeText(invoice.vehicle, "-")}</p>
           <p><strong>Invoice Date</strong><br>${formatDate(invoice.invoice_date || invoice.created_at)}</p>
           <p><strong>Invoice Status</strong><br>${safeText(invoice.invoice_status, "-")}</p>
         </div>
   
         <div class="card-grid">
           <p><strong>Estimated Cost</strong><br>${money(invoice.subtotal)}</p>
           <p><strong>Tax</strong><br>${money(invoice.tax)}</p>
           <p><strong>Discount</strong><br>${money(invoice.discount)}</p>
           <p><strong>Final Amount</strong><br>${money(totals.total)}</p>
           <p><strong>Amount Paid</strong><br>${money(totals.amountPaid)}</p>
           <p><strong>Balance</strong><br>${money(totals.balance)}</p>
         </div>
   
         <div class="card-notes">
           <strong>Payment History</strong>
           ${renderInvoicePaymentHistory(relatedPayments)}
         </div>
   
         <div class="card-notes">
           <strong>Invoice / Job Bill Notes</strong>
           <p>${safeText(invoice.notes, "No invoice notes recorded.")}</p>
         </div>
       `;
   
       invoicesList.appendChild(card);
     });
   }
   
   
   /* =========================================================
      3. PAYMENT HELPERS
      ========================================================= */
   
   function getPaymentsForInvoice(invoiceId) {
     return adminInvoicePayments.filter((payment) => {
       return Number(payment.invoice_id) === Number(invoiceId);
     });
   }
   
   function calculateInvoiceTotals(invoice, relatedPayments) {
     const total = Number(invoice.total || invoice.final_cost || invoice.subtotal || 0);
   
     const amountPaid = relatedPayments.reduce((sum, payment) => {
       return sum + Number(payment.amount || 0);
     }, 0);
   
     const balance = Math.max(total - amountPaid, 0);
   
     return {
       total,
       amountPaid,
       balance
     };
   }
   
   function getAdminInvoicePaymentStatus(totals) {
     if (totals.total > 0 && totals.amountPaid >= totals.total && totals.balance <= 0) {
       return {
         key: "paid_in_full",
         label: "Paid in Full"
       };
     }
   
     if (totals.amountPaid > 0 && totals.balance > 0) {
       return {
         key: "partially_paid",
         label: "Partially Paid"
       };
     }
   
     return {
       key: "unpaid",
       label: "Unpaid"
     };
   }
   
   function renderInvoicePaymentHistory(relatedPayments) {
     if (relatedPayments.length === 0) {
       return `<p>No payments recorded yet.</p>`;
     }
   
     return `
       <div class="timeline-list">
         ${relatedPayments.map((payment) => `
           <div class="timeline-item">
             <strong>${money(payment.amount)} • ${safeText(payment.payment_method, "Payment")}</strong>
             <small>${formatDate(payment.payment_date || payment.paid_at || payment.created_at)}</small>
             <p>
               Reference: ${safeText(payment.reference_number, "-")}<br>
               Notes: ${safeText(payment.notes, "No notes")}
             </p>
           </div>
         `).join("")}
       </div>
     `;
   }