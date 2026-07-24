/* =============================================
   UTILITIES v4 - Complete with GST Functions
   ============================================= */

// Format currency
function formatCurrency(amount, currency = '₹') {
    if (!amount && amount !== 0) return currency + '0.00';
    return currency + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNum(num) {
    return parseFloat(num || 0).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentFY() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return `${startYear}-${String(endYear).slice(-2)}`;
}

// Proper Case
function toProperCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// Number to words (Indian)
function numberToWords(amount) {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
        'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
        'Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    function convert(num) {
        if (num === 0) return '';
        let str = '';
        if (Math.floor(num/10000000) > 0) { str += convert(Math.floor(num/10000000)) + ' Crore '; num %= 10000000; }
        if (Math.floor(num/100000) > 0) { str += convert(Math.floor(num/100000)) + ' Lakh '; num %= 100000; }
        if (Math.floor(num/1000) > 0) { str += convert(Math.floor(num/1000)) + ' Thousand '; num %= 1000; }
        if (Math.floor(num/100) > 0) { str += convert(Math.floor(num/100)) + ' Hundred '; num %= 100; }
        if (num > 0) {
            if (num < 20) str += ones[num];
            else { str += tens[Math.floor(num/10)]; if (num%10 > 0) str += ' ' + ones[num%10]; }
        }
        return str.trim();
    }

    if (!amount || amount === 0) return 'INR Zero Only';
    const isNeg = amount < 0;
    amount = Math.abs(amount);
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = 'INR ';
    if (isNeg) words += 'Minus ';
    if (rupees > 0) words += convert(rupees);
    if (paise > 0) {
        if (rupees > 0) words += ' and ' + convert(paise) + ' paise';
        else words += convert(paise) + ' paise';
    }
    return words + ' Only';
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) { console.log('Toast:', message); return; }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function showLoading() { 
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('hidden'); 
}

