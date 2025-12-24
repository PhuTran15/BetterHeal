// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

// Biến lưu trữ dữ liệu điểm danh và cột mốc
let attendanceData = {};
let milestoneData = {};

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
    const adminLink = document.getElementById('adminLink');

    if (currentUser) {
        if (userInfo) userInfo.style.display = 'flex';
        if (usernameDisplay) {
            let displayName = 'Người dùng';

            if (currentUser.displayName) {
                displayName = currentUser.displayName;
            } else if (currentUser.email) {
                displayName = currentUser.email.split('@')[0];
            } else if (currentUser.username) {
                displayName = currentUser.username;
            }

            usernameDisplay.textContent = displayName;
        }

        // Show admin link if user is admin
        if (adminLink && currentUser.username === 'admin') {
            adminLink.style.display = 'inline-flex';
        }
    } else {
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Kiểm tra và hiển thị badge thông báo
function updateAttendanceBadge() {
    const attendanceBadge = document.getElementById('attendanceBadge');
    
    if (!attendanceBadge) {
        return;
    }
    
    const today = new Date();
    const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const hasTodayMilestone = milestoneData[todayString] ? true : false;
    const hasCheckedInToday = attendanceData[todayString] ? true : false;
    
    if (!hasCheckedInToday || hasTodayMilestone) {
        if (!hasCheckedInToday && hasTodayMilestone) {
            attendanceBadge.innerHTML = '!';
            attendanceBadge.title = 'Bạn chưa điểm danh hôm nay và có cột mốc quan trọng';
            attendanceBadge.style.backgroundColor = '#e74c3c';
        } else if (!hasCheckedInToday) {
            attendanceBadge.innerHTML = '!';
            attendanceBadge.title = 'Bạn chưa điểm danh hôm nay';
            attendanceBadge.style.backgroundColor = '#e74c3c';
        } else if (hasTodayMilestone) {
            attendanceBadge.innerHTML = 'M';
            attendanceBadge.title = 'Hôm nay có cột mốc quan trọng: ' + milestoneData[todayString].title;
            attendanceBadge.style.backgroundColor = '#f39c12';
        }
        
        attendanceBadge.style.display = 'flex';
    } else {
        attendanceBadge.style.display = 'none';
    }
}

// Tải dữ liệu điểm danh và cột mốc
function loadAttendanceData() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance`);
    
    onValue(attendanceRef, (snapshot) => {
        attendanceData = snapshot.val() || {};
        updateAttendanceBadge();
    });
    
    const milestoneRef = ref(db, `users/${currentUser.uid}/milestones`);
    
    onValue(milestoneRef, (snapshot) => {
        milestoneData = snapshot.val() || {};
        updateAttendanceBadge();
    });
}

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }

    updateUIOnAuth();
    loadAttendanceData();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
});

