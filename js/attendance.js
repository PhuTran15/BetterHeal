// BetterHeal - Attendance JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

// DOM Elements
const calendarDays = document.getElementById('calendarDays');
const currentMonthYearElement = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const checkInBtn = document.getElementById('checkInBtn');
const todayStatusElement = document.getElementById('todayStatus');
const streakCountElement = document.getElementById('streakCount');
const totalAttendanceElement = document.getElementById('totalAttendance');
const attendanceModal = document.getElementById('attendanceModal');
const closeModalBtn = document.getElementById('closeModal');
const usernameDisplay = document.getElementById('usernameDisplay') || document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const reward1 = document.getElementById('reward1');
const reward2 = document.getElementById('reward2');
const reward3 = document.getElementById('reward3');
const customToast = document.getElementById('customToast');
const attendanceBadge = document.getElementById('attendanceBadge');

// Biến lưu trữ lời nhắn từ file JSON
let gentleQuotes = [];

// Tải lời nhắn từ file JSON
async function loadQuotes() {
    try {
        const response = await fetch('js/quotes.json');
        if (!response.ok) throw new Error('Không thể tải file lời nhắn');
        gentleQuotes = await response.val ? await response.val() : await response.json();
        console.log('Đã tải kho báu lời nhắn:', gentleQuotes.length, 'câu');
        displayRandomQuote();
    } catch (error) {
        console.error('Lỗi khi tải lời nhắn:', error);
        // Lời nhắn dự phòng nếu lỗi tải file
        gentleQuotes = [{
            "content": "Sự dịu dàng là món quà quý giá nhất mà đôi ta dành tặng cho nhau mỗi ngày.",
            "author": "BetterHeal"
        }];
        displayRandomQuote();
    }
}

// Confirm Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// Milestone Modal Elements
const milestoneModal = document.getElementById('milestoneModal');
const closeMilestoneModal = document.getElementById('closeMilestoneModal');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const milestoneTitleInput = document.getElementById('milestoneTitle');
const milestoneDescriptionInput = document.getElementById('milestoneDescription');
const saveMilestoneBtn = document.getElementById('saveMilestoneBtn');
const removeMilestoneBtn = document.getElementById('removeMilestoneBtn');

// Variables
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentUser = null;
let attendanceData = {};
let milestoneData = {};
let hasCheckedInToday = false;
let selectedDate = null;

// Mảng màu sắc cho cột mốc
const milestoneColors = [
    '#FF9A76', // Cam
    '#67B7D1', // Xanh dương
    '#A3D977', // Xanh lá
    '#D291BC', // Hồng
    '#FFD166', // Vàng
    '#6A8EAE', // Xanh dương đậm
    '#F78FB3', // Hồng đậm
    '#3BCEAC', // Ngọc lam
    '#E8505B', // Đỏ
    '#9B5DE5'  // Tím
];

// Hàm tạo màu ngẫu nhiên từ mảng màu
function getRandomColor() {
    return milestoneColors[Math.floor(Math.random() * milestoneColors.length)];
}

// Hàm hiển thị thông báo tùy chỉnh
function showToast(message, type = 'success') {
    // Thiết lập nội dung và kiểu thông báo
    const toastMessage = customToast.querySelector('.toast-message');
    const toastIcon = customToast.querySelector('.toast-icon i');
    const toastProgress = customToast.querySelector('.toast-progress');

    // Đặt nội dung thông báo
    toastMessage.textContent = message;

    // Đặt kiểu thông báo (success, error, info)
    toastIcon.className = ''; // Xóa class cũ
    toastProgress.className = 'toast-progress'; // Xóa class cũ

    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle';
        toastIcon.classList.add('error');
        toastProgress.classList.add('error');
    } else if (type === 'info') {
        toastIcon.className = 'fas fa-info-circle';
        toastIcon.classList.add('info');
        toastProgress.classList.add('info');
    }

    // Hiển thị thông báo
    customToast.classList.add('show');

    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
        customToast.classList.remove('show');
    }, 3000);

    // Reset animation thanh tiến trình
    toastProgress.style.animation = 'none';
    toastProgress.offsetHeight; // Trigger reflow
    toastProgress.style.animation = 'progress 3s linear forwards';
}