function hideLoading() { 
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden'); 
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============================================
// GST AUTO-DETECTION (WORLDWIDE)
// ============================================
function detectGSTType(customerCountry, customerState, companyState, companyCountry) {
    const custCountry = (customerCountry || 'India').trim().toLowerCase();
    const custState = (customerState || '').trim().toLowerCase();
    const compState = (companyState || 'Rajasthan').trim().toLowerCase();
    const compCountry = (companyCountry || 'India').trim().toLowerCase();

    // Foreign customer (Export)
    if (custCountry && custCountry !== compCountry && custCountry !== 'india') {
        return {
            type: 'EXPORT',
            label: 'Export (Zero Rated)',
            description: `Export to ${customerCountry}. IGST @ 0% (Zero Rated Supply)`
        };
    }

    // Same state (Intra-state)
    if (custState && custState === compState) {
        return {
            type: 'CGST_SGST',
            label: 'CGST + SGST (Intra-State)',
            description: 'Same state supply. CGST + SGST applies'
        };
    }

    // Different Indian state (Inter-state)
    if (custState && custState !== compState) {
        return {
            type: 'IGST',
            label: 'IGST (Inter-State)',
            description: 'Different state supply. IGST applies'
        };
    }

    // Default
    return {
        type: 'CGST_SGST',
        label: 'CGST + SGST (Default)',
        description: 'Default to intra-state'
    };
}

// Calculate GST amounts
function calculateGST(taxableAmount, gstRate, gstType) {
    const taxable = parseFloat(taxableAmount) || 0;
    const rate = parseFloat(gstRate) || 0;

    let result = {
        cgst_rate: 0, cgst_amount: 0,
        sgst_rate: 0, sgst_amount: 0,
        igst_rate: 0, igst_amount: 0,
        total_tax: 0,
        gst_type: gstType
    };

    if (gstType === 'CGST_SGST') {
        result.cgst_rate = rate / 2;
        result.sgst_rate = rate / 2;
        result.cgst_amount = parseFloat((taxable * result.cgst_rate / 100).toFixed(2));
        result.sgst_amount = parseFloat((taxable * result.sgst_rate / 100).toFixed(2));
    } else if (gstType === 'IGST') {
        result.igst_rate = rate;
        result.igst_amount = parseFloat((taxable * rate / 100).toFixed(2));
    } else if (gstType === 'EXPORT') {
        result.igst_rate = 0;
        result.igst_amount = 0;
    }

    result.total_tax = result.cgst_amount + result.sgst_amount + result.igst_amount;
    return result;
}

// ============================================
// INDIAN STATES
// ============================================
const INDIAN_STATES = {
    'Andhra Pradesh':'37','Arunachal Pradesh':'12','Assam':'18','Bihar':'10',
    'Chhattisgarh':'22','Goa':'30','Gujarat':'24','Haryana':'06',
    'Himachal Pradesh':'02','Jharkhand':'20','Karnataka':'29','Kerala':'32',
    'Madhya Pradesh':'23','Maharashtra':'27','Manipur':'14','Meghalaya':'17',
    'Mizoram':'15','Nagaland':'13','Odisha':'21','Punjab':'03',
    'Rajasthan':'08','Sikkim':'11','Tamil Nadu':'33','Telangana':'36',
    'Tripura':'16','Uttar Pradesh':'09','Uttarakhand':'05','West Bengal':'19',
    'Andaman and Nicobar Islands':'35','Chandigarh':'04',
    'Dadra and Nagar Haveli':'26','Delhi':'07','Jammu and Kashmir':'01',
    'Ladakh':'38','Lakshadweep':'31','Puducherry':'34'
};

// ============================================
// COUNTRIES (195 worldwide)
// ============================================
const COUNTRIES = [
    'India','United States','United Kingdom','United Arab Emirates','Saudi Arabia',
    'Singapore','Thailand','Malaysia','Indonesia','Australia','Canada','Germany',
    'France','Italy','Spain','Netherlands','Switzerland','Sweden','Norway','Denmark',
    'Japan','China','South Korea','Vietnam','Philippines','Sri Lanka','Nepal','Bhutan',
    'Bangladesh','Pakistan','Afghanistan','Iran','Iraq','Turkey','Egypt','South Africa',
    'Kenya','Nigeria','Morocco','Ethiopia','Brazil','Argentina','Mexico','Chile',
    'Colombia','Peru','Russia','Ukraine','Poland','Greece','Portugal','Belgium',
    'Austria','Ireland','New Zealand','Fiji','Maldives','Mauritius','Seychelles',
    'Oman','Qatar','Kuwait','Bahrain','Jordan','Lebanon','Israel','Palestine',
    'Cyprus','Malta','Iceland','Finland','Estonia','Latvia','Lithuania','Belarus',
    'Czech Republic','Slovakia','Hungary','Romania','Bulgaria','Serbia','Croatia',
    'Bosnia and Herzegovina','Slovenia','Albania','Macedonia','Montenegro','Kosovo',
    'Moldova','Georgia','Armenia','Azerbaijan','Kazakhstan','Uzbekistan','Turkmenistan',
    'Kyrgyzstan','Tajikistan','Mongolia','Myanmar','Cambodia','Laos','Brunei',
    'Papua New Guinea','Taiwan','Hong Kong','Macau','North Korea','Syria','Yemen',
    'Libya','Tunisia','Algeria','Sudan','Ghana','Ivory Coast','Senegal','Uganda',
    'Tanzania','Zambia','Zimbabwe','Botswana','Namibia','Angola','Mozambique',
    'Madagascar','Rwanda','Burundi','Cameroon','Chad','Niger','Mali','Burkina Faso',
    'Sierra Leone','Liberia','Guinea','Congo','Central African Republic','Gabon',
    'Equatorial Guinea','Somalia','Eritrea','Djibouti','Comoros','Cape Verde',
    'Uruguay','Paraguay','Bolivia','Ecuador','Venezuela','Guyana','Suriname',
    'Panama','Costa Rica','Nicaragua','Honduras','El Salvador','Guatemala','Belize',
    'Cuba','Jamaica','Dominican Republic','Haiti','Puerto Rico','Trinidad and Tobago',
    'Barbados','Bahamas','Grenada','Saint Lucia','Antigua and Barbuda','Dominica',
    'Saint Kitts and Nevis','Saint Vincent and the Grenadines','Solomon Islands',
    'Vanuatu','Samoa','Tonga','Kiribati','Micronesia','Marshall Islands','Palau',
    'Nauru','Tuvalu','Timor-Leste','Andorra','Monaco','San Marino','Vatican City',
    'Liechtenstein','Luxembourg'
];

function getStateOptions(selected = '') {
    let html = '<option value="">Select State</option>';
    for (const [state, code] of Object.entries(INDIAN_STATES)) {
        html += `<option value="${state}" ${state === selected ? 'selected' : ''}>${state} (${code})</option>`;
    }
    return html;
}

function confirmDialog(message) {
    return window.confirm(message);
}

function togglePassword() {
    const passInput = document.getElementById('loginPassword');
    const icon = document.getElementById('passToggleIcon');
    if (!passInput || !icon) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.textContent = 'visibility';
    } else {
        passInput.type = 'password';
        icon.textContent = 'visibility_off';
    }
}