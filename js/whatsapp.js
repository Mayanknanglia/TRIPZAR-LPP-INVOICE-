/* =============================================
   WHATSAPP INTEGRATION v1.1
   Short professional messages + PDF share
   ============================================= */

const WhatsApp = {

    formatPhone(phone, code = '91') {
        if (!phone) return null;
        let n = phone.replace(/\D/g, '');
        if (n.startsWith('0')) n = n.substring(1);
        if (n.length === 10) n = code + n;
        return n.length >= 10 ? n : null;
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
        return `Dear ${cn},\n\nHere is your invoice ${no}.\n\nRegards,\n${co}`;
    },

    // ============================================
    // SEND: Open WhatsApp
    // ============================================
    async sendInvoice(invoiceId, type = 'invoice') {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) { showToast('Invoice not found!', 'error'); return; }

        const phone = inv.customer_phone;
        if (!phone) {
            this.showPhoneModal(invoiceId, type);
            return;
        }

        const fp = this.formatPhone(phone);
        if (!fp) {
            showToast('Invalid phone number!', 'error');
            this.showPhoneModal(invoiceId, type);
            return;
        }

        const settings = DB.getSettings();
        const message = this.getMessage(inv, settings, type);

        this.showPreview(invoiceId, fp, message, type, inv, settings);
    },

    // ============================================
    // Preview Modal
    // ============================================
    showPreview(invoiceId, phone, message, type, inv, settings) {
        const modal = document.getElementById('modalContent');
        const container = document.getElementById('modalContainer');
        const dp = '+' + phone.substring(0, 2) + ' ' + phone.substring(2, 7) + ' ' + phone.substring(7);
        const cn = (typeof toProperCase === 'function') ? toProperCase(inv.customer_name) : inv.customer_name;

        const titles = {
            invoice: 'Share Invoice',
            reminder: 'Payment Reminder',
            thankyou: 'Thank You'
        };

        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white">
                <h2 style="color:white">
                    <span class="material-icons-round" style="vertical-align:middle">chat</span>
                    ${titles[type] || 'Send'} via WhatsApp
                </h2>
                <button class="modal-close" style="color:white" onclick="WhatsApp.close()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background:#dcf8c6;padding:12px;border-radius:8px;margin-bottom:15px;display:flex;align-items:center;gap:12px">
                    <div style="width:44px;height:44px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0">
                        <span class="material-icons-round">person</span>
                    </div>
                    <div>
                        <div style="font-weight:700;font-size:14px">${cn}</div>
                        <div style="font-size:13px;color:#128C7E;font-family:monospace">${dp}</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Message</label>
                    <textarea id="waMsg" rows="5" style="font-size:13px;line-height:1.5">${message}</textarea>
                </div>

                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" id="waPhone" value="${phone}" style="font-family:monospace;font-weight:700">
                </div>

                ${type === 'invoice' ? `
                    <div style="background:#e8f5e9;padding:10px;border-radius:6px;font-size:12px;color:#2e7d32;border-left:3px solid #25D366">
                        💡 <strong>Share PDF</strong> — Directly attach invoice PDF (Mobile: native share, Desktop: download + WhatsApp)
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="WhatsApp.close()" style="flex:1">Cancel</button>
                ${type === 'invoice' ? `
                    <button class="btn" style="background:#128C7E;color:white;flex:1" onclick="WhatsApp.sharePDF('${invoiceId}')">
                        <span class="material-icons-round">picture_as_pdf</span> Share PDF
                    </button>
                ` : ''}
                <button class="btn" style="background:#25D366;color:white;flex:1" onclick="WhatsApp.openWA()">
                    <span class="material-icons-round">send</span> Send Message
                </button>
            </div>
        `;
        container.classList.remove('hidden');
    },

    // ============================================
    // Open WhatsApp Web with Message
    // ============================================
    openWA() {
        const msg = document.getElementById('waMsg').value.trim();
        const phone = document.getElementById('waPhone').value.trim().replace(/\D/g, '');

        if (!msg || !phone || phone.length < 10) {
            showToast('Check message and phone!', 'error');
            return;
        }

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        showToast('WhatsApp opened — press Send.', 'success');
        this.close();
    },

    // ============================================
    // Share PDF Directly (Mobile Share / Desktop download)
    // ============================================
    async sharePDF(invoiceId) {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;

        showToast('Generating PDF...', 'info');

        try {
            const pdfBlob = await generateInvoicePDF(inv, DB.getSettings(), 'blob');
            if (!pdfBlob) throw new Error('PDF generation failed');

            const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
            const cleanNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
            const fileName = `${cleanName}_${cleanNo}.pdf`;

            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            const msg = document.getElementById('waMsg')?.value.trim() || `Here is your invoice ${inv.invoice_number}`;

            // Mobile: Native share sheet with PDF
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Invoice ${inv.invoice_number}`,
                    text: msg,
                    files: [file]
                });
                showToast('PDF shared!', 'success');
                this.close();
            } else {
                // Desktop: Download PDF + open WhatsApp
                showToast('PDF downloaded. Attach it in WhatsApp.', 'info');

                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);

                setTimeout(() => this.openWA(), 1000);
            }
        } catch (error) {
            console.error('Share PDF error:', error);
            showToast('PDF share failed. Try Send Message instead.', 'error');
        }
    },

    // ============================================
    // Phone Input Modal (if missing)
    // ============================================
    showPhoneModal(invoiceId, type) {
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;
        const cn = (typeof toProperCase === 'function') ? toProperCase(inv.customer_name) : inv.customer_name;

        const modal = document.getElementById('modalContent');
        const container = document.getElementById('modalContainer');

        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white">
                <h2 style="color:white">Add Phone Number</h2>
                <button class="modal-close" style="color:white" onclick="WhatsApp.close()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
                    Phone number is required for <strong>${cn}</strong> to send via WhatsApp.
                </p>
                <div class="form-group">
                    <label>WhatsApp Number *</label>
                    <input type="tel" id="waNewPhone" placeholder="e.g. 9876543210" style="font-family:monospace;font-weight:700;font-size:16px" autofocus>
                    <small class="input-hint">10 digit number (India) or with country code</small>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="WhatsApp.close()">Cancel</button>
                <button class="btn" style="background:#25D366;color:white" onclick="WhatsApp.savePhone('${invoiceId}','${type}')">
                    Save & Continue
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        setTimeout(() => document.getElementById('waNewPhone')?.focus(), 300);
    },

    async savePhone(invoiceId, type) {
        const phone = document.getElementById('waNewPhone').value.trim();
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            showToast('Enter valid phone number!', 'error');
            return;
        }

        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return;

        DB.updateInvoice(invoiceId, { customer_phone: phone });

        if (inv.customer_id) {
            const cust = DB.getCustomerById(inv.customer_id);
            if (cust) {
                cust.phone = phone;
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
        showToast('Phone saved!', 'success');
        setTimeout(() => this.sendInvoice(invoiceId, type), 500);
    },

    close() {
        document.getElementById('modalContainer').classList.add('hidden');
    }
};

console.log('✅ WhatsApp module loaded');