/* =============================================
   PDF v19 - Round Off Fixed (Add/Less with signs)
   ============================================= */

function downloadInvoicePDF(invoiceId) {
    const inv = DB.getInvoiceById(invoiceId);
    if (!inv) { showToast('Invoice not found!', 'error'); return; }
    generateInvoicePDF(inv, DB.getSettings(), 'download');
}

function printInvoicePDF(invoiceId) {
    const inv = DB.getInvoiceById(invoiceId);
    if (!inv) { showToast('Invoice not found!', 'error'); return; }
    generateInvoicePDF(inv, DB.getSettings(), 'print');
}

function buildCompanyAddress(s) {
    const line1Parts = [s.building, s.street, s.area].filter(x => x && x.trim());
    const line1 = line1Parts.join(', ');
    const line2Parts = [];
    if (s.city) line2Parts.push(s.city);
    if (s.state) line2Parts.push(s.state);
    let line2 = line2Parts.join(', ');
    if (s.pincode) line2 += ' - ' + s.pincode;
    const line3 = s.country || 'India';
    return { line1: line1, line2: line2, line3: line3 };
}

function getServiceInfo(type) {
    if (typeof SERVICE_TYPES !== 'undefined' && SERVICE_TYPES[type]) {
        return SERVICE_TYPES[type];
    }
    return { name: 'Service', icon: '', hsn: '998552', isPureAgent: false, defaultGst: 18 };
}

function fitText(doc, text, maxWidth) {
    if (!text) return '';
    const textWidth = doc.getTextWidth(text);
    if (textWidth <= maxWidth) return text;
    let truncated = text;
    while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
        truncated = truncated.substring(0, truncated.length - 1);
    }
    return truncated + '...';
}

function wrapText(doc, text, maxWidth) {
    if (!text) return [''];
    return doc.splitTextToSize(text, maxWidth);
}

