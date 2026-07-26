/* =============================================
   PURCHASES v2 - Main Amount + Service Fee (separate GST)
   ============================================= */

let purchaseSearchQuery = '';
let purchaseFilters = { category: '', payment_status: '', financial_year: '' };
let editingPurchaseId = null;

const PURCHASE_CATEGORIES = [
    'Flight', 'Hotel', 'Transport', 'Tour Package', 'Visa/Passport',
    'Insurance', 'Forex', 'Office Rent', 'Salary', 'Marketing',
    'Software', 'Utilities', 'Miscellaneous'
];

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
                <button class="btn btn-secondary" onclick="exportPurchasesPDF()" style="background:#dc2626;color:white">
                    <span class="material-icons-round">picture_as_pdf</span> PDF
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

        <!-- ⭐ AMOUNT DETAILS (Main + Service Fee separate) -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">calculate</span> Amount Details
            </div>
            
            <!-- MAIN AMOUNT -->
            <div style="background:#f0f7ff;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #4285F4">
                <div style="font-size:12px;font-weight:700;color:#1a73e8;margin-bottom:10px">
                    💰 Main Amount (Booking / Product)
                </div>
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="margin-bottom:0">
                        <label>Amount (₹) *</label>
                        <input type="number" id="purMainAmount" step="0.01" value="${p.main_amount || p.base_amount || ''}" oninput="calcPurchaseTotal()" style="font-weight:700">
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Included?</label>
                        <select id="purMainGstInclusive" onchange="calcPurchaseTotal()">
                            <option value="no" ${p.main_gst_inclusive === 'no' || !p.main_gst_inclusive ? 'selected' : ''}>No (Add GST on top)</option>
                            <option value="yes" ${p.main_gst_inclusive === 'yes' ? 'selected' : ''}>Yes (GST already in amount)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Rate (%)</label>
                        <select id="purMainGstRate" onchange="calcPurchaseTotal()">
                            <option value="0" ${p.main_gst_rate == 0 ? 'selected' : ''}>0% (No GST)</option>
                            <option value="5" ${p.main_gst_rate == 5 ? 'selected' : ''}>5%</option>
                            <option value="12" ${p.main_gst_rate == 12 ? 'selected' : ''}>12%</option>
                            <option value="18" ${(p.main_gst_rate == 18 || (!p.main_gst_rate && p.main_gst_rate !== 0)) ? 'selected' : ''}>18%</option>
                            <option value="28" ${p.main_gst_rate == 28 ? 'selected' : ''}>28%</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SERVICE FEE -->
            <div style="background:#fff8e6;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #ffa500">
                <div style="font-size:12px;font-weight:700;color:#e65100;margin-bottom:10px">
                    💼 Service Fee (Optional)
                </div>
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="margin-bottom:0">
                        <label>Service Fee (₹)</label>
                        <input type="number" id="purServiceFee" step="0.01" value="${p.service_fee || ''}" oninput="calcPurchaseTotal()" placeholder="0.00">
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Included?</label>
                        <select id="purServiceGstInclusive" onchange="calcPurchaseTotal()">
                            <option value="no" ${p.service_gst_inclusive === 'no' || !p.service_gst_inclusive ? 'selected' : ''}>No (Add GST on top)</option>
                            <option value="yes" ${p.service_gst_inclusive === 'yes' ? 'selected' : ''}>Yes (GST already in amount)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Rate (%)</label>
                        <select id="purServiceGstRate" onchange="calcPurchaseTotal()">
                            <option value="0" ${p.service_gst_rate == 0 ? 'selected' : ''}>0%</option>
                            <option value="5" ${p.service_gst_rate == 5 ? 'selected' : ''}>5%</option>
                            <option value="12" ${p.service_gst_rate == 12 ? 'selected' : ''}>12%</option>
                            <option value="18" ${(p.service_gst_rate == 18 || (!p.service_gst_rate && p.service_gst_rate !== 0)) ? 'selected' : ''}>18%</option>
                            <option value="28" ${p.service_gst_rate == 28 ? 'selected' : ''}>28%</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- TOTAL BREAKDOWN -->
            <div style="background:var(--bg);padding:14px;border-radius:8px;border:2px solid var(--primary)">
                <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:10px">📊 Total Breakdown</div>
                <div class="calc-box" style="padding:0;background:transparent;border:none">
                    <div class="calc-row"><span class="calc-label">Main Base:</span><span class="calc-value" id="purCalcMainBase">₹0.00</span></div>
                    <div class="calc-row"><span class="calc-label">Main GST:</span><span class="calc-value" id="purCalcMainGst">₹0.00</span></div>
                    <div class="calc-row"><span class="calc-label">Service Base:</span><span class="calc-value" id="purCalcServiceBase">₹0.00</span></div>
                    <div class="calc-row"><span class="calc-label">Service GST:</span><span class="calc-value" id="purCalcServiceGst">₹0.00</span></div>
                    <div class="calc-row"><span class="calc-label"><strong>Total GST:</strong></span><span class="calc-value" id="purCalcTotalGst" style="font-weight:700;color:var(--info)">₹0.00</span></div>
                    <div class="calc-row total"><span class="calc-label">Grand Total:</span><span class="calc-value" id="purCalcGrandTotal">₹0.00</span></div>
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
    const calc = calcPurchaseTotal();
    const total = calc.grandTotal;
    if (status === 'paid') {
        document.getElementById('purPaidAmount').value = total.toFixed(2);
        if (!document.getElementById('purPayDate').value) {
            document.getElementById('purPayDate').value = getTodayISO();
        }
    } else if (status === 'unpaid') {
        document.getElementById('purPaidAmount').value = 0;
    }
}

