/* =============================================
   PURCHASES v3 - Main Amount + Service Fee (Google Drive Integrated)
   ============================================= */

let purchaseSearchQuery = '';
let purchaseFilters = { category: '', payment_status: '', financial_year: '' };
let editingPurchaseId = null;

// Attachment State
let purchaseAttachmentFile = null;
let existingDriveUrl = null;
let existingAttachName = null;

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

    purchaseAttachmentFile = null;
    existingDriveUrl = p.drive_attachment_url || null;
    existingAttachName = p.attachment_name || null;

    const hasDriveBill = !!(p.drive_attachment_url);
    const hasLegacyBill = !!(p.bill_attachment && p.bill_attachment.length > 100);

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
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">calculate</span> Amount Details
            </div>
            
            <div style="background:#f0f7ff;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #4285F4">
                <div style="font-size:12px;font-weight:700;color:#1a73e8;margin-bottom:10px">💰 Main Amount</div>
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="margin-bottom:0">
                        <label>Amount (₹) *</label>
                        <input type="number" id="purMainAmount" step="0.01" value="${p.main_amount || p.base_amount || ''}" oninput="calcPurchaseTotal()">
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Included?</label>
                        <select id="purMainGstInclusive" onchange="calcPurchaseTotal()">
                            <option value="no" ${p.main_gst_inclusive === 'no' || !p.main_gst_inclusive ? 'selected' : ''}>No</option>
                            <option value="yes" ${p.main_gst_inclusive === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Rate (%)</label>
                        <select id="purMainGstRate" onchange="calcPurchaseTotal()">
                            <option value="0" ${p.main_gst_rate == 0 ? 'selected' : ''}>0%</option>
                            <option value="5" ${p.main_gst_rate == 5 ? 'selected' : ''}>5%</option>
                            <option value="12" ${p.main_gst_rate == 12 ? 'selected' : ''}>12%</option>
                            <option value="18" ${(p.main_gst_rate == 18 || (!p.main_gst_rate && p.main_gst_rate !== 0)) ? 'selected' : ''}>18%</option>
                            <option value="28" ${p.main_gst_rate == 28 ? 'selected' : ''}>28%</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="background:#fff8e6;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #ffa500">
                <div style="font-size:12px;font-weight:700;color:#e65100;margin-bottom:10px">💼 Service Fee</div>
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="margin-bottom:0">
                        <label>Service Fee (₹)</label>
                        <input type="number" id="purServiceFee" step="0.01" value="${p.service_fee || ''}" oninput="calcPurchaseTotal()">
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label>GST Included?</label>
                        <select id="purServiceGstInclusive" onchange="calcPurchaseTotal()">
                            <option value="no" ${p.service_gst_inclusive === 'no' || !p.service_gst_inclusive ? 'selected' : ''}>No</option>
                            <option value="yes" ${p.service_gst_inclusive === 'yes' ? 'selected' : ''}>Yes</option>
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

        <!-- Google Drive Bill Attachment -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">cloud_upload</span> Bill Attachment (Google Drive)
            </div>
            <div id="purAttachStatus">
                ${hasDriveBill ? `
                    <div style="background:#e8f5e9;padding:10px;border-radius:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:12px;color:#2e7d32">✅ Bill on Drive: ${p.attachment_name || 'Attached'}</span>
                        <div style="display:flex;gap:6px">
                            <a href="${p.drive_attachment_url}" target="_blank" class="btn btn-sm btn-primary">View</a>
                            <button type="button" class="btn btn-sm btn-danger" onclick="removePurchaseAttachment()">Remove</button>
                        </div>
                    </div>
                ` : hasLegacyBill ? `
                    <div style="background:#fff3e0;padding:10px;border-radius:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:12px;color:#e65100">⚠️ Legacy bill (Local Storage). Re-upload to move to Drive!</span>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removePurchaseAttachment()">Remove</button>
                    </div>
                ` : ''}
            </div>
            <input type="file" id="purBillFile" accept="image/*,.pdf" style="display:none" onchange="uploadPurchaseAttachment(event)">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('purBillFile').click()" style="width:100%;padding:12px;border:2px dashed var(--border)">
                <span class="material-icons-round">upload_file</span> Upload Bill (Auto-saves to Drive)
            </button>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">📝 Notes</div>
            <textarea id="purNotes" rows="2" placeholder="Internal notes...">${p.notes || ''}</textarea>
        </div>

        <div class="btn-group" style="margin-bottom:40px">
            <button class="btn btn-secondary" onclick="navigateTo('purchases')" style="flex:1">Cancel</button>
            <button class="btn btn-primary" id="purSaveBtn" onclick="savePurchase()" style="flex:2">
                <span class="material-icons-round">${isEdit ? 'save' : 'add'}</span>
                ${isEdit ? 'Update Purchase' : 'Save Purchase'}
            </button>
        </div>
    `;

    calcPurchaseTotal();
}

function uploadPurchaseAttachment(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Max 10MB limit!', 'error'); return; }

    purchaseAttachmentFile = file;

    const statusDiv = document.getElementById('purAttachStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div style="background:#e3f2fd;padding:10px;border-radius:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:12px;color:#1565c0">📎 ${file.name} (${(file.size/1024).toFixed(1)} KB) — Will upload on Save</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removePurchaseAttachment()">Remove</button>
            </div>
        `;
    }
}