// Hàm kiểm tra độ sáng của màu để chọn màu chữ phù hợp (đen hoặc trắng)
function isColorLight(color) {
    // Chuyển đổi hex sang RGB
    let r, g, b;

    if (color.startsWith('#')) {
        // Hex color
        const hex = color.substring(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
        // RGB color
        const rgbValues = color.match(/\d+/g);
        r = parseInt(rgbValues[0]);
        g = parseInt(rgbValues[1]);
        b = parseInt(rgbValues[2]);
    } else {
        // Mặc định là màu tối
        return false;
    }

    // Tính toán độ sáng theo công thức YIQ
    // https://www.w3.org/TR/AERT/#color-contrast
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Ngưỡng 128 - nếu lớn hơn thì là màu sáng, nhỏ hơn thì là màu tối
    return yiq >= 128;
}

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
        currentUser = user;
        // Xử lý tên người dùng để hiển thị thân thiện hơn
        let displayName = 'Người dùng';

        if (user.displayName) {
            displayName = user.displayName;
        } else if (user.email) {
            // Nếu là email, chỉ lấy phần tên trước @
            displayName = user.email.split('@')[0];
        }

        if (usernameDisplay) {
            usernameDisplay.textContent = displayName;
        } else {
            const userNameAlt = document.getElementById('userName');
            if (userNameAlt) userNameAlt.textContent = displayName;
        }
        
        console.log('Loading attendance data for user:', user.uid);
        loadAttendanceData();
    } else {
        console.log('No user authenticated, redirecting to login');
        window.location.href = 'login.html';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Load attendance data from Firebase
function loadAttendanceData() {
    console.log('Starting to load attendance data...');

    // Load attendance data
    const attendanceRef = ref(db, `users/${currentUser.uid}/attendance`);
    console.log('Attendance reference path:', `users/${currentUser.uid}/attendance`);

    onValue(attendanceRef, (snapshot) => {
        attendanceData = snapshot.val() || {};
        console.log('Attendance data loaded:', attendanceData);
        updateCalendar();
        updateStats();
        checkTodayStatus();
    }, (error) => {
        console.error('Error loading attendance data:', error);
    });

    // Load milestone data
    const milestoneRef = ref(db, `users/${currentUser.uid}/milestones`);
    console.log('Milestone reference path:', `users/${currentUser.uid}/milestones`);

    onValue(milestoneRef, (snapshot) => {
        milestoneData = snapshot.val() || {};
        console.log('Milestone data loaded:', milestoneData);
        updateCalendar(); // Update calendar to show milestones
        updateAttendanceBadge(); // Cập nhật badge thông báo
    }, (error) => {
        console.error('Error loading milestone data:', error);
    });
}

// Generate calendar for current month
function updateCalendar() {
    calendarDays.innerHTML = '';

    // Update month and year display
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    currentMonthYearElement.textContent = `${monthNames[currentMonth]}, ${currentYear}`;

    // Get first day of month and total days in month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        calendarDays.appendChild(emptyDay);
    }

    // Add days of the month
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const dateString = `${currentYear}-${currentMonth + 1}-${day}`;

        // Check if this day is today
        if (day === todayDate && currentMonth === todayMonth && currentYear === todayYear) {
            dayElement.classList.add('today');
        }

        // Check if this day is in the future
        const thisDate = new Date(currentYear, currentMonth, day);
        if (thisDate > today) {
            dayElement.classList.add('future');
        }

        // Check if user has checked in on this day
        if (attendanceData[dateString]) {
            dayElement.classList.add('checked');
        }

        // Check if this day is part of a streak
        if (isPartOfStreak(dateString)) {
            dayElement.classList.add('streak');
        }

        // Check if this day has a milestone
        if (milestoneData[dateString]) {
            const milestone = milestoneData[dateString];
            dayElement.classList.add('milestone');
            dayElement.title = milestone.title;
            dayElement.setAttribute('data-title', milestone.title);

            // Lấy màu từ dữ liệu hoặc dùng màu mặc định nếu không có
            const milestoneColor = milestone.color || '#FF9A76';
            console.log('Displaying milestone:', dateString, 'Color:', milestoneColor);

            // Áp dụng màu cho ngày có cột mốc
            dayElement.style.backgroundColor = milestoneColor;

            // Tính toán màu chữ dựa trên độ sáng của màu nền
            const isLightColor = isColorLight(milestoneColor);
            dayElement.style.color = isLightColor ? '#333' : '#fff';

            // Xử lý các trạng thái đặc biệt mà không làm mất màu sắc
            if (dayElement.classList.contains('today')) {
                // Thêm viền đậm cho ngày hôm nay
                dayElement.style.border = '2px solid var(--today-color)';
            }

            if (dayElement.classList.contains('checked')) {
                // Thêm dấu hiệu đã điểm danh
                const checkMark = document.createElement('div');
                checkMark.className = 'check-mark';
                checkMark.innerHTML = '<i class="fas fa-check"></i>';
                checkMark.style.position = 'absolute';
                checkMark.style.top = '5px';
                checkMark.style.left = '5px';
                checkMark.style.fontSize = '0.7rem';
                checkMark.style.color = '#fff';
                checkMark.style.backgroundColor = 'var(--success-color)';
                checkMark.style.borderRadius = '50%';
                checkMark.style.width = '15px';
                checkMark.style.height = '15px';
                checkMark.style.display = 'flex';
                checkMark.style.alignItems = 'center';
                checkMark.style.justifyContent = 'center';
                dayElement.appendChild(checkMark);
            }

            // Thêm một phần tử con để hiển thị chủ đề cột mốc
            const milestoneLabel = document.createElement('div');
            milestoneLabel.className = 'milestone-label';
            milestoneLabel.textContent = milestone.title;
            milestoneLabel.style.backgroundColor = milestoneColor;
            milestoneLabel.style.color = isLightColor ? '#333' : '#fff';
            dayElement.appendChild(milestoneLabel);

            // Thêm tooltip chi tiết khi hover
            dayElement.title = `${milestone.title}${milestone.description ? '\n\n' + milestone.description : ''}`;

            // Thêm sự kiện hover để hiển thị/ẩn nhãn
            dayElement.addEventListener('mouseenter', () => {
                milestoneLabel.style.zIndex = '10';
                milestoneLabel.style.maxWidth = '200px';
                milestoneLabel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            });

            dayElement.addEventListener('mouseleave', () => {
                milestoneLabel.style.zIndex = '5';
                milestoneLabel.style.maxWidth = '120px';
                milestoneLabel.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            });
        }

        // Add click event to open milestone modal
        dayElement.addEventListener('click', () => {
            if (!dayElement.classList.contains('empty')) {
                openMilestoneModal(dateString, day);
            }
        });

        calendarDays.appendChild(dayElement);
    }
}