// ⭐ NEW: Calculate main + service fee separately
function calcPurchaseTotal() {
    // Main Amount
    const mainAmount = parseFloat(document.getElementById('purMainAmount')?.value) || 0;
    const mainGstInclusive = document.getElementById('purMainGstInclusive')?.value === 'yes';
    const mainGstRate = parseFloat(document.getElementById('purMainGstRate')?.value) || 0;
    
    let mainBase, mainGst;
    if (mainGstInclusive && mainGstRate > 0) {
        // GST already in amount, extract it
        mainBase = mainAmount / (1 + mainGstRate / 100);
        mainGst = mainAmount - mainBase;
    } else {
        // Add GST on top (or no GST)
        mainBase = mainAmount;
        mainGst = mainAmount * mainGstRate / 100;
    }
    const mainTotal = mainBase + mainGst;
    
    // Service Fee
    const serviceFee = parseFloat(document.getElementById('purServiceFee')?.value) || 0;
    const serviceGstInclusive = document.getElementById('purServiceGstInclusive')?.value === 'yes';
    const serviceGstRate = parseFloat(document.getElementById('purServiceGstRate')?.value) || 0;
    
    let serviceBase, serviceGst;
    if (serviceGstInclusive && serviceGstRate > 0) {
        serviceBase = serviceFee / (1 + serviceGstRate / 100);
        serviceGst = serviceFee - serviceBase;
    } else {
        serviceBase = serviceFee;
        serviceGst = serviceFee * serviceGstRate / 100;
    }
    const serviceTotal = serviceBase + serviceGst;
    
    const totalGst = mainGst + serviceGst;
    const grandTotal = mainTotal + serviceTotal;
    
    // Update UI
    const setV = (id, val) => { 
        const el = document.getElementById(id); 
        if (el) el.textContent = formatCurrency(val); 
    };
    setV('purCalcMainBase', mainBase);
    setV('purCalcMainGst', mainGst);
    setV('purCalcServiceBase', serviceBase);
    setV('purCalcServiceGst', serviceGst);
    setV('purCalcTotalGst', totalGst);
    setV('purCalcGrandTotal', grandTotal);
    
    return { mainBase, mainGst, serviceBase, serviceGst, totalGst, grandTotal, mainTotal, serviceTotal };
}

