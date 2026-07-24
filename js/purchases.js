/* =============================================
   PURCHASES v1.0 - Purchase Management
   ============================================= */

let purchaseSearchQuery = '';
let purchaseFilters = { category: '', payment_status: '', financial_year: '' };
let editingPurchaseId = null;

const PURCHASE_CATEGORIES = [
    'Flight', 'Hotel', 'Transport', 'Tour Package', 'Visa/Passport',
    'Insurance', 'Forex', 'Office Rent', 'Salary', 'Marketing',
    'Software', 'Utilities', 'Miscellaneous'
];

// ============================================
// PURCHASE LIST
// ============================================
function renderPurchaseList() {
    const purchases = DB.searchPurchases(purchaseSearchQuery, purchaseFilters);
    const fys = [...new Set(DB.getActivePurchases().map(p => p.financial_year))].filter(Boolean).sort().reverse();

    const totalAmount = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalPaid = purchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
    const totalPending = totalAmount - totalPaid;

    const container = document.getElementById('page-purchases');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Purchases</h1>
                <p>${purchases.length} bills • Total: ${formatCurrency(totalAmount)} • Pending: <span style="color:var(--danger);font-weight:700">${formatCurrency(totalPending)}</span></p>
            </div>
            <div class="btn-group">
                <button class="btn btn-secondary" onclick="exportPurchasesExcel()">
                    <span class="material-icons-round">download</span> Excel
                </button>
                <button class="btn btn-primary" onclick="navigateTo('newPurchase')">
                    <span class="material-icons-round">add</span> New Purchase
                </button>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
            <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#1565c0;font-weight:600">💳 Total Purchases</div>
                <div style="font-size:20px;font-weight:800;color:#0d47a1;margin-top:4px">${formatCurrency(totalAmount)}</div>
            </div>
            <div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#2e7d32;font-weight:600">✅ Paid</div>
                <div style="font-size:20px;font-weight:800;color:#1b5e20;margin-top:4px">${formatCurrency(totalPaid)}</div>
            </div>
            <div style="background:linear-gradient(135deg,#ffebee,#ffcdd2);padding:14px;border-radius:10px">
                <div style="font-size:11px;color:#c62828;font-weight:600">⏳ Pending</div>
                <div style="font-size:20px;font-weight:800;color:#b71c1c;margin-top:4px">${formatCurrency(totalPending)}</div>
            </div>
        </div>

        <div class="filter-row">
            <input type="text" placeholder="🔍 Search bill no, supplier..." value="${purchaseSearchQuery}" onkeyup="purchaseSearchQuery=this.value; renderPurchaseList()" style="flex:1">
            <select onchange="purchaseFilters.category=this.value; renderPurchaseList()">
                <option value="">All Categories</option>
                ${PURCHASE_CATEGORIES.map(c => `<option value="${c}" ${purchaseFilters.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <select onchange="purchaseFilters.payment_status=this.value; renderPurchaseList()">
                <option value="">All Status</option>
                <option value="paid" ${purchaseFilters.payment_status==='paid'?'selected':''}>Paid</option>
                <option value="unpaid" ${purchaseFilters.payment_status==='unpaid'?'selected':''}>Unpaid</option>
                <option value="partial" ${purchaseFilters.payment_status==='partial'?'selected':''}>Partial</option>
            </select>
            <select onchange="purchaseFilters.financial_year=this.value; renderPurchaseList()">
                <option value="">All Years</option>
                ${fys.map(f => `<option value="${f}" ${purchaseFilters.financial_year===f?'selected':''}>FY ${f}</option>`).join('')}
            </select>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Bill No</th>
                            <th class="hide-mobile">Date</th>
                            <th>Supplier</th>
                            <th class="hide-mobile">Category</th>
                            <th class="text-right hide-mobile">Amount</th>
                            <th class="text-right">Balance</th>
                            <th class="text-center">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.length === 0 ? `
                            <tr><td colspan="8"><div class="empty-state"><span class="material-icons-round">shopping_cart</span><p>No purchases yet</p><button class="btn btn-primary" onclick="navigateTo('newPurchase')">Add Purchase</button></div></td></tr>
                        ` : purchases.map(p => {
                            const balance = (p.total_amount || 0) - (p.paid_amount || 0);
                            return `
                            <tr onclick="viewPurchase('${p.id}')" style="cursor:pointer">
                                <td><strong style="font-family:monospace;font-size:11px;color:var(--primary)">${p.bill_no || 'N/A'}</strong></td>
                                <td class="hide-mobile">${formatDate(p.bill_date)}</td>
                                <td>${toProperCase(p.supplier_name)}</td>
                                <td class="hide-mobile"><span class="badge badge-info" style="font-size:10px">${p.category || '-'}</span></td>
                                <td class="text-right hide-mobile"><strong>${formatCurrency(p.total_amount)}</strong></td>
                                <td class="text-right" style="color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700">${formatCurrency(balance)}</td>
                                <td class="text-center"><span class="badge ${p.payment_status==='paid'?'badge-success':p.payment_status==='partial'?'badge-warning':'badge-danger'}">${p.payment_status}</span></td>
                                <td class="text-right" onclick="event.stopPropagation()">
                                    <div class="table-actions">
                                        <button class="btn-sm btn-view" onclick="viewPurchase('${p.id}')">View</button>
                                        <button class="btn-sm btn-edit" onclick="editPurchase('${p.id}')">Edit</button>
                                        <button class="btn-sm btn-del" onclick="deletePurchaseAction('${p.id}')">Del</button>
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
// PURCHASE FORM
// ============================================
function renderPurchaseForm(prefillData = null) {
    editingPurchaseId = prefillData?.id || null;
    const isEdit = !!editingPurchaseId;
    const p = prefillData || {};
    const suppliers = DB.getSuppliers();
    const invoices = DB.getActiveInvoices();

    const container = document.getElementById('page-newPurchase');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>${isEdit ? 'Edit Purchase' : 'New Purchase'}</h1>
                <p>Record supplier bill / expense</p>
            </div>
            <button class="btn btn-secondary" onclick="navigateTo('purchases')">
                <span class="material-icons-round">arrow_back</span> Back
            </button>
        </div>

        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--primary)">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">receipt_long</span> Bill Details
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Bill / Invoice No. *</label>
                    <input type="text" id="purBillNo" value="${p.bill_no || ''}" placeholder="e.g. TF/2026/1234" style="font-family:monospace;font-weight:700">
                </div>
                <div class="form-group">
                    <label>Bill Date *</label>
                    <input type="date" id="purBillDate" value="${p.bill_date || getTodayISO()}" required>
                </div>
                <div class="form-group">
                    <label>Financial Year</label>
                    <input type="text" id="purFY" value="${p.financial_year || getCurrentFY()}" style="font-family:monospace">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Supplier *</label>
                    <input type="text" id="purSupplier" list="supList" value="${p.supplier_name || ''}" placeholder="Type or select supplier" onchange="onSupplierChange()">
                    <datalist id="supList">
                        ${suppliers.map(s => `<option value="${s.name}">`).join('')}
                    </datalist>
                    <small class="input-hint"><a href="#" onclick="navigateTo('suppliers'); return false;" style="color:var(--primary)">+ Manage suppliers</a></small>
                </div>
                <div class="form-group">
                    <label>Supplier GST (auto)</label>
                    <input type="text" id="purSupplierGst" value="${p.supplier_gst || ''}" style="font-family:monospace;text-transform:uppercase">
                </div>
                <div class="form-group">
                    <label>Category *</label>
                    <select id="purCategory">
                        ${PURCHASE_CATEGORIES.map(c => `<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Description</label>
                <input type="text" id="purDescription" value="${p.description || ''}" placeholder="e.g. Delhi-Mumbai flight for Nishant Kumar">
            </div>

            <div class="form-group">
                <label>Linked Sale Invoice (optional)</label>
                <select id="purLinkedInvoice">
                    <option value="">-- Not linked --</option>
                    ${invoices.map(inv => `<option value="${inv.id}" ${p.linked_invoice_id===inv.id?'selected':''}>${inv.invoice_number} - ${inv.customer_name}</option>`).join('')}
                </select>
                <small class="input-hint">Link this purchase with a sales invoice to calculate profit</small>
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">calculate</span> Amount Details
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Base Amount (₹) *</label>
                    <input type="number" id="purBaseAmount" step="0.01" value="${p.base_amount || ''}" oninput="calcPurchaseTotal()" style="font-weight:700">
                </div>
                <div class="form-group">
                    <label>GST Rate (%)</label>
                    <select id="purGstRate" onchange="calcPurchaseTotal()">
                        <option value="0" ${p.gst_rate==0?'selected':''}>0% (No GST)</option>
                        <option value="5" ${p.gst_rate==5?'selected':''}>5%</option>
                        <option value="12" ${p.gst_rate==12?'selected':''}>12%</option>
                        <option value="18" ${p.gst_rate==18 || !p.gst_rate?'selected':''}>18%</option>
                        <option value="28" ${p.gst_rate==28?'selected':''}>28%</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>GST Amount (auto)</label>
                    <input type="text" id="purGstAmount" readonly style="background:var(--bg);font-weight:700">
                </div>
                <div class="form-group">
                    <label>Total Amount (auto)</label>
                    <input type="text" id="purTotalAmount" readonly style="background:var(--bg);font-weight:800;color:var(--primary);font-size:15px">
                </div>
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--success)">
            <div class="section-heading" style="margin-top:0;color:var(--success)">
                <span class="material-icons-round">payments</span> Payment
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Status *</label>
                    <select id="purPayStatus" onchange="onPayStatusChange()">
                        <option value="unpaid" ${p.payment_status==='unpaid' || !p.payment_status?'selected':''}>Unpaid</option>
                        <option value="partial" ${p.payment_status==='partial'?'selected':''}>Partial</option>
                        <option value="paid" ${p.payment_status==='paid'?'selected':''}>Paid</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Paid Amount (₹)</label>
                    <input type="number" id="purPaidAmount" step="0.01" value="${p.paid_amount || 0}" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Payment Date</label>
                    <input type="date" id="purPayDate" value="${p.payment_date || ''}">
                </div>
                <div class="form-group">
                    <label>Payment Mode</label>
                    <select id="purPayMode">
                        <option value="">Select</option>
                        <option value="Cash" ${p.payment_mode==='Cash'?'selected':''}>Cash</option>
                        <option value="Bank Transfer" ${p.payment_mode==='Bank Transfer'?'selected':''}>Bank Transfer</option>
                        <option value="UPI" ${p.payment_mode==='UPI'?'selected':''}>UPI</option>
                        <option value="Cheque" ${p.payment_mode==='Cheque'?'selected':''}>Cheque</option>
                        <option value="Credit Card" ${p.payment_mode==='Credit Card'?'selected':''}>Credit Card</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Payment Reference (Txn ID, Cheque No, etc.)</label>
                <input type="text" id="purPayRef" value="${p.payment_ref || ''}">
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">attachment</span> Bill Attachment
            </div>
            ${p.bill_attachment ? `
                <div style="background:#e8f5e9;padding:10px;border-radius:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:12px;color:#2e7d32">✅ Bill uploaded (${(p.bill_attachment.length/1024).toFixed(1)} KB)</span>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removePurchaseAttachment()">Remove</button>
                </div>
            ` : ''}
            <input type="file" id="purBillFile" accept="image/*,.pdf" style="display:none" onchange="uploadPurchaseAttachment(event)">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('purBillFile').click()" style="width:100%;padding:12px;border:2px dashed var(--border)">
                <span class="material-icons-round">upload_file</span> Upload Bill (PDF/Image, max 2MB)
            </button>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">notes</span> Notes
            </div>
            <textarea id="purNotes" rows="2" placeholder="Internal notes...">${p.notes || ''}</textarea>
        </div>

        <div class="btn-group" style="margin-bottom:40px">
            <button class="btn btn-secondary" onclick="navigateTo('purchases')" style="flex:1">Cancel</button>
            <button class="btn btn-primary" onclick="savePurchase()" style="flex:2">
                <span class="material-icons-round">${isEdit ? 'save' : 'add'}</span>
                ${isEdit ? 'Update Purchase' : 'Save Purchase'}
            </button>
        </div>
    `;

    calcPurchaseTotal();
}

let purchaseAttachmentData = null;

function uploadPurchaseAttachment(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB!', 'error'); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        purchaseAttachmentData = e.target.result;
        showToast('✅ Bill uploaded! Save purchase to keep it.', 'success');
    };
    reader.readAsDataURL(file);
}

function removePurchaseAttachment() {
    purchaseAttachmentData = null;
    if (editingPurchaseId) {
        DB.updatePurchase(editingPurchaseId, { bill_attachment: null });
    }
    showToast('Removed!', 'success');
    editPurchase(editingPurchaseId);
}

function onSupplierChange() {
    const name = document.getElementById('purSupplier').value;
    const supplier = DB.getSuppliers().find(s => s.name === name);
    if (supplier) {
        document.getElementById('purSupplierGst').value = supplier.gst_no || '';
    }
}

function onPayStatusChange() {
    const status = document.getElementById('purPayStatus').value;
    const total = parseFloat(document.getElementById('purTotalAmount').value.replace(/[^0-9.]/g, '')) || 0;
    if (status === 'paid') {
        document.getElementById('purPaidAmount').value = total.toFixed(2);
        if (!document.getElementById('purPayDate').value) {
            document.getElementById('purPayDate').value = getTodayISO();
        }
    } else if (status === 'unpaid') {
        document.getElementById('purPaidAmount').value = 0;
    }
}

function calcPurchaseTotal() {
    const base = parseFloat(document.getElementById('purBaseAmount')?.value) || 0;
    const gstRate = parseFloat(document.getElementById('purGstRate')?.value) || 0;
    const gstAmt = base * gstRate / 100;
    const total = base + gstAmt;

    const gstEl = document.getElementById('purGstAmount');
    const totalEl = document.getElementById('purTotalAmount');
    if (gstEl) gstEl.value = formatCurrency(gstAmt);
    if (totalEl) totalEl.value = formatCurrency(total);
}

async function savePurchase() {
    const billNo = document.getElementById('purBillNo').value.trim();
    const billDate = document.getElementById('purBillDate').value;
    const supplierName = document.getElementById('purSupplier').value.trim();
    const category = document.getElementById('purCategory').value;
    const base = parseFloat(document.getElementById('purBaseAmount').value) || 0;

    if (!billNo) { showToast('Bill number required!', 'error'); return; }
    if (!billDate) { showToast('Bill date required!', 'error'); return; }
    if (!supplierName) { showToast('Supplier required!', 'error'); return; }
    if (base <= 0) { showToast('Amount must be greater than 0!', 'error'); return; }

    // Auto-create supplier if not exists
    const existingSup = DB.getSuppliers().find(s => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!existingSup) {
        DB.addSupplier({
            name: supplierName,
            gst_no: document.getElementById('purSupplierGst').value.trim().toUpperCase()
        });
    }

    const gstRate = parseFloat(document.getElementById('purGstRate').value) || 0;
    const gstAmt = base * gstRate / 100;
    const total = base + gstAmt;
    const paidAmt = parseFloat(document.getElementById('purPaidAmount').value) || 0;

    const data = {
        bill_no: billNo,
        bill_date: billDate,
        financial_year: document.getElementById('purFY').value.trim() || getCurrentFY(),
        supplier_name: supplierName,
        supplier_gst: document.getElementById('purSupplierGst').value.trim().toUpperCase(),
        category: category,
        description: document.getElementById('purDescription').value.trim(),
        linked_invoice_id: document.getElementById('purLinkedInvoice').value || '',
        base_amount: base,
        gst_rate: gstRate,
        gst_amount: gstAmt,
        total_amount: total,
        paid_amount: paidAmt,
        payment_status: document.getElementById('purPayStatus').value,
        payment_date: document.getElementById('purPayDate').value,
        payment_mode: document.getElementById('purPayMode').value,
        payment_ref: document.getElementById('purPayRef').value.trim(),
        notes: document.getElementById('purNotes').value.trim(),
        bill_attachment: purchaseAttachmentData || (editingPurchaseId ? DB.getPurchaseById(editingPurchaseId)?.bill_attachment : null)
    };

    let saved;
    if (editingPurchaseId) {
        saved = DB.updatePurchase(editingPurchaseId, data);
        showToast('✅ Purchase updated!', 'success');
    } else {
        saved = DB.addPurchase(data);
        showToast('✅ Purchase saved!', 'success');
    }

    // Firebase sync
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId && saved) {
        try {
            await FirebaseSync.savePurchase(saved);
        } catch (e) { console.error(e); }
    }

    purchaseAttachmentData = null;
    viewPurchase(saved.id);
}

function editPurchase(id) {
    const p = DB.getPurchaseById(id);
    if (!p) return;
    navigateTo('newPurchase');
    setTimeout(() => renderPurchaseForm(p), 50);
}

async function deletePurchaseAction(id) {
    if (!confirmDialog('Delete this purchase?')) return;
    DB.deletePurchase(id);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.deletePurchase(id);
    }
    showToast('Deleted!', 'success');
    renderPurchaseList();
}

function viewPurchase(id) {
    const p = DB.getPurchaseById(id);
    if (!p) return;
    const balance = (p.total_amount || 0) - (p.paid_amount || 0);
    const linkedInv = p.linked_invoice_id ? DB.getInvoiceById(p.linked_invoice_id) : null;

    navigateTo('purchaseView');
    const c = document.getElementById('page-purchaseView');
    c.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Purchase Bill</h1>
                <p style="font-family:monospace;color:var(--primary);font-weight:700">${p.bill_no}</p>
            </div>
            <button class="btn btn-secondary" onclick="navigateTo('purchases')">← Back</button>
        </div>

        <div class="invoice-actions">
            <button class="btn btn-secondary" onclick="editPurchase('${p.id}')"><span class="material-icons-round">edit</span> Edit</button>
            ${p.bill_attachment ? `<button class="btn btn-primary" onclick="downloadPurchaseAttachment('${p.id}')"><span class="material-icons-round">download</span> Bill</button>` : ''}
            <button class="btn btn-danger" onclick="deletePurchaseAction('${p.id}')"><span class="material-icons-round">delete</span> Delete</button>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="grid-2" style="margin-bottom:16px">
                <div>
                    <div class="section-title">Supplier</div>
                    <h3 style="font-size:16px;font-weight:700">${toProperCase(p.supplier_name)}</h3>
                    ${p.supplier_gst ? `<p style="font-size:12px;color:var(--text-secondary)">GST: ${p.supplier_gst}</p>` : ''}
                    <span class="badge badge-info" style="margin-top:6px">${p.category}</span>
                </div>
                <div style="text-align:right">
                    <p>Bill: <strong>${p.bill_no}</strong></p>
                    <p>Date: <strong>${formatDate(p.bill_date)}</strong></p>
                    <p>FY: <strong>${p.financial_year}</strong></p>
                    <span class="badge ${p.payment_status==='paid'?'badge-success':p.payment_status==='partial'?'badge-warning':'badge-danger'}" style="margin-top:6px">${p.payment_status.toUpperCase()}</span>
                </div>
            </div>

            ${p.description ? `
                <div style="background:var(--bg);padding:10px;border-radius:6px;margin-bottom:12px">
                    <small style="color:var(--text-muted)">Description:</small>
                    <div style="font-size:13px;margin-top:4px">${p.description}</div>
                </div>
            ` : ''}

            <div class="calc-box">
                <div class="calc-row"><span class="calc-label">Base Amount:</span><span class="calc-value">${formatCurrency(p.base_amount)}</span></div>
                <div class="calc-row"><span class="calc-label">GST (${p.gst_rate}%):</span><span class="calc-value">${formatCurrency(p.gst_amount)}</span></div>
                <div class="calc-row total"><span class="calc-label">Total Amount:</span><span class="calc-value">${formatCurrency(p.total_amount)}</span></div>
                <div class="calc-row" style="color:var(--success)"><span class="calc-label">Paid:</span><span class="calc-value">${formatCurrency(p.paid_amount || 0)}</span></div>
                <div class="calc-row" style="color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700"><span class="calc-label">Balance:</span><span class="calc-value">${formatCurrency(balance)}</span></div>
            </div>
        </div>

        ${p.payment_mode || p.payment_date || p.payment_ref ? `
            <div class="card card-body" style="margin-bottom:16px">
                <div class="section-heading" style="margin-top:0">💳 Payment Info</div>
                <div class="calc-box">
                    ${p.payment_mode ? `<div class="calc-row"><span class="calc-label">Mode:</span><span class="calc-value">${p.payment_mode}</span></div>` : ''}
                    ${p.payment_date ? `<div class="calc-row"><span class="calc-label">Date:</span><span class="calc-value">${formatDate(p.payment_date)}</span></div>` : ''}
                    ${p.payment_ref ? `<div class="calc-row"><span class="calc-label">Reference:</span><span class="calc-value" style="font-family:monospace">${p.payment_ref}</span></div>` : ''}
                </div>
            </div>
        ` : ''}

        ${linkedInv ? `
            <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--success)">
                <div class="section-heading" style="margin-top:0;color:var(--success)">🔗 Linked Sale Invoice</div>
                <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="viewInvoice('${linkedInv.id}')">
                    <div>
                        <strong style="font-family:monospace;color:var(--primary)">${linkedInv.invoice_number}</strong>
                        <p style="font-size:13px;color:var(--text-secondary);margin-top:4px">${toProperCase(linkedInv.customer_name)}</p>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:700">${formatCurrency(linkedInv.grand_total)}</div>
                        <small style="color:${(linkedInv.grand_total - p.total_amount) >= 0 ? 'var(--success)' : 'var(--danger)'}">
                            Profit: ${formatCurrency(linkedInv.grand_total - p.total_amount)}
                        </small>
                    </div>
                </div>
            </div>
        ` : ''}

        ${p.notes ? `
            <div class="card card-body" style="margin-bottom:16px">
                <div class="section-heading" style="margin-top:0">📝 Notes</div>
                <p style="font-size:13px;font-style:italic;color:var(--text-secondary)">${p.notes}</p>
            </div>
        ` : ''}
    `;
}

function downloadPurchaseAttachment(id) {
    const p = DB.getPurchaseById(id);
    if (!p || !p.bill_attachment) return;
    
    const link = document.createElement('a');
    link.href = p.bill_attachment;
    link.download = `${p.supplier_name}_${p.bill_no}.pdf`.replace(/[^a-zA-Z0-9_.]/g, '_');
    link.click();
    showToast('Downloaded!', 'success');
}

// ============================================
// EXCEL EXPORT
// ============================================
function exportPurchasesExcel() {
    const purchases = DB.searchPurchases(purchaseSearchQuery, purchaseFilters);
    if (purchases.length === 0) { showToast('No purchases!', 'warning'); return; }

    const data = purchases.map((p, idx) => ({
        'S.No': idx + 1,
        'Bill No': p.bill_no,
        'Bill Date': p.bill_date,
        'FY': p.financial_year,
        'Supplier': p.supplier_name,
        'Supplier GST': p.supplier_gst || '',
        'Category': p.category,
        'Description': p.description || '',
        'Base Amount': p.base_amount || 0,
        'GST Rate': p.gst_rate + '%',
        'GST Amount': p.gst_amount || 0,
        'Total Amount': p.total_amount || 0,
        'Paid Amount': p.paid_amount || 0,
        'Balance': (p.total_amount || 0) - (p.paid_amount || 0),
        'Payment Status': p.payment_status,
        'Payment Mode': p.payment_mode || '',
        'Payment Date': p.payment_date || '',
        'Payment Ref': p.payment_ref || '',
        'Linked Invoice': p.linked_invoice_id ? (DB.getInvoiceById(p.linked_invoice_id)?.invoice_number || '') : '',
        'Notes': p.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Array(20).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, `Tripzar_Purchases_${getTodayISO()}.xlsx`);
    showToast('📊 Excel exported!', 'success');
}

// ============================================
// COMBINED BOOKS EXPORT (Sales + Purchase + P&L)
// ============================================
function exportCombinedBooks() {
    const wb = XLSX.utils.book_new();

    // 1. Sales Sheet
    const invoices = DB.getActiveInvoices();
    const salesData = invoices.map((inv, idx) => ({
        'S.No': idx + 1,
        'Invoice No': inv.invoice_number,
        'Date': inv.invoice_date,
        'FY': inv.financial_year,
        'Customer': inv.customer_name,
        'Customer GST': inv.customer_gst || '',
        'Taxable': inv.taxable_amount || 0,
        'CGST': inv.cgst_amount || 0,
        'SGST': inv.sgst_amount || 0,
        'IGST': inv.igst_amount || 0,
        'Total Tax': inv.total_tax || 0,
        'Grand Total': inv.grand_total || 0,
        'Payment Status': inv.payment_status
    }));
    const salesWS = XLSX.utils.json_to_sheet(salesData);
    salesWS['!cols'] = Array(13).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, salesWS, 'Sales');

    // 2. Purchase Sheet
    const purchases = DB.getActivePurchases();
    const purchaseData = purchases.map((p, idx) => ({
        'S.No': idx + 1,
        'Bill No': p.bill_no,
        'Date': p.bill_date,
        'FY': p.financial_year,
        'Supplier': p.supplier_name,
        'Supplier GST': p.supplier_gst || '',
        'Category': p.category,
        'Base Amount': p.base_amount || 0,
        'GST Amount': p.gst_amount || 0,
        'Total Amount': p.total_amount || 0,
        'Paid': p.paid_amount || 0,
        'Balance': (p.total_amount || 0) - (p.paid_amount || 0),
        'Status': p.payment_status
    }));
    const purWS = XLSX.utils.json_to_sheet(purchaseData);
    purWS['!cols'] = Array(13).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, purWS, 'Purchases');

    // 3. P&L Summary
    const totalSales = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const totalTaxable = invoices.reduce((s, i) => s + (i.taxable_amount || 0), 0);
    const totalOutputGST = invoices.reduce((s, i) => s + (i.total_tax || 0), 0);
    const totalPurchase = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalPurchaseBase = purchases.reduce((s, p) => s + (p.base_amount || 0), 0);
    const totalInputGST = purchases.reduce((s, p) => s + (p.gst_amount || 0), 0);
    const totalPaid = purchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
    const totalPending = totalPurchase - totalPaid;
    const grossProfit = totalSales - totalPurchase;
    const netGSTPayable = totalOutputGST - totalInputGST;

    const plData = [
        { 'Item': '═══ REVENUE ═══', 'Amount': '' },
        { 'Item': 'Total Sales (Grand Total)', 'Amount': totalSales },
        { 'Item': 'Taxable Sales', 'Amount': totalTaxable },
        { 'Item': 'Output GST Collected', 'Amount': totalOutputGST },
        { 'Item': '', 'Amount': '' },
        { 'Item': '═══ EXPENSES ═══', 'Amount': '' },
        { 'Item': 'Total Purchases', 'Amount': totalPurchase },
        { 'Item': 'Purchase Base Amount', 'Amount': totalPurchaseBase },
        { 'Item': 'Input GST Paid', 'Amount': totalInputGST },
        { 'Item': 'Purchase Paid', 'Amount': totalPaid },
        { 'Item': 'Purchase Pending', 'Amount': totalPending },
        { 'Item': '', 'Amount': '' },
        { 'Item': '═══ PROFIT & LOSS ═══', 'Amount': '' },
        { 'Item': 'Gross Profit (Sales - Purchase)', 'Amount': grossProfit },
        { 'Item': 'Profit Margin %', 'Amount': totalSales > 0 ? ((grossProfit/totalSales)*100).toFixed(2) + '%' : '0%' },
        { 'Item': '', 'Amount': '' },
        { 'Item': '═══ GST SUMMARY ═══', 'Amount': '' },
        { 'Item': 'Output GST (from sales)', 'Amount': totalOutputGST },
        { 'Item': 'Input GST (from purchases)', 'Amount': totalInputGST },
        { 'Item': 'Net GST Payable', 'Amount': netGSTPayable }
    ];
    const plWS = XLSX.utils.json_to_sheet(plData);
    plWS['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, plWS, 'P&L Summary');

    // 4. Supplier Ledger
    const suppliers = DB.getSuppliers();
    const supplierLedger = suppliers.map(s => {
        const stats = DB.getSupplierStats(s.name);
        return {
            'Supplier': s.name,
            'GST': s.gst_no || '',
            'Phone': s.phone || '',
            'Total Bills': stats.totalBills,
            'Total Amount': stats.totalAmount,
            'Paid': stats.totalPaid,
            'Pending': stats.pending
        };
    });
    if (supplierLedger.length > 0) {
        const supWS = XLSX.utils.json_to_sheet(supplierLedger);
        supWS['!cols'] = Array(7).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(wb, supWS, 'Supplier Ledger');
    }

    XLSX.writeFile(wb, `Tripzar_Books_${getTodayISO()}.xlsx`);
    showToast('📊 Complete books exported!', 'success');
}