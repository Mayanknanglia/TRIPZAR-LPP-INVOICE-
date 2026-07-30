/* =============================================
   ITINERARY PDF GENERATOR v1.0
   Professional Branded PDF for Tour Quotations
   ============================================= */

const ItineraryPDF = {

    generate(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) { showToast('Itinerary not found!', 'error'); return; }

        const settings = DB.getSettings();
        showToast('📄 Generating PDF...', 'info');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageW  = 210;
            const pageH  = 297;
            const margin = 13;
            const cW     = pageW - margin * 2; // content width
            let y        = 0;

            // ── Color palette ──
            const C = {
                primary   : [26,  86,  50],
                accent    : [245, 158, 11],
                dark      : [25,  25,  25],
                gray      : [100, 100, 100],
                lightGray : [220, 220, 220],
                white     : [255, 255, 255],
                bgLight   : [245, 250, 247],
                green     : [34,  197, 94],
                red       : [220, 38,  38],
                purple    : [124, 58,  237],
            };

            // ════════════════════════════════════════
            // PAGE 1
            // ════════════════════════════════════════

            // ── Header background ──
            doc.setFillColor(...C.primary);
            doc.rect(0, 0, pageW, 54, 'F');

            // ── Diagonal accent strip ──
            doc.setFillColor(...C.accent);
            doc.rect(0, 51, pageW, 3, 'F');

            // ── Logo ──
            let logoX = margin;
            const logoData = settings.logo_data;
            if (logoData) {
                try {
                    doc.addImage(logoData, 'PNG', margin, 8, 30, 30);
                    logoX = margin + 34;
                } catch(e) { logoX = margin; }
            }

            // ── Company info ──
            doc.setTextColor(...C.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.text(settings.company_name || 'TRIPZAR HOLIDAYS LLP', logoX, 17);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(200, 230, 210);

            const addr = [
                settings.building, settings.street,
                settings.area, settings.city,
                settings.state, settings.pincode
            ].filter(Boolean).join(', ');

            doc.text(addr, logoX, 24);
            doc.text(
                `GSTIN: ${settings.gstin||''}   PAN: ${settings.pan||''}   LLPIN: ${settings.llpin||''}`,
                logoX, 30
            );
            doc.text(
                `📞 ${settings.phone||''}   ✉ ${settings.email||''}   🌐 ${settings.website||''}`,
                logoX, 36
            );
            if (settings.udyam) {
                doc.text(`UDYAM: ${settings.udyam}`, logoX, 42);
            }

            // ── Document type badge (top-right) ──
            doc.setFillColor(...C.accent);
            doc.roundedRect(pageW - margin - 48, 9, 48, 20, 3, 3, 'F');
            doc.setTextColor(...C.dark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('TOUR ITINERARY', pageW - margin - 24, 17, { align: 'center' });
            doc.text('& QUOTATION', pageW - margin - 24, 24, { align: 'center' });

            y = 60;

            // ── Quotation info strip ──
            doc.setFillColor(...C.bgLight);
            doc.roundedRect(margin, y, cW, 20, 3, 3, 'F');
            doc.setDrawColor(...C.primary);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, cW, 20, 3, 3, 'S');

            const infoFields = [
                ['Quotation No', itin.itin_number || ''],
                ['Date', itin.itin_date ? this.fmtDate(itin.itin_date) : ''],
                ['Valid Till', itin.valid_till ? this.fmtDate(itin.valid_till) : 'N/A'],
                ['Status', (itin.status || 'Draft').toUpperCase()],
            ];
            const iColW = cW / 4;
            infoFields.forEach(([label, value], i) => {
                const cx = margin + i * iColW + iColW / 2;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(...C.gray);
                doc.text(label, cx, y + 7, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(...C.dark);
                doc.text(value, cx, y + 15, { align: 'center' });
                if (i < 3) {
                    doc.setDrawColor(...C.lightGray);
                    doc.setLineWidth(0.3);
                    doc.line(
                        margin + (i+1)*iColW, y+4,
                        margin + (i+1)*iColW, y+16
                    );
                }
            });

            y += 26;

            // ── Two-column: Customer | Tour ──
            const colW = (cW - 5) / 2;
            const col2 = margin + colW + 5;

            // Customer header
            doc.setFillColor(...C.primary);
            doc.roundedRect(margin, y, colW, 7, 2, 2, 'F');
            doc.setTextColor(...C.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('  👤  CUSTOMER DETAILS', margin + 3, y + 5);

            // Tour header
            doc.setFillColor(...C.accent);
            doc.roundedRect(col2, y, colW, 7, 2, 2, 'F');
            doc.setTextColor(...C.dark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('  ✈   TOUR DETAILS', col2 + 3, y + 5);

            y += 9;
            const boxH = 38;

            // Customer box
            doc.setFillColor(250, 253, 251);
            doc.roundedRect(margin, y, colW, boxH, 2, 2, 'F');
            doc.setDrawColor(...C.lightGray);
            doc.roundedRect(margin, y, colW, boxH, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...C.dark);
            doc.text(itin.customer_name || 'Walk-in Customer', margin + 4, y + 9);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...C.gray);
            let cy2 = y + 17;
            if (itin.customer_phone) {
                doc.text(`📞  ${itin.customer_phone}`, margin+4, cy2);
                cy2 += 7;
            }
            if (itin.customer_email) {
                doc.text(`✉   ${itin.customer_email}`, margin+4, cy2);
                cy2 += 7;
            }
            if (itin.customer_city) {
                doc.text(`📍  ${itin.customer_city}`, margin+4, cy2);
            }

            // Tour box
            doc.setFillColor(255, 253, 245);
            doc.roundedRect(col2, y, colW, boxH, 2, 2, 'F');
            doc.setDrawColor(...C.lightGray);
            doc.roundedRect(col2, y, colW, boxH, 2, 2, 'S');

            const nights = itin.nights || 0;
            const tDays  = nights ? parseInt(nights)+1 : 0;
            const tourRows = [
                ['🌍 Destination', itin.destination || 'N/A'],
                ['🏷️ Tour Type',   itin.tour_type   || 'N/A'],
                ['📅 Travel Date', itin.travel_date  
                    ? this.fmtDate(itin.travel_date) : 'TBD'],
                ['🔄 Return Date', itin.return_date  
                    ? this.fmtDate(itin.return_date) : 'TBD'],
                ['🌙 Duration',    `${nights}N / ${tDays}D`],
                ['🏨 Hotel',       itin.hotel || 'As per itinerary'],
            ];
            let ty2 = y + 8;
            tourRows.forEach(([lbl, val]) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...C.gray);
                doc.text(lbl, col2+4, ty2);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...C.dark);
                // truncate if too long
                const maxVal = doc.splitTextToSize(val, colW - 40);
                doc.text(maxVal[0], col2+colW-4, ty2, { align:'right' });
                ty2 += 6;
            });

            y += boxH + 4;

            // ── Pax strip ──
            doc.setFillColor(...C.primary);
            doc.roundedRect(margin, y, cW, 11, 2, 2, 'F');
            const totalPax = (itin.adults||1) + (itin.children||0) || 1;
            const paxStr = [
                `👨‍👩 Adults: ${itin.adults||0}`,
                `👦 Children: ${itin.children||0}`,
                `👶 Infants: ${itin.infants||0}`,
                `💰 Per Person: ₹${this.fmtAmt((itin.grand_total||0)/totalPax)}`,
                `📦 Total Pax: ${totalPax}`,
            ];
            doc.setTextColor(...C.white);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            const pColW = cW / paxStr.length;
            paxStr.forEach((txt, i) => {
                doc.text(txt, margin + i*pColW + pColW/2, y+7.5, { align:'center' });
            });

            y += 17;

            // ════════════════════════════════════════
            // DAY-WISE ITINERARY
            // ════════════════════════════════════════
            if (itin.days && itin.days.length > 0) {
                y = this.sectionHeader(doc, C, margin, y, cW, '📅  DAY-WISE ITINERARY');
                y += 4;

                itin.days.forEach((day, idx) => {
                    // page break check
                    if (y > pageH - 45) {
                        doc.addPage();
                        y = this.contHeader(doc, settings, C, pageW, margin);
                    }

                    // Day badge row
                    doc.setFillColor(...C.accent);
                    doc.roundedRect(margin, y, 20, 7, 2, 2, 'F');
                    doc.setTextColor(...C.dark);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.text(`DAY ${day.day}`, margin+10, y+5, { align:'center' });

                    // Title
                    if (day.title) {
                        doc.setFillColor(248, 250, 248);
                        doc.roundedRect(margin+22, y, cW-22, 7, 2, 2, 'F');
                        doc.setDrawColor(...C.lightGray);
                        doc.roundedRect(margin+22, y, cW-22, 7, 2, 2, 'S');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8.5);
                        doc.setTextColor(...C.dark);
                        doc.text(day.title, margin+26, y+5);
                    }
                    y += 10;

                    // Activities
                    if (day.activities && day.activities.trim()) {
                        const lines = day.activities.split('\n').filter(l=>l.trim());
                        lines.forEach(line => {
                            if (y > pageH - 25) {
                                doc.addPage();
                                y = this.contHeader(doc, settings, C, pageW, margin);
                            }
                            const clean = line.replace(/^[•\-\*]\s*/,'');
                            const wrapped = doc.splitTextToSize(`• ${clean}`, cW-8);
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(8);
                            doc.setTextColor(...C.gray);
                            doc.text(wrapped, margin+6, y);
                            y += wrapped.length * 5;
                        });
                    }

                    // Separator
                    if (idx < itin.days.length-1) {
                        y += 2;
                        doc.setDrawColor(...C.lightGray);
                        doc.setLineWidth(0.3);
                        doc.line(margin, y, margin+cW, y);
                        y += 4;
                    } else {
                        y += 4;
                    }
                });
            }

            // ════════════════════════════════════════
            // INCLUSIONS / EXCLUSIONS
            // ════════════════════════════════════════
            if (itin.inclusions || itin.exclusions) {
                if (y > pageH - 60) {
                    doc.addPage();
                    y = this.contHeader(doc, settings, C, pageW, margin);
                }

                const hW = (cW - 5) / 2;
                const hCol2 = margin + hW + 5;

                // Headers
                doc.setFillColor(...C.green);
                doc.roundedRect(margin, y, hW, 7, 2, 2, 'F');
                doc.setTextColor(...C.white);
                doc.setFont('helvetica','bold');
                doc.setFontSize(7.5);
                doc.text('✅  INCLUSIONS', margin+4, y+5);

                doc.setFillColor(...C.red);
                doc.roundedRect(hCol2, y, hW, 7, 2, 2, 'F');
                doc.text('❌  EXCLUSIONS', hCol2+4, y+5);

                y += 9;

                const inclLines = (itin.inclusions||'').split('\n').filter(l=>l.trim());
                const exclLines = (itin.exclusions||'').split('\n').filter(l=>l.trim());
                const bH = Math.max(inclLines.length, exclLines.length) * 6 + 8;

                // Boxes
                doc.setFillColor(240, 253, 244);
                doc.roundedRect(margin, y, hW, bH, 2, 2, 'F');
                doc.setDrawColor(...C.green);
                doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, hW, bH, 2, 2, 'S');

                doc.setFillColor(254, 242, 242);
                doc.roundedRect(hCol2, y, hW, bH, 2, 2, 'F');
                doc.setDrawColor(...C.red);
                doc.roundedRect(hCol2, y, hW, bH, 2, 2, 'S');

                // Inclusions text
                doc.setFont('helvetica','normal');
                doc.setFontSize(7.5);
                doc.setTextColor(22,101,52);
                let iy = y+7;
                inclLines.forEach(line => {
                    const clean = line.replace(/^[✓✅•\-\*]\s*/,'');
                    const wrapped = doc.splitTextToSize(`✓ ${clean}`, hW-6);
                    doc.text(wrapped, margin+4, iy);
                    iy += wrapped.length * 5;
                });

                // Exclusions text
                doc.setTextColor(...C.red);
                let ey = y+7;
                exclLines.forEach(line => {
                    const clean = line.replace(/^[✗❌•\-\*]\s*/,'');
                    const wrapped = doc.splitTextToSize(`✗ ${clean}`, hW-6);
                    doc.text(wrapped, hCol2+4, ey);
                    ey += wrapped.length * 5;
                });

                y += bH + 8;
            }

            // ════════════════════════════════════════
            // PRICE BREAKDOWN
            // ════════════════════════════════════════
            if (y > pageH - 80) {
                doc.addPage();
                y = this.contHeader(doc, settings, C, pageW, margin);
            }

            y = this.sectionHeader(doc, C, margin, y, cW, '💰  PRICE BREAKDOWN');
            y += 6;

            if (itin.cost_items && itin.cost_items.length > 0) {
                const tW  = Math.min(cW, 130);
                const tX  = margin + (cW - tW) / 2;
                const amtW = 38;
                const lblW = tW - amtW - 4;

                // Table header
                doc.setFillColor(235, 245, 238);
                doc.roundedRect(tX, y, tW, 7, 2, 2, 'F');
                doc.setFont('helvetica','bold');
                doc.setFontSize(8);
                doc.setTextColor(...C.primary);
                doc.text('Service / Component', tX+4, y+5);
                doc.text('Amount (₹)', tX+tW-4, y+5, { align:'right' });
                y += 9;

                // Rows
                itin.cost_items.forEach((item, idx) => {
                    if (!item.label && !item.amount) return;
                    const rowH = 7;
                    doc.setFillColor(idx%2===0 ? 250:255, idx%2===0 ? 252:255,
                                     idx%2===0 ? 251:255);
                    doc.rect(tX, y-2, tW, rowH, 'F');
                    doc.setDrawColor(...C.lightGray);
                    doc.line(tX, y+rowH-2, tX+tW, y+rowH-2);

                    doc.setFont('helvetica','normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...C.dark);
                    doc.text(item.label||'', tX+4, y+3);
                    doc.setFont('helvetica','bold');
                    doc.text(
                        `₹ ${this.fmtAmt(item.amount||0)}`,
                        tX+tW-4, y+3, { align:'right' }
                    );
                    y += rowH;
                });

                y += 4;

                // Subtotal line
                doc.setDrawColor(...C.primary);
                doc.setLineWidth(0.5);
                doc.line(tX, y, tX+tW, y);
                y += 5;

                const totalRows = [];
                totalRows.push(['Subtotal', itin.subtotal||0, C.gray, false]);
                if (itin.discount > 0) {
                    totalRows.push([
                        'Discount', -(itin.discount), C.red, false
                    ]);
                }
                if (itin.gst_enabled) {
                    totalRows.push([
                        `GST @ ${itin.gst_rate}%`,
                        itin.gst_amount||0, C.gray, false
                    ]);
                }

                totalRows.forEach(([lbl, amt, clr, bold]) => {
                    doc.setFont('helvetica', bold ? 'bold':'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...clr);
                    doc.text(lbl, tX+4, y);
                    doc.setFont('helvetica','bold');
                    const sign = amt < 0 ? '-' : '';
                    doc.text(
                        `${sign}₹ ${this.fmtAmt(Math.abs(amt))}`,
                        tX+tW-4, y, { align:'right' }
                    );
                    y += 7;
                });

                // Grand Total box
                y += 2;
                doc.setFillColor(...C.primary);
                doc.roundedRect(tX, y, tW, 13, 2, 2, 'F');
                doc.setTextColor(...C.white);
                doc.setFont('helvetica','bold');
                doc.setFontSize(10);
                doc.text('GRAND TOTAL', tX+6, y+9);
                doc.setFontSize(11);
                doc.text(
                    `₹ ${this.fmtAmt(itin.grand_total||0)}`,
                    tX+tW-6, y+9, { align:'right' }
                );
                y += 17;

                // Per person note
                doc.setFont('helvetica','italic');
                doc.setFontSize(7.5);
                doc.setTextColor(...C.gray);
                doc.text(
                    `* Per person cost: ₹${this.fmtAmt((itin.grand_total||0)/totalPax)} `+
                    `(based on ${totalPax} pax)`,
                    tX + tW/2, y, { align:'center' }
                );
                y += 8;
            }

            // ════════════════════════════════════════
            // PAYMENT TERMS
            // ════════════════════════════════════════
            if (itin.payment_terms) {
                if (y > pageH - 30) {
                    doc.addPage();
                    y = this.contHeader(doc, settings, C, pageW, margin);
                }
                y += 4;
                doc.setFillColor(255, 251, 235);
                doc.roundedRect(margin, y, cW, 16, 2, 2, 'F');
                doc.setDrawColor(...C.accent);
                doc.setLineWidth(0.5);
                doc.roundedRect(margin, y, cW, 16, 2, 2, 'S');
                doc.setFont('helvetica','bold');
                doc.setFontSize(8);
                doc.setTextColor(...C.dark);
                doc.text('💳  Payment Terms:', margin+4, y+7);
                doc.setFont('helvetica','normal');
                doc.setTextColor(...C.gray);
                doc.text(itin.payment_terms, margin+4, y+13);
                y += 20;
            }

            // ════════════════════════════════════════
            // TERMS & CONDITIONS
            // ════════════════════════════════════════
            if (itin.terms) {
                if (y > pageH - 55) {
                    doc.addPage();
                    y = this.contHeader(doc, settings, C, pageW, margin);
                }

                y = this.sectionHeader(
                    doc, C, margin, y, cW, '📋  TERMS & CONDITIONS'
                );
                y += 4;

                const termLines = itin.terms.split('\n').filter(l=>l.trim());
                doc.setFont('helvetica','normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...C.gray);
                termLines.forEach(line => {
                    if (y > pageH - 28) {
                        doc.addPage();
                        y = this.contHeader(doc, settings, C, pageW, margin);
                    }
                    const wrapped = doc.splitTextToSize(line, cW-4);
                    doc.text(wrapped, margin+2, y);
                    y += wrapped.length * 5;
                });
                y += 4;
            }

            // ════════════════════════════════════════
            // BANK DETAILS
            // ════════════════════════════════════════
            if (y > pageH - 45) {
                doc.addPage();
                y = this.contHeader(doc, settings, C, pageW, margin);
            }
            y += 6;

            doc.setFillColor(...C.bgLight);
            doc.roundedRect(margin, y, cW, 28, 2, 2, 'F');
            doc.setDrawColor(...C.primary);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, cW, 28, 2, 2, 'S');

            doc.setFont('helvetica','bold');
            doc.setFontSize(8);
            doc.setTextColor(...C.primary);
            doc.text('🏦  BANK DETAILS FOR PAYMENT', margin+4, y+8);

            doc.setFont('helvetica','normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...C.dark);
            doc.text(
                `Bank: ${settings.bank_name||''}   |   ` +
                `A/c No: ${settings.bank_account_no||''}   |   ` +
                `IFSC: ${settings.bank_ifsc||''}`,
                margin+4, y+16
            );
            doc.text(
                `Branch: ${settings.bank_branch||''}   |   ` +
                `Account Name: ${settings.bank_account_name||''}`,
                margin+4, y+23
            );

            y += 34;

            // ════════════════════════════════════════
            // FOOTER on all pages
            // ════════════════════════════════════════
            this.addFooterAllPages(doc, settings, C, pageW, pageH, margin);

            // ── Page numbers ──
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont('helvetica','normal');
                doc.setFontSize(7);
                doc.setTextColor(...C.gray);
                doc.text(
                    `Page ${i} of ${totalPages}`,
                    pageW/2, pageH-6, { align:'center' }
                );
            }

            // ── Save PDF ──
            const safeName = (
                `Itinerary_${itin.itin_number}_` +
                `${itin.customer_name||'Customer'}_` +
                `${itin.destination||'Tour'}`
            ).replace(/[^a-zA-Z0-9_\-]/g,'_') + '.pdf';

            doc.save(safeName);
            showToast('✅ PDF Downloaded!', 'success');

        } catch(err) {
            console.error('ItineraryPDF Error:', err);
            showToast('❌ PDF Error: ' + err.message, 'error');
        }
    },

    // ─────────────────────────────────────
    // Section Header Helper
    // ─────────────────────────────────────
    sectionHeader(doc, C, margin, y, cW, title) {
        doc.setFillColor(...C.primary);
        doc.roundedRect(margin, y, cW, 8, 2, 2, 'F');
        doc.setTextColor(...C.white);
        doc.setFont('helvetica','bold');
        doc.setFontSize(8.5);
        doc.text(title, margin+4, y+5.5);
        return y + 12;
    },

    // ─────────────────────────────────────
    // Continuation Header (page 2+)
    // ─────────────────────────────────────
    contHeader(doc, settings, C, pageW, margin) {
        doc.setFillColor(...C.primary);
        doc.rect(0, 0, pageW, 15, 'F');
        doc.setFillColor(...C.accent);
        doc.rect(0, 15, pageW, 1.5, 'F');

        doc.setTextColor(...C.white);
        doc.setFont('helvetica','bold');
        doc.setFontSize(9);
        doc.text(
            settings.company_name || 'TRIPZAR HOLIDAYS LLP',
            margin, 10
        );
        doc.setFont('helvetica','normal');
        doc.setFontSize(7.5);
        doc.text(
            'TOUR ITINERARY & QUOTATION (Continued)',
            pageW - margin, 10, { align:'right' }
        );
        return 22;
    },

    // ─────────────────────────────────────
    // Footer on All Pages
    // ─────────────────────────────────────
    addFooterAllPages(doc, settings, C, pageW, pageH, margin) {
        const total = doc.internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);

            // Footer bar
            doc.setFillColor(...C.primary);
            doc.rect(0, pageH-18, pageW, 18, 'F');
            doc.setFillColor(...C.accent);
            doc.rect(0, pageH-18, pageW, 1.5, 'F');

            // Company name left
            doc.setTextColor(...C.white);
            doc.setFont('helvetica','bold');
            doc.setFontSize(7.5);
            doc.text(
                settings.company_name || 'TRIPZAR HOLIDAYS LLP',
                margin, pageH-9
            );

            // Contact center
            doc.setFont('helvetica','normal');
            doc.setFontSize(6.5);
            doc.setTextColor(200, 230, 210);
            doc.text(
                `${settings.phone||''}  |  ${settings.email||''}  |  ${settings.website||''}`,
                pageW/2, pageH-9, { align:'center' }
            );

            // Tagline right
            doc.setFont('helvetica','italic');
            doc.setFontSize(7);
            doc.setTextColor(...C.accent);
            doc.text('Explore Beyond Ordinary ✈', pageW-margin, pageH-9, { align:'right' });

            // Fine print
            doc.setFont('helvetica','normal');
            doc.setFontSize(6);
            doc.setTextColor(170, 210, 185);
            doc.text(
                'This is a computer-generated document. ' +
                'For queries, please contact us at the above details.',
                pageW/2, pageH-3, { align:'center' }
            );
        }
    },

    // ─────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────
    fmtDate(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day:'2-digit', month:'short', year:'numeric'
            });
        } catch(e) { return dateStr; }
    },

    fmtAmt(num) {
        return Number(num||0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
};