function removePurchaseAttachment() {
    purchaseAttachmentFile = null;
    existingDriveUrl = null;
    existingAttachName = null;
    if (editingPurchaseId) {
        DB.updatePurchase(editingPurchaseId, { bill_attachment: null, drive_attachment_url: null, attachment_name: null });
    }
    const statusDiv = document.getElementById('purAttachStatus');
    if (statusDiv) statusDiv.innerHTML = '';
    const fileInput = document.getElementById('purBillFile');
    if (fileInput) fileInput.value = '';
    showToast('Attachment removed!', 'success');
}

function onSupplierChange() {
    const name = document.getElementById('purSupplier').value;
    const supplier = DB.getSuppliers().find(s => s.name === name);
    if (supplier) document.getElementById('purSupplierGst').value = supplier.gst_no || '';
}

function onPayStatusChange() {
    const status = document.getElementById('purPayStatus').value;
    const total = calcPurchaseTotal().grandTotal;
    if (status === 'paid') {
        document.getElementById('purPaidAmount').value = total.toFixed(2);
        if (!document.getElementById('purPayDate').value) document.getElementById('purPayDate').value = getTodayISO();
    } else if (status === 'unpaid') {
        document.getElementById('purPaidAmount').value = 0;
    }
}

function calcPurchaseTotal() {
    const mainAmount = parseFloat(document.getElementById('purMainAmount')?.value) || 0;
    const mainGstInclusive = document.getElementById('purMainGstInclusive')?.value === 'yes';
    const mainGstRate = parseFloat(document.getElementById('purMainGstRate')?.value) || 0;
    let mainBase = mainGstInclusive && mainGstRate > 0 ? mainAmount / (1 + mainGstRate / 100) : mainAmount;
    let mainGst = mainGstInclusive && mainGstRate > 0 ? mainAmount - mainBase : mainAmount * mainGstRate / 100;
    
    const serviceFee = parseFloat(document.getElementById('purServiceFee')?.value) || 0;
    const serviceGstInclusive = document.getElementById('purServiceGstInclusive')?.value === 'yes';
    const serviceGstRate = parseFloat(document.getElementById('purServiceGstRate')?.value) || 0;
    let serviceBase = serviceGstInclusive && serviceGstRate > 0 ? serviceFee / (1 + serviceGstRate / 100) : serviceFee;
    let serviceGst = serviceGstInclusive && serviceGstRate > 0 ? serviceFee - serviceBase : serviceFee * serviceGstRate / 100;

    const totalGst = mainGst + serviceGst;
    const grandTotal = mainBase + mainGst + serviceBase + serviceGst;
    
    const setV = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatCurrency(val); };
    setV('purCalcMainBase', mainBase); setV('purCalcMainGst', mainGst);
    setV('purCalcServiceBase', serviceBase); setV('purCalcServiceGst', serviceGst);
    setV('purCalcTotalGst', totalGst); setV('purCalcGrandTotal', grandTotal);
    
    return { mainBase, mainGst, mainTotal: mainBase+mainGst, serviceBase, serviceGst, serviceTotal: serviceBase+serviceGst, totalGst, grandTotal };
}

