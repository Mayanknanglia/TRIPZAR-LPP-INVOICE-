/* =============================================
   SUPPLIERS v1.0 - Supplier Management
   ============================================= */

let supplierSearchQuery = '';
let editingSupplierId = null;

function renderSuppliers() {
    const suppliers = DB.getSuppliers().filter(s => 
        !supplierSearchQuery || 
        (s.name || '').toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
        (s.gst_no || '').toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );

    const container = document.getElementById('page-suppliers');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Suppliers</h1>
                <p>${suppliers.length} suppliers</p>
            </div>
            <button class="btn btn-primary" onclick="showSupplierForm()">
                <span class="material-icons-round">add</span> New Supplier
            </button>
        </div>

        <div class="filter-row">
            <input type="text" placeholder="🔍 Search suppliers..." value="${supplierSearchQuery}" onkeyup="supplierSearchQuery=this.value; renderSuppliers()" style="flex:1">
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th class="hide-mobile">GST</th>
                            <th class="hide-mobile">Phone</th>
                            <th class="text-right">Total Bills</th>
                            <th class="text-right hide-mobile">Total Amount</th>
                            <th class="text-right">Pending</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.length === 0 ? `
                            <tr><td colspan="7"><div class="empty-state"><span class="material-icons-round">business</span><p>No suppliers yet</p><button class="btn btn-primary" onclick="showSupplierForm()">Add Supplier</button></div></td></tr>
                        ` : suppliers.map(s => {
                            const stats = DB.getSupplierStats(s.name);
                            const pendingColor = stats.pending > 0 ? 'color:var(--danger)' : 'color:var(--success)';
                            return `
                            <tr style="cursor:pointer" onclick="viewSupplierLedger('${s.id}')">
                                <td><strong>${toProperCase(s.name)}</strong></td>
                                <td class="hide-mobile" style="font-family:monospace;font-size:11px">${s.gst_no || '-'}</td>
                                <td class="hide-mobile">${s.phone || '-'}</td>
                                <td class="text-right"><strong>${stats.totalBills}</strong></td>
                                <td class="text-right hide-mobile">${formatCurrency(stats.totalAmount)}</td>
                                <td class="text-right" style="${pendingColor};font-weight:700">${formatCurrency(stats.pending)}</td>
                                <td class="text-right" onclick="event.stopPropagation()">
                                    <div class="table-actions">
                                        <button class="btn-sm btn-view" onclick="viewSupplierLedger('${s.id}')">Ledger</button>
                                        <button class="btn-sm btn-edit" onclick="showSupplierForm('${s.id}')">Edit</button>
                                        <button class="btn-sm btn-del" onclick="deleteSupplierAction('${s.id}')">Del</button>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showSupplierForm(id = null) {
    editingSupplierId = id;
    const s = id ? DB.getSupplierById(id) : {};
    const isEdit = !!id;

    const modal = document.getElementById('modalContent');
    const container = document.getElementById('modalContainer');
    const stateOpts = getStateOptions(s.state);
    const countryOpts = COUNTRIES.map(c => `<option value="${c}" ${c === (s.country || 'India') ? 'selected' : ''}>${c}</option>`).join('');

    modal.innerHTML = `
        <div class="modal-header">
            <h2>${isEdit ? 'Edit' : 'Add'} Supplier</h2>
            <button class="modal-close" onclick="closeSupplierForm()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Supplier Name *</label>
                <input type="text" id="supName" value="${s.name || ''}" placeholder="e.g. TripFactory">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>GST Number</label>
                    <input type="text" id="supGst" value="${s.gst_no || ''}" placeholder="27AABCT1234A1Z5" style="text-transform:uppercase;font-family:monospace">
                </div>
                <div class="form-group">
                    <label>PAN</label>
                    <input type="text" id="supPan" value="${s.pan || ''}" placeholder="ABCDE1234F" style="text-transform:uppercase;font-family:monospace">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="supPhone" value="${s.phone || ''}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="supEmail" value="${s.email || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <textarea id="supAddress" rows="2">${s.address || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="supCity" value="${s.city || ''}">
                </div>
                <div class="form-group">
                    <label>State</label>
                    <select id="supState">${stateOpts}</select>
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <select id="supCountry">${countryOpts}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" id="supBankName" value="${s.bank_name || ''}">
                </div>
                <div class="form-group">
                    <label>Account No</label>
                    <input type="text" id="supBankAccNo" value="${s.bank_account_no || ''}">
                </div>
                <div class="form-group">
                    <label>IFSC</label>
                    <input type="text" id="supBankIfsc" value="${s.bank_ifsc || ''}" style="text-transform:uppercase">
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="supNotes" rows="2" placeholder="Internal notes...">${s.notes || ''}</textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSupplierForm()">Cancel</button>
            <button class="btn btn-primary" onclick="saveSupplier()">${isEdit ? 'Update' : 'Save'}</button>
        </div>
    `;
    container.classList.remove('hidden');
}

async function saveSupplier() {
    const name = document.getElementById('supName').value.trim();
    if (!name) { showToast('Supplier name required!', 'error'); return; }

    const data = {
        name: name,
        gst_no: document.getElementById('supGst').value.trim().toUpperCase(),
        pan: document.getElementById('supPan').value.trim().toUpperCase(),
        phone: document.getElementById('supPhone').value.trim(),
        email: document.getElementById('supEmail').value.trim(),
        address: document.getElementById('supAddress').value.trim(),
        city: document.getElementById('supCity').value.trim(),
        state: document.getElementById('supState').value,
        country: document.getElementById('supCountry').value,
        bank_name: document.getElementById('supBankName').value.trim(),
        bank_account_no: document.getElementById('supBankAccNo').value.trim(),
        bank_ifsc: document.getElementById('supBankIfsc').value.trim().toUpperCase(),
        notes: document.getElementById('supNotes').value.trim()
    };

    let saved;
    if (editingSupplierId) {
        saved = DB.updateSupplier(editingSupplierId, data);
        showToast('✅ Supplier updated!', 'success');
    } else {
        saved = DB.addSupplier(data);
        showToast('✅ Supplier added!', 'success');
    }

    // Firebase sync
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId && saved) {
        try {
            await FirebaseSync.saveSupplier(saved);
        } catch (e) { console.error(e); }
    }

    closeSupplierForm();
    renderSuppliers();
}

function closeSupplierForm() {
    document.getElementById('modalContainer').classList.add('hidden');
    editingSupplierId = null;
}

async function deleteSupplierAction(id) {
    if (!confirmDialog('Delete this supplier? Purchase entries will remain intact.')) return;
    DB.deleteSupplier(id);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.deleteSupplier(id);
    }
    showToast('Deleted!', 'success');
    renderSuppliers();
}

// ============================================
// SUPPLIER LEDGER
// ============================================
function viewSupplierLedger(id) {
    const supplier = DB.getSupplierById(id);
    if (!supplier) return;

    const purchases = DB.getActivePurchases().filter(p => p.supplier_name === supplier.name);
    const stats = DB.getSupplierStats(supplier.name);

    const modal = document.getElementById('modalContent');
    const container = document.getElementById('modalContainer');

    modal.innerHTML = `
        <div class="modal-header" style="background:linear-gradient(135deg,var(--primary),var(--accent));color:white">
            <h2 style="color:white">📊 ${toProperCase(supplier.name)} — Ledger</h2>
            <button class="modal-close" style="color:white" onclick="closeSupplierForm()">&times;</button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:15px">
                <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:11px;color:#1565c0">Total Bills</div>
                    <div style="font-size:20px;font-weight:800;color:#0d47a1">${stats.totalBills}</div>
                </div>
                <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:11px;color:#2e7d32">Total Paid</div>
                    <div style="font-size:16px;font-weight:800;color:#1b5e20">${formatCurrency(stats.totalPaid)}</div>
                </div>
                <div style="background:${stats.pending > 0 ? '#ffebee' : '#e8f5e9'};padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:11px;color:${stats.pending > 0 ? '#c62828' : '#2e7d32'}">Pending</div>
                    <div style="font-size:16px;font-weight:800;color:${stats.pending > 0 ? '#b71c1c' : '#1b5e20'}">${formatCurrency(stats.pending)}</div>
                </div>
            </div>

            ${purchases.length === 0 ? `
                <div style="text-align:center;padding:30px;color:var(--text-muted)">
                    <p>No purchases from this supplier yet</p>
                </div>
            ` : `
                <table style="width:100%;font-size:12px">
                    <thead style="background:var(--bg)">
                        <tr>
                            <th style="padding:8px;text-align:left">Date</th>
                            <th style="padding:8px;text-align:left">Bill No</th>
                            <th style="padding:8px;text-align:right">Amount</th>
                            <th style="padding:8px;text-align:right">Paid</th>
                            <th style="padding:8px;text-align:right">Balance</th>
                            <th style="padding:8px;text-align:center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(p => {
                            const balance = (p.total_amount || 0) - (p.paid_amount || 0);
                            return `
                            <tr style="border-top:1px solid var(--border);cursor:pointer" onclick="closeSupplierForm(); viewPurchase('${p.id}')">
                                <td style="padding:8px">${formatDate(p.bill_date)}</td>
                                <td style="padding:8px;font-family:monospace">${p.bill_no || '-'}</td>
                                <td style="padding:8px;text-align:right"><strong>${formatCurrency(p.total_amount)}</strong></td>
                                <td style="padding:8px;text-align:right;color:var(--success)">${formatCurrency(p.paid_amount || 0)}</td>
                                <td style="padding:8px;text-align:right;color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700">${formatCurrency(balance)}</td>
                                <td style="padding:8px;text-align:center"><span class="badge ${p.payment_status==='paid'?'badge-success':p.payment_status==='partial'?'badge-warning':'badge-danger'}">${p.payment_status}</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSupplierForm()">Close</button>
            <button class="btn btn-primary" onclick="closeSupplierForm(); navigateTo('newPurchase'); setTimeout(()=>{document.getElementById('purSupplier').value='${supplier.name}'},100)">
                + New Purchase
            </button>
        </div>
    `;
    container.classList.remove('hidden');
}