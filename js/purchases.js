// ============================================================================
// purchases.js - TRIPZAR HOLIDAYS Purchase & Expense Management System
// Complete Business Logic, GST Calculations, Drive Attachments & Reporting
// ============================================================================

// 1. Comprehensive Categories for TRIPZAR Travel Agency & Office Ops
const PURCHASE_CATEGORIES = [
    "Flight",
    "Train",
    "Bus",
    "Transport / Cab",
    "Hotel / Accommodation",
    "Cruise / Ferry",
    "Tour Package",
    "Activities & Sightseeing",
    "Visa / Passport",
    "Insurance",
    "Forex",
    "Driver / Tour Guide",
    "MICE & Events",
    "Office Rent",
    "Salary & Incentives",
    "Marketing & Ads",
    "Software & IT Services",
    "Utilities & Internet",
    "Legal & Professional Fees",
    "Bank & Gateway Charges",
    "Office Expenses & Pantry",
    "Repair & Maintenance",
    "Miscellaneous"
];

// Module Global State Variables
let purchases = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize Module on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initPurchases();
});

function initPurchases() {
    loadPurchasesData();
    populateCategoryDropdowns();
    populateSupplierDropdown();
    setupEventListeners();
    renderPurchasesTable();
    updateSummaryCards();
}

// 2. Populate Dynamic Category Options across UI
function populateCategoryDropdowns() {
    const categorySelects = document.querySelectorAll('#purchaseCategory, select[name="category"], #categoryFilter, .purchase-category-select');
    
    categorySelects.forEach(select => {
        if (!select) return;
        const isFilter = select.id === 'categoryFilter' || select.classList.contains('filter-select');
        const currentValue = select.value;
        
        select.innerHTML = isFilter ? '<option value="">All Categories</option>' : '<option value="">Select Category</option>';
        
        PURCHASE_CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });

        if (currentValue && PURCHASE_CATEGORIES.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

// 3. Populate Unique Supplier Filter List dynamically from recorded bills
function populateSupplierDropdown() {
    const supplierFilter = document.getElementById('supplierFilter');
    if (!supplierFilter) return;

    const currentSelected = supplierFilter.value;
    const suppliers = [...new Set(purchases.map(p => p.supplierName).filter(Boolean))].sort();

    supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
    suppliers.forEach(sup => {
        const option = document.createElement('option');
        option.value = sup;
        option.textContent = sup;
        supplierFilter.appendChild(option);
    });

    if (currentSelected) supplierFilter.value = currentSelected;
}

// 4. Load & Save Data (LocalStorage + Cloud Backup)
function loadPurchasesData() {
    try {
        const localData = localStorage.getItem('tripzar_purchases');
        purchases = localData ? JSON.parse(localData) : [];
    } catch (e) {
        console.error("Error reading tripzar_purchases from LocalStorage:", e);
        purchases = [];
    }
}

function savePurchasesData() {
    try {
        localStorage.setItem('tripzar_purchases', JSON.stringify(purchases));
        
        // Sync with Firestore Cloud Backup if global sync function exists
        if (typeof syncPurchasesToCloud === 'function') {
            syncPurchasesToCloud(purchases);
        }
        
        // Refresh supplier filter list
        populateSupplierDropdown();
    } catch (e) {
        console.error("Storage error while saving purchase:", e);
        alert("LocalStorage Save Failed: " + e.message);
    }
}

// 5. Setup Event Listeners
function setupEventListeners() {
    const form = document.getElementById('purchaseForm');
    if (form) {
        form.removeEventListener('submit', handlePurchaseSubmit);
        form.addEventListener('submit', handlePurchaseSubmit);
    }

    // Auto GST Calculations Listeners
    const amountInput = document.getElementById('taxableAmount');
    const gstRateInput = document.getElementById('gstRate');
    const gstTypeInput = document.getElementById('gstType');

    if (amountInput) amountInput.addEventListener('input', calculateGst);
    if (gstRateInput) gstRateInput.addEventListener('change', calculateGst);
    if (gstTypeInput) gstTypeInput.addEventListener('change', calculateGst);

    // Filters & Search Listeners
    const searchInput = document.getElementById('searchPurchase');
    const categoryFilter = document.getElementById('categoryFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');

    const triggerFilter = () => { currentPage = 1; renderPurchasesTable(); };

    if (searchInput) searchInput.addEventListener('input', triggerFilter);
    if (categoryFilter) categoryFilter.addEventListener('change', triggerFilter);
    if (supplierFilter) supplierFilter.addEventListener('change', triggerFilter);
    if (startDateFilter) startDateFilter.addEventListener('change', triggerFilter);
    if (endDateFilter) endDateFilter.addEventListener('change', triggerFilter);

    // Reset Filter Button if available
    const resetBtn = document.getElementById('resetPurchaseFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (supplierFilter) supplierFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            currentPage = 1;
            renderPurchasesTable();
        });
    }
}

