/* =============================================
   REPORTS MODULE
   ============================================= */

let reportTab = 'sales';
let reportFilters = { financial_year: getCurrentFY(), from_date: '', to_date: '' };

function renderReports() {
    const fys = [...new Set(DB.getActiveInvoices().map(i => i.financial_year))].filter(Boolean).sort().reverse();
    if (fys.length === 0) fys.push(getCurrentFY());

    let invoices = DB.getActiveInvoices();

    // Apply filters
    if (reportFilters.financial_year) invoices = invoices.filter(i => i.financial_year === reportFilters.financial_year);
    if (reportFilters.from_date) invoices = invoices.filter(i => i.invoice_date >= reportFilters.from_date);
    if (reportFilters.to_date) invoices = invoices.filter(i => i.invoice_date <= reportFilters.to_date);

    invoices.sort((a,b) => a.invoice_date.localeCompare(b.invoice_date));

    const totalSales = invoices.reduce((s,i) => s + (i.grand_total||0), 0);
    const totalTax = invoices.reduce((s,i) => s + (i.total_tax||0), 0);
    const totalBooking = invoices.reduce((s,i) => s + (i.booking_service_fee||0), 0);
    const totalHotel = invoices.reduce((s,i) => s + (i.hotel_reimbursement||0), 0);

    const container = document.getElementById('page-reports');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Reports</h1>
                <p>FY ${reportFilters.financial_year || 'All'}</p>
            </div>
            <button class="btn btn-primary" onclick="exportReportExcel()">
                <span class="material-icons-round">download</span> Export Excel
            </button>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn ${reportTab==='sales'?'btn-primary':'btn-secondary'}" onclick="reportTab='sales';renderReports()">💰 Sales</button>
            <button class="btn ${reportTab==='gst'?'btn-primary':'btn-secondary'}" onclick="reportTab='gst';renderReports()">📊 GST</button>
        </div>

        <div class="filter-row">
            <select onchange="reportFilters.financial_year=this.value;renderReports()">
                <option value="">All Years</option>
                ${fys.map(f => `<option value="${f}" ${reportFilters.financial_year===f?'selected':''}>FY ${f}</option>`).join('')}
            </select>
            <input type="date" value="${reportFilters.from_date}" onchange="reportFilters.from_date=this.value;renderReports()" placeholder="From">
            <input type="date" value="${reportFilters.to_date}" onchange="reportFilters.to_date=this.value;renderReports()" placeholder="To">
        </div>

        <div class="stats-grid">
            <div class="stat-card"><div class="stat-info"><h3>Invoices</h3><div class="stat-value">${invoices.length}</div></div><div class="stat-icon blue"><span class="material-icons-round">receipt</span></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Total Sales</h3><div class="stat-value">${formatCurrency(totalSales)}</div></div><div class="stat-icon green"><span class="material-icons-round">payments</span></div></div>
            <div class="stat-card"><div class="stat-info"><h3>${reportTab==='gst'?'Taxable':'Booking Fee'}</h3><div class="stat-value">${formatCurrency(reportTab==='gst'?totalBooking:totalBooking)}</div></div><div class="stat-icon purple"><span class="material-icons-round">calculate</span></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Total GST</h3><div class="stat-value">${formatCurrency(totalTax)}</div></div><div class="stat-icon red"><span class="material-icons-round">account_balance</span></div></div>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Date</th>
                            <th>Customer</th>
                            ${reportTab === 'gst' ? '<th class="text-right">Taxable</th><th class="text-right">CGST</th><th class="text-right">SGST</th><th class="text-right">IGST</th>' : ''}
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoices.length === 0 ? `<tr><td colspan="${reportTab==='gst'?8:4}"><div class="empty-state"><p>No data found</p></div></td></tr>` : invoices.map(inv => `
                            <tr>
                                <td style="font-family:monospace;font-size:11px;color:var(--primary)">${inv.invoice_number}</td>
                                <td>${formatDate(inv.invoice_date)}</td>
                                <td>${inv.customer_name}</td>
                                ${reportTab === 'gst' ? `
                                    <td class="text-right">${formatCurrency(inv.taxable_amount)}</td>
                                    <td class="text-right">${formatCurrency(inv.cgst_amount)}</td>
                                    <td class="text-right">${formatCurrency(inv.sgst_amount)}</td>
                                    <td class="text-right">${formatCurrency(inv.igst_amount)}</td>
                                ` : ''}
                                <td class="text-right"><strong>${formatCurrency(inv.grand_total)}</strong></td>
                            </tr>
                        `).join('')}
                        ${invoices.length > 0 ? `
                        <tr style="background:var(--bg);font-weight:700">
                            <td colspan="${reportTab==='gst'?3:3}" class="text-right">TOTAL</td>
                            ${reportTab === 'gst' ? `
                                <td class="text-right">${formatCurrency(totalBooking)}</td>
                                <td class="text-right">${formatCurrency(invoices.reduce((s,i)=>s+(i.cgst_amount||0),0))}</td>
                                <td class="text-right">${formatCurrency(invoices.reduce((s,i)=>s+(i.sgst_amount||0),0))}</td>
                                <td class="text-right">${formatCurrency(invoices.reduce((s,i)=>s+(i.igst_amount||0),0))}</td>
                            ` : ''}
                            <td class="text-right">${formatCurrency(totalSales)}</td>
                        </tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function exportReportExcel() {
    let invoices = DB.getActiveInvoices();
    if (reportFilters.financial_year) invoices = invoices.filter(i => i.financial_year === reportFilters.financial_year);
    if (reportFilters.from_date) invoices = invoices.filter(i => i.invoice_date >= reportFilters.from_date);
    if (reportFilters.to_date) invoices = invoices.filter(i => i.invoice_date <= reportFilters.to_date);

    if (invoices.length === 0) { showToast('No data to export!', 'warning'); return; }

    const data = invoices.map((inv, idx) => ({
        'S.No': idx+1, 'Invoice': inv.invoice_number, 'Date': inv.invoice_date,
        'Customer': inv.customer_name, 'GST No': inv.customer_gst,
        'Booking Fee': inv.booking_service_fee, 'Hotel Reimb': inv.hotel_reimbursement,
        'Taxable': inv.taxable_amount, 'CGST': inv.cgst_amount, 'SGST': inv.sgst_amount,
        'IGST': inv.igst_amount, 'Tax': inv.total_tax, 'Total': inv.grand_total,
        'Status': inv.payment_status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportTab} Report`);
    XLSX.writeFile(wb, `Tripzar_${reportTab}_Report_${getTodayISO()}.xlsx`);
    showToast('Report exported!', 'success');
}