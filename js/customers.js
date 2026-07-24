/* =============================================
   CUSTOMERS v5 - COMPLETE
   ✅ GST Auto-Fetch (5 APIs)
   ✅ GST Portal Direct Link
   ✅ Helper Modal with Steps
   ✅ Firebase Sync
   ============================================= */

let customerSearchQuery = '';

// ============================================
// RENDER CUSTOMERS LIST
// ============================================
function renderCustomers() {
    const customers = DB.searchCustomers(customerSearchQuery);

    const container = document.getElementById('page-customers');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Customers</h1>
                <p>${customers.length} total customers</p>
            </div>
            <div class="btn-group">
                <button class="btn btn-secondary" onclick="openGSTSearchModal()">
                    <span class="material-icons-round">search</span> GST Search
                </button>
                <button class="btn btn-primary" onclick="openCustomerModal()">
                    <span class="material-icons-round">person_add</span> Add Customer
                </button>
            </div>
        </div>

        <div class="search-box">
            <input type="text" placeholder="🔍 Search by name, GST, phone, email..." value="${customerSearchQuery}" onkeyup="customerSearchQuery=this.value; renderCustomers()">
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th class="hide-mobile">GST/Tax ID</th>
                            <th class="hide-mobile">Location</th>
                            <th class="hide-mobile">Phone</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.length === 0 ? `
                            <tr><td colspan="5"><div class="empty-state"><span class="material-icons-round">people</span><p>No customers found</p><button class="btn btn-primary" onclick="openCustomerModal()">Add First Customer</button></div></td></tr>
                        ` : customers.map(c => `
                            <tr>
                                <td>
                                    <strong>${c.name}</strong>
                                    ${c.email ? `<br><small style="color:var(--text-muted);font-size:11px">📧 ${c.email}</small>` : ''}
                                </td>
                                <td class="hide-mobile">
                                    ${c.gst_no ? `<span style="font-family:monospace;font-size:12px;color:var(--primary)">${c.gst_no}</span>` : '-'}
                                </td>
                                <td class="hide-mobile">${c.state || '-'}${c.country && c.country !== 'India' ? ', ' + c.country : ''}</td>
                                <td class="hide-mobile">${c.phone || '-'}</td>
                                <td class="text-right">
                                    <div class="table-actions">
                                        <button class="btn-sm btn-edit" onclick="openCustomerModal('${c.id}')">Edit</button>
                                        <button class="btn-sm btn-del" onclick="deleteCustomerAction('${c.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// CUSTOMER MODAL (Add/Edit)
// ============================================
function openCustomerModal(id = null) {
    const customer = id ? DB.getCustomerById(id) : null;
    const isEdit = !!customer;

    const countryOptions = COUNTRIES.map(c => `<option value="${c}">`).join('');
    const stateOptions = Object.keys(INDIAN_STATES).map(s => `<option value="${s}">`).join('');

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
        <div class="modal-header">
            <h2>
                <span class="material-icons-round" style="vertical-align:middle;color:var(--primary)">${isEdit ? 'edit' : 'person_add'}</span>
                ${isEdit ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            
            <!-- ============ GST AUTO-FETCH SECTION ============ -->
            <div style="background:linear-gradient(135deg,#fff9e6,#fff3d1);padding:14px;border-radius:10px;margin-bottom:20px;border:2px solid #ffc107">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                    <span class="material-icons-round" style="color:#ff9800">auto_awesome</span>
                    <strong style="color:#e65100;font-size:14px">✨ GST Auto-Fetch — 2 Methods Available!</strong>
                </div>
                
                <div class="form-group" style="margin-bottom:0">
                    <label>GSTIN <small style="color:var(--success);font-weight:normal">(Auto-fill enabled)</small></label>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <input type="text" id="custGst" value="${customer?.gst_no || ''}" maxlength="15" 
                               placeholder="e.g. 08ABAFT1155E1ZH" 
                               style="text-transform:uppercase;flex:1;min-width:200px;font-family:monospace;font-weight:600;font-size:14px" 
                               oninput="onGSTInput(this)">
                        <button type="button" class="btn btn-primary" id="gstFetchBtn" onclick="fetchGSTDetails()" 
                                style="padding:8px 18px;white-space:nowrap;background:linear-gradient(135deg,#ff9800,#f57c00);border:none">
                            <span class="material-icons-round">auto_awesome</span> Auto Fetch
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="openGSTPortalSearch()" 
                                style="padding:8px 14px;white-space:nowrap;background:linear-gradient(135deg,#4285F4,#1a73e8);color:white;border:none">
                            <span class="material-icons-round">public</span> GST Portal
                        </button>
                    </div>
                    <small class="input-hint" id="gstHint" style="margin-top:8px;display:block">
                        💡 <strong style="color:#ff9800">Auto Fetch:</strong> Try 5 APIs automatically | 
                        <strong style="color:#4285F4">GST Portal:</strong> Government site (100% reliable)
                    </small>
                    <div id="gstStatusBadge" style="margin-top:8px"></div>
                </div>
            </div>

            <!-- ============ BASIC INFO ============ -->
            <div class="section-heading">
                <span class="material-icons-round">person</span> Basic Information
            </div>
            <div class="form-group">
                <label>Customer Name / Company Name *</label>
                <input type="text" id="custName" value="${customer?.name || ''}" placeholder="e.g. PRADEEP KUMAR JANGID" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>PAN Number</label>
                    <input type="text" id="custPan" value="${customer?.pan || ''}" maxlength="15" placeholder="e.g. ABAFT1155E" style="text-transform:uppercase">
                </div>
                <div class="form-group">
                    <label>Business Type</label>
                    <input type="text" id="custBusinessType" value="${customer?.business_type || ''}" placeholder="e.g. Proprietorship, Pvt Ltd">
                </div>
            </div>

            <!-- ============ CONTACT ============ -->
            <div class="section-heading">
                <span class="material-icons-round">contact_phone</span> Contact
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="custPhone" value="${customer?.phone || ''}" placeholder="+91 9876543210">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="custEmail" value="${customer?.email || ''}" placeholder="email@example.com">
                </div>
            </div>

            <!-- ============ ADDRESS ============ -->
            <div class="section-heading">
                <span class="material-icons-round">location_on</span> Address
            </div>
            <div class="form-group">
                <label>Full Address</label>
                <textarea id="custAddress" rows="2" placeholder="Building, Street, Area">${customer?.address || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="custCity" value="${customer?.city || ''}" placeholder="e.g. Jaipur">
                </div>
                <div class="form-group">
                    <label>Pincode</label>
                    <input type="text" id="custPincode" value="${customer?.pincode || ''}" placeholder="e.g. 302020">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>State <small style="color:var(--text-muted)">(Type or select)</small></label>
                    <input type="text" id="custState" list="stateList" value="${customer?.state || ''}" placeholder="Type any state" autocomplete="off" oninput="autoUpdateStateCode()">
                    <datalist id="stateList">${stateOptions}</datalist>
                </div>
                <div class="form-group">
                    <label>State Code</label>
                    <input type="text" id="custStateCode" value="${customer?.state_code || ''}" placeholder="Auto">
                </div>
            </div>
            <div class="form-group">
                <label>Country</label>
                <input type="text" id="custCountry" list="countryList" value="${customer?.country || 'India'}" placeholder="Type or select" autocomplete="off">
                <datalist id="countryList">${countryOptions}</datalist>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">
                <span class="material-icons-round">close</span> Cancel
            </button>
            <button class="btn btn-primary" onclick="saveCustomer('${id || ''}')">
                <span class="material-icons-round">${isEdit ? 'save' : 'add'}</span>
                ${isEdit ? 'Update' : 'Add Customer'}
            </button>
        </div>
    `;
    document.getElementById('modalContainer').classList.remove('hidden');
}

// ============================================
// GST INPUT LIVE VALIDATION
// ============================================
function onGSTInput(input) {
    const gstin = input.value.trim().toUpperCase();
    input.value = gstin;

    const hint = document.getElementById('gstHint');
    const badge = document.getElementById('gstStatusBadge');
    const fetchBtn = document.getElementById('gstFetchBtn');

    if (gstin.length === 0) {
        if (hint) hint.innerHTML = '💡 <strong style="color:#ff9800">Auto Fetch:</strong> Try 5 APIs | <strong style="color:#4285F4">GST Portal:</strong> Government site';
        if (badge) badge.innerHTML = '';
        return;
    }

    if (gstin.length < 15) {
        if (hint) hint.innerHTML = `⏳ ${15 - gstin.length} more characters needed`;
        if (badge) badge.innerHTML = '';
        return;
    }

    if (gstin.length === 15) {
        if (typeof GSTLookup !== 'undefined' && GSTLookup.isValidGSTIN(gstin)) {
            const stateInfo = GSTLookup.getStateFromGSTIN(gstin);
            const pan = GSTLookup.getPANFromGSTIN(gstin);

            if (hint) hint.innerHTML = `✅ Valid GSTIN! State: <strong>${stateInfo?.state || 'Unknown'}</strong> | PAN: <strong>${pan}</strong>`;
            if (badge) badge.innerHTML = `<span class="badge badge-success">✅ Valid — Click "Auto Fetch" or "GST Portal"!</span>`;
            if (fetchBtn) fetchBtn.style.animation = 'pulse-install 1.5s infinite';
        } else {
            if (hint) hint.innerHTML = '❌ Invalid GSTIN format';
            if (badge) badge.innerHTML = `<span class="badge badge-danger">❌ Invalid Format</span>`;
        }
    }
}

// ============================================
// AUTO-FETCH GST DETAILS (5 APIs Try)
// ============================================
async function fetchGSTDetails() {
    const gstin = document.getElementById('custGst').value.trim().toUpperCase();

    if (!gstin) {
        showToast('Enter GSTIN first!', 'error');
        return;
    }

    if (typeof GSTLookup === 'undefined') {
        showToast('❌ GST module not loaded. Refresh page.', 'error');
        return;
    }

    if (!GSTLookup.isValidGSTIN(gstin)) {
        showToast('❌ Invalid GSTIN format!', 'error');
        return;
    }

    const btn = document.getElementById('gstFetchBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Fetching...';
    btn.disabled = true;
    btn.style.animation = 'none';

    const badge = document.getElementById('gstStatusBadge');
    if (badge) badge.innerHTML = '<span class="badge badge-info">🔄 Trying 5 APIs...</span>';

    showToast('🔍 Auto-fetching from multiple APIs...', 'info');

    try {
        const result = await GSTLookup.lookup(gstin);

        if (result.success && result.data) {
            const d = result.data;
            let filledCount = 0;

            const fieldMap = {
                'custName': d.name || d.trade_name || d.legal_name,
                'custPan': d.pan,
                'custAddress': d.address || [d.building, d.street, d.area].filter(x => x).join(', '),
                'custCity': d.city,
                'custPincode': d.pincode,
                'custState': d.state,
                'custStateCode': d.state_code,
                'custCountry': d.country || 'India',
                'custBusinessType': d.business_type
            };

            for (const [fieldId, value] of Object.entries(fieldMap)) {
                const el = document.getElementById(fieldId);
                if (el && value) {
                    el.value = value;
                    el.style.background = '#d1fae5';
                    el.style.transition = 'background 3s';
                    setTimeout(() => { el.style.background = ''; }, 3000);
                    filledCount++;
                }
            }

            const statusColor = d.status === 'Active' ? 'badge-success' : 'badge-warning';
            if (badge) {
                badge.innerHTML = `
                    <span class="badge ${statusColor}" style="margin-right:4px">Status: ${d.status || 'Unknown'}</span>
                    ${d.business_type ? `<span class="badge badge-info">${d.business_type}</span>` : ''}
                    ${result.source ? `<br><small style="color:var(--text-muted);margin-top:4px;display:inline-block">Source: ${result.source}</small>` : ''}
                `;
            }

            if (result.partial) {
                showToast(`⚠️ Only ${filledCount} fields extracted from GSTIN. Use "GST Portal" for full details.`, 'warning');
                if (result.message) {
                    setTimeout(() => showToast(result.message, 'info'), 2500);
                }
            } else {
                showToast(`✅ ${filledCount} fields auto-filled from ${result.source}!`, 'success');
            }
        } else {
            showToast(result.error || '❌ Failed to fetch', 'error');
            if (badge) badge.innerHTML = '<span class="badge badge-danger">❌ Fetch failed - Try GST Portal button</span>';
        }
    } catch (error) {
        console.error('GST fetch error:', error);
        showToast('❌ Network error. Try GST Portal button.', 'error');
        if (badge) badge.innerHTML = '<span class="badge badge-danger">❌ Try GST Portal</span>';
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// ============================================
// 🌐 OPEN GST PORTAL (Government Website)
// ============================================
function openGSTPortalSearch() {
    const gstin = document.getElementById('custGst').value.trim().toUpperCase();
    
    if (!gstin) {
        // No GSTIN, just open portal
        window.open('https://services.gst.gov.in/services/searchtp', '_blank');
        showToast('🌐 GST Portal opened. Enter GSTIN there and copy details back.', 'info');
        return;
    }

    if (!GSTLookup.isValidGSTIN(gstin)) {
        showToast('❌ Invalid GSTIN format!', 'error');
        return;
    }

    // Copy GSTIN to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(gstin).then(() => {
            console.log('GSTIN copied to clipboard');
        }).catch(err => console.log('Clipboard error:', err));
    }

    // Show helper modal
    showGSTPortalHelperModal(gstin);
}

// ============================================
// GST PORTAL HELPER MODAL
// ============================================
function showGSTPortalHelperModal(gstin) {
    const existingModal = document.getElementById('modalContent');
    
    // Save current customer modal content
    window._savedCustomerModal = existingModal.innerHTML;

    existingModal.innerHTML = `
        <div class="modal-header" style="background:linear-gradient(135deg,#4285F4,#1a73e8);color:white">
            <h2 style="color:white">
                <span class="material-icons-round" style="vertical-align:middle">public</span>
                GST Portal Search
            </h2>
            <button class="modal-close" style="color:white" onclick="closeGSTHelperAndReopenCustomer()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="background:#e8f0fe;padding:14px;border-radius:10px;margin-bottom:15px;border-left:4px solid #4285F4">
                <p style="font-size:13px;color:#1a73e8;margin-bottom:8px">
                    <strong>📋 GSTIN copied to clipboard:</strong>
                </p>
                <div style="background:white;padding:10px;border-radius:6px;font-family:monospace;font-weight:700;color:#1a73e8;font-size:14px;text-align:center;letter-spacing:1px">
                    ${gstin}
                </div>
                <p style="font-size:12px;color:#555;margin-top:8px">
                    ✅ Ready to paste in GST Portal!
                </p>
            </div>

            <h4 style="font-size:14px;margin-bottom:12px;color:var(--primary)">
                <span class="material-icons-round" style="vertical-align:middle;font-size:18px">list_alt</span>
                Simple 5 Steps:
            </h4>

            <div class="install-step-list">
                <div class="install-step">
                    <div class="step-number">1</div>
                    <div class="step-text">
                        <strong>Click "Open GST Portal"</strong> button below
                        <br><small style="color:var(--text-muted)">Government website naye tab me khulegi</small>
                    </div>
                </div>
                <div class="install-step">
                    <div class="step-number">2</div>
                    <div class="step-text">
                        <strong>Paste GSTIN</strong> in search box
                        <br><small style="color:var(--text-muted)">Ctrl+V dabao (already copied hai!)</small>
                    </div>
                </div>
                <div class="install-step">
                    <div class="step-number">3</div>
                    <div class="step-text">
                        <strong>Solve captcha</strong> aur Search click karo
                        <br><small style="color:var(--text-muted)">Company details 2 sec me dikhengi</small>
                    </div>
                </div>
                <div class="install-step">
                    <div class="step-number">4</div>
                    <div class="step-text">
                        <strong>Copy details</strong>: Name, Address, City
                        <br><small style="color:var(--text-muted)">Text select karo → Ctrl+C</small>
                    </div>
                </div>
                <div class="install-step">
                    <div class="step-number">5</div>
                    <div class="step-text">
                        <strong>Wapas aao aur paste karo</strong> customer form me
                        <br><small style="color:var(--text-muted)">"Back to Customer" click karo</small>
                    </div>
                </div>
            </div>

            <div style="background:#fff3e0;padding:12px;border-radius:8px;margin-top:15px;border-left:3px solid #ff9800;font-size:12px;color:#e65100">
                <strong>💡 Why GST Portal?</strong><br>
                • ✅ 100% FREE (Government site)<br>
                • ✅ 100% RELIABLE (Always works)<br>
                • ✅ 100% ACCURATE (Real data)<br>
                • ⏱️ Only 60 seconds per customer
            </div>

            <div style="background:#d1fae5;padding:12px;border-radius:8px;margin-top:10px;border-left:3px solid #10b981;font-size:12px;color:#065f46">
                <strong>🎁 Pro Tip:</strong> Chrome me GST Portal ko bookmark bar me pin kar lo — faster access!
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeGSTHelperAndReopenCustomer()">
                <span class="material-icons-round">arrow_back</span> Back to Customer
            </button>
            <button class="btn btn-primary" onclick="openGSTPortalNow('${gstin}')" style="background:linear-gradient(135deg,#4285F4,#1a73e8)">
                <span class="material-icons-round">open_in_new</span> Open GST Portal
            </button>
        </div>
    `;
}

// Open GST Portal in new tab
function openGSTPortalNow(gstin) {
    window.open('https://services.gst.gov.in/services/searchtp', '_blank');
    showToast(`✅ GST Portal opened! GSTIN ${gstin} in clipboard. Paste it there.`, 'success');
}

// Close helper modal and reopen customer form
function closeGSTHelperAndReopenCustomer() {
    if (window._savedCustomerModal) {
        document.getElementById('modalContent').innerHTML = window._savedCustomerModal;
        window._savedCustomerModal = null;
    } else {
        closeModal();
    }
}

// ============================================
// GST SEARCH MODAL (Search any company)
// ============================================
function openGSTSearchModal() {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
        <div class="modal-header" style="background:linear-gradient(135deg,#ff9800,#f57c00);color:white">
            <h2 style="color:white">
                <span class="material-icons-round" style="vertical-align:middle">search</span>
                GST Search Portal
            </h2>
            <button class="modal-close" style="color:white" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:15px">
                🔍 Search any GST registered company
            </p>

            <div style="display:flex;gap:8px;margin-bottom:16px">
                <input type="text" id="gstSearchInput" placeholder="Enter GSTIN (e.g., 08ABAFT1155E1ZH)" 
                       style="flex:1;text-transform:uppercase;font-family:monospace;font-weight:600" 
                       maxlength="15" onkeypress="if(event.key==='Enter') searchGST()">
                <button class="btn btn-primary" onclick="searchGST()" style="background:linear-gradient(135deg,#ff9800,#f57c00)">
                    <span class="material-icons-round">search</span> Auto Search
                </button>
            </div>

            <div style="text-align:center;margin-bottom:16px">
                <span style="color:var(--text-muted);font-size:12px">— OR —</span>
            </div>

            <button class="btn btn-secondary" onclick="openDirectGSTPortal()" style="width:100%;background:linear-gradient(135deg,#4285F4,#1a73e8);color:white;padding:12px">
                <span class="material-icons-round">public</span> Open GST Portal (Government Website)
            </button>

            <div id="gstSearchResult" style="min-height:100px;margin-top:16px"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `;
    document.getElementById('modalContainer').classList.remove('hidden');
    setTimeout(() => document.getElementById('gstSearchInput')?.focus(), 300);
}

function openDirectGSTPortal() {
    window.open('https://services.gst.gov.in/services/searchtp', '_blank');
    showToast('🌐 GST Portal opened in new tab', 'success');
}

async function searchGST() {
    const gstin = document.getElementById('gstSearchInput').value.trim().toUpperCase();
    const resultDiv = document.getElementById('gstSearchResult');

    if (!gstin) {
        resultDiv.innerHTML = '<p style="color:var(--danger);text-align:center">Enter GSTIN first</p>';
        return;
    }

    if (typeof GSTLookup === 'undefined') {
        resultDiv.innerHTML = '<p style="color:var(--danger)">GST module not loaded</p>';
        return;
    }

    resultDiv.innerHTML = `
        <div style="text-align:center;padding:20px">
            <div class="loader" style="margin:0 auto 10px"></div>
            <p style="color:var(--text-muted)">Searching... Trying multiple APIs...</p>
        </div>
    `;

    try {
        const result = await GSTLookup.lookup(gstin);

        if (result.success && result.data) {
            const d = result.data;
            const statusColor = d.status === 'Active' ? '#10b981' : '#ef4444';
            const statusBg = d.status === 'Active' ? '#d1fae5' : '#fee2e2';

            resultDiv.innerHTML = `
                <div class="card card-body" style="border-left:4px solid ${statusColor}">
                    ${result.partial ? `
                        <div style="background:#fff3e0;padding:10px;border-radius:8px;margin-bottom:12px;border-left:3px solid #ff9800;font-size:12px;color:#e65100">
                            ⚠️ ${result.message}
                        </div>
                    ` : ''}

                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                        <div>
                            <h3 style="font-size:16px;font-weight:700;color:var(--text)">${d.name || d.trade_name || 'Not Available (API failed)'}</h3>
                            ${d.trade_name && d.trade_name !== d.name ? `<p style="font-size:13px;color:var(--text-secondary)">Trade: ${d.trade_name}</p>` : ''}
                        </div>
                        <span style="background:${statusBg};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">
                            ${d.status || 'Unknown'}
                        </span>
                    </div>

                    <div class="calc-box" style="font-size:12px">
                        <div class="calc-row"><span class="calc-label">GSTIN:</span><span class="calc-value" style="font-family:monospace">${d.gstin}</span></div>
                        ${d.pan ? `<div class="calc-row"><span class="calc-label">PAN:</span><span class="calc-value">${d.pan}</span></div>` : ''}
                        ${d.state ? `<div class="calc-row"><span class="calc-label">State:</span><span class="calc-value">${d.state} (${d.state_code})</span></div>` : ''}
                        ${d.address ? `<div class="calc-row"><span class="calc-label">Address:</span><span class="calc-value">${d.address}</span></div>` : ''}
                        ${d.city ? `<div class="calc-row"><span class="calc-label">City:</span><span class="calc-value">${d.city} ${d.pincode || ''}</span></div>` : ''}
                        ${d.business_type ? `<div class="calc-row"><span class="calc-label">Type:</span><span class="calc-value">${d.business_type}</span></div>` : ''}
                        ${d.registration_date ? `<div class="calc-row"><span class="calc-label">Registered:</span><span class="calc-value">${d.registration_date}</span></div>` : ''}
                    </div>

                    <div class="btn-group" style="margin-top:12px;flex-wrap:wrap">
                        <button class="btn btn-primary btn-sm" onclick="addFromGSTSearch('${gstin}')" style="background:linear-gradient(135deg,#ff9800,#f57c00);flex:1;min-width:150px">
                            <span class="material-icons-round">person_add</span> Add as Customer
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="openDirectGSTPortal()" style="background:linear-gradient(135deg,#4285F4,#1a73e8);color:white;flex:1;min-width:150px">
                            <span class="material-icons-round">public</span> Verify on Portal
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="copyGSTInfo('${d.gstin}', '${(d.name || '').replace(/'/g, '')}')">
                            <span class="material-icons-round">content_copy</span> Copy
                        </button>
                    </div>

                    ${result.source ? `<p style="font-size:10px;color:var(--text-muted);margin-top:8px;text-align:right">Source: ${result.source}</p>` : ''}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="text-align:center;padding:30px;color:var(--danger)">
                    <span class="material-icons-round" style="font-size:40px;opacity:0.5">error_outline</span>
                    <p style="margin-top:10px;font-weight:600">${result.error || 'Not found'}</p>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Try "Open GST Portal" button above</p>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p style="color:var(--danger);text-align:center">❌ Error: ${error.message}</p>`;
    }
}

async function addFromGSTSearch(gstin) {
    closeModal();
    setTimeout(async () => {
        openCustomerModal();
        setTimeout(async () => {
            document.getElementById('custGst').value = gstin;
            await fetchGSTDetails();
        }, 300);
    }, 300);
}

function copyGSTInfo(gstin, name) {
    const text = `GSTIN: ${gstin}\nName: ${name}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 GST info copied!', 'success');
    }).catch(() => showToast('Copy failed', 'error'));
}

