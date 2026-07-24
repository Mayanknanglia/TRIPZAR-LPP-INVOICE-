/* =============================================
   SETTINGS v9 - Full Firebase Sync (Profile+Logo+Everything)
   ============================================= */

function renderSettings() {
    const s = DB.getSettings();
    const auth = DB.getAuth();

    const countryOpts = COUNTRIES.map(c => `<option value="${c}" ${c === (s.country || 'India') ? 'selected' : ''}>${c}</option>`).join('');
    const stateOpts = getStateOptions(s.state);

    const container = document.getElementById('page-settings');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Settings</h1>
                <p>Manage profile, company & invoice configuration</p>
            </div>
        </div>

        <!-- USER PROFILE -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">account_circle</span> My Profile
            </div>
            <div class="profile-photo-section">
                <div class="profile-photo-wrapper">
                    <div class="profile-photo-preview">
                        ${auth.profile_photo
                            ? `<img src="${auth.profile_photo}" alt="Profile">`
                            : `<div class="profile-photo-placeholder"><span class="material-icons-round">person</span></div>`}
                    </div>
                    <button class="profile-photo-edit" onclick="document.getElementById('profilePhotoFile').click()">
                        <span class="material-icons-round">photo_camera</span>
                    </button>
                </div>
                <div class="profile-photo-info">
                    <h3>${auth.full_name || 'Admin'}</h3>
                    <p><span class="material-icons-round" style="font-size:14px;vertical-align:middle">work</span> ${auth.role || 'Administrator'}</p>
                    <p><span class="material-icons-round" style="font-size:14px;vertical-align:middle">alternate_email</span> ${auth.username || 'admin'}</p>
                    <div class="btn-group" style="margin-top:10px">
                        <button class="btn btn-sm btn-primary" onclick="document.getElementById('profilePhotoFile').click()">
                            <span class="material-icons-round">upload</span> Upload Photo
                        </button>
                        ${auth.profile_photo ? `<button class="btn btn-sm btn-danger" onclick="removeProfilePhoto()"><span class="material-icons-round">delete</span> Remove</button>` : ''}
                    </div>
                    <input type="file" id="profilePhotoFile" accept="image/*" style="display:none" onchange="uploadProfilePhoto(event)">
                </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" id="profFullName" value="${auth.full_name || ''}">
                </div>
                <div class="form-group">
                    <label>Username * <small style="color:var(--danger)">(Login ID)</small></label>
                    <input type="text" id="profUsername" value="${auth.username || ''}">
                    <small class="input-hint">⚠️ Only this username will work for login</small>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" id="profRole" value="${auth.role || 'Administrator'}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" id="profEmail" value="${auth.email || ''}"></div>
                <div class="form-group"><label>Phone</label><input type="tel" id="profPhone" value="${auth.phone || ''}"></div>
            </div>
            <button class="btn btn-primary" onclick="saveProfile()" style="width:100%;padding:12px">
                <span class="material-icons-round">save</span> Save Profile
            </button>
        </div>

        <!-- CHANGE PASSWORD -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">lock</span> Change Password
            </div>
            <div class="form-group">
                <label>Current Password</label>
                <input type="password" id="setCurrPass">
            </div>
            <div class="form-row">
                <div class="form-group"><label>New Password</label><input type="password" id="setNewPass"></div>
                <div class="form-group"><label>Confirm</label><input type="password" id="setConfPass"></div>
            </div>
            <button class="btn btn-secondary" onclick="changePasswordAction()">
                <span class="material-icons-round">key</span> Change Password
            </button>
        </div>

        <!-- INVOICE TYPE -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">receipt</span> Invoice Type
            </div>
            <div class="form-group">
                <label>Default Invoice Heading</label>
                <select id="setInvoiceType">
                    <option value="Tax Invoice" ${(s.invoice_type || 'Tax Invoice') === 'Tax Invoice' ? 'selected' : ''}>Tax Invoice (with GST)</option>
                    <option value="Invoice" ${s.invoice_type === 'Invoice' ? 'selected' : ''}>Invoice (without Tax label)</option>
                    <option value="Proforma Invoice" ${s.invoice_type === 'Proforma Invoice' ? 'selected' : ''}>Proforma Invoice</option>
                    <option value="Quotation" ${s.invoice_type === 'Quotation' ? 'selected' : ''}>Quotation</option>
                    <option value="Bill of Supply" ${s.invoice_type === 'Bill of Supply' ? 'selected' : ''}>Bill of Supply</option>
                </select>
                <small class="input-hint">This text appears at the top of your invoice PDF</small>
            </div>
        </div>

        <!-- LOGO -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">image</span> Company Logo
            </div>
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
                <div style="width:120px;height:120px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--bg);overflow:hidden;padding:8px">
                    ${s.logo_data
                        ? `<img src="${s.logo_data}" style="max-width:100%;max-height:100%;object-fit:contain">`
                        : `<span style="color:var(--text-muted);font-size:11px;text-align:center">No Logo</span>`}
                </div>
                <div style="flex:1;min-width:200px">
                    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">Appears on invoices & app</p>
                    <input type="file" id="logoFile" accept="image/*" style="display:none" onchange="uploadLogo(event)">
                    <div class="btn-group">
                        <button class="btn btn-primary" onclick="document.getElementById('logoFile').click()">
                            <span class="material-icons-round">upload</span> Upload Logo
                        </button>
                        ${s.logo_data ? `<button class="btn btn-danger" onclick="removeLogo()"><span class="material-icons-round">delete</span> Remove</button>` : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- COMPANY INFO -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">business</span> Company Information
            </div>
            <div class="form-group">
                <label>Company Name *</label>
                <input type="text" id="setCompanyName" value="${s.company_name || ''}">
            </div>

            <div style="background:var(--bg);padding:14px;border-radius:8px;margin-bottom:14px">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:10px;display:block">
                    📍 Company Address
                </label>
                <div class="form-row">
                    <div class="form-group">
                        <label>Building / House No.</label>
                        <input type="text" id="setBuilding" value="${s.building || ''}" placeholder="e.g. 54/90">
                    </div>
                    <div class="form-group">
                        <label>Street</label>
                        <input type="text" id="setStreet" value="${s.street || ''}" placeholder="e.g. Rajat Path">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Area / Locality</label>
                        <input type="text" id="setArea" value="${s.area || ''}" placeholder="e.g. Mansarovar">
                    </div>
                    <div class="form-group">
                        <label>City</label>
                        <input type="text" id="setCity" value="${s.city || ''}" placeholder="e.g. Jaipur">
                    </div>
                    <div class="form-group">
                        <label>Pincode</label>
                        <input type="text" id="setPincode" value="${s.pincode || ''}" placeholder="e.g. 302020">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>State *</label>
                        <select id="setState" onchange="autoFillStateCode()">${stateOpts}</select>
                    </div>
                    <div class="form-group">
                        <label>State Code</label>
                        <input type="text" id="setStateCode" value="${s.state_code || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Country *</label>
                        <select id="setCountry">${countryOpts}</select>
                    </div>
                </div>
                <div class="calc-box" style="margin-top:10px;padding:10px;background:white;border:1px solid var(--border)">
                    <small style="color:var(--text-muted);font-weight:600">📄 Preview on Invoice:</small>
                    <div id="addressPreview" style="font-size:12px;color:var(--text);margin-top:5px;font-family:'Courier New', monospace">
                        ${buildAddressPreview(s)}
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group"><label>GSTIN</label><input type="text" id="setGstin" value="${s.gstin || ''}" style="text-transform:uppercase"></div>
                <div class="form-group"><label>UDYAM</label><input type="text" id="setUdyam" value="${s.udyam || ''}"></div>
                <div class="form-group"><label>PAN</label><input type="text" id="setPan" value="${s.pan || ''}" style="text-transform:uppercase"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input type="tel" id="setPhone" value="${s.phone || ''}"></div>
                <div class="form-group"><label>Email</label><input type="email" id="setEmail" value="${s.email || ''}"></div>
                <div class="form-group"><label>Website</label><input type="text" id="setWebsite" value="${s.website || ''}"></div>
            </div>
        </div>

        <!-- BANK -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">account_balance</span> Bank Details
            </div>
            <div class="form-row">
                <div class="form-group"><label>Bank Name</label><input type="text" id="setBankName" value="${s.bank_name || ''}"></div>
                <div class="form-group"><label>A/c Holder</label><input type="text" id="setBankAccName" value="${s.bank_account_name || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Account No</label><input type="text" id="setBankAccNo" value="${s.bank_account_no || ''}"></div>
                <div class="form-group"><label>Branch</label><input type="text" id="setBankBranch" value="${s.bank_branch || ''}"></div>
                <div class="form-group"><label>IFSC</label><input type="text" id="setBankIfsc" value="${s.bank_ifsc || ''}" style="text-transform:uppercase"></div>
            </div>
        </div>

        <!-- DECLARATION -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">description</span> Declaration
            </div>
            <textarea id="setDeclaration" rows="3">${s.declaration || ''}</textarea>
        </div>

        <button class="btn btn-primary" onclick="saveSettingsAction()" style="width:100%;padding:14px;font-size:15px;margin-bottom:20px">
            <span class="material-icons-round">save</span> Save Company Settings
        </button>

        <!-- ==================== 🔥 FIREBASE CLOUD SYNC ==================== -->
        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid #FFA500">
            <div class="section-heading" style="margin-top:0;color:#FFA500">
                <span class="material-icons-round">cloud_sync</span> 🔥 Multi-Device Cloud Sync (Firebase)
            </div>
            
            <div style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#e65100">
                <strong>⚡ Everything Syncs:</strong> Invoices, Customers, Profile Photo, Logo, Settings — sab automatic sync ho jayega har device pe!
            </div>

            <div class="btn-group">
                <button class="btn btn-primary" onclick="uploadToCloud()" style="background:linear-gradient(135deg,#FFA500,#FF6B00)">
                    <span class="material-icons-round">cloud_upload</span> Upload All Data to Cloud
                </button>
                <button class="btn btn-secondary" onclick="syncFromCloud()">
                    <span class="material-icons-round">cloud_download</span> Sync from Cloud
                </button>
                <button class="btn btn-secondary" onclick="checkFirebaseStatus()">
                    <span class="material-icons-round">info</span> Check Status
                </button>
            </div>

            <div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:6px;font-size:11px;line-height:1.6">
                <strong style="color:var(--primary)">📱 How to use on other devices:</strong><br>
                1. Same URL open karo doosre device pe<br>
                2. Auto-login ho jayega Firebase pe<br>
                3. Sab data automatic sync — profile pic, logo, invoices sab! ⚡<br>
                4. Ek device pe change → dusre pe instant update!
            </div>

            <details style="margin-top:12px">
                <summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--primary);padding:6px 0">
                    📋 First Time Setup Instructions
                </summary>
                <div style="margin-top:8px;font-size:11px;line-height:1.7;padding:10px;background:var(--bg);border-radius:6px">
                    <ol style="padding-left:20px;margin:0">
                        <li><strong>This Device:</strong> Click "Upload All Data to Cloud" ✅</li>
                        <li><strong>Wait 30 seconds</strong> - all data uploads (invoices, customers, profile pic, logo)</li>
                        <li><strong>Other Device:</strong> Open same URL</li>
                        <li><strong>Auto-login</strong> Firebase pe ho jayega</li>
                        <li><strong>Automatic sync</strong> starts! ⚡</li>
                        <li>Any change on any device → all devices update instantly!</li>
                    </ol>
                </div>
            </details>
        </div>

        <!-- ==================== GOOGLE DRIVE INTEGRATION ==================== -->
        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid #4285F4">
            <div class="section-heading" style="margin-top:0;color:#4285F4">
                <span class="material-icons-round">cloud</span> Google Drive Integration
            </div>
            
            <div style="background:#e8f0fe;padding:12px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#1a73e8">
                <strong>📌 For PDF backups:</strong> Upload invoice PDFs to Google Drive folder automatically
            </div>

            <div class="form-group">
                <label>Apps Script Web App URL</label>
                <input type="text" id="setDriveUrl" value="${s.drive_script_url || ''}" placeholder="https://script.google.com/macros/s/xxxxx/exec">
                <small class="input-hint">Paste the deployment URL from Google Apps Script</small>
            </div>

            <div class="btn-group">
                <button class="btn btn-primary" onclick="saveDriveUrl()">
                    <span class="material-icons-round">save</span> Save URL
                </button>
                <button class="btn btn-secondary" onclick="testDriveConnection()">
                    <span class="material-icons-round">wifi_tethering</span> Test Connection
                </button>
                <button class="btn" style="background:#4285F4;color:white" onclick="backupToDriveAction()">
                    <span class="material-icons-round">backup</span> Backup to Drive
                </button>
            </div>

            <!-- AUTO-SAVE TOGGLES -->
            <div style="margin-top:20px;padding:15px;background:#f0f7ff;border-radius:8px;border:1px solid #4285F4">
                <div style="font-weight:700;font-size:13px;color:#1a73e8;margin-bottom:12px;display:flex;align-items:center;gap:6px">
                    <span class="material-icons-round" style="font-size:18px">auto_awesome</span>
                    Automation Settings
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:white;border-radius:6px;margin-bottom:10px">
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:600;color:var(--text)">☁️ Auto-Save Invoices</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Automatically upload PDF to Drive when invoice is saved</div>
                    </div>
                    <label class="toggle-switch" style="position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0">
                        <input type="checkbox" id="autoSaveToggle" ${s.drive_auto_save ? 'checked' : ''} onchange="toggleAutoSave(this.checked)" style="opacity:0;width:0;height:0">
                        <span class="toggle-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${s.drive_auto_save ? '#4285F4' : '#ccc'};transition:.3s;border-radius:26px">
                            <span style="position:absolute;height:20px;width:20px;left:${s.drive_auto_save ? '27px' : '3px'};bottom:3px;background:white;transition:.3s;border-radius:50%"></span>
                        </span>
                    </label>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:white;border-radius:6px">
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:600;color:var(--text)">💾 Auto-Backup Every 30 Min</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Automatically backup all data to Drive</div>
                    </div>
                    <label class="toggle-switch" style="position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0">
                        <input type="checkbox" id="autoBackupToggle" ${s.drive_auto_backup ? 'checked' : ''} onchange="toggleAutoBackup(this.checked)" style="opacity:0;width:0;height:0">
                        <span class="toggle-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${s.drive_auto_backup ? '#4285F4' : '#ccc'};transition:.3s;border-radius:26px">
                            <span style="position:absolute;height:20px;width:20px;left:${s.drive_auto_backup ? '27px' : '3px'};bottom:3px;background:white;transition:.3s;border-radius:50%"></span>
                        </span>
                    </label>
                </div>
            </div>

            ${s.last_drive_backup ? `
                <p style="margin-top:12px;font-size:12px;color:var(--success)">
                    ✅ Last Drive backup: ${new Date(s.last_drive_backup).toLocaleString()}
                </p>
            ` : ''}
        </div>

        <!-- LOCAL DATA BACKUP -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">backup</span> Local Data Backup (JSON)
            </div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
                Export/Import complete database as JSON file
            </p>
            <div class="btn-group">
                <button class="btn btn-secondary" onclick="exportDataBackup()">
                    <span class="material-icons-round">download</span> Export Backup
                </button>
                <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">
                    <span class="material-icons-round">upload</span> Import Backup
                </button>
                <input type="file" id="importFile" accept=".json" style="display:none" onchange="importDataBackup(event)">
            </div>
        </div>
    `;

    // Auto-update address preview
    ['setBuilding', 'setStreet', 'setArea', 'setCity', 'setPincode', 'setState', 'setCountry'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateAddressPreview);
        if (el && el.tagName === 'SELECT') el.addEventListener('change', updateAddressPreview);
    });
}

// ============================================
// ADDRESS PREVIEW
// ============================================
function buildAddressPreview(s) {
    const line1Parts = [s.building, s.street, s.area].filter(x => x && x.trim()).join(', ');
    const line2Parts = [s.city, s.state, s.pincode].filter(x => x && x.trim()).join(', ');
    const line3 = s.country || 'India';
    return `${line1Parts || 'Address Line 1'}<br>${line2Parts || 'City, State, Pincode'}<br>${line3}`;
}

function updateAddressPreview() {
    const tempSettings = {
        building: document.getElementById('setBuilding')?.value || '',
        street: document.getElementById('setStreet')?.value || '',
        area: document.getElementById('setArea')?.value || '',
        city: document.getElementById('setCity')?.value || '',
        state: document.getElementById('setState')?.value || '',
        pincode: document.getElementById('setPincode')?.value || '',
        country: document.getElementById('setCountry')?.value || ''
    };
    const preview = document.getElementById('addressPreview');
    if (preview) preview.innerHTML = buildAddressPreview(tempSettings);
}

function autoFillStateCode() {
    const state = document.getElementById('setState').value;
    const code = INDIAN_STATES[state] || '';
    document.getElementById('setStateCode').value = code;
    updateAddressPreview();
}

// ============================================
// ⭐ PROFILE PHOTO — WITH FIREBASE SYNC
// ============================================
function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const auth = DB.getAuth();
        auth.profile_photo = e.target.result;
        
        // 🔥 Sync to Firebase
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
            await FirebaseSync.saveAuth(auth);
            showToast('☁️ Photo updated & synced to cloud!', 'success');
        } else {
            DB.saveAuth(auth);
            showToast('✅ Photo updated!', 'success');
        }
        
        renderSettings();
        if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
    };
    reader.readAsDataURL(file);
}

async function removeProfilePhoto() {
    if (!confirmDialog('Remove photo?')) return;
    const auth = DB.getAuth();
    auth.profile_photo = '';
    
    // 🔥 Sync to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.saveAuth(auth);
        showToast('☁️ Removed & synced!', 'success');
    } else {
        DB.saveAuth(auth);
        showToast('✅ Removed!', 'success');
    }
    
    renderSettings();
    if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
}

// ============================================
// ⭐ SAVE PROFILE — WITH FIREBASE SYNC
// ============================================
async function saveProfile() {
    const fullName = document.getElementById('profFullName').value.trim();
    const username = document.getElementById('profUsername').value.trim();
    const role = document.getElementById('profRole').value.trim();
    const email = document.getElementById('profEmail').value.trim();
    const phone = document.getElementById('profPhone').value.trim();

    if (!fullName) { showToast('Name required!', 'error'); return; }
    if (!username || username.length < 3) { showToast('Username min 3 chars!', 'error'); return; }
    if (username.includes(' ')) { showToast('No spaces!', 'error'); return; }

    const auth = DB.getAuth();
    auth.full_name = fullName;
    auth.username = username;
    auth.role = role || 'Administrator';
    auth.email = email;
    auth.phone = phone;
    
    // 🔥 Sync to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.saveAuth(auth);
        showToast('☁️ Profile saved & synced to cloud!', 'success');
    } else {
        DB.saveAuth(auth);
        showToast('✅ Profile saved!', 'success');
    }
    
    if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
    renderSettings();
}

// ============================================
// ⭐ LOGO — WITH FIREBASE SYNC
// ============================================
function uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const settings = DB.getSettings();
        settings.logo_data = e.target.result;
        
        // 🔥 Sync to Firebase
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
            await FirebaseSync.saveSettings(settings);
            showToast('☁️ Logo uploaded & synced to cloud!', 'success');
        } else {
            DB.saveSettings(settings);
            showToast('✅ Logo uploaded!', 'success');
        }
        
        renderSettings();
        if (typeof syncAppLogo === 'function') syncAppLogo();
    };
    reader.readAsDataURL(file);
}

async function removeLogo() {
    if (!confirmDialog('Remove logo?')) return;
    const settings = DB.getSettings();
    delete settings.logo_data;
    
    // 🔥 Sync to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.saveSettings(settings);
        showToast('☁️ Removed & synced!', 'success');
    } else {
        DB.saveSettings(settings);
        showToast('✅ Removed!', 'success');
    }
    
    renderSettings();
    if (typeof syncAppLogo === 'function') syncAppLogo();
}

// ============================================
// SAVE COMPANY SETTINGS (with Firebase sync)
// ============================================
async function saveSettingsAction() {
    const currentSettings = DB.getSettings();
    const settings = {
        ...currentSettings,
        drive_script_url: currentSettings.drive_script_url || '',
        drive_auto_save: currentSettings.drive_auto_save || false,
        drive_auto_backup: currentSettings.drive_auto_backup || false,
        last_drive_backup: currentSettings.last_drive_backup || '',
        invoice_type: document.getElementById('setInvoiceType').value || 'Tax Invoice',
        company_name: document.getElementById('setCompanyName').value,
        building: document.getElementById('setBuilding').value,
        street: document.getElementById('setStreet').value,
        area: document.getElementById('setArea').value,
        city: document.getElementById('setCity').value,
        pincode: document.getElementById('setPincode').value,
        state: document.getElementById('setState').value,
        state_code: document.getElementById('setStateCode').value,
        country: document.getElementById('setCountry').value,
        gstin: document.getElementById('setGstin').value.toUpperCase(),
        udyam: document.getElementById('setUdyam').value,
        pan: document.getElementById('setPan').value.toUpperCase(),
        phone: document.getElementById('setPhone').value,
        email: document.getElementById('setEmail').value,
        website: document.getElementById('setWebsite').value,
        bank_name: document.getElementById('setBankName').value,
        bank_account_name: document.getElementById('setBankAccName').value,
        bank_account_no: document.getElementById('setBankAccNo').value,
        bank_branch: document.getElementById('setBankBranch').value,
        bank_ifsc: document.getElementById('setBankIfsc').value.toUpperCase(),
        declaration: document.getElementById('setDeclaration').value
    };
    
    // 🔥 Sync to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.userId) {
        await FirebaseSync.saveSettings(settings);
        showToast('☁️ Settings saved & synced to cloud!', 'success');
    } else {
        DB.saveSettings(settings);
        showToast('✅ Settings saved!', 'success');
    }
}

// ============================================
// ⭐ CHANGE PASSWORD — WITH FIREBASE SYNC
// ============================================
async function changePasswordAction() {
    const curr = document.getElementById('setCurrPass').value;
    const newP = document.getElementById('setNewPass').value;
    const conf = document.getElementById('setConfPass').value;
    if (!curr || !newP || !conf) { showToast('Fill all!', 'error'); return; }
    if (newP !== conf) { showToast('Dont match!', 'error'); return; }
    
    const result = Auth.changePassword(curr, newP);
    
    // 🔥 Sync updated auth (with new password) to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        const auth = DB.getAuth();
        await FirebaseSync.saveAuth(auth);
        console.log('☁️ Password synced to cloud');
    }
    
    document.getElementById('setCurrPass').value = '';
    document.getElementById('setNewPass').value = '';
    document.getElementById('setConfPass').value = '';
}

// ============================================
// GOOGLE DRIVE FUNCTIONS
// ============================================
function saveDriveUrl() {
    const url = document.getElementById('setDriveUrl').value.trim();
    if (!url) { showToast('Please enter URL!', 'error'); return; }
    if (!url.includes('script.google.com')) {
        showToast('❌ Invalid URL!', 'error');
        return;
    }
    if (typeof Drive === 'undefined') {
        showToast('❌ Drive module not loaded', 'error');
        return;
    }
    Drive.setScriptUrl(url);
    
    // Also sync Drive URL to Firebase (as part of settings)
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        const settings = DB.getSettings();
        FirebaseSync.saveSettings(settings);
    }
    
    showToast('✅ Drive URL saved!', 'success');
}

async function testDriveConnection() {
    const url = document.getElementById('setDriveUrl').value.trim();
    if (!url) { showToast('Save URL first!', 'error'); return; }
    if (typeof Drive === 'undefined') { showToast('❌ Drive module not loaded', 'error'); return; }
    Drive.setScriptUrl(url);
    showToast('🔄 Testing...', 'info');
    try {
        const result = await Drive.testConnection();
        if (result.success) {
            const folderName = result.folder?.name || 'OK';
            showToast(`✅ Connected! Folder: ${folderName}`, 'success');
        } else {
            showToast('❌ Failed: ' + (result.error || 'Check URL'), 'error');
        }
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

async function backupToDriveAction() {
    if (typeof Drive === 'undefined') { showToast('❌ Drive not loaded', 'error'); return; }
    if (!Drive.isConfigured()) { showToast('⚠️ Save Drive URL first!', 'warning'); return; }
    const result = await Drive.backupToDrive();
    if (result && result.success) {
        setTimeout(() => renderSettings(), 1000);
    }
}

// ============================================
// AUTO-SAVE & AUTO-BACKUP TOGGLES
// ============================================
async function toggleAutoSave(enabled) {
    if (typeof Drive === 'undefined') {
        showToast('❌ Drive module not loaded', 'error');
        renderSettings();
        return;
    }
    if (enabled && !Drive.isConfigured()) {
        showToast('⚠️ Save Drive URL first!', 'warning');
        document.getElementById('autoSaveToggle').checked = false;
        return;
    }
    Drive.setAutoSave(enabled);
    
    // Sync setting to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        const settings = DB.getSettings();
        await FirebaseSync.saveSettings(settings);
    }
    
    if (enabled) {
        showToast('✅ Auto-Save enabled! PDFs will auto-upload on save.', 'success');
    } else {
        showToast('⭕ Auto-Save disabled', 'info');
    }
    setTimeout(() => renderSettings(), 300);
}

async function toggleAutoBackup(enabled) {
    if (typeof Drive === 'undefined') {
        showToast('❌ Drive module not loaded', 'error');
        renderSettings();
        return;
    }
    if (enabled && !Drive.isConfigured()) {
        showToast('⚠️ Save Drive URL first!', 'warning');
        document.getElementById('autoBackupToggle').checked = false;
        return;
    }
    Drive.setAutoBackup(enabled);
    
    // Sync setting to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        const settings = DB.getSettings();
        await FirebaseSync.saveSettings(settings);
    }
    
    if (enabled) {
        showToast('✅ Auto-Backup enabled! Data will backup every 30 min.', 'success');
    } else {
        showToast('⭕ Auto-Backup disabled', 'info');
    }
    setTimeout(() => renderSettings(), 300);
}

// ============================================
// 🔥 FIREBASE CLOUD SYNC FUNCTIONS
// ============================================
async function uploadToCloud() {
    if (typeof FirebaseSync === 'undefined' || !FirebaseSync.initialized) {
        showToast('❌ Firebase not initialized. Check console.', 'error');
        return;
    }
    if (!FirebaseSync.userId) {
        showToast('⏳ Waiting for auto-login...', 'info');
        // Try auto-login again
        await FirebaseSync.autoLogin();
        if (!FirebaseSync.userId) {
            showFirebaseLoginModal();
            return;
        }
    }
    
    if (!confirmDialog('🚀 Upload all local data to Firebase cloud?\n\nThis will upload:\n• All invoices\n• All customers\n• Profile photo\n• Company logo\n• Settings\n• Password\n\nMake it available on all your devices!')) return;
    
    const result = await FirebaseSync.migrateLocalToCloud();
    if (result) {
        showToast('🎉 Everything synced! Open on any device to see all data.', 'success');
    }
}

async function syncFromCloud() {
    if (typeof FirebaseSync === 'undefined' || !FirebaseSync.initialized) {
        showToast('❌ Firebase not initialized', 'error');
        return;
    }
    if (!FirebaseSync.userId) {
        showToast('⏳ Waiting for auto-login...', 'info');
        await FirebaseSync.autoLogin();
        if (!FirebaseSync.userId) {
            showFirebaseLoginModal();
            return;
        }
    }
    await FirebaseSync.fullSync();
}

function checkFirebaseStatus() {
    const status = {
        'Firebase SDK': typeof window.firebaseDB !== 'undefined' ? '✅ Loaded' : '❌ Not loaded',
        'Sync Module': typeof FirebaseSync !== 'undefined' ? '✅ Loaded' : '❌ Not loaded',
        'Initialized': FirebaseSync?.initialized ? '✅ Yes' : '❌ No',
        'Internet': FirebaseSync?.online ? '✅ Online' : '❌ Offline',
        'Firebase Login': FirebaseSync?.userId ? '✅ Auto Logged In' : '❌ Not logged in',
        'User ID': FirebaseSync?.userId ? FirebaseSync.userId.substring(0, 20) + '...' : 'None',
        'Active Listeners': FirebaseSync?.listeners.length || 0,
        'Pending Queue': JSON.parse(localStorage.getItem('firebase_queue') || '[]').length
    };
    
    const msg = Object.entries(status).map(([k, v]) => `${k}: ${v}`).join('\n');
    alert('🔥 Firebase Sync Status:\n\n' + msg);
    
    if (!FirebaseSync?.userId) {
        setTimeout(() => showFirebaseLoginModal(), 500);
    }
}

// ============================================
// FIREBASE LOGIN MODAL (Manual backup)
// ============================================
function showFirebaseLoginModal() {
    const modal = document.getElementById('modalContent');
    const container = document.getElementById('modalContainer');

    modal.innerHTML = `
        <div class="modal-header" style="background:linear-gradient(135deg,#FFA500,#FF6B00);color:white">
            <h2 style="color:white">
                <span class="material-icons-round" style="vertical-align:middle">cloud_sync</span>
                Firebase Manual Login
            </h2>
            <button class="modal-close" style="color:white" onclick="closeFirebaseLoginModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:15px;font-size:12px;color:#e65100">
                <strong>⚠️ Auto-login failed?</strong> Try manual login. Default credentials pre-filled below.
            </div>

            <div class="form-group">
                <label>Firebase Email</label>
                <input type="email" id="fbLoginEmail" value="admin@tripzar.com" placeholder="admin@tripzar.com">
            </div>

            <div class="form-group">
                <label>Firebase Password</label>
                <input type="password" id="fbLoginPass" value="tripzar@123" placeholder="Enter password">
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeFirebaseLoginModal()">Cancel</button>
            <button class="btn btn-primary" onclick="doFirebaseLogin()" style="background:linear-gradient(135deg,#FFA500,#FF6B00)">
                <span class="material-icons-round">login</span> Login to Firebase
            </button>
        </div>
    `;
    container.classList.remove('hidden');
    setTimeout(() => document.getElementById('fbLoginPass')?.focus(), 300);
}

async function doFirebaseLogin() {
    const email = document.getElementById('fbLoginEmail').value.trim();
    const pass = document.getElementById('fbLoginPass').value.trim();

    if (!email || !pass) { showToast('Enter both email and password!', 'error'); return; }

    showToast('🔄 Logging in to Firebase...', 'info');
    
    try {
        const result = await FirebaseSync.login(email, pass);
        if (result.success) {
            showToast('✅ Firebase login successful! Cloud sync active!', 'success');
            closeFirebaseLoginModal();
            
            setTimeout(async () => {
                await FirebaseSync.fullSync();
            }, 1000);
        } else {
            showToast('❌ Firebase login failed: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

function closeFirebaseLoginModal() {
    document.getElementById('modalContainer').classList.add('hidden');
}

// ============================================
// LOCAL BACKUP
// ============================================
function exportDataBackup() {
    const data = DB.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tripzar_Backup_${getTodayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Backup exported!', 'success');
}

function importDataBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirmDialog('⚠️ Replace all current data?')) {
                DB.importAllData(data);
                showToast('✅ Imported! Refreshing...', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } catch (err) {
            showToast('❌ Invalid file!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}