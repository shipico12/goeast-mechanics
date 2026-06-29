/* =========================================================
   CUSTOMER INVOICES MODULE
   File: js/customer-invoices.js

   Purpose:
   - Loads invoices for the logged-in customer.
   - Displays each invoice as a simple job bill.
   - Calculates amount paid and balance using actual payment rows.
   - Keeps invoice display simple for Go East Mechanics.

   Business rule:
   Go East Mechanics receives payments outside the website.
   The website only shows payments manually recorded by staff.
   ========================================================= */


/* =========================================================
   1. LOAD CUSTOMER INVOICES
   ========================================================= */

   async function loadCustomerInvoices() {
    if (!currentUser) return;
  
    const { data, error } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("customer_email", currentUser.email)
      .order("invoice_date", { ascending: false });
  
    if (error) {
      if (invoicesContainer) {
        invoicesContainer.innerHTML = `
          <div class="empty-message">Unable to load invoices.</div>
        `;
      }
      return;
    }
  
    customerInvoices = data || [];
  }
  
  
  /* =========================================================
     2. RENDER CUSTOMER SIMPLE INVOICES / JOB BILLS
     ========================================================= */
  
  function renderCustomerInvoices() {
    if (!invoicesContainer) return;
  
    if (customerInvoices.length === 0) {
      invoicesContainer.innerHTML = `
        <div class="empty-message">No invoices available.</div>
      `;
      return;
    }
  
    invoicesContainer.innerHTML = "";
  
    customerInvoices.forEach((invoice) => {
      const invoicePayments = getCustomerPaymentsForInvoice(invoice.id);
      const totals = calculateCustomerInvoiceTotals(invoice, invoicePayments);
      const status = getCustomerInvoicePaymentStatus(totals);
  
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
          <p><strong>Invoice Date</strong><br>${formatDate(invoice.invoice_date || invoice.created_at)}</p>
          <p><strong>Vehicle</strong><br>${safeText(invoice.vehicle, "-")}</p>
          <p><strong>Estimated Cost</strong><br>${money(invoice.subtotal)}</p>
          <p><strong>Final Amount</strong><br>${money(totals.total)}</p>
          <p><strong>Amount Paid</strong><br>${money(totals.amountPaid)}</p>
          <p><strong>Balance</strong><br>${money(totals.balance)}</p>
          <p><strong>Payment Status</strong><br>${safeText(status.label)}</p>
          <p><strong>Invoice Status</strong><br>${safeText(invoice.invoice_status, "-")}</p>
        </div>
  
        <div class="card-notes">
          <strong>Payment Notice</strong>
          <p>
            Payments are handled outside this website. This invoice only reflects
            payments manually recorded by Go East Mechanics staff.
          </p>
        </div>
  
        <div class="card-notes">
          <strong>Invoice / Job Bill Notes</strong>
          <p>${safeText(invoice.notes, "No invoice notes recorded.")}</p>
        </div>
  
        <div class="card-notes">
          <strong>Payment History</strong>
          ${renderCustomerPaymentHistory(invoicePayments)}
        </div>
      `;
  
      invoicesContainer.appendChild(card);
    });
  }
  
  
  /* =========================================================
     3. SHARED INVOICE HELPERS
     ========================================================= */
  
  function getCustomerPaymentsForInvoice(invoiceId) {
    return customerPayments.filter((payment) => {
      return Number(payment.invoice_id) === Number(invoiceId);
    });
  }
  
  function calculateCustomerInvoiceTotals(invoice, invoicePayments) {
    const total = Number(invoice.total || invoice.subtotal || 0);
  
    const amountPaid = invoicePayments.reduce((sum, payment) => {
      return sum + Number(payment.amount || 0);
    }, 0);
  
    const balance = Math.max(total - amountPaid, 0);
  
    return {
      total,
      amountPaid,
      balance
    };
  }
  
  function getCustomerInvoicePaymentStatus(totals) {
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