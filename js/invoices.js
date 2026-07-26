/* =============================================
   INVOICES v12 - Round Off (Add/Less) + No Discount
   ============================================= */

let invoiceSearchQuery = '';
let invoiceFilters = { financial_year: '', payment_status: '' };
let editingInvoiceId = null;
let invoiceItems = [];

const SERVICE_TYPES = {
    'flight_domestic':     { name: 'Flight (Domestic)',      icon: '✈️', hsn: '996411', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'flight_intl':         { name: 'Flight (International)', icon: '🛫', hsn: '996411', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'train':               { name: 'Train Ticket',           icon: '🚂', hsn: '996412', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'bus':                 { name: 'Bus Ticket',             icon: '🚌', hsn: '996413', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'cab':                 { name: 'Cab / Taxi',             icon: '🚕', hsn: '996423', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'airport_transfer':    { name: 'Airport Transfer',       icon: '🚐', hsn: '996423', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'car_rental':          { name: 'Car Rental',             icon: '🚗', hsn: '996601', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'bike_rental':         { name: 'Bike Rental',            icon: '🏍️', hsn: '996601', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'ferry':               { name: 'Ferry / Boat',           icon: '⛴️', hsn: '996414', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'charter':             { name: 'Private Charter',        icon: '🛩️', hsn: '996411', cat: 'Transport',      isPureAgent: true,  defaultGst: 0 },
    'hotel':               { name: 'Hotel Booking',          icon: '🏨', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'resort':              { name: 'Resort Booking',         icon: '🏝️', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'homestay':            { name: 'Homestay',               icon: '🏡', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'villa':               { name: 'Villa Rental',           icon: '🏛️', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'hostel':              { name: 'Hostel',                 icon: '🛏️', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'serviced_apartment':  { name: 'Service Apartment',      icon: '🏢', hsn: '996311', cat: 'Accommodation',  isPureAgent: true,  defaultGst: 0 },
    'tour_package':        { name: 'Tour Package',           icon: '🗺️', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'sightseeing':         { name: 'Sightseeing',            icon: '🎫', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'adventure':           { name: 'Adventure Activity',     icon: '🧗', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'cruise':              { name: 'Cruise Booking',         icon: '🚢', hsn: '996314', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'safari':              { name: 'Safari / Wildlife',      icon: '🦁', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'cultural_show':       { name: 'Cultural Show',          icon: '🎭', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'theme_park':          { name: 'Theme Park',             icon: '🎢', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'water_sports':        { name: 'Water Sports',           icon: '🏄', hsn: '998552', cat: 'Tours',          isPureAgent: true,  defaultGst: 0 },
    'visa':                { name: 'Visa Fee',               icon: '📄', hsn: '998599', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'passport':            { name: 'Passport Services',      icon: '📔', hsn: '998599', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'insurance':           { name: 'Travel Insurance',       icon: '🛡️', hsn: '997136', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'forex':               { name: 'Forex / Currency',       icon: '💱', hsn: '997159', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'sim_card':            { name: 'SIM Card / WiFi',        icon: '📶', hsn: '998413', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'medical':             { name: 'Medical / Vaccination',  icon: '💉', hsn: '999312', cat: 'Documents',      isPureAgent: true,  defaultGst: 0 },
    'service_fee':         { name: 'Booking Service Fee',    icon: '💼', hsn: '998552', cat: 'Tripzar Fee',    isPureAgent: false, defaultGst: 18 },
    'consultation':        { name: 'Consultation Fee',       icon: '🎯', hsn: '998552', cat: 'Tripzar Fee',    isPureAgent: false, defaultGst: 18 },
    'cancellation':        { name: 'Cancellation Charges',   icon: '❌', hsn: '998552', cat: 'Tripzar Fee',    isPureAgent: false, defaultGst: 18 },
    'amendment':           { name: 'Amendment Charges',      icon: '✏️', hsn: '998552', cat: 'Tripzar Fee',    isPureAgent: false, defaultGst: 18 },
    'meals':               { name: 'Meals / Food',           icon: '🍽️', hsn: '996331', cat: 'Food & Misc',   isPureAgent: true,  defaultGst: 0 },
    'event_tickets':       { name: 'Event Tickets',          icon: '🎟️', hsn: '998554', cat: 'Food & Misc',   isPureAgent: true,  defaultGst: 0 },
    'shopping':            { name: 'Shopping Assistance',    icon: '🛍️', hsn: '998599', cat: 'Food & Misc',   isPureAgent: true,  defaultGst: 0 },
    'miscellaneous':       { name: 'Miscellaneous',          icon: '📌', hsn: '998599', cat: 'Food & Misc',   isPureAgent: true,  defaultGst: 0 },
    'custom':              { name: 'Custom Item',            icon: '✨', hsn: '998552', cat: 'Custom',         isPureAgent: false, defaultGst: 18 }
};

const SERVICE_CATEGORIES = [...new Set(Object.values(SERVICE_TYPES).map(s => s.cat))];

function renderInvoiceList() {
    const invoices = DB.searchInvoices(invoiceSearchQuery, invoiceFilters);
    const fys = [...new Set(DB.getActiveInvoices().map(i => i.financial_year))].filter(Boolean).sort().reverse();

    const container = document.getElementById('page-invoices');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Invoices</h1>
                <p>${invoices.length} invoices</p>
            </div>
                        <div class="btn-group">
                <button class="btn btn-secondary" onclick="exportExcel()">
                    <span class="material-icons-round">download</span> Excel
                </button>
                <button class="btn btn-secondary" onclick="exportInvoicesPDF()" style="background:#dc2626;color:white">
                    <span class="material-icons-round">picture_as_pdf</span> PDF
                </button>
                <button class="btn btn-primary" onclick="navigateTo('newInvoice')">
                    <span class="material-icons-round">add</span> New Invoice
                </button>
            </div>
        </div>

        <div class="filter-row">
            <input type="text" placeholder="🔍 Search..." value="${invoiceSearchQuery}" onkeyup="invoiceSearchQuery=this.value; renderInvoiceList()" style="flex:1">
            <select onchange="invoiceFilters.payment_status=this.value; renderInvoiceList()">
                <option value="">All Status</option>
                <option value="paid" ${invoiceFilters.payment_status==='paid'?'selected':''}>Paid</option>
                <option value="unpaid" ${invoiceFilters.payment_status==='unpaid'?'selected':''}>Unpaid</option>
                <option value="partial" ${invoiceFilters.payment_status==='partial'?'selected':''}>Partial</option>
            </select>
            <select onchange="invoiceFilters.financial_year=this.value; renderInvoiceList()">
                <option value="">All Years</option>
                ${fys.map(f => `<option value="${f}" ${invoiceFilters.financial_year===f?'selected':''}>FY ${f}</option>`).join('')}
            </select>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th class="hide-mobile">Date</th>
                            <th>Customer</th>
                            <th class="text-right hide-mobile">Total</th>
                            <th class="text-right hide-mobile">Profit</th>
                            <th class="text-center">Status</th>
                            <th class="text-center hide-mobile">Drive</th>
                            <th class="text-center hide-mobile">WA</th>
                            <th class="text-center hide-mobile">Email</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoices.length === 0 ? `
                            <tr><td colspan="10"><div class="empty-state"><span class="material-icons-round">receipt_long</span><p>No invoices</p><button class="btn btn-primary" onclick="navigateTo('newInvoice')">Create</button></div></td></tr>
                        ` : invoices.map(inv => {
                            const profit = (inv.grand_total || 0) - (inv.supplier_total || 0);
                            const pc = profit > 0 ? 'color:var(--success)' : profit < 0 ? 'color:var(--danger)' : '';
                            const driveIcon = inv.drive_file_url 
                                ? `<a href="${inv.drive_file_url}" target="_blank" onclick="event.stopPropagation()" title="Open in Drive" style="color:#4285F4"><span class="material-icons-round" style="font-size:18px">cloud_done</span></a>`
                                : `<span title="Not uploaded" style="color:#ccc"><span class="material-icons-round" style="font-size:18px">cloud_off</span></span>`;
                            const waIcon = inv.customer_phone 
                                ? `<button onclick="event.stopPropagation(); WhatsApp.sendInvoice('${inv.id}')" style="background:none;border:none;cursor:pointer;color:#25D366;padding:0" title="Send via WhatsApp">
                                     <span class="material-icons-round" style="font-size:20px">chat</span>
                                   </button>`
                                : `<span style="color:#ccc" title="No phone"><span class="material-icons-round" style="font-size:18px">phone_disabled</span></span>`;
                            const emailIcon = inv.customer_email 
                                ? `<button onclick="event.stopPropagation(); Email.sendInvoice('${inv.id}')" style="background:none;border:none;cursor:pointer;color:#EA4335;padding:0" title="Send via Email">
                                     <span class="material-icons-round" style="font-size:20px">email</span>
                                   </button>`
                                : `<span style="color:#ccc" title="No email"><span class="material-icons-round" style="font-size:18px">mail_outline</span></span>`;
                            return `
                            <tr onclick="viewInvoice('${inv.id}')" style="cursor:pointer">
                                <td><strong style="font-family:monospace;color:var(--primary);font-size:12px">${inv.invoice_number}</strong></td>
                                <td class="hide-mobile">${formatDate(inv.invoice_date)}</td>
                                <td>${toProperCase(inv.customer_name)}</td>
                                <td class="text-right hide-mobile"><strong>${formatCurrency(inv.grand_total)}</strong></td>
                                <td class="text-right hide-mobile" style="${pc};font-weight:700">${formatCurrency(profit)}</td>
                                <td class="text-center"><span class="badge ${inv.payment_status==='paid'?'badge-success':inv.payment_status==='partial'?'badge-warning':'badge-danger'}">${inv.payment_status}</span></td>
                                <td class="text-center hide-mobile">${driveIcon}</td>
                                <td class="text-center hide-mobile">${waIcon}</td>
                                <td class="text-center hide-mobile">${emailIcon}</td>
                                <td class="text-right" onclick="event.stopPropagation()">
                                    <div class="table-actions">
                                        <button class="btn-sm btn-view" onclick="viewInvoice('${inv.id}')">View</button>
                                        <button class="btn-sm btn-edit" onclick="editInvoice('${inv.id}')">Edit</button>
                                        <button class="btn-sm btn-copy" onclick="duplicateInvoice('${inv.id}')">Copy</button>
                                        <button class="btn-sm btn-del" onclick="deleteInvoiceAction('${inv.id}')">Del</button>
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

function renderInvoiceForm(prefillData = null) {
    editingInvoiceId = prefillData?.id || null;
    const isEdit = !!editingInvoiceId;
    const inv = prefillData || {};
    const customers = DB.getCustomers();
    const { invoiceNumber: autoInvNo, financialYear: autoFY } = isEdit 
        ? { invoiceNumber: inv.invoice_number, financialYear: inv.financial_year } 
        : DB.getNextInvoiceNumber();

    if (inv.items && inv.items.length > 0) {
        invoiceItems = JSON.parse(JSON.stringify(inv.items));
    } else if (isEdit) {
        invoiceItems = [];
        if (inv.booking_service_fee > 0) {
            invoiceItems.push({ id: generateId(), type: 'service_fee', description: 'Booking Service Fee', amount: inv.booking_service_fee, gst_rate: inv.booking_service_gst_rate || 18, is_pure_agent: false, hsn: '998552', details: '' });
        }
        if (inv.hotel_reimbursement > 0) {
            invoiceItems.push({ id: generateId(), type: 'hotel', description: 'Hotel Reimbursement', amount: inv.hotel_reimbursement, gst_rate: 0, is_pure_agent: true, hsn: '996311', details: '' });
        }
    } else {
        invoiceItems = [];
    }

    let quickAddHTML = '';
    SERVICE_CATEGORIES.forEach(cat => {
        const items = Object.entries(SERVICE_TYPES).filter(([k, v]) => v.cat === cat);
        quickAddHTML += `
            <div style="margin-bottom:10px">
                <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">${cat}</label>
                <div style="display:flex;flex-wrap:wrap;gap:5px">
                    ${items.map(([key, svc]) => `
                        <button type="button" class="btn-quick-add ${svc.isPureAgent ? '' : 'btn-quick-add-taxable'}" onclick="addItem('${key}')" title="${svc.name}">
                            ${svc.icon} ${svc.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    });

    const autoSaveStatus = (typeof Drive !== 'undefined' && Drive.AUTO_SAVE_ENABLED && Drive.isConfigured())
        ? `<div style="background:#e8f5e9;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#2e7d32;display:flex;align-items:center;gap:6px">
             <span class="material-icons-round" style="font-size:16px">cloud_done</span>
             <strong>Auto-Save ON:</strong> PDF automatically upload hoga Drive pe
           </div>`
        : '';

    const container = document.getElementById('page-newInvoice');
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>${isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
                <p>Auto: <strong style="color:var(--primary);font-family:monospace">${autoInvNo}</strong> (Edit below if needed)</p>
            </div>
            <button class="btn btn-secondary" onclick="navigateTo('invoices')">
                <span class="material-icons-round">arrow_back</span> Back
            </button>
        </div>

        ${autoSaveStatus}

        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--primary)">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">receipt</span> Invoice Details
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>
                        Invoice Number * 
                        <small style="color:var(--success);font-weight:normal">✨ Editable</small>
                    </label>
                    <div style="display:flex;gap:6px;align-items:center">
                        <input type="text" id="invNumber" value="${inv.invoice_number || autoInvNo}" 
                               placeholder="e.g. TZ/2026-27/001" 
                               style="font-family:monospace;font-weight:700;color:var(--primary);font-size:14px;flex:1"
                               ${isEdit ? 'readonly title="Cannot change existing invoice number"' : ''}>
                        ${!isEdit ? `
                            <button type="button" class="btn btn-sm btn-secondary" onclick="resetToAutoInvoice()" title="Reset to auto-generated">
                                <span class="material-icons-round">refresh</span>
                            </button>
                        ` : ''}
                    </div>
                    <small class="input-hint">${isEdit ? '🔒 Existing invoice number cannot be changed' : '💡 Auto-generated. You can customize if needed.'}</small>
                </div>
                <div class="form-group">
                    <label>Invoice Date *</label>
                    <input type="date" id="invDate" value="${inv.invoice_date || getTodayISO()}" required>
                </div>
                <div class="form-group">
                    <label>Financial Year</label>
                    <input type="text" id="invFY" value="${inv.financial_year || autoFY}" placeholder="e.g. 2026-27" style="font-family:monospace">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Customer *</label>
                    <select id="invCustomer" onchange="onCustomerSelect()">
                        <option value="">-- Select Customer --</option>
                        ${customers.map(c => `<option value="${c.id}" ${c.id === inv.customer_id ? 'selected' : ''}>${c.name} ${c.gst_no ? '('+c.gst_no+')' : ''}</option>`).join('')}
                    </select>
                    <small class="input-hint"><a href="#" onclick="navigateTo('customers'); return false;" style="color:var(--primary)">+ Add customer</a></small>
                </div>
                <div class="form-group">
                    <label>Invoice Format</label>
                    <select id="invFormat" onchange="recalculateAll()">
                        <option value="tax" ${(inv.invoice_format || 'tax') === 'tax' ? 'selected' : ''}>Tax Invoice (with GST)</option>
                        <option value="non_tax" ${inv.invoice_format === 'non_tax' ? 'selected' : ''}>Non-Tax Invoice</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Place of Supply</label>
                    <input type="text" id="invPlaceOfSupply" list="posList" value="${inv.place_of_supply || ''}" placeholder="State or Country" autocomplete="off" oninput="recalculateAll()">
                    <datalist id="posList">
                        ${Object.keys(INDIAN_STATES).map(s => `<option value="${s}">`).join('')}
                        ${COUNTRIES.map(c => `<option value="${c}">`).join('')}
                    </datalist>
                </div>
                <div class="form-group">
                    <label>GST Type (Auto) 🌍</label>
                    <input type="text" id="invGstType" readonly style="font-weight:600;color:var(--primary)">
                </div>
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px;border-left:4px solid var(--primary)">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">list_alt</span> Invoice Items
            </div>

            <details open style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:14px">
                <summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--primary);padding:4px 0">
                    ✨ Quick Add Services — <small style="color:var(--text-muted);font-weight:normal">Blue = Pure Agent | Green = Taxable</small>
                </summary>
                <div style="margin-top:12px">${quickAddHTML}</div>
            </details>

            <div id="itemsList"></div>

            <div style="display:flex;gap:8px;margin-top:12px">
                <button type="button" class="btn btn-secondary" onclick="addItem('custom')" style="flex:1;padding:12px;border:2px dashed var(--primary);color:var(--primary);background:transparent">
                    <span class="material-icons-round">add</span> Add Custom Item
                </button>
                <button type="button" class="btn btn-secondary" onclick="addItem('service_fee')" style="flex:1;padding:12px;border:2px dashed var(--success);color:var(--success);background:transparent">
                    <span class="material-icons-round">attach_money</span> Add Service Fee (GST)
                </button>
            </div>
        </div>

        <!-- ⭐ ROUND OFF (Add / Less) -->
        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">tune</span> Round Off
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Round Off Type</label>
                    <select id="invRoundOffType" onchange="recalculateAll()">
                        <option value="none" ${(!inv.round_off_type || inv.round_off_type === 'none') ? 'selected' : ''}>No Round Off</option>
                        <option value="add" ${inv.round_off_type === 'add' ? 'selected' : ''}>+ Add (Round Up)</option>
                        <option value="less" ${inv.round_off_type === 'less' ? 'selected' : ''}>- Less (Round Down)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Round Off Amount (₹)</label>
                    <input type="number" id="invRoundOff" step="0.01" value="${inv.round_off_amount || Math.abs(inv.round_off || 0) || ''}" placeholder="0.00" oninput="recalculateAll()">
                    <small class="input-hint">Enter positive value; type controls +/-</small>
                </div>
            </div>
        </div>

        <div class="card card-body supplier-section" style="margin-bottom:16px;border-left:4px solid var(--accent)">
            <div class="section-heading" style="margin-top:0;color:var(--accent)">
                <span class="material-icons-round">inventory_2</span> Supplier (Internal — Hidden)
            </div>
            <div class="supplier-badge">
                <span class="material-icons-round">visibility_off</span> Not shown on customer invoice
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Supplier Name</label>
                    <input type="text" id="invSupplierName" list="supplierList" value="${inv.supplier_name || ''}" placeholder="e.g. TripFactory">
                    <datalist id="supplierList">
                        <option value="TripFactory"><option value="MakeMyTrip Business"><option value="Goibibo Business">
                        <option value="IRCTC"><option value="Air India"><option value="IndiGo"><option value="SpiceJet">
                        <option value="Cleartrip"><option value="Yatra"><option value="Direct Hotel"><option value="Other">
                    </datalist>
                </div>
                <div class="form-group">
                    <label>Booking Ref / PNR</label>
                    <input type="text" id="invBookingRef" value="${inv.booking_ref || ''}" placeholder="Booking ref">
                </div>
                <div class="form-group">
                    <label>Supplier Cost (₹)</label>
                    <input type="number" id="invSupplierTotal" step="0.01" value="${inv.supplier_total || ''}" placeholder="0.00" oninput="recalculateAll()">
                </div>
            </div>

            <div style="background:#fff8e6;padding:12px;border-radius:8px;margin:12px 0;border:1px dashed #ffa500">
                <div style="font-size:12px;font-weight:700;color:#e65100;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <span class="material-icons-round" style="font-size:16px">receipt_long</span>
                    Supplier's Invoice Details (Their Bill to You)
                </div>
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="margin-bottom:0">
                        <label style="font-size:12px">Supplier Invoice No.</label>
                        <input type="text" id="invSupplierInvNo" value="${inv.supplier_invoice_no || ''}" placeholder="e.g. TF/2026/INV-1234" style="font-family:monospace">
                    </div>
                    <div class="form-group" style="margin-bottom:0">
                        <label style="font-size:12px">Supplier Invoice Date</label>
                        <input type="date" id="invSupplierInvDate" value="${inv.supplier_invoice_date || ''}">
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Supplier Payment</label>
                    <select id="invSupplierPayStatus">
                        <option value="unpaid" ${inv.supplier_pay_status==='unpaid'?'selected':''}>Not Paid</option>
                        <option value="paid" ${inv.supplier_pay_status==='paid'?'selected':''}>Paid</option>
                        <option value="partial" ${inv.supplier_pay_status==='partial'?'selected':''}>Partial</option>
                    </select>
                </div>
                <div class="form-group" style="flex:2">
                    <label>Internal Notes</label>
                    <input type="text" id="invInternalNotes" value="${inv.internal_notes || ''}" placeholder="Internal only">
                </div>
            </div>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">calculate</span> Summary
            </div>
            <div id="calcPreview" class="calc-box"></div>
        </div>

        <div class="card card-body" style="margin-bottom:16px">
            <div class="section-heading" style="margin-top:0">
                <span class="material-icons-round">payments</span> Payment
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Mode</label>
                    <select id="invPayMode">
                        <option value="">Select</option>
                        <option value="Cash" ${inv.payment_mode==='Cash'?'selected':''}>Cash</option>
                        <option value="Bank Transfer" ${inv.payment_mode==='Bank Transfer'?'selected':''}>Bank Transfer</option>
                        <option value="UPI" ${inv.payment_mode==='UPI'?'selected':''}>UPI</option>
                        <option value="Cheque" ${inv.payment_mode==='Cheque'?'selected':''}>Cheque</option>
                        <option value="Credit Card" ${inv.payment_mode==='Credit Card'?'selected':''}>Credit Card</option>
                        <option value="Net Banking" ${inv.payment_mode==='Net Banking'?'selected':''}>Net Banking</option>
                        <option value="International Wire" ${inv.payment_mode==='International Wire'?'selected':''}>International Wire</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Payment Status</label>
                    <select id="invPayStatus">
                        <option value="unpaid" ${inv.payment_status==='unpaid'?'selected':''}>Unpaid</option>
                        <option value="paid" ${inv.payment_status==='paid'?'selected':''}>Paid</option>
                        <option value="partial" ${inv.payment_status==='partial'?'selected':''}>Partial</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Notes (shown on invoice)</label>
                <textarea id="invNotes" rows="2" placeholder="Terms...">${inv.notes || ''}</textarea>
            </div>
        </div>

        <div class="btn-group" style="margin-bottom:40px">
            <button class="btn btn-secondary" onclick="navigateTo('invoices')" style="flex:1">Cancel</button>
            <button class="btn btn-primary" onclick="saveInvoice()" style="flex:2">
                <span class="material-icons-round">${isEdit ? 'save' : 'receipt'}</span>
                ${isEdit ? 'Update' : 'Create Invoice'}
            </button>
        </div>
    `;

    renderItemsList();
    recalculateAll();
}

function resetToAutoInvoice() {
    const { invoiceNumber } = DB.getNextInvoiceNumber();
    document.getElementById('invNumber').value = invoiceNumber;
    showToast('✅ Reset to auto-generated number', 'success');
}

function addItem(type) {
    const svc = SERVICE_TYPES[type] || SERVICE_TYPES.custom;
    invoiceItems.push({
        id: generateId(),
        type: type,
        description: type === 'custom' ? '' : svc.name,
        amount: 0,
        gst_rate: svc.defaultGst,
        is_pure_agent: svc.isPureAgent,
        hsn: svc.hsn,
        details: ''
    });
    renderItemsList();
    recalculateAll();
    setTimeout(() => {
        const el = document.getElementById(`itemDesc_${invoiceItems[invoiceItems.length - 1].id}`);
        if (el) el.focus();
    }, 100);
}

function removeItem(itemId) {
    invoiceItems = invoiceItems.filter(i => i.id !== itemId);
    renderItemsList();
    recalculateAll();
}

function updateItem(itemId, field, value) {
    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;
    if (field === 'amount' || field === 'gst_rate') {
        item[field] = parseFloat(value) || 0;
    } else if (field === 'is_pure_agent') {
        item.is_pure_agent = value === 'true' || value === true;
        if (item.is_pure_agent) item.gst_rate = 0;
        else item.gst_rate = 18;
        renderItemsList();
    } else {
        item[field] = value;
    }
    recalculateAll();
}

function renderItemsList() {
    const container = document.getElementById('itemsList');
    if (!container) return;

    if (invoiceItems.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px;color:var(--text-muted);background:var(--bg);border-radius:8px;border:2px dashed var(--border)">
                <span class="material-icons-round" style="font-size:40px;opacity:0.4">receipt_long</span>
                <p style="margin-top:8px">No items yet. Use quick add above.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = invoiceItems.map((item, idx) => {
        const svc = SERVICE_TYPES[item.type] || SERVICE_TYPES.custom;
        const borderColor = item.is_pure_agent ? '#3b82f6' : '#10b981';
        const typeLabel = item.is_pure_agent 
            ? '<span class="badge badge-info" style="font-size:10px">🛡️ Pure Agent</span>' 
            : '<span class="badge badge-success" style="font-size:10px">💰 Taxable</span>';

        return `
            <div class="item-row" style="border-left-color:${borderColor}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                    <span style="font-size:22px">${svc.icon}</span>
                    <strong style="flex:1;font-size:13px">#${idx + 1}: ${svc.name} ${typeLabel}</strong>
                    <select onchange="updateItem('${item.id}', 'is_pure_agent', this.value)" style="font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid var(--border)">
                        <option value="true" ${item.is_pure_agent ? 'selected' : ''}>Pure Agent</option>
                        <option value="false" ${!item.is_pure_agent ? 'selected' : ''}>Taxable</option>
                    </select>
                    <button type="button" onclick="removeItem('${item.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:4px">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
                
                <div class="form-row" style="margin-bottom:0">
                    <div class="form-group" style="flex:2;margin-bottom:6px">
                        <input type="text" id="itemDesc_${item.id}" value="${item.description || ''}" 
                               oninput="updateItem('${item.id}', 'description', this.value)" 
                               placeholder="${item.type === 'custom' ? 'Enter service name...' : 'Description'}">
                    </div>
                    <div class="form-group" style="margin-bottom:6px">
                        <input type="number" step="0.01" value="${item.amount || ''}" 
                               oninput="updateItem('${item.id}', 'amount', this.value)"
                               placeholder="₹ Amount" style="font-weight:700">
                    </div>
                    ${!item.is_pure_agent ? `
                        <div class="form-group" style="max-width:90px;margin-bottom:6px">
                            <select onchange="updateItem('${item.id}', 'gst_rate', this.value)" style="font-size:12px">
                                <option value="18" ${item.gst_rate == 18 ? 'selected' : ''}>18%</option>
                                <option value="12" ${item.gst_rate == 12 ? 'selected' : ''}>12%</option>
                                <option value="5" ${item.gst_rate == 5 ? 'selected' : ''}>5%</option>
                                <option value="0" ${item.gst_rate == 0 ? 'selected' : ''}>0%</option>
                            </select>
                        </div>
                    ` : ''}
                </div>
                
                <div style="display:flex;gap:8px;align-items:center">
                    <input type="text" value="${item.details || ''}" 
                           oninput="updateItem('${item.id}', 'details', this.value)"
                           placeholder="Extra info: PNR, dates, route..."
                           style="flex:1;font-size:11px;padding:5px 8px;border:1px solid var(--border);border-radius:5px;color:var(--text-secondary)">
                    
                    <div style="display:flex;align-items:center;gap:4px;background:var(--bg);padding:4px 8px;border-radius:5px;border:1px solid var(--border)">
                        <span style="font-size:10px;font-weight:700;color:var(--text-secondary)">HSN:</span>
                        <input type="text" value="${item.hsn || svc.hsn || '998552'}" 
                               oninput="updateItem('${item.id}', 'hsn', this.value)"
                               placeholder="HSN"
                               maxlength="8"
                               style="font-size:11px;padding:2px 5px;border:none;background:transparent;width:70px;font-family:monospace;font-weight:600;color:var(--primary)">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function onCustomerSelect() {
    const custId = document.getElementById('invCustomer').value;
    const customer = DB.getCustomerById(custId);
    if (customer) {
        document.getElementById('invPlaceOfSupply').value = customer.state || customer.country || '';
    }
    recalculateAll();
}

function recalculateAll() {
    const settings = DB.getSettings();
    const custId = document.getElementById('invCustomer')?.value;
    const customer = custId ? DB.getCustomerById(custId) : null;
    const pos = document.getElementById('invPlaceOfSupply')?.value || '';
    
    // ⭐ Round Off (Add / Less / None)
    const roundOffAmount = parseFloat(document.getElementById('invRoundOff')?.value) || 0;
    const roundOffType = document.getElementById('invRoundOffType')?.value || 'none';
    const roundOff = roundOffType === 'add' ? roundOffAmount : (roundOffType === 'less' ? -roundOffAmount : 0);
    
    const supplierTotal = parseFloat(document.getElementById('invSupplierTotal')?.value) || 0;

    const custCountry = customer?.country || (INDIAN_STATES[pos] ? 'India' : (COUNTRIES.includes(pos) ? pos : 'India'));
    const custState = customer?.state || (INDIAN_STATES[pos] ? pos : '');
    const gstInfo = detectGSTType(custCountry, custState, settings.state, settings.country);

    const gti = document.getElementById('invGstType');
    if (gti) gti.value = gstInfo.label;

    let pureTotal = 0, taxTotal = 0;
    let tCgst = 0, tSgst = 0, tIgst = 0;
    let breakdown = [];

    invoiceItems.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        if (amt <= 0) return;
        if (item.is_pure_agent) {
            pureTotal += amt;
            breakdown.push({ ...item, amount: amt, gst_amt: 0 });
        } else {
            taxTotal += amt;
            const g = calculateGST(amt, item.gst_rate || 18, gstInfo.type);
            tCgst += g.cgst_amount;
            tSgst += g.sgst_amount;
            tIgst += g.igst_amount;
            breakdown.push({ ...item, amount: amt, gst_amt: g.total_tax });
        }
    });

    const totalTax = tCgst + tSgst + tIgst;
    const grand = pureTotal + taxTotal + totalTax + roundOff;
    const grossP = grand - supplierTotal;
    const netP = grossP - totalTax;

    const preview = document.getElementById('calcPreview');
    if (!preview) return;

    let itemsHtml = breakdown.map((item, idx) => {
        const svc = SERVICE_TYPES[item.type] || SERVICE_TYPES.custom;
        return `<div class="calc-row" style="font-size:12px"><span class="calc-label">${idx+1}. ${svc.icon} ${item.description || svc.name}${item.is_pure_agent ? ' 🛡️' : ''}</span><span class="calc-value">₹${formatNum(item.amount)}</span></div>`;
    }).join('');

    let gstHtml = '';
    if (totalTax > 0) {
        if (gstInfo.type === 'CGST_SGST') {
            gstHtml = `
                <div class="calc-row"><span class="calc-label">CGST:</span><span class="calc-value">₹${formatNum(tCgst)}</span></div>
                <div class="calc-row"><span class="calc-label">SGST:</span><span class="calc-value">₹${formatNum(tSgst)}</span></div>`;
        } else if (gstInfo.type === 'IGST') {
            gstHtml = `<div class="calc-row"><span class="calc-label">IGST:</span><span class="calc-value">₹${formatNum(tIgst)}</span></div>`;
        }
    }

    preview.innerHTML = `
        ${itemsHtml || '<p style="color:var(--text-muted);text-align:center;padding:10px">Add items above</p>'}
        ${pureTotal > 0 ? `<div class="calc-row" style="border-top:1px dashed var(--border);padding-top:6px"><span class="calc-label"><strong>Pure Agent:</strong></span><span class="calc-value"><strong>₹${formatNum(pureTotal)}</strong></span></div>` : ''}
        ${taxTotal > 0 ? `<div class="calc-row"><span class="calc-label"><strong>Taxable:</strong></span><span class="calc-value"><strong>₹${formatNum(taxTotal)}</strong></span></div>` : ''}
        ${gstHtml}
        ${roundOffType !== 'none' && roundOffAmount > 0 ? `<div class="calc-row"><span class="calc-label">Round Off (${roundOffType === 'add' ? 'Add' : 'Less'}):</span><span class="calc-value" style="color:${roundOffType === 'add' ? 'var(--success)' : 'var(--danger)'}">${roundOffType === 'less' ? '- ' : '+ '}₹${formatNum(roundOffAmount)}</span></div>` : ''}
        <div class="calc-row total"><span class="calc-label">Grand Total:</span><span class="calc-value">₹${formatNum(grand)}</span></div>
        <div class="calc-words">${numberToWords(grand)}</div>
        ${supplierTotal > 0 ? `
            <div style="background:#fef3c7;padding:10px;border-radius:8px;margin-top:12px;border:1px solid #fbbf24">
                <strong style="color:#92400e;font-size:12px">💰 Profit (Admin)</strong>
                <div class="calc-row"><span class="calc-label">Supplier:</span><span class="calc-value" style="color:var(--danger)">₹${formatNum(supplierTotal)}</span></div>
                <div class="calc-row" style="font-weight:700"><span class="calc-label">Profit:</span><span class="calc-value" style="color:${grossP>=0?'var(--success)':'var(--danger)'}">₹${formatNum(grossP)}</span></div>
            </div>
        ` : ''}
    `;
}

async function saveInvoice() {
    const custId = document.getElementById('invCustomer').value;
    const invDate = document.getElementById('invDate').value;
    const customInvNo = document.getElementById('invNumber').value.trim();
    const customFY = document.getElementById('invFY').value.trim();

    if (!custId) { showToast('Select customer!', 'error'); return; }
    if (!invDate) { showToast('Select date!', 'error'); return; }
    if (!customInvNo) { showToast('Invoice number required!', 'error'); return; }
    
    const validItems = invoiceItems.filter(i => parseFloat(i.amount) > 0);
    if (validItems.length === 0) { showToast('Add at least one item with amount!', 'error'); return; }

    if (!editingInvoiceId) {
        const existing = DB.getActiveInvoices().find(inv => inv.invoice_number === customInvNo);
        if (existing) {
            showToast(`❌ Invoice number "${customInvNo}" already exists!`, 'error');
            return;
        }
    }

    const customer = DB.getCustomerById(custId);
    const settings = DB.getSettings();
    
    // ⭐ Round Off
    const roundOffAmount = parseFloat(document.getElementById('invRoundOff').value) || 0;
    const roundOffType = document.getElementById('invRoundOffType').value || 'none';
    const roundOff = roundOffType === 'add' ? roundOffAmount : (roundOffType === 'less' ? -roundOffAmount : 0);
    
    const pos = document.getElementById('invPlaceOfSupply').value;
    const supplierTotal = parseFloat(document.getElementById('invSupplierTotal').value) || 0;

    const custCountry = customer?.country || 'India';
    const custState = customer?.state || pos || '';
    const gstInfo = detectGSTType(custCountry, custState, settings.state, settings.country);

    let pureTotal = 0, taxTotal = 0;
    let tCgst = 0, tSgst = 0, tIgst = 0;
    let cgstR = 0, sgstR = 0, igstR = 0;

    validItems.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        if (item.is_pure_agent) { pureTotal += amt; }
        else {
            taxTotal += amt;
            const g = calculateGST(amt, item.gst_rate || 18, gstInfo.type);
            tCgst += g.cgst_amount; tSgst += g.sgst_amount; tIgst += g.igst_amount;
            if (!cgstR && g.cgst_rate) cgstR = g.cgst_rate;
            if (!sgstR && g.sgst_rate) sgstR = g.sgst_rate;
            if (!igstR && g.igst_rate) igstR = g.igst_rate;
        }
    });

    const totalTax = tCgst + tSgst + tIgst;
    const grand = pureTotal + taxTotal + totalTax + roundOff;
    const grossP = grand - supplierTotal;
    const netP = grossP - totalTax;

    const data = {
        invoice_number: customInvNo,
        financial_year: customFY || getCurrentFY(),
        invoice_format: document.getElementById('invFormat')?.value || 'tax',
        invoice_date: invDate,
        customer_id: custId,
        customer_name: customer.name,
        customer_address: customer.address || '',
        customer_city: customer.city || '',
        customer_pincode: customer.pincode || '',
        customer_gst: customer.gst_no || '',
        customer_state: customer.state || '',
        customer_state_code: customer.state_code || '',
        customer_country: customer.country || 'India',
        customer_phone: customer.phone || '',
        customer_email: customer.email || '',
        place_of_supply: pos || customer.state || '',
        gst_type: gstInfo.type,
        gst_type_label: gstInfo.label,
        items: validItems,
        booking_service_fee: taxTotal,
        booking_service_gst_rate: validItems.find(i => !i.is_pure_agent)?.gst_rate || 18,
        hotel_reimbursement: pureTotal,
        other_charges: 0,
        discount: 0,
        round_off: roundOff,
        round_off_type: roundOffType,
        round_off_amount: roundOffAmount,
        taxable_amount: taxTotal,
        cgst_rate: cgstR, cgst_amount: tCgst,
        sgst_rate: sgstR, sgst_amount: tSgst,
        igst_rate: igstR, igst_amount: tIgst,
        total_tax: totalTax,
        grand_total: grand,
        amount_in_words: numberToWords(grand),
        tax_amount_in_words: numberToWords(totalTax),
        payment_mode: document.getElementById('invPayMode').value,
        payment_status: document.getElementById('invPayStatus').value,
        notes: document.getElementById('invNotes').value.trim(),
        hsn_code: '998552',
        supplier_name: document.getElementById('invSupplierName').value.trim(),
        booking_ref: document.getElementById('invBookingRef').value.trim(),
        supplier_total: supplierTotal,
        supplier_pay_status: document.getElementById('invSupplierPayStatus').value,
        supplier_invoice_no: document.getElementById('invSupplierInvNo')?.value.trim() || '',
        supplier_invoice_date: document.getElementById('invSupplierInvDate')?.value || '',
        internal_notes: document.getElementById('invInternalNotes').value.trim(),
        gross_profit: grossP, net_profit: netP,
        profit_percent: grand > 0 ? parseFloat(((grossP / grand) * 100).toFixed(2)) : 0
    };

    let savedInvoiceId = null;
    let savedInvoice = null;

    if (editingInvoiceId) {
        DB.updateInvoice(editingInvoiceId, data);
        savedInvoiceId = editingInvoiceId;
        savedInvoice = DB.getInvoiceById(editingInvoiceId);
        showToast('✅ Updated!', 'success');
    } else {
        const saved = DB.addInvoice(data);
        savedInvoiceId = saved.id;
        savedInvoice = saved;
        showToast(`✅ Invoice ${customInvNo} created!`, 'success');
    }

    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.userId && savedInvoice) {
        try {
            await FirebaseSync.saveInvoice(savedInvoice);
        } catch (e) { console.error('Firebase sync failed:', e); }
    }

    if (typeof Drive !== 'undefined' && Drive.AUTO_SAVE_ENABLED && Drive.isConfigured() && savedInvoiceId) {
        showToast('☁️ Uploading to Drive...', 'info');
        setTimeout(async () => {
            try {
                await Drive.autoSaveInvoice(savedInvoiceId);
            } catch (error) {
                console.error('Auto-save failed:', error);
                showToast('⚠️ Drive auto-save failed', 'warning');
            }
        }, 1500);
    }

    viewInvoice(savedInvoiceId);
}

function editInvoice(id) {
    const inv = DB.getInvoiceById(id);
    if (!inv) return;
    navigateTo('newInvoice');
    setTimeout(() => renderInvoiceForm(inv), 50);
}

function duplicateInvoice(id) {
    const inv = DB.getInvoiceById(id);
    if (!inv) return;
    const d = { ...inv };
    delete d.id;
    delete d.invoice_number;
    delete d.financial_year;
    delete d.created_at;
    delete d.drive_file_id;
    delete d.drive_file_url;
    delete d.drive_uploaded_at;
    delete d.supplier_invoice_no;
    delete d.supplier_invoice_date;
    d.invoice_date = getTodayISO();
    d.payment_status = 'unpaid';
    d.supplier_pay_status = 'unpaid';
    navigateTo('newInvoice');
    setTimeout(() => renderInvoiceForm(d), 50);
}

async function deleteInvoiceAction(id) {
    if (!confirmDialog('Delete this invoice?')) return;
    DB.deleteInvoice(id);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.userId) {
        await FirebaseSync.deleteInvoice(id);
    }
    showToast('Deleted!', 'success');
    renderInvoiceList();
}

function viewInvoice(id) {
    const inv = DB.getInvoiceById(id);
    if (!inv) return;
    const items = inv.items || [];
    const profit = (inv.grand_total || 0) - (inv.supplier_total || 0);

    navigateTo('invoiceView');
    const c = document.getElementById('page-invoiceView');
    
    const driveStatus = inv.drive_file_url 
        ? `<div style="background:#e8f0fe;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:13px;color:#1a73e8;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
             <div style="display:flex;align-items:center;gap:8px">
                <span class="material-icons-round">cloud_done</span>
                <strong>Saved to Drive</strong>
                ${inv.drive_uploaded_at ? `<small style="color:#5f6368">• ${new Date(inv.drive_uploaded_at).toLocaleString()}</small>` : ''}
             </div>
             <div style="display:flex;gap:6px">
                <a href="${inv.drive_file_url}" target="_blank" class="btn btn-sm" style="background:#4285F4;color:white;text-decoration:none">
                    <span class="material-icons-round" style="font-size:14px">open_in_new</span> Open
                </a>
                <button class="btn btn-sm btn-secondary" onclick="Drive.copyLink('${inv.drive_file_url}')">
                    <span class="material-icons-round" style="font-size:14px">content_copy</span> Copy
                </button>
             </div>
           </div>`
        : '';
    
    c.innerHTML = `
        <div class="page-header">
            <div class="page-header-title">
                <h1>Invoice</h1>
                <p style="font-family:monospace;color:var(--primary);font-weight:700">${inv.invoice_number}</p>
            </div>
            <button class="btn btn-secondary" onclick="navigateTo('invoices')">← Back</button>
        </div>

        ${driveStatus}

        <div class="invoice-actions">
            <button class="btn btn-primary" onclick="downloadInvoicePDF('${inv.id}')"><span class="material-icons-round">download</span> Download</button>
            <button class="btn btn-secondary" onclick="printInvoicePDF('${inv.id}')"><span class="material-icons-round">print</span> Print</button>
            <button class="btn" style="background:#4285F4;color:white" onclick="typeof Drive!=='undefined'?Drive.uploadInvoice('${inv.id}'):showToast('Drive not configured','warning')">
                <span class="material-icons-round">cloud_upload</span> ${inv.drive_file_url ? 'Re-Upload' : 'Upload to Drive'}
            </button>
            <button class="btn" style="background:#25D366;color:white" onclick="WhatsApp.sendInvoice('${inv.id}','invoice')">
                <span class="material-icons-round">chat</span> WhatsApp
            </button>
            <button class="btn" style="background:#EA4335;color:white" onclick="Email.sendInvoice('${inv.id}','invoice')">
                <span class="material-icons-round">email</span> Email
            </button>
            ${inv.payment_status === 'unpaid' ? `
                <button class="btn" style="background:#ff9800;color:white" onclick="WhatsApp.sendInvoice('${inv.id}','reminder')">
                    <span class="material-icons-round">notifications_active</span> Reminder
                </button>
            ` : ''}
            ${inv.payment_status === 'paid' ? `
                <button class="btn" style="background:#4CAF50;color:white" onclick="WhatsApp.sendInvoice('${inv.id}','thankyou')">
                    <span class="material-icons-round">thumb_up</span> Thank You
                </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="editInvoice('${inv.id}')"><span class="material-icons-round">edit</span> Edit</button>
            <button class="btn btn-secondary" onclick="duplicateInvoice('${inv.id}')"><span class="material-icons-round">content_copy</span> Copy</button>
        </div>

        <div class="invoice-preview">
            <div class="grid-2" style="margin-bottom:20px">
                <div>
                    <div class="section-title">Buyer</div>
                    <h3 style="font-size:16px;font-weight:700">${toProperCase(inv.customer_name)}</h3>
                    ${inv.customer_address ? `<p style="font-size:13px;color:var(--text-secondary)">${inv.customer_address}</p>` : ''}
                    ${inv.customer_gst ? `<p style="font-size:13px;color:var(--text-secondary)"><strong>GST: ${inv.customer_gst}</strong></p>` : ''}
                    <p style="font-size:13px;color:var(--text-secondary)">${inv.customer_state || ''}, ${inv.customer_country || 'India'}</p>
                </div>
                <div style="text-align:right">
                    <p>Invoice: <strong>${inv.invoice_number}</strong></p>
                    <p>Date: <strong>${formatDate(inv.invoice_date)}</strong></p>
                    <span class="badge ${inv.payment_status==='paid'?'badge-success':'badge-danger'}">${inv.payment_status.toUpperCase()}</span>
                </div>
            </div>

            ${items.length > 0 ? `
                <table style="width:100%;font-size:13px;margin-bottom:16px">
                    <thead style="background:var(--bg)">
                        <tr><th style="padding:8px">#</th><th style="padding:8px">Description</th><th style="text-align:right;padding:8px">Amount</th></tr>
                    </thead>
                    <tbody>
                        ${items.map((item, idx) => {
                            const svc = SERVICE_TYPES[item.type] || SERVICE_TYPES.custom;
                            return `
                                <tr style="border-top:1px solid var(--border)">
                                    <td style="padding:8px">${idx+1}</td>
                                    <td style="padding:8px">
                                        ${svc.icon} <strong>${item.description || svc.name}</strong>
                                        ${item.details ? `<br><small style="color:var(--text-muted)">${item.details}</small>` : ''}
                                        ${item.is_pure_agent ? '<span class="badge badge-info" style="font-size:10px;margin-left:6px">Pure Agent</span>' : ''}
                                    </td>
                                    <td style="text-align:right;padding:8px"><strong>${formatCurrency(item.amount)}</strong></td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            ` : ''}

            ${inv.round_off_type && inv.round_off_type !== 'none' && inv.round_off_amount > 0 ? `
                <div style="text-align:right;padding:6px 0;font-size:13px;color:var(--text-secondary)">
                    Round Off (${inv.round_off_type === 'add' ? 'Add' : 'Less'}): 
                    <strong style="color:${inv.round_off_type === 'add' ? 'var(--success)' : 'var(--danger)'}">
                        ${inv.round_off_type === 'less' ? '- ' : '+ '}${formatCurrency(inv.round_off_amount)}
                    </strong>
                </div>
            ` : ''}

            <div style="display:flex;justify-content:space-between;padding:16px 0;border-top:2px solid var(--border)">
                <div>
                    <p style="font-size:12px;color:var(--text-muted)">Amount in words:</p>
                    <p style="font-size:13px;font-weight:600;font-style:italic">${inv.amount_in_words}</p>
                </div>
                <div style="text-align:right">
                    <p style="font-size:26px;font-weight:800;color:var(--primary)">${formatCurrency(inv.grand_total)}</p>
                </div>
            </div>
        </div>

        ${inv.supplier_name || inv.supplier_total || inv.supplier_invoice_no ? `
        <div class="card card-body" style="margin-top:16px;border-left:4px solid var(--accent)">
            <div class="section-heading" style="margin-top:0;color:var(--accent)">
                <span class="material-icons-round">inventory_2</span> Supplier Details (Internal — Admin Only)
            </div>
            <div class="calc-box">
                <div class="calc-row"><span class="calc-label">Supplier Name:</span><span class="calc-value"><strong>${inv.supplier_name || '-'}</strong></span></div>
                <div class="calc-row"><span class="calc-label">Booking Ref/PNR:</span><span class="calc-value">${inv.booking_ref || '-'}</span></div>
                ${inv.supplier_invoice_no ? `
                <div class="calc-row" style="background:#fff8e6;padding:6px;border-radius:4px">
                    <span class="calc-label">📄 Supplier Inv No:</span>
                    <span class="calc-value" style="font-family:monospace;font-weight:700;color:#e65100">${inv.supplier_invoice_no}</span>
                </div>` : ''}
                ${inv.supplier_invoice_date ? `
                <div class="calc-row" style="background:#fff8e6;padding:6px;border-radius:4px">
                    <span class="calc-label">📅 Supplier Inv Date:</span>
                    <span class="calc-value"><strong>${formatDate(inv.supplier_invoice_date)}</strong></span>
                </div>` : ''}
                <div class="calc-row"><span class="calc-label">Supplier Cost:</span><span class="calc-value" style="color:var(--danger)">${formatCurrency(inv.supplier_total)}</span></div>
                <div class="calc-row"><span class="calc-label">Payment Status:</span><span class="calc-value">${inv.supplier_pay_status || 'unpaid'}</span></div>
                <div class="calc-row" style="font-weight:700;border-top:2px solid var(--border);padding-top:8px;margin-top:6px">
                    <span class="calc-label">💰 Profit:</span>
                    <span class="calc-value" style="color:${profit>=0?'var(--success)':'var(--danger)'};font-size:16px">${formatCurrency(profit)}</span>
                </div>
                ${inv.internal_notes ? `<div class="calc-row" style="margin-top:8px"><span class="calc-label">Notes:</span><span class="calc-value" style="font-style:italic;color:var(--text-muted)">${inv.internal_notes}</span></div>` : ''}
            </div>
        </div>
        ` : ''}
    `;
}

function exportExcel() {
    const invoices = DB.searchInvoices(invoiceSearchQuery, invoiceFilters);
    if (invoices.length === 0) { showToast('No invoices!', 'warning'); return; }

    const data = invoices.map((inv, idx) => {
        const itemsSummary = (inv.items || []).map(i => {
            const svc = SERVICE_TYPES[i.type] || SERVICE_TYPES.custom;
            return `${svc.name}: ₹${i.amount}`;
        }).join(' | ');

        return {
            'S.No': idx + 1,
            'Invoice No': inv.invoice_number,
            'Date': inv.invoice_date,
            'FY': inv.financial_year,
            'Format': inv.invoice_format === 'non_tax' ? 'Non-Tax' : 'Tax',
            'Customer': inv.customer_name,
            'Customer Phone': inv.customer_phone || '',
            'Customer Email': inv.customer_email || '',
            'Customer GST': inv.customer_gst || '',
            'State': inv.customer_state || '',
            'Country': inv.customer_country || 'India',
            'GST Type': inv.gst_type_label || '',
            'Items': itemsSummary,
            'Pure Agent': inv.hotel_reimbursement || 0,
            'Taxable': inv.taxable_amount || 0,
            'CGST': inv.cgst_amount || 0,
            'SGST': inv.sgst_amount || 0,
            'IGST': inv.igst_amount || 0,
            'Total Tax': inv.total_tax || 0,
            'Round Off': inv.round_off || 0,
            'Grand Total': inv.grand_total || 0,
            'Supplier': inv.supplier_name || '',
            'Supplier Inv No': inv.supplier_invoice_no || '',
            'Supplier Inv Date': inv.supplier_invoice_date || '',
            'Supplier Cost': inv.supplier_total || 0,
            'Supplier Payment': inv.supplier_pay_status || '',
            'Profit': (inv.grand_total||0) - (inv.supplier_total||0),
            'Payment': inv.payment_status,
            'Drive Link': inv.drive_file_url || ''
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Array(29).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Tripzar_Invoices_${getTodayISO()}.xlsx`);
    showToast('📊 Excel exported!', 'success');
}
// ⭐ NEW: PDF Export for Invoices
function exportInvoicesPDF() {
    const invoices = DB.searchInvoices(invoiceSearchQuery, invoiceFilters);
    if (invoices.length === 0) { showToast('No invoices!', 'warning'); return; }
    
    const filters = {};
    if (invoiceSearchQuery) filters['Search'] = invoiceSearchQuery;
    if (invoiceFilters.payment_status) filters['Status'] = invoiceFilters.payment_status.toUpperCase();
    if (invoiceFilters.financial_year) filters['FY'] = invoiceFilters.financial_year;
    
    PDFExport.exportInvoicesList(invoices, filters);
}