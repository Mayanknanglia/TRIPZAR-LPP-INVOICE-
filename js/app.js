/* =============================================
   MAIN APP v10 - Full Featured
   Sales + Purchase + Suppliers + GST Reports + Firebase Sync
   ============================================= */

let deferredInstallPrompt = null;
let isAppInstalled = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initializing...');

    if (typeof DB === 'undefined') { alert('DB failed. Refresh.'); return; }
    if (typeof Auth === 'undefined') { alert('Auth failed. Refresh.'); return; }

    try { DB.init(); } catch (e) { console.error(e); }

    const savedTheme = DB.getTheme();
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        updateThemeUI(true);
    }

    try { Auth.init(); } catch (e) { console.error(e); }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            Auth.login(username, password);
        });
    }

    const fyBadge = document.getElementById('fyBadge');
    if (fyBadge) fyBadge.textContent = `FY ${getCurrentFY()}`;

    syncAppLogo();
    updateNavbarUserName();
    
    // ============================================
    // INITIALIZE GOOGLE DRIVE MODULE
    // ============================================
    if (typeof Drive !== 'undefined') {
        try {
            Drive.init();
            console.log('✅ Drive module initialized');
        } catch (e) {
            console.error('Drive init error:', e);
        }
    } else {
        console.warn('⚠️ Drive module not loaded');
    }

    // ============================================
    // INITIALIZE FIREBASE SYNC
    // ============================================
    if (typeof FirebaseSync !== 'undefined') {
        setTimeout(async () => {
            try {
                await FirebaseSync.init();
                console.log('✅ Firebase Sync initialized');
            } catch (e) {
                console.error('Firebase Sync error:', e);
            }
        }, 1500);
    } else {
        console.warn('⚠️ Firebase Sync not loaded');
    }
    
    registerServiceWorker();

    setTimeout(() => {
        setupPWAInstall();
        detectInstalledMode();
        forceShowInstallButtons();
    }, 500);

    console.log('✅ App ready!');
});

// ============================================
// PWA INSTALL
// ============================================
function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✅ Install prompt captured');
        e.preventDefault();
        deferredInstallPrompt = e;
        forceShowInstallButtons();
    });

    window.addEventListener('appinstalled', () => {
        console.log('🎉 App installed');
        isAppInstalled = true;
        deferredInstallPrompt = null;
        hideInstallButtons();
        showToast('🎉 App installed!', 'success');
    });
}

function forceShowInstallButtons() {
    if (isAppInstalled) return;
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        isAppInstalled = true;
        return;
    }
    ['loginInstallBtn', 'sidebarInstallBtn', 'navbarInstallBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.setProperty('display', 'flex', 'important');
    });
    console.log('✅ Install buttons forced visible');
}

function hideInstallButtons() {
    ['loginInstallBtn', 'sidebarInstallBtn', 'navbarInstallBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.setProperty('display', 'none', 'important');
    });
}

function detectInstalledMode() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        isAppInstalled = true;
        document.body.classList.add('installed-app');
        hideInstallButtons();
    }
}

function triggerInstall() {
    console.log('Install clicked. Prompt available:', !!deferredInstallPrompt);
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') showToast('✅ Installing...', 'info');
            else showToast('Installation cancelled', 'warning');
            deferredInstallPrompt = null;
        });
        return;
    }
    showManualInstallGuide();
}

function showManualInstallGuide() {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMobile = /mobile|android/i.test(ua);

    let instructions = '';

    if (isIOS) {
        instructions = `
            <div class="install-step-list">
                <div class="install-step">
                    <div class="step-number">1</div>
                    <div class="step-text">Tap <strong>Share button</strong> at the bottom <span style="font-size:20px">⬆️</span></div>
                </div>
                <div class="install-step">
                    <div class="step-number">2</div>
                    <div class="step-text">Scroll down and tap <strong>"Add to Home Screen"</strong></div>
                </div>
                <div class="install-step">
                    <div class="step-number">3</div>
                    <div class="step-text">Tap <strong>"Add"</strong> — Done! 🎉</div>
                </div>
            </div>`;
    } else if (isMobile) {
        instructions = `
            <div class="install-step-list">
                <div class="install-step">
                    <div class="step-number">1</div>
                    <div class="step-text">Tap <strong>Menu (⋮)</strong> button at top right</div>
                </div>
                <div class="install-step">
                    <div class="step-number">2</div>
                    <div class="step-text">Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></div>
                </div>
                <div class="install-step">
                    <div class="step-number">3</div>
                    <div class="step-text">Confirm — Done! 🎉</div>
                </div>
            </div>`;
    } else {
        instructions = `
            <div class="install-step-list">
                <div class="install-step">
                    <div class="step-number">1</div>
                    <div class="step-text">Look for <strong>install icon</strong> in address bar <span style="font-size:20px;padding:2px 6px;background:#e0e7ff;border-radius:4px">⊕</span></div>
                </div>
                <div class="install-step">
                    <div class="step-number">2</div>
                    <div class="step-text">Click it → Select <strong>"Install"</strong></div>
                </div>
                <div class="install-step">
                    <div class="step-number">3</div>
                    <div class="step-text">Or use browser menu → <strong>"Install Tripzar Invoice..."</strong></div>
                </div>
            </div>
            <div class="install-warning" style="margin-top:15px">
                <span class="material-icons-round" style="color:#3b82f6">info</span>
                <div>Best on Chrome, Edge, Brave</div>
            </div>`;
    }

    showInstallModal(instructions);
}

