/* =========================================================
   ADMIN MANUAL PAYMENT MODULE
   File: js/admin-payments.js

   Purpose:
   Go East Mechanics does NOT process payments online.

   This module is only a manual ledger:
   - Customer pays outside the website.
   - Staff records the payment here.
   - Customer later sees the payment record in their portal.
   ========================================================= */

   let adminInvoices = [];
   let adminPayments = [];
   
   const paymentsList = document.getElementById("paymentsList");
   
   /* =========================================================
      LOAD INVOICES + PAYMENTS
      ========================================================= */
   
   async function loadAdminPayments() {
     if (!paymentsList) return;
   
     paymentsList.innerHTML = `<p class="empty-message">Loading payment records...</p>`;
   
     const { data: invoiceData, error: invoiceError } = await supabaseClient
       .from("invoices")
       .select("*")
       .order("created_at", { ascending: false });
   
     if (invoiceError) {
       paymentsList.innerHTML = `<p class="empty-message">Could not load invoices: ${escapeHtml(invoiceError.message)}</p>`;
       return;
     }
   
     const { data: paymentData, error: paymentError } = await supabaseClient
       .from("payments")
       .select("*")
       .order("payment_date", { ascending: false });
   
     if (paymentError) {
       paymentsList.innerHTML = `<p class="empty-message">Could not load payments: ${escapeHtml(paymentError.message)}</p>`;
       return;
     }
   
     adminInvoices = invoiceData || [];
     adminPayments = paymentData || [];
   
     renderAdminPayments();
   }
   
   /* =========================================================
      RENDER PAYMENT SCREEN
      ========================================================= */
   
   function renderAdminPayments() {
     if (!paymentsList) return;
   
     if (!hasFullAccess() && !isReceptionist()) {
       paymentsList.innerHTML = `
         <p class="empty-message">
           Payment records are available to Developer, Upper Admin, and Receptionist only.
         </p>
       `;
       return;
     }
   
     if (adminInvoices.length === 0) {
       paymentsList.innerHTML = `
         <div class="module-card">
           <h3>No invoices available yet</h3>
           <p>
             Create or generate an invoice before recording payment.
             Payments are external and must be manually entered here.
           </p>
         </div>
       `;
       return;
     }
   
     paymentsList.innerHTML = `
       <div class="module-card">
         <h3>Manual Payment Ledger</h3>
         <p>
           Record only payments already received outside this website.
           This system does not charge cards or process online payments.
         </p>
       </div>
   
       <div class="cards-list">
         ${adminInvoices.map(renderInvoicePaymentCard).join("")}
       </div>
     `;
   
     bindPaymentButtons();
   }
   
   /* =========================================================
      RENDER EACH INVOICE PAYMENT CARD
      ========================================================= */
   
   function renderInvoicePaymentCard(invoice) {
     const relatedPayments = adminPayments.filter((payment) => payment.invoice_id === invoice.id);
   
     const amountPaid = relatedPayments.reduce((sum, payment) => {
       return sum + Number(payment.amount || 0);
     }, 0);
   
     const total = Number(invoice.total || 0);
     const balance = Math.max(total - amountPaid, 0);
   
     const paymentStatus =
       balance <= 0 && total > 0
         ? "paid_in_full"
         : amountPaid > 0
           ? "partially_paid"
           : "unpaid";
   
     return `
       <div class="request-card">
         <div class="card-top">
           <div>
             <h3>${safeText(invoice.invoice_number, "Invoice")}</h3>
             <p>${safeText(invoice.customer_name, "Customer")} • ${safeText(invoice.vehicle, "Vehicle")}</p>
           </div>
   
           <span class="status-badge status-${paymentStatus}">
             ${paymentStatus.replaceAll("_", " ")}
           </span>
         </div>
   
         <div class="card-grid">
           <p><strong>Total</strong><br>${money(total)}</p>
           <p><strong>Paid</strong><br>${money(amountPaid)}</p>
           <p><strong>Balance</strong><br>${money(balance)}</p>
           <p><strong>Invoice Date</strong><br>${formatDate(invoice.invoice_date || invoice.created_at)}</p>
           <p><strong>Customer Email</strong><br>${safeText(invoice.customer_email)}</p>
           <p><strong>Phone</strong><br>${safeText(invoice.customer_phone, "-")}</p>
         </div>
   
         ${renderPaymentHistory(relatedPayments)}
   
         ${balance > 0 ? renderPaymentForm(invoice.id, balance) : `
           <div class="card-notes">
             <strong>Payment Status</strong>
             <p>This invoice is paid in full.</p>
           </div>
         `}
       </div>
     `;
   }
   
   /* =========================================================
      PAYMENT HISTORY
      ========================================================= */
   
   function renderPaymentHistory(payments) {
     if (payments.length === 0) {
       return `
         <div class="card-notes">
           <strong>Payment History</strong>
           <p>No payments recorded yet.</p>
         </div>
       `;
     }
   
     return `
       <div class="card-notes">
         <strong>Payment History</strong>
         <div class="timeline-list">
           ${payments.map((payment) => `
             <div class="timeline-item">
               <strong>${money(payment.amount)} • ${safeText(payment.payment_method, "method not recorded")}</strong>
               <small>${formatDate(payment.payment_date || payment.paid_at || payment.created_at)}</small>
               <p>
                 Reference: ${safeText(payment.reference_number, "-")}<br>
                 Notes: ${safeText(payment.notes, "No notes")}
               </p>
             </div>
           `).join("")}
         </div>
       </div>
     `;
   }
   
   /* =========================================================
      MANUAL PAYMENT FORM
      ========================================================= */
   
   function renderPaymentForm(invoiceId, balance) {
     return `
       <div class="action-row repair-update-box">
         <label>
           Amount Received
           <input class="payment-amount-input" data-id="${invoiceId}" type="number" min="0" step="0.01" value="${balance}">
         </label>
   
         <label>
           Method
           <select class="payment-method-input" data-id="${invoiceId}">
             <option value="cash">Cash</option>
             <option value="debit">Debit</option>
             <option value="credit_card">Credit Card</option>
             <option value="etransfer">E-transfer</option>
             <option value="cheque">Cheque</option>
             <option value="other">Other</option>
           </select>
         </label>
   
         <label>
           Reference
           <input class="payment-reference-input" data-id="${invoiceId}" type="text" placeholder="Receipt, POS, transfer code">
         </label>
   
         <label class="wide-field">
           Notes
           <textarea class="payment-notes-input" data-id="${invoiceId}" placeholder="Example: Paid by debit at front desk."></textarea>
         </label>
   
         <button class="record-payment-btn" data-id="${invoiceId}">
           Record Payment
         </button>
       </div>
     `;
   }
   
   /* =========================================================
      SAVE PAYMENT
      ========================================================= */
   
   async function recordManualPayment(invoiceId, button) {
     const amountInput = document.querySelector(`.payment-amount-input[data-id="${invoiceId}"]`);
     const methodInput = document.querySelector(`.payment-method-input[data-id="${invoiceId}"]`);
     const referenceInput = document.querySelector(`.payment-reference-input[data-id="${invoiceId}"]`);
     const notesInput = document.querySelector(`.payment-notes-input[data-id="${invoiceId}"]`);
   
     const amount = Number(amountInput.value || 0);
   
     if (amount <= 0) {
       alert("Payment amount must be greater than 0.");
       return;
     }
   
     button.disabled = true;
     button.textContent = "Recording...";
   
     const { error } = await supabaseClient
       .from("payments")
       .insert([
         {
           invoice_id: Number(invoiceId),
           amount: amount,
           payment_method: methodInput.value,
           payment_status: "paid",
           reference_number: referenceInput.value.trim(),
           notes: notesInput.value.trim(),
           payment_date: new Date().toISOString(),
           paid_at: new Date().toISOString(),
           recorded_by: currentProfile.id
         }
       ]);
   
     if (error) {
       alert("Could not record payment: " + error.message);
       button.disabled = false;
       button.textContent = "Record Payment";
       return;
     }
   
     await refreshInvoiceBalance(invoiceId);
   
     button.textContent = "Recorded";
     await loadAdminPayments();
   }
   
   /* =========================================================
      UPDATE INVOICE BALANCE AFTER PAYMENT
      ========================================================= */
   
   async function refreshInvoiceBalance(invoiceId) {
     const invoice = adminInvoices.find((item) => item.id === Number(invoiceId));
     const relatedPayments = adminPayments.filter((payment) => payment.invoice_id === Number(invoiceId));
   
     const newPaymentAmount = Number(
       document.querySelector(`.payment-amount-input[data-id="${invoiceId}"]`).value || 0
     );
   
     const previousPaid = relatedPayments.reduce((sum, payment) => {
       return sum + Number(payment.amount || 0);
     }, 0);
   
     const amountPaid = previousPaid + newPaymentAmount;
     const total = Number(invoice.total || 0);
     const balanceDue = Math.max(total - amountPaid, 0);
   
     const paymentStatus =
       balanceDue <= 0 && total > 0
         ? "paid_in_full"
         : amountPaid > 0
           ? "partially_paid"
           : "unpaid";
   
     await supabaseClient
       .from("invoices")
       .update({
         amount_paid: amountPaid,
         balance_due: balanceDue,
         payment_status: paymentStatus
       })
       .eq("id", invoiceId);
   }
   
   /* =========================================================
      BUTTON EVENTS
      ========================================================= */
   
   function bindPaymentButtons() {
     document.querySelectorAll(".record-payment-btn").forEach((button) => {
       button.addEventListener("click", async function () {
         await recordManualPayment(button.getAttribute("data-id"), button);
       });
     });
   }