// Check if a date is part of a streak
function isPartOfStreak(dateString) {
    if (!attendanceData[dateString]) return false;

    const [year, month, day] = dateString.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);

    // Check previous day
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateString = `${prevDate.getFullYear()}-${prevDate.getMonth() + 1}-${prevDate.getDate()}`;

    // Check next day
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateString = `${nextDate.getFullYear()}-${nextDate.getMonth() + 1}-${nextDate.getDate()}`;

    return (attendanceData[prevDateString] || attendanceData[nextDateString]);
}

// Update attendance statistics
function updateStats() {
    // Calculate total attendance
    const totalDays = Object.keys(attendanceData).length;
    totalAttendanceElement.textContent = `${totalDays} ngày`;

    // Calculate current streak
    const streak = calculateStreak();
    streakCountElement.textContent = `${streak} ngày`;
}

// Calculate current streak
function calculateStreak() {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    // Check if user checked in today
    const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hasCheckedInOnDate = attendanceData[todayString];

    // If not checked in today, start from yesterday
    if (!hasCheckedInOnDate) {
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days
    while (true) {
        const dateString = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
        if (attendanceData[dateString]) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// Kiểm tra và hiển thị badge thông báo
function updateAttendanceBadge() {
    console.log('updateAttendanceBadge called');

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

        // Thêm hiệu ứng nhấp nháy
        if (!attendanceBadge.hasAnimation) {
            attendanceBadge.style.animation = 'pulse 1.5s infinite';
            attendanceBadge.hasAnimation = true;
        }
    } else {
        console.log('Hiding badge');
        attendanceBadge.style.display = 'none';
    }
}

// Check if user has already checked in today
function checkTodayStatus() {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    hasCheckedInToday = attendanceData[todayString] ? true : false;

    if (hasCheckedInToday) {
        todayStatusElement.textContent = 'Đã điểm danh';
        todayStatusElement.style.color = 'var(--success-color)';
        checkInBtn.disabled = true;
        checkInBtn.textContent = 'Đã điểm danh hôm nay';
    } else {
        todayStatusElement.textContent = 'Chưa điểm danh';
        todayStatusElement.style.color = 'var(--error-color)';
        checkInBtn.disabled = false;
        checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Điểm danh ngay';
    }

    // Cập nhật badge thông báo
    updateAttendanceBadge();
}

// Hiển thị một lời nhắn ngẫu nhiên
function displayRandomQuote() {
    const quoteElement = document.getElementById('dailyQuote');
    const authorElement = document.querySelector('.quote-author');
    
    if (quoteElement && gentleQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * gentleQuotes.length);
        const randomQuote = gentleQuotes[randomIndex];
        quoteElement.textContent = randomQuote.content;
        if (authorElement) authorElement.textContent = randomQuote.author;
    }
}

// Check in for today
async function checkIn() {
    if (!currentUser || hasCheckedInToday) return;

    const today = new Date();
    const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    try {
        // Update attendance data in Firebase
        await set(ref(db, `users/${currentUser.uid}/attendance/${todayString}`), {
            timestamp: Date.now()
        });

        // Show success modal
        attendanceModal.style.display = 'flex';

        // Update UI
        hasCheckedInToday = true;
        checkTodayStatus();
        updateCalendar();
        updateStats();
        displayRandomQuote(); // Hiển thị lời nhắn mới khi điểm danh
        updateAttendanceBadge(); // Cập nhật badge thông báo
    } catch (error) {
        console.error('Check-in error:', error);
        showToast('Có lỗi xảy ra khi điểm danh. Vui lòng thử lại sau.', 'error');
    }
}

// Reload data function
function reloadData() {
    console.log('Manually reloading data...');

    // Clear existing data
    attendanceData = {};
    milestoneData = {};

    // Show loading indicator
    const reloadBtn = document.getElementById('reloadDataBtn');
    const originalText = reloadBtn.innerHTML;
    reloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
    reloadBtn.disabled = true;

    // Load data again
    loadAttendanceData();

    // Reset button after 2 seconds
    setTimeout(() => {
        reloadBtn.innerHTML = originalText;
        reloadBtn.disabled = false;
        showToast('Đã tải lại dữ liệu thành công!', 'success');
    }, 2000);
}

// Event Listeners
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendar();
});