function showInstallModal(content) {
    const modal = document.getElementById('modalContent');
    const container = document.getElementById('modalContainer');

    modal.innerHTML = `
        <div class="modal-header" style="background:linear-gradient(135deg,#1a5632,#2d8a4e);color:white">
            <h2 style="color:white"><span class="material-icons-round" style="vertical-align:middle">get_app</span> Install Tripzar App</h2>
            <button class="modal-close" style="color:white" onclick="closeInstallModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p style="margin-bottom:15px;font-size:14px;color:#666">📱 Install Tripzar as an app for the best experience:</p>
            <ul style="margin-bottom:20px;padding-left:20px;color:#333;font-size:13px">
                <li>✅ Works offline</li>
                <li>✅ Fullscreen (no browser bar)</li>
                <li>✅ App icon on home screen/desktop</li>
            </ul>
            <hr style="margin:15px 0;border:none;border-top:1px solid #e2e8f0">
            ${content}
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="closeInstallModal()">Got it!</button>
        </div>`;
    container.classList.remove('hidden');
}

function closeInstallModal() {
    document.getElementById('modalContainer').classList.add('hidden');
}

// ============================================
// LOGO + USER
// ============================================
function syncAppLogo() {
    const settings = DB.getSettings();
    const logoSrc = settings.logo_data || 'public/logo.png';
    const sidebarLogo = document.querySelector('.sidebar-logo');
    const loginLogo = document.querySelector('.login-logo-img');
    if (sidebarLogo) { sidebarLogo.src = logoSrc; sidebarLogo.style.display = 'block'; }
    if (loginLogo) { loginLogo.src = logoSrc; loginLogo.style.display = 'block'; }
}

function updateNavbarUserName() {
    const auth = DB.getAuth();
    if (!auth) return;
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) userNameEl.textContent = auth.full_name || 'Admin';

    const userAvatarEl = document.querySelector('.user-info');
    if (userAvatarEl) {
        const oldIcon = userAvatarEl.querySelector('.material-icons-round');
        const oldImg = userAvatarEl.querySelector('.navbar-avatar');
        if (oldIcon) oldIcon.remove();
        if (oldImg) oldImg.remove();
        if (auth.profile_photo) {
            const img = document.createElement('img');
            img.src = auth.profile_photo;
            img.className = 'navbar-avatar';
            userAvatarEl.insertBefore(img, userAvatarEl.firstChild);
        } else {
            const icon = document.createElement('span');
            icon.className = 'material-icons-round';
            icon.textContent = 'account_circle';
            userAvatarEl.insertBefore(icon, userAvatarEl.firstChild);
        }
    }
}

// ============================================
// ⭐ NAVIGATION (All pages)
// ============================================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        invoices: 'Invoices',
        newInvoice: 'New Invoice',
        customers: 'Customers',
        purchases: 'Purchases',
        newPurchase: 'New Purchase',
        suppliers: 'Suppliers',
        purchaseView: 'Purchase Bill',
        reports: 'Reports',
        gstReports: 'GST Reports',
        settings: 'Settings',
        invoiceView: 'Invoice'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[page] || 'Tripzar';

    try {
        switch (page) {
            case 'dashboard': 
                if (typeof renderDashboard === 'function') renderDashboard(); 
                break;
            case 'invoices': 
                if (typeof renderInvoiceList === 'function') renderInvoiceList(); 
                break;
            case 'newInvoice': 
                if (typeof renderInvoiceForm === 'function') renderInvoiceForm(); 
                break;
            case 'customers': 
                if (typeof renderCustomers === 'function') renderCustomers(); 
                break;
            case 'purchases': 
                if (typeof renderPurchaseList === 'function') renderPurchaseList(); 
                break;
            case 'newPurchase': 
                if (typeof renderPurchaseForm === 'function') renderPurchaseForm(); 
                break;
            case 'suppliers': 
                if (typeof renderSuppliers === 'function') renderSuppliers(); 
                break;
            case 'reports': 
                if (typeof renderReports === 'function') renderReports(); 
                break;
            case 'gstReports':
                if (typeof GSTReports !== 'undefined' && GSTReports.render) GSTReports.render();
                break;
            case 'settings': 
                if (typeof renderSettings === 'function') renderSettings(); 
                break;
        }
    } catch (e) { 
        console.error(`Render ${page}:`, e); 
    }

    closeSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('show');
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    DB.saveTheme(isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

function logout() {
    if (confirmDialog('Logout?')) Auth.logout();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ SW registered:', reg.scope))
            .catch(err => console.log('❌ SW failed:', err));
    }
}