// ============================================
// AUTO STATE CODE
// ============================================
function autoUpdateStateCode() {
    const stateInput = document.getElementById('custState');
    const codeInput = document.getElementById('custStateCode');
    if (!stateInput || !codeInput) return;
    const stateName = stateInput.value.trim();
    if (INDIAN_STATES[stateName]) {
        codeInput.value = INDIAN_STATES[stateName];
    }
}

// ============================================
// SAVE CUSTOMER (with Firebase sync)
// ============================================
async function saveCustomer(id) {
    const name = document.getElementById('custName').value.trim();
    if (!name) { showToast('Customer name required!', 'error'); return; }

    const data = {
        name: name,
        gst_no: document.getElementById('custGst').value.trim().toUpperCase(),
        pan: document.getElementById('custPan')?.value.trim().toUpperCase() || '',
        business_type: document.getElementById('custBusinessType')?.value.trim() || '',
        address: document.getElementById('custAddress').value.trim(),
        city: document.getElementById('custCity').value.trim(),
        pincode: document.getElementById('custPincode').value.trim(),
        state: document.getElementById('custState').value.trim(),
        state_code: document.getElementById('custStateCode').value.trim(),
        country: document.getElementById('custCountry').value.trim() || 'India',
        phone: document.getElementById('custPhone').value.trim(),
        email: document.getElementById('custEmail').value.trim()
    };

    let saved;
    if (id) {
        saved = DB.updateCustomer(id, data);
        showToast('Customer updated!', 'success');
    } else {
        saved = DB.addCustomer(data);
        showToast('Customer added!', 'success');
    }

    // Sync to Firebase
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.userId && saved) {
        try {
            await FirebaseSync.saveCustomer(saved);
            console.log('✅ Customer synced to cloud');
        } catch (e) {
            console.error('Firebase sync failed:', e);
        }
    }

    closeModal();
    renderCustomers();
}

// ============================================
// DELETE CUSTOMER
// ============================================
async function deleteCustomerAction(id) {
    if (!confirmDialog('Delete this customer?')) return;
    const result = DB.deleteCustomer(id);
    if (result) {
        // Sync delete to Firebase
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.userId) {
            try {
                await FirebaseSync.deleteCustomer(id);
            } catch (e) {
                console.error('Firebase delete failed:', e);
            }
        }
        showToast('Deleted!', 'success');
    } else {
        showToast('Cannot delete: Has invoices!', 'error');
    }
    renderCustomers();
}

// ============================================
// CLOSE MODAL
// ============================================
function closeModal() {
    document.getElementById('modalContainer').classList.add('hidden');
    window._savedCustomerModal = null;
}