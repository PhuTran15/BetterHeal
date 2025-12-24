// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

let allWishes = [];
let currentFilter = 'all';

// Check auth and admin permission
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Check if user is admin
    if (currentUser.username !== 'admin' && currentUser.username !== 'thaonguyen') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'merry-christmas.html';
        return false;
    }
    
    return true;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Format time ago
function timeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
}

// Format date
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get first letter for avatar
function getFirstLetter(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

// Load wishes
function loadWishes() {
    const wishesRef = ref(db, 'shared/christmas/userWishes');
    
    onValue(wishesRef, (snapshot) => {
        const wishes = snapshot.val();
        
        if (!wishes) {
            allWishes = [];
            renderWishes();
            updateStats();
            return;
        }
        
        // Convert to array
        allWishes = Object.entries(wishes).map(([key, wish]) => ({
            key,
            ...wish
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        renderWishes();
        updateStats();
    });
}

// Filter wishes
function filterWishes() {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    switch (currentFilter) {
        case 'today':
            return allWishes.filter(w => w.createdAt >= today);
        case 'week':
            return allWishes.filter(w => w.createdAt >= weekAgo);
        default:
            return allWishes;
    }
}

// Render wishes
function renderWishes() {
    const wishesList = document.getElementById('wishesList');
    const filteredWishes = filterWishes();
    
    if (filteredWishes.length === 0) {
        wishesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>Chưa có điều ước nào</p>
            </div>
        `;
        return;
    }
    
    wishesList.innerHTML = filteredWishes.map(wish => `
        <div class="wish-card">
            <div class="wish-header">
                <div class="wish-user-info">
                    <div class="wish-avatar">${getFirstLetter(wish.name)}</div>
                    <div class="wish-user-details">
                        <h3>${wish.name}</h3>
                        <div class="wish-time">
                            <i class="fas fa-clock"></i>
                            ${timeAgo(wish.createdAt)} - ${formatDate(wish.createdAt)}
                        </div>
                    </div>
                </div>
                <div class="wish-actions">
                    <button class="action-btn delete" onclick="deleteWish('${wish.key}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="wish-content">${wish.content}</div>
        </div>
    `).join('');
}

// Update stats
function updateStats() {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);

    // Total wishes
    document.getElementById('totalWishes').textContent = allWishes.length;

    // Today wishes
    const todayWishes = allWishes.filter(w => w.createdAt >= today).length;
    document.getElementById('todayWishes').textContent = todayWishes;

    // Unique users
    const uniqueUsers = new Set(allWishes.map(w => w.name)).size;
    document.getElementById('uniqueUsers').textContent = uniqueUsers;
}

// Delete wish
window.deleteWish = async function(key) {
    if (!confirm('Bạn có chắc muốn xóa điều ước này?')) {
        return;
    }

    try {
        await remove(ref(db, `shared/christmas/userWishes/${key}`));
        alert('Đã xóa điều ước!');
    } catch (error) {
        console.error('Error deleting wish:', error);
        alert('Có lỗi xảy ra!');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!checkAuth()) return;

    // Display username
    const currentUser = getCurrentUser();
    document.getElementById('usernameDisplay').textContent = currentUser.displayName || currentUser.username;

    // Load wishes
    loadWishes();

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderWishes();
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });
});


