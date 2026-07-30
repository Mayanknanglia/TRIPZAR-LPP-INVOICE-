/* =============================================
   FIREBASE SYNC v5.0 - WITH ITINERARY SYNC
   Everything: Invoices + Customers + Purchases + Suppliers + Itineraries + Settings + Auth
   ============================================= */

const FirebaseSync = {
    FIREBASE_EMAIL: 'admin@tripzar.com',
    FIREBASE_PASSWORD: 'tripzar@123',
    
    initialized: false,
    online: navigator.onLine,
    listeners: [],
    userId: null,
    autoLoginAttempted: false,

    async init() {
        if (typeof window.firebaseDB === 'undefined') {
            console.error('❌ Firebase SDK not loaded');
            return false;
        }

        this.initialized = true;

        window.addEventListener('online', () => {
            this.online = true;
            console.log('🌐 Back online');
            this.syncPendingChanges();
            if (!this.userId) this.autoLogin();
        });

        window.addEventListener('offline', () => {
            this.online = false;
            console.log('📴 Offline');
        });

        if (window.fbOnAuthStateChanged) {
            window.fbOnAuthStateChanged(window.firebaseAuth, (user) => {
                if (user) {
                    this.userId = user.uid;
                    console.log('✅ Firebase user active:', user.email);
                    this.startRealtimeSync();
                } else {
                    this.userId = null;
                    this.stopRealtimeSync();
                }
            });
        }

        console.log('✅ FirebaseSync v5.0 initialized');
        setTimeout(() => this.autoLogin(), 500);
        return true;
    },

    async autoLogin() {
        if (!this.online) return;
        if (this.userId) return;
        if (this.autoLoginAttempted) return;

        this.autoLoginAttempted = true;

        try {
            console.log('🔥 Auto logging in to Firebase...');
            const userCred = await window.fbSignIn(
                window.firebaseAuth,
                this.FIREBASE_EMAIL,
                this.FIREBASE_PASSWORD
            );
            this.userId = userCred.user.uid;
            console.log('✅ Firebase auto-login SUCCESS');
            setTimeout(async () => { await this.fullSync(); }, 1000);
        } catch (error) {
            console.error('Firebase auto-login error:', error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                await this.autoCreateUser();
            }
        }
    },

    async autoCreateUser() {
        try {
            if (typeof window.fbCreateUser === 'undefined') return;
            console.log('🔧 Creating Firebase user...');
            const userCred = await window.fbCreateUser(
                window.firebaseAuth,
                this.FIREBASE_EMAIL,
                this.FIREBASE_PASSWORD
            );
            this.userId = userCred.user.uid;
            console.log('✅ Firebase user created!');
            setTimeout(async () => { await this.fullSync(); }, 1000);
        } catch (error) {
            console.error('Auto create user error:', error);
        }
    },

    async login(email, password) {
        try {
            const userCred = await window.fbSignIn(window.firebaseAuth, email, password);
            this.userId = userCred.user.uid;
            return { success: true, user: userCred.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async logout() {
        try {
            await window.fbSignOut(window.firebaseAuth);
            this.userId = null;
            this.autoLoginAttempted = false;
            this.stopRealtimeSync();
            return true;
        } catch (e) { return false; }
    },

    // ============================================
    // FULL SYNC (Cloud → Local) — Everything!
    // ============================================
    async fullSync() {
        if (!this.online || !this.userId) return;

        console.log('🔄 Full sync with cloud...');

        try {
            // 1. INVOICES
            const invoicesSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'invoices')
            );
            const invoices = [];
            invoicesSnap.forEach(doc => invoices.push(doc.data()));
            if (invoices.length > 0) {
                DB.saveInvoices(invoices);
                console.log(`✅ ${invoices.length} invoices synced`);
            }

            // 2. CUSTOMERS
            const customersSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'customers')
            );
            const customers = [];
            customersSnap.forEach(doc => customers.push(doc.data()));
            if (customers.length > 0) {
                DB.saveCustomers(customers);
                console.log(`✅ ${customers.length} customers synced`);
            }

            // 3. PURCHASES
            const purchasesSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'purchases')
            );
            const purchases = [];
            purchasesSnap.forEach(doc => purchases.push(doc.data()));
            if (purchases.length > 0) {
                DB.savePurchases(purchases);
                console.log(`✅ ${purchases.length} purchases synced`);
            }

            // 4. SUPPLIERS
            const suppliersSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'suppliers')
            );
            const suppliers = [];
            suppliersSnap.forEach(doc => suppliers.push(doc.data()));
            if (suppliers.length > 0) {
                DB.saveSuppliers(suppliers);
                console.log(`✅ ${suppliers.length} suppliers synced`);
            }

            // 5. ⭐ ITINERARIES (NEW)
            const itinsSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'itineraries')
            );
            const itineraries = [];
            itinsSnap.forEach(doc => itineraries.push(doc.data()));
            if (itineraries.length > 0) {
                DB.saveItineraries(itineraries);
                console.log(`✅ ${itineraries.length} itineraries synced`);
            }

            // 6. SETTINGS (includes logo)
            const settingsSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'settings')
            );
            settingsSnap.forEach(doc => {
                if (doc.id === 'company') {
                    DB.saveSettings(doc.data());
                    console.log('✅ Settings + Logo synced');
                }
            });

            // 7. AUTH (Profile + Password + Photo)
            const authSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'auth')
            );
            authSnap.forEach(doc => {
                if (doc.id === 'user') {
                    DB.saveAuth(doc.data());
                    console.log('✅ Profile + Photo synced');
                }
            });

            // 8. FY COUNTERS
            const fyCountersSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'fy_counters')
            );
            const counters = {};
            fyCountersSnap.forEach(doc => {
                counters[doc.id] = doc.data().count;
            });
            if (Object.keys(counters).length > 0) {
                localStorage.setItem('tripzar_fy_counter', JSON.stringify(counters));
            }

            // 9. ⭐ ITINERARY COUNTER (NEW)
            const itinCounterSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'itin_counter')
            );
            itinCounterSnap.forEach(doc => {
                if (doc.id === 'current') {
                    localStorage.setItem('tripzar_itin_counter', 
                        String(doc.data().count || 0));
                }
            });

            if (invoices.length > 0 || customers.length > 0 || 
                purchases.length > 0 || itineraries.length > 0) {
                if (typeof showToast === 'function') {
                    showToast('☁️ Everything synced from cloud', 'success');
                }
            }

            this.refreshCurrentPage();
            if (typeof syncAppLogo === 'function') syncAppLogo();
            if (typeof updateNavbarUserName === 'function') updateNavbarUserName();

        } catch (error) {
            console.error('Full sync error:', error);
        }
    },

    // ============================================
    // REAL-TIME SYNC — Everything!
    // ============================================
    startRealtimeSync() {
        if (!this.online || !this.userId) return;
        this.stopRealtimeSync();

        try {
            // Invoices
            const invUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'invoices'),
                (snapshot) => {
                    const invoices = [];
                    snapshot.forEach(doc => invoices.push(doc.data()));
                    DB.saveInvoices(invoices);
                    console.log(`🔄 Real-time: ${invoices.length} invoices`);
                    this.refreshCurrentPage();
                }
            );
            this.listeners.push(invUnsub);

            // Customers
            const custUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'customers'),
                (snapshot) => {
                    const customers = [];
                    snapshot.forEach(doc => customers.push(doc.data()));
                    DB.saveCustomers(customers);
                    console.log(`🔄 Real-time: ${customers.length} customers`);
                    if (document.getElementById('page-customers')?.classList.contains('active')) {
                        if (typeof renderCustomers === 'function') renderCustomers();
                    }
                }
            );
            this.listeners.push(custUnsub);

            // Purchases
            const purUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'purchases'),
                (snapshot) => {
                    const purchases = [];
                    snapshot.forEach(doc => purchases.push(doc.data()));
                    DB.savePurchases(purchases);
                    console.log(`🔄 Real-time: ${purchases.length} purchases`);
                    if (document.getElementById('page-purchases')?.classList.contains('active')) {
                        if (typeof renderPurchaseList === 'function') renderPurchaseList();
                    }
                }
            );
            this.listeners.push(purUnsub);

            // Suppliers
            const supUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'suppliers'),
                (snapshot) => {
                    const suppliers = [];
                    snapshot.forEach(doc => suppliers.push(doc.data()));
                    DB.saveSuppliers(suppliers);
                    console.log(`🔄 Real-time: ${suppliers.length} suppliers`);
                    if (document.getElementById('page-suppliers')?.classList.contains('active')) {
                        if (typeof renderSuppliers === 'function') renderSuppliers();
                    }
                }
            );
            this.listeners.push(supUnsub);

            // ⭐ ITINERARIES (NEW)
            const itinUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'itineraries'),
                (snapshot) => {
                    const itineraries = [];
                    snapshot.forEach(doc => itineraries.push(doc.data()));
                    DB.saveItineraries(itineraries);
                    console.log(`🔄 Real-time: ${itineraries.length} itineraries`);
                    if (document.getElementById('page-itinerary')?.classList.contains('active')) {
                        if (typeof Itinerary !== 'undefined' && Itinerary.render) {
                            // Only refresh list view (not detail/form)
                            const hasList = document.getElementById('itinList');
                            if (hasList) Itinerary.render();
                        }
                    }
                }
            );
            this.listeners.push(itinUnsub);

            // Settings + Logo
            const setUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'settings'),
                (snapshot) => {
                    snapshot.forEach(doc => {
                        if (doc.id === 'company') {
                            DB.saveSettings(doc.data());
                            if (typeof syncAppLogo === 'function') syncAppLogo();
                        }
                    });
                    console.log('🔄 Real-time: Settings + Logo');
                }
            );
            this.listeners.push(setUnsub);

            // Auth (Profile + Photo)
            const authUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'auth'),
                (snapshot) => {
                    snapshot.forEach(doc => {
                        if (doc.id === 'user') {
                            DB.saveAuth(doc.data());
                            if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
                        }
                    });
                    console.log('🔄 Real-time: Profile + Photo');
                }
            );
            this.listeners.push(authUnsub);

            console.log('👂 Real-time sync ACTIVE (All data + Itineraries)');
        } catch (error) {
            console.error('Realtime sync error:', error);
        }
    },

    stopRealtimeSync() {
        this.listeners.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        this.listeners = [];
    },

    // ============================================
    // SAVE OPERATIONS
    // ============================================
    async saveInvoice(invoice) {
        const invoices = DB.getInvoices();
        const idx = invoices.findIndex(i => i.id === invoice.id);
        if (idx !== -1) invoices[idx] = invoice;
        else invoices.push(invoice);
        DB.saveInvoices(invoices);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'invoices', invoice.id),
                    invoice
                );
                console.log('✅ Invoice synced:', invoice.invoice_number);

                const fyCounters = DB.getFYCounters();
                if (invoice.financial_year && fyCounters[invoice.financial_year]) {
                    await window.fbSetDoc(
                        window.fbDoc(window.firebaseDB, 'fy_counters', invoice.financial_year),
                        { count: fyCounters[invoice.financial_year] }
                    );
                }
                return true;
            } catch (error) {
                this.queueChange('invoice', invoice);
                return false;
            }
        } else {
            this.queueChange('invoice', invoice);
        }
    },

    async saveCustomer(customer) {
        const customers = DB.getCustomers();
        const idx = customers.findIndex(c => c.id === customer.id);
        if (idx !== -1) customers[idx] = customer;
        else customers.push(customer);
        DB.saveCustomers(customers);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'customers', customer.id),
                    customer
                );
                console.log('✅ Customer synced');
                return true;
            } catch (error) {
                this.queueChange('customer', customer);
                return false;
            }
        } else {
            this.queueChange('customer', customer);
        }
    },

    async savePurchase(purchase) {
        const purchases = DB.getPurchases();
        const idx = purchases.findIndex(p => p.id === purchase.id);
        if (idx !== -1) purchases[idx] = purchase;
        else purchases.push(purchase);
        DB.savePurchases(purchases);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'purchases', purchase.id),
                    purchase
                );
                console.log('✅ Purchase synced:', purchase.bill_no);
                return true;
            } catch (error) {
                console.error('Purchase sync error:', error);
                this.queueChange('purchase', purchase);
                return false;
            }
        } else {
            this.queueChange('purchase', purchase);
        }
    },

    async saveSupplier(supplier) {
        const suppliers = DB.getSuppliers();
        const idx = suppliers.findIndex(s => s.id === supplier.id);
        if (idx !== -1) suppliers[idx] = supplier;
        else suppliers.push(supplier);
        DB.saveSuppliers(suppliers);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'suppliers', supplier.id),
                    supplier
                );
                console.log('✅ Supplier synced:', supplier.name);
                return true;
            } catch (error) {
                console.error('Supplier sync error:', error);
                this.queueChange('supplier', supplier);
                return false;
            }
        } else {
            this.queueChange('supplier', supplier);
        }
    },

    // ⭐ NEW: Save Itinerary
    async saveItinerary(itinerary) {
        const itineraries = DB.getItineraries();
        const idx = itineraries.findIndex(i => i.id === itinerary.id);
        if (idx !== -1) itineraries[idx] = itinerary;
        else itineraries.push(itinerary);
        DB.saveItineraries(itineraries);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'itineraries', itinerary.id),
                    itinerary
                );
                console.log('✅ Itinerary synced:', itinerary.itin_number);

                // Also sync counter
                const counter = parseInt(
                    localStorage.getItem('tripzar_itin_counter') || '0'
                );
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'itin_counter', 'current'),
                    { count: counter }
                );
                return true;
            } catch (error) {
                console.error('Itinerary sync error:', error);
                this.queueChange('itinerary', itinerary);
                return false;
            }
        } else {
            this.queueChange('itinerary', itinerary);
        }
    },

    // ⭐ NEW: Bulk sync all itineraries (called from Itinerary.js)
    async syncItineraries() {
        if (!this.online || !this.userId) return;

        try {
            const itineraries = DB.getItineraries();
            for (const itin of itineraries) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'itineraries', itin.id),
                    itin
                );
            }

            // Sync counter too
            const counter = parseInt(
                localStorage.getItem('tripzar_itin_counter') || '0'
            );
            await window.fbSetDoc(
                window.fbDoc(window.firebaseDB, 'itin_counter', 'current'),
                { count: counter }
            );

            console.log(`✅ ${itineraries.length} itineraries synced to cloud`);
            return true;
        } catch (error) {
            console.error('Bulk itinerary sync error:', error);
            return false;
        }
    },

    async saveSettings(settings) {
        DB.saveSettings(settings);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'settings', 'company'),
                    settings
                );
                console.log('✅ Settings + Logo synced');
                return true;
            } catch (error) {
                console.error('Settings sync error:', error);
                return false;
            }
        }
    },

    async saveAuth(auth) {
        DB.saveAuth(auth);

        if (this.online && this.userId) {
            try {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'auth', 'user'),
                    auth
                );
                console.log('✅ Profile + Photo synced');
                return true;
            } catch (error) {
                console.error('Auth sync error:', error);
                return false;
            }
        }
    },

    async deleteInvoice(id) {
        const invoices = DB.getInvoices();
        const inv = invoices.find(i => i.id === id);
        if (inv) inv.status = 'deleted';
        DB.saveInvoices(invoices);

        if (this.online && this.userId) {
            try {
                if (inv) {
                    await window.fbSetDoc(
                        window.fbDoc(window.firebaseDB, 'invoices', id),
                        inv
                    );
                }
                return true;
            } catch (error) { return false; }
        }
    },

    async deleteCustomer(id) {
        const customers = DB.getCustomers().filter(c => c.id !== id);
        DB.saveCustomers(customers);

        if (this.online && this.userId) {
            try {
                await window.fbDeleteDoc(
                    window.fbDoc(window.firebaseDB, 'customers', id)
                );
                return true;
            } catch (error) { return false; }
        }
    },

    async deletePurchase(id) {
        const purchases = DB.getPurchases();
        const p = purchases.find(x => x.id === id);
        if (p) p.status = 'deleted';
        DB.savePurchases(purchases);

        if (this.online && this.userId) {
            try {
                if (p) {
                    await window.fbSetDoc(
                        window.fbDoc(window.firebaseDB, 'purchases', id),
                        p
                    );
                }
                return true;
            } catch (error) { return false; }
        }
    },

    async deleteSupplier(id) {
        const suppliers = DB.getSuppliers().filter(s => s.id !== id);
        DB.saveSuppliers(suppliers);

        if (this.online && this.userId) {
            try {
                await window.fbDeleteDoc(
                    window.fbDoc(window.firebaseDB, 'suppliers', id)
                );
                return true;
            } catch (error) { return false; }
        }
    },

    // ⭐ NEW: Delete Itinerary
    async deleteItinerary(id) {
        const itineraries = DB.getItineraries();
        const itin = itineraries.find(i => i.id === id);
        if (itin) itin.status = 'deleted';
        DB.saveItineraries(itineraries);

        if (this.online && this.userId) {
            try {
                if (itin) {
                    await window.fbSetDoc(
                        window.fbDoc(window.firebaseDB, 'itineraries', id),
                        itin
                    );
                }
                return true;
            } catch (error) { return false; }
        }
    },

    // ============================================
    // OFFLINE QUEUE
    // ============================================
    queueChange(type, data) {
        const queue = JSON.parse(localStorage.getItem('firebase_queue') || '[]');
        queue.push({ type, data, timestamp: Date.now() });
        localStorage.setItem('firebase_queue', JSON.stringify(queue));
    },

    async syncPendingChanges() {
        const queue = JSON.parse(localStorage.getItem('firebase_queue') || '[]');
        if (queue.length === 0) return;

        console.log(`🔄 Syncing ${queue.length} pending...`);

        for (const item of queue) {
            if (item.type === 'invoice') await this.saveInvoice(item.data);
            else if (item.type === 'customer') await this.saveCustomer(item.data);
            else if (item.type === 'purchase') await this.savePurchase(item.data);
            else if (item.type === 'supplier') await this.saveSupplier(item.data);
            else if (item.type === 'itinerary') await this.saveItinerary(item.data);
            else if (item.type === 'auth') await this.saveAuth(item.data);
            else if (item.type === 'settings') await this.saveSettings(item.data);
        }

        localStorage.removeItem('firebase_queue');
        console.log('✅ All pending synced');
    },

    // ============================================
    // MIGRATE LOCAL → CLOUD (First time upload)
    // ============================================
    async migrateLocalToCloud() {
        if (!this.online || !this.userId) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Wait for auto-login', 'warning');
            }
            return;
        }

        if (typeof showToast === 'function') {
            showToast('🚀 Uploading everything to cloud...', 'info');
        }

        try {
            // 1. Invoices
            const invoices = DB.getInvoices();
            for (const inv of invoices) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'invoices', inv.id),
                    inv
                );
            }
            console.log(`✅ ${invoices.length} invoices uploaded`);

            // 2. Customers
            const customers = DB.getCustomers();
            for (const cust of customers) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'customers', cust.id),
                    cust
                );
            }
            console.log(`✅ ${customers.length} customers uploaded`);

            // 3. Purchases
            const purchases = DB.getPurchases();
            for (const pur of purchases) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'purchases', pur.id),
                    pur
                );
            }
            console.log(`✅ ${purchases.length} purchases uploaded`);

            // 4. Suppliers
            const suppliers = DB.getSuppliers();
            for (const sup of suppliers) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'suppliers', sup.id),
                    sup
                );
            }
            console.log(`✅ ${suppliers.length} suppliers uploaded`);

            // 5. ⭐ ITINERARIES (NEW)
            const itineraries = DB.getItineraries();
            for (const itin of itineraries) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'itineraries', itin.id),
                    itin
                );
            }
            console.log(`✅ ${itineraries.length} itineraries uploaded`);

            // 6. Settings + Logo
            const settings = DB.getSettings();
            await window.fbSetDoc(
                window.fbDoc(window.firebaseDB, 'settings', 'company'),
                settings
            );
            console.log('✅ Settings + Logo uploaded');

            // 7. Auth (Profile + Photo + Password)
            const auth = DB.getAuth();
            await window.fbSetDoc(
                window.fbDoc(window.firebaseDB, 'auth', 'user'),
                auth
            );
            console.log('✅ Profile + Photo uploaded');

            // 8. FY Counters
            const counters = DB.getFYCounters();
            for (const [fy, count] of Object.entries(counters)) {
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'fy_counters', fy),
                    { count: count }
                );
            }

            // 9. ⭐ Itinerary Counter (NEW)
            const itinCounter = parseInt(
                localStorage.getItem('tripzar_itin_counter') || '0'
            );
            await window.fbSetDoc(
                window.fbDoc(window.firebaseDB, 'itin_counter', 'current'),
                { count: itinCounter }
            );

            if (typeof showToast === 'function') {
                showToast(
                    `🎉 Uploaded! ${invoices.length} invoices, ${customers.length} customers, ` +
                    `${purchases.length} purchases, ${suppliers.length} suppliers, ` +
                    `${itineraries.length} itineraries`,
                    'success'
                );
            }
            return true;

        } catch (error) {
            console.error('Migration error:', error);
            if (typeof showToast === 'function') {
                showToast('⚠️ Upload failed: ' + error.message, 'error');
            }
            return false;
        }
    },

    refreshCurrentPage() {
        try {
            if (document.getElementById('page-dashboard')?.classList.contains('active')) {
                if (typeof renderDashboard === 'function') renderDashboard();
            }
            if (document.getElementById('page-invoices')?.classList.contains('active')) {
                if (typeof renderInvoiceList === 'function') renderInvoiceList();
            }
            if (document.getElementById('page-customers')?.classList.contains('active')) {
                if (typeof renderCustomers === 'function') renderCustomers();
            }
            if (document.getElementById('page-purchases')?.classList.contains('active')) {
                if (typeof renderPurchaseList === 'function') renderPurchaseList();
            }
            if (document.getElementById('page-suppliers')?.classList.contains('active')) {
                if (typeof renderSuppliers === 'function') renderSuppliers();
            }
            if (document.getElementById('page-itinerary')?.classList.contains('active')) {
                const hasList = document.getElementById('itinList');
                if (hasList && typeof Itinerary !== 'undefined' && Itinerary.render) {
                    Itinerary.render();
                }
            }
            if (document.getElementById('page-settings')?.classList.contains('active')) {
                if (typeof renderSettings === 'function') renderSettings();
            }
        } catch (e) {}
    }
};
