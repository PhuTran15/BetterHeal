// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Check if user is admin
function checkAdminAccess() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        window.location.href = 'login.html';
        return false;
    }

    if (currentUser.username !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'menu.html';
        return false;
    }

    return true;
}

// Load all users
function loadUsers() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, async (snapshot) => {
        const users = snapshot.val();
        const usersList = document.getElementById('usersList');
        
        if (!users) {
            usersList.innerHTML = '<p style="text-align: center; color: #999;">Chưa có người dùng nào</p>';
            return;
        }

        usersList.innerHTML = '';

        for (const [uid, userData] of Object.entries(users)) {
            // Skip admin
            if (userData.username === 'admin') continue;

            // Get permission status
            const permissionRef = ref(db, `permissions/${uid}`);
            const permissionSnapshot = await get(permissionRef);
            const permission = permissionSnapshot.val();
            const canEdit = permission && permission.canEdit ? true : false;

            const userItem = createUserItem(uid, userData, canEdit);
            usersList.appendChild(userItem);
        }
    });
}

// Create user item element
function createUserItem(uid, userData, canEdit) {
    const div = document.createElement('div');
    div.className = 'user-item';

    const username = userData.username || userData.email || 'Unknown';
    const firstLetter = username.charAt(0).toUpperCase();

    div.innerHTML = `
        <div class="user-info">
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-details">
                <h3>${username}</h3>
                <p>UID: ${uid}</p>
            </div>
        </div>
        <div class="permission-toggle">
            <span class="permission-label">Quyền chỉnh sửa</span>
            <label class="toggle-switch">
                <input type="checkbox" ${canEdit ? 'checked' : ''} onchange="togglePermission('${uid}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </div>
    `;

    return div;
}

// Toggle permission
window.togglePermission = async function(uid, canEdit) {
    try {
        const permissionRef = ref(db, `permissions/${uid}`);
        await set(permissionRef, {
            canEdit: canEdit,
            updatedAt: Date.now()
        });

        const message = canEdit ? 'Đã cấp quyền chỉnh sửa!' : 'Đã thu hồi quyền chỉnh sửa!';
        showToast(message, 'success');
    } catch (error) {
        console.error('Error updating permission:', error);
        showToast('Lỗi khi cập nhật quyền!', 'error');
    }
};

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show history modal
function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.add('active');
    loadHistory('gallery');
}

// Close history modal
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.remove('active');
}

// Load history
async function loadHistory(type) {
    const historyContent = document.getElementById('historyContent');
    historyContent.innerHTML = '<p style="text-align: center; color: #999;">Đang tải...</p>';

    const path = type === 'gallery' ? 'shared/foryou/gallery' : 'shared/foryou/timeline';
    const dataRef = ref(db, path);

    const snapshot = await get(dataRef);
    const data = snapshot.val();

    if (!data) {
        historyContent.innerHTML = '<p style="text-align: center; color: #999;">Chưa có dữ liệu</p>';
        return;
    }

    const items = Object.entries(data).map(([key, value]) => ({
        key,
        ...value
    }));

    // Sort by latest activity
    items.sort((a, b) => {
        const timeA = a.lastEditedBy?.editedAt || a.uploadedAt || a.createdAt || 0;
        const timeB = b.lastEditedBy?.editedAt || b.uploadedAt || b.createdAt || 0;
        return timeB - timeA;
    });

    historyContent.innerHTML = '';

    items.forEach(item => {
        const historyItem = createHistoryItem(item, type);
        historyContent.appendChild(historyItem);
    });
}

// Create history item element
function createHistoryItem(item, type) {
    const div = document.createElement('div');
    div.className = 'history-item';

    // Determine who created/edited
    const creator = item.createdBy || item.uploadedBy;
    const editor = item.lastEditedBy;
    const user = editor || creator || { displayName: 'Unknown', username: 'unknown' };

    // Determine action
    const action = editor ? 'đã chỉnh sửa' : 'đã tạo';
    const time = editor?.editedAt || item.uploadedAt || item.createdAt || 0;
    const timeStr = new Date(time).toLocaleString('vi-VN');

    let contentHtml = '';
    if (type === 'gallery') {
        contentHtml = `
            <div class="history-content">
                <p><strong>Ghi chú:</strong> ${item.caption || '<em>Không có ghi chú</em>'}</p>
                ${item.data ? `<img src="${item.data}" class="history-image" alt="Image">` : ''}
            </div>
        `;
    } else {
        contentHtml = `
            <div class="history-content">
                <p><strong>Giai đoạn:</strong> ${item.phase || 'Chưa phân loại'}</p>
                <p><strong>Tiêu đề:</strong> ${item.title || 'Không có tiêu đề'}</p>
                <p><strong>Ngày:</strong> ${item.date || 'Không có ngày'}</p>
                ${item.description ? `<p><strong>Mô tả:</strong> ${item.description}</p>` : ''}
                ${item.image ? `<img src="${item.image}" class="history-image" alt="Image">` : ''}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="history-item-header">
            <div class="history-user">
                <div class="history-user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="history-user-info">
                    <h4>${user.displayName}</h4>
                    <p>@${user.username} ${action}</p>
                </div>
            </div>
            <div class="history-time">
                <i class="fas fa-clock"></i> ${timeStr}
            </div>
        </div>
        ${contentHtml}
    `;

    return div;
}

// Initialize
if (checkAdminAccess()) {
    loadUsers();

    // History modal events
    document.getElementById('viewHistoryBtn').addEventListener('click', showHistoryModal);
    document.getElementById('closeHistoryModal').addEventListener('click', closeHistoryModal);

    // Tab switching
    document.querySelectorAll('.history-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadHistory(tab.dataset.tab);
        });
    });

    // Close modal on backdrop click
    document.getElementById('historyModal').addEventListener('click', (e) => {
        if (e.target.id === 'historyModal') {
            closeHistoryModal();
        }
    });
}