async function generateInvoicePDF(inv, settings, action) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const PW = 210;
        const ML = 10;
        const MR = 10;
        const CW = PW - ML - MR;
        const RE = PW - MR;

        doc.setDrawColor(0);
        doc.setLineWidth(0.25);
        const box = (x, y, w, h) => doc.rect(x, y, w, h, 'S');

        let y = 8;

        // HEADER
        const invoiceType = settings.invoice_type || 'Tax Invoice';
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(invoiceType, PW / 2, y, { align: 'center' });
        y += 8;

        // LOGO
        if (settings.logo_data) {
            try {
                doc.addImage(settings.logo_data, 'PNG', (PW - 28) / 2, y, 28, 28);
                y += 31;
            } catch (e) { y += 20; }
        } else {
            y += 20;
        }

        // COMPANY NAME
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.company_name || 'TRIPZAR HOLIDAYS LLP', PW / 2, y, { align: 'center' });
        y += 5;

        // ADDRESS
        const addr = buildCompanyAddress(settings);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (addr.line1) {
            const wrapped = wrapText(doc, addr.line1, CW - 10);
            wrapped.forEach(line => { doc.text(line, PW / 2, y, { align: 'center' }); y += 3.5; });
        }
        if (addr.line2) { doc.text(addr.line2, PW / 2, y, { align: 'center' }); y += 3.5; }
        if (addr.line3) { doc.text(addr.line3, PW / 2, y, { align: 'center' }); y += 3.5; }
        
        // LLPIN (right below address)
        if (settings.llpin) {
            doc.text('LLPIN:   ' + settings.llpin, PW / 2, y, { align: 'center' });
            y += 3.5;
        }
        
        // GSTIN + PAN in same line
        let gstinPanText = 'GSTIN/UIN:   ' + (settings.gstin || '');
        if (settings.pan) {
            gstinPanText += '     PAN:   ' + settings.pan;
        }
        doc.text(gstinPanText, PW / 2, y, { align: 'center' });
        y += 3.5;
        
        doc.text('UDYAM:   ' + (settings.udyam || ''), PW / 2, y, { align: 'center' });
        y += 5;

        // CONTACT ROW
        const cH = 7;
        const c3 = CW / 3;
        box(ML, y, c3, cH);
        box(ML + c3, y, c3, cH);
        box(ML + c3 * 2, y, c3, cH);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Contact:', ML + 3, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text(fitText(doc, settings.phone || '', c3 - 25), ML + 22, y + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.text('Website:', ML + c3 + 3, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text(fitText(doc, settings.website || '', c3 - 25), ML + c3 + 22, y + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.text('E-Mail:', ML + c3 * 2 + 3, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text(fitText(doc, settings.email || '', c3 - 22), ML + c3 * 2 + 20, y + 4.5);
        y += cH;

        // BUYER + INVOICE
        const bH = inv.customer_gst ? 30 : 26;
        const iW = 75;
        const bW = CW - iW;
        box(ML, y, bW, bH);
        box(ML + bW, y, iW, bH);

        let by = y + 3.5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Buyer (Bill to)', ML + 2, by);
        by += 3.5;
        doc.setFontSize(10);
        doc.text(fitText(doc, toProperCase(inv.customer_name || ''), bW - 4), ML + 2, by);
        by += 4.5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        if (inv.customer_address) {
            const addrText = toProperCase(inv.customer_address);
            const wrapped = wrapText(doc, addrText, bW - 4);
            wrapped.slice(0, 2).forEach(line => {
                doc.text(line, ML + 2, by);
                by += 3.5;
            });
        }
        if (inv.customer_city) {
            doc.text(fitText(doc, (toProperCase(inv.customer_city) + ' ' + (inv.customer_pincode || '')).trim(), bW - 4), ML + 2, by);
            by += 3.5;
        }
        doc.text(fitText(doc, toProperCase(inv.customer_state || '') + ' - ' + toProperCase(inv.customer_country || 'India'), bW - 4), ML + 2, by);
        by += 3.5;

        if (inv.customer_gst) {
            doc.setFont('helvetica', 'bold');
            doc.text('GSTIN/UIN:  ' + inv.customer_gst, ML + 2, by);
            doc.setFont('helvetica', 'normal');
            by += 3.5;
        }

        if (inv.customer_state) {
            doc.text(fitText(doc, 'State: ' + toProperCase(inv.customer_state) + '   Code: ' + (inv.customer_state_code || ''), bW - 4), ML + 2, by);
            by += 3.5;
        }
        doc.text(fitText(doc, 'Place of Supply: ' + toProperCase(inv.place_of_supply || ''), bW - 4), ML + 2, by);

        let iy = y + 3.5;
        const ix = ML + bW + 3;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Invoice No.:', ix, iy);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, inv.invoice_number || '', iW - 28), ix + 22, iy);
        iy += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.text('Dated:', ix, iy);
        doc.setFont('helvetica', 'bold');
        doc.text(formatDate(inv.invoice_date), ix + 22, iy);
        iy += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.text('Mode/Terms:', ix, iy);
        iy += 4;
        if (inv.payment_mode) {
            doc.setFont('helvetica', 'bold');
            doc.text(fitText(doc, inv.payment_mode, iW - 4), ix, iy);
        }
        y += bH;

        // ITEMS TABLE HEADER
        const slW = 12, partW = 78, gstW = 14, qtyW = 22, rateW = 20, perW = 12;
        const amtW = CW - slW - partW - gstW - qtyW - rateW - perW;
        const xSl = ML;
        const xPart = xSl + slW;
        const xGst = xPart + partW;
        const xQty = xGst + gstW;
        const xRate = xQty + qtyW;
        const xPer = xRate + rateW;
        const xAmt = xPer + perW;

        const hH = 9;
        box(xSl, y, slW, hH);
        box(xPart, y, partW, hH);
        box(xGst, y, gstW, hH);
        box(xQty, y, qtyW, hH);
        box(xRate, y, rateW, hH);
        box(xPer, y, perW, hH);
        box(xAmt, y, amtW, hH);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Sl', xSl + slW / 2, y + 3.5, { align: 'center' });
        doc.text('No.', xSl + slW / 2, y + 7, { align: 'center' });
        doc.text('Particulars', xPart + partW / 2, y + 5.5, { align: 'center' });
        doc.text('GST', xGst + gstW / 2, y + 3.5, { align: 'center' });
        doc.text('Rate', xGst + gstW / 2, y + 7, { align: 'center' });
        doc.text('Quantity', xQty + qtyW / 2, y + 5.5, { align: 'center' });
        doc.text('Rate', xRate + rateW / 2, y + 5.5, { align: 'center' });
        doc.text('per', xPer + perW / 2, y + 5.5, { align: 'center' });
        doc.text('Amount', xAmt + amtW / 2, y + 5.5, { align: 'center' });
        y += hH;

        // ITEMS DATA
        const itemsStart = y;
        doc.setFontSize(9);
        let sn = 1;
        let iy2 = y + 4;

        const bsf = parseFloat(inv.booking_service_fee) || 0;
        const hotel = parseFloat(inv.hotel_reimbursement) || 0;
        const gstRateVal = parseFloat(inv.booking_service_gst_rate) || 18;
        const taxAmt = parseFloat(inv.taxable_amount) || bsf;
        const cgstA = parseFloat(inv.cgst_amount) || 0;
        const sgstA = parseFloat(inv.sgst_amount) || 0;
        const igstA = parseFloat(inv.igst_amount) || 0;
        const totalT = parseFloat(inv.total_tax) || (cgstA + sgstA + igstA);
        const grandT = parseFloat(inv.grand_total) || 0;

        const descMaxWidth = partW - 4;

        if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
            for (let i = 0; i < inv.items.length; i++) {
                const item = inv.items[i];
                const amount = parseFloat(item.amount) || 0;
                if (amount <= 0) continue;

                const svc = getServiceInfo(item.type);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(String(sn++), xSl + slW / 2, iy2, { align: 'center' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                let desc = item.description || svc.name || 'Service';
                const wrappedDesc = wrapText(doc, desc, descMaxWidth);
                
                doc.text(wrappedDesc[0], xPart + 2, iy2);
                
                if (wrappedDesc.length > 1) {
                    for (let j = 1; j < Math.min(wrappedDesc.length, 2); j++) {
                        iy2 += 3.5;
                        doc.text(wrappedDesc[j], xPart + 2, iy2);
                    }
                }

                if (item.details && item.details.trim()) {
                    iy2 += 3.5;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    const wrappedDetails = wrapText(doc, item.details, descMaxWidth);
                    doc.text(wrappedDetails[0], xPart + 2, iy2);
                    if (wrappedDetails.length > 1) {
                        iy2 += 3;
                        doc.text(fitText(doc, wrappedDetails[1], descMaxWidth), xPart + 2, iy2);
                    }
                }

                if (item.is_pure_agent) {
                    iy2 += 3;
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(6.5);
                    doc.setTextColor(100);
                    doc.text('(Pure Agent - Reimbursement)', xPart + 2, iy2);
                    doc.setTextColor(0);
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                if (!item.is_pure_agent && item.gst_rate > 0) {
                    doc.text(item.gst_rate + ' %', xGst + gstW / 2, iy2, { align: 'center' });
                }

                doc.setFont('helvetica', 'bold');
                doc.text(formatNum(amount), RE - 2, iy2, { align: 'right' });

                iy2 += 5;
            }

            // GST breakdown
            if (inv.gst_type === 'CGST_SGST' && cgstA > 0) {
                iy2 += 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('OUTPUT C-GST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(cgstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
                doc.text('OUTPUT S-GST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(sgstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            } else if (inv.gst_type === 'IGST' && igstA > 0) {
                iy2 += 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('IGST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(igstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            } else if (inv.gst_type === 'EXPORT') {
                iy2 += 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('IGST (Zero Rated)', xGst - 3, iy2, { align: 'right' });
                doc.text('0.00', RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            }
        } else {
            // Legacy format
            if (bsf > 0) {
                doc.setFont('helvetica', 'normal');
                doc.text(String(sn++), xSl + slW / 2, iy2, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.text('BOOKING SERVICE FEE', xPart + 2, iy2);
                doc.setFont('helvetica', 'normal');
                doc.text(gstRateVal + ' %', xGst + gstW / 2, iy2, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.text(formatNum(bsf), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            }
            if (hotel > 0) {
                doc.setFont('helvetica', 'normal');
                doc.text(String(sn++), xSl + slW / 2, iy2, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.text('HOTEL REIMBURSEMENT (Pure Agent)', xPart + 2, iy2);
                doc.text(formatNum(hotel), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            }
            if (inv.gst_type === 'CGST_SGST' && cgstA > 0) {
                doc.setFont('helvetica', 'bold');
                doc.text('OUTPUT C-GST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(cgstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
                doc.text('OUTPUT S-GST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(sgstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            } else if (inv.gst_type === 'IGST' && igstA > 0) {
                doc.setFont('helvetica', 'bold');
                doc.text('IGST', xGst - 3, iy2, { align: 'right' });
                doc.text(formatNum(igstA), RE - 2, iy2, { align: 'right' });
                iy2 += 5;
            }
        }

        // ⭐ ROUND OFF (Fixed — no "Less", show + or - sign)
        if (inv.round_off && inv.round_off !== 0) {
            iy2 += 1;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('ROUND OFF', xPart + 2, iy2);
            
            // Show + or - sign before amount
            const roVal = parseFloat(inv.round_off);
            const roText = roVal >= 0 
                ? '(+) ' + Math.abs(roVal).toFixed(2)
                : '(-) ' + Math.abs(roVal).toFixed(2);
            
            doc.text(roText, RE - 2, iy2, { align: 'right' });
            iy2 += 5;
        }

        y = Math.max(iy2, itemsStart + 75);
        const itemsH = y - itemsStart;
        box(xSl, itemsStart, slW, itemsH);
        box(xPart, itemsStart, partW, itemsH);
        box(xGst, itemsStart, gstW, itemsH);
        box(xQty, itemsStart, qtyW, itemsH);
        box(xRate, itemsStart, rateW, itemsH);
        box(xPer, itemsStart, perW, itemsH);
        box(xAmt, itemsStart, amtW, itemsH);

        // TOTAL ROW
        const tH = 6;
        box(xSl, y, slW, tH);
        box(xPart, y, partW, tH);
        box(xGst, y, gstW, tH);
        box(xQty, y, qtyW, tH);
        box(xRate, y, rateW, tH);
        box(xPer, y, perW, tH);
        box(xAmt, y, amtW, tH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('Total', xQty + qtyW - 2, y + 4, { align: 'right' });
        doc.text('Rs.' + formatNum(grandT), RE - 2, y + 4, { align: 'right' });
        y += tH;

        // AMOUNT IN WORDS
        const wH = 7;
        box(ML, y, CW, wH);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Amount Chargeable (in words):', ML + 2, y + 4.5);
        doc.setFont('helvetica', 'bold');
        const amtWords = inv.amount_in_words || numberToWords(grandT);
        doc.text(fitText(doc, amtWords, CW - 65), ML + 55, y + 4.5);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.text('E. & O.E', RE - 2, y + 4.5, { align: 'right' });
        y += wH;

        // NON-TAX CHECK
        const isNonTax = (inv.invoice_format === 'non_tax') ||
                         (settings.invoice_type === 'Invoice') ||
                         (settings.invoice_type === 'Quotation') ||
                         (settings.invoice_type === 'Proforma Invoice');

        if (!isNonTax) {
            // TAX ANALYSIS TITLE
            const taxTitleH = 5;
            box(ML, y, CW, taxTitleH);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Tax Analysis', PW / 2, y + 3.5, { align: 'center' });
            y += taxTitleH;

            const isCGST = inv.gst_type === 'CGST_SGST';
            const isExport = inv.gst_type === 'EXPORT';
            const dataH = 5;

            const hsnGroups = {};
            if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
                for (let i = 0; i < inv.items.length; i++) {
                    const item = inv.items[i];
                    const amount = parseFloat(item.amount) || 0;
                    if (amount <= 0 || item.is_pure_agent) continue;

                    const hsn = item.hsn || '998552';
                    const rate = parseFloat(item.gst_rate) || 18;
                    const key = hsn + '_' + rate;

                    if (!hsnGroups[key]) {
                        hsnGroups[key] = { hsn: hsn, rate: rate, taxable: 0, cgst_amt: 0, sgst_amt: 0, igst_amt: 0, total_tax: 0 };
                    }
                    const gstCalc = calculateGST(amount, rate, inv.gst_type);
                    hsnGroups[key].taxable += amount;
                    hsnGroups[key].cgst_amt += gstCalc.cgst_amount;
                    hsnGroups[key].sgst_amt += gstCalc.sgst_amount;
                    hsnGroups[key].igst_amt += gstCalc.igst_amount;
                    hsnGroups[key].total_tax += gstCalc.total_tax;
                }
            } else {
                if (taxAmt > 0) {
                    const key = (inv.hsn_code || '998552') + '_' + gstRateVal;
                    hsnGroups[key] = { hsn: inv.hsn_code || '998552', rate: gstRateVal, taxable: taxAmt, cgst_amt: cgstA, sgst_amt: sgstA, igst_amt: igstA, total_tax: totalT };
                }
            }

            const hsnRows = Object.values(hsnGroups);

            if (isCGST) {
                const w1 = 30, w2 = 28, w3 = 18, w4 = 24, w5 = 18, w6 = 24, w7 = 48;
                const x1 = ML, x2 = x1 + w1, x3 = x2 + w2, x4 = x3 + w3;
                const x5 = x4 + w4, x6 = x5 + w5, x7 = x6 + w6;
                const headerTop = 4.5, headerBot = 4.5;

                box(x1, y, w1, headerTop + headerBot);
                box(x2, y, w2, headerTop + headerBot);
                box(x3, y, w3 + w4, headerTop);
                box(x5, y, w5 + w6, headerTop);
                box(x7, y, w7, headerTop + headerBot);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('HSN/SAC', x1 + w1 / 2, y + (headerTop + headerBot) / 2 + 1, { align: 'center' });
                doc.text('Taxable', x2 + w2 / 2, y + 3, { align: 'center' });
                doc.text('Value', x2 + w2 / 2, y + 6.5, { align: 'center' });
                doc.text('CGST', x3 + (w3 + w4) / 2, y + 3, { align: 'center' });
                doc.text('SGST/UTGST', x5 + (w5 + w6) / 2, y + 3, { align: 'center' });
                doc.text('Total', x7 + w7 / 2, y + 3, { align: 'center' });
                doc.text('Tax Amount', x7 + w7 / 2, y + 6.5, { align: 'center' });

                y += headerTop;

                box(x3, y, w3, headerBot);
                box(x4, y, w4, headerBot);
                box(x5, y, w5, headerBot);
                box(x6, y, w6, headerBot);
                doc.text('Rate', x3 + w3 / 2, y + 3, { align: 'center' });
                doc.text('Amount', x4 + w4 / 2, y + 3, { align: 'center' });
                doc.text('Rate', x5 + w5 / 2, y + 3, { align: 'center' });
                doc.text('Amount', x6 + w6 / 2, y + 3, { align: 'center' });
                y += headerBot;

                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                for (let i = 0; i < hsnRows.length; i++) {
                    const row = hsnRows[i];
                    const half = row.rate / 2;
                    box(x1, y, w1, dataH); box(x2, y, w2, dataH); box(x3, y, w3, dataH);
                    box(x4, y, w4, dataH); box(x5, y, w5, dataH); box(x6, y, w6, dataH); box(x7, y, w7, dataH);
                    doc.text(fitText(doc, row.hsn, w1 - 4), x1 + 2, y + 3.5);
                    doc.text(formatNum(row.taxable), x2 + w2 - 2, y + 3.5, { align: 'right' });
                    doc.text(half + '%', x3 + w3 / 2, y + 3.5, { align: 'center' });
                    doc.text(formatNum(row.cgst_amt), x4 + w4 - 2, y + 3.5, { align: 'right' });
                    doc.text(half + '%', x5 + w5 / 2, y + 3.5, { align: 'center' });
                    doc.text(formatNum(row.sgst_amt), x6 + w6 - 2, y + 3.5, { align: 'right' });
                    doc.text(formatNum(row.total_tax), x7 + w7 - 2, y + 3.5, { align: 'right' });
                    y += dataH;
                }

                box(x1, y, w1, dataH); box(x2, y, w2, dataH); box(x3, y, w3, dataH);
                box(x4, y, w4, dataH); box(x5, y, w5, dataH); box(x6, y, w6, dataH); box(x7, y, w7, dataH);
                doc.setFont('helvetica', 'bold');
                doc.text('Total', x2 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(taxAmt), x2 + w2 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(cgstA), x4 + w4 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(sgstA), x6 + w6 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(totalT), x7 + w7 - 2, y + 3.5, { align: 'right' });
                y += dataH;

            } else {
                const w1 = 35, w2 = 35, w3 = 25, w4 = 45, w5 = 50;
                const x1 = ML, x2 = x1 + w1, x3 = x2 + w2, x4 = x3 + w3, x5 = x4 + w4;
                const headerTop = 4.5, headerBot = 4.5;

                box(x1, y, w1, headerTop + headerBot);
                box(x2, y, w2, headerTop + headerBot);
                box(x3, y, w3 + w4, headerTop);
                box(x5, y, w5, headerTop + headerBot);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('HSN/SAC', x1 + w1 / 2, y + (headerTop + headerBot) / 2 + 1, { align: 'center' });
                doc.text('Taxable', x2 + w2 / 2, y + 3, { align: 'center' });
                doc.text('Value', x2 + w2 / 2, y + 6.5, { align: 'center' });
                doc.text(isExport ? 'IGST (Zero Rated)' : 'IGST', x3 + (w3 + w4) / 2, y + 3, { align: 'center' });
                doc.text('Total', x5 + w5 / 2, y + 3, { align: 'center' });
                doc.text('Tax Amount', x5 + w5 / 2, y + 6.5, { align: 'center' });

                y += headerTop;

                box(x3, y, w3, headerBot);
                box(x4, y, w4, headerBot);
                doc.text('Rate', x3 + w3 / 2, y + 3, { align: 'center' });
                doc.text('Amount', x4 + w4 / 2, y + 3, { align: 'center' });
                y += headerBot;

                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                for (let i = 0; i < hsnRows.length; i++) {
                    const row = hsnRows[i];
                    box(x1, y, w1, dataH); box(x2, y, w2, dataH); box(x3, y, w3, dataH);
                    box(x4, y, w4, dataH); box(x5, y, w5, dataH);
                    doc.text(fitText(doc, row.hsn, w1 - 4), x1 + 2, y + 3.5);
                    doc.text(formatNum(row.taxable), x2 + w2 - 2, y + 3.5, { align: 'right' });
                    if (isExport) {
                        doc.text('0%', x3 + w3 / 2, y + 3.5, { align: 'center' });
                        doc.text('0.00', x4 + w4 - 2, y + 3.5, { align: 'right' });
                    } else {
                        doc.text(row.rate + '%', x3 + w3 / 2, y + 3.5, { align: 'center' });
                        doc.text(formatNum(row.igst_amt), x4 + w4 - 2, y + 3.5, { align: 'right' });
                    }
                    doc.text(formatNum(row.total_tax), x5 + w5 - 2, y + 3.5, { align: 'right' });
                    y += dataH;
                }

                box(x1, y, w1, dataH); box(x2, y, w2, dataH); box(x3, y, w3, dataH);
                box(x4, y, w4, dataH); box(x5, y, w5, dataH);
                doc.setFont('helvetica', 'bold');
                doc.text('Total', x2 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(taxAmt), x2 + w2 - 2, y + 3.5, { align: 'right' });
                if (isExport) doc.text('0.00', x4 + w4 - 2, y + 3.5, { align: 'right' });
                else doc.text(formatNum(igstA), x4 + w4 - 2, y + 3.5, { align: 'right' });
                doc.text(formatNum(totalT), x5 + w5 - 2, y + 3.5, { align: 'right' });
                y += dataH;
            }
        }

        // BANK DETAILS
        const bankH = 26;
        const halfW = CW / 2;
        box(ML, y, halfW, bankH);
        box(ML + halfW, y, halfW, bankH);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        if (!isNonTax) {
            doc.text('Tax Amount (in words):', ML + 2, y + 4);
            const taxWordsText = inv.tax_amount_in_words || numberToWords(totalT);
            const twWrapped = wrapText(doc, taxWordsText, halfW - 5);
            doc.text(twWrapped.slice(0, 3), ML + 2, y + 8.5);
        } else {
            doc.text('Notes:', ML + 2, y + 4);
            if (inv.notes) {
                doc.setFont('helvetica', 'normal');
                const notesWrap = wrapText(doc, inv.notes, halfW - 5);
                doc.text(notesWrap.slice(0, 3), ML + 2, y + 8.5);
            }
        }

        const bx = ML + halfW + 3;
        const bankW = halfW - 6;
        doc.setFont('helvetica', 'bold');
        doc.text("Company's Bank Details", bx, y + 4);
        doc.setFontSize(8);
        let yb = y + 8.5;
        doc.setFont('helvetica', 'normal');
        doc.text("A/c Holder's Name:", bx, yb);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, settings.bank_account_name || '', bankW - 32), bx + 32, yb);
        yb += 4;
        doc.setFont('helvetica', 'normal');
        doc.text("Bank Name:", bx, yb);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, settings.bank_name || '', bankW - 32), bx + 32, yb);
        yb += 4;
        doc.setFont('helvetica', 'normal');
        doc.text("A/c No.:", bx, yb);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, settings.bank_account_no || '', bankW - 32), bx + 32, yb);
        yb += 4;
        doc.setFont('helvetica', 'normal');
        doc.text("Branch & IFS:", bx, yb);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, (settings.bank_branch || '') + ' & ' + (settings.bank_ifsc || ''), bankW - 32), bx + 32, yb);
        y += bankH;

        // DECLARATION
        const declH = 18;
        box(ML, y, CW, declH);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Declaration', ML + 2, y + 4);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        const declWrapped = wrapText(doc, settings.declaration || '', CW - 55);
        doc.text(declWrapped.slice(0, 3), ML + 2, y + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(fitText(doc, 'for ' + (settings.company_name || 'TRIPZAR HOLIDAYS LLP'), 50), RE - 2, y + declH - 3, { align: 'right' });
        y += declH;

        // SIGNATURES
        const sigH = 15;
        box(ML, y, CW, sigH);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Customer's Seal and Signature", ML + 2, y + sigH - 2);
        doc.text('Authorised Signatory', RE - 2, y + sigH - 2, { align: 'right' });
        y += sigH;

        // FOOTER
        const footH = 6;
        box(ML, y, CW, footH);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a Computer Generated Invoice', PW / 2, y + 4, { align: 'center' });

        // OUTPUT
        const cleanName = (inv.customer_name || 'Invoice').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
        const cleanInvNo = (inv.invoice_number || 'INV').replace(/\//g, '_');
        const fn = cleanName + '_' + cleanInvNo + '.pdf';

        if (action === 'print') {
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) win.addEventListener('load', function() { setTimeout(function() { win.print(); }, 500); });
            showToast('Print dialog opening...', 'info');
            return blob;
        } else if (action === 'blob') {
            return doc.output('blob');
        } else {
            doc.save(fn);
            showToast('📥 PDF Downloaded!', 'success');
            return doc.output('blob');
        }
    } catch (error) {
        console.error('PDF Error:', error);
        showToast('❌ PDF Error: ' + error.message, 'error');
        throw error;
    }
}