checkInBtn.addEventListener('click', checkIn);

// Add event listener for reload button
const reloadDataBtn = document.getElementById('reloadDataBtn');
reloadDataBtn.addEventListener('click', reloadData);

closeModalBtn.addEventListener('click', () => {
    attendanceModal.style.display = 'none';
});

// Open milestone modal
function openMilestoneModal(dateString, day) {
    selectedDate = dateString;

    // Format date for display
    const [year, month, date] = dateString.split('-');
    const displayDate = `${date}/${month}/${year}`;
    selectedDateDisplay.textContent = `Ngày: ${displayDate}`;

    // Check if there's existing milestone data
    if (milestoneData[dateString]) {
        const milestone = milestoneData[dateString];
        milestoneTitleInput.value = milestone.title || '';
        milestoneDescriptionInput.value = milestone.description || '';

        // Hiển thị màu sắc hiện tại của cột mốc
        const milestoneColor = milestone.color || '#FF9A76';
        selectedDateDisplay.style.borderLeftColor = milestoneColor;

        // Hiển thị nút xóa cột mốc
        removeMilestoneBtn.style.display = 'block';
    } else {
        milestoneTitleInput.value = '';
        milestoneDescriptionInput.value = '';

        // Đặt lại màu mặc định
        selectedDateDisplay.style.borderLeftColor = 'var(--primary-color)';

        // Ẩn nút xóa cột mốc
        removeMilestoneBtn.style.display = 'none';
    }

    milestoneModal.style.display = 'flex';
}

