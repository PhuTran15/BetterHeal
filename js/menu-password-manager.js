import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get, set, update } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCEK54N506sR3dkYdhXtrP1mQPjz1QfVLg",
    authDomain: "betterheal-117ed.firebaseapp.com",
    databaseURL: "https://betterheal-117ed-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "betterheal-117ed",
    storageBucket: "betterheal-117ed.firebasestorage.app",
    messagingSenderId: "482091866987",
    appId: "1:482091866987:web:51e473cd51db4f632b0a2e",
    measurementId: "G-HSBSJ63EXT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Menu list
const menus = [
    { id: 'feelings', name: 'Nỗi lòng', icon: 'fa-heart', url: 'feelings.html' },
    { id: 'diary', name: 'Nhật ký', icon: 'fa-book', url: 'journal.html' },
    { id: 'meditation', name: 'Thiền', icon: 'fa-spa', url: 'meditation.html' },
    { id: 'chat', name: 'Tâm sự', icon: 'fa-comments', url: 'community.html' },
    { id: 'attendance', name: 'Điểm danh', icon: 'fa-calendar-check', url: 'attendance.html' },
    { id: 'foryou', name: 'For You', icon: 'fa-gift', url: 'foryou.html' },
    { id: 'trai-tim-to', name: 'Trái tim to', icon: 'fa-heart-pulse', url: 'trai-tim-to.html' },
    { id: 'thuong-em', name: 'Thương em', icon: 'fa-dove', url: 'thuong-em.html' },
    { id: 'christmas', name: 'Giáng sinh', icon: 'fa-tree', url: 'merry-christmas.html' },
    { id: 'christmas-wishes', name: 'Điều ước (Admin)', icon: 'fa-star', url: 'christmas-wishes-admin.html' },
    { id: 'admin-permissions', name: 'Quyền Admin', icon: 'fa-user-shield', url: 'admin-permissions.html' }
];

let currentEditingMenu = null;

// Check admin access
function checkAdminAccess() {
    console.log('Checking admin access...');
    console.log('LocalStorage currentUser:', localStorage.getItem('currentUser'));

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Parsed currentUser:', currentUser);

    if (!currentUser) {
        console.log('No currentUser in localStorage, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    if (currentUser.username !== 'admin' && currentUser.username !== 'thaonguyen') {
        console.log('User is not admin:', currentUser.username);
        showToast('Bạn không có quyền truy cập trang này!', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    console.log('Admin access granted, loading menus');
    loadMenus();
}

// Run check on page load
checkAdminAccess();

// Load menus
async function loadMenus() {
    console.log('Loading menus...');
    const menuList = document.getElementById('menuList');

    if (!menuList) {
        console.error('menuList element not found!');
        return;
    }

    menuList.innerHTML = '';

    try {
        for (const menu of menus) {
            console.log('Loading menu:', menu.id);
            const passwordData = await getMenuPassword(menu.id);
            console.log('Password data for', menu.id, ':', passwordData);
            const menuItem = createMenuCard(menu, passwordData);
            menuList.appendChild(menuItem);
        }
        console.log('All menus loaded successfully');
    } catch (error) {
        console.error('Error loading menus:', error);
        showToast('Lỗi khi tải danh sách menu: ' + error.message, 'error');
    }
}

// Get menu password from database
async function getMenuPassword(menuId) {
    try {
        const passwordRef = ref(db, `menuPasswords/${menuId}`);
        const snapshot = await get(passwordRef);
        return snapshot.val() || { enabled: false, password: '' };
    } catch (error) {
        console.error('Error getting password for menu', menuId, ':', error);
        return { enabled: false, password: '' };
    }
}

// Create menu card
function createMenuCard(menu, passwordData) {
    const card = document.createElement('div');
    card.className = 'menu-item';

    const isEnabled = passwordData.enabled || false;

    card.innerHTML = `
        <div class="menu-info">
            <div class="menu-name">
                <i class="fas ${menu.icon}"></i>
                ${menu.name}
            </div>
            <div class="menu-url">${menu.url}</div>
        </div>
        <div class="menu-controls">
            <div class="password-status ${isEnabled ? 'enabled' : 'disabled'}">
                <i class="fas fa-${isEnabled ? 'lock' : 'lock-open'}"></i>
                ${isEnabled ? 'Đã bật' : 'Đã tắt'}
            </div>
            <div class="toggle-switch ${isEnabled ? 'active' : ''}" data-menu-id="${menu.id}">
            </div>
            <button class="action-btn ${!isEnabled ? 'disabled' : ''}" 
                    data-menu-id="${menu.id}" 
                    ${!isEnabled ? 'disabled' : ''}>
                <i class="fas fa-key"></i>
                ${isEnabled ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
            </button>
        </div>
    `;

    // Toggle switch event
    const toggleSwitch = card.querySelector('.toggle-switch');
    toggleSwitch.addEventListener('click', () => togglePassword(menu.id, !isEnabled));

    // Set password button event
    const setPasswordBtn = card.querySelector('.action-btn');
    setPasswordBtn.addEventListener('click', () => openPasswordModal(menu));

    return card;
}

// Toggle password
async function togglePassword(menuId, enable) {
    if (enable) {
        // Open modal to set password
        const menu = menus.find(m => m.id === menuId);
        openPasswordModal(menu);
    } else {
        // Disable password
        try {
            await update(ref(db, `menuPasswords/${menuId}`), {
                enabled: false
            });
            showToast('Đã tắt mật khẩu!', 'success');
            loadMenus();
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra!', 'error');
        }
    }
}

// Open password modal
function openPasswordModal(menu) {
    currentEditingMenu = menu;
    const modal = document.getElementById('passwordModal');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = `Đặt mật khẩu cho "${menu.name}"`;

    document.getElementById('menuPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    modal.classList.add('active');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('passwordModal');
    modal.classList.remove('active');
    currentEditingMenu = null;
}

// Save password
async function savePassword() {
    const password = document.getElementById('menuPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!password) {
        showToast('Vui lòng nhập mật khẩu!', 'error');
        return;
    }

    if (password.length < 4) {
        showToast('Mật khẩu phải có ít nhất 4 ký tự!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }

    try {
        await set(ref(db, `menuPasswords/${currentEditingMenu.id}`), {
            enabled: true,
            password: password,
            updatedAt: new Date().toISOString()
        });

        showToast('Đã lưu mật khẩu thành công!', 'success');
        closeModal();
        loadMenus();
    } catch (error) {
        console.error('Error:', error);
        showToast('Có lỗi xảy ra!', 'error');
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('menuPassword');
    const toggleBtn = document.getElementById('togglePassword');
    const icon = toggleBtn.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Show toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Event listeners
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('savePasswordBtn').addEventListener('click', savePassword);
document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);

// Close modal when clicking outside
document.getElementById('passwordModal').addEventListener('click', (e) => {
    if (e.target.id === 'passwordModal') {
        closeModal();
    }
});

// Enter key to save
document.getElementById('confirmPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        savePassword();
    }
});