// 6. Calculate GST (CGST, SGST, IGST & Grand Total)
function calculateGst() {
    const amount = parseFloat(document.getElementById('taxableAmount')?.value || 0);
    const rate = parseFloat(document.getElementById('gstRate')?.value || 0);
    const type = document.getElementById('gstType')?.value || 'INTRA';

    const totalGst = (amount * rate) / 100;
    let cgst = 0, sgst = 0, igst = 0;

    if (type === 'INTRA') {
        cgst = totalGst / 2;
        sgst = totalGst / 2;
    } else {
        igst = totalGst;
    }

    const grandTotal = amount + totalGst;

    if (document.getElementById('cgstAmount')) document.getElementById('cgstAmount').value = cgst.toFixed(2);
    if (document.getElementById('sgstAmount')) document.getElementById('sgstAmount').value = sgst.toFixed(2);
    if (document.getElementById('igstAmount')) document.getElementById('igstAmount').value = igst.toFixed(2);
    if (document.getElementById('totalAmount')) document.getElementById('totalAmount').value = grandTotal.toFixed(2);
}

// 7. Handle Form Submit (Add / Edit + Google Drive Upload)
async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('savePurchaseBtn') || e.target.querySelector('button[type="submit"]');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Save Purchase';
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading Attachment to Drive...';
    }

    try {
        const idInput = document.getElementById('purchaseId');
        const purchaseId = idInput && idInput.value ? idInput.value : 'PUR-' + Date.now();
        
        const fileInput = document.getElementById('billAttachment');
        let driveAttachmentUrl = '';
        let attachmentName = '';

        // Google Drive Upload Logic
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            attachmentName = file.name;
            
            if (typeof uploadPurchaseBill === 'function') {
                driveAttachmentUrl = await uploadPurchaseBill(file, purchaseId);
            } else {
                throw new Error("drive.js module missing or uploadPurchaseBill function is undefined.");
            }
        }

        const existingIndex = purchases.findIndex(p => p.id === purchaseId);
        const existingPurchase = existingIndex >= 0 ? purchases[existingIndex] : null;

        const purchaseData = {
            id: purchaseId,
            billNo: document.getElementById('billNumber')?.value.trim() || '',
            billDate: document.getElementById('billDate')?.value || new Date().toISOString().split('T')[0],
            supplierName: document.getElementById('supplierName')?.value.trim() || '',
            supplierGst: document.getElementById('supplierGst')?.value.trim() || '',
            category: document.getElementById('purchaseCategory')?.value || 'Miscellaneous',
            description: document.getElementById('purchaseDescription')?.value.trim() || '',
            linkedSaleInvoice: document.getElementById('linkedSaleInvoice')?.value.trim() || '',
            taxableAmount: parseFloat(document.getElementById('taxableAmount')?.value || 0),
            gstRate: parseFloat(document.getElementById('gstRate')?.value || 0),
            gstType: document.getElementById('gstType')?.value || 'INTRA',
            cgst: parseFloat(document.getElementById('cgstAmount')?.value || 0),
            sgst: parseFloat(document.getElementById('sgstAmount')?.value || 0),
            igst: parseFloat(document.getElementById('igstAmount')?.value || 0),
            totalAmount: parseFloat(document.getElementById('totalAmount')?.value || 0),
            
            // Retain existing drive link if no new file uploaded
            drive_attachment_url: driveAttachmentUrl || (existingPurchase ? existingPurchase.drive_attachment_url : ''),
            attachment_name: attachmentName || (existingPurchase ? existingPurchase.attachment_name : ''),
            
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            purchases[existingIndex] = purchaseData;
        } else {
            purchaseData.createdAt = new Date().toISOString();
            purchases.unshift(purchaseData);
        }

        savePurchasesData();
        renderPurchasesTable();
        updateSummaryCards();
        closePurchaseModal();
        
        alert("Purchase Bill recorded and synced successfully!");
    } catch (err) {
        console.error("Failed to save purchase:", err);
        alert("Save Failed: " + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    }
}

