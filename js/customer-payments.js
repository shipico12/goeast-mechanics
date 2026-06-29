/* =========================================================
   CUSTOMER PAYMENTS MODULE
   File: js/customer-payments.js

   Purpose:
   - Loads payment records connected to the logged-in customer’s invoices.
   - Displays the Payments tab as receipt-style cards.
   - Keeps the customer payment view separate from the invoice/job bill view.

   Business rule:
   Go East Mechanics does not process payments online.
   Staff record cash/debit/credit/e-transfer/cheque payments manually.
   The customer sees those records as payment receipts.
   ========================================================= */


/* =========================================================
   1. LOAD CUSTOMER PAYMENT RECORDS
   ========================================================= */

   async function loadCustomerPayments() {
    if (!paymentsContainer) return;
  
    if (customerInvoices.length === 0) {
      customerPayments = [];
      renderCustomerInvoices();
      renderCustomerPayments();
      return;
    }
  
    const invoiceIds = customerInvoices.map((invoice) => invoice.id);
  
    const { data, error } = await supabaseClient
      .from("payments")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("payment_date", { ascending: false });
  
    if (error) {
      customerPayments = [];
  
      if (invoicesContainer) {
        invoicesContainer.innerHTML = `
          <div class="empty-message">Unable to load invoice payment records.</div>
        `;
      }
  
      paymentsContainer.innerHTML = `
        <div class="empty-message">Unable to load payments.</div>
      `;
  
      return;
    }
  
    customerPayments = data || [];
  
    renderCustomerInvoices();
    renderCustomerPayments();
  }
  
  
  /* =========================================================
     2. RENDER CUSTOMER PAYMENT RECEIPTS
     ========================================================= */
  
  function renderCustomerPayments() {
    if (!paymentsContainer) return;
  
    if (customerPayments.length === 0) {
      paymentsContainer.innerHTML = `
        <div class="empty-message">
          No payment receipts available yet.
        </div>
      `;
      return;
    }
  
    paymentsContainer.innerHTML = "";
  
    customerPayments.forEach((payment) => {
      const invoice = customerInvoices.find((item) => {
        return Number(item.id) === Number(payment.invoice_id);
      });
  
      const receiptNumber = buildCustomerReceiptNumber(payment);
  
      const card = document.createElement("div");
      card.className = "request-card";
  
      card.innerHTML = `
        <div class="card-top">
          <div>
            <h3>${receiptNumber}</h3>
            <p>
              Payment Receipt
              ${invoice ? `• ${safeText(invoice.invoice_number)} • ${safeText(invoice.vehicle, "Vehicle")}` : ""}
            </p>
          </div>
  
          <span class="status-badge status-paid_in_full">
            Completed
          </span>
        </div>
  
        <div class="card-grid">
          <p><strong>Amount Paid</strong><br>${money(payment.amount)}</p>
          <p><strong>Payment Method</strong><br>${formatCustomerPaymentMethod(payment.payment_method)}</p>
          <p><strong>Reference</strong><br>${safeText(payment.reference_number, "-")}</p>
          <p><strong>Payment Date</strong><br>${formatDate(payment.payment_date || payment.paid_at || payment.created_at)}</p>
          <p><strong>Status</strong><br>${formatCustomerPaymentStatus(payment.payment_status)}</p>
          <p><strong>Invoice</strong><br>${safeText(invoice ? invoice.invoice_number : "-")}</p>
          <p><strong>Vehicle</strong><br>${safeText(invoice ? invoice.vehicle : "-")}</p>
          <p><strong>Customer</strong><br>${safeText(invoice ? invoice.customer_name : currentProfile?.full_name || currentUser?.email)}</p>
        </div>
  
        <div class="card-notes">
          <strong>Payment Notes</strong>
          <p>${safeText(payment.notes, "No payment notes recorded.")}</p>
        </div>
  
        <div class="card-notes">
          <strong>Important</strong>
          <p>
            This receipt confirms that Go East Mechanics staff manually recorded
            this payment after it was received outside the website.
          </p>
        </div>
      `;
  
      paymentsContainer.appendChild(card);
    });
  }
  
  
  /* =========================================================
     3. PAYMENT HISTORY FOR INVOICE CARDS
     ========================================================= */
  
  function renderCustomerPaymentHistory(invoicePayments) {
    if (!invoicePayments || invoicePayments.length === 0) {
      return `<p>No payments have been recorded yet.</p>`;
    }
  
    return `
      <div class="timeline-list">
        ${invoicePayments.map((payment) => `
          <div class="timeline-item">
            <strong>${money(payment.amount)} • ${formatCustomerPaymentMethod(payment.payment_method)}</strong>
            <small>${formatDate(payment.payment_date || payment.paid_at || payment.created_at)}</small>
            <p>
              Receipt: ${buildCustomerReceiptNumber(payment)}<br>
              Reference: ${safeText(payment.reference_number, "-")}<br>
              Status: ${safeText(formatCustomerPaymentStatus(payment.payment_status))}<br>
              Notes: ${safeText(payment.notes, "No notes")}
            </p>
          </div>
        `).join("")}
      </div>
    `;
  }
  
  
  /* =========================================================
     4. CUSTOMER PAYMENT HELPERS
     ========================================================= */
  
  function buildCustomerReceiptNumber(payment) {
    const rawId = String(payment.id || "0").padStart(4, "0");
    const dateSource = payment.payment_date || payment.paid_at || payment.created_at || new Date().toISOString();
    const year = new Date(dateSource).getFullYear();
  
    return `PAY-${year}-${rawId}`;
  }
  
  function formatCustomerPaymentMethod(method) {
    const methods = {
      cash: "Cash",
      debit: "Debit",
      credit_card: "Credit Card",
      etransfer: "E-transfer",
      cheque: "Cheque",
      other: "Other"
    };
  
    return methods[method] || safeText(method, "Payment Method");
  }
  
  function formatCustomerPaymentStatus(status) {
    const statuses = {
      paid: "Paid",
      pending: "Pending",
      failed: "Failed",
      refunded: "Refunded",
      cancelled: "Cancelled"
    };
  
    return statuses[status] || safeText(status, "Recorded");
  }