// Save milestone
async function saveMilestone() {
    if (!selectedDate || !milestoneTitleInput.value.trim()) {
        showToast('Vui lòng nhập chủ đề cột mốc', 'error');
        return;
    }

    try {
        // Kiểm tra xem đã có cột mốc cho ngày này chưa
        const milestoneRef = ref(db, `users/${currentUser.uid}/milestones/${selectedDate}`);
        const snapshot = await get(milestoneRef);

        // Nếu đã có cột mốc, giữ nguyên màu cũ
        // Nếu chưa có, tạo màu ngẫu nhiên mới
        const color = snapshot.exists() ? snapshot.val().color : getRandomColor();
        console.log('Milestone color:', color);

        await set(milestoneRef, {
            title: milestoneTitleInput.value.trim(),
            description: milestoneDescriptionInput.value.trim(),
            color: color,
            timestamp: Date.now()
        });

        milestoneModal.style.display = 'none';
        showToast('Đã lưu cột mốc thành công', 'success');
        updateAttendanceBadge(); // Cập nhật badge thông báo
        // Calendar will update automatically due to the onValue listener
    } catch (error) {
        console.error('Save milestone error:', error);
        showToast('Có lỗi xảy ra khi lưu cột mốc. Vui lòng thử lại sau.', 'error');
    }
}

// Hàm hiển thị modal xác nhận
function showConfirmModal(message, callback) {
    confirmMessage.textContent = message;
    confirmModal.style.display = 'flex';

    // Xử lý sự kiện nút Xóa
    const handleYesClick = async () => {
        confirmModal.style.display = 'none';
        confirmYesBtn.removeEventListener('click', handleYesClick);
        confirmNoBtn.removeEventListener('click', handleNoClick);

        if (callback) {
            await callback();
        }
    };

    // Xử lý sự kiện nút Hủy
    const handleNoClick = () => {
        confirmModal.style.display = 'none';
        confirmYesBtn.removeEventListener('click', handleYesClick);
        confirmNoBtn.removeEventListener('click', handleNoClick);
    };

    confirmYesBtn.addEventListener('click', handleYesClick);
    confirmNoBtn.addEventListener('click', handleNoClick);

    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function handleOutsideClick(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
            confirmYesBtn.removeEventListener('click', handleYesClick);
            confirmNoBtn.removeEventListener('click', handleNoClick);
            window.removeEventListener('click', handleOutsideClick);
        }
    });
}

// Remove milestone
async function removeMilestone() {
    if (!selectedDate || !milestoneData[selectedDate]) {
        return;
    }

    // Hiển thị modal xác nhận
    showConfirmModal('Bạn có chắc chắn muốn xóa cột mốc này?', async () => {
        try {
            await set(ref(db, `users/${currentUser.uid}/milestones/${selectedDate}`), null);
            milestoneModal.style.display = 'none';
            showToast('Đã xóa cột mốc thành công', 'info');
            updateAttendanceBadge(); // Cập nhật badge thông báo
            // Calendar will update automatically due to the onValue listener
        } catch (error) {
            console.error('Remove milestone error:', error);
            showToast('Có lỗi xảy ra khi xóa cột mốc. Vui lòng thử lại sau.', 'error');
        }
    });
}

// Event listeners for milestone modal
closeMilestoneModal.addEventListener('click', () => {
    milestoneModal.style.display = 'none';
});

saveMilestoneBtn.addEventListener('click', saveMilestone);
removeMilestoneBtn.addEventListener('click', removeMilestone);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === milestoneModal) {
        milestoneModal.style.display = 'none';
    }
    if (event.target === attendanceModal) {
        attendanceModal.style.display = 'none';
    }
});

// Initialize calendar
updateCalendar();

// Hiển thị badge và lời nhắn khi trang được tải
setTimeout(() => {
    updateAttendanceBadge();
    loadQuotes(); // Tải và hiển thị lời nhắn
    console.log('UI updated on page load');
}, 1000);
