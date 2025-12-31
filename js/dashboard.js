// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

import { checkAuth, getCurrentUser, logoutUser, updateUIOnAuth } from "./auth.js";

// Kiểm tra và hiển thị badge thông báo
function updateAttendanceBadge() {
    console.log('updateAttendanceBadge called');

    const attendanceBadge = document.getElementById('attendanceBadge');

    // Kiểm tra xem badge element có tồn tại không
    if (!attendanceBadge) {
        console.error('Badge element not found!');
        return;
    }

    const today = new Date();
    const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    console.log('Today string:', todayString);

    // Kiểm tra xem có cột mốc nào cho ngày hôm nay không
    const hasTodayMilestone = milestoneData[todayString] ? true : false;
    console.log('Has today milestone:', hasTodayMilestone);

    // Kiểm tra xem người dùng đã điểm danh hôm nay chưa
    const hasCheckedInToday = attendanceData[todayString] ? true : false;
    console.log('Has checked in today:', hasCheckedInToday);

    // Hiển thị badge nếu chưa điểm danh hoặc có cột mốc quan trọng hôm nay
    if (!hasCheckedInToday || hasTodayMilestone) {
        console.log('Showing badge');

        // Thay đổi nội dung badge tùy theo trường hợp
        if (!hasCheckedInToday && hasTodayMilestone) {
            attendanceBadge.innerHTML = '!';
            attendanceBadge.title = 'Bạn chưa điểm danh hôm nay và có cột mốc quan trọng';
            attendanceBadge.style.backgroundColor = '#e74c3c'; // Màu đỏ
            console.log('Badge type: Not checked in and has milestone');
        } else if (!hasCheckedInToday) {
            attendanceBadge.innerHTML = '!';
            attendanceBadge.title = 'Bạn chưa điểm danh hôm nay';
            attendanceBadge.style.backgroundColor = '#e74c3c'; // Màu đỏ
            console.log('Badge type: Not checked in');
        } else if (hasTodayMilestone) {
            attendanceBadge.innerHTML = 'M';
            attendanceBadge.title = 'Hôm nay có cột mốc quan trọng: ' + milestoneData[todayString].title;
            attendanceBadge.style.backgroundColor = '#f39c12'; // Màu cam
            console.log('Badge type: Has milestone');
        }

        // Đảm bảo badge hiển thị
        attendanceBadge.style.display = 'flex';
    } else {
        console.log('Hiding badge');
        attendanceBadge.style.display = 'none';
    }
}

// Tải dữ liệu điểm danh và cột mốc
function loadAttendanceData() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    console.log('Loading attendance data for user:', currentUser.uid);

    // Tải dữ liệu điểm danh
    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance`);

    onValue(attendanceRef, (snapshot) => {
        attendanceData = snapshot.val() || {};
        console.log('Attendance data loaded:', attendanceData);
        updateAttendanceBadge();
    }, (error) => {
        console.error('Error loading attendance data:', error);
    });

    // Tải dữ liệu cột mốc
    const milestoneRef = ref(db, `users/${currentUser.uid}/milestones`);

    onValue(milestoneRef, (snapshot) => {
        milestoneData = snapshot.val() || {};
        console.log('Milestone data loaded:', milestoneData);
        updateAttendanceBadge();
    }, (error) => {
        console.error('Error loading milestone data:', error);
    });
}

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!checkAuth()) {
        return;
    }

    // Update UI based on auth state
    updateUIOnAuth();

    // Tải dữ liệu điểm danh và cột mốc
    loadAttendanceData();

    // Đảm bảo badge hiển thị sau khi trang được tải
    setTimeout(() => {
        updateAttendanceBadge();
        console.log('Badge updated on page load');
    }, 1000);

    // Thêm một lần nữa để đảm bảo badge hiển thị sau khi dữ liệu được tải
    setTimeout(() => {
        updateAttendanceBadge();
        console.log('Badge updated again after delay');
    }, 3000);

    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await logoutUser();
            if (result.success) window.location.href = 'login.html';
        });
    }
});
