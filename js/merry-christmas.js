// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

// Current user permissions
let currentUserPermissions = {
    canEdit: false,
    isAdmin: false
};

let currentEditingWishKey = null;
let currentSlideIndex = 0;
let wishesArray = [];
let isCardOpened = false;

// Check auth
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Check edit permission
async function checkEditPermission() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        currentUserPermissions.canEdit = false;
        currentUserPermissions.isAdmin = false;
        return false;
    }

    if (currentUser.username === 'admin') {
        currentUserPermissions.isAdmin = true;
        currentUserPermissions.canEdit = true;
        return true;
    }

    return new Promise((resolve) => {
        const permissionRef = ref(db, `permissions/${currentUser.uid}`);
        onValue(permissionRef, (snapshot) => {
            const permission = snapshot.val();
            if (permission && permission.canEdit) {
                currentUserPermissions.canEdit = true;
                resolve(true);
            } else {
                currentUserPermissions.canEdit = false;
                resolve(false);
            }
        }, { onlyOnce: true });
    });
}

// Update UI based on permissions
function updateUIBasedOnPermissions() {
    const addWishBtn = document.getElementById('addWishBtn');
    if (currentUserPermissions.canEdit) {
        addWishBtn.style.display = '';
    } else {
        addWishBtn.style.display = 'none';
    }
}

// Show admin link
function showAdminLink() {
    const currentUser = getCurrentUser();
    if (currentUser && (currentUser.username === 'admin' || currentUser.username === 'thaonguyen')) {
        const adminWishesLink = document.getElementById('adminWishesLink');
        if (adminWishesLink) {
            adminWishesLink.style.display = 'inline-flex';
        }
    }
}

// Update UI on auth
function updateUIOnAuth() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('usernameDisplay').textContent = currentUser.displayName || currentUser.username;
    }
}

// Show toast
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
    document.body.appendChild(container);
    return container;
}