async function savePurchase() {
    const billNo = document.getElementById('purBillNo').value.trim();
    const billDate = document.getElementById('purBillDate').value;
    const supplierName = document.getElementById('purSupplier').value.trim();
    const category = document.getElementById('purCategory').value;
    const mainAmt = parseFloat(document.getElementById('purMainAmount').value) || 0;
    const svcAmt = parseFloat(document.getElementById('purServiceFee').value) || 0;

    if (!billNo) { showToast('Bill number required!', 'error'); return; }
    if (!billDate) { showToast('Bill date required!', 'error'); return; }
    if (!supplierName) { showToast('Supplier required!', 'error'); return; }
    if (mainAmt <= 0 && svcAmt <= 0) { showToast('Enter Main Amount or Service Fee!', 'error'); return; }

    // Auto-create supplier if not exists
    const existingSup = DB.getSuppliers().find(s => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!existingSup) {
        DB.addSupplier({
            name: supplierName,
            gst_no: document.getElementById('purSupplierGst').value.trim().toUpperCase()
        });
    }

    const calc = calcPurchaseTotal();
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
        
        // ⭐ Main Amount fields
        main_amount: mainAmt,
        main_gst_inclusive: document.getElementById('purMainGstInclusive').value,
        main_gst_rate: parseFloat(document.getElementById('purMainGstRate').value) || 0,
        main_base: calc.mainBase,
        main_gst_amount: calc.mainGst,
        main_total: calc.mainTotal,
        
        // ⭐ Service Fee fields
        service_fee: svcAmt,
        service_gst_inclusive: document.getElementById('purServiceGstInclusive').value,
        service_gst_rate: parseFloat(document.getElementById('purServiceGstRate').value) || 0,
        service_base: calc.serviceBase,
        service_gst_amount: calc.serviceGst,
        service_total: calc.serviceTotal,
        
        // Totals (backward compatible)
        base_amount: calc.mainBase + calc.serviceBase,
        gst_rate: parseFloat(document.getElementById('purMainGstRate').value) || 0,
        gst_amount: calc.totalGst,
        total_amount: calc.grandTotal,
        
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
                ${(p.main_amount || 0) > 0 ? `
                    <div class="calc-row" style="font-weight:700;background:#f0f7ff;padding:6px;border-radius:4px;color:#1a73e8">
                        <span class="calc-label">💰 Main Amount:</span>
                        <span class="calc-value">${formatCurrency(p.main_amount || 0)}</span>
                    </div>
                    <div class="calc-row" style="font-size:11px;color:var(--text-muted);padding-left:10px">
                        <span class="calc-label">└ Base:</span>
                        <span class="calc-value">${formatCurrency(p.main_base || 0)}</span>
                    </div>
                    <div class="calc-row" style="font-size:11px;color:var(--text-muted);padding-left:10px">
                        <span class="calc-label">└ GST (${p.main_gst_rate || 0}%) ${p.main_gst_inclusive === 'yes' ? '[Inclusive]' : '[Extra]'}:</span>
                        <span class="calc-value">${formatCurrency(p.main_gst_amount || 0)}</span>
                    </div>
                ` : ''}
                
                ${(p.service_fee || 0) > 0 ? `
                    <div class="calc-row" style="font-weight:700;background:#fff8e6;padding:6px;border-radius:4px;color:#e65100;margin-top:6px">
                        <span class="calc-label">💼 Service Fee:</span>
                        <span class="calc-value">${formatCurrency(p.service_fee || 0)}</span>
                    </div>
                    <div class="calc-row" style="font-size:11px;color:var(--text-muted);padding-left:10px">
                        <span class="calc-label">└ Base:</span>
                        <span class="calc-value">${formatCurrency(p.service_base || 0)}</span>
                    </div>
                    <div class="calc-row" style="font-size:11px;color:var(--text-muted);padding-left:10px">
                        <span class="calc-label">└ GST (${p.service_gst_rate || 0}%) ${p.service_gst_inclusive === 'yes' ? '[Inclusive]' : '[Extra]'}:</span>
                        <span class="calc-value">${formatCurrency(p.service_gst_amount || 0)}</span>
                    </div>
                ` : ''}
                
                <div class="calc-row" style="margin-top:6px"><span class="calc-label"><strong>Total GST:</strong></span><span class="calc-value" style="color:var(--info)">${formatCurrency(p.gst_amount || 0)}</span></div>
                <div class="calc-row total"><span class="calc-label">Grand Total:</span><span class="calc-value">${formatCurrency(p.total_amount || 0)}</span></div>
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
        'Main Amount': p.main_amount || 0,
        'Main GST Rate': (p.main_gst_rate || 0) + '%',
        'Main GST Inclusive': p.main_gst_inclusive || 'no',
        'Main GST Amount': p.main_gst_amount || 0,
        'Service Fee': p.service_fee || 0,
        'Service GST Rate': (p.service_gst_rate || 0) + '%',
        'Service GST Inclusive': p.service_gst_inclusive || 'no',
        'Service GST Amount': p.service_gst_amount || 0,
        'Base Total': p.base_amount || 0,
        'Total GST': p.gst_amount || 0,
        'Grand Total': p.total_amount || 0,
        'Paid': p.paid_amount || 0,
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
    ws['!cols'] = Array(28).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, `Tripzar_Purchases_${getTodayISO()}.xlsx`);
    showToast('📊 Excel exported!', 'success');
}
// ⭐ NEW: PDF Export for Purchases
function exportPurchasesPDF() {
    const purchases = DB.searchPurchases(purchaseSearchQuery, purchaseFilters);
    if (purchases.length === 0) { showToast('No purchases!', 'warning'); return; }
    
    const filters = {};
    if (purchaseSearchQuery) filters['Search'] = purchaseSearchQuery;
    if (purchaseFilters.category) filters['Category'] = purchaseFilters.category;
    if (purchaseFilters.payment_status) filters['Status'] = purchaseFilters.payment_status.toUpperCase();
    if (purchaseFilters.financial_year) filters['FY'] = purchaseFilters.financial_year;
    
    PDFExport.exportPurchasesList(purchases, filters);
}