async function savePurchase() {
    const billNo = document.getElementById('purBillNo').value.trim();
    const billDate = document.getElementById('purBillDate').value;
    const supplierName = document.getElementById('purSupplier').value.trim();
    const mainAmt = parseFloat(document.getElementById('purMainAmount').value) || 0;
    const svcAmt = parseFloat(document.getElementById('purServiceFee').value) || 0;

    if (!billNo || !billDate || !supplierName) { showToast('Fill all required fields!', 'error'); return; }
    if (mainAmt <= 0 && svcAmt <= 0) { showToast('Enter Amount!', 'error'); return; }

    const saveBtn = document.getElementById('purSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="material-icons-round">hourglass_top</span> Saving...'; }

    try {
        if (!DB.getSuppliers().find(s => s.name.toLowerCase() === supplierName.toLowerCase())) {
            DB.addSupplier({ name: supplierName, gst_no: document.getElementById('purSupplierGst').value.trim().toUpperCase() });
        }

        // Upload to Drive if new file selected
        let driveUrl = existingDriveUrl;
        let attachName = existingAttachName;

        if (purchaseAttachmentFile) {
            if (saveBtn) saveBtn.innerHTML = 'Uploading to Drive...';
            try {
                const safeBill = billNo.replace(/[^a-zA-Z0-9]/g, '_');
                const result = await uploadBillToDrive(purchaseAttachmentFile, `${safeBill}_${supplierName.substring(0,10)}.${purchaseAttachmentFile.name.split('.').pop()}`);
                if (result && result.url) { driveUrl = result.url; attachName = result.fileName; }
            } catch (err) {
                console.error(err);
                if (!confirm('Drive upload failed! Save without bill?')) return;
            }
        }

        const calc = calcPurchaseTotal();
        const existingData = editingPurchaseId ? DB.getPurchaseById(editingPurchaseId) : {};

        const data = {
            bill_no: billNo, bill_date: billDate, financial_year: document.getElementById('purFY').value || getCurrentFY(),
            supplier_name: supplierName, supplier_gst: document.getElementById('purSupplierGst').value.toUpperCase(),
            category: document.getElementById('purCategory').value, description: document.getElementById('purDescription').value,
            linked_invoice_id: document.getElementById('purLinkedInvoice').value || '',
            
            main_amount: mainAmt, main_gst_inclusive: document.getElementById('purMainGstInclusive').value,
            main_gst_rate: parseFloat(document.getElementById('purMainGstRate').value) || 0,
            main_base: calc.mainBase, main_gst_amount: calc.mainGst, main_total: calc.mainTotal,
            
            service_fee: svcAmt, service_gst_inclusive: document.getElementById('purServiceGstInclusive').value,
            service_gst_rate: parseFloat(document.getElementById('purServiceGstRate').value) || 0,
            service_base: calc.serviceBase, service_gst_amount: calc.serviceGst, service_total: calc.serviceTotal,
            
            base_amount: calc.mainBase + calc.serviceBase, gst_rate: parseFloat(document.getElementById('purMainGstRate').value)||0,
            gst_amount: calc.totalGst, total_amount: calc.grandTotal,
            
            paid_amount: parseFloat(document.getElementById('purPaidAmount').value)||0,
            payment_status: document.getElementById('purPayStatus').value,
            payment_date: document.getElementById('purPayDate').value,
            payment_mode: document.getElementById('purPayMode').value,
            payment_ref: document.getElementById('purPayRef').value, notes: document.getElementById('purNotes').value,
            
            drive_attachment_url: driveUrl, attachment_name: attachName,
            // Keep legacy base64 ONLY if we haven't uploaded a new one to Drive yet
            bill_attachment: (purchaseAttachmentFile || driveUrl) ? null : (existingData.bill_attachment || null)
        };

        let saved = editingPurchaseId ? DB.updatePurchase(editingPurchaseId, data) : DB.addPurchase(data);
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId && saved) FirebaseSync.savePurchase(saved);
        
        purchaseAttachmentFile = null;
        showToast('Saved!', 'success');
        viewPurchase(saved.id);
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Purchase'; }
    }
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
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) await FirebaseSync.deletePurchase(id);
    showToast('Deleted!', 'success');
    renderPurchaseList();
}

// ==== YAHAN SE CHANGE KIYA GAYA HAI (Naya View Form with Tax + Drive Box) ==== //
function viewPurchase(id) {
    const p = DB.getPurchaseById(id);
    if (!p) return;
    const balance = (p.total_amount || 0) - (p.paid_amount || 0);

    navigateTo('purchaseView');
    const c = document.getElementById('page-purchaseView');
    
    // 1. ATTACHMENT VIEW GENERATOR (Drive & Legacy Local Storage)
    let attachmentHTML = '';
    if (p.drive_attachment_url) {
        attachmentHTML = `
            <div class="card card-body" style="margin-bottom:16px; border-left:4px solid #1565c0; background-color:#f8faff;">
                <div style="font-size:12px; font-weight:700; color:#1565c0; text-transform:uppercase; margin-bottom:8px;">
                    ☁️ Google Drive Attachment
                </div>
                <a href="${p.drive_attachment_url}" target="_blank" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:6px; width:max-content; padding: 8px 16px;">
                    <span class="material-icons-round" style="font-size:18px">open_in_new</span> View Original Bill
                </a>
            </div>
        `;
    } else if (p.bill_attachment) {
        attachmentHTML = `
            <div class="card card-body" style="margin-bottom:16px; border-left:4px solid #f59e0b; background-color:#fffbf2;">
                <div style="font-size:12px; font-weight:700; color:#d97706; text-transform:uppercase; margin-bottom:8px;">
                    📎 Saved Attachment (Local)
                </div>
                <button onclick="downloadPurchaseAttachment('${p.id}')" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:6px; width:max-content; padding: 8px 16px;">
                    <span class="material-icons-round" style="font-size:18px">image</span> View Bill
                </button>
            </div>
        `;
    }

    // 2. TAX BREAKDOWN GENERATOR
    let taxBreakdownHTML = '';
    if ((p.base_amount > 0) || (p.gst_amount > 0)) {
        taxBreakdownHTML = `
            <div style="border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                <div class="calc-row" style="color:var(--text-secondary); font-size:14px; margin-bottom: 4px;">
                    <span class="calc-label">Taxable Value (Base):</span>
                    <span class="calc-value">${formatCurrency(p.base_amount || 0)}</span>
                </div>
                ${p.gst_amount > 0 ? `
                <div class="calc-row" style="color:var(--text-secondary); font-size:14px;">
                    <span class="calc-label">Total GST Amount:</span>
                    <span class="calc-value">${formatCurrency(p.gst_amount || 0)}</span>
                </div>` : ''}
            </div>
        `;
    }

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
            <button class="btn btn-danger" onclick="deletePurchaseAction('${p.id}')"><span class="material-icons-round">delete</span> Delete</button>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="grid-2" style="margin-bottom:16px">
                <div>
                    <div class="section-title">Supplier</div>
                    <h3 style="font-size:16px;font-weight:700">${toProperCase(p.supplier_name)}</h3>
                    ${p.supplier_gst ? `<p style="font-size:12px;color:var(--text-secondary)">GST: ${p.supplier_gst}</p>` : ''}
                    <span class="badge badge-info" style="margin-top:6px">${p.category || 'Purchase'}</span>
                </div>
                <div style="text-align:right">
                    <p>Bill: <strong>${p.bill_no}</strong></p>
                    <p>Date: <strong>${formatDate(p.bill_date)}</strong></p>
                    <p>FY: <strong>${p.financial_year}</strong></p>
                    <span class="badge ${p.payment_status==='paid'?'badge-success':p.payment_status==='partial'?'badge-warning':'badge-danger'}" style="margin-top:6px">${(p.payment_status||'').toUpperCase()}</span>
                </div>
            </div>

            <div class="calc-box">
                ${taxBreakdownHTML}
                <div class="calc-row total"><span class="calc-label">Grand Total:</span><span class="calc-value">${formatCurrency(p.total_amount || 0)}</span></div>
                <div class="calc-row" style="color:var(--success); margin-top:8px;"><span class="calc-label">Paid:</span><span class="calc-value">${formatCurrency(p.paid_amount || 0)}</span></div>
                <div class="calc-row" style="color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700; margin-top:4px;"><span class="calc-label">Balance:</span><span class="calc-value">${formatCurrency(balance)}</span></div>
            </div>
            
            ${p.notes ? `
            <div style="margin-top:16px; padding-top:16px; border-top:1px dashed var(--border);">
                <div class="section-title" style="font-size:12px;">Notes</div>
                <p style="font-size:13px; color:var(--text-secondary); white-space:pre-wrap;">${p.notes}</p>
            </div>
            ` : ''}
        </div>

        ${attachmentHTML}
    `;
}
// ==== CHANGE YAHAN TAK HI HAI ==== //

function downloadPurchaseAttachment(id) {
    const p = DB.getPurchaseById(id);
    if (!p) return;
    if (p.drive_attachment_url) { window.open(p.drive_attachment_url, '_blank'); return; }
    if (p.bill_attachment) {
        const a = document.createElement('a');
        a.href = p.bill_attachment;
        a.download = `${p.supplier_name}_${p.bill_no}.pdf`.replace(/[^a-zA-Z0-9_.]/g, '_');
        a.click();
    }
}

function exportPurchasesExcel() {
    const purchases = DB.searchPurchases(purchaseSearchQuery, purchaseFilters);
    if (purchases.length === 0) return;
    const data = purchases.map((p, idx) => ({
        'S.No': idx + 1, 'Bill No': p.bill_no, 'Bill Date': p.bill_date, 'Supplier': p.supplier_name,
        'Base': p.base_amount || 0, 'GST': p.gst_amount || 0, 'Total': p.total_amount || 0,
        'Drive Link': p.drive_attachment_url || ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, `Purchases_${getTodayISO()}.xlsx`);
}

function exportPurchasesPDF() {
    const purchases = DB.searchPurchases(purchaseSearchQuery, purchaseFilters);
    if (purchases.length === 0) return;
    PDFExport.exportPurchasesList(purchases, {});
}