// Load wishes
function loadWishes() {
    const wishesRef = ref(db, 'shared/christmas/wishes');

    onValue(wishesRef, (snapshot) => {
        const wishes = snapshot.val();

        if (!wishes) {
            wishesArray = [];
            renderCarousel();
            return;
        }

        // Convert to array and sort by creation time
        wishesArray = Object.entries(wishes).map(([key, wish]) => ({
            key,
            ...wish
        })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        renderCarousel();
    });
}

// Render carousel
function renderCarousel() {
    const carouselTrack = document.getElementById('carouselTrack');
    const indicators = document.getElementById('carouselIndicators');

    carouselTrack.innerHTML = '';
    indicators.innerHTML = '';

    if (wishesArray.length === 0) {
        carouselTrack.innerHTML = `
            <div class="wish-slide loading">
                <p style="text-align: center; color: rgba(255,255,255,0.6);">
                    Chưa có lời chúc nào. ${currentUserPermissions.canEdit ? 'Hãy thêm lời chúc đầu tiên! 🎄' : ''}
                </p>
            </div>
        `;
        return;
    }

    // Create slides for wishes
    wishesArray.forEach((wish, index) => {
        const slide = createWishSlide(wish, index);

        // Don't add active class here - let openCard() or updateCarousel() handle it

        carouselTrack.appendChild(slide);

        // Create indicator dot
        const dot = document.createElement('div');
        dot.className = `indicator-dot ${index === currentSlideIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(index));
        indicators.appendChild(dot);
    });

    // Add "Điều ước" slide at the end
    const wishFormSlide = createWishFormSlide();

    // Don't add active class here - let openCard() or updateCarousel() handle it

    carouselTrack.appendChild(wishFormSlide);

    // Add indicator for wish form slide
    const wishFormDot = document.createElement('div');
    wishFormDot.className = `indicator-dot ${wishesArray.length === currentSlideIndex ? 'active' : ''}`;
    wishFormDot.addEventListener('click', () => goToSlide(wishesArray.length));
    indicators.appendChild(wishFormDot);

    // Skip animation on initial render (card not opened yet)
    updateCarousel(true);
}

// Create wish slide
function createWishSlide(wish, index) {
    const slide = document.createElement('div');
    slide.className = 'wish-slide';

    const icon = wish.icon || '🎄';
    const isFA = icon.startsWith('fa-');

    slide.innerHTML = `
        <div class="wish-slide-content">
            <div class="wish-slide-icon">${isFA ? `<i class="fas ${icon}"></i>` : icon}</div>
            <h3 class="wish-slide-title">${wish.title || 'Lời chúc'}</h3>
            <p class="wish-slide-text">${wish.content || ''}</p>
            ${currentUserPermissions.canEdit ? `
                <div class="wish-slide-actions">
                    <button class="wish-action-btn" onclick="editWish('${wish.key}')">
                        <i class="fas fa-edit"></i> Chỉnh sửa
                    </button>
                    <button class="wish-action-btn delete" onclick="deleteWish('${wish.key}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    return slide;
}

// Create wish form slide
function createWishFormSlide() {
    const slide = document.createElement('div');
    slide.className = 'wish-slide wish-form-slide';

    const currentUser = getCurrentUser();
    const userName = currentUser ? (currentUser.displayName || currentUser.username || '') : '';

    slide.innerHTML = `
        <div class="wish-slide-content">
            <div class="wish-slide-icon">⭐</div>
            <h3 class="wish-slide-title">Điều ước đêm Noel</h3>
            <p class="wish-form-subtitle">Hãy gửi điều ước của bạn đến ông già Noel 🎅</p>
            <p class="wish-form-subtitle">(Thật ra chạ có ông già Noel nào ở đây hết, chỉ có anh hoi)</p>

            <form id="christmasWishForm" class="christmas-wish-form-inline">
                <div class="form-group-inline">
                    <label for="wishName">
                        <i class="fas fa-user"></i> Tên của bạn
                    </label>
                    <input
                        type="text"
                        id="wishName"
                        placeholder="Nhập tên của bạn..."
                        value="${userName}"
                        required
                    >
                </div>

                <div class="form-group-inline">
                    <label for="userWishContent">
                        <i class="fas fa-star"></i> Điều ước của bạn
                    </label>
                    <textarea
                        id="userWishContent"
                        rows="4"
                        placeholder="Hãy viết điều ước của bạn cho đêm Noel này..."
                        required
                        maxlength="500"
                    ></textarea>
                    <div class="char-counter-inline">
                        <span id="wishCharCounter">0</span>/500
                    </div>
                </div>

                <button type="submit" class="submit-wish-btn-inline">
                    <i class="fas fa-paper-plane"></i> Gửi điều ước
                </button>
            </form>
        </div>
    `;

    return slide;
}

// Update carousel position
function updateCarousel(skipAnimation = false) {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevWish');
    const nextBtn = document.getElementById('nextWish');
    const dots = document.querySelectorAll('.indicator-dot');
    const slides = document.querySelectorAll('.wish-slide');

    // Total slides = wishes + 1 (wish form slide)
    const totalSlides = wishesArray.length + 1;

    // Remove active class from all slides
    slides.forEach(slide => {
        slide.classList.remove('active');
    });

    // Update transform
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

    // Add active class to current slide after carousel transition completes
    // Skip animation on initial render (when card is not opened yet)
    if (!skipAnimation && isCardOpened) {
        setTimeout(() => {
            if (slides[currentSlideIndex]) {
                slides[currentSlideIndex].classList.add('active');
            }
        }, 200); // Wait for carousel slide transition
    }

    // Update buttons
    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === totalSlides - 1;

    // Update dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlideIndex);
    });

    // Setup form event listeners if on wish form slide
    if (currentSlideIndex === wishesArray.length) {
        setupWishFormListeners();
    }
}

// Go to specific slide
function goToSlide(index) {
    const totalSlides = wishesArray.length + 1;
    if (index >= 0 && index < totalSlides) {
        currentSlideIndex = index;
        updateCarousel();
    }
}

// Next slide
function nextSlide() {
    const totalSlides = wishesArray.length + 1;
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        updateCarousel();
    }
}

// Previous slide
function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updateCarousel();
    }
}

// Open card with animation
function openCard() {
    const cardWrapper = document.getElementById('cardWrapper');
    cardWrapper.classList.add('opened');
    isCardOpened = true;

    // Trigger animation for first slide after card opens
    setTimeout(() => {
        const slides = document.querySelectorAll('.wish-slide');
        if (slides[currentSlideIndex]) {
            slides[currentSlideIndex].classList.add('active');
        }
    }, 700); // Wait for card open animation (600ms) + small buffer
}

// Close card and return to cover
function closeCard() {
    const cardWrapper = document.getElementById('cardWrapper');
    cardWrapper.classList.remove('opened');
    isCardOpened = false;

    // Reset to first slide
    currentSlideIndex = 0;
    updateCarousel();
}

// Setup wish form listeners
function setupWishFormListeners() {
    const wishForm = document.getElementById('christmasWishForm');
    const userWishContentInput = document.getElementById('userWishContent');
    const wishCharCounter = document.getElementById('wishCharCounter');

    if (!wishForm || wishForm.dataset.listenerAdded) return;

    // Mark as listener added
    wishForm.dataset.listenerAdded = 'true';

    // Character counter
    if (userWishContentInput && wishCharCounter) {
        userWishContentInput.addEventListener('input', () => {
            const length = userWishContentInput.value.length;
            wishCharCounter.textContent = length;

            if (length >= 450) {
                wishCharCounter.style.color = '#e74c3c';
            } else {
                wishCharCounter.style.color = '#718096';
            }
        });
    }

    // Submit wish
    wishForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const wishNameInput = document.getElementById('wishName');
        const name = wishNameInput.value.trim();
        const content = userWishContentInput.value.trim();

        if (!name || !content) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        const currentUser = getCurrentUser();
        const wishData = {
            name: name,
            content: content,
            createdAt: Date.now(),
            createdBy: currentUser ? {
                uid: currentUser.uid,
                username: currentUser.username
            } : null
        };

        try {
            // Disable submit button
            const submitBtn = wishForm.querySelector('.submit-wish-btn-inline');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

            // Create magical disappearing effect
            await createWishDisappearEffect(userWishContentInput, wishNameInput);

            await push(ref(db, 'shared/christmas/userWishes'), wishData);

            // Show success message with magic
            createMagicSuccessEffect();
            showToast('🎄 Điều ước của bạn đã được gửi đến ông già Noel! ✨', 'success');

            // Reset form
            userWishContentInput.value = '';
            wishCharCounter.textContent = '0';

            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi điều ước';

            // Go back to first slide after a delay
            setTimeout(() => {
                currentSlideIndex = 0;
                updateCarousel();
            }, 2000);
        } catch (error) {
            console.error('Error submitting wish:', error);
            showToast('Có lỗi xảy ra! Vui lòng thử lại.', 'error');

            // Re-enable button
            const submitBtn = wishForm.querySelector('.submit-wish-btn-inline');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi điều ước';
        }
    });
}

// Create magical wish disappear effect
function createWishDisappearEffect(textarea, nameInput) {
    return new Promise((resolve) => {
        const text = textarea.value;
        const name = nameInput.value;
        const rect = textarea.getBoundingClientRect();
        const nameRect = nameInput.getBoundingClientRect();

        // Create magic circle
        createMagicCircle(rect);

        // Animate textarea content
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = rect.left + 'px';
        container.style.top = rect.top + 'px';
        container.style.width = rect.width + 'px';
        container.style.height = rect.height + 'px';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '10000';
        container.style.overflow = 'visible';

        document.body.appendChild(container);

        // Split text into words
        const words = text.split(/\s+/);
        const wordsPerLine = Math.ceil(rect.width / 60);

        words.forEach((word, index) => {
            if (!word.trim()) return;

            const wordSpan = document.createElement('span');
            wordSpan.textContent = word + ' ';
            wordSpan.style.position = 'absolute';
            wordSpan.style.left = ((index % wordsPerLine) * (rect.width / wordsPerLine)) + 'px';
            wordSpan.style.top = (Math.floor(index / wordsPerLine) * 25) + 'px';
            wordSpan.style.color = '#d35d5d';
            wordSpan.style.fontWeight = '600';
            wordSpan.style.fontSize = '14px';
            wordSpan.style.whiteSpace = 'nowrap';
            wordSpan.style.opacity = '1';
            wordSpan.style.textShadow = '0 0 10px rgba(211, 93, 93, 0.5)';
            wordSpan.style.transition = 'all 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            container.appendChild(wordSpan);

            // Animate each word
            setTimeout(() => {
                const angle = (Math.random() - 0.5) * 90;
                const distance = 250 + Math.random() * 350;
                const rotation = (Math.random() - 0.5) * 1080;

                wordSpan.style.transform = `
                    translate(${Math.sin(angle * Math.PI / 180) * distance}px,
                              ${-Math.abs(Math.cos(angle * Math.PI / 180) * distance) - 200}px)
                    rotate(${rotation}deg)
                    scale(0.2)
                `;
                wordSpan.style.opacity = '0';
                wordSpan.style.filter = 'blur(3px)';
            }, index * 40);
        });

        // Animate name
        const nameContainer = document.createElement('div');
        nameContainer.textContent = name;
        nameContainer.style.position = 'fixed';
        nameContainer.style.left = nameRect.left + 'px';
        nameContainer.style.top = nameRect.top + 'px';
        nameContainer.style.color = '#d35d5d';
        nameContainer.style.fontWeight = '700';
        nameContainer.style.fontSize = '16px';
        nameContainer.style.pointerEvents = 'none';
        nameContainer.style.zIndex = '10000';
        nameContainer.style.textShadow = '0 0 15px rgba(211, 93, 93, 0.8)';
        nameContainer.style.transition = 'all 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        document.body.appendChild(nameContainer);

        setTimeout(() => {
            nameContainer.style.transform = 'translateY(-400px) scale(1.5) rotate(360deg)';
            nameContainer.style.opacity = '0';
            nameContainer.style.filter = 'blur(5px)';
        }, 200);

        // Create sparkles
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                createSparkle(
                    rect.left + Math.random() * rect.width,
                    rect.top + Math.random() * rect.height
                );
            }, i * 80);
        }

        // Hide original inputs temporarily
        textarea.style.opacity = '0';
        nameInput.style.opacity = '0';

        // Clean up
        setTimeout(() => {
            container.remove();
            nameContainer.remove();
            textarea.style.opacity = '1';
            nameInput.style.opacity = '1';
            resolve();
        }, 2200);
    });
}

// Create magic circle effect
function createMagicCircle(rect) {
    const circle = document.createElement('div');
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    circle.style.position = 'fixed';
    circle.style.left = centerX + 'px';
    circle.style.top = centerY + 'px';
    circle.style.width = '0px';
    circle.style.height = '0px';
    circle.style.border = '3px solid rgba(211, 93, 93, 0.6)';
    circle.style.borderRadius = '50%';
    circle.style.pointerEvents = 'none';
    circle.style.zIndex = '9999';
    circle.style.transform = 'translate(-50%, -50%)';
    circle.style.boxShadow = '0 0 20px rgba(211, 93, 93, 0.8), inset 0 0 20px rgba(211, 93, 93, 0.4)';
    circle.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    document.body.appendChild(circle);

    setTimeout(() => {
        circle.style.width = '400px';
        circle.style.height = '400px';
        circle.style.opacity = '0';
    }, 50);

    setTimeout(() => {
        circle.remove();
    }, 1600);
}

// Create sparkle effect
function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.textContent = ['✨', '⭐', '🌟', '💫', '⭐'][Math.floor(Math.random() * 5)];
    sparkle.style.position = 'fixed';
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    sparkle.style.fontSize = (15 + Math.random() * 20) + 'px';
    sparkle.style.pointerEvents = 'none';
    sparkle.style.zIndex = '10001';
    sparkle.style.opacity = '1';
    sparkle.style.filter = 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.8))';
    sparkle.style.transition = 'all 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    document.body.appendChild(sparkle);

    setTimeout(() => {
        const angle = Math.random() * 360;
        const distance = 150 + Math.random() * 250;

        sparkle.style.transform = `
            translate(${Math.cos(angle * Math.PI / 180) * distance}px,
                      ${Math.sin(angle * Math.PI / 180) * distance - 200}px)
            rotate(${Math.random() * 1080}deg)
            scale(0)
        `;
        sparkle.style.opacity = '0';
    }, 50);

    setTimeout(() => {
        sparkle.remove();
    }, 1900);
}

// Create magic success effect
function createMagicSuccessEffect() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Create big star burst
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * Math.PI / 180;
        const star = document.createElement('div');
        star.textContent = '⭐';
        star.style.position = 'fixed';
        star.style.left = centerX + 'px';
        star.style.top = centerY + 'px';
        star.style.fontSize = '30px';
        star.style.pointerEvents = 'none';
        star.style.zIndex = '10002';
        star.style.opacity = '1';
        star.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 1))';
        star.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        document.body.appendChild(star);

        setTimeout(() => {
            star.style.transform = `
                translate(${Math.cos(angle) * 300}px, ${Math.sin(angle) * 300}px)
                rotate(720deg)
                scale(0)
            `;
            star.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            star.remove();
        }, 1600);
    }

    // Create center glow
    const glow = document.createElement('div');
    glow.style.position = 'fixed';
    glow.style.left = centerX + 'px';
    glow.style.top = centerY + 'px';
    glow.style.width = '100px';
    glow.style.height = '100px';
    glow.style.background = 'radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(211, 93, 93, 0.4) 50%, transparent 100%)';
    glow.style.borderRadius = '50%';
    glow.style.transform = 'translate(-50%, -50%) scale(0)';
    glow.style.pointerEvents = 'none';
    glow.style.zIndex = '9998';
    glow.style.transition = 'all 1s ease-out';

    document.body.appendChild(glow);

    setTimeout(() => {
        glow.style.transform = 'translate(-50%, -50%) scale(5)';
        glow.style.opacity = '0';
    }, 50);

    setTimeout(() => {
        glow.remove();
    }, 1100);
}

// Open wish modal
function openWishModal(isEdit = false) {
    const modal = document.getElementById('wishModal');
    const title = document.getElementById('wishModalTitle');

    title.textContent = isEdit ? 'Chỉnh sửa lời chúc' : 'Thêm lời chúc';
    modal.classList.add('active');
}

// Close wish modal
function closeWishModal() {
    const modal = document.getElementById('wishModal');
    modal.classList.remove('active');
    resetWishForm();
}

// Reset wish form
function resetWishForm() {
    document.getElementById('wishTitle').value = '';
    document.getElementById('wishContent').value = '';
    document.getElementById('wishIcon').value = '🎄';
    document.getElementById('wishCharCount').textContent = '0';
    currentEditingWishKey = null;
}

// Save wish
async function saveWish() {
    const title = document.getElementById('wishTitle').value.trim();
    const content = document.getElementById('wishContent').value.trim();
    const icon = document.getElementById('wishIcon').value.trim();

    if (!title || !content) {
        showToast('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const wishData = {
        title,
        content,
        icon: icon || '🎄',
        createdBy: {
            uid: currentUser.uid,
            username: currentUser.username,
            displayName: currentUser.displayName || currentUser.username
        },
        createdAt: Date.now()
    };

    try {
        if (currentEditingWishKey) {
            // Update existing wish - keep original createdAt
            const originalWish = wishesArray.find(w => w.key === currentEditingWishKey);
            if (originalWish) {
                wishData.createdAt = originalWish.createdAt;
                wishData.createdBy = originalWish.createdBy;
            }

            wishData.lastEditedBy = {
                uid: currentUser.uid,
                username: currentUser.username,
                displayName: currentUser.displayName || currentUser.username,
                editedAt: Date.now()
            };
            await set(ref(db, `shared/christmas/wishes/${currentEditingWishKey}`), wishData);
            showToast('Đã cập nhật lời chúc!', 'success');
        } else {
            // Add new wish
            await push(ref(db, 'shared/christmas/wishes'), wishData);
            showToast('Đã thêm lời chúc!', 'success');

            // Go to last slide after adding
            setTimeout(() => {
                currentSlideIndex = wishesArray.length - 1;
                updateCarousel();
            }, 500);
        }

        closeWishModal();
    } catch (error) {
        console.error('Error saving wish:', error);
        showToast('Có lỗi xảy ra!', 'error');
    }
}

// Edit wish
window.editWish = async function(key) {
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền chỉnh sửa!', 'error');
        return;
    }

    const wishRef = ref(db, `shared/christmas/wishes/${key}`);
    const snapshot = await get(wishRef);
    const wish = snapshot.val();

    if (wish) {
        currentEditingWishKey = key;
        document.getElementById('wishTitle').value = wish.title || '';
        document.getElementById('wishContent').value = wish.content || '';
        document.getElementById('wishIcon').value = wish.icon || '🎄';
        document.getElementById('wishCharCount').textContent = (wish.content || '').length;
        openWishModal(true);
    }
};

// Delete wish
window.deleteWish = async function(key) {
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền xóa!', 'error');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa lời chúc này?')) {
        return;
    }

    try {
        await remove(ref(db, `shared/christmas/wishes/${key}`));
        showToast('Đã xóa lời chúc!', 'success');
    } catch (error) {
        console.error('Error deleting wish:', error);
        showToast('Có lỗi xảy ra!', 'error');
    }
};

// Document ready
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    updateUIOnAuth();

    // Show admin link immediately
    showAdminLink();

    // Check permissions
    await checkEditPermission();
    updateUIBasedOnPermissions();

    // Load wishes
    loadWishes();

    // Open card button
    const openCardBtn = document.getElementById('openCardBtn');
    const backToCoverBtn = document.getElementById('backToCoverBtn');

    openCardBtn.addEventListener('click', () => {
        openCard();
    });

    // Back to cover button
    backToCoverBtn.addEventListener('click', () => {
        closeCard();
    });

    // Carousel navigation buttons
    document.getElementById('prevWish').addEventListener('click', prevSlide);
    document.getElementById('nextWish').addEventListener('click', nextSlide);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!isCardOpened) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextSlide();
        }
    });

    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    const carousel = document.getElementById('wishesCarousel');

    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next slide
                nextSlide();
            } else {
                // Swipe right - prev slide
                prevSlide();
            }
        }
    }

    // Add wish button
    const addWishBtn = document.getElementById('addWishBtn');
    addWishBtn.addEventListener('click', () => {
        currentEditingWishKey = null;
        openWishModal();
    });

    // Modal controls
    document.getElementById('closeWishModal').addEventListener('click', closeWishModal);
    document.getElementById('cancelWishBtn').addEventListener('click', closeWishModal);
    document.getElementById('saveWishBtn').addEventListener('click', saveWish);

    // Close modal on backdrop click
    document.getElementById('wishModal').addEventListener('click', (e) => {
        if (e.target.id === 'wishModal') {
            closeWishModal();
        }
    });

    // Character count
    const wishContent = document.getElementById('wishContent');
    const charCount = document.getElementById('wishCharCount');

    wishContent.addEventListener('input', () => {
        const length = wishContent.value.length;
        charCount.textContent = length;

        if (length > 500) {
            wishContent.value = wishContent.value.substring(0, 500);
            charCount.textContent = '500';
        }
    });

    // Music toggle and auto-play
    const musicToggle = document.getElementById('musicToggle');
    const music = document.getElementById('christmasMusic');
    let isPlaying = false;

    // Auto-play music on page load
    const autoPlayMusic = async () => {
        try {
            music.volume = 0.5; // Set volume to 50%
            await music.play();
            isPlaying = true;
            musicToggle.classList.add('playing');
        } catch (error) {
            // Auto-play might be blocked by browser
            console.log('Auto-play blocked. User needs to interact first.');
            // Show a subtle hint
            musicToggle.style.animation = 'pulse 2s ease-in-out infinite';
        }
    };

    // Try to auto-play
    autoPlayMusic();

    // Also try to play on first user interaction
    const enableAudioOnInteraction = () => {
        if (!isPlaying) {
            music.play().then(() => {
                isPlaying = true;
                musicToggle.classList.add('playing');
                musicToggle.style.animation = '';
            }).catch(() => {});
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudioOnInteraction);
        document.removeEventListener('touchstart', enableAudioOnInteraction);
    };

    document.addEventListener('click', enableAudioOnInteraction);
    document.addEventListener('touchstart', enableAudioOnInteraction);

    // Manual toggle
    musicToggle.addEventListener('click', () => {
        if (isPlaying) {
            music.pause();
            musicToggle.classList.remove('playing');
        } else {
            music.play();
            musicToggle.classList.add('playing');
        }
        isPlaying = !isPlaying;
        musicToggle.style.animation = ''; // Remove pulse animation
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

