/* =============================================
   AUTH v9 - Simple Login Only
   Firebase auto-connects in background
   ============================================= */

const Auth = {
    isLoggedIn: false,

    async init() {
        const session = sessionStorage.getItem('tripzar_session');
        if (session === 'active') {
            this.isLoggedIn = true;
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    async login(username, password) {
        const inputUser = (username || '').trim();
        const inputPass = (password || '').trim();

        if (!inputUser || !inputPass) {
            showToast('Enter username and password!', 'error');
            return false;
        }

        // Check credentials
        const auth = DB.getAuth();
        const isValidLocalLogin = (auth && inputUser === auth.username && inputPass === auth.password);
        const isDefaultLogin = (inputUser === 'admin' && inputPass === 'tripzar@123');

        if (!isValidLocalLogin && !isDefaultLogin) {
            showToast('Invalid username or password!', 'error');
            return false;
        }

        // Login success
        this.isLoggedIn = true;
        sessionStorage.setItem('tripzar_session', 'active');

        // Save auth if new
        if (!auth || !auth.username) {
            DB.saveAuth({
                username: inputUser,
                password: inputPass,
                full_name: 'Admin',
                role: 'Administrator',
                email: '',
                phone: '',
                profile_photo: ''
            });
        }

        this.showApp();
        showToast(`Welcome back!`, 'success');

        // Firebase is already auto-connecting from init
        // No need to login here - it's done automatically!
        console.log('✅ User logged in - Firebase should be already connected');

        return true;
    },

    async logout() {
        this.isLoggedIn = false;
        sessionStorage.removeItem('tripzar_session');
        this.showLogin();
        showToast('Logged out', 'info');
    },

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    },

    showApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        if (typeof updateNavbarUserName === 'function') updateNavbarUserName();
        navigateTo('dashboard');
    },

    async changePassword(currentPass, newPass) {
        const auth = DB.getAuth();
        if (currentPass !== auth.password) {
            showToast('Current password incorrect!', 'error');
            return false;
        }
        if (newPass.length < 6) {
            showToast('Min 6 characters!', 'error');
            return false;
        }
        auth.password = newPass;
        DB.saveAuth(auth);
        showToast('Password changed!', 'success');
        return true;
    }
};