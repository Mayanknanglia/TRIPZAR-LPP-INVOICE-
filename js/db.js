/* =============================================
   DATABASE v4 - With Sales + Purchase + Suppliers
   ============================================= */

const DB = {
    KEYS: {
        SETTINGS: 'tripzar_settings',
        CUSTOMERS: 'tripzar_customers',
        INVOICES: 'tripzar_invoices',
        PURCHASES: 'tripzar_purchases',
        SUPPLIERS: 'tripzar_suppliers',
        FY_COUNTER: 'tripzar_fy_counter',
        AUTH: 'tripzar_auth',
        THEME: 'tripzar_theme'
    },

    init() {
        if (!localStorage.getItem(this.KEYS.SETTINGS)) {
            this.saveSettings(this.getDefaultSettings());
        } else {
            // Migrate old settings - add new fields
            const s = JSON.parse(localStorage.getItem(this.KEYS.SETTINGS));
            const def = this.getDefaultSettings();
            let updated = false;
            ['building', 'street', 'area', 'city', 'pincode', 'country', 'invoice_type'].forEach(k => {
                if (s[k] === undefined) { s[k] = def[k]; updated = true; }
            });
            if (updated) this.saveSettings(s);
        }
        
        if (!localStorage.getItem(this.KEYS.CUSTOMERS)) {
            localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.INVOICES)) {
            localStorage.setItem(this.KEYS.INVOICES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.PURCHASES)) {
            localStorage.setItem(this.KEYS.PURCHASES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.SUPPLIERS)) {
            localStorage.setItem(this.KEYS.SUPPLIERS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.FY_COUNTER)) {
            localStorage.setItem(this.KEYS.FY_COUNTER, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.KEYS.AUTH)) {
            localStorage.setItem(this.KEYS.AUTH, JSON.stringify({
                username: 'admin',
                password: 'tripzar@123',
                full_name: 'Admin',
                role: 'Administrator',
                email: '',
                phone: '',
                profile_photo: ''
            }));
        } else {
            const auth = JSON.parse(localStorage.getItem(this.KEYS.AUTH));
            let updated = false;
            if (!auth.full_name) { auth.full_name = 'Admin'; updated = true; }
            if (!auth.role) { auth.role = 'Administrator'; updated = true; }
            if (auth.email === undefined) { auth.email = ''; updated = true; }
            if (auth.phone === undefined) { auth.phone = ''; updated = true; }
            if (auth.profile_photo === undefined) { auth.profile_photo = ''; updated = true; }
            if (updated) localStorage.setItem(this.KEYS.AUTH, JSON.stringify(auth));
        }
    },

    getDefaultSettings() {
        return {
            company_name: 'TRIPZAR HOLIDAYS LLP',
            building: '54/90',
            street: 'Rajat Path',
            area: 'Mansarovar',
            city: 'Jaipur',
            state: 'Rajasthan',
            state_code: '08',
            pincode: '302020',
            country: 'India',
            address_line1: '',
            address_line2: '',
            gstin: '08ABAFT1155E1ZH',
            udyam: 'UDYAM-RJ-17-0654057 (Micro/Services)',
            pan: 'ABAFT1155E',
            phone: '7597251446',
            email: 'tripzarholidays@gmail.com',
            website: 'www.tripzar.in',
            bank_name: 'STATE BANK OF INDIA (C/A)',
            bank_account_name: 'TRIPZAR HOLIDAYS LLP',
            bank_account_no: '45236582247',
            bank_branch: 'NIRMAN NAGAR JAIPUR',
            bank_ifsc: 'SBIN0013139',
            invoice_type: 'Tax Invoice',
            declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. All disputes are subject to Jaipur jurisdiction only.'
        };
    },

    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || this.getDefaultSettings();
    },
    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    getAuth() { return JSON.parse(localStorage.getItem(this.KEYS.AUTH)); },
    saveAuth(auth) { localStorage.setItem(this.KEYS.AUTH, JSON.stringify(auth)); },

    // ==============================================
    // CUSTOMERS
    // ==============================================
    getCustomers() { return JSON.parse(localStorage.getItem(this.KEYS.CUSTOMERS)) || []; },
    saveCustomers(customers) { localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(customers)); },
    addCustomer(customer) {
        const customers = this.getCustomers();
        customer.id = generateId();
        customer.created_at = new Date().toISOString();
        customers.push(customer);
        this.saveCustomers(customers);
        return customer;
    },
    updateCustomer(id, data) {
        const customers = this.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) return null;
        customers[index] = { ...customers[index], ...data, updated_at: new Date().toISOString() };
        this.saveCustomers(customers);
        return customers[index];
    },
    deleteCustomer(id) {
        const invoices = this.getInvoices();
        const hasInvoices = invoices.some(inv => inv.customer_id === id && inv.status !== 'deleted');
        if (hasInvoices) return false;
        const customers = this.getCustomers().filter(c => c.id !== id);
        this.saveCustomers(customers);
        return true;
    },
    getCustomerById(id) { return this.getCustomers().find(c => c.id === id); },
    searchCustomers(query) {
        if (!query) return this.getCustomers();
        const q = query.toLowerCase();
        return this.getCustomers().filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.gst_no || '').toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    },

    // ==============================================
    // INVOICES (Sales)
    // ==============================================
    getInvoices() { return JSON.parse(localStorage.getItem(this.KEYS.INVOICES)) || []; },
    saveInvoices(invoices) { localStorage.setItem(this.KEYS.INVOICES, JSON.stringify(invoices)); },
    getActiveInvoices() { return this.getInvoices().filter(inv => inv.status !== 'deleted'); },
    addInvoice(invoice) {
        const invoices = this.getInvoices();
        invoice.id = generateId();
        invoice.created_at = new Date().toISOString();
        invoice.status = 'active';
        invoices.push(invoice);
        this.saveInvoices(invoices);
        this.incrementFYCounter(invoice.financial_year);
        return invoice;
    },
    updateInvoice(id, data) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return null;
        invoices[index] = { ...invoices[index], ...data, updated_at: new Date().toISOString() };
        this.saveInvoices(invoices);
        return invoices[index];
    },
    deleteInvoice(id) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return false;
        invoices[index].status = 'deleted';
        this.saveInvoices(invoices);
        return true;
    },
    getInvoiceById(id) { return this.getInvoices().find(inv => inv.id === id); },
    searchInvoices(query, filters = {}) {
        let invoices = this.getActiveInvoices();
        if (query) {
            const q = query.toLowerCase();
            invoices = invoices.filter(inv =>
                (inv.invoice_number || '').toLowerCase().includes(q) ||
                (inv.customer_name || '').toLowerCase().includes(q) ||
                (inv.customer_gst || '').toLowerCase().includes(q)
            );
        }
        if (filters.financial_year) invoices = invoices.filter(inv => inv.financial_year === filters.financial_year);
        if (filters.payment_status) invoices = invoices.filter(inv => inv.payment_status === filters.payment_status);
        if (filters.from_date) invoices = invoices.filter(inv => inv.invoice_date >= filters.from_date);
        if (filters.to_date) invoices = invoices.filter(inv => inv.invoice_date <= filters.to_date);
        invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return invoices;
    },

    // ==============================================
    // ⭐ PURCHASES (NEW)
    // ==============================================
    getPurchases() { return JSON.parse(localStorage.getItem(this.KEYS.PURCHASES)) || []; },
    savePurchases(purchases) { localStorage.setItem(this.KEYS.PURCHASES, JSON.stringify(purchases)); },
    getActivePurchases() { return this.getPurchases().filter(p => p.status !== 'deleted'); },
    getPurchaseById(id) { return this.getPurchases().find(p => p.id === id); },

    addPurchase(data) {
        const purchases = this.getPurchases();
        const purchase = {
            id: 'PUR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            created_at: new Date().toISOString(),
            status: 'active',
            ...data
        };
        purchases.push(purchase);
        this.savePurchases(purchases);
        return purchase;
    },

    updatePurchase(id, data) {
        const purchases = this.getPurchases();
        const idx = purchases.findIndex(p => p.id === id);
        if (idx !== -1) {
            purchases[idx] = { ...purchases[idx], ...data, updated_at: new Date().toISOString() };
            this.savePurchases(purchases);
            return purchases[idx];
        }
        return null;
    },

    deletePurchase(id) {
        const purchases = this.getPurchases();
        const idx = purchases.findIndex(p => p.id === id);
        if (idx !== -1) {
            purchases[idx].status = 'deleted';
            purchases[idx].deleted_at = new Date().toISOString();
            this.savePurchases(purchases);
            return true;
        }
        return false;
    },

    searchPurchases(query, filters = {}) {
        let purchases = this.getActivePurchases();
        if (query) {
            const q = query.toLowerCase();
            purchases = purchases.filter(p =>
                (p.bill_no || '').toLowerCase().includes(q) ||
                (p.supplier_name || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }
        if (filters.category) purchases = purchases.filter(p => p.category === filters.category);
        if (filters.payment_status) purchases = purchases.filter(p => p.payment_status === filters.payment_status);
        if (filters.financial_year) purchases = purchases.filter(p => p.financial_year === filters.financial_year);
        if (filters.supplier) purchases = purchases.filter(p => p.supplier_name === filters.supplier);
        return purchases.sort((a, b) => new Date(b.bill_date || b.created_at) - new Date(a.bill_date || a.created_at));
    },

    // ==============================================
    // ⭐ SUPPLIERS (NEW)
    // ==============================================
    getSuppliers() { return JSON.parse(localStorage.getItem(this.KEYS.SUPPLIERS)) || []; },
    saveSuppliers(suppliers) { localStorage.setItem(this.KEYS.SUPPLIERS, JSON.stringify(suppliers)); },
    getSupplierById(id) { return this.getSuppliers().find(s => s.id === id); },

    addSupplier(data) {
        const suppliers = this.getSuppliers();
        const supplier = {
            id: 'SUP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            created_at: new Date().toISOString(),
            ...data
        };
        suppliers.push(supplier);
        this.saveSuppliers(suppliers);
        return supplier;
    },

    updateSupplier(id, data) {
        const suppliers = this.getSuppliers();
        const idx = suppliers.findIndex(s => s.id === id);
        if (idx !== -1) {
            suppliers[idx] = { ...suppliers[idx], ...data };
            this.saveSuppliers(suppliers);
            return suppliers[idx];
        }
        return null;
    },

    deleteSupplier(id) {
        const suppliers = this.getSuppliers().filter(s => s.id !== id);
        this.saveSuppliers(suppliers);
    },

    getSupplierStats(supplierName) {
        const purchases = this.getActivePurchases().filter(p => p.supplier_name === supplierName);
        const totalAmount = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalPaid = purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        return {
            totalBills: purchases.length,
            totalAmount: totalAmount,
            totalPaid: totalPaid,
            pending: totalAmount - totalPaid
        };
    },

    // ==============================================
    // FY COUNTERS
    // ==============================================
    getFYCounters() { return JSON.parse(localStorage.getItem(this.KEYS.FY_COUNTER)) || {}; },
    incrementFYCounter(fy) {
        const counters = this.getFYCounters();
        counters[fy] = (counters[fy] || 0) + 1;
        localStorage.setItem(this.KEYS.FY_COUNTER, JSON.stringify(counters));
    },
    getNextInvoiceNumber() {
        const fy = getCurrentFY();
        const counters = this.getFYCounters();
        const nextNum = (counters[fy] || 0) + 1;
        return { invoiceNumber: `TZ/${fy}/${String(nextNum).padStart(3, '0')}`, financialYear: fy };
    },

    // ==============================================
    // THEME
    // ==============================================
    getTheme() { return localStorage.getItem(this.KEYS.THEME) || 'light'; },
    saveTheme(theme) { localStorage.setItem(this.KEYS.THEME, theme); },

    // ==============================================
    // EXPORT / IMPORT ALL DATA
    // ==============================================
    exportAllData() {
        return {
            settings: this.getSettings(),
            customers: this.getCustomers(),
            invoices: this.getInvoices(),
            purchases: this.getPurchases(),
            suppliers: this.getSuppliers(),
            fy_counters: this.getFYCounters(),
            auth: { ...this.getAuth(), password: undefined },
            exported_at: new Date().toISOString(),
            version: '4.0.0'
        };
    },
    importAllData(data) {
        if (data.settings) this.saveSettings(data.settings);
        if (data.customers) this.saveCustomers(data.customers);
        if (data.invoices) this.saveInvoices(data.invoices);
        if (data.purchases) this.savePurchases(data.purchases);
        if (data.suppliers) this.saveSuppliers(data.suppliers);
        if (data.fy_counters) localStorage.setItem(this.KEYS.FY_COUNTER, JSON.stringify(data.fy_counters));
        if (data.auth) {
            const currentAuth = this.getAuth();
            this.saveAuth({ ...data.auth, password: currentAuth.password });
        }
        return true;
    }
};