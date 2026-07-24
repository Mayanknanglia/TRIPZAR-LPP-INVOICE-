/* =============================================
   EMAIL INTEGRATION v1.0
   Gmail Compose Auto-Open + PDF Attachment
   ============================================= */

const Email = {

    // ============================================
    // Validate Email
    // ============================================
    isValidEmail(email) {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // ============================================
    // Short Professional Messages
    // ============================================
    getMessage(inv, settings, type) {
        const co = settings.company_name || 'Tripzar Holidays';
        const cn = (typeof toProperCase === 'function') ? toProperCase(inv.customer_name) : inv.customer_name;
        const no = inv.invoice_number || '';

        if (type === 'reminder') {
            return `Dear ${cn},\n\nGentle reminder for pending invoice ${no}.\n\nRegards,\n${co}`;
        }

        if (type === 'thankyou') {
            return `Dear ${cn},\n\nThank you! We appreciate your business.\n\nRegards,\n${co}`;
        }

        // Default: Invoice share
        return `Dear ${cn},\n\nHere is your invoice ${no}.\n\nPlease find the invoice PDF attached.\n\nRegards,\n${co}`;
    },

    getSubject(inv, settings, type) {
        const co = settings.company_name || 'Tripzar Holidays';
        const no = inv.invoice_number || '';

        if (type === 'reminder') return `Payment Reminder - Invoice ${no} - ${co}`;
        if (type === 'thankyou') return `Payment Received - Invoice ${no} - ${co}`;
        return `Invoice ${no} - ${co}`;
    },

    // ============================================
    // SEND: Open Gmail
    // ============================================
    async sendInvoice(invoiceId, type = 'invoice') {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) { showToast('Invoice not found!', 'error'); return; }

        const email = inv.customer_email;
        if (!email) {
            this.showEmailModal(invoiceId, type);
            return;
        }

        if (!this.isValidEmail(email)) {
            showToast('Invalid email address!', 'error');
            this.showEmailModal(invoiceId, type);
            return;
        }

        const settings = DB.getSettings();
        const subject = this.getSubject(inv, settings, type);
        const body = this.getMessage(inv, settings, type);

        this.showPreview(invoiceId, email, subject, body, type, inv, settings);
    },

    // ============================================
    // Preview Modal
    // ============================================
    showPreview(invoiceId, email, subject, body, type, inv, settings) {
        const modal = document.getElementById('modalContent');
        const container = document.getElementById('modalContainer');
        const cn = (typeof toProperCase === 'function') ? toProperCase(inv.customer_name) : inv.customer_name;

        const titles = {
            invoice: 'Email Invoice',
            reminder: 'Payment Reminder',
            thankyou: 'Thank You'
        };

        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#EA4335,#C5221F);color:white">
                <h2 style="color:white">
                    <span class="material-icons-round" style="vertical-align:middle">email</span>
                    ${titles[type] || 'Send'} via Email
                </h2>
                <button class="modal-close" style="color:white" onclick="Email.close()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background:#fce8e6;padding:12px;border-radius:8px;margin-bottom:15px;display:flex;align-items:center;gap:12px">
                    <div style="width:44px;height:44px;background:#EA4335;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0">
                        <span class="material-icons-round">person</span>
                    </div>
                    <div>
                        <div style="font-weight:700;font-size:14px">${cn}</div>
                        <div style="font-size:13px;color:#C5221F;font-family:monospace">${email}</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>To</label>
                    <input type="email" id="emlTo" value="${email}" style="font-family:monospace;font-weight:600">
                </div>

                <div class="form-group">
                    <label>Subject</label>
                    <input type="text" id="emlSubject" value="${subject}">
                </div>

                <div class="form-group">
                    <label>Message</label>
                    <textarea id="emlBody" rows="6" style="font-size:13px;line-height:1.5">${body}</textarea>
                </div>

                ${type === 'invoice' ? `
                    <div style="background:#e8f5e9;padding:10px;border-radius:6px;font-size:12px;color:#2e7d32;border-left:3px solid #4CAF50">
                        📎 <strong>Send with PDF</strong> — PDF will be downloaded. Drag & drop it into Gmail compose window as attachment.
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="Email.close()" style="flex:1">Cancel</button>
                ${type === 'invoice' ? `
                    <button class="btn" style="background:#C5221F;color:white;flex:1" onclick="Email.sendWithPDF('${invoiceId}')">
                        <span class="material-icons-round">attach_file</span> Send with PDF
                    </button>
                ` : ''}
                <button class="btn" style="background:#EA4335;color:white;flex:1" onclick="Email.openGmail()">
                    <span class="material-icons-round">send</span> Send Email
                </button>
            </div>
        `;
        container.classList.remove('hidden');
    },

    // ============================================
    // Open Gmail Compose Window
    // ============================================
    openGmail() {
        const to = document.getElementById('emlTo').value.trim();
        const subject = document.getElementById('emlSubject').value.trim();
        const body = document.getElementById('emlBody').value.trim();

        if (!to || !this.isValidEmail(to)) {
            showToast('Invalid email address!', 'error');
            return;
        }
        if (!subject) {
            showToast('Subject required!', 'error');
            return;
        }

        // Gmail Compose URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.open(gmailUrl, '_blank');
        showToast('Gmail opened — press Send.', 'success');
        this.close();
    },

    // ============================================
    // Send with PDF Attachment
    // ============================================
    async sendWithPDF(invoiceId) {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;

        showToast('Generating PDF...', 'info');

        try {
            const pdfBlob = await generateInvoicePDF(inv, DB.getSettings(), 'blob');
            if (!pdfBlob) throw new Error('PDF generation failed');

            const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
            const cleanNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
            const fileName = `${cleanName}_${cleanNo}.pdf`;

            // Download PDF
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            showToast('📎 PDF downloaded! Attach it in Gmail.', 'success');

            // Open Gmail after 1 second
            setTimeout(() => this.openGmail(), 1000);

        } catch (error) {
            console.error('PDF error:', error);
            showToast('PDF generation failed. Try Send Email instead.', 'error');
        }
    },

    // ============================================
    // Email Input Modal (if missing)
    // ============================================
    showEmailModal(invoiceId, type) {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;
        const cn = (typeof toProperCase === 'function') ? toProperCase(inv.customer_name) : inv.customer_name;

        const modal = document.getElementById('modalContent');
        const container = document.getElementById('modalContainer');

        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#EA4335,#C5221F);color:white">
                <h2 style="color:white">Add Email Address</h2>
                <button class="modal-close" style="color:white" onclick="Email.close()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
                    Email address is required for <strong>${cn}</strong> to send invoice via Email.
                </p>
                <div class="form-group">
                    <label>Email Address *</label>
                    <input type="email" id="emlNewAddr" placeholder="e.g. customer@example.com" style="font-family:monospace;font-weight:600;font-size:15px" autofocus>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="Email.close()">Cancel</button>
                <button class="btn" style="background:#EA4335;color:white" onclick="Email.saveEmail('${invoiceId}','${type}')">
                    Save & Continue
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        setTimeout(() => document.getElementById('emlNewAddr')?.focus(), 300);
    },

    async saveEmail(invoiceId, type) {
        const email = document.getElementById('emlNewAddr').value.trim();
        if (!this.isValidEmail(email)) {
            showToast('Enter valid email address!', 'error');
            return;
        }

        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;

        DB.updateInvoice(invoiceId, { customer_email: email });

        if (inv.customer_id) {
            const cust = DB.getCustomerById(inv.customer_id);
            if (cust) {
                cust.email = email;
                DB.updateCustomer(cust.id, cust);
                if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
                    await FirebaseSync.saveCustomer(cust);
                }
            }
        }

        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
            const updated = DB.getInvoiceById(invoiceId);
            await FirebaseSync.saveInvoice(updated);
        }

        this.close();
        showToast('Email saved!', 'success');
        setTimeout(() => this.sendInvoice(invoiceId, type), 500);
    },

    close() {
        document.getElementById('modalContainer').classList.add('hidden');
    }
};

console.log('✅ Email module loaded');