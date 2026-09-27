/* =============================================
   GOOGLE DRIVE v3.3 - CORS FIXED + AUTO-SAVE + PURCHASE BILLS
   ============================================= */

const Drive = {
    // Default fallback to your new URL
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzYT9ZI8jKcUXJS1CwlnE0b3AsOB75An3UKvmd5Xsj_UtakWnneM3ekl29DOae5k8b_5g/exec',
    AUTO_SAVE_ENABLED: false,
    AUTO_BACKUP_ENABLED: false,
    autoBackupTimer: null,

    init() {
        const settings = DB.getSettings();
        if (settings.drive_script_url) {
            this.SCRIPT_URL = settings.drive_script_url;
        }
        this.AUTO_SAVE_ENABLED = settings.drive_auto_save === true;
        this.AUTO_BACKUP_ENABLED = settings.drive_auto_backup === true;
        
        console.log('🚀 Drive init:');
        console.log('   URL:', this.SCRIPT_URL ? '✅ Set' : '❌ Not set');
        console.log('   Auto-Save:', this.AUTO_SAVE_ENABLED ? '✅ ON' : '⭕ OFF');
        console.log('   Auto-Backup:', this.AUTO_BACKUP_ENABLED ? '✅ ON' : '⭕ OFF');
        
        if (this.AUTO_BACKUP_ENABLED && this.isConfigured()) {
            this.startAutoBackup();
        }
    },

    setScriptUrl(url) {
        const settings = DB.getSettings();
        settings.drive_script_url = url;
        DB.saveSettings(settings);
        this.SCRIPT_URL = url;
    },

    setAutoSave(enabled) {
        const settings = DB.getSettings();
        settings.drive_auto_save = enabled;
        DB.saveSettings(settings);
        this.AUTO_SAVE_ENABLED = enabled;
    },

    setAutoBackup(enabled) {
        const settings = DB.getSettings();
        settings.drive_auto_backup = enabled;
        DB.saveSettings(settings);
        this.AUTO_BACKUP_ENABLED = enabled;
        
        if (enabled) this.startAutoBackup();
        else this.stopAutoBackup();
    },

    startAutoBackup() {
        this.stopAutoBackup();
        this.autoBackupTimer = setInterval(() => {
            console.log('⏰ Auto-backup triggered');
            this.backupToDrive(true);
        }, 30 * 60 * 1000);
    },

    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
        }
    },

    isConfigured() {
        return this.SCRIPT_URL && this.SCRIPT_URL.length > 30 && this.SCRIPT_URL.includes('script.google.com');
    },

    async testConnection() {
        if (!this.isConfigured()) return { success: false, error: 'Script URL not configured' };
        try {
            return await this.callScript({ action: 'test' });
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async autoSaveInvoice(invoiceId) {
        if (!this.AUTO_SAVE_ENABLED || !this.isConfigured()) return null;
        console.log('🔄 Auto-saving invoice to Drive...');
        return await this.uploadInvoiceSilent(invoiceId);
    },

    async uploadInvoiceSilent(invoiceId) {
        if (!this.isConfigured()) return null;
        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) return null;

        try {
            const pdfBlob = await generateInvoicePDF(inv, DB.getSettings(), 'blob');
            if (!pdfBlob) throw new Error('PDF generation failed');

            const base64 = await this.blobToBase64(pdfBlob);
            const base64Data = base64.split(',')[1];
            const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
            const cleanInvNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
            const filename = cleanName + '_' + cleanInvNo + '.pdf';
            const currentFY = (typeof getCurrentFY === 'function') ? getCurrentFY() : '2026-27';

            const result = await this.callScript({
                action: 'upload_invoice',
                filename: filename,
                pdfBase64: base64Data,
                invoiceNumber: inv.invoice_number || 'N/A',
                customerName: inv.customer_name || 'Customer',
                invoiceDate: inv.invoice_date || '',
                financialYear: inv.financial_year || currentFY
            });

            if (result && result.success) {
                DB.updateInvoice(invoiceId, {
                    drive_file_id: result.fileId,
                    drive_file_url: result.viewUrl,
                    drive_uploaded_at: result.uploadedAt
                });
                return result;
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    async uploadInvoice(invoiceId) {
        if (!this.isConfigured()) {
            showToast('⚠️ Drive not configured. Go to Settings.', 'warning');
            this.showSetupModal();
            return null;
        }

        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) { showToast('Invoice not found!', 'error'); return null; }

        this.showUploadingModal(inv);

        try {
            const pdfBlob = await generateInvoicePDF(inv, DB.getSettings(), 'blob');
            const base64 = await this.blobToBase64(pdfBlob);
            const base64Data = base64.split(',')[1];
            const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
            const cleanInvNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
            const filename = cleanName + '_' + cleanInvNo + '.pdf';
            const currentFY = (typeof getCurrentFY === 'function') ? getCurrentFY() : '2026-27';

            const result = await this.callScript({
                action: 'upload_invoice',
                filename: filename,
                pdfBase64: base64Data,
                invoiceNumber: inv.invoice_number || 'N/A',
                customerName: inv.customer_name || 'Customer',
                invoiceDate: inv.invoice_date || '',
                financialYear: inv.financial_year || currentFY
            });

            this.closeModal();

            if (result && result.success) {
                showToast('✅ Uploaded to Drive!', 'success');
                DB.updateInvoice(invoiceId, {
                    drive_file_id: result.fileId,
                    drive_file_url: result.viewUrl,
                    drive_uploaded_at: result.uploadedAt
                });
                this.showSuccessModal(result, inv);
                return result;
            } else {
                showToast('❌ Failed: ' + (result?.error || 'Unknown'), 'error');
                return null;
            }
        } catch (error) {
            this.closeModal();
            showToast('❌ Failed: ' + error.message, 'error');
            return null;
        }
    },

    async backupToDrive(silent = false) {
        if (!this.isConfigured()) return null;
        if (!silent) showToast('💾 Backing up...', 'info');

        try {
            const data = DB.exportAllData();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = 'Tripzar_Backup_' + timestamp + '.json';

            const result = await this.callScript({
                action: 'backup_data',
                data: typeof data === 'string' ? data : JSON.stringify(data),
                filename: filename
            });

            if (result && result.success) {
                if (!silent) showToast('✅ Backup saved!', 'success');
                const settings = DB.getSettings();
                settings.last_drive_backup = new Date().toISOString();
                DB.saveSettings(settings);
                return result;
            } else {
                if (!silent) showToast('❌ Failed: ' + (result?.error || 'Unknown'), 'error');
                return null;
            }
        } catch (error) {
            if (!silent) showToast('❌ Failed: ' + error.message, 'error');
            return null;
        }
    },

    // ⭐ NEW: PURCHASE BILL UPLOAD
    async uploadPurchaseBill(fileObject, customFileName) {
        if (!fileObject) throw new Error('No file provided');
        if (!this.isConfigured()) throw new Error('Drive not configured.');

        try {
            let base64Data = '';
            let mimeType = fileObject.type || 'application/octet-stream';

            if (mimeType.startsWith('image/')) {
                base64Data = await this.compressImageToBase64(fileObject, 1400, 0.75);
                mimeType = 'image/jpeg';
            } else {
                const fullBase64 = await this.blobToBase64(fileObject);
                base64Data = fullBase64.includes(',') ? fullBase64.split(',')[1] : fullBase64;
            }

            const fileName = customFileName || `BILL_${Date.now()}_${(fileObject.name || 'file').replace(/[^a-zA-Z0-9.]/g, '_')}`;

            const result = await this.callScript({
                action: 'upload_purchase_bill',
                filename: fileName,
                fileBase64: base64Data,
                pdfBase64: base64Data,
                mimeType: mimeType,
                folderName: 'Purchase Bills'
            });

            if (result && (result.success || result.fileUrl || result.viewUrl || result.url)) {
                return {
                    success: true,
                    url: result.viewUrl || result.fileUrl || result.url,
                    fileId: result.fileId || null,
                    fileName: result.fileName || fileName
                };
            }
            throw new Error(result?.error || 'Upload failed');
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    compressImageToBase64(file, maxWidth = 1400, quality = 0.75) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async callScript(params) {
        try {
            const formBody = [];
            for (const key in params) {
                if (params.hasOwnProperty(key)) {
                    let value = params[key];
                    if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
                    formBody.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }
            }
            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                body: formBody.join('&'),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
            });
            return JSON.parse(await response.text());
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    closeModal() { document.getElementById('modalContainer').classList.add('hidden'); },

    showUploadingModal(inv) {
        var m = document.getElementById('modalContent');
        var c = document.getElementById('modalContainer');
        m.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#34A853);color:white">
                <h2 style="color:white"><span class="material-icons-round" style="vertical-align:middle">cloud_upload</span> Uploading to Drive</h2>
            </div>
            <div class="modal-body" style="text-align:center;padding:40px 20px">
                <div class="loader" style="margin:0 auto 20px"></div>
                <p style="font-size:15px;font-weight:600">${toProperCase(inv.customer_name)}</p>
                <p style="font-size:13px;color:var(--text-muted)">Wait 5-15 seconds...</p>
            </div>
        `;
        c.classList.remove('hidden');
    },

    showSuccessModal(result, inv) {
        var m = document.getElementById('modalContent');
        var c = document.getElementById('modalContainer');
        var url = result.viewUrl || '';
        m.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#34A853);color:white">
                <h2 style="color:white">✅ Success!</h2>
                <button class="modal-close" style="color:white" onclick="Drive.closeModal()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center;padding:20px">
                <div class="btn-group" style="margin-top:15px">
                    <button class="btn btn-primary" onclick="window.open('${url}', '_blank')" style="flex:1">Open</button>
                    <button class="btn btn-secondary" onclick="Drive.copyLink('${url}')" style="flex:1">Copy Link</button>
                </div>
            </div>
        `;
        c.classList.remove('hidden');
    },

    showSetupModal() {
        showToast('Go to Settings → Google Drive', 'info');
    },

    copyLink(url) {
        if (navigator.clipboard && url) navigator.clipboard.writeText(url).then(() => showToast('Copied!', 'success'));
    }
};

// Global helper for purchases.js
async function uploadBillToDrive(fileObject, customFileName) {
    if (!Drive.SCRIPT_URL || Drive.SCRIPT_URL === '') Drive.init();
    return await Drive.uploadPurchaseBill(fileObject, customFileName);
}

window.Drive = Drive;
window.uploadBillToDrive = uploadBillToDrive;
