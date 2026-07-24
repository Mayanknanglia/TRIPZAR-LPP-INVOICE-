/* =============================================
   GST REPORTS v1.0 - CA-Ready Exports
   GSTR-1, GSTR-2, HSN Summary, P&L
   ============================================= */

const GSTReports = {
    
    currentFilter: {
        from_date: '',
        to_date: '',
        financial_year: '',
        report_type: 'monthly'
    },

    // ============================================
    // Get Financial Year Range
    // ============================================
    getFYDates(fy) {
        // fy = "2026-27"
        const [start, end] = fy.split('-');
        return {
            from: `${start}-04-01`,
            to: `20${end}-03-31`
        };
    },

    // ============================================
    // Get Month Range
    // ============================================
    getMonthDates(year, month) {
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        return { from, to };
    },

    // ============================================
    // Filter Data by Date Range
    // ============================================
    filterInvoicesByDate(invoices, fromDate, toDate) {
        return invoices.filter(inv => {
            const d = inv.invoice_date;
            return d >= fromDate && d <= toDate;
        });
    },

    filterPurchasesByDate(purchases, fromDate, toDate) {
        return purchases.filter(p => {
            const d = p.bill_date;
            return d >= fromDate && d <= toDate;
        });
    },

    // ============================================
    // Calculate Summary
    // ============================================
    calculateSummary(invoices, purchases) {
        const salesData = {
            totalInvoices: invoices.length,
            totalTaxable: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0,
            totalGST: 0,
            totalGrand: 0,
            b2bCount: 0,
            b2cCount: 0,
            b2bAmount: 0,
            b2cAmount: 0
        };

        invoices.forEach(inv => {
            salesData.totalTaxable += inv.taxable_amount || 0;
            salesData.totalCGST += inv.cgst_amount || 0;
            salesData.totalSGST += inv.sgst_amount || 0;
            salesData.totalIGST += inv.igst_amount || 0;
            salesData.totalGST += inv.total_tax || 0;
            salesData.totalGrand += inv.grand_total || 0;

            if (inv.customer_gst && inv.customer_gst.length >= 15) {
                salesData.b2bCount++;
                salesData.b2bAmount += inv.grand_total || 0;
            } else {
                salesData.b2cCount++;
                salesData.b2cAmount += inv.grand_total || 0;
            }
        });

        const purchaseData = {
            totalBills: purchases.length,
            totalBase: 0,
            totalGST: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0
        };

        purchases.forEach(p => {
            purchaseData.totalBase += p.base_amount || 0;
            purchaseData.totalGST += p.gst_amount || 0;
            purchaseData.totalAmount += p.total_amount || 0;
            purchaseData.totalPaid += p.paid_amount || 0;
        });
        purchaseData.totalPending = purchaseData.totalAmount - purchaseData.totalPaid;

        return {
            sales: salesData,
            purchase: purchaseData,
            netGSTPayable: salesData.totalGST - purchaseData.totalGST,
            grossProfit: salesData.totalGrand - purchaseData.totalAmount,
            profitMargin: salesData.totalGrand > 0 ? ((salesData.totalGrand - purchaseData.totalAmount) / salesData.totalGrand * 100).toFixed(2) : 0
        };
    },

    // ============================================
    // MAIN RENDER
    // ============================================
    render() {
        const container = document.getElementById('page-gstReports');
        if (!container) {
            console.error('page-gstReports not found');
            return;
        }

        const today = new Date();
        const currentFY = getCurrentFY();
        const fyDates = this.getFYDates(currentFY);
        
        // Default: Current FY
        if (!this.currentFilter.from_date) {
            this.currentFilter.from_date = fyDates.from;
            this.currentFilter.to_date = fyDates.to;
            this.currentFilter.financial_year = currentFY;
        }

        const allInvoices = DB.getActiveInvoices();
        const allPurchases = DB.getActivePurchases();
        const fys = [...new Set(allInvoices.map(i => i.financial_year))].filter(Boolean).sort().reverse();

        const filteredInvoices = this.filterInvoicesByDate(allInvoices, this.currentFilter.from_date, this.currentFilter.to_date);
        const filteredPurchases = this.filterPurchasesByDate(allPurchases, this.currentFilter.from_date, this.currentFilter.to_date);
        const summary = this.calculateSummary(filteredInvoices, filteredPurchases);

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-title">
                    <h1>📊 GST Reports</h1>
                    <p>CA-Ready Tax Reports & Exports</p>
                </div>
            </div>

            <!-- FILTER PANEL -->
            <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--primary)">
                <div class="section-heading" style="margin-top:0">
                    <span class="material-icons-round">filter_alt</span> Date Range Filter
                </div>
                
                <!-- Quick Filters -->
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:15px">
                    <button class="btn btn-sm btn-secondary" onclick="GSTReports.setFilter('this_month')">This Month</button>
                    <button class="btn btn-sm btn-secondary" onclick="GSTReports.setFilter('last_month')">Last Month</button>
                    <button class="btn btn-sm btn-secondary" onclick="GSTReports.setFilter('this_quarter')">This Quarter</button>
                    <button class="btn btn-sm btn-secondary" onclick="GSTReports.setFilter('last_quarter')">Last Quarter</button>
                    <button class="btn btn-sm btn-primary" onclick="GSTReports.setFilter('this_fy')">Current FY (${currentFY})</button>
                    ${fys.filter(f => f !== currentFY).map(f => `
                        <button class="btn btn-sm btn-secondary" onclick="GSTReports.setFilter('fy','${f}')">FY ${f}</button>
                    `).join('')}
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>From Date</label>
                        <input type="date" id="gstFromDate" value="${this.currentFilter.from_date}" onchange="GSTReports.applyCustomDates()">
                    </div>
                    <div class="form-group">
                        <label>To Date</label>
                        <input type="date" id="gstToDate" value="${this.currentFilter.to_date}" onchange="GSTReports.applyCustomDates()">
                    </div>
                    <div class="form-group" style="display:flex;align-items:flex-end">
                        <button class="btn btn-primary" onclick="GSTReports.applyCustomDates()" style="width:100%">
                            <span class="material-icons-round">refresh</span> Apply
                        </button>
                    </div>
                </div>

                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;font-size:13px;color:var(--text-secondary);margin-top:10px">
                    📅 Showing data from <strong>${formatDate(this.currentFilter.from_date)}</strong> to <strong>${formatDate(this.currentFilter.to_date)}</strong>
                </div>
            </div>

            <!-- SUMMARY CARDS -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px">
                
                <!-- Sales -->
                <div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);padding:16px;border-radius:12px;border-left:4px solid #4caf50">
                    <div style="font-size:11px;color:#2e7d32;font-weight:700;text-transform:uppercase;letter-spacing:1px">💰 SALES (Outward)</div>
                    <div style="font-size:24px;font-weight:800;color:#1b5e20;margin-top:6px">${formatCurrency(summary.sales.totalGrand)}</div>
                    <div style="font-size:11px;color:#388e3c;margin-top:4px">${summary.sales.totalInvoices} invoices • ${summary.sales.b2bCount} B2B • ${summary.sales.b2cCount} B2C</div>
                </div>

                <!-- Purchase -->
                <div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);padding:16px;border-radius:12px;border-left:4px solid #ff9800">
                    <div style="font-size:11px;color:#e65100;font-weight:700;text-transform:uppercase;letter-spacing:1px">🛒 PURCHASE (Inward)</div>
                    <div style="font-size:24px;font-weight:800;color:#bf360c;margin-top:6px">${formatCurrency(summary.purchase.totalAmount)}</div>
                    <div style="font-size:11px;color:#f57c00;margin-top:4px">${summary.purchase.totalBills} bills</div>
                </div>

                <!-- Output GST -->
                <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);padding:16px;border-radius:12px;border-left:4px solid #2196f3">
                    <div style="font-size:11px;color:#1565c0;font-weight:700;text-transform:uppercase;letter-spacing:1px">📤 OUTPUT GST</div>
                    <div style="font-size:24px;font-weight:800;color:#0d47a1;margin-top:6px">${formatCurrency(summary.sales.totalGST)}</div>
                    <div style="font-size:11px;color:#1976d2;margin-top:4px">Collected from customers</div>
                </div>

                <!-- Input GST -->
                <div style="background:linear-gradient(135deg,#f3e5f5,#e1bee7);padding:16px;border-radius:12px;border-left:4px solid #9c27b0">
                    <div style="font-size:11px;color:#6a1b9a;font-weight:700;text-transform:uppercase;letter-spacing:1px">📥 INPUT GST (ITC)</div>
                    <div style="font-size:24px;font-weight:800;color:#4a148c;margin-top:6px">${formatCurrency(summary.purchase.totalGST)}</div>
                    <div style="font-size:11px;color:#7b1fa2;margin-top:4px">Paid to suppliers</div>
                </div>

                <!-- Net GST Payable -->
                <div style="background:linear-gradient(135deg,${summary.netGSTPayable > 0 ? '#ffebee,#ffcdd2' : '#e8f5e9,#c8e6c9'});padding:16px;border-radius:12px;border-left:4px solid ${summary.netGSTPayable > 0 ? '#f44336' : '#4caf50'}">
                    <div style="font-size:11px;color:${summary.netGSTPayable > 0 ? '#c62828' : '#2e7d32'};font-weight:700;text-transform:uppercase;letter-spacing:1px">${summary.netGSTPayable > 0 ? '💸' : '✅'} NET GST ${summary.netGSTPayable > 0 ? 'PAYABLE' : 'REFUNDABLE'}</div>
                    <div style="font-size:24px;font-weight:800;color:${summary.netGSTPayable > 0 ? '#b71c1c' : '#1b5e20'};margin-top:6px">${formatCurrency(Math.abs(summary.netGSTPayable))}</div>
                    <div style="font-size:11px;color:${summary.netGSTPayable > 0 ? '#d32f2f' : '#388e3c'};margin-top:4px">Output - Input</div>
                </div>

                <!-- Gross Profit -->
                <div style="background:linear-gradient(135deg,#fff9c4,#fff59d);padding:16px;border-radius:12px;border-left:4px solid #fbc02d">
                    <div style="font-size:11px;color:#f57f17;font-weight:700;text-transform:uppercase;letter-spacing:1px">📈 GROSS PROFIT</div>
                    <div style="font-size:24px;font-weight:800;color:${summary.grossProfit >= 0 ? '#33691e' : '#c62828'};margin-top:6px">${formatCurrency(summary.grossProfit)}</div>
                    <div style="font-size:11px;color:#f57c00;margin-top:4px">Margin: ${summary.profitMargin}%</div>
                </div>
            </div>

            <!-- GST BREAKDOWN -->
            <div class="card card-body" style="margin-bottom:16px">
                <div class="section-heading" style="margin-top:0">
                    <span class="material-icons-round">receipt_long</span> GST Breakdown
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                    <div>
                        <h4 style="color:#2e7d32;margin:0 0 10px 0;font-size:13px">📤 OUTPUT GST (Sales)</h4>
                        <div class="calc-box">
                            <div class="calc-row"><span class="calc-label">Taxable Value:</span><span class="calc-value">${formatCurrency(summary.sales.totalTaxable)}</span></div>
                            <div class="calc-row"><span class="calc-label">CGST:</span><span class="calc-value">${formatCurrency(summary.sales.totalCGST)}</span></div>
                            <div class="calc-row"><span class="calc-label">SGST:</span><span class="calc-value">${formatCurrency(summary.sales.totalSGST)}</span></div>
                            <div class="calc-row"><span class="calc-label">IGST:</span><span class="calc-value">${formatCurrency(summary.sales.totalIGST)}</span></div>
                            <div class="calc-row total"><span class="calc-label">Total Output GST:</span><span class="calc-value" style="color:#2e7d32">${formatCurrency(summary.sales.totalGST)}</span></div>
                        </div>
                    </div>
                    <div>
                        <h4 style="color:#6a1b9a;margin:0 0 10px 0;font-size:13px">📥 INPUT GST (Purchases)</h4>
                        <div class="calc-box">
                            <div class="calc-row"><span class="calc-label">Purchase Base:</span><span class="calc-value">${formatCurrency(summary.purchase.totalBase)}</span></div>
                            <div class="calc-row"><span class="calc-label">Input GST:</span><span class="calc-value">${formatCurrency(summary.purchase.totalGST)}</span></div>
                            <div class="calc-row total"><span class="calc-label">Total Input Credit:</span><span class="calc-value" style="color:#6a1b9a">${formatCurrency(summary.purchase.totalGST)}</span></div>
                        </div>
                    </div>
                </div>

                <div style="background:${summary.netGSTPayable > 0 ? '#ffebee' : '#e8f5e9'};padding:15px;border-radius:8px;margin-top:15px;text-align:center;border:2px solid ${summary.netGSTPayable > 0 ? '#f44336' : '#4caf50'}">
                    <div style="font-size:13px;color:${summary.netGSTPayable > 0 ? '#c62828' : '#2e7d32'};font-weight:600">
                        ${summary.netGSTPayable > 0 ? '💸 GST Payable to Government' : '✅ GST Refund from Government'}
                    </div>
                    <div style="font-size:28px;font-weight:800;color:${summary.netGSTPayable > 0 ? '#b71c1c' : '#1b5e20'};margin-top:4px">
                        ${formatCurrency(Math.abs(summary.netGSTPayable))}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                        Output GST (${formatCurrency(summary.sales.totalGST)}) - Input GST (${formatCurrency(summary.purchase.totalGST)})
                    </div>
                </div>
            </div>

            <!-- EXPORT BUTTONS -->
            <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--success)">
                <div class="section-heading" style="margin-top:0;color:var(--success)">
                    <span class="material-icons-round">download</span> Export Reports (CA Ready)
                </div>
                
                <div style="background:#e8f5e9;padding:12px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#2e7d32">
                    📌 <strong>Pro Tip:</strong> Download "Comprehensive Report" for CA — includes all sheets in one Excel file
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
                    <button class="btn btn-primary" onclick="GSTReports.exportComprehensive()" style="background:linear-gradient(135deg,#1a5632,#2d8a4e);padding:14px">
                        <span class="material-icons-round">description</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">Comprehensive Report</div>
                            <div style="font-size:10px;opacity:0.9">All-in-one for CA</div>
                        </div>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="GSTReports.exportGSTR1()" style="padding:14px">
                        <span class="material-icons-round">file_download</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">GSTR-1 (Sales)</div>
                            <div style="font-size:10px;opacity:0.7">B2B + B2C</div>
                        </div>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="GSTReports.exportGSTR2()" style="padding:14px">
                        <span class="material-icons-round">shopping_cart</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">GSTR-2 (Purchases)</div>
                            <div style="font-size:10px;opacity:0.7">Input Tax Credit</div>
                        </div>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="GSTReports.exportHSNSummary()" style="padding:14px">
                        <span class="material-icons-round">category</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">HSN Summary</div>
                            <div style="font-size:10px;opacity:0.7">Item-wise report</div>
                        </div>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="GSTReports.exportPL()" style="padding:14px">
                        <span class="material-icons-round">trending_up</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">P&L Statement</div>
                            <div style="font-size:10px;opacity:0.7">Profit & Loss</div>
                        </div>
                    </button>

                    <button class="btn btn-secondary" onclick="GSTReports.exportLedgers()" style="padding:14px">
                        <span class="material-icons-round">account_balance_wallet</span>
                        <div style="text-align:left;flex:1;margin-left:8px">
                            <div style="font-weight:700">Ledgers</div>
                            <div style="font-size:10px;opacity:0.7">Customer + Supplier</div>
                        </div>
                    </button>
                </div>
            </div>

            <!-- PREVIEW TABS -->
            <div class="card card-body">
                <div class="section-heading" style="margin-top:0">
                    <span class="material-icons-round">preview</span> Data Preview
                </div>
                
                <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;border-bottom:2px solid var(--border);padding-bottom:8px">
                    <button class="tab-btn active" onclick="GSTReports.showTab('sales', this)" style="padding:8px 14px;border:none;background:var(--primary);color:white;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Sales (${filteredInvoices.length})</button>
                    <button class="tab-btn" onclick="GSTReports.showTab('purchase', this)" style="padding:8px 14px;border:none;background:var(--bg);color:var(--text);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Purchase (${filteredPurchases.length})</button>
                    <button class="tab-btn" onclick="GSTReports.showTab('hsn', this)" style="padding:8px 14px;border:none;background:var(--bg);color:var(--text);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">HSN Summary</button>
                </div>

                <div id="gstPreviewContent" style="overflow-x:auto"></div>
            </div>
        `;

        this.showTab('sales', document.querySelector('.tab-btn'));
    },

    // ============================================
    // TAB SWITCHING
    // ============================================
    showTab(tab, btn) {
        // Update tab styles
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.style.background = 'var(--bg)';
            b.style.color = 'var(--text)';
        });
        if (btn) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        }

        const container = document.getElementById('gstPreviewContent');
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);

        if (tab === 'sales') {
            container.innerHTML = this.renderSalesTable(invoices);
        } else if (tab === 'purchase') {
            container.innerHTML = this.renderPurchaseTable(purchases);
        } else if (tab === 'hsn') {
            container.innerHTML = this.renderHSNTable(invoices, purchases);
        }
    },

    renderSalesTable(invoices) {
        if (invoices.length === 0) return '<p style="text-align:center;padding:20px;color:var(--text-muted)">No sales in this period</p>';
        
        return `
            <table style="width:100%;font-size:12px">
                <thead style="background:var(--bg)">
                    <tr>
                        <th style="padding:8px;text-align:left">Invoice</th>
                        <th style="padding:8px;text-align:left">Date</th>
                        <th style="padding:8px;text-align:left">Customer</th>
                        <th style="padding:8px;text-align:left">GST No.</th>
                        <th style="padding:8px;text-align:right">Taxable</th>
                        <th style="padding:8px;text-align:right">CGST</th>
                        <th style="padding:8px;text-align:right">SGST</th>
                        <th style="padding:8px;text-align:right">IGST</th>
                        <th style="padding:8px;text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map(inv => `
                        <tr style="border-top:1px solid var(--border)">
                            <td style="padding:8px;font-family:monospace;color:var(--primary);font-weight:600">${inv.invoice_number}</td>
                            <td style="padding:8px">${formatDate(inv.invoice_date)}</td>
                            <td style="padding:8px">${toProperCase(inv.customer_name)}</td>
                            <td style="padding:8px;font-family:monospace;font-size:11px">${inv.customer_gst || '-'}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(inv.taxable_amount || 0)}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(inv.cgst_amount || 0)}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(inv.sgst_amount || 0)}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(inv.igst_amount || 0)}</td>
                            <td style="padding:8px;text-align:right;font-weight:700">${formatCurrency(inv.grand_total || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderPurchaseTable(purchases) {
        if (purchases.length === 0) return '<p style="text-align:center;padding:20px;color:var(--text-muted)">No purchases in this period</p>';
        
        return `
            <table style="width:100%;font-size:12px">
                <thead style="background:var(--bg)">
                    <tr>
                        <th style="padding:8px;text-align:left">Bill No</th>
                        <th style="padding:8px;text-align:left">Date</th>
                        <th style="padding:8px;text-align:left">Supplier</th>
                        <th style="padding:8px;text-align:left">Supplier GST</th>
                        <th style="padding:8px;text-align:left">Category</th>
                        <th style="padding:8px;text-align:right">Base</th>
                        <th style="padding:8px;text-align:right">GST</th>
                        <th style="padding:8px;text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(p => `
                        <tr style="border-top:1px solid var(--border)">
                            <td style="padding:8px;font-family:monospace;color:var(--primary);font-weight:600">${p.bill_no}</td>
                            <td style="padding:8px">${formatDate(p.bill_date)}</td>
                            <td style="padding:8px">${toProperCase(p.supplier_name)}</td>
                            <td style="padding:8px;font-family:monospace;font-size:11px">${p.supplier_gst || '-'}</td>
                            <td style="padding:8px"><span class="badge badge-info" style="font-size:10px">${p.category}</span></td>
                            <td style="padding:8px;text-align:right">${formatCurrency(p.base_amount || 0)}</td>
                            <td style="padding:8px;text-align:right;color:#6a1b9a">${formatCurrency(p.gst_amount || 0)}</td>
                            <td style="padding:8px;text-align:right;font-weight:700">${formatCurrency(p.total_amount || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderHSNTable(invoices, purchases) {
        // Aggregate by HSN code
        const hsnMap = {};
        
        invoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                const hsn = item.hsn || '998552';
                if (!hsnMap[hsn]) {
                    hsnMap[hsn] = { hsn, description: item.description || '', sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0 };
                }
                hsnMap[hsn].sales += parseFloat(item.amount) || 0;
                if (!item.is_pure_agent) {
                    const gstRate = parseFloat(item.gst_rate) || 0;
                    hsnMap[hsn].salesTax += ((parseFloat(item.amount) || 0) * gstRate / 100);
                }
            });
        });

        purchases.forEach(p => {
            const hsn = '998552'; // Default HSN for purchases
            if (!hsnMap[hsn]) {
                hsnMap[hsn] = { hsn, description: p.category || '', sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0 };
            }
            hsnMap[hsn].purchase += p.base_amount || 0;
            hsnMap[hsn].purchaseTax += p.gst_amount || 0;
        });

        const hsnList = Object.values(hsnMap);
        if (hsnList.length === 0) return '<p style="text-align:center;padding:20px;color:var(--text-muted)">No data</p>';

        return `
            <table style="width:100%;font-size:12px">
                <thead style="background:var(--bg)">
                    <tr>
                        <th style="padding:8px;text-align:left">HSN Code</th>
                        <th style="padding:8px;text-align:right">Sales Value</th>
                        <th style="padding:8px;text-align:right">Output GST</th>
                        <th style="padding:8px;text-align:right">Purchase Value</th>
                        <th style="padding:8px;text-align:right">Input GST</th>
                    </tr>
                </thead>
                <tbody>
                    ${hsnList.map(h => `
                        <tr style="border-top:1px solid var(--border)">
                            <td style="padding:8px;font-family:monospace;font-weight:700;color:var(--primary)">${h.hsn}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(h.sales)}</td>
                            <td style="padding:8px;text-align:right;color:#2e7d32">${formatCurrency(h.salesTax)}</td>
                            <td style="padding:8px;text-align:right">${formatCurrency(h.purchase)}</td>
                            <td style="padding:8px;text-align:right;color:#6a1b9a">${formatCurrency(h.purchaseTax)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ============================================
    // FILTER SETTERS
    // ============================================
    setFilter(type, value) {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth() + 1; // 1-12

        if (type === 'this_month') {
            const d = this.getMonthDates(y, m);
            this.currentFilter.from_date = d.from;
            this.currentFilter.to_date = d.to;
        } else if (type === 'last_month') {
            const lm = m === 1 ? 12 : m - 1;
            const ly = m === 1 ? y - 1 : y;
            const d = this.getMonthDates(ly, lm);
            this.currentFilter.from_date = d.from;
            this.currentFilter.to_date = d.to;
        } else if (type === 'this_quarter') {
            const q = Math.floor((m - 1) / 3);
            const startM = q * 3 + 1;
            const d1 = this.getMonthDates(y, startM);
            const d2 = this.getMonthDates(y, startM + 2);
            this.currentFilter.from_date = d1.from;
            this.currentFilter.to_date = d2.to;
        } else if (type === 'last_quarter') {
            const q = Math.floor((m - 1) / 3);
            let startM = (q - 1) * 3 + 1;
            let year = y;
            if (startM < 1) { startM = 10; year = y - 1; }
            const d1 = this.getMonthDates(year, startM);
            const d2 = this.getMonthDates(year, startM + 2);
            this.currentFilter.from_date = d1.from;
            this.currentFilter.to_date = d2.to;
        } else if (type === 'this_fy') {
            const fyDates = this.getFYDates(getCurrentFY());
            this.currentFilter.from_date = fyDates.from;
            this.currentFilter.to_date = fyDates.to;
            this.currentFilter.financial_year = getCurrentFY();
        } else if (type === 'fy' && value) {
            const fyDates = this.getFYDates(value);
            this.currentFilter.from_date = fyDates.from;
            this.currentFilter.to_date = fyDates.to;
            this.currentFilter.financial_year = value;
        }

        this.render();
    },

    applyCustomDates() {
        const from = document.getElementById('gstFromDate').value;
        const to = document.getElementById('gstToDate').value;
        if (from && to) {
            this.currentFilter.from_date = from;
            this.currentFilter.to_date = to;
            this.render();
        }
    },

    // ============================================
    // EXPORT: COMPREHENSIVE REPORT (All-in-One)
    // ============================================
    exportComprehensive() {
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);
        const summary = this.calculateSummary(invoices, purchases);
        const settings = DB.getSettings();

        if (invoices.length === 0 && purchases.length === 0) {
            showToast('No data in selected period!', 'warning');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: Cover / Summary
        const coverData = [
            ['GST COMPREHENSIVE REPORT'],
            [],
            ['Company:', settings.company_name || 'Tripzar Holidays'],
            ['GSTIN:', settings.gstin || ''],
            ['PAN:', settings.pan || ''],
            ['Address:', `${settings.building || ''} ${settings.street || ''} ${settings.area || ''} ${settings.city || ''}`.trim()],
            [],
            ['Period From:', formatDate(this.currentFilter.from_date)],
            ['Period To:', formatDate(this.currentFilter.to_date)],
            ['Generated On:', new Date().toLocaleString('en-IN')],
            [],
            ['═══════════ SALES SUMMARY ═══════════'],
            ['Total Invoices:', summary.sales.totalInvoices],
            ['B2B Invoices:', summary.sales.b2bCount],
            ['B2C Invoices:', summary.sales.b2cCount],
            ['Taxable Amount:', summary.sales.totalTaxable],
            ['CGST:', summary.sales.totalCGST],
            ['SGST:', summary.sales.totalSGST],
            ['IGST:', summary.sales.totalIGST],
            ['Total Output GST:', summary.sales.totalGST],
            ['Grand Total:', summary.sales.totalGrand],
            [],
            ['═══════════ PURCHASE SUMMARY ═══════════'],
            ['Total Bills:', summary.purchase.totalBills],
            ['Purchase Base:', summary.purchase.totalBase],
            ['Input GST (ITC):', summary.purchase.totalGST],
            ['Total Purchases:', summary.purchase.totalAmount],
            ['Paid:', summary.purchase.totalPaid],
            ['Pending:', summary.purchase.totalPending],
            [],
            ['═══════════ GST LIABILITY ═══════════'],
            ['Output GST:', summary.sales.totalGST],
            ['Input GST (ITC):', summary.purchase.totalGST],
            ['Net GST Payable:', summary.netGSTPayable],
            [],
            ['═══════════ PROFIT & LOSS ═══════════'],
            ['Total Sales:', summary.sales.totalGrand],
            ['Total Purchases:', summary.purchase.totalAmount],
            ['Gross Profit:', summary.grossProfit],
            ['Profit Margin %:', summary.profitMargin + '%']
        ];
        const coverWS = XLSX.utils.aoa_to_sheet(coverData);
        coverWS['!cols'] = [{ wch: 30 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, coverWS, 'Summary');

        // Sheet 2: GSTR-1 B2B (Registered customers)
        const b2b = invoices.filter(inv => inv.customer_gst && inv.customer_gst.length >= 15);
        if (b2b.length > 0) {
            const b2bData = b2b.map((inv, idx) => ({
                'S.No': idx + 1,
                'GSTIN of Recipient': inv.customer_gst || '',
                'Receiver Name': inv.customer_name || '',
                'Invoice Number': inv.invoice_number,
                'Invoice Date': inv.invoice_date,
                'Invoice Value': inv.grand_total || 0,
                'Place of Supply': inv.place_of_supply || inv.customer_state || '',
                'Reverse Charge': 'N',
                'Applicable Tax Rate': (inv.cgst_rate || 0) + (inv.sgst_rate || 0) + (inv.igst_rate || 0) + '%',
                'Invoice Type': 'Regular',
                'E-Commerce GSTIN': '',
                'Rate': (inv.cgst_rate || 0) + (inv.sgst_rate || 0) + (inv.igst_rate || 0),
                'Taxable Value': inv.taxable_amount || 0,
                'CGST Amount': inv.cgst_amount || 0,
                'SGST Amount': inv.sgst_amount || 0,
                'IGST Amount': inv.igst_amount || 0,
                'Cess Amount': 0
            }));
            const b2bWS = XLSX.utils.json_to_sheet(b2bData);
            b2bWS['!cols'] = Array(17).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, b2bWS, 'GSTR-1 B2B');
        }

        // Sheet 3: GSTR-1 B2C
        const b2c = invoices.filter(inv => !inv.customer_gst || inv.customer_gst.length < 15);
        if (b2c.length > 0) {
            const b2cData = b2c.map((inv, idx) => ({
                'S.No': idx + 1,
                'Invoice Number': inv.invoice_number,
                'Invoice Date': inv.invoice_date,
                'Customer Name': inv.customer_name || '',
                'Place of Supply': inv.place_of_supply || inv.customer_state || '',
                'Invoice Value': inv.grand_total || 0,
                'Rate': (inv.cgst_rate || 0) + (inv.sgst_rate || 0) + (inv.igst_rate || 0),
                'Taxable Value': inv.taxable_amount || 0,
                'CGST Amount': inv.cgst_amount || 0,
                'SGST Amount': inv.sgst_amount || 0,
                'IGST Amount': inv.igst_amount || 0
            }));
            const b2cWS = XLSX.utils.json_to_sheet(b2cData);
            b2cWS['!cols'] = Array(11).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, b2cWS, 'GSTR-1 B2C');
        }

        // Sheet 4: GSTR-2 Purchases
        if (purchases.length > 0) {
            const purData = purchases.map((p, idx) => ({
                'S.No': idx + 1,
                'GSTIN of Supplier': p.supplier_gst || '',
                'Supplier Name': p.supplier_name || '',
                'Bill Number': p.bill_no,
                'Bill Date': p.bill_date,
                'Category': p.category || '',
                'Description': p.description || '',
                'Taxable Value': p.base_amount || 0,
                'Rate': p.gst_rate + '%',
                'GST Amount (ITC)': p.gst_amount || 0,
                'Total Amount': p.total_amount || 0,
                'Payment Status': p.payment_status,
                'Paid Amount': p.paid_amount || 0,
                'Balance': (p.total_amount || 0) - (p.paid_amount || 0)
            }));
            const purWS = XLSX.utils.json_to_sheet(purData);
            purWS['!cols'] = Array(14).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, purWS, 'GSTR-2 Purchases');
        }

        // Sheet 5: HSN Summary
        const hsnMap = {};
        invoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                const hsn = item.hsn || '998552';
                if (!hsnMap[hsn]) {
                    hsnMap[hsn] = { hsn, description: item.description || '', sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0, count: 0 };
                }
                hsnMap[hsn].sales += parseFloat(item.amount) || 0;
                hsnMap[hsn].count++;
                if (!item.is_pure_agent) {
                    const gstRate = parseFloat(item.gst_rate) || 0;
                    hsnMap[hsn].salesTax += ((parseFloat(item.amount) || 0) * gstRate / 100);
                }
            });
        });
        purchases.forEach(p => {
            const hsn = '998552';
            if (!hsnMap[hsn]) hsnMap[hsn] = { hsn, description: p.category || '', sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0, count: 0 };
            hsnMap[hsn].purchase += p.base_amount || 0;
            hsnMap[hsn].purchaseTax += p.gst_amount || 0;
        });
        const hsnData = Object.values(hsnMap).map((h, idx) => ({
            'S.No': idx + 1,
            'HSN Code': h.hsn,
            'Description': h.description,
            'Count': h.count,
            'Sales Value': h.sales,
            'Output GST': h.salesTax,
            'Purchase Value': h.purchase,
            'Input GST': h.purchaseTax
        }));
        if (hsnData.length > 0) {
            const hsnWS = XLSX.utils.json_to_sheet(hsnData);
            hsnWS['!cols'] = Array(8).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, hsnWS, 'HSN Summary');
        }

        // Sheet 6: Customer Ledger
        const customerMap = {};
        invoices.forEach(inv => {
            const key = inv.customer_name || 'Unknown';
            if (!customerMap[key]) {
                customerMap[key] = { name: key, gst: inv.customer_gst || '', count: 0, total: 0, paid: 0 };
            }
            customerMap[key].count++;
            customerMap[key].total += inv.grand_total || 0;
            if (inv.payment_status === 'paid') customerMap[key].paid += inv.grand_total || 0;
        });
        const custLedger = Object.values(customerMap).map((c, idx) => ({
            'S.No': idx + 1,
            'Customer': c.name,
            'GSTIN': c.gst,
            'Total Invoices': c.count,
            'Total Amount': c.total,
            'Paid': c.paid,
            'Outstanding': c.total - c.paid
        }));
        if (custLedger.length > 0) {
            const clWS = XLSX.utils.json_to_sheet(custLedger);
            clWS['!cols'] = Array(7).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, clWS, 'Customer Ledger');
        }

        // Sheet 7: Supplier Ledger
        const supplierMap = {};
        purchases.forEach(p => {
            const key = p.supplier_name || 'Unknown';
            if (!supplierMap[key]) {
                supplierMap[key] = { name: key, gst: p.supplier_gst || '', count: 0, total: 0, paid: 0 };
            }
            supplierMap[key].count++;
            supplierMap[key].total += p.total_amount || 0;
            supplierMap[key].paid += p.paid_amount || 0;
        });
        const supLedger = Object.values(supplierMap).map((s, idx) => ({
            'S.No': idx + 1,
            'Supplier': s.name,
            'GSTIN': s.gst,
            'Total Bills': s.count,
            'Total Amount': s.total,
            'Paid': s.paid,
            'Pending': s.total - s.paid
        }));
        if (supLedger.length > 0) {
            const slWS = XLSX.utils.json_to_sheet(supLedger);
            slWS['!cols'] = Array(7).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, slWS, 'Supplier Ledger');
        }

        const fileName = `GST_Report_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('📊 Comprehensive report exported!', 'success');
    },

    // ============================================
    // EXPORT: GSTR-1 (Sales only)
    // ============================================
    exportGSTR1() {
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        if (invoices.length === 0) { showToast('No sales in period!', 'warning'); return; }

        const wb = XLSX.utils.book_new();

        // B2B
        const b2b = invoices.filter(inv => inv.customer_gst && inv.customer_gst.length >= 15);
        if (b2b.length > 0) {
            const data = b2b.map((inv, idx) => ({
                'S.No': idx + 1,
                'GSTIN of Recipient': inv.customer_gst,
                'Receiver Name': inv.customer_name,
                'Invoice Number': inv.invoice_number,
                'Invoice Date': inv.invoice_date,
                'Invoice Value': inv.grand_total || 0,
                'Place of Supply': inv.place_of_supply || inv.customer_state || '',
                'Rate': (inv.cgst_rate || 0) + (inv.sgst_rate || 0) + (inv.igst_rate || 0),
                'Taxable Value': inv.taxable_amount || 0,
                'CGST': inv.cgst_amount || 0,
                'SGST': inv.sgst_amount || 0,
                'IGST': inv.igst_amount || 0
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = Array(12).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, ws, 'B2B');
        }

        // B2C
        const b2c = invoices.filter(inv => !inv.customer_gst || inv.customer_gst.length < 15);
        if (b2c.length > 0) {
            const data = b2c.map((inv, idx) => ({
                'S.No': idx + 1,
                'Invoice Number': inv.invoice_number,
                'Invoice Date': inv.invoice_date,
                'Customer': inv.customer_name,
                'Place of Supply': inv.place_of_supply || inv.customer_state || '',
                'Invoice Value': inv.grand_total || 0,
                'Rate': (inv.cgst_rate || 0) + (inv.sgst_rate || 0) + (inv.igst_rate || 0),
                'Taxable Value': inv.taxable_amount || 0,
                'CGST': inv.cgst_amount || 0,
                'SGST': inv.sgst_amount || 0,
                'IGST': inv.igst_amount || 0
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = Array(11).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(wb, ws, 'B2C');
        }

        XLSX.writeFile(wb, `GSTR-1_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`);
        showToast('📊 GSTR-1 exported!', 'success');
    },

    // ============================================
    // EXPORT: GSTR-2 (Purchases)
    // ============================================
    exportGSTR2() {
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);
        if (purchases.length === 0) { showToast('No purchases in period!', 'warning'); return; }

        const data = purchases.map((p, idx) => ({
            'S.No': idx + 1,
            'GSTIN of Supplier': p.supplier_gst || '',
            'Supplier Name': p.supplier_name,
            'Bill Number': p.bill_no,
            'Bill Date': p.bill_date,
            'Category': p.category,
            'Taxable Value': p.base_amount || 0,
            'Rate': p.gst_rate + '%',
            'Input GST (ITC)': p.gst_amount || 0,
            'Total': p.total_amount || 0
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = Array(10).fill({ wch: 15 });
        XLSX.utils.book_append_sheet(wb, ws, 'GSTR-2 Purchases');
        XLSX.writeFile(wb, `GSTR-2_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`);
        showToast('📊 GSTR-2 exported!', 'success');
    },

    // ============================================
    // EXPORT: HSN Summary
    // ============================================
    exportHSNSummary() {
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);

        const hsnMap = {};
        invoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                const hsn = item.hsn || '998552';
                if (!hsnMap[hsn]) hsnMap[hsn] = { hsn, description: item.description || '', sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0, count: 0 };
                hsnMap[hsn].sales += parseFloat(item.amount) || 0;
                hsnMap[hsn].count++;
                if (!item.is_pure_agent) {
                    const rate = parseFloat(item.gst_rate) || 0;
                    hsnMap[hsn].salesTax += ((parseFloat(item.amount) || 0) * rate / 100);
                }
            });
        });
        purchases.forEach(p => {
            const hsn = '998552';
            if (!hsnMap[hsn]) hsnMap[hsn] = { hsn, description: p.category, sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0, count: 0 };
            hsnMap[hsn].purchase += p.base_amount || 0;
            hsnMap[hsn].purchaseTax += p.gst_amount || 0;
        });

        const data = Object.values(hsnMap).map((h, idx) => ({
            'S.No': idx + 1,
            'HSN Code': h.hsn,
            'Description': h.description,
            'Transactions': h.count,
            'Sales Value': h.sales,
            'Output GST': h.salesTax,
            'Purchase Value': h.purchase,
            'Input GST': h.purchaseTax,
            'Net Tax': h.salesTax - h.purchaseTax
        }));

        if (data.length === 0) { showToast('No data!', 'warning'); return; }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = Array(9).fill({ wch: 15 });
        XLSX.utils.book_append_sheet(wb, ws, 'HSN Summary');
        XLSX.writeFile(wb, `HSN_Summary_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`);
        showToast('📊 HSN Summary exported!', 'success');
    },

    // ============================================
    // EXPORT: P&L Statement
    // ============================================
    exportPL() {
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);
        const summary = this.calculateSummary(invoices, purchases);
        const settings = DB.getSettings();

        const data = [
            ['PROFIT & LOSS STATEMENT'],
            [],
            ['Company:', settings.company_name],
            ['Period:', `${formatDate(this.currentFilter.from_date)} to ${formatDate(this.currentFilter.to_date)}`],
            [],
            ['═══════════ REVENUE ═══════════'],
            ['Total Sales (incl. GST)', summary.sales.totalGrand],
            ['Less: Output GST', -summary.sales.totalGST],
            ['Net Revenue', summary.sales.totalGrand - summary.sales.totalGST],
            [],
            ['═══════════ COST OF GOODS SOLD ═══════════'],
            ['Total Purchases (incl. GST)', summary.purchase.totalAmount],
            ['Less: Input GST (ITC)', -summary.purchase.totalGST],
            ['Net Purchase Cost', summary.purchase.totalAmount - summary.purchase.totalGST],
            [],
            ['═══════════ GROSS PROFIT ═══════════'],
            ['Gross Profit', summary.grossProfit],
            ['Gross Profit Margin %', summary.profitMargin + '%'],
            [],
            ['═══════════ GST LIABILITY ═══════════'],
            ['Output GST (Sales)', summary.sales.totalGST],
            ['Input GST (Purchases)', summary.purchase.totalGST],
            ['Net GST Payable', summary.netGSTPayable]
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'P&L Statement');
        XLSX.writeFile(wb, `PL_Statement_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`);
        showToast('📊 P&L Statement exported!', 'success');
    },

    // ============================================
    // EXPORT: Ledgers (Customer + Supplier)
    // ============================================
    exportLedgers() {
        const invoices = this.filterInvoicesByDate(DB.getActiveInvoices(), this.currentFilter.from_date, this.currentFilter.to_date);
        const purchases = this.filterPurchasesByDate(DB.getActivePurchases(), this.currentFilter.from_date, this.currentFilter.to_date);
        const wb = XLSX.utils.book_new();

        // Customer Ledger
        const customerMap = {};
        invoices.forEach(inv => {
            const key = inv.customer_name || 'Unknown';
            if (!customerMap[key]) customerMap[key] = { name: key, gst: inv.customer_gst || '', phone: inv.customer_phone || '', count: 0, total: 0, paid: 0 };
            customerMap[key].count++;
            customerMap[key].total += inv.grand_total || 0;
            if (inv.payment_status === 'paid') customerMap[key].paid += inv.grand_total || 0;
        });
        const custData = Object.values(customerMap).map((c, idx) => ({
            'S.No': idx + 1,
            'Customer': c.name,
            'GSTIN': c.gst,
            'Phone': c.phone,
            'Invoices': c.count,
            'Total Sales': c.total,
            'Received': c.paid,
            'Outstanding': c.total - c.paid
        }));
        if (custData.length > 0) {
            const ws = XLSX.utils.json_to_sheet(custData);
            ws['!cols'] = Array(8).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');
        }

        // Supplier Ledger
        const supplierMap = {};
        purchases.forEach(p => {
            const key = p.supplier_name || 'Unknown';
            if (!supplierMap[key]) supplierMap[key] = { name: key, gst: p.supplier_gst || '', count: 0, total: 0, paid: 0 };
            supplierMap[key].count++;
            supplierMap[key].total += p.total_amount || 0;
            supplierMap[key].paid += p.paid_amount || 0;
        });
        const supData = Object.values(supplierMap).map((s, idx) => ({
            'S.No': idx + 1,
            'Supplier': s.name,
            'GSTIN': s.gst,
            'Bills': s.count,
            'Total Purchase': s.total,
            'Paid': s.paid,
            'Pending': s.total - s.paid
        }));
        if (supData.length > 0) {
            const ws = XLSX.utils.json_to_sheet(supData);
            ws['!cols'] = Array(7).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, ws, 'Supplier Ledger');
        }

        XLSX.writeFile(wb, `Ledgers_${this.currentFilter.from_date}_to_${this.currentFilter.to_date}.xlsx`);
        showToast('📊 Ledgers exported!', 'success');
    }
};

console.log('✅ GST Reports module loaded');