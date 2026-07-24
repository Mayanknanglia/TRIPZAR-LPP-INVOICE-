/* =============================================
   GOOGLE DRIVE v3.2 - CORS FIXED + AUTO-SAVE
   ============================================= */

const Drive = {
    SCRIPT_URL: '',
    AUTO_SAVE_ENABLED: false,
    AUTO_BACKUP_ENABLED: false,
    autoBackupTimer: null,

    init() {
        const settings = DB.getSettings();
        this.SCRIPT_URL = settings.drive_script_url || '';
        this.AUTO_SAVE_ENABLED = settings.drive_auto_save === true;
        this.AUTO_BACKUP_ENABLED = settings.drive_auto_backup === true;
        
        console.log('🚀 Drive init:');
        console.log('   URL:', this.SCRIPT_URL ? '✅ Set' : '❌ Not set');
        console.log('   Auto-Save:', this.AUTO_SAVE_ENABLED ? '✅ ON' : '⭕ OFF');
        console.log('   Auto-Backup:', this.AUTO_BACKUP_ENABLED ? '✅ ON' : '⭕ OFF');
        
        // Start auto-backup timer (every 30 min)
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
        console.log('Auto-Save:', enabled ? 'ENABLED' : 'DISABLED');
    },

    setAutoBackup(enabled) {
        const settings = DB.getSettings();
        settings.drive_auto_backup = enabled;
        DB.saveSettings(settings);
        this.AUTO_BACKUP_ENABLED = enabled;
        
        if (enabled) {
            this.startAutoBackup();
        } else {
            this.stopAutoBackup();
        }
    },

    startAutoBackup() {
        this.stopAutoBackup();
        // Auto-backup every 30 minutes
        this.autoBackupTimer = setInterval(() => {
            console.log('⏰ Auto-backup triggered');
            this.backupToDrive(true); // silent mode
        }, 30 * 60 * 1000);
        console.log('⏰ Auto-backup timer started (30 min interval)');
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
        if (!this.isConfigured()) {
            return { success: false, error: 'Script URL not configured' };
        }
        try {
            return await this.callScript({ action: 'test' });
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // AUTO-SAVE: Called after invoice save
    // ============================================
    async autoSaveInvoice(invoiceId) {
        if (!this.AUTO_SAVE_ENABLED) {
            console.log('Auto-save disabled, skipping');
            return null;
        }
        if (!this.isConfigured()) {
            console.log('Drive not configured, skipping auto-save');
            return null;
        }
        
        console.log('🔄 Auto-saving invoice to Drive...');
        return await this.uploadInvoiceSilent(invoiceId);
    },

    // ============================================
    // SILENT UPLOAD (No modals, for auto-save)
    // ============================================
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
                showToast('☁️ Auto-saved to Drive', 'success');
                console.log('✅ Auto-save success:', result.fileName);
                return result;
            } else {
                console.error('Auto-save failed:', result?.error);
                return null;
            }
        } catch (error) {
            console.error('Auto-save error:', error);
            return null;
        }
    },

    // ============================================
    // MANUAL UPLOAD (With modals)
    // ============================================
    async uploadInvoice(invoiceId) {
        if (!this.isConfigured()) {
            showToast('⚠️ Drive not configured. Go to Settings.', 'warning');
            this.showSetupModal();
            return null;
        }

        const inv = DB.getInvoiceById(invoiceId);
        if (!inv) {
            showToast('Invoice not found!', 'error');
            return null;
        }

        this.showUploadingModal(inv);

        try {
            console.log('📄 Generating PDF...');
            const pdfBlob = await generateInvoicePDF(inv, DB.getSettings(), 'blob');

            if (!pdfBlob) throw new Error('PDF generation failed');

            console.log('✅ PDF ready, size:', pdfBlob.size);

            const base64 = await this.blobToBase64(pdfBlob);
            const base64Data = base64.split(',')[1];

            const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
            const cleanInvNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
            const filename = cleanName + '_' + cleanInvNo + '.pdf';

            const currentFY = (typeof getCurrentFY === 'function') ? getCurrentFY() : '2026-27';

            console.log('📤 Uploading:', filename);

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
            console.error('Upload error:', error);
            showToast('❌ Failed: ' + error.message, 'error');
            return null;
        }
    },

    async backupToDrive(silent = false) {
        if (!this.isConfigured()) {
            if (!silent) showToast('⚠️ Drive not configured', 'warning');
            return null;
        }

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
                else console.log('✅ Auto-backup saved:', result.fileName);
                
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
            console.error('Backup error:', error);
            return null;
        }
    },

    // ============================================
    // ⭐ CORS FIX: URL-encoded form data
    // Content-Type: application/x-www-form-urlencoded 
    // = "Simple Request" = No CORS preflight
    // ============================================
    async callScript(params) {
        console.log('📡 Calling Apps Script:', params.action);

        try {
            const formBody = [];
            for (const key in params) {
                if (params.hasOwnProperty(key)) {
                    let value = params[key];
                    if (typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }
                    formBody.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }
            }
            const body = formBody.join('&');

            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                body: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                }
            });

            const text = await response.text();

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Response not JSON:', text.substring(0, 200));
                return { success: false, error: 'Invalid response from server' };
            }
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    blobToBase64(blob) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    closeModal() {
        document.getElementById('modalContainer').classList.add('hidden');
    },

    showUploadingModal(inv) {
        var modal = document.getElementById('modalContent');
        var container = document.getElementById('modalContainer');
        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#34A853);color:white">
                <h2 style="color:white"><span class="material-icons-round" style="vertical-align:middle">cloud_upload</span> Uploading to Drive</h2>
            </div>
            <div class="modal-body" style="text-align:center;padding:40px 20px">
                <div class="loader" style="margin:0 auto 20px"></div>
                <p style="font-size:15px;font-weight:600">${toProperCase(inv.customer_name)}</p>
                <p style="font-size:13px;color:var(--text-muted)">${inv.invoice_number}</p>
                <p style="font-size:12px;color:var(--text-muted);margin-top:15px">Wait 5-15 seconds...</p>
            </div>
        `;
        container.classList.remove('hidden');
    },

    showSuccessModal(result, inv) {
        var modal = document.getElementById('modalContent');
        var container = document.getElementById('modalContainer');
        var viewUrl = result.viewUrl || '';
        
        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#34A853);color:white">
                <h2 style="color:white"><span class="material-icons-round" style="vertical-align:middle">cloud_done</span> ${result.wasUpdated ? 'Updated!' : 'Uploaded!'}</h2>
                <button class="modal-close" style="color:white" onclick="Drive.closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;padding:20px 0">
                    <div style="width:80px;height:80px;background:#e8f5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 15px">
                        <span class="material-icons-round" style="font-size:50px;color:#34A853">check_circle</span>
                    </div>
                    <h3>✅ Success!</h3>
                </div>
                <div class="calc-box">
                    <div class="calc-row"><span class="calc-label">File:</span><span class="calc-value" style="font-size:11px">${result.fileName || ''}</span></div>
                    <div class="calc-row"><span class="calc-label">Folder:</span><span class="calc-value">${result.folder || 'Root'}</span></div>
                    <div class="calc-row"><span class="calc-label">Customer:</span><span class="calc-value">${toProperCase(inv.customer_name)}</span></div>
                </div>
                <div class="btn-group" style="margin-top:15px">
                    <button class="btn btn-primary" onclick="window.open('${viewUrl}', '_blank')" style="flex:1">
                        <span class="material-icons-round">open_in_new</span> Open
                    </button>
                    <button class="btn btn-secondary" onclick="Drive.copyLink('${viewUrl}')" style="flex:1">
                        <span class="material-icons-round">content_copy</span> Copy Link
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="Drive.closeModal()">Done</button>
            </div>
        `;
        container.classList.remove('hidden');
    },

    showSetupModal() {
        var modal = document.getElementById('modalContent');
        var container = document.getElementById('modalContainer');
        modal.innerHTML = `
            <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#34A853);color:white">
                <h2 style="color:white">Setup Google Drive</h2>
                <button class="modal-close" style="color:white" onclick="Drive.closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Go to Settings → Google Drive Integration → Paste URL</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="Drive.closeModal()">Later</button>
                <button class="btn btn-primary" onclick="Drive.closeModal(); navigateTo('settings')">Setup Now</button>
            </div>
        `;
        container.classList.remove('hidden');
    },

    copyLink(url) {
        if (navigator.clipboard && url) {
            navigator.clipboard.writeText(url).then(function() {
                showToast('📋 Link copied!', 'success');
            });
        }
    }
};

function copyToClipboard(text) {
    if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('📋 Copied!', 'success');
        });
    }
}