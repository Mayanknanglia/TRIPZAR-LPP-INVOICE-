/* =============================================
   ITINERARY BUILDER v1.2 (Utils Matched)
   Professional Tour Itinerary + Quotation
   ============================================= */

// ─── Helper: formatAmount alias for formatCurrency ───
function formatAmount(num) {
    return parseFloat(num || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ─── Helper: getTodayDate alias ───
function getTodayDate() {
    return getTodayISO();
}

const Itinerary = {

    editingId: null,
    _lastSavedId: null,

    // ============================================
    // RENDER MAIN LIST PAGE
    // ============================================
    render() {
        const page = document.getElementById('page-itinerary');
        if (!page) return;

        const itineraries = DB.getActiveItineraries();

        page.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>🗺️ Itineraries & Quotations</h2>
                    <p class="page-subtitle">${itineraries.length} total itineraries</p>
                </div>
                <div class="page-header-right">
                    <button class="btn btn-primary" onclick="Itinerary.showForm()">
                        <span class="material-icons-round">add</span> New Itinerary
                    </button>
                </div>
            </div>

            <div class="itin-stats-grid">
                ${this.renderStats(itineraries)}
            </div>

            <div class="card" style="margin-bottom:16px">
                <div class="filter-row">
                    <div class="search-box">
                        <span class="material-icons-round">search</span>
                        <input type="text" id="itinSearch" 
                               placeholder="Search customer, destination..." 
                               oninput="Itinerary.filterList()" />
                    </div>
                    <select id="itinStatusFilter" onchange="Itinerary.filterList()" 
                            class="filter-select">
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="converted">Converted</option>
                    </select>
                    <select id="itinMonthFilter" onchange="Itinerary.filterList()" 
                            class="filter-select">
                        <option value="">All Months</option>
                        ${this.getMonthOptions()}
                    </select>
                </div>
            </div>

            <div id="itinList">
                ${this.renderList(itineraries)}
            </div>
        `;
    },

    // ============================================
    // STATS
    // ============================================
    renderStats(itineraries) {
        const total = itineraries.length;
        const confirmed = itineraries.filter(i => i.status === 'confirmed').length;
        const pending = itineraries.filter(i => i.status === 'sent').length;
        const converted = itineraries.filter(i => i.status === 'converted').length;
        const totalValue = itineraries.reduce((s, i) => s + (i.grand_total || 0), 0);

        return `
            <div class="itin-stat-card">
                <div class="itin-stat-icon" style="background:#e8f5e9">
                    <span class="material-icons-round" style="color:#1a5632">map</span>
                </div>
                <div class="itin-stat-info">
                    <span class="itin-stat-value">${total}</span>
                    <span class="itin-stat-label">Total</span>
                </div>
            </div>
            <div class="itin-stat-card">
                <div class="itin-stat-icon" style="background:#fff3e0">
                    <span class="material-icons-round" style="color:#f59e0b">send</span>
                </div>
                <div class="itin-stat-info">
                    <span class="itin-stat-value">${pending}</span>
                    <span class="itin-stat-label">Sent</span>
                </div>
            </div>
            <div class="itin-stat-card">
                <div class="itin-stat-icon" style="background:#dcfce7">
                    <span class="material-icons-round" style="color:#16a34a">check_circle</span>
                </div>
                <div class="itin-stat-info">
                    <span class="itin-stat-value">${confirmed}</span>
                    <span class="itin-stat-label">Confirmed</span>
                </div>
            </div>
            <div class="itin-stat-card">
                <div class="itin-stat-icon" style="background:#ede9fe">
                    <span class="material-icons-round" style="color:#8b5cf6">receipt_long</span>
                </div>
                <div class="itin-stat-info">
                    <span class="itin-stat-value">${converted}</span>
                    <span class="itin-stat-label">Converted</span>
                </div>
            </div>
            <div class="itin-stat-card">
                <div class="itin-stat-icon" style="background:#fef3c7">
                    <span class="material-icons-round" style="color:#d97706">currency_rupee</span>
                </div>
                <div class="itin-stat-info">
                    <span class="itin-stat-value">₹${formatAmount(totalValue)}</span>
                    <span class="itin-stat-label">Total Value</span>
                </div>
            </div>
        `;
    },

    // ============================================
    // LIST RENDER
    // ============================================
    renderList(itineraries) {
        if (!itineraries || itineraries.length === 0) {
            return `
                <div class="empty-state">
                    <span class="material-icons-round">map</span>
                    <h3>No Itineraries Yet</h3>
                    <p>Create your first tour itinerary/quotation</p>
                    <button class="btn btn-primary" onclick="Itinerary.showForm()">
                        <span class="material-icons-round">add</span> Create Itinerary
                    </button>
                </div>`;
        }

        const sorted = [...itineraries].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at));

        return `<div class="itin-list">
            ${sorted.map(itin => this.renderCard(itin)).join('')}
        </div>`;
    },

    renderCard(itin) {
        const statusMap = {
            draft:     { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
            sent:      { bg: '#fef3c7', color: '#d97706', label: 'Sent' },
            confirmed: { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed' },
            cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
            converted: { bg: '#ede9fe', color: '#7c3aed', label: 'Converted' }
        };
        const s = statusMap[itin.status] || statusMap.draft;
        const travelDate = itin.travel_date ? formatDate(itin.travel_date) : 'Not set';
        const nights = itin.nights || 0;
        const days = nights ? parseInt(nights) + 1 : 0;

        return `
            <div class="itin-card" id="itin-${itin.id}">
                <div class="itin-card-header">
                    <div class="itin-card-left">
                        <div class="itin-number">${itin.itin_number || ''}</div>
                        <div class="itin-destination">
                            <span class="material-icons-round" 
                                  style="font-size:16px;color:#1a5632">place</span>
                            ${itin.destination || 'No destination'}
                        </div>
                    </div>
                    <div class="itin-card-right">
                        <span class="itin-status-badge" 
                              style="background:${s.bg};color:${s.color}">
                            ${s.label}
                        </span>
                        <div class="itin-amount">
                            ₹${formatAmount(itin.grand_total || 0)}
                        </div>
                    </div>
                </div>

                <div class="itin-card-body">
                    <div class="itin-meta-row">
                        <span class="itin-meta-item">
                            <span class="material-icons-round">person</span>
                            ${itin.customer_name || 'Walk-in Customer'}
                        </span>
                        <span class="itin-meta-item">
                            <span class="material-icons-round">calendar_today</span>
                            ${travelDate}
                        </span>
                        <span class="itin-meta-item">
                            <span class="material-icons-round">group</span>
                            ${itin.adults || 0}A 
                            ${itin.children || 0}C 
                            ${itin.infants || 0}I
                        </span>
                        <span class="itin-meta-item">
                            <span class="material-icons-round">nights_stay</span>
                            ${nights}N / ${days}D
                        </span>
                        ${itin.tour_type ? `
                        <span class="itin-meta-item">
                            <span class="material-icons-round">flight</span>
                            ${itin.tour_type}
                        </span>` : ''}
                    </div>
                    ${itin.valid_till ? `
                    <div class="itin-validity 
                        ${this.isExpired(itin.valid_till) ? 'expired' : ''}">
                        <span class="material-icons-round">schedule</span>
                        Valid till: ${formatDate(itin.valid_till)}
                        ${this.isExpired(itin.valid_till) 
                            ? '<span class="expired-tag">EXPIRED</span>' : ''}
                    </div>` : ''}
                </div>

                <div class="itin-card-actions">
                    <button class="itin-action-btn view" 
                            onclick="Itinerary.viewDetail('${itin.id}')" 
                            title="View Details">
                        <span class="material-icons-round">visibility</span>
                    </button>
                    <button class="itin-action-btn edit" 
                            onclick="Itinerary.showForm('${itin.id}')" 
                            title="Edit">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="itin-action-btn pdf" 
                            onclick="ItineraryPDF.generate('${itin.id}')" 
                            title="Download PDF">
                        <span class="material-icons-round">picture_as_pdf</span>
                    </button>
                    <button class="itin-action-btn whatsapp" 
                            onclick="Itinerary.shareWhatsApp('${itin.id}')" 
                            title="Share on WhatsApp">
                        <span class="material-icons-round">chat</span>
                    </button>
                    <button class="itin-action-btn email" 
                            onclick="Itinerary.shareEmail('${itin.id}')" 
                            title="Send Email">
                        <span class="material-icons-round">email</span>
                    </button>
                    ${itin.status !== 'converted' ? `
                    <button class="itin-action-btn convert" 
                            onclick="Itinerary.convertToInvoice('${itin.id}')" 
                            title="Convert to Invoice">
                        <span class="material-icons-round">receipt_long</span>
                    </button>` : ''}
                    <button class="itin-action-btn duplicate" 
                            onclick="Itinerary.duplicate('${itin.id}')" 
                            title="Duplicate">
                        <span class="material-icons-round">content_copy</span>
                    </button>
                    <button class="itin-action-btn delete" 
                            onclick="Itinerary.deleteItinerary('${itin.id}')" 
                            title="Delete">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
        `;
    },

    isExpired(dateStr) {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    },

    filterList() {
        const query = (document.getElementById('itinSearch')?.value || '').toLowerCase();
        const status = document.getElementById('itinStatusFilter')?.value || '';
        const month = document.getElementById('itinMonthFilter')?.value || '';

        let list = DB.getActiveItineraries();

        if (query) {
            list = list.filter(i =>
                (i.customer_name || '').toLowerCase().includes(query) ||
                (i.destination || '').toLowerCase().includes(query) ||
                (i.itin_number || '').toLowerCase().includes(query) ||
                (i.tour_type || '').toLowerCase().includes(query)
            );
        }
        if (status) list = list.filter(i => i.status === status);
        if (month) list = list.filter(i => 
            (i.travel_date || '').startsWith(month));

        document.getElementById('itinList').innerHTML = this.renderList(list);
    },

    getMonthOptions() {
        const months = [];
        const now = new Date();
        for (let i = -3; i <= 9; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = d.toLocaleDateString('en-IN', { 
                month: 'long', year: 'numeric' 
            });
            months.push(`<option value="${val}">${label}</option>`);
        }
        return months.join('');
    },

    // ============================================
    // SHOW FORM
    // ============================================
    showForm(editId = null) {
        this.editingId = editId;
        const existing = editId ? DB.getItineraryById(editId) : null;
        const customers = DB.getCustomers();
        const itinNumber = existing 
            ? existing.itin_number 
            : DB.getNextItinNumber();

        const page = document.getElementById('page-itinerary');
        page.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <button class="btn btn-ghost" onclick="Itinerary.render()">
                        <span class="material-icons-round">arrow_back</span> Back
                    </button>
                    <h2>${editId ? '✏️ Edit Itinerary' : '🗺️ New Itinerary'}</h2>
                </div>
                <div class="page-header-right">
                    <button class="btn btn-outline" onclick="Itinerary.saveDraft()">
                        <span class="material-icons-round">save</span> Save Draft
                    </button>
                    <button class="btn btn-primary" onclick="Itinerary.saveItinerary()">
                        <span class="material-icons-round">check_circle</span> Save
                    </button>
                </div>
            </div>

            <div class="itin-form-grid">

                <!-- LEFT COLUMN -->
                <div class="itin-form-left">

                    <!-- BASIC INFO -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">info</span>
                            Basic Information
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Itinerary Number</label>
                                <input type="text" id="itinNumber" 
                                       value="${itinNumber}" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" id="itinDate" 
                                       value="${existing?.itin_date || getTodayISO()}" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Valid Till</label>
                                <input type="date" id="itinValidTill" 
                                       value="${existing?.valid_till || this.getValidTill()}" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="itinStatus" class="form-control">
                                    <option value="draft" 
                                        ${(!existing || existing.status==='draft') 
                                            ? 'selected' : ''}>Draft</option>
                                    <option value="sent" 
                                        ${existing?.status==='sent' 
                                            ? 'selected' : ''}>Sent</option>
                                    <option value="confirmed" 
                                        ${existing?.status==='confirmed' 
                                            ? 'selected' : ''}>Confirmed</option>
                                    <option value="cancelled" 
                                        ${existing?.status==='cancelled' 
                                            ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- CUSTOMER -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">person</span>
                            Customer Details
                        </div>
                        <div class="form-group">
                            <label>Select Existing Customer</label>
                            <select id="itinCustomerSelect" class="form-control" 
                                    onchange="Itinerary.fillCustomer(this.value)">
                                <option value="">
                                    -- Walk-in / Type manually below --
                                </option>
                                ${customers.map(c => `
                                    <option value="${c.id}" 
                                        ${existing?.customer_id === c.id 
                                            ? 'selected' : ''}>
                                        ${c.name}${c.phone ? ' | '+c.phone : ''}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Customer Name *</label>
                                <input type="text" id="itinCustomerName" 
                                       value="${existing?.customer_name || ''}" 
                                       placeholder="Full name" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="tel" id="itinCustomerPhone" 
                                       value="${existing?.customer_phone || ''}" 
                                       placeholder="Mobile number" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="itinCustomerEmail" 
                                       value="${existing?.customer_email || ''}" 
                                       placeholder="Email address" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>City</label>
                                <input type="text" id="itinCustomerCity" 
                                       value="${existing?.customer_city || ''}" 
                                       placeholder="Customer city" 
                                       class="form-control" />
                            </div>
                        </div>
                    </div>

                    <!-- TOUR DETAILS -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">flight_takeoff</span>
                            Tour Details
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Destination *</label>
                                <input type="text" id="itinDestination" 
                                       value="${existing?.destination || ''}" 
                                       placeholder="e.g. Dubai, Goa, Manali" 
                                       class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Tour Type</label>
                                <select id="itinTourType" class="form-control">
                                    <option value="Domestic" 
                                        ${existing?.tour_type==='Domestic'||!existing 
                                            ? 'selected':''}>🇮🇳 Domestic</option>
                                    <option value="International" 
                                        ${existing?.tour_type==='International' 
                                            ? 'selected':''}>🌍 International</option>
                                    <option value="Pilgrimage" 
                                        ${existing?.tour_type==='Pilgrimage' 
                                            ? 'selected':''}>🛕 Pilgrimage</option>
                                    <option value="Adventure" 
                                        ${existing?.tour_type==='Adventure' 
                                            ? 'selected':''}>🏔️ Adventure</option>
                                    <option value="Honeymoon" 
                                        ${existing?.tour_type==='Honeymoon' 
                                            ? 'selected':''}>💑 Honeymoon</option>
                                    <option value="Family" 
                                        ${existing?.tour_type==='Family' 
                                            ? 'selected':''}>👨‍👩‍👧‍👦 Family</option>
                                    <option value="Corporate" 
                                        ${existing?.tour_type==='Corporate' 
                                            ? 'selected':''}>💼 Corporate</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Travel Date *</label>
                                <input type="date" id="itinTravelDate" 
                                       value="${existing?.travel_date || ''}" 
                                       class="form-control"
                                       onchange="Itinerary.calcNights()" />
                            </div>
                            <div class="form-group">
                                <label>Return Date</label>
                                <input type="date" id="itinReturnDate" 
                                       value="${existing?.return_date || ''}" 
                                       class="form-control" 
                                       onchange="Itinerary.calcNights()" />
                            </div>
                            <div class="form-group">
                                <label>Nights</label>
                                <input type="number" id="itinNights" 
                                       value="${existing?.nights || ''}" 
                                       placeholder="Auto-calculated" 
                                       class="form-control" min="0" />
                            </div>
                            <div class="form-group">
                                <label>Hotel / Accommodation</label>
                                <input type="text" id="itinHotel" 
                                       value="${existing?.hotel || ''}" 
                                       placeholder="Hotel name & category" 
                                       class="form-control" />
                            </div>
                        </div>

                        <div class="itin-section-title" style="margin-top:16px">
                            <span class="material-icons-round">group</span>
                            Passengers (Pax)
                        </div>
                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Adults (12+)</label>
                                <input type="number" id="itinAdults" 
                                       value="${existing?.adults ?? 1}" 
                                       min="0" class="form-control"
                                       oninput="Itinerary.calculateTotal()" />
                            </div>
                            <div class="form-group">
                                <label>Children (2-11)</label>
                                <input type="number" id="itinChildren" 
                                       value="${existing?.children ?? 0}" 
                                       min="0" class="form-control"
                                       oninput="Itinerary.calculateTotal()" />
                            </div>
                            <div class="form-group">
                                <label>Infants (0-2)</label>
                                <input type="number" id="itinInfants" 
                                       value="${existing?.infants ?? 0}" 
                                       min="0" class="form-control" />
                            </div>
                        </div>
                    </div>

                    <!-- DAY-WISE ITINERARY -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">today</span>
                            Day-wise Itinerary
                            <button class="btn btn-sm btn-outline" 
                                    onclick="Itinerary.addDay()" 
                                    style="margin-left:auto">
                                <span class="material-icons-round">add</span> 
                                Add Day
                            </button>
                        </div>
                        <div id="itinDaysContainer">
                            ${this.renderDays(
                                existing?.days || 
                                [{day:1, title:'', activities:''}]
                            )}
                        </div>
                    </div>

                    <!-- INCLUSIONS / EXCLUSIONS -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">checklist</span>
                            Inclusions & Exclusions
                        </div>
                        <div class="form-group">
                            <label>✅ Inclusions (one per line)</label>
                            <textarea id="itinInclusions" 
                                      class="form-control" rows="6"
                            >${existing?.inclusions || this.getDefaultInclusions()}</textarea>
                        </div>
                        <div class="form-group">
                            <label>❌ Exclusions (one per line)</label>
                            <textarea id="itinExclusions" 
                                      class="form-control" rows="5"
                            >${existing?.exclusions || this.getDefaultExclusions()}</textarea>
                        </div>
                    </div>

                    <!-- TERMS -->
                    <div class="card itin-section">
                        <div class="itin-section-title">
                            <span class="material-icons-round">gavel</span>
                            Terms & Conditions
                        </div>
                        <textarea id="itinTerms" 
                                  class="form-control" rows="7"
                        >${existing?.terms || this.getDefaultTerms()}</textarea>

                        <div class="form-group" style="margin-top:14px">
                            <label>
                                📝 Internal Notes 
                                <span style="color:var(--text-muted);font-size:11px">
                                    (Not shown on PDF)
                                </span>
                            </label>
                            <textarea id="itinNotes" 
                                      class="form-control" rows="3"
                            >${existing?.notes || ''}</textarea>
                        </div>
                    </div>

                </div>

                <!-- RIGHT COLUMN — PRICING -->
                <div class="itin-form-right">
                    <div class="card itin-section itin-pricing-card" 
                         style="position:sticky;top:80px">

                        <div class="itin-section-title">
                            <span class="material-icons-round">currency_rupee</span>
                            Price Breakdown
                        </div>

                        <div class="itin-cost-header">
                            <span style="flex:1;font-size:11px;
                                         color:var(--text-muted);font-weight:600">ITEM</span>
                            <span style="width:100px;font-size:11px;
                                         color:var(--text-muted);font-weight:600;
                                         text-align:right">AMOUNT (₹)</span>
                            <span style="width:30px"></span>
                        </div>

                        <div id="itinCostItems">
                            ${this.renderCostItems(
                                existing?.cost_items || 
                                this.getDefaultCostItems()
                            )}
                        </div>

                        <button class="btn btn-outline btn-sm" 
                                onclick="Itinerary.addCostItem()" 
                                style="width:100%;margin-top:8px">
                            <span class="material-icons-round">add</span> 
                            Add Cost Item
                        </button>

                        <div class="itin-pricing-divider"></div>

                        <div class="itin-gst-row">
                            <label class="toggle-label">
                                <input type="checkbox" id="itinGSTEnabled" 
                                       ${existing?.gst_enabled !== false 
                                           ? 'checked' : ''}
                                       onchange="Itinerary.calculateTotal()" />
                                <span class="toggle-switch"></span>
                                Apply GST
                            </label>
                            <select id="itinGSTRate" class="form-control" 
                                    style="width:90px"
                                    onchange="Itinerary.calculateTotal()">
                                <option value="5" 
                                    ${(existing?.gst_rate||5)==5 
                                        ? 'selected':''}>5%</option>
                                <option value="12" 
                                    ${existing?.gst_rate==12 
                                        ? 'selected':''}>12%</option>
                                <option value="18" 
                                    ${existing?.gst_rate==18 
                                        ? 'selected':''}>18%</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-top:12px">
                            <label>Discount (₹)</label>
                            <input type="number" id="itinDiscount" 
                                   value="${existing?.discount || 0}" 
                                   min="0" class="form-control" 
                                   oninput="Itinerary.calculateTotal()" />
                        </div>

                        <div class="itin-totals-box">
                            <div class="itin-total-row">
                                <span>Subtotal</span>
                                <span id="itinSubtotal">₹0.00</span>
                            </div>
                            <div class="itin-total-row" id="itinDiscountRow" 
                                 style="color:#dc2626;display:none">
                                <span>Discount</span>
                                <span id="itinDiscountDisplay">-₹0.00</span>
                            </div>
                            <div class="itin-total-row" id="itinGSTRow">
                                <span id="itinGSTLabel">GST (5%)</span>
                                <span id="itinGSTAmount">₹0.00</span>
                            </div>
                            <div class="itin-total-row grand-total">
                                <span>GRAND TOTAL</span>
                                <span id="itinGrandTotal">₹0.00</span>
                            </div>
                            <div class="itin-total-row" 
                                 style="font-size:11px;color:var(--text-muted)">
                                <span>Per Person (Adults)</span>
                                <span id="itinPerPerson">₹0.00</span>
                            </div>
                        </div>

                        <div class="form-group" style="margin-top:16px">
                            <label>Payment Terms</label>
                            <select id="itinPaymentTerms" class="form-control">
                                <option value="50% advance, balance before departure"
                                    ${existing?.payment_terms===
                                        '50% advance, balance before departure' 
                                        ? 'selected':''}>
                                    50% Advance + 50% Before Departure
                                </option>
                                <option value="100% advance payment required"
                                    ${existing?.payment_terms===
                                        '100% advance payment required' 
                                        ? 'selected':''}>
                                    100% Advance
                                </option>
                                <option value="25% advance, 75% before departure"
                                    ${existing?.payment_terms===
                                        '25% advance, 75% before departure' 
                                        ? 'selected':''}>
                                    25% + 75% Before Departure
                                </option>
                            </select>
                        </div>

                        <div class="itin-form-actions">
                            <button class="btn btn-outline" 
                                    onclick="Itinerary.saveDraft()" 
                                    style="flex:1">
                                <span class="material-icons-round">save</span> Draft
                            </button>
                            <button class="btn btn-primary" 
                                    onclick="Itinerary.saveItinerary()" 
                                    style="flex:2">
                                <span class="material-icons-round">check_circle</span> Save
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        `;

        setTimeout(() => this.calculateTotal(), 150);
    },

    // ============================================
    // DAYS
    // ============================================
    renderDays(days) {
        if (!days || days.length === 0) {
            days = [{ day: 1, title: '', activities: '' }];
        }
        return days.map((d, idx) => this.renderDayRow(d, idx)).join('');
    },

    renderDayRow(day, idx) {
        return `
            <div class="itin-day-row" id="day-row-${idx}">
                <div class="itin-day-header">
                    <div class="itin-day-badge">Day ${day.day || idx+1}</div>
                    <input type="text" 
                           class="form-control itin-day-title" 
                           placeholder="Day title (e.g. Arrival & City Tour)" 
                           value="${this.escHtml(day.title || '')}" />
                    <button class="btn-icon-sm delete-btn" 
                            onclick="Itinerary.removeDay(${idx})" 
                            title="Remove day">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <textarea class="form-control itin-day-activities" 
                          rows="3"
                          placeholder="Activities for this day (one per line):&#10;Visit Burj Khalifa&#10;Dubai Mall Shopping&#10;Desert Safari"
                >${this.escHtml(day.activities || '')}</textarea>
            </div>
        `;
    },

    addDay() {
        const container = document.getElementById('itinDaysContainer');
        const count = container.querySelectorAll('.itin-day-row').length;
        const div = document.createElement('div');
        div.innerHTML = this.renderDayRow(
            { day: count + 1, title: '', activities: '' }, count
        );
        container.appendChild(div.firstElementChild);
    },

    removeDay(idx) {
        const row = document.getElementById(`day-row-${idx}`);
        if (row) row.remove();
        document.querySelectorAll('.itin-day-row').forEach((row, i) => {
            row.id = `day-row-${i}`;
            const badge = row.querySelector('.itin-day-badge');
            if (badge) badge.textContent = `Day ${i + 1}`;
        });
    },

    getDaysData() {
        const days = [];
        document.querySelectorAll('.itin-day-row').forEach((row, idx) => {
            const title = row.querySelector('.itin-day-title')?.value || '';
            const activities = row.querySelector('.itin-day-activities')?.value || '';
            days.push({ day: idx + 1, title, activities });
        });
        return days;
    },

    // ============================================
    // COST ITEMS
    // ============================================
    getDefaultCostItems() {
        return [
            { label: 'Flight / Air Ticket', amount: '' },
            { label: 'Hotel Accommodation', amount: '' },
            { label: 'Visa Charges', amount: '' },
            { label: 'Sightseeing / Activities', amount: '' },
            { label: 'Transfers (Airport + Local)', amount: '' },
            { label: 'Service Fee', amount: '' },
        ];
    },

    renderCostItems(items) {
        return items.map((item, idx) => 
            this.renderCostRow(item, idx)
        ).join('');
    },

    renderCostRow(item, idx) {
        return `
            <div class="itin-cost-row" id="cost-row-${idx}">
                <input type="text" 
                       class="form-control itin-cost-label" 
                       placeholder="Item name" 
                       value="${this.escHtml(item.label || '')}" />
                <input type="number" 
                       class="form-control itin-cost-amount" 
                       placeholder="0" 
                       value="${item.amount || ''}" 
                       min="0"
                       oninput="Itinerary.calculateTotal()" />
                <button class="btn-icon-sm delete-btn" 
                        onclick="Itinerary.removeCostItem(${idx})">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
        `;
    },

    addCostItem() {
        const container = document.getElementById('itinCostItems');
        const count = container.querySelectorAll('.itin-cost-row').length;
        const div = document.createElement('div');
        div.innerHTML = this.renderCostRow({ label: '', amount: '' }, count);
        container.appendChild(div.firstElementChild);
    },

    removeCostItem(idx) {
        const row = document.getElementById(`cost-row-${idx}`);
        if (row) {
            row.remove();
            this.calculateTotal();
        }
    },

    getCostItems() {
        const items = [];
        document.querySelectorAll('.itin-cost-row').forEach(row => {
            const label = row.querySelector('.itin-cost-label')?.value || '';
            const amount = parseFloat(
                row.querySelector('.itin-cost-amount')?.value
            ) || 0;
            if (label || amount) items.push({ label, amount });
        });
        return items;
    },

    // ============================================
    // CALCULATIONS
    // ============================================
    calculateTotal() {
        const items = this.getCostItems();
        const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
        const discount = parseFloat(
            document.getElementById('itinDiscount')?.value
        ) || 0;
        const gstEnabled = document.getElementById('itinGSTEnabled')?.checked;
        const gstRate = parseFloat(
            document.getElementById('itinGSTRate')?.value
        ) || 5;

        const afterDiscount = Math.max(subtotal - discount, 0);
        const gstAmount = gstEnabled 
            ? Math.round(afterDiscount * gstRate / 100 * 100) / 100 
            : 0;
        const grandTotal = afterDiscount + gstAmount;

        const adults = parseInt(
            document.getElementById('itinAdults')?.value
        ) || 1;
        const children = parseInt(
            document.getElementById('itinChildren')?.value
        ) || 0;
        const totalPax = (adults + children) || 1;
        const perPerson = grandTotal / totalPax;

        const el = id => document.getElementById(id);

        if (el('itinSubtotal')) 
            el('itinSubtotal').textContent = `₹${formatAmount(subtotal)}`;
        if (el('itinGSTLabel')) 
            el('itinGSTLabel').textContent = `GST (${gstRate}%)`;
        if (el('itinGSTAmount')) 
            el('itinGSTAmount').textContent = `₹${formatAmount(gstAmount)}`;
        if (el('itinGrandTotal')) 
            el('itinGrandTotal').textContent = `₹${formatAmount(grandTotal)}`;
        if (el('itinPerPerson')) 
            el('itinPerPerson').textContent = `₹${formatAmount(perPerson)}`;
        if (el('itinGSTRow')) 
            el('itinGSTRow').style.display = gstEnabled ? 'flex' : 'none';
        if (el('itinDiscountRow')) 
            el('itinDiscountRow').style.display = discount > 0 ? 'flex' : 'none';
        if (el('itinDiscountDisplay')) 
            el('itinDiscountDisplay').textContent = `-₹${formatAmount(discount)}`;

        return { subtotal, discount, gstAmount, grandTotal, 
                 gstRate, gstEnabled, perPerson };
    },

    calcNights() {
        const travel = document.getElementById('itinTravelDate')?.value;
        const returnD = document.getElementById('itinReturnDate')?.value;
        if (travel && returnD) {
            const diff = Math.ceil(
                (new Date(returnD) - new Date(travel)) / (1000 * 60 * 60 * 24)
            );
            if (diff > 0) {
                const nightsEl = document.getElementById('itinNights');
                if (nightsEl) nightsEl.value = diff;
            }
        }
    },

    fillCustomer(customerId) {
        if (!customerId) return;
        const customer = DB.getCustomerById(customerId);
        if (!customer) return;
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('itinCustomerName', customer.name);
        set('itinCustomerPhone', customer.phone);
        set('itinCustomerEmail', customer.email);
        set('itinCustomerCity', customer.city || customer.state || '');
    },

    // ============================================
    // SAVE
    // ============================================
    collectFormData(statusOverride = null) {
        const totals = this.calculateTotal();
        return {
            itin_number: document.getElementById('itinNumber')?.value?.trim() || '',
            itin_date: document.getElementById('itinDate')?.value || getTodayISO(),
            valid_till: document.getElementById('itinValidTill')?.value || '',
            status: statusOverride || 
                    document.getElementById('itinStatus')?.value || 'draft',

            customer_id: document.getElementById('itinCustomerSelect')?.value || '',
            customer_name: document.getElementById('itinCustomerName')?.value?.trim() || '',
            customer_phone: document.getElementById('itinCustomerPhone')?.value?.trim() || '',
            customer_email: document.getElementById('itinCustomerEmail')?.value?.trim() || '',
            customer_city: document.getElementById('itinCustomerCity')?.value?.trim() || '',

            destination: document.getElementById('itinDestination')?.value?.trim() || '',
            tour_type: document.getElementById('itinTourType')?.value || 'Domestic',
            travel_date: document.getElementById('itinTravelDate')?.value || '',
            return_date: document.getElementById('itinReturnDate')?.value || '',
            nights: document.getElementById('itinNights')?.value || '',
            hotel: document.getElementById('itinHotel')?.value?.trim() || '',

            adults: parseInt(document.getElementById('itinAdults')?.value) || 1,
            children: parseInt(document.getElementById('itinChildren')?.value) || 0,
            infants: parseInt(document.getElementById('itinInfants')?.value) || 0,

            days: this.getDaysData(),
            cost_items: this.getCostItems(),

            inclusions: document.getElementById('itinInclusions')?.value || '',
            exclusions: document.getElementById('itinExclusions')?.value || '',
            terms: document.getElementById('itinTerms')?.value || '',
            notes: document.getElementById('itinNotes')?.value || '',

            payment_terms: document.getElementById('itinPaymentTerms')?.value || '',
            gst_enabled: document.getElementById('itinGSTEnabled')?.checked || false,
            gst_rate: parseFloat(document.getElementById('itinGSTRate')?.value) || 5,
            discount: parseFloat(document.getElementById('itinDiscount')?.value) || 0,

            subtotal: totals.subtotal,
            gst_amount: totals.gstAmount,
            grand_total: totals.grandTotal,
        };
    },

    saveDraft() {
        const data = this.collectFormData('draft');
        if (!data.customer_name && !data.destination) {
            showToast('Please fill customer name or destination', 'warning');
            return;
        }
        this._save(data);
        showToast('✅ Draft saved!', 'success');
    },

    saveItinerary() {
        const data = this.collectFormData();
        if (!data.customer_name) {
            showToast('⚠️ Customer name is required!', 'warning');
            document.getElementById('itinCustomerName')?.focus();
            return;
        }
        if (!data.destination) {
            showToast('⚠️ Destination is required!', 'warning');
            document.getElementById('itinDestination')?.focus();
            return;
        }
        this._save(data);
        showToast('✅ Itinerary saved successfully!', 'success');
        setTimeout(() => this.viewDetail(this._lastSavedId), 400);
    },

    _save(data) {
        if (this.editingId) {
            DB.updateItinerary(this.editingId, data);
            this._lastSavedId = this.editingId;
        } else {
            const saved = DB.addItinerary(data);
            this._lastSavedId = saved.id;
            this.editingId = saved.id;
        }
        if (typeof FirebaseSync !== 'undefined' && 
            typeof FirebaseSync.syncItineraries === 'function') {
            FirebaseSync.syncItineraries();
        }
    },

    // ============================================
    // VIEW DETAIL
    // ============================================
    viewDetail(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) { this.render(); return; }

        const statusColors = {
            draft:'#64748b', sent:'#d97706', confirmed:'#16a34a',
            cancelled:'#dc2626', converted:'#7c3aed'
        };
        const sColor = statusColors[itin.status] || '#64748b';
        const nights = itin.nights || 0;
        const days = nights ? parseInt(nights) + 1 : 0;
        const totalPax = (itin.adults || 1) + (itin.children || 0);

        const page = document.getElementById('page-itinerary');
        page.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <button class="btn btn-ghost" onclick="Itinerary.render()">
                        <span class="material-icons-round">arrow_back</span> Back
                    </button>
                    <div>
                        <h2 style="margin:0">🗺️ ${itin.itin_number}</h2>
                        <span class="itin-status-badge" 
                              style="background:${sColor}20;color:${sColor};
                                     margin-top:4px;display:inline-block">
                            ${(itin.status || 'draft').toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="page-header-right" style="flex-wrap:wrap;gap:8px">
                    <button class="btn btn-outline" 
                            onclick="Itinerary.showForm('${itin.id}')">
                        <span class="material-icons-round">edit</span> Edit
                    </button>
                    <button class="btn btn-outline" 
                            onclick="ItineraryPDF.generate('${itin.id}')">
                        <span class="material-icons-round">picture_as_pdf</span> PDF
                    </button>
                    <button class="btn btn-outline" 
                            onclick="Itinerary.shareWhatsApp('${itin.id}')">
                        <span class="material-icons-round">chat</span> WhatsApp
                    </button>
                    <button class="btn btn-outline" 
                            onclick="Itinerary.shareEmail('${itin.id}')">
                        <span class="material-icons-round">email</span> Email
                    </button>
                    <button class="btn btn-outline" 
                            onclick="Itinerary.duplicate('${itin.id}')">
                        <span class="material-icons-round">content_copy</span> Duplicate
                    </button>
                    ${itin.status !== 'converted' ? `
                    <button class="btn btn-primary" 
                            onclick="Itinerary.convertToInvoice('${itin.id}')">
                        <span class="material-icons-round">receipt_long</span> 
                        Convert to Invoice
                    </button>` : ''}
                </div>
            </div>

            <div class="card" style="margin-bottom:16px">
                <div class="itin-detail-row">
                    <div class="itin-detail-item">
                        <span class="detail-label">Customer</span>
                        <span class="detail-value">${itin.customer_name || 'Walk-in'}</span>
                        ${itin.customer_phone ? `
                        <span style="font-size:12px;color:var(--text-muted)">📞 ${itin.customer_phone}</span>` : ''}
                    </div>
                    <div class="itin-detail-item">
                        <span class="detail-label">Destination</span>
                        <span class="detail-value" style="color:#1a5632;font-size:16px">
                            📍 ${itin.destination || 'N/A'}
                        </span>
                        <span style="font-size:12px;color:var(--text-muted)">${itin.tour_type || ''}</span>
                    </div>
                    <div class="itin-detail-item">
                        <span class="detail-label">Travel Date</span>
                        <span class="detail-value">
                            ${itin.travel_date ? formatDate(itin.travel_date) : 'TBD'}
                        </span>
                        ${itin.return_date ? `
                        <span style="font-size:12px;color:var(--text-muted)">Return: ${formatDate(itin.return_date)}</span>` : ''}
                    </div>
                    <div class="itin-detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${nights}N / ${days}D</span>
                        ${itin.hotel ? `
                        <span style="font-size:12px;color:var(--text-muted)">🏨 ${itin.hotel}</span>` : ''}
                    </div>
                    <div class="itin-detail-item">
                        <span class="detail-label">Passengers</span>
                        <span class="detail-value">
                            ${itin.adults || 0}A + ${itin.children || 0}C + ${itin.infants || 0}I
                        </span>
                    </div>
                    <div class="itin-detail-item">
                        <span class="detail-label">Grand Total</span>
                        <span class="detail-value" 
                              style="color:#1a5632;font-weight:700;font-size:20px">
                            ₹${formatAmount(itin.grand_total || 0)}
                        </span>
                        <span style="font-size:12px;color:var(--text-muted)">
                            ₹${formatAmount((itin.grand_total||0)/totalPax)} /person
                        </span>
                    </div>
                </div>
            </div>

            <div class="itin-detail-grid">

                ${itin.days && itin.days.length > 0 ? `
                <div class="card">
                    <div class="itin-section-title">
                        <span class="material-icons-round">today</span>
                        Day-wise Itinerary
                    </div>
                    <div class="itin-days-view">
                        ${itin.days.map(d => `
                            <div class="itin-day-view-row">
                                <div class="itin-day-view-badge">Day ${d.day}</div>
                                <div class="itin-day-view-content">
                                    ${d.title ? `<div class="itin-day-view-title">${d.title}</div>` : ''}
                                    ${d.activities ? `<div class="itin-day-view-activities">${d.activities.replace(/\n/g,'<br>')}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                ${(itin.inclusions || itin.exclusions) ? `
                <div class="itin-inc-exc-grid">
                    ${itin.inclusions ? `
                    <div class="card">
                        <div class="itin-section-title" style="color:#16a34a">
                            <span class="material-icons-round" style="color:#16a34a">check_circle</span>
                            Inclusions
                        </div>
                        <ul class="itin-list-ul incl">
                            ${itin.inclusions.split('\n').filter(l=>l.trim())
                                .map(l=>`<li>${l.replace(/^[✓✅•\-\*]\s*/,'')}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${itin.exclusions ? `
                    <div class="card">
                        <div class="itin-section-title" style="color:#dc2626">
                            <span class="material-icons-round" style="color:#dc2626">cancel</span>
                            Exclusions
                        </div>
                        <ul class="itin-list-ul excl">
                            ${itin.exclusions.split('\n').filter(l=>l.trim())
                                .map(l=>`<li>${l.replace(/^[✗❌•\-\*]\s*/,'')}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                </div>` : ''}

                <div class="card">
                    <div class="itin-section-title">
                        <span class="material-icons-round">currency_rupee</span>
                        Price Breakdown
                    </div>
                    <table class="itin-cost-table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th style="text-align:right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(itin.cost_items || []).map(item => `
                                <tr>
                                    <td>${item.label || ''}</td>
                                    <td style="text-align:right;font-weight:600">
                                        ₹${formatAmount(item.amount || 0)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Subtotal</td>
                                <td style="text-align:right">₹${formatAmount(itin.subtotal || 0)}</td>
                            </tr>
                            ${itin.discount > 0 ? `
                            <tr style="color:#dc2626">
                                <td>Discount</td>
                                <td style="text-align:right">-₹${formatAmount(itin.discount)}</td>
                            </tr>` : ''}
                            ${itin.gst_enabled ? `
                            <tr>
                                <td>GST (${itin.gst_rate}%)</td>
                                <td style="text-align:right">₹${formatAmount(itin.gst_amount || 0)}</td>
                            </tr>` : ''}
                            <tr class="grand-total-row">
                                <td>GRAND TOTAL</td>
                                <td style="text-align:right">₹${formatAmount(itin.grand_total || 0)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    ${itin.payment_terms ? `
                    <div class="itin-payment-terms-badge">
                        💳 ${itin.payment_terms}
                    </div>` : ''}
                </div>

                ${itin.terms ? `
                <div class="card">
                    <div class="itin-section-title">
                        <span class="material-icons-round">gavel</span>
                        Terms & Conditions
                    </div>
                    <div class="itin-terms-text">
                        ${itin.terms.replace(/\n/g,'<br>')}
                    </div>
                </div>` : ''}

            </div>
        `;
    },

    // ============================================
    // CONVERT TO INVOICE
    // ============================================
    convertToInvoice(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) return;

        if (!confirmDialog(
            `Convert "${itin.itin_number}" to Invoice?\n\n` +
            `Customer: ${itin.customer_name}\n` +
            `Destination: ${itin.destination}\n` +
            `Amount: ₹${formatAmount(itin.grand_total || 0)}`
        )) return;

        DB.updateItinerary(id, {
            status: 'converted',
            converted_at: new Date().toISOString()
        });

        window._itinToInvoice = {
            customer_id: itin.customer_id || '',
            customer_name: itin.customer_name || '',
            customer_phone: itin.customer_phone || '',
            customer_email: itin.customer_email || '',
            destination: itin.destination || '',
            nights: itin.nights || '',
            adults: itin.adults || 1,
            children: itin.children || 0,
            travel_date: itin.travel_date || '',
            amount: itin.subtotal || itin.grand_total || 0,
            gst_rate: itin.gst_rate || 5,
            gst_enabled: itin.gst_enabled,
            itin_ref: itin.itin_number,
            description: `Tour Package: ${itin.destination} ` +
                `(${itin.nights || 0}N/${itin.nights ? parseInt(itin.nights)+1:0}D)\n` +
                `Travel Date: ${itin.travel_date ? formatDate(itin.travel_date) : 'TBD'}\n` +
                `Pax: ${itin.adults||0}A + ${itin.children||0}C + ${itin.infants||0}I`
        };

        showToast('✅ Data transferred! Fill invoice details.', 'success');
        setTimeout(() => navigateTo('newInvoice'), 400);
    },

    // ============================================
    // DUPLICATE
    // ============================================
    duplicate(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) return;

        if (!confirmDialog(`Duplicate itinerary "${itin.itin_number}"?`)) return;

        const newData = { ...itin };
        delete newData.id;
        delete newData.created_at;
        delete newData.updated_at;
        delete newData.converted_at;

        newData.itin_number = DB.getNextItinNumber();
        newData.status = 'draft';
        newData.itin_date = getTodayISO();

        const saved = DB.addItinerary(newData);
        showToast('✅ Itinerary duplicated!', 'success');
        setTimeout(() => this.showForm(saved.id), 300);
    },

    // ============================================
    // DELETE
    // ============================================
    deleteItinerary(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) return;

        if (!confirmDialog(`Delete itinerary "${itin.itin_number}"?\nThis cannot be undone.`)) return;

        DB.deleteItinerary(id);
        showToast('🗑️ Itinerary deleted', 'info');
        this.render();
    },

    // ============================================
    // WHATSAPP
    // ============================================
    shareWhatsApp(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) return;

        const settings = DB.getSettings();
        const nights = itin.nights || 0;
        const days = nights ? parseInt(nights) + 1 : 0;

        const msg =
`🌍 *TOUR QUOTATION*
*${settings.company_name || 'TRIPZAR HOLIDAYS LLP'}*
━━━━━━━━━━━━━━━━━━━━

Dear ${itin.customer_name || 'Sir/Ma\'am'},

Thank you for your interest! Here is your personalized tour quotation:

📍 *Destination:* ${itin.destination || 'N/A'}
🏷️ *Tour Type:* ${itin.tour_type || 'N/A'}
🗓️ *Travel Date:* ${itin.travel_date ? formatDate(itin.travel_date) : 'TBD'}
🌙 *Duration:* ${nights} Nights / ${days} Days
🏨 *Hotel:* ${itin.hotel || 'As per itinerary'}
👥 *Pax:* ${itin.adults||0}A + ${itin.children||0}C + ${itin.infants||0}I

💰 *Package Cost: ₹${formatAmount(itin.grand_total || 0)}*
${itin.gst_enabled ? `_(Inclusive of GST @ ${itin.gst_rate}%)_\n` : ''}
⏰ *Valid Till:* ${itin.valid_till ? formatDate(itin.valid_till) : 'N/A'}
💳 *Payment:* ${itin.payment_terms || '50% advance required'}

_For detailed day-wise itinerary PDF, please let us know._

━━━━━━━━━━━━━━━━━━━━
📞 ${settings.phone || ''}
✉️ ${settings.email || ''}
🌐 ${settings.website || ''}

*${settings.company_name || 'TRIPZAR HOLIDAYS LLP'}*
_✈️ Explore Beyond Ordinary_`;

        const phone = (itin.customer_phone || '').replace(/\D/g, '');
        const url = phone
            ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    // ============================================
    // EMAIL
    // ============================================
    shareEmail(id) {
        const itin = DB.getItineraryById(id);
        if (!itin) return;

        const settings = DB.getSettings();
        const nights = itin.nights || 0;
        const days = nights ? parseInt(nights) + 1 : 0;

        const subject = `Tour Quotation - ${itin.destination} | ${itin.itin_number}`;
        const body =
`Dear ${itin.customer_name || 'Sir/Ma\'am'},

Thank you for your interest in our tour package!

TOUR QUOTATION DETAILS
======================
Quotation No : ${itin.itin_number}
Destination  : ${itin.destination}
Tour Type    : ${itin.tour_type}
Travel Date  : ${itin.travel_date ? formatDate(itin.travel_date) : 'TBD'}
Duration     : ${nights} Nights / ${days} Days
Hotel        : ${itin.hotel || 'As per itinerary'}
Passengers   : ${itin.adults||0} Adults + ${itin.children||0} Children

PACKAGE COST : Rs. ${formatAmount(itin.grand_total || 0)}
${itin.gst_enabled ? `(Inclusive of GST @ ${itin.gst_rate}%)` : ''}

Valid Till : ${itin.valid_till ? formatDate(itin.valid_till) : 'N/A'}
Payment    : ${itin.payment_terms || '50% advance required'}

Please find the detailed itinerary PDF attached.

Warm Regards,
${settings.company_name}
Phone: ${settings.phone}
Email: ${settings.email}
Website: ${settings.website}`;

        const email = itin.customer_email || '';
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank');
    },

    // ============================================
    // HELPERS / DEFAULTS
    // ============================================
    getValidTill() {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    },

    getDefaultInclusions() {
        return `Return Airfare (Economy Class)
Hotel Accommodation (As mentioned)
Daily Breakfast
All Airport & Local Transfers
Sightseeing as per Itinerary
Tour Manager Assistance
All Applicable Taxes`;
    },

    getDefaultExclusions() {
        return `Personal Expenses (Shopping, Tips, etc.)
Travel Insurance
Visa Charges (if applicable separately)
Extra Meals (Lunch / Dinner unless mentioned)
Any activity not mentioned in inclusions
Camera fees at monuments
Cost due to natural calamity / political unrest`;
    },

    getDefaultTerms() {
        return `1. 50% advance payment required to confirm booking.
2. Balance payment due 7 days before departure date.
3. Cancellation charges: 25% if cancelled 15+ days before departure.
4. Cancellation charges: 50% if cancelled 7-14 days before departure.
5. Cancellation charges: 100% if cancelled within 7 days of departure.
6. Rates are subject to availability at time of confirmation.
7. Company is not responsible for delays due to weather or political conditions.
8. Passport validity must be minimum 6 months from travel date.
9. Travel insurance is strongly recommended.
10. All disputes subject to Jaipur jurisdiction only.`;
    },

    escHtml(str) {
        return (str || '').replace(/&/g,'&amp;')
                          .replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;')
                          .replace(/"/g,'&quot;');
    }
};
