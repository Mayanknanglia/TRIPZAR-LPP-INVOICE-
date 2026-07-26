/* =============================================
   PDF EXPORT UTILITY v1.0
   Branded PDF exports with Tripzar theme
   Used for: Invoices List, Purchases, Customers, 
   Suppliers, Reports, GST Reports, Ledgers
   ============================================= */

const PDFExport = {
    
    // ============================================
    // BRAND COLORS
    // ============================================
    COLORS: {
        primary: [26, 86, 50],       // #1a5632 - Tripzar Green
        primaryLight: [45, 138, 78], // #2d8a4e
        accent: [245, 158, 11],      // #f59e0b - Orange
        white: [255, 255, 255],
        text: [15, 23, 42],          // #0f172a
        textLight: [100, 116, 139],  // #64748b
        border: [226, 232, 240],     // #e2e8f0
        bgLight: [248, 250, 252],    // #f8fafc
        success: [16, 185, 129],
        danger: [239, 68, 68],
        warning: [245, 158, 11]
    },

    // ============================================
    // MAIN EXPORT FUNCTION
    // ============================================
    async export(config) {
        const {
            title,           // Report title
            subtitle,        // Report subtitle
            columns,         // Table columns: [{ key, label, width, align }]
            data,            // Array of rows
            filename,        // PDF filename
            orientation = 'landscape', // 'landscape' or 'portrait'
            summary = null,  // Optional summary object
            filters = null   // Optional filter info
        } = config;

        if (!data || data.length === 0) {
            showToast('No data to export!', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;

        // ⭐ HEADER
        await this.drawHeader(doc, title, subtitle, pageWidth, margin);

        // ⭐ Filters info (if provided)
        let yPos = 48;
        if (filters) {
            yPos = this.drawFilters(doc, filters, pageWidth, margin, yPos);
        }

        // ⭐ Summary Cards (if provided)
        if (summary) {
            yPos = this.drawSummary(doc, summary, pageWidth, margin, yPos);
        }

        // ⭐ TABLE
        this.drawTable(doc, columns, data, pageWidth, pageHeight, margin, yPos);

        // ⭐ FOOTER (all pages)
        this.drawFooters(doc, pageWidth, pageHeight, margin);

        // Save PDF
        doc.save(filename || `Tripzar_Report_${this.getDateStr()}.pdf`);
        showToast('📄 PDF exported!', 'success');
    },

    // ============================================
    // HEADER SECTION
    // ============================================
    async drawHeader(doc, title, subtitle, pageWidth, margin) {
        const settings = DB.getSettings();
        
        // Green header background
        doc.setFillColor(...this.COLORS.primary);
        doc.rect(0, 0, pageWidth, 32, 'F');

        // Logo (if available)
        let logoWidth = 0;
        if (settings.logo_data) {
            try {
                const logoSize = 20;
                doc.addImage(settings.logo_data, 'JPEG', margin, 6, logoSize, logoSize);
                logoWidth = logoSize + 5;
            } catch (e) {
                console.warn('Logo error:', e);
            }
        }

        // Company Name (center)
        doc.setTextColor(...this.COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const companyName = settings.company_name || 'TRIPZAR HOLIDAYS LLP';
        doc.text(companyName, pageWidth / 2, 13, { align: 'center' });

        // Report Title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(title || 'Report', pageWidth / 2, 21, { align: 'center' });

        // Subtitle
        if (subtitle) {
            doc.setFontSize(9);
            doc.text(subtitle, pageWidth / 2, 27, { align: 'center' });
        }

        // Company Contact (bottom right of header)
        doc.setFontSize(8);
        const contactParts = [];
        if (settings.phone) contactParts.push('📞 ' + settings.phone);
        if (settings.email) contactParts.push('✉ ' + settings.email);
        if (settings.website) contactParts.push('🌐 ' + settings.website);
        if (contactParts.length > 0) {
            // Draw a thin separator
            doc.setDrawColor(...this.COLORS.white);
            doc.setLineWidth(0.2);
        }
    },

    // ============================================
    // FILTERS INFO
    // ============================================
    drawFilters(doc, filters, pageWidth, margin, yPos) {
        doc.setFillColor(...this.COLORS.bgLight);
        doc.setDrawColor(...this.COLORS.border);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8, 1, 1, 'FD');

        doc.setTextColor(...this.COLORS.textLight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const filterText = Object.entries(filters)
            .map(([key, value]) => `${key}: ${value}`)
            .join('   |   ');
        
        doc.text(filterText, margin + 3, yPos + 5.5);
        
        return yPos + 12;
    },

    // ============================================
    // SUMMARY CARDS
    // ============================================
    drawSummary(doc, summary, pageWidth, margin, yPos) {
        const entries = Object.entries(summary);
        if (entries.length === 0) return yPos;

        const cardWidth = (pageWidth - 2 * margin - (entries.length - 1) * 3) / entries.length;
        const cardHeight = 14;

        entries.forEach(([label, value], idx) => {
            const x = margin + idx * (cardWidth + 3);
            
            // Card background
            doc.setFillColor(...this.COLORS.bgLight);
            doc.setDrawColor(...this.COLORS.border);
            doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, 'FD');
            
            // Label
            doc.setTextColor(...this.COLORS.textLight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(label.toUpperCase(), x + 2, yPos + 4);
            
            // Value
            doc.setTextColor(...this.COLORS.primary);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(String(value), x + 2, yPos + 11);
        });

        return yPos + cardHeight + 4;
    },

    // ============================================
    // TABLE
    // ============================================
    drawTable(doc, columns, data, pageWidth, pageHeight, margin, startY) {
        const tableWidth = pageWidth - 2 * margin;
        
        // Auto-calculate column widths if not specified
        const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
        const cols = columns.map(col => ({
            ...col,
            actualWidth: (tableWidth * (col.width || 1)) / totalWeight
        }));

        const rowHeight = 7;
        const headerHeight = 9;
        const footerHeight = 15;

        let currentY = startY;

        // Draw header function (used for pagination)
        const drawTableHeader = (y) => {
            // Header background
            doc.setFillColor(...this.COLORS.primary);
            doc.rect(margin, y, tableWidth, headerHeight, 'F');
            
            // Header text
            doc.setTextColor(...this.COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            
            let x = margin;
            cols.forEach(col => {
                const align = col.align || 'left';
                let textX = x + 2;
                if (align === 'center') textX = x + col.actualWidth / 2;
                else if (align === 'right') textX = x + col.actualWidth - 2;
                
                doc.text(col.label, textX, y + 6, { align: align });
                x += col.actualWidth;
            });
            
            return y + headerHeight;
        };

        // Draw table header
        currentY = drawTableHeader(currentY);

        // Draw rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        data.forEach((row, rowIdx) => {
            // Check if new page needed
            if (currentY + rowHeight > pageHeight - footerHeight) {
                doc.addPage();
                currentY = 15;
                currentY = drawTableHeader(currentY);
            }

            // Alternate row background
            if (rowIdx % 2 === 1) {
                doc.setFillColor(...this.COLORS.bgLight);
                doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
            }

            // Row border
            doc.setDrawColor(...this.COLORS.border);
            doc.setLineWidth(0.1);
            doc.line(margin, currentY + rowHeight, margin + tableWidth, currentY + rowHeight);

            // Row text
            doc.setTextColor(...this.COLORS.text);
            let x = margin;
            cols.forEach(col => {
                let value = row[col.key];
                if (value === null || value === undefined) value = '-';
                value = String(value);
                
                // Truncate if too long
                const maxChars = Math.floor(col.actualWidth / 1.5);
                if (value.length > maxChars) {
                    value = value.substring(0, maxChars - 1) + '…';
                }
                
                const align = col.align || 'left';
                let textX = x + 2;
                if (align === 'center') textX = x + col.actualWidth / 2;
                else if (align === 'right') textX = x + col.actualWidth - 2;
                
                // Special formatting for currency
                if (col.type === 'currency' && !isNaN(parseFloat(row[col.key]))) {
                    value = '₹' + parseFloat(row[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                
                doc.text(value, textX, currentY + 4.8, { align: align });
                x += col.actualWidth;
            });

            currentY += rowHeight;
        });

        // Bottom border of table
        doc.setDrawColor(...this.COLORS.primary);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, margin + tableWidth, currentY);
    },

    // ============================================
    // FOOTERS (All Pages)
    // ============================================
    drawFooters(doc, pageWidth, pageHeight, margin) {
        const settings = DB.getSettings();
        const totalPages = doc.internal.getNumberOfPages();

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            const footerY = pageHeight - 10;
            
            // Footer line
            doc.setDrawColor(...this.COLORS.primary);
            doc.setLineWidth(0.5);
            doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
            
            // Company footer
            doc.setTextColor(...this.COLORS.textLight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            
            const address = [settings.building, settings.street, settings.area, settings.city, settings.state, settings.pincode]
                .filter(x => x && x.trim()).join(', ');
            
            doc.text(address, margin, footerY);
            
            // Contact center
            const contact = [];
            if (settings.phone) contact.push(settings.phone);
            if (settings.email) contact.push(settings.email);
            if (contact.length > 0) {
                doc.text(contact.join(' | '), pageWidth / 2, footerY, { align: 'center' });
            }
            
            // Page number + Generated date
            doc.setFont('helvetica', 'bold');
            const pageText = `Page ${i} of ${totalPages}`;
            const dateText = `Generated: ${new Date().toLocaleString('en-IN')}`;
            doc.text(pageText, pageWidth - margin, footerY, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text(dateText, pageWidth - margin, footerY + 3, { align: 'right' });
        }
    },

    // ============================================
    // UTILITY
    // ============================================
    getDateStr() {
        return new Date().toISOString().split('T')[0];
    },

    formatCurrency(val) {
        if (isNaN(parseFloat(val))) return '₹0.00';
        return '₹' + parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    },

    // ============================================
    // ⭐ PRE-BUILT EXPORTS
    // ============================================

    // Export Invoices List
    async exportInvoicesList(invoices, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'invoice_number', label: 'Invoice No', width: 1.2 },
            { key: 'date', label: 'Date', width: 0.7 },
            { key: 'customer', label: 'Customer', width: 1.8 },
            { key: 'gst_type', label: 'GST', width: 0.7 },
            { key: 'taxable', label: 'Taxable', width: 0.8, align: 'right', type: 'currency' },
            { key: 'tax', label: 'Tax', width: 0.7, align: 'right', type: 'currency' },
            { key: 'total', label: 'Total', width: 0.8, align: 'right', type: 'currency' },
            { key: 'status', label: 'Status', width: 0.6, align: 'center' }
        ];

        const data = invoices.map((inv, idx) => ({
            sno: idx + 1,
            invoice_number: inv.invoice_number,
            date: this.formatDate(inv.invoice_date),
            customer: (inv.customer_name || '').substring(0, 35),
            gst_type: inv.gst_type_label || '-',
            taxable: inv.taxable_amount || 0,
            tax: inv.total_tax || 0,
            total: inv.grand_total || 0,
            status: (inv.payment_status || 'unpaid').toUpperCase()
        }));

        const totalAmount = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
        const totalTax = invoices.reduce((s, i) => s + (i.total_tax || 0), 0);
        const paidCount = invoices.filter(i => i.payment_status === 'paid').length;

        await this.export({
            title: 'Sales Invoices Report',
            subtitle: `Total ${invoices.length} invoices`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Total Invoices': invoices.length,
                'Paid': paidCount,
                'Total Amount': this.formatCurrency(totalAmount),
                'Total Tax': this.formatCurrency(totalTax)
            },
            filename: `Tripzar_Invoices_${this.getDateStr()}.pdf`
        });
    },

    // Export Purchases List
    async exportPurchasesList(purchases, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'bill_no', label: 'Bill No', width: 1 },
            { key: 'date', label: 'Date', width: 0.7 },
            { key: 'supplier', label: 'Supplier', width: 1.5 },
            { key: 'category', label: 'Category', width: 0.9 },
            { key: 'base', label: 'Base', width: 0.7, align: 'right', type: 'currency' },
            { key: 'gst', label: 'GST', width: 0.6, align: 'right', type: 'currency' },
            { key: 'total', label: 'Total', width: 0.8, align: 'right', type: 'currency' },
            { key: 'paid', label: 'Paid', width: 0.7, align: 'right', type: 'currency' },
            { key: 'status', label: 'Status', width: 0.6, align: 'center' }
        ];

        const data = purchases.map((p, idx) => ({
            sno: idx + 1,
            bill_no: p.bill_no || '-',
            date: this.formatDate(p.bill_date),
            supplier: (p.supplier_name || '').substring(0, 30),
            category: p.category || '-',
            base: p.base_amount || 0,
            gst: p.gst_amount || 0,
            total: p.total_amount || 0,
            paid: p.paid_amount || 0,
            status: (p.payment_status || 'unpaid').toUpperCase()
        }));

        const totalAmount = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
        const totalPaid = purchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
        const totalPending = totalAmount - totalPaid;

        await this.export({
            title: 'Purchase Bills Report',
            subtitle: `Total ${purchases.length} bills`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Total Bills': purchases.length,
                'Total Amount': this.formatCurrency(totalAmount),
                'Paid': this.formatCurrency(totalPaid),
                'Pending': this.formatCurrency(totalPending)
            },
            filename: `Tripzar_Purchases_${this.getDateStr()}.pdf`
        });
    },

    // Export Customers List
    async exportCustomersList(customers) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'name', label: 'Name', width: 1.5 },
            { key: 'phone', label: 'Phone', width: 0.9 },
            { key: 'email', label: 'Email', width: 1.4 },
            { key: 'gst', label: 'GST No', width: 1.2 },
            { key: 'city', label: 'City', width: 0.8 },
            { key: 'state', label: 'State', width: 0.9 },
            { key: 'country', label: 'Country', width: 0.7 }
        ];

        const data = customers.map((c, idx) => ({
            sno: idx + 1,
            name: c.name || '-',
            phone: c.phone || '-',
            email: c.email || '-',
            gst: c.gst_no || '-',
            city: c.city || '-',
            state: c.state || '-',
            country: c.country || 'India'
        }));

        await this.export({
            title: 'Customers Database',
            subtitle: `Total ${customers.length} customers`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            summary: {
                'Total': customers.length,
                'With GST': customers.filter(c => c.gst_no).length,
                'With Email': customers.filter(c => c.email).length,
                'With Phone': customers.filter(c => c.phone).length
            },
            filename: `Tripzar_Customers_${this.getDateStr()}.pdf`
        });
    },

    // Export Suppliers List
    async exportSuppliersList(suppliers) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'name', label: 'Supplier Name', width: 1.5 },
            { key: 'phone', label: 'Phone', width: 0.9 },
            { key: 'gst', label: 'GST No', width: 1.2 },
            { key: 'city', label: 'City', width: 0.8 },
            { key: 'bills', label: 'Bills', width: 0.5, align: 'center' },
            { key: 'total', label: 'Total Amount', width: 1, align: 'right', type: 'currency' },
            { key: 'pending', label: 'Pending', width: 1, align: 'right', type: 'currency' }
        ];

        const data = suppliers.map((s, idx) => {
            const stats = DB.getSupplierStats(s.name);
            return {
                sno: idx + 1,
                name: s.name || '-',
                phone: s.phone || '-',
                gst: s.gst_no || '-',
                city: s.city || '-',
                bills: stats.totalBills,
                total: stats.totalAmount,
                pending: stats.pending
            };
        });

        const totalPending = data.reduce((s, r) => s + r.pending, 0);
        const totalAmount = data.reduce((s, r) => s + r.total, 0);

        await this.export({
            title: 'Suppliers Ledger',
            subtitle: `Total ${suppliers.length} suppliers`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            summary: {
                'Total Suppliers': suppliers.length,
                'Total Purchases': this.formatCurrency(totalAmount),
                'Total Pending': this.formatCurrency(totalPending)
            },
            filename: `Tripzar_Suppliers_${this.getDateStr()}.pdf`
        });
    },

    // Export GSTR-1 (Sales)
    async exportGSTR1(invoices, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'invoice_no', label: 'Invoice No', width: 1.1 },
            { key: 'date', label: 'Date', width: 0.7 },
            { key: 'customer', label: 'Customer', width: 1.3 },
            { key: 'gstin', label: 'GSTIN', width: 1.1 },
            { key: 'taxable', label: 'Taxable', width: 0.8, align: 'right', type: 'currency' },
            { key: 'cgst', label: 'CGST', width: 0.7, align: 'right', type: 'currency' },
            { key: 'sgst', label: 'SGST', width: 0.7, align: 'right', type: 'currency' },
            { key: 'igst', label: 'IGST', width: 0.7, align: 'right', type: 'currency' },
            { key: 'total', label: 'Total', width: 0.8, align: 'right', type: 'currency' }
        ];

        const data = invoices.map((inv, idx) => ({
            sno: idx + 1,
            invoice_no: inv.invoice_number,
            date: this.formatDate(inv.invoice_date),
            customer: (inv.customer_name || '').substring(0, 25),
            gstin: inv.customer_gst || '-',
            taxable: inv.taxable_amount || 0,
            cgst: inv.cgst_amount || 0,
            sgst: inv.sgst_amount || 0,
            igst: inv.igst_amount || 0,
            total: inv.grand_total || 0
        }));

        const totalTaxable = invoices.reduce((s, i) => s + (i.taxable_amount || 0), 0);
        const totalCgst = invoices.reduce((s, i) => s + (i.cgst_amount || 0), 0);
        const totalSgst = invoices.reduce((s, i) => s + (i.sgst_amount || 0), 0);
        const totalIgst = invoices.reduce((s, i) => s + (i.igst_amount || 0), 0);
        const totalGrand = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);

        await this.export({
            title: 'GSTR-1 Report (Outward Supplies)',
            subtitle: `Sales Invoices • ${invoices.length} transactions`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Taxable Value': this.formatCurrency(totalTaxable),
                'CGST': this.formatCurrency(totalCgst),
                'SGST': this.formatCurrency(totalSgst),
                'IGST': this.formatCurrency(totalIgst),
                'Grand Total': this.formatCurrency(totalGrand)
            },
            filename: `GSTR-1_${this.getDateStr()}.pdf`
        });
    },

    // Export GSTR-2 (Purchases)
    async exportGSTR2(purchases, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'bill_no', label: 'Bill No', width: 1 },
            { key: 'date', label: 'Date', width: 0.7 },
            { key: 'supplier', label: 'Supplier', width: 1.4 },
            { key: 'gstin', label: 'Supplier GSTIN', width: 1.1 },
            { key: 'category', label: 'Category', width: 0.9 },
            { key: 'base', label: 'Taxable', width: 0.8, align: 'right', type: 'currency' },
            { key: 'gst', label: 'Input GST', width: 0.8, align: 'right', type: 'currency' },
            { key: 'total', label: 'Total', width: 0.8, align: 'right', type: 'currency' }
        ];

        const data = purchases.map((p, idx) => ({
            sno: idx + 1,
            bill_no: p.bill_no || '-',
            date: this.formatDate(p.bill_date),
            supplier: (p.supplier_name || '').substring(0, 25),
            gstin: p.supplier_gst || '-',
            category: p.category || '-',
            base: p.base_amount || 0,
            gst: p.gst_amount || 0,
            total: p.total_amount || 0
        }));

        const totalBase = purchases.reduce((s, p) => s + (p.base_amount || 0), 0);
        const totalGst = purchases.reduce((s, p) => s + (p.gst_amount || 0), 0);
        const totalAmount = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);

        await this.export({
            title: 'GSTR-2 Report (Inward Supplies)',
            subtitle: `Purchase Bills • ${purchases.length} transactions`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Total Bills': purchases.length,
                'Taxable Value': this.formatCurrency(totalBase),
                'Input GST (ITC)': this.formatCurrency(totalGst),
                'Total Amount': this.formatCurrency(totalAmount)
            },
            filename: `GSTR-2_${this.getDateStr()}.pdf`
        });
    },

    // Export HSN Summary
    async exportHSNSummary(hsnData, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.4, align: 'center' },
            { key: 'hsn', label: 'HSN Code', width: 1 },
            { key: 'description', label: 'Description', width: 2 },
            { key: 'count', label: 'Qty', width: 0.6, align: 'center' },
            { key: 'sales', label: 'Sales Value', width: 1.2, align: 'right', type: 'currency' },
            { key: 'salesTax', label: 'Output GST', width: 1.2, align: 'right', type: 'currency' },
            { key: 'purchase', label: 'Purchase', width: 1.2, align: 'right', type: 'currency' },
            { key: 'purchaseTax', label: 'Input GST', width: 1.2, align: 'right', type: 'currency' }
        ];

        const data = hsnData.map((h, idx) => ({
            sno: idx + 1,
            ...h
        }));

        await this.export({
            title: 'HSN Summary Report',
            subtitle: `${hsnData.length} HSN codes`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            filename: `HSN_Summary_${this.getDateStr()}.pdf`
        });
    },

    // Export P&L Statement
    async exportPL(summary, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'particulars', label: 'Particulars', width: 3 },
            { key: 'amount', label: 'Amount', width: 1.5, align: 'right' }
        ];

        const data = [
            { sno: '', particulars: '═══ REVENUE ═══', amount: '' },
            { sno: 1, particulars: 'Total Sales (incl. GST)', amount: this.formatCurrency(summary.sales.totalGrand) },
            { sno: 2, particulars: 'Less: Output GST', amount: `(${this.formatCurrency(summary.sales.totalGST)})` },
            { sno: 3, particulars: 'Net Revenue', amount: this.formatCurrency(summary.sales.totalGrand - summary.sales.totalGST) },
            { sno: '', particulars: '', amount: '' },
            { sno: '', particulars: '═══ EXPENSES ═══', amount: '' },
            { sno: 4, particulars: 'Total Purchases (incl. GST)', amount: this.formatCurrency(summary.purchase.totalAmount) },
            { sno: 5, particulars: 'Less: Input GST (ITC)', amount: `(${this.formatCurrency(summary.purchase.totalGST)})` },
            { sno: 6, particulars: 'Net Purchase Cost', amount: this.formatCurrency(summary.purchase.totalAmount - summary.purchase.totalGST) },
            { sno: '', particulars: '', amount: '' },
            { sno: '', particulars: '═══ PROFIT & LOSS ═══', amount: '' },
            { sno: 7, particulars: 'GROSS PROFIT', amount: this.formatCurrency(summary.grossProfit) },
            { sno: 8, particulars: 'Gross Profit Margin', amount: summary.profitMargin + '%' },
            { sno: '', particulars: '', amount: '' },
            { sno: '', particulars: '═══ GST LIABILITY ═══', amount: '' },
            { sno: 9, particulars: 'Output GST (Sales)', amount: this.formatCurrency(summary.sales.totalGST) },
            { sno: 10, particulars: 'Input GST (Purchases)', amount: this.formatCurrency(summary.purchase.totalGST) },
            { sno: 11, particulars: 'NET GST PAYABLE', amount: this.formatCurrency(summary.netGSTPayable) }
        ];

        await this.export({
            title: 'Profit & Loss Statement',
            subtitle: 'Complete Financial Overview',
            columns: columns,
            data: data,
            orientation: 'portrait',
            filters: Object.keys(filters).length > 0 ? filters : null,
            filename: `PL_Statement_${this.getDateStr()}.pdf`
        });
    },

    // Export Customer Ledger
    async exportCustomerLedger(customers, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'name', label: 'Customer', width: 2 },
            { key: 'gstin', label: 'GSTIN', width: 1.2 },
            { key: 'phone', label: 'Phone', width: 1 },
            { key: 'count', label: 'Invoices', width: 0.6, align: 'center' },
            { key: 'total', label: 'Total Sales', width: 1.2, align: 'right', type: 'currency' },
            { key: 'paid', label: 'Received', width: 1, align: 'right', type: 'currency' },
            { key: 'outstanding', label: 'Outstanding', width: 1.2, align: 'right', type: 'currency' }
        ];

        const data = customers.map((c, idx) => ({
            sno: idx + 1,
            ...c
        }));

        const totalSales = customers.reduce((s, c) => s + (c.total || 0), 0);
        const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);

        await this.export({
            title: 'Customer Ledger',
            subtitle: `${customers.length} customers`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Total Customers': customers.length,
                'Total Sales': this.formatCurrency(totalSales),
                'Total Outstanding': this.formatCurrency(totalOutstanding)
            },
            filename: `Customer_Ledger_${this.getDateStr()}.pdf`
        });
    },

    // Export Supplier Ledger
    async exportSupplierLedger(suppliers, filters = {}) {
        const columns = [
            { key: 'sno', label: '#', width: 0.3, align: 'center' },
            { key: 'name', label: 'Supplier', width: 2 },
            { key: 'gstin', label: 'GSTIN', width: 1.2 },
            { key: 'count', label: 'Bills', width: 0.6, align: 'center' },
            { key: 'total', label: 'Total Purchases', width: 1.3, align: 'right', type: 'currency' },
            { key: 'paid', label: 'Paid', width: 1, align: 'right', type: 'currency' },
            { key: 'pending', label: 'Pending', width: 1.2, align: 'right', type: 'currency' }
        ];

        const data = suppliers.map((s, idx) => ({
            sno: idx + 1,
            ...s
        }));

        const totalPurchases = suppliers.reduce((s, sup) => s + (sup.total || 0), 0);
        const totalPending = suppliers.reduce((s, sup) => s + (sup.pending || 0), 0);

        await this.export({
            title: 'Supplier Ledger',
            subtitle: `${suppliers.length} suppliers`,
            columns: columns,
            data: data,
            orientation: 'landscape',
            filters: Object.keys(filters).length > 0 ? filters : null,
            summary: {
                'Total Suppliers': suppliers.length,
                'Total Purchases': this.formatCurrency(totalPurchases),
                'Total Pending': this.formatCurrency(totalPending)
            },
            filename: `Supplier_Ledger_${this.getDateStr()}.pdf`
        });
    }
};

console.log('✅ PDF Export module loaded');