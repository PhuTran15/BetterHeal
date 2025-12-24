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

// Canvas và particles
const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let floatingParticles = []; // Hạt bay quanh trái tim
let orbitParticles = []; // Hạt bay vòng quanh như xích đạo
let clickHearts = []; // Trái tim từ click chuột
let animationId = null;
let isAnimating = false;

// Thiết lập kích thước canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;
}

// Hàm tạo hình trái tim (phương trình toán học)
function heartShape(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x, y };
}

// Class Particle
class Particle {
    constructor(targetX, targetY, delay) {
        // Vị trí bắt đầu ngẫu nhiên
        this.startX = Math.random() * canvas.width;
        this.startY = Math.random() * canvas.height;

        // Vị trí hiện tại
        this.x = this.startX;
        this.y = this.startY;

        // Vị trí đích (trái tim)
        this.targetX = targetX;
        this.targetY = targetY;

        // Thuộc tính
        this.size = Math.random() * 2 + 1;
        this.delay = delay;
        this.progress = 0;
        this.speed = 0.004 + Math.random() * 0.004;

        // Màu sắc gradient từ hồng đến đỏ
        const colors = [
            '#ff6b6b', '#ee5a6f', '#f06595', '#e64980',
            '#d6336c', '#f783ac', '#ff8787', '#fa5252'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Hiệu ứng lấp lánh
        this.opacity = 0;
        this.maxOpacity = 0.8 + Math.random() * 0.2;

        // Velocity cho chuyển động mượt
        this.vx = 0;
        this.vy = 0;

        // Chuyển động vòng tròn khi hoàn thành
        this.circleAngle = Math.random() * Math.PI * 2; // Góc bắt đầu ngẫu nhiên
        this.circleSpeed = 0.01 + Math.random() * 0.02; // Tốc độ quay
        this.circleRadius = 2 + Math.random() * 3; // Tăng bán kính để các hạt tách ra (2-5 pixel)
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        if (this.progress < 1) {
            this.progress += this.speed;

            // Smooth easing (ease-out-quad)
            const t = this.progress;
            const easeProgress = t * (2 - t);

            // Tính vị trí mục tiêu
            const targetX = this.startX + (this.targetX - this.startX) * easeProgress;
            const targetY = this.startY + (this.targetY - this.startY) * easeProgress;

            // Smooth interpolation với velocity
            this.vx += (targetX - this.x) * 0.1;
            this.vy += (targetY - this.y) * 0.1;
            this.vx *= 0.9;
            this.vy *= 0.9;

            this.x += this.vx;
            this.y += this.vy;

            // Tăng độ mờ dần
            this.opacity = this.maxOpacity * Math.min(this.progress * 2, 1);
        } else {
            // Chuyển động vòng tròn nhẹ nhàng quanh vị trí đích
            this.circleAngle += this.circleSpeed;

            const offsetX = Math.cos(this.circleAngle) * this.circleRadius;
            const offsetY = Math.sin(this.circleAngle) * this.circleRadius;

            this.x = this.targetX + offsetX;
            this.y = this.targetY + offsetY;

            // Hiệu ứng lấp lánh
            const time = Date.now() * 0.001;
            this.opacity = this.maxOpacity * (0.9 + Math.sin(time * 2 + this.startX * 0.01) * 0.1);
        }
    }

    draw() {
        if (this.delay > 0) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Class ClickHeart - Trái tim từ click chuột
class ClickHeart {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.size = 20 + Math.random() * 20; // Kích thước ngẫu nhiên
        this.opacity = 1;
        this.speed = 2 + Math.random() * 2; // Tốc độ bay lên
        this.rotation = Math.random() * Math.PI * 2; // Góc xoay ngẫu nhiên
        this.rotationSpeed = (Math.random() - 0.5) * 0.1; // Tốc độ xoay
        this.fadeSpeed = 0.015 + Math.random() * 0.01; // Tốc độ mờ dần
        this.sway = Math.random() * 2 - 1; // Dao động ngang

        // Màu sắc ngẫu nhiên
        const colors = [
            '#ff6b6b', '#f06595', '#e64980', '#d6336c',
            '#f783ac', '#ff8787', '#fa5252', '#ff6b9d'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        this.isDead = false;
    }

    update() {
        // Bay lên
        this.y -= this.speed;

        // Dao động ngang
        this.x += Math.sin((this.startY - this.y) * 0.05) * this.sway;

        // Xoay
        this.rotation += this.rotationSpeed;

        // Mờ dần
        this.opacity -= this.fadeSpeed;

        // Kiểm tra nếu đã mờ hết
        if (this.opacity <= 0) {
            this.isDead = true;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Vẽ trái tim bằng text emoji
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow để nổi bật
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        // Gradient cho trái tim
        const gradient = ctx.createLinearGradient(-this.size/2, -this.size/2, this.size/2, this.size/2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, '#ff0066');
        ctx.fillStyle = gradient;

        // Vẽ emoji trái tim
        ctx.fillText('❤️', 0, 0);

        ctx.restore();
    }
}

// Class FloatingParticle - Hạt bay quanh trái tim
class FloatingParticle {
    constructor(centerX, centerY, scale, delay) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.scale = scale;

        // Vị trí trên đường viền trái tim
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = (Math.random() - 0.5) * 0.01; // Tốc độ di chuyển quanh trái tim

        // Khoảng cách từ trái tim
        this.distance = 20 + Math.random() * 30;
        this.distanceSpeed = (Math.random() - 0.5) * 0.2;
        this.minDistance = 15;
        this.maxDistance = 50;

        // Thuộc tính
        this.size = Math.random() * 3 + 2;

        // Màu sắc sáng hơn để nổi bật
        const colors = [
            '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9',
            '#bae1ff', '#ffd4e5', '#fff5ba', '#e0bbe4'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Fade in effect
        this.delay = delay;
        this.fadeProgress = 0; // 0 = trong suốt, 1 = hiện hoàn toàn
        this.fadeSpeed = 0.015; // Tốc độ fade in
        this.isVisible = false;

        // Hiệu ứng lấp lánh (sau khi fade in xong)
        this.baseOpacity = 0.6 + Math.random() * 0.4;
        this.opacitySpeed = (Math.random() - 0.5) * 0.02;
        this.minOpacity = 0.3;
        this.maxOpacity = 1;
        this.currentOpacity = this.baseOpacity;

        this.updatePosition();
    }

    updatePosition() {
        // Tính vị trí trên đường viền trái tim
        const point = heartShape(this.angle);

        // Thêm khoảng cách offset
        const normalX = Math.cos(this.angle);
        const normalY = Math.sin(this.angle);

        this.x = this.centerX + (point.x * this.scale) + (normalX * this.distance);
        this.y = this.centerY + (point.y * this.scale) + (normalY * this.distance);
    }

    update() {
        // Xử lý delay trước khi bắt đầu fade in
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        // Fade in từ từ
        if (this.fadeProgress < 1) {
            this.fadeProgress += this.fadeSpeed;
            if (this.fadeProgress >= 1) {
                this.fadeProgress = 1;
                this.isVisible = true;
            }
        }

        // Di chuyển quanh trái tim
        this.angle += this.angleSpeed;

        // Thay đổi khoảng cách
        this.distance += this.distanceSpeed;
        if (this.distance < this.minDistance || this.distance > this.maxDistance) {
            this.distanceSpeed *= -1;
        }

        // Thay đổi độ mờ (lấp lánh)
        if (this.isVisible) {
            this.currentOpacity += this.opacitySpeed;
            if (this.currentOpacity < this.minOpacity || this.currentOpacity > this.maxOpacity) {
                this.opacitySpeed *= -1;
            }
        }

        this.updatePosition();
    }

    draw() {
        // Không vẽ gì nếu chưa bắt đầu fade in
        if (this.delay > 0) {
            return;
        }

        // Tính opacity cuối cùng dựa trên fade progress
        const finalOpacity = this.fadeProgress * this.currentOpacity;

        ctx.save();
        ctx.globalAlpha = finalOpacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15 * this.fadeProgress;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Class OrbitParticle - Hạt bay vòng quanh trái tim như xích đạo
class OrbitParticle {
    constructor(centerX, centerY, scale, orbitIndex, totalOrbits, delay) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.scale = scale;

        // Góc nghiêng của quỹ đạo (như xích đạo nghiêng)
        this.orbitTilt = (orbitIndex / totalOrbits) * Math.PI; // 0 đến PI

        // Vị trí trên quỹ đạo
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = 0.02 + Math.random() * 0.01; // Tốc độ bay vòng

        // Khoảng cách từ tâm (bán kính quỹ đạo)
        this.orbitRadius = 60 + orbitIndex * 15; // Các quỹ đạo cách nhau

        // Thuộc tính hạt
        this.size = 3 + Math.random() * 2;

        // Màu sắc sáng để nổi bật
        const colors = [
            '#ffd700', '#ffed4e', '#fff59d', '#ffeb3b',
            '#ffc107', '#ffb300', '#ffa726', '#ff9800'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Fade in effect - bắt đầu từ trong suốt
        this.delay = delay; // Delay trước khi bắt đầu hiện
        this.fadeProgress = 0; // 0 = trong suốt, 1 = hiện hoàn toàn
        this.fadeSpeed = 0.01; // Tốc độ fade in
        this.isVisible = false; // Chưa hiện

        // Hiệu ứng lấp lánh (sau khi đã fade in xong)
        this.baseOpacity = 0.8 + Math.random() * 0.2;
        this.opacitySpeed = (Math.random() - 0.5) * 0.02;
        this.minOpacity = 0.5;
        this.maxOpacity = 1;
        this.currentOpacity = this.baseOpacity;

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 5;

        this.updatePosition();
    }

    updatePosition() {
        // Tính toán vị trí 3D với góc nghiêng
        const x3d = Math.cos(this.angle) * this.orbitRadius;
        const y3d = Math.sin(this.angle) * this.orbitRadius;
        const z3d = Math.sin(this.angle) * this.orbitRadius * Math.sin(this.orbitTilt);

        // Chiếu xuống 2D với perspective
        const perspective = 1 - (z3d / (this.orbitRadius * 2));

        this.x = this.centerX + x3d * Math.cos(this.orbitTilt);
        this.y = this.centerY + y3d;

        // Kích thước thay đổi theo perspective (xa thì nhỏ, gần thì lớn)
        this.currentSize = this.size * perspective;

        // Opacity thay đổi theo perspective
        this.perspectiveOpacity = perspective;
    }

    update() {
        // Xử lý delay trước khi bắt đầu fade in
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        // Fade in từ từ
        if (this.fadeProgress < 1) {
            this.fadeProgress += this.fadeSpeed;
            if (this.fadeProgress >= 1) {
                this.fadeProgress = 1;
                this.isVisible = true;
            }
        }

        // Chỉ bắt đầu di chuyển và lưu trail khi đã visible
        if (this.isVisible) {
            // Lưu vị trí cũ cho trail
            this.trail.push({ x: this.x, y: this.y, opacity: this.currentOpacity * this.perspectiveOpacity });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // Di chuyển trên quỹ đạo
            this.angle += this.angleSpeed;

            // Thay đổi độ mờ (lấp lánh)
            this.currentOpacity += this.opacitySpeed;
            if (this.currentOpacity < this.minOpacity || this.currentOpacity > this.maxOpacity) {
                this.opacitySpeed *= -1;
            }
        } else {
            // Vẫn di chuyển nhưng không lưu trail khi đang fade in
            this.angle += this.angleSpeed;
        }

        this.updatePosition();
    }

    draw() {
        // Không vẽ gì nếu chưa bắt đầu fade in
        if (this.delay > 0) {
            return;
        }

        // Tính opacity cuối cùng dựa trên fade progress
        const finalOpacity = this.fadeProgress * this.currentOpacity * this.perspectiveOpacity;

        // Vẽ trail (chỉ khi đã visible)
        if (this.isVisible) {
            ctx.save();
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const trailOpacity = (i / this.trail.length) * t.opacity * 0.5 * this.fadeProgress;
                const trailSize = this.currentSize * (i / this.trail.length);

                ctx.globalAlpha = trailOpacity;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Vẽ hạt chính với fade effect
        ctx.save();
        ctx.globalAlpha = finalOpacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20 * this.fadeProgress;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ vòng sáng bên ngoài
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = finalOpacity * 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// Tạo particles theo hình trái tim
function createHeartParticles() {
    particles = [];
    floatingParticles = [];
    orbitParticles = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 40;
    const numPoints = 2000; // Giảm xuống 2000 để mượt hơn

    for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const point = heartShape(t);

        const targetX = centerX + point.x * scale;
        const targetY = centerY + point.y * scale;
        const delay = Math.random() * 100;

        particles.push(new Particle(targetX, targetY, delay));
    }

    // Tạo các hạt bay quanh trái tim
    const numFloating = 30; // Số lượng hạt bay quanh
    let floatingDelay = 120; // Bắt đầu sau khi trái tim đã hình thành một phần
    for (let i = 0; i < numFloating; i++) {
        floatingParticles.push(new FloatingParticle(centerX, centerY, scale, floatingDelay));
        floatingDelay += 3; // Delay tăng dần cho mỗi hạt (nhanh hơn orbit)
    }

    // Tạo các hạt bay vòng quanh như xích đạo
    const numOrbits = 3; // Số quỹ đạo
    const particlesPerOrbit = 4; // Số hạt trên mỗi quỹ đạo
    let orbitDelay = 150; // Bắt đầu sau khi trái tim đã hình thành một phần
    for (let i = 0; i < numOrbits; i++) {
        for (let j = 0; j < particlesPerOrbit; j++) {
            // Mỗi hạt có delay khác nhau để hiện lần lượt
            orbitParticles.push(new OrbitParticle(centerX, centerY, scale, i, numOrbits, orbitDelay));
            orbitDelay += 10; // Delay tăng dần cho mỗi hạt
        }
    }
}

// Animation loop
function animate() {
    // Clear canvas hoàn toàn để không bị giật
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vẽ các hạt tạo trái tim
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Vẽ các hạt bay quanh trái tim
    floatingParticles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Vẽ các hạt bay vòng quanh như xích đạo
    orbitParticles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Vẽ và cập nhật các trái tim từ click chuột
    clickHearts = clickHearts.filter(heart => !heart.isDead);
    clickHearts.forEach(heart => {
        heart.update();
        heart.draw();
    });

    if (isAnimating) {
        animationId = requestAnimationFrame(animate);
    }
}

// Bắt đầu animation
function startAnimation() {
    if (!isAnimating) {
        isAnimating = true;
        createHeartParticles();
        animate();
    }
}

// Dừng animation
function stopAnimation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// Reset animation
function resetAnimation() {
    stopAnimation();
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles = [];
    floatingParticles = [];
    orbitParticles = [];
    clickHearts = [];
}

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

    // Thiết lập canvas
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (isAnimating) {
            resetAnimation();
            startAnimation();
        }
    });

    // Vẽ nền ban đầu
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Event listeners cho các nút
    const playBtn = document.getElementById('playBtn');
    const resetBtn = document.getElementById('resetBtn');

    playBtn.addEventListener('click', () => {
        if (!isAnimating) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i> Tạm dừng';
            startAnimation();
        } else {
            playBtn.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
            stopAnimation();
        }
    });

    resetBtn.addEventListener('click', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i> Bắt đầu';
        resetAnimation();
    });

    // Logout
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

    // Tự động bắt đầu sau 1 giây
    setTimeout(() => {
        playBtn.click();
    }, 1000);

    // Xử lý click chuột trên canvas
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Tạo trái tim tại vị trí click
        clickHearts.push(new ClickHeart(x, y));
    });

    // Xử lý touch cho mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Tạo trái tim tại vị trí touch
        clickHearts.push(new ClickHeart(x, y));
    });
});

