/* =============================================
   FIREBASE SYNC v5.0 - Safety Net for Large Data
   Auto-handles images > 1MB to prevent errors
   ============================================= */

const FirebaseSync = {
    FIREBASE_EMAIL: 'admin@tripzar.com',
    FIREBASE_PASSWORD: 'tripzar@123',
    MAX_DOC_SIZE: 900000, // ~900KB safety limit (Firebase = 1MB)
    
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
    // ⭐ SIZE CHECK HELPER
    // ============================================
    getObjectSize(obj) {
        try {
            return JSON.stringify(obj).length;
        } catch (e) {
            return 0;
        }
    },

    isTooLarge(obj) {
        return this.getObjectSize(obj) > this.MAX_DOC_SIZE;
    },

    // ============================================
    // FULL SYNC
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

            // 5. SETTINGS
            const settingsSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'settings')
            );
            settingsSnap.forEach(doc => {
                if (doc.id === 'company') {
                    // Keep local logo if cloud doesn't have it
                    const cloudSettings = doc.data();
                    const localSettings = DB.getSettings();
                    if (!cloudSettings.logo_data && localSettings.logo_data) {
                        cloudSettings.logo_data = localSettings.logo_data;
                    }
                    DB.saveSettings(cloudSettings);
                    console.log('✅ Settings synced');
                }
            });

            // 6. AUTH
            const authSnap = await window.fbGetDocs(
                window.fbCollection(window.firebaseDB, 'auth')
            );
            authSnap.forEach(doc => {
                if (doc.id === 'user') {
                    const cloudAuth = doc.data();
                    const localAuth = DB.getAuth();
                    if (!cloudAuth.profile_photo && localAuth.profile_photo) {
                        cloudAuth.profile_photo = localAuth.profile_photo;
                    }
                    DB.saveAuth(cloudAuth);
                    console.log('✅ Profile synced');
                }
            });

            // 7. FY COUNTERS
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

            if (invoices.length > 0 || customers.length > 0 || purchases.length > 0) {
                if (typeof showToast === 'function') {
                    showToast('☁️ Synced from cloud', 'success');
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
    // REAL-TIME SYNC
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
                    if (document.getElementById('page-suppliers')?.classList.contains('active')) {
                        if (typeof renderSuppliers === 'function') renderSuppliers();
                    }
                }
            );
            this.listeners.push(supUnsub);

            // Settings + Logo (with safety)
            const setUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'settings'),
                (snapshot) => {
                    snapshot.forEach(doc => {
                        if (doc.id === 'company') {
                            const cloudSettings = doc.data();
                            const localSettings = DB.getSettings();
                            // Preserve local logo if cloud doesn't have it
                            if (!cloudSettings.logo_data && localSettings.logo_data) {
                                cloudSettings.logo_data = localSettings.logo_data;
                            }
                            DB.saveSettings(cloudSettings);
                            if (typeof syncAppLogo === 'function') syncAppLogo();
                        }
                    });
                }
            );
            this.listeners.push(setUnsub);

            // Auth (with safety)
            const authUnsub = window.fbOnSnapshot(
                window.fbCollection(window.firebaseDB, 'auth'),
                (snapshot) => {
                    snapshot.forEach(doc => {
                        if (doc.id === 'user') {
                            const cloudAuth = doc.data();
                            const localAuth = DB.getAuth();
                            if (!cloudAuth.profile_photo && localAuth.profile_photo) {
                                cloudAuth.profile_photo = localAuth.profile_photo;
                            }
                            DB.saveAuth(cloudAuth);
                            if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
                        }
                    });
                }
            );
            this.listeners.push(authUnsub);

            console.log('👂 Real-time sync ACTIVE');
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
                if (this.isTooLarge(invoice)) {
                    console.warn('⚠️ Invoice too large, saving without attachments');
                    const clean = { ...invoice };
                    delete clean.bill_attachment;
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'invoices', invoice.id), clean);
                } else {
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'invoices', invoice.id), invoice);
                }
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
                console.error('Invoice sync error:', error);
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
                // Check size — if too big (due to bill_attachment), save without it
                if (this.isTooLarge(purchase)) {
                    console.warn('⚠️ Purchase too large, syncing without bill attachment');
                    const clean = { ...purchase };
                    delete clean.bill_attachment;
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'purchases', purchase.id), clean);
                    if (typeof showToast === 'function') {
                        showToast('⚠️ Bill attachment too large for cloud, saved locally only', 'warning');
                    }
                } else {
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'purchases', purchase.id), purchase);
                }
                console.log('✅ Purchase synced');
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
                return true;
            } catch (error) {
                this.queueChange('supplier', supplier);
                return false;
            }
        } else {
            this.queueChange('supplier', supplier);
        }
    },

    // ⭐ SAFE Settings save (auto-removes large logo)
    async saveSettings(settings) {
        DB.saveSettings(settings);

        if (this.online && this.userId) {
            try {
                const settingsToSync = { ...settings };
                
                // Safety: If logo is too big, sync without it
                if (settingsToSync.logo_data && this.isTooLarge(settingsToSync)) {
                    const logoSize = Math.round(settingsToSync.logo_data.length / 1024);
                    console.warn(`⚠️ Logo (${logoSize}KB) too big for Firebase — syncing without it`);
                    delete settingsToSync.logo_data;
                    if (typeof showToast === 'function') {
                        showToast(`⚠️ Logo (${logoSize}KB) too large. Please re-upload smaller logo.`, 'warning');
                    }
                }
                
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'settings', 'company'),
                    settingsToSync
                );
                console.log('✅ Settings synced');
                return true;
            } catch (error) {
                console.error('Settings sync error:', error);
                return false;
            }
        }
    },

    // ⭐ SAFE Auth save (auto-removes large photo)
    async saveAuth(auth) {
        DB.saveAuth(auth);

        if (this.online && this.userId) {
            try {
                const authToSync = { ...auth };
                
                // Safety: If profile photo too big, sync without it
                if (authToSync.profile_photo && this.isTooLarge(authToSync)) {
                    const photoSize = Math.round(authToSync.profile_photo.length / 1024);
                    console.warn(`⚠️ Profile photo (${photoSize}KB) too big — syncing without it`);
                    delete authToSync.profile_photo;
                    if (typeof showToast === 'function') {
                        showToast(`⚠️ Photo (${photoSize}KB) too large. Please re-upload smaller.`, 'warning');
                    }
                }
                
                await window.fbSetDoc(
                    window.fbDoc(window.firebaseDB, 'auth', 'user'),
                    authToSync
                );
                console.log('✅ Profile synced');
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
                    const clean = { ...inv };
                    if (clean.bill_attachment) delete clean.bill_attachment;
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'invoices', id), clean);
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
                await window.fbDeleteDoc(window.fbDoc(window.firebaseDB, 'customers', id));
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
                    const clean = { ...p };
                    if (clean.bill_attachment) delete clean.bill_attachment;
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'purchases', id), clean);
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
                await window.fbDeleteDoc(window.fbDoc(window.firebaseDB, 'suppliers', id));
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
            else if (item.type === 'auth') await this.saveAuth(item.data);
            else if (item.type === 'settings') await this.saveSettings(item.data);
        }

        localStorage.removeItem('firebase_queue');
        console.log('✅ All pending synced');
    },

    // ============================================
    // MIGRATE LOCAL → CLOUD
    // ============================================
    async migrateLocalToCloud() {
        if (!this.online || !this.userId) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Wait for auto-login', 'warning');
            }
            return;
        }

        if (typeof showToast === 'function') {
            showToast('🚀 Uploading to cloud...', 'info');
        }

        let skippedCount = 0;
        let successCount = 0;

        try {
            // 1. Invoices
            const invoices = DB.getInvoices();
            for (const inv of invoices) {
                try {
                    if (this.isTooLarge(inv)) {
                        const clean = { ...inv };
                        if (clean.bill_attachment) delete clean.bill_attachment;
                        await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'invoices', inv.id), clean);
                        skippedCount++;
                    } else {
                        await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'invoices', inv.id), inv);
                    }
                    successCount++;
                } catch (e) { console.error('Invoice upload error:', e); }
            }
            console.log(`✅ ${invoices.length} invoices uploaded`);

            // 2. Customers
            const customers = DB.getCustomers();
            for (const cust of customers) {
                try {
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'customers', cust.id), cust);
                } catch (e) { console.error('Customer upload error:', e); }
            }
            console.log(`✅ ${customers.length} customers uploaded`);

            // 3. Purchases
            const purchases = DB.getPurchases();
            for (const pur of purchases) {
                try {
                    if (this.isTooLarge(pur)) {
                        const clean = { ...pur };
                        if (clean.bill_attachment) delete clean.bill_attachment;
                        await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'purchases', pur.id), clean);
                        skippedCount++;
                    } else {
                        await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'purchases', pur.id), pur);
                    }
                } catch (e) { console.error('Purchase upload error:', e); }
            }
            console.log(`✅ ${purchases.length} purchases uploaded`);

            // 4. Suppliers
            const suppliers = DB.getSuppliers();
            for (const sup of suppliers) {
                try {
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'suppliers', sup.id), sup);
                } catch (e) { console.error('Supplier upload error:', e); }
            }
            console.log(`✅ ${suppliers.length} suppliers uploaded`);

            // 5. Settings (with safety)
            const settings = DB.getSettings();
            try {
                const settingsToSync = { ...settings };
                if (this.isTooLarge(settingsToSync)) {
                    const logoSize = settingsToSync.logo_data ? Math.round(settingsToSync.logo_data.length / 1024) : 0;
                    console.warn(`⚠️ Settings with logo (${logoSize}KB) too big — syncing without logo`);
                    delete settingsToSync.logo_data;
                }
                await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'settings', 'company'), settingsToSync);
                console.log('✅ Settings uploaded');
            } catch (e) { console.error('Settings upload error:', e); }

            // 6. Auth (with safety)
            const auth = DB.getAuth();
            try {
                const authToSync = { ...auth };
                if (this.isTooLarge(authToSync)) {
                    console.warn('⚠️ Profile photo too big — syncing without it');
                    delete authToSync.profile_photo;
                }
                await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'auth', 'user'), authToSync);
                console.log('✅ Profile uploaded');
            } catch (e) { console.error('Auth upload error:', e); }

            // 7. FY Counters
            const counters = DB.getFYCounters();
            for (const [fy, count] of Object.entries(counters)) {
                try {
                    await window.fbSetDoc(window.fbDoc(window.firebaseDB, 'fy_counters', fy), { count: count });
                } catch (e) { console.error('FY counter error:', e); }
            }

            if (typeof showToast === 'function') {
                let msg = `🎉 Uploaded! ${invoices.length} invoices, ${customers.length} customers, ${purchases.length} purchases, ${suppliers.length} suppliers`;
                if (skippedCount > 0) {
                    msg += ` (${skippedCount} large attachments skipped)`;
                }
                showToast(msg, 'success');
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
            if (document.getElementById('page-settings')?.classList.contains('active')) {
                if (typeof renderSettings === 'function') renderSettings();
            }
        } catch (e) {}
    }
};
