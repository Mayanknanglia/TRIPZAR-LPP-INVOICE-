/* =============================================
   GST LOOKUP MODULE v2.0
   Auto-fetch company details from GSTIN
   Uses free public APIs with fallbacks
   ============================================= */

const GSTLookup = {

    // ============================================
    // Validate GSTIN format (15 chars)
    // ============================================
    isValidGSTIN(gstin) {
        if (!gstin || gstin.length !== 15) return false;
        const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
        return regex.test(gstin.toUpperCase());
    },

    // ============================================
    // Extract state from GSTIN (first 2 digits)
    // ============================================
    getStateFromGSTIN(gstin) {
        if (!gstin || gstin.length < 2) return null;
        const stateCode = gstin.substring(0, 2);
        for (const [state, code] of Object.entries(INDIAN_STATES)) {
            if (code === stateCode) {
                return { state: state, state_code: stateCode };
            }
        }
        return { state: '', state_code: stateCode };
    },

    // ============================================
    // Extract PAN from GSTIN (chars 3-12)
    // ============================================
    getPANFromGSTIN(gstin) {
        if (!gstin || gstin.length < 12) return '';
        return gstin.substring(2, 12).toUpperCase();
    },

    // ============================================
    // MAIN LOOKUP — Fetch details from GSTIN
    // ============================================
    async lookup(gstin) {
        gstin = (gstin || '').trim().toUpperCase();

        if (!this.isValidGSTIN(gstin)) {
            return {
                success: false,
                error: 'Invalid GSTIN format. Must be 15 characters (e.g., 08ABAFT1155E1ZH)'
            };
        }

        // Extract basic info from GSTIN itself
        const stateInfo = this.getStateFromGSTIN(gstin);
        const pan = this.getPANFromGSTIN(gstin);

        console.log('🔍 Looking up GSTIN:', gstin);

        // Try multiple free APIs
        const apis = [
            { name: 'API 1', fn: () => this.fetchFromAPI1(gstin) },
            { name: 'API 2', fn: () => this.fetchFromAPI2(gstin) },
            { name: 'API 3', fn: () => this.fetchFromAPI3(gstin) }
        ];

        for (const api of apis) {
            try {
                console.log(`Trying ${api.name}...`);
                const result = await api.fn();
                if (result && result.success) {
                    console.log(`✅ Success with ${api.name}`);
                    if (!result.data.state && stateInfo) {
                        result.data.state = stateInfo.state;
                        result.data.state_code = stateInfo.state_code;
                    }
                    if (!result.data.pan) result.data.pan = pan;
                    result.data.gstin = gstin;
                    return result;
                }
            } catch (e) {
                console.log(`${api.name} failed:`, e.message);
                continue;
            }
        }

        // Fallback: Return only info extracted from GSTIN
        console.log('⚠️ All APIs failed, returning basic info from GSTIN');
        return {
            success: true,
            partial: true,
            data: {
                gstin: gstin,
                name: '',
                trade_name: '',
                pan: pan,
                state: stateInfo?.state || '',
                state_code: stateInfo?.state_code || '',
                address: '',
                city: '',
                pincode: '',
                country: 'India',
                status: 'Unknown',
                business_type: ''
            },
            source: 'gstin_extract',
            message: '⚠️ Public GST APIs unavailable. Basic info extracted from GSTIN. Please fill remaining fields manually.'
        };
    },

    // ============================================
    // API 1: sheet.gstincheck.co.in (Free)
    // ============================================
    async fetchFromAPI1(gstin) {
        try {
            const response = await fetch(`https://sheet.gstincheck.co.in/check/${gstin}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) return null;

            const result = await response.json();

            if (result && result.flag === true && result.data) {
                const d = result.data;
                const addr = d.pradr?.addr || {};
                const fullAddress = [addr.bno, addr.flno, addr.bnm, addr.st, addr.loc, addr.dst]
                    .filter(x => x).join(', ');

                return {
                    success: true,
                    data: {
                        gstin: gstin,
                        name: d.lgnm || '',
                        trade_name: d.tradeNam || '',
                        legal_name: d.lgnm || '',
                        pan: this.getPANFromGSTIN(gstin),
                        state: addr.stcd || this.getStateName(gstin.substring(0, 2)),
                        state_code: gstin.substring(0, 2),
                        address: fullAddress,
                        building: addr.bno || '',
                        street: addr.st || '',
                        area: addr.loc || '',
                        city: addr.dst || '',
                        pincode: addr.pncd || '',
                        country: 'India',
                        status: d.sts || '',
                        registration_date: d.rgdt || '',
                        business_type: d.ctb || '',
                        nature_of_business: d.nba ? d.nba.join(', ') : ''
                    },
                    source: 'gstincheck.co.in'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    // ============================================
    // API 2: Backup
    // ============================================
    async fetchFromAPI2(gstin) {
        try {
            const response = await fetch(`https://api.gsp.gstsystem.co.in/commonapi/v1.1/search?action=TP&gstin=${gstin}`, {
                method: 'GET'
            });

            if (!response.ok) return null;
            const result = await response.json();

            if (result && result.tradeNam) {
                return {
                    success: true,
                    data: {
                        gstin: gstin,
                        name: result.lgnm || result.tradeNam || '',
                        trade_name: result.tradeNam || '',
                        pan: this.getPANFromGSTIN(gstin),
                        state: this.getStateName(gstin.substring(0, 2)),
                        state_code: gstin.substring(0, 2),
                        country: 'India'
                    },
                    source: 'gstsystem'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    // ============================================
    // API 3: Another fallback
    // ============================================
    async fetchFromAPI3(gstin) {
        try {
            const response = await fetch(`https://services.gst.gov.in/services/api/search/taxpayerDetails?gstin=${gstin}`);
            if (!response.ok) return null;
            const result = await response.json();
            
            if (result && result.tradeNam) {
                return {
                    success: true,
                    data: {
                        gstin: gstin,
                        name: result.lgnm || result.tradeNam,
                        trade_name: result.tradeNam,
                        pan: this.getPANFromGSTIN(gstin),
                        state: this.getStateName(gstin.substring(0, 2)),
                        state_code: gstin.substring(0, 2),
                        country: 'India',
                        status: result.sts
                    },
                    source: 'gst.gov.in'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    // Helper: Get state name from code
    getStateName(code) {
        for (const [state, stateCode] of Object.entries(INDIAN_STATES)) {
            if (stateCode === code) return state;
        }
        return '';
    }
};
