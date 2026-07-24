/* =============================================
   DASHBOARD MODULE
   ============================================= */

function renderDashboard() {
    const invoices = DB.getActiveInvoices();
    const today = getTodayISO();
    const fy = getCurrentFY();

    // Today's stats
    const todayInvoices = invoices.filter(inv => inv.invoice_date === today);
    const todayTotal = todayInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);

    // This month stats
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];
    const monthInvoices = invoices.filter(inv => inv.invoice_date >= monthStart && inv.invoice_date <= monthEnd);
    const monthSales = monthInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const monthBooking = monthInvoices.reduce((s, i) => s + (i.booking_service_fee || 0), 0);
    const monthHotel = monthInvoices.reduce((s, i) => s + (i.hotel_reimbursement || 0), 0);
    const monthGST = monthInvoices.reduce((s, i) => s + (i.total_tax || 0), 0);

    // FY stats
    const fyInvoices = invoices.filter(inv => inv.financial_year === fy);
    const fySales = fyInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);

    const customers = DB.getCustomers();

    // Recent invoices (last 8)
    const recent = [...invoices].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

    // Monthly chart data (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mStart = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        const mEnd = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
        const mInv = invoices.filter(inv => inv.invoice_date >= mStart && inv.invoice_date <= mEnd);
        const mTotal = mInv.reduce((s, inv) => s + (inv.grand_total || 0), 0);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        chartData.push({
            label: monthNames[d.getMonth()],
            value: mTotal
        });
    }

    const maxChart = Math.max(...chartData.map(d => d.value), 1);

    const container = document.getElementById('page-dashboard');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Dashboard</h1>
                <p>FY ${fy} Overview</p>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('newInvoice')">
                <span class="material-icons-round">add</span> New Invoice
            </button>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Today's Invoices</h3>
                    <div class="stat-value">${todayInvoices.length}</div>
                    <div class="stat-sub">${formatCurrency(todayTotal)}</div>
                </div>
                <div class="stat-icon blue"><span class="material-icons-round">receipt</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Monthly Sales</h3>
                    <div class="stat-value">${formatCurrency(monthSales)}</div>
                    <div class="stat-sub">${monthInvoices.length} invoices</div>
                </div>
                <div class="stat-icon green"><span class="material-icons-round">trending_up</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Booking Fee</h3>
                    <div class="stat-value">${formatCurrency(monthBooking)}</div>
                    <div class="stat-sub">This month</div>
                </div>
                <div class="stat-icon purple"><span class="material-icons-round">confirmation_number</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Hotel Reimb.</h3>
                    <div class="stat-value">${formatCurrency(monthHotel)}</div>
                    <div class="stat-sub">This month</div>
                </div>
                <div class="stat-icon orange"><span class="material-icons-round">hotel</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>GST Collected</h3>
                    <div class="stat-value">${formatCurrency(monthGST)}</div>
                    <div class="stat-sub">This month</div>
                </div>
                <div class="stat-icon red"><span class="material-icons-round">account_balance</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Customers</h3>
                    <div class="stat-value">${customers.length}</div>
                    <div class="stat-sub">Total</div>
                </div>
                <div class="stat-icon teal"><span class="material-icons-round">people</span></div>
            </div>
        </div>

        <div class="grid-2">
            <!-- Chart -->
            <div class="card">
                <div class="card-header">Monthly Sales (Last 6 Months)</div>
                <div class="chart-container">
                    ${chartData.map(d => `
                        <div class="chart-bar-wrapper">
                            <div class="chart-value">${d.value > 0 ? '₹'+(d.value/1000).toFixed(0)+'K' : ''}</div>
                            <div class="chart-bar" style="height: ${Math.max((d.value/maxChart)*200, 4)}px"></div>
                            <div class="chart-label">${d.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Invoices -->
            <div class="card">
                <div class="card-header">
                    Recent Invoices
                    <button class="btn btn-sm btn-secondary" onclick="navigateTo('invoices')">View All</button>
                </div>
                <div class="recent-list">
                    ${recent.length === 0 ? `
                        <div class="empty-state" style="padding:30px">
                            <span class="material-icons-round">receipt_long</span>
                            <p>No invoices yet</p>
                        </div>
                    ` : recent.map(inv => `
                        <div class="recent-item" onclick="viewInvoice('${inv.id}')">
                            <div class="recent-item-left">
                                <h4>${inv.invoice_number}</h4>
                                <p>${inv.customer_name} • ${formatDate(inv.invoice_date)}</p>
                            </div>
                            <div class="recent-item-right">
                                <div class="amount">${formatCurrency(inv.grand_total)}</div>
                                <span class="badge ${inv.payment_status === 'paid' ? 'badge-success' : inv.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}">${inv.payment_status}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Yearly Summary -->
        <div class="card" style="margin-top:20px">
            <div class="card-header">Yearly Summary — FY ${fy}</div>
            <div class="card-body">
                <div class="stats-grid" style="margin-bottom:0">
                    <div class="stat-card">
                        <div class="stat-info" style="width:100%;text-align:center">
                            <div class="stat-value">${fyInvoices.length}</div>
                            <div class="stat-sub">Total Invoices</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info" style="width:100%;text-align:center">
                            <div class="stat-value" style="color:var(--primary)">${formatCurrency(fySales)}</div>
                            <div class="stat-sub">Total Sales</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info" style="width:100%;text-align:center">
                            <div class="stat-value" style="color:var(--danger)">${formatCurrency(fyInvoices.reduce((s,i) => s + (i.total_tax||0), 0))}</div>
                            <div class="stat-sub">GST Collected</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}