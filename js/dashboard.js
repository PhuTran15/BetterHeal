// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

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

// Check if user is logged in
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get current user from localStorage
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Update UI based on authentication state
function updateUIOnAuth() {
    const currentUser = getCurrentUser();
    const userInfo = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (currentUser) {
        if (userInfo) userInfo.style.display = 'flex';
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUser.displayName || currentUser.username;
        }
    } else {
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!checkAuth()) {
        return;
    }

    // Update UI based on auth state
    updateUIOnAuth();

    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Sign out from Firebase Auth
                await signOut(auth);

                // Remove user info from localStorage
                localStorage.removeItem('currentUser');

                // Redirect to login page
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Đăng xuất thất bại. Vui lòng thử lại.');
            }
        });
    }
});
