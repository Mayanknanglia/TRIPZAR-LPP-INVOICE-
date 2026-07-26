/* =============================================
   SUPPLIERS v3.1 - FIXED - With PDF Export + Pincode
   ============================================= */

let supplierSearchQuery = '';
let editingSupplierId = null;

function renderSuppliers() {
    const suppliers = DB.getSuppliers().filter(s => 
        !supplierSearchQuery || 
        (s.name || '').toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
        (s.gst_no || '').toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
        (s.phone || '').includes(supplierSearchQuery) ||
        (s.city || '').toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );

    const totalBills = suppliers.reduce((sum, s) => sum + DB.getSupplierStats(s.name).totalBills, 0);
    const totalAmount = suppliers.reduce((sum, s) => sum + DB.getSupplierStats(s.name).totalAmount, 0);
    const totalPending = suppliers.reduce((sum, s) => sum + DB.getSupplierStats(s.name).pending, 0);

    const container = document.getElementById('page-suppliers');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Suppliers</h1>
                <p>${suppliers.length} suppliers • Total: ${formatCurrency(totalAmount)} • Pending: <span style="color:var(--danger);font-weight:700">${formatCurrency(totalPending)}</span></p>
            </div>
            <div class="btn-group">
                <button class="btn" style="background:#dc2626;color:white" onclick="exportSuppliersPDF()">
                    <span class="material-icons-round">picture_as_pdf</span> PDF
                </button>
                <button class="btn btn-primary" onclick="showSupplierForm()">
                    <span class="material-icons-round">add</span> New Supplier
                </button>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
            <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#1565c0;font-weight:600">🏢 Total Suppliers</div>
                <div style="font-size:20px;font-weight:800;color:#0d47a1;margin-top:4px">${suppliers.length}</div>
            </div>
            <div style="background:linear-gradient(135deg,#f3e5f5,#e1bee7);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#6a1b9a;font-weight:600">📄 Total Bills</div>
                <div style="font-size:20px;font-weight:800;color:#4a148c;margin-top:4px">${totalBills}</div>
            </div>
            <div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#2e7d32;font-weight:600">💰 Total Purchases</div>
                <div style="font-size:18px;font-weight:800;color:#1b5e20;margin-top:4px">${formatCurrency(totalAmount)}</div>
            </div>
            <div style="background:linear-gradient(135deg,${totalPending > 0 ? '#ffebee,#ffcdd2' : '#e8f5e9,#c8e6c9'});padding:14px;border-radius:10px">
                <div style="font-size:11px;color:${totalPending > 0 ? '#c62828' : '#2e7d32'};font-weight:600">⏳ Pending to Pay</div>
                <div style="font-size:18px;font-weight:800;color:${totalPending > 0 ? '#b71c1c' : '#1b5e20'};margin-top:4px">${formatCurrency(totalPending)}</div>
            </div>
        </div>

        <div class="filter-row">
            <input type="text" placeholder="🔍 Search name, GST, phone, city..." value="${supplierSearchQuery}" onkeyup="supplierSearchQuery=this.value; renderSuppliers()" style="flex:1">
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th class="hide-mobile">GST</th>
                            <th class="hide-mobile">Phone</th>
                            <th class="hide-mobile">City</th>
                            <th class="text-right">Bills</th>
                            <th class="text-right hide-mobile">Total Amount</th>
                            <th class="text-right">Pending</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.length === 0 ? `
                            <tr><td colspan="8"><div class="empty-state"><span class="material-icons-round">business</span><p>No suppliers yet</p><button class="btn btn-primary" onclick="showSupplierForm()">Add Supplier</button></div></td></tr>
                        ` : suppliers.map(s => {
                            const stats = DB.getSupplierStats(s.name);
                            const pendingColor = stats.pending > 0 ? 'color:var(--danger)' : 'color:var(--success)';
                            return `
                            <tr style="cursor:pointer" onclick="viewSupplierLedger('${s.id}')">
                                <td>
                                    <strong>${toProperCase(s.name)}</strong>
                                    ${s.email ? `<br><small style="color:var(--text-muted);font-size:11px">📧 ${s.email}</small>` : ''}
                                </td>
                                <td class="hide-mobile" style="font-family:monospace;font-size:11px">${s.gst_no || '-'}</td>
                                <td class="hide-mobile">${s.phone || '-'}</td>
                                <td class="hide-mobile">${s.city || '-'}${s.pincode ? ' - ' + s.pincode : ''}</td>
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

// ============================================
// PDF EXPORT
// ============================================
function exportSuppliersPDF() {
    const suppliers = DB.getSuppliers().filter(s => 
        !supplierSearchQuery || 
        (s.name || '').toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
        (s.gst_no || '').toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );
    
    if (suppliers.length === 0) { showToast('No suppliers!', 'warning'); return; }
    
    if (typeof PDFExport !== 'undefined') {
        PDFExport.exportSuppliersList(suppliers);
    } else {
        showToast('PDF Export module not loaded!', 'error');
    }
}

// ============================================
// SUPPLIER FORM
// ============================================
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
            <h2>
                <span class="material-icons-round" style="vertical-align:middle;color:var(--primary)">${isEdit ? 'edit' : 'business'}</span>
                ${isEdit ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button class="modal-close" onclick="closeSupplierForm()">&times;</button>
        </div>
        <div class="modal-body">
            
            <div class="section-heading">
                <span class="material-icons-round">business</span> Basic Information
            </div>
            <div class="form-group">
                <label>Supplier Name *</label>
                <input type="text" id="supName" value="${s.name || ''}" placeholder="e.g. TripFactory" autofocus>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>GST Number</label>
                    <input type="text" id="supGst" value="${s.gst_no || ''}" placeholder="27AABCT1234A1Z5" style="text-transform:uppercase;font-family:monospace" maxlength="15">
                </div>
                <div class="form-group">
                    <label>PAN</label>
                    <input type="text" id="supPan" value="${s.pan || ''}" placeholder="ABCDE1234F" style="text-transform:uppercase;font-family:monospace" maxlength="10">
                </div>
            </div>

            <div class="section-heading">
                <span class="material-icons-round">contact_phone</span> Contact
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="supPhone" value="${s.phone || ''}" placeholder="+91 9876543210">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="supEmail" value="${s.email || ''}" placeholder="email@example.com">
                </div>
            </div>

            <div class="section-heading">
                <span class="material-icons-round">location_on</span> Address
            </div>
            <div class="form-group">
                <label>Address</label>
                <textarea id="supAddress" rows="2" placeholder="Building, Street, Area">${s.address || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="supCity" value="${s.city || ''}" placeholder="e.g. Jaipur">
                </div>
                <div class="form-group">
                    <label>Pincode</label>
                    <input type="text" id="supPincode" value="${s.pincode || ''}" placeholder="e.g. 302020" maxlength="10">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>State</label>
                    <select id="supState">${stateOpts}</select>
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <select id="supCountry">${countryOpts}</select>
                </div>
            </div>

            <div class="section-heading">
                <span class="material-icons-round">account_balance</span> Bank Details (for Payments)
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" id="supBankName" value="${s.bank_name || ''}" placeholder="e.g. HDFC Bank">
                </div>
                <div class="form-group">
                    <label>Account No</label>
                    <input type="text" id="supBankAccNo" value="${s.bank_account_no || ''}" placeholder="Account number">
                </div>
                <div class="form-group">
                    <label>IFSC</label>
                    <input type="text" id="supBankIfsc" value="${s.bank_ifsc || ''}" placeholder="HDFC0001234" style="text-transform:uppercase">
                </div>
            </div>

            <div class="form-group">
                <label>Internal Notes</label>
                <textarea id="supNotes" rows="2" placeholder="Any notes about this supplier...">${s.notes || ''}</textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSupplierForm()">
                <span class="material-icons-round">close</span> Cancel
            </button>
            <button class="btn btn-primary" onclick="saveSupplier()">
                <span class="material-icons-round">${isEdit ? 'save' : 'add'}</span>
                ${isEdit ? 'Update' : 'Add Supplier'}
            </button>
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
        pincode: document.getElementById('supPincode').value.trim(),
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

    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId && saved) {
        try {
            await FirebaseSync.saveSupplier(saved);
            console.log('✅ Supplier synced to cloud');
        } catch (e) { 
            console.error('Firebase sync failed:', e); 
        }
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
// SUPPLIER LEDGER VIEW
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
            
            <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:15px;font-size:13px">
                ${supplier.gst_no ? `<div><strong>GST:</strong> <span style="font-family:monospace">${supplier.gst_no}</span></div>` : ''}
                ${supplier.phone ? `<div style="margin-top:4px"><strong>📞</strong> ${supplier.phone}</div>` : ''}
                ${supplier.city ? `<div style="margin-top:4px"><strong>📍</strong> ${supplier.city}${supplier.pincode ? ' - ' + supplier.pincode : ''}, ${supplier.state || ''}</div>` : ''}
                ${supplier.bank_name ? `<div style="margin-top:4px"><strong>🏦</strong> ${supplier.bank_name} — A/c: ${supplier.bank_account_no || ''} — IFSC: ${supplier.bank_ifsc || ''}</div>` : ''}
            </div>

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
                    <span class="material-icons-round" style="font-size:40px;opacity:0.3">receipt_long</span>
                    <p style="margin-top:8px">No purchases from this supplier yet</p>
                </div>
            ` : `
                <table style="width:100%;font-size:12px">
                    <thead style="background:var(--bg)">
                        <tr>
                            <th style="padding:8px;text-align:left">Date</th>
                            <th style="padding:8px;text-align:left">Bill No</th>
                            <th style="padding:8px;text-align:left">Category</th>
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
                                <td style="padding:8px;font-family:monospace;color:var(--primary);font-weight:600">${p.bill_no || '-'}</td>
                                <td style="padding:8px"><span class="badge badge-info" style="font-size:10px">${p.category || '-'}</span></td>
                                <td style="padding:8px;text-align:right"><strong>${formatCurrency(p.total_amount)}</strong></td>
                                <td style="padding:8px;text-align:right;color:var(--success)">${formatCurrency(p.paid_amount || 0)}</td>
                                <td style="padding:8px;text-align:right;color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700">${formatCurrency(balance)}</td>
                                <td style="padding:8px;text-align:center"><span class="badge ${p.payment_status==='paid'?'badge-success':p.payment_status==='partial'?'badge-warning':'badge-danger'}">${p.payment_status}</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `}

            ${supplier.notes ? `
                <div style="background:#fff8e6;padding:10px;border-radius:6px;margin-top:15px;font-size:12px;color:#e65100">
                    <strong>📝 Notes:</strong> ${supplier.notes}
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSupplierForm()">Close</button>
            <button class="btn" style="background:#dc2626;color:white" onclick="exportSupplierLedgerPDF('${id}')">
                <span class="material-icons-round">picture_as_pdf</span> PDF
            </button>
            <button class="btn btn-primary" onclick="createNewPurchaseFromSupplier('${id}')">
                <span class="material-icons-round">add</span> New Purchase
            </button>
        </div>
    `;
    container.classList.remove('hidden');
}

// ============================================
// CREATE NEW PURCHASE FROM SUPPLIER
// ============================================
function createNewPurchaseFromSupplier(supplierId) {
    const supplier = DB.getSupplierById(supplierId);
    if (!supplier) return;
    
    closeSupplierForm();
    navigateTo('newPurchase');
    
    setTimeout(() => {
        const supInput = document.getElementById('purSupplier');
        const gstInput = document.getElementById('purSupplierGst');
        if (supInput) {
            supInput.value = supplier.name;
        }
        if (gstInput && supplier.gst_no) {
            gstInput.value = supplier.gst_no;
        }
    }, 200);
}

// ============================================
// EXPORT INDIVIDUAL SUPPLIER LEDGER PDF
// ============================================
function exportSupplierLedgerPDF(id) {
    const supplier = DB.getSupplierById(id);
    if (!supplier) return;

    const purchases = DB.getActivePurchases().filter(p => p.supplier_name === supplier.name);
    if (purchases.length === 0) {
        showToast('No purchases to export!', 'warning');
        return;
    }

    if (typeof PDFExport === 'undefined') {
        showToast('PDF Export module not loaded!', 'error');
        return;
    }

    const ledgerData = purchases.map((p, idx) => {
        const balance = (p.total_amount || 0) - (p.paid_amount || 0);
        return {
            sno: idx + 1,
            date: PDFExport.formatDate(p.bill_date),
            bill_no: p.bill_no || '-',
            category: p.category || '-',
            amount: p.total_amount || 0,
            paid: p.paid_amount || 0,
            balance: balance,
            status: (p.payment_status || 'unpaid').toUpperCase()
        };
    });

    const columns = [
        { key: 'sno', label: '#', width: 0.3, align: 'center' },
        { key: 'date', label: 'Date', width: 0.7 },
        { key: 'bill_no', label: 'Bill No', width: 1 },
        { key: 'category', label: 'Category', width: 0.9 },
        { key: 'amount', label: 'Amount', width: 0.9, align: 'right', type: 'currency' },
        { key: 'paid', label: 'Paid', width: 0.8, align: 'right', type: 'currency' },
        { key: 'balance', label: 'Balance', width: 0.9, align: 'right', type: 'currency' },
        { key: 'status', label: 'Status', width: 0.6, align: 'center' }
    ];

    const stats = DB.getSupplierStats(supplier.name);
    const cleanName = supplier.name.replace(/[^a-zA-Z0-9]/g, '_');

    PDFExport.export({
        title: 'Supplier Ledger — ' + supplier.name,
        subtitle: (supplier.gst_no ? 'GSTIN: ' + supplier.gst_no + ' | ' : '') + (supplier.city || ''),
        columns: columns,
        data: ledgerData,
        orientation: 'landscape',
        summary: {
            'Total Bills': stats.totalBills,
            'Total Amount': PDFExport.formatCurrency(stats.totalAmount),
            'Paid': PDFExport.formatCurrency(stats.totalPaid),
            'Pending': PDFExport.formatCurrency(stats.pending)
        },
        filename: 'Supplier_' + cleanName + '_' + PDFExport.getDateStr() + '.pdf'
    });
}