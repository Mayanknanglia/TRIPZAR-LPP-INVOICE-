/* =============================================================================
   PURCHASES.JS - FINAL v5.0 (COMPLETE PRODUCTION READY)
   Tripzar Holidays LLP - Purchase Bill Management System
   Features:
   - 23 Business/Travel Categories
   - Google Drive Attachment Upload (No LocalStorage Quota Error)
   - GST Calculations (CGST/SGST/IGST)
   - Premium View, Add, Edit, Delete
   - Search, Filters, Summary Stats, CSV Export, Pagination
   ============================================================================= */

// ---------- CATEGORIES (23 Total) ----------
const PURCHASE_CATEGORIES = [
    { key: 'FLIGHT', name: 'Flight', icon: 'fa-plane', color: 'blue' },
    { key: 'TRAIN', name: 'Train', icon: 'fa-train', color: 'red' },
    { key: 'BUS', name: 'Bus', icon: 'fa-bus', color: 'yellow' },
    { key: 'TRANSPORT', name: 'Transport / Cab', icon: 'fa-taxi', color: 'orange' },
    { key: 'HOTEL', name: 'Hotel / Accommodation', icon: 'fa-hotel', color: 'purple' },
    { key: 'CRUISE', name: 'Cruise / Ferry', icon: 'fa-ship', color: 'cyan' },
    { key: 'PACKAGE', name: 'Tour Package', icon: 'fa-suitcase-rolling', color: 'pink' },
    { key: 'ACTIVITY', name: 'Activities & Sightseeing', icon: 'fa-camera', color: 'green' },
    { key: 'VISA', name: 'Visa / Passport', icon: 'fa-passport', color: 'indigo' },
    { key: 'INSURANCE', name: 'Insurance', icon: 'fa-shield-alt', color: 'teal' },
    { key: 'FOREX', name: 'Forex', icon: 'fa-money-bill-wave', color: 'emerald' },
    { key: 'GUIDE', name: 'Driver / Tour Guide', icon: 'fa-user-tie', color: 'amber' },
    { key: 'MICE', name: 'MICE & Events', icon: 'fa-users', color: 'rose' },
    { key: 'RENT', name: 'Office Rent', icon: 'fa-building', color: 'slate' },
    { key: 'SALARY', name: 'Salary & Incentives', icon: 'fa-hand-holding-usd', color: 'lime' },
    { key: 'MARKETING', name: 'Marketing & Ads', icon: 'fa-bullhorn', color: 'fuchsia' },
    { key: 'SOFTWARE', name: 'Software & IT Services', icon: 'fa-laptop-code', color: 'sky' },
    { key: 'UTILITIES', name: 'Utilities & Internet', icon: 'fa-wifi', color: 'violet' },
    { key: 'LEGAL', name: 'Legal & Professional Fees', icon: 'fa-gavel', color: 'zinc' },
    { key: 'BANK', name: 'Bank & Gateway Charges', icon: 'fa-university', color: 'stone' },
    { key: 'OFFICE', name: 'Office Expenses & Pantry', icon: 'fa-mug-hot', color: 'orange' },
    { key: 'REPAIR', name: 'Repair & Maintenance', icon: 'fa-tools', color: 'gray' },
    { key: 'MISC', name: 'Miscellaneous', icon: 'fa-box', color: 'neutral' }
];

// ---------- PAGINATION STATE ----------
let purchaseCurrentPage = 1;
const PURCHASE_PAGE_SIZE = 15;
let purchaseFilterState = {
    search: '',
    category: 'ALL',
    status: 'ALL',
    fy: 'ALL',
    fromDate: '',
    toDate: ''
};

// ==============================================================
// MAIN INIT
// ==============================================================
function initPurchasesPage() {
    renderPurchaseStats();
    renderPurchaseFilters();
    renderPurchaseList();
    attachPurchaseEventListeners();
}

// ==============================================================
// SUMMARY STATS
// ==============================================================
function renderPurchaseStats() {
    const purchases = DB.getPurchases() || [];
    const total = purchases.reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0);
    const paid = purchases.filter(p => p.status === 'PAID').reduce((s, p) => s + (parseFloat(p.paid_amount) || 0), 0);
    const pending = purchases.filter(p => p.status === 'PENDING').reduce((s, p) => s + (parseFloat(p.balance_amount) || 0), 0);
    const totalGST = purchases.reduce((s, p) => s + (parseFloat(p.cgst_amount) || 0) + (parseFloat(p.sgst_amount) || 0) + (parseFloat(p.igst_amount) || 0), 0);

    const statsEl = document.getElementById('purchaseStats');
    if (!statsEl) return;

    const fmt = (v) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    statsEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow border border-gray-100">
                <p class="text-xs text-gray-500 uppercase font-semibold">Total Bills</p>
                <p class="text-2xl font-bold text-gray-900 mt-1">${purchases.length}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border border-gray-100">
                <p class="text-xs text-gray-500 uppercase font-semibold">Total Purchase</p>
                <p class="text-xl font-bold text-blue-700 mt-1">${fmt(total)}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border border-gray-100">
                <p class="text-xs text-gray-500 uppercase font-semibold">Paid</p>
                <p class="text-xl font-bold text-green-700 mt-1">${fmt(paid)}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border border-gray-100">
                <p class="text-xs text-gray-500 uppercase font-semibold">Pending</p>
                <p class="text-xl font-bold text-red-600 mt-1">${fmt(pending)}</p>
            </div>
        </div>
    `;
}

// ==============================================================
// FILTERS RENDER
// ==============================================================
function renderPurchaseFilters() {
    const el = document.getElementById('purchaseFilters');
    if (!el) return;

    let catOptions = '<option value="ALL">All Categories</option>';
    PURCHASE_CATEGORIES.forEach(c => {
        catOptions += `<option value="${c.key}">${c.name}</option>`;
    });

    el.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input type="text" id="purchaseSearch" placeholder="🔍 Search bill/supplier..." class="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <select id="purchaseCategoryFilter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">${catOptions}</select>
                <select id="purchaseStatusFilter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="ALL">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                </select>
                <input type="date" id="purchaseFromDate" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" title="From Date">
                <input type="date" id="purchaseToDate" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" title="To Date">
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
                <button onclick="openAddPurchase()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow"><i class="fas fa-plus mr-1"></i> Add Purchase</button>
                <button onclick="exportPurchasesCSV()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"><i class="fas fa-file-csv mr-1"></i> Export CSV</button>
                <button onclick="clearPurchaseFilters()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg"><i class="fas fa-times mr-1"></i> Clear Filters</button>
            </div>
        </div>
    `;
}

// ==============================================================
// EVENT LISTENERS
// ==============================================================
function attachPurchaseEventListeners() {
    const search = document.getElementById('purchaseSearch');
    const catF = document.getElementById('purchaseCategoryFilter');
    const statF = document.getElementById('purchaseStatusFilter');
    const fromD = document.getElementById('purchaseFromDate');
    const toD = document.getElementById('purchaseToDate');

    if (search) search.addEventListener('input', (e) => { purchaseFilterState.search = e.target.value.toLowerCase(); purchaseCurrentPage = 1; renderPurchaseList(); });
    if (catF) catF.addEventListener('change', (e) => { purchaseFilterState.category = e.target.value; purchaseCurrentPage = 1; renderPurchaseList(); });
    if (statF) statF.addEventListener('change', (e) => { purchaseFilterState.status = e.target.value; purchaseCurrentPage = 1; renderPurchaseList(); });
    if (fromD) fromD.addEventListener('change', (e) => { purchaseFilterState.fromDate = e.target.value; purchaseCurrentPage = 1; renderPurchaseList(); });
    if (toD) toD.addEventListener('change', (e) => { purchaseFilterState.toDate = e.target.value; purchaseCurrentPage = 1; renderPurchaseList(); });
}

function clearPurchaseFilters() {
    purchaseFilterState = { search: '', category: 'ALL', status: 'ALL', fy: 'ALL', fromDate: '', toDate: '' };
    purchaseCurrentPage = 1;
    renderPurchaseFilters();
    attachPurchaseEventListeners();
    renderPurchaseList();
}

// ==============================================================
// LIST RENDER (with Filters + Pagination)
// ==============================================================
function renderPurchaseList() {
    const tbody = document.getElementById('purchaseTableBody');
    if (!tbody) return;

    let purchases = DB.getPurchases() || [];

    // Apply Filters
    if (purchaseFilterState.search) {
        const q = purchaseFilterState.search;
        purchases = purchases.filter(p =>
            (p.bill_no || '').toLowerCase().includes(q) ||
            (p.supplier_name || '').toLowerCase().includes(q) ||
            (p.supplier_gst || '').toLowerCase().includes(q)
        );
    }
    if (purchaseFilterState.category !== 'ALL') {
        purchases = purchases.filter(p => p.category === purchaseFilterState.category);
    }
    if (purchaseFilterState.status !== 'ALL') {
        purchases = purchases.filter(p => p.status === purchaseFilterState.status);
    }
    if (purchaseFilterState.fromDate) {
        purchases = purchases.filter(p => new Date(p.bill_date) >= new Date(purchaseFilterState.fromDate));
    }
    if (purchaseFilterState.toDate) {
        purchases = purchases.filter(p => new Date(p.bill_date) <= new Date(purchaseFilterState.toDate));
    }

    // Sort by date DESC
    purchases.sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));

    // Pagination
    const totalPages = Math.max(1, Math.ceil(purchases.length / PURCHASE_PAGE_SIZE));
    if (purchaseCurrentPage > totalPages) purchaseCurrentPage = totalPages;
    const start = (purchaseCurrentPage - 1) * PURCHASE_PAGE_SIZE;
    const pageData = purchases.slice(start, start + PURCHASE_PAGE_SIZE);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-500"><i class="fas fa-inbox text-4xl mb-2"></i><p>No Purchase Bills Found</p></td></tr>`;
    } else {
        tbody.innerHTML = pageData.map((p, idx) => {
            const cat = PURCHASE_CATEGORIES.find(c => c.key === p.category) || { name: p.category || 'N/A', icon: 'fa-file' };
            const attachIcon = p.drive_attachment_url
                ? `<a href="${p.drive_attachment_url}" target="_blank" title="View Drive Bill" class="text-indigo-600 hover:text-indigo-800"><i class="fas fa-cloud-download-alt"></i></a>`
                : p.attachment
                    ? `<button onclick="viewLegacyAttachment('${p.id}')" title="View Attachment" class="text-gray-500 hover:text-gray-700"><i class="fas fa-paperclip"></i></button>`
                    : `<span class="text-gray-300"><i class="fas fa-minus"></i></span>`;

            return `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="px-3 py-3 text-sm text-gray-500">${start + idx + 1}</td>
                    <td class="px-3 py-3 text-sm font-mono text-indigo-700 cursor-pointer hover:underline" onclick="viewPurchase('${p.id}')">${p.bill_no}</td>
                    <td class="px-3 py-3 text-sm text-gray-700">${formatDate(p.bill_date)}</td>
                    <td class="px-3 py-3 text-sm font-medium text-gray-900">${p.supplier_name}</td>
                    <td class="px-3 py-3 text-xs"><span class="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold"><i class="fas ${cat.icon} mr-1"></i>${cat.name}</span></td>
                    <td class="px-3 py-3 text-sm font-bold text-gray-900 text-right">₹${parseFloat(p.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="px-3 py-3 text-xs text-center"><span class="px-2 py-1 rounded-full font-bold ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${p.status}</span></td>
                    <td class="px-3 py-3 text-sm text-center">
                        ${attachIcon}
                        <button onclick="viewPurchase('${p.id}')" class="text-blue-600 hover:text-blue-800 ml-2" title="View"><i class="fas fa-eye"></i></button>
                        <button onclick="editPurchase('${p.id}')" class="text-yellow-600 hover:text-yellow-800 ml-2" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="deletePurchase('${p.id}')" class="text-red-600 hover:text-red-800 ml-2" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Pagination controls
    const pagEl = document.getElementById('purchasePagination');
    if (pagEl) {
        pagEl.innerHTML = `
            <div class="flex justify-between items-center mt-4 px-2">
                <span class="text-sm text-gray-600">Showing ${pageData.length} of ${purchases.length} bills</span>
                <div class="flex gap-2">
                    <button onclick="changePurchasePage(-1)" ${purchaseCurrentPage === 1 ? 'disabled' : ''} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-40">← Prev</button>
                    <span class="px-3 py-1 text-sm font-medium">Page ${purchaseCurrentPage} of ${totalPages}</span>
                    <button onclick="changePurchasePage(1)" ${purchaseCurrentPage === totalPages ? 'disabled' : ''} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-40">Next →</button>
                </div>
            </div>
        `;
    }
}

function changePurchasePage(delta) {
    purchaseCurrentPage += delta;
    renderPurchaseList();
}

// ==============================================================
// ADD PURCHASE MODAL
// ==============================================================
function openAddPurchase() {
    openPurchaseForm(null);
}

function editPurchase(id) {
    const bill = DB.getPurchases().find(p => p.id === id);
    if (!bill) { showToast('Bill not found', 'error'); return; }
    openPurchaseForm(bill);
}

function openPurchaseForm(bill) {
    const modal = document.getElementById('purchaseModal');
    if (!modal) {
        // Create modal container if not exists
        const div = document.createElement('div');
        div.id = 'purchaseModal';
        div.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        document.body.appendChild(div);
    }
    const m = document.getElementById('purchaseModal');
    m.classList.remove('hidden');

    const isEdit = !!bill;
    const b = bill || {};

    let catOpts = PURCHASE_CATEGORIES.map(c => `<option value="${c.key}" ${b.category === c.key ? 'selected' : ''}>${c.name}</option>`).join('');

    m.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 class="text-xl font-bold text-gray-900">${isEdit ? '✏️ Edit' : '➕ Add'} Purchase Bill</h2>
                <button onclick="closePurchaseModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <form id="purchaseForm" class="p-6 space-y-4">
                <input type="hidden" id="p_id" value="${b.id || ''}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Bill No <span class="text-red-500">*</span></label>
                        <input type="text" id="p_bill_no" required value="${b.bill_no || ''}" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Bill Date <span class="text-red-500">*</span></label>
                        <input type="date" id="p_bill_date" required value="${b.bill_date || new Date().toISOString().split('T')[0]}" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Supplier Name <span class="text-red-500">*</span></label>
                        <input type="text" id="p_supplier_name" required value="${b.supplier_name || ''}" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Supplier GSTIN</label>
                        <input type="text" id="p_supplier_gst" value="${b.supplier_gst || ''}" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase">
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Category <span class="text-red-500">*</span></label>
                        <select id="p_category" required class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">${catOpts}</select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">GST Type</label>
                        <select id="p_gst_type" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" onchange="calcPurchaseTotal()">
                            <option value="NONE" ${b.gst_type === 'NONE' ? 'selected' : ''}>No GST</option>
                            <option value="CGST_SGST" ${b.gst_type === 'CGST_SGST' ? 'selected' : ''}>CGST + SGST (Intra-state)</option>
                            <option value="IGST" ${b.gst_type === 'IGST' ? 'selected' : ''}>IGST (Inter-state)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Taxable Amount</label>
                        <input type="number" id="p_taxable_amount" step="0.01" value="${b.taxable_amount || 0}" oninput="calcPurchaseTotal()" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">GST Rate (%)</label>
                        <select id="p_gst_rate" onchange="calcPurchaseTotal()" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="0" ${b.gst_rate == 0 ? 'selected' : ''}>0%</option>
                            <option value="5" ${b.gst_rate == 5 ? 'selected' : ''}>5%</option>
                            <option value="12" ${b.gst_rate == 12 ? 'selected' : ''}>12%</option>
                            <option value="18" ${b.gst_rate == 18 ? 'selected' : ''}>18%</option>
                            <option value="28" ${b.gst_rate == 28 ? 'selected' : ''}>28%</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg">
                    <div><label class="text-xs text-gray-600">CGST</label><input type="text" id="p_cgst_amount" readonly value="${b.cgst_amount || 0}" class="mt-1 w-full px-2 py-1 bg-white border rounded text-sm"></div>
                    <div><label class="text-xs text-gray-600">SGST</label><input type="text" id="p_sgst_amount" readonly value="${b.sgst_amount || 0}" class="mt-1 w-full px-2 py-1 bg-white border rounded text-sm"></div>
                    <div><label class="text-xs text-gray-600">IGST</label><input type="text" id="p_igst_amount" readonly value="${b.igst_amount || 0}" class="mt-1 w-full px-2 py-1 bg-white border rounded text-sm"></div>
                    <div><label class="text-xs text-gray-600 font-bold">Grand Total</label><input type="text" id="p_total_amount" readonly value="${b.total_amount || 0}" class="mt-1 w-full px-2 py-1 bg-yellow-50 border border-yellow-300 rounded text-sm font-bold"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Payment Status</label>
                        <select id="p_status" onchange="togglePaidAmount()" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="PENDING" ${b.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                            <option value="PAID" ${b.status === 'PAID' ? 'selected' : ''}>Paid</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-600 uppercase">Paid Amount</label>
                        <input type="number" id="p_paid_amount" step="0.01" value="${b.paid_amount || 0}" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                </div>

                <div>
                    <label class="text-xs font-semibold text-gray-600 uppercase">Notes / Particulars</label>
                    <textarea id="p_notes" rows="2" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">${b.notes || ''}</textarea>
                </div>

                <div class="border-t border-gray-200 pt-4">
                    <label class="text-xs font-semibold text-gray-600 uppercase">Attachment (Upload to Google Drive)</label>
                    <input type="file" id="p_attachment_file" accept="image/*,application/pdf" class="mt-1 w-full text-sm">
                    ${b.drive_attachment_url ? `<p class="text-xs text-green-600 mt-2"><i class="fas fa-check-circle"></i> Existing bill uploaded: <a href="${b.drive_attachment_url}" target="_blank" class="underline">View</a></p>` : ''}
                    <p class="text-xs text-gray-500 mt-1">Note: Images will auto-compress. Upload to Drive folder "Tripzar Invoices > Purchase Bills"</p>
                </div>

                <div class="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onclick="closePurchaseModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow"><i class="fas fa-save mr-1"></i> ${isEdit ? 'Update' : 'Save'} Bill</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('purchaseForm').addEventListener('submit', savePurchase);
    calcPurchaseTotal();
}

function closePurchaseModal() {
    const m = document.getElementById('purchaseModal');
    if (m) m.classList.add('hidden');
}

function togglePaidAmount() {
    const status = document.getElementById('p_status').value;
    const paidEl = document.getElementById('p_paid_amount');
    const totalEl = document.getElementById('p_total_amount');
    if (status === 'PAID') {
        paidEl.value = totalEl.value;
    } else {
        paidEl.value = 0;
    }
}

function calcPurchaseTotal() {
    const taxable = parseFloat(document.getElementById('p_taxable_amount').value) || 0;
    const rate = parseFloat(document.getElementById('p_gst_rate').value) || 0;
    const gstType = document.getElementById('p_gst_type').value;

    let cgst = 0, sgst = 0, igst = 0;
    const gstAmt = taxable * rate / 100;

    if (gstType === 'CGST_SGST') {
        cgst = gstAmt / 2;
        sgst = gstAmt / 2;
    } else if (gstType === 'IGST') {
        igst = gstAmt;
    }

    const total = taxable + cgst + sgst + igst;

    document.getElementById('p_cgst_amount').value = cgst.toFixed(2);
    document.getElementById('p_sgst_amount').value = sgst.toFixed(2);
    document.getElementById('p_igst_amount').value = igst.toFixed(2);
    document.getElementById('p_total_amount').value = total.toFixed(2);
}

// ==============================================================
// SAVE PURCHASE (with Google Drive Upload)
// ==============================================================
async function savePurchase(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const id = document.getElementById('p_id').value || 'PUR_' + Date.now();
        const fileInput = document.getElementById('p_attachment_file');
        let driveUrl = '';

        // Upload to Google Drive if file selected
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt fa-pulse"></i> Uploading to Drive...';

            if (typeof uploadPurchaseBill === 'function') {
                try {
                    const uploadRes = await uploadPurchaseBill(file, id);
                    if (uploadRes && uploadRes.url) {
                        driveUrl = uploadRes.url;
                        showToast('✅ Uploaded to Drive!', 'success');
                    } else {
                        showToast('⚠️ Drive upload failed, saving bill without attachment', 'warning');
                    }
                } catch (err) {
                    console.error('Drive upload error:', err);
                    showToast('⚠️ Drive upload failed: ' + err.message, 'warning');
                }
            }
        }

        // Get existing bill (for edit)
        const existing = DB.getPurchases().find(p => p.id === id);

        const bill = {
            id: id,
            bill_no: document.getElementById('p_bill_no').value.trim(),
            bill_date: document.getElementById('p_bill_date').value,
            supplier_name: document.getElementById('p_supplier_name').value.trim(),
            supplier_gst: document.getElementById('p_supplier_gst').value.trim().toUpperCase(),
            category: document.getElementById('p_category').value,
            gst_type: document.getElementById('p_gst_type').value,
            taxable_amount: parseFloat(document.getElementById('p_taxable_amount').value) || 0,
            gst_rate: parseFloat(document.getElementById('p_gst_rate').value) || 0,
            cgst_amount: parseFloat(document.getElementById('p_cgst_amount').value) || 0,
            sgst_amount: parseFloat(document.getElementById('p_sgst_amount').value) || 0,
            igst_amount: parseFloat(document.getElementById('p_igst_amount').value) || 0,
            total_amount: parseFloat(document.getElementById('p_total_amount').value) || 0,
            paid_amount: parseFloat(document.getElementById('p_paid_amount').value) || 0,
            status: document.getElementById('p_status').value,
            notes: document.getElementById('p_notes').value.trim(),
            drive_attachment_url: driveUrl || (existing && existing.drive_attachment_url) || '',
            attachment: (existing && existing.attachment) || '', // legacy
            financial_year: getFinancialYear(document.getElementById('p_bill_date').value),
            created_at: (existing && existing.created_at) || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        bill.balance_amount = bill.total_amount - bill.paid_amount;

        // Save to DB
        const all = DB.getPurchases() || [];
        const idx = all.findIndex(p => p.id === id);
        if (idx !== -1) all[idx] = bill;
        else all.push(bill);
        DB.setPurchases(all);

        showToast('✅ Purchase Bill Saved!', 'success');
        closePurchaseModal();
        renderPurchaseStats();
        renderPurchaseList();
    } catch (err) {
        console.error(err);
        showToast('❌ Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function getFinancialYear(dateStr) {
    const d = new Date(dateStr);
    const m = d.getMonth();
    const y = d.getFullYear();
    return m >= 3 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

// ==============================================================
// DELETE PURCHASE
// ==============================================================
function deletePurchase(id) {
    if (!confirm('Delete this purchase bill permanently?')) return;
    const all = DB.getPurchases() || [];
    const updated = all.filter(p => p.id !== id);
    DB.setPurchases(updated);
    showToast('🗑️ Bill Deleted!', 'success');
    renderPurchaseStats();
    renderPurchaseList();

    // If view is open, close it
    const viewSec = document.getElementById('purchaseViewSection');
    if (viewSec && !viewSec.classList.contains('hidden')) {
        showPurchaseList();
    }
}

// ==============================================================
// PREMIUM VIEW
// ==============================================================
function viewPurchase(id) {
    const purchases = DB.getPurchases();
    const bill = purchases.find(p => p.id === id);
    if (!bill) { showToast('Purchase Bill not found!', 'error'); return; }

    const listSec = document.getElementById('purchaseListSection');
    const viewSec = document.getElementById('purchaseViewSection');
    if (listSec) listSec.classList.add('hidden');
    if (viewSec) viewSec.classList.remove('hidden');

    const formatAmt = (amt) => '₹' + parseFloat(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Attachment
    let attachmentHTML = '';
    if (bill.drive_attachment_url) {
        attachmentHTML = `<a href="${bill.drive_attachment_url}" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all"><i class="fas fa-external-link-alt"></i> View Original Bill (Drive)</a>`;
    } else if (bill.attachment) {
        attachmentHTML = `<button onclick="viewLegacyAttachment('${bill.id}')" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"><i class="fas fa-image"></i> View Saved Attachment</button>`;
    } else {
        attachmentHTML = `<span class="text-sm text-gray-500 italic"><i class="fas fa-file-slash"></i> No attachment uploaded</span>`;
    }

    // Tax breakdown
    let taxHTML = '';
    const cgst = parseFloat(bill.cgst_amount || 0);
    const sgst = parseFloat(bill.sgst_amount || 0);
    const igst = parseFloat(bill.igst_amount || 0);
    const taxable = parseFloat(bill.taxable_amount || 0);

    if (cgst > 0 || sgst > 0 || igst > 0 || taxable > 0) {
        taxHTML = `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                <span class="text-gray-500">Taxable Value:</span><span class="font-medium text-gray-800">${formatAmt(taxable)}</span>
            </div>
            ${cgst > 0 ? `<div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm"><span class="text-gray-500">CGST (${bill.gst_rate/2}%):</span><span class="font-medium text-gray-800">${formatAmt(cgst)}</span></div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm"><span class="text-gray-500">SGST (${bill.gst_rate/2}%):</span><span class="font-medium text-gray-800">${formatAmt(sgst)}</span></div>` : ''}
            ${igst > 0 ? `<div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm"><span class="text-gray-500">IGST (${bill.gst_rate}%):</span><span class="font-medium text-gray-800">${formatAmt(igst)}</span></div>` : ''}
        `;
    }

    const cat = PURCHASE_CATEGORIES.find(c => c.key === bill.category) || { name: bill.category || 'N/A', icon: 'fa-file' };

    viewSec.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 class="text-2xl font-extrabold text-gray-900 tracking-tight">Purchase Bill</h2>
                <p class="text-sm font-mono text-green-700 mt-1">${bill.bill_no}</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="editPurchase('${bill.id}')" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"><i class="fas fa-pen mr-1"></i> Edit</button>
                <button onclick="deletePurchase('${bill.id}')" class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 shadow-sm"><i class="fas fa-trash-alt mr-1"></i> Delete</button>
                <button onclick="showPurchaseList()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">&larr; Back</button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div class="grid grid-cols-1 md:grid-cols-2 p-6 md:p-8 gap-8 border-b border-gray-100">
                <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Supplier Details</h3>
                    <p class="text-lg font-bold text-gray-900">${bill.supplier_name}</p>
                    ${bill.supplier_gst ? `<p class="text-sm text-gray-500 mt-1"><i class="fas fa-file-invoice mr-1"></i> GST: ${bill.supplier_gst}</p>` : ''}
                    <div class="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase"><i class="fas ${cat.icon} mr-1"></i> ${cat.name}</div>
                </div>
                <div class="md:text-right">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill Summary</h3>
                    <p class="text-sm text-gray-800 mb-1">Bill No: <span class="font-bold text-gray-900">${bill.bill_no}</span></p>
                    <p class="text-sm text-gray-800 mb-1">Date: <span class="font-medium">${formatDate(bill.bill_date)}</span></p>
                    <p class="text-sm text-gray-800 mb-3">FY: <span class="font-medium">${bill.financial_year || '2026-27'}</span></p>
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${bill.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'} uppercase">${bill.status === 'PAID' ? '<i class="fas fa-check-circle mr-1"></i>' : '<i class="fas fa-clock mr-1"></i>'} ${bill.status}</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 p-6 md:p-8 gap-8 bg-gray-50">
                <div class="flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">Attachment</h3>
                        <div class="mt-2">${attachmentHTML}</div>
                    </div>
                    ${bill.notes ? `<div class="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes / Particulars</h3><p class="text-sm text-gray-700 whitespace-pre-wrap">${bill.notes}</p></div>` : ''}
                </div>

                <div class="bg-white p-6 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <h3 class="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-100 pb-2">Amount Details</h3>
                    ${taxHTML}
                    <div class="flex justify-between items-center py-4 mt-2 bg-indigo-50/50 rounded-lg px-3 border border-indigo-100">
                        <span class="text-base font-bold text-indigo-900">Grand Total:</span>
                        <span class="text-xl font-black text-indigo-700">${formatAmt(bill.total_amount)}</span>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <div class="flex justify-between items-center py-1 text-sm"><span class="text-gray-500">Amount Paid:</span><span class="font-bold text-green-600">${formatAmt(bill.paid_amount)}</span></div>
                        <div class="flex justify-between items-center py-1 text-sm mt-1"><span class="text-gray-500">Balance Due:</span><span class="font-bold ${bill.balance_amount > 0 ? 'text-red-600' : 'text-gray-800'}">${formatAmt(bill.balance_amount)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showPurchaseList() {
    const listSec = document.getElementById('purchaseListSection');
    const viewSec = document.getElementById('purchaseViewSection');
    if (listSec) listSec.classList.remove('hidden');
    if (viewSec) viewSec.classList.add('hidden');
}

function viewLegacyAttachment(id) {
    const bill = DB.getPurchases().find(p => p.id === id);
    if (!bill || !bill.attachment) return;
    const w = window.open('');
    if (bill.attachment.includes('application/pdf')) {
        w.document.write(`<iframe src="${bill.attachment}" width="100%" height="100%" style="border:none;"></iframe>`);
    } else {
        w.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f3f4f6;"><img src="${bill.attachment}" style="max-width:90%;max-height:90%;box-shadow:0 10px 25px rgba(0,0,0,0.1);border-radius:8px;"></div>`);
    }
}

// ==============================================================
// EXPORT CSV
// ==============================================================
function exportPurchasesCSV() {
    const purchases = DB.getPurchases() || [];
    if (purchases.length === 0) { showToast('No data to export!', 'warning'); return; }

    const headers = ['Bill No', 'Date', 'Supplier', 'GSTIN', 'Category', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', 'Paid', 'Balance', 'Status', 'FY', 'Drive URL'];
    const rows = purchases.map(p => [
        p.bill_no, p.bill_date, p.supplier_name, p.supplier_gst, p.category,
        p.taxable_amount, p.cgst_amount, p.sgst_amount, p.igst_amount,
        p.total_amount, p.paid_amount, p.balance_amount, p.status, p.financial_year, p.drive_attachment_url || ''
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 CSV Downloaded!', 'success');
}

// ==============================================================
// HELPERS
// ==============================================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

// ==============================================================
// MIGRATION HELPER (Run once in Console to move old base64 → Drive)
// ==============================================================
async function migrateOldBillsToDrive() {
    const all = DB.getPurchases() || [];
    let count = 0;
    for (const bill of all) {
        if (bill.attachment && !bill.drive_attachment_url) {
            console.log(`Migrating ${bill.bill_no}...`);
            try {
                // Convert base64 to Blob
                const res = await fetch(bill.attachment);
                const blob = await res.blob();
                const file = new File([blob], `${bill.bill_no}.jpg`, { type: blob.type });
                const uploadRes = await uploadPurchaseBill(file, bill.id);
                if (uploadRes && uploadRes.url) {
                    bill.drive_attachment_url = uploadRes.url;
                    bill.attachment = ''; // Clear base64 to free space
                    count++;
                }
            } catch (err) {
                console.error('Migration failed for', bill.bill_no, err);
            }
        }
    }
    DB.setPurchases(all);
    alert(`✅ Migrated ${count} bills to Drive. LocalStorage freed!`);
}

// ==============================================================
// AUTO-INIT
// ==============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('purchaseTableBody')) initPurchasesPage();
    });
} else {
    if (document.getElementById('purchaseTableBody')) initPurchasesPage();
}
/* ==============================================================
   MAGIC HTML INJECTOR - FIXES BLANK SCREEN
   ============================================================== */

// DHYAN DEIN: Agar aapke system mein sidebar pe click karne se 'renderPurchases', 
// 'showPurchases' ya koi aur function call hota hai, toh is 'loadPurchases' ka 
// naam badal kar wahi rakh dijiye.
function loadPurchases() {
    
    // Aapke main white area ka ID (Jyada tar 'mainContent' ya 'content' hota hai)
    // Agar aapka ID alag hai, toh 'mainContent' ki jagah wo daal dein.
    const container = document.getElementById('mainContent') || document.querySelector('.content') || document.querySelector('main');
    
    if (container) {
        // Pura HTML Dhancha banakar container me daal rahe hain
        container.innerHTML = `
            <div id="purchaseListSection" class="w-full">
                <div id="purchaseStats"></div>
                <div id="purchaseFilters"></div>
                
                <div class="bg-white rounded-xl shadow overflow-x-auto border border-gray-100 mt-4">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">#</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Bill No</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Supplier</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Category</th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
                                <th class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                                <th class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="purchaseTableBody" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>
                
                <div id="purchasePagination" class="mt-4"></div>
            </div>
            
            <!-- Premium View Section -->
            <div id="purchaseViewSection" class="hidden w-full"></div>
        `;

        // Ab naye code ko bolenge ki is HTML ke andar data bharna shuru karo
        initPurchasesPage();
    } else {
        console.error("Main container nahi mila! Kripya apna container ID check karein.");
    }
}

// Support for other common function names automatically
window.renderPurchases = loadPurchases;
window.showPurchases = loadPurchases;
window.openPurchases = loadPurchases;