// 8. Render Table with Filtering, Search & Pagination
function renderPurchasesTable() {
    const tbody = document.getElementById('purchasesTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('searchPurchase')?.value || '').toLowerCase().trim();
    const catFilter = document.getElementById('categoryFilter')?.value || '';
    const suppFilter = document.getElementById('supplierFilter')?.value || '';
    const startDate = document.getElementById('startDateFilter')?.value || '';
    const endDate = document.getElementById('endDateFilter')?.value || '';

    // Filter Logic
    const filtered = purchases.filter(p => {
        const matchSearch = !searchTerm || 
            p.billNo.toLowerCase().includes(searchTerm) || 
            p.supplierName.toLowerCase().includes(searchTerm) || 
            (p.description && p.description.toLowerCase().includes(searchTerm)) ||
            (p.linkedSaleInvoice && p.linkedSaleInvoice.toLowerCase().includes(searchTerm));
            
        const matchCat = !catFilter || p.category === catFilter;
        const matchSupp = !suppFilter || p.supplierName === suppFilter;
        
        let matchDate = true;
        if (startDate && p.billDate < startDate) matchDate = false;
        if (endDate && p.billDate > endDate) matchDate = false;

        return matchSearch && matchCat && matchSupp && matchDate;
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-2 d-block"></i>No purchase entries matching criteria.</td></tr>`;
        renderPaginationControls(0);
        return;
    }

    // Pagination Calculation
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    paginated.forEach(p => {
        const tr = document.createElement('tr');
        
        let attachmentHtml = '<span class="text-muted">-</span>';
        if (p.drive_attachment_url) {
            attachmentHtml = `<a href="${p.drive_attachment_url}" target="_blank" class="btn btn-xs btn-outline-primary" title="View File on Google Drive"><i class="fab fa-google-drive"></i> View Bill</a>`;
        } else if (p.attachment_base64) {
            attachmentHtml = `<a href="${p.attachment_base64}" target="_blank" class="btn btn-xs btn-outline-secondary" title="View Local Attachment"><i class="fas fa-paperclip"></i> View</a>`;
        }

        const totalGST = (p.cgst||0) + (p.sgst||0) + (p.igst||0);

        tr.innerHTML = `
            <td>
                <strong>${escapeHtml(p.billNo)}</strong>
                <br><small class="text-muted">${p.billDate}</small>
            </td>
            <td>
                <strong>${escapeHtml(p.supplierName)}</strong>
                ${p.supplierGst ? `<br><small class="text-muted">GST: ${escapeHtml(p.supplierGst)}</small>` : ''}
            </td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(p.category)}</span></td>
            <td>
                ${escapeHtml(p.description || '-')}
                ${p.linkedSaleInvoice ? `<br><small class="text-info"><i class="fas fa-link"></i> Sale: ${escapeHtml(p.linkedSaleInvoice)}</small>` : ''}
            </td>
            <td class="text-end">₹${(p.taxableAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="text-end">₹${totalGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="text-end text-success"><strong>₹${(p.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            <td class="text-center">
                ${attachmentHtml}
                <button onclick="editPurchase('${p.id}')" class="btn btn-xs btn-outline-info ms-1" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="deletePurchase('${p.id}')" class="btn btn-xs btn-outline-danger ms-1" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginationControls(filtered.length);
}

// 9. Render Pagination Controls
function renderPaginationControls(totalItems) {
    const container = document.getElementById('purchasesPagination');
    if (!container) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<ul class="pagination pagination-sm justify-content-end m-0">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePurchasePage(${currentPage - 1}); return false;">Prev</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePurchasePage(${i}); return false;">${i}</a></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePurchasePage(${currentPage + 1}); return false;">Next</a></li>`;
    html += `</ul>`;

    container.innerHTML = html;
}

function changePurchasePage(page) {
    currentPage = page;
    renderPurchasesTable();
}

// 10. Summary Calculation (Top Stats Cards)
function updateSummaryCards() {
    let totalPurchases = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    purchases.forEach(p => {
        totalPurchases += (p.totalAmount || 0);
        totalTaxable += (p.taxableAmount || 0);
        totalGst += ((p.cgst || 0) + (p.sgst || 0) + (p.igst || 0));
    });

    if (document.getElementById('statTotalPurchases')) {
        document.getElementById('statTotalPurchases').textContent = `₹${totalPurchases.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('statTotalTaxable')) {
        document.getElementById('statTotalTaxable').textContent = `₹${totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('statTotalGst')) {
        document.getElementById('statTotalGst').textContent = `₹${totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('statCountBills')) {
        document.getElementById('statCountBills').textContent = purchases.length;
    }
}

// 11. Edit Record Entry
function editPurchase(id) {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    if (document.getElementById('purchaseId')) document.getElementById('purchaseId').value = purchase.id;
    if (document.getElementById('billNumber')) document.getElementById('billNumber').value = purchase.billNo;
    if (document.getElementById('billDate')) document.getElementById('billDate').value = purchase.billDate;
    if (document.getElementById('supplierName')) document.getElementById('supplierName').value = purchase.supplierName;
    if (document.getElementById('supplierGst')) document.getElementById('supplierGst').value = purchase.supplierGst || '';
    if (document.getElementById('purchaseCategory')) document.getElementById('purchaseCategory').value = purchase.category;
    if (document.getElementById('purchaseDescription')) document.getElementById('purchaseDescription').value = purchase.description || '';
    if (document.getElementById('linkedSaleInvoice')) document.getElementById('linkedSaleInvoice').value = purchase.linkedSaleInvoice || '';
    if (document.getElementById('taxableAmount')) document.getElementById('taxableAmount').value = purchase.taxableAmount;
    if (document.getElementById('gstRate')) document.getElementById('gstRate').value = purchase.gstRate;
    if (document.getElementById('gstType')) document.getElementById('gstType').value = purchase.gstType;

    calculateGst();

    const modalEl = document.getElementById('purchaseModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 12. Delete Record Entry
function deletePurchase(id) {
    if (!confirm("Are you sure you want to delete this purchase bill record? This action cannot be undone.")) return;

    purchases = purchases.filter(p => p.id !== id);
    savePurchasesData();
    renderPurchasesTable();
    updateSummaryCards();
}

// 13. Export Purchases to CSV
function exportPurchasesCSV() {
    if (purchases.length === 0) {
        alert("No purchase records available to export.");
        return;
    }

    let csv = "Bill No,Bill Date,Supplier,Supplier GST,Category,Description,Taxable Amount,CGST,SGST,IGST,Total Amount,Drive Link\n";

    purchases.forEach(p => {
        const row = [
            `"${p.billNo}"`,
            `"${p.billDate}"`,
            `"${p.supplierName.replace(/"/g, '""')}"`,
            `"${p.supplierGst || ''}"`,
            `"${p.category}"`,
            `"${(p.description || '').replace(/"/g, '""')}"`,
            p.taxableAmount || 0,
            p.cgst || 0,
            p.sgst || 0,
            p.igst || 0,
            p.totalAmount || 0,
            `"${p.drive_attachment_url || ''}"`
        ];
        csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TRIPZAR_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper Utilities
function closePurchaseModal() {
    const modalEl = document.getElementById('purchaseModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
    const form = document.getElementById('purchaseForm');
    if (form) {
        form.reset();
        const idInput = document.getElementById('purchaseId');
        if (idInput) idInput.value = '';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
