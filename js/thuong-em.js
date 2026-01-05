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

// Biến lưu trữ dữ liệu điểm danh và cột mốc
let attendanceData = {};
let milestoneData = {};

// Biến lưu trữ quyền của user hiện tại
let currentUserPermissions = {
    canEdit: false,
    isAdmin: false
};

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

// Check if user has edit permission (always returns Promise)
async function checkEditPermission() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        currentUserPermissions.canEdit = false;
        currentUserPermissions.isAdmin = false;
        return false;
    }

    // Admin luôn có quyền chỉnh sửa
    if (currentUser.username === 'admin') {
        currentUserPermissions.isAdmin = true;
        currentUserPermissions.canEdit = true;
        return true;
    }

    // Kiểm tra trong database xem user có được phân quyền không
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
    const canEdit = currentUserPermissions.canEdit;

    // Ẩn/hiện các nút chỉnh sửa
    const editButtons = document.querySelectorAll('.add-milestone-btn, .add-image-btn, .timeline-action-btn, .delete-btn, .image-caption-edit');

    editButtons.forEach(btn => {
        if (canEdit) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });

    // Disable các input nếu không có quyền
    const inputs = document.querySelectorAll('.milestone-input, .milestone-textarea, #milestoneImageInput, #imageInput');
    inputs.forEach(input => {
        input.disabled = !canEdit;
    });
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

// Tạo hiệu ứng trái tim bay
function createFloatingHearts() {
    const container = document.getElementById('floatingHearts');

    setInterval(() => {
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart floating-heart';
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDuration = (Math.random() * 5 + 5) + 's';
        heart.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';

        container.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, 10000);
    }, 2000);
}

// Load gallery images (SHARED - all users see the same content)
function loadGalleryImages() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Changed to shared path instead of user-specific
    const galleryRef = ref(db, 'shared/foryou/gallery');

    onValue(galleryRef, (snapshot) => {
        const galleryGrid = document.getElementById('galleryGrid');
        const placeholder = document.getElementById('galleryPlaceholder');

        if (!galleryGrid) return;

        const images = snapshot.val();

        if (images && Object.keys(images).length > 0) {
            // Ẩn placeholder
            if (placeholder) {
                placeholder.style.display = 'none';
            }

            // Xóa các hình ảnh cũ (trừ placeholder)
            const oldItems = galleryGrid.querySelectorAll('.gallery-item');
            oldItems.forEach(item => item.remove());

            // Thêm hình ảnh mới
            Object.entries(images).forEach(([key, imageData]) => {
                const item = createGalleryItem(key, imageData);
                galleryGrid.appendChild(item);
            });
        } else {
            // Hiện placeholder nếu không có hình
            if (placeholder) {
                placeholder.style.display = 'flex';
            }

            // Xóa tất cả gallery items
            const oldItems = galleryGrid.querySelectorAll('.gallery-item');
            oldItems.forEach(item => item.remove());
        }

        // Update UI based on permissions after loading
        updateUIBasedOnPermissions();
    });
}

// Create gallery item element
function createGalleryItem(key, imageData) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    // Create image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'gallery-item-image-wrapper';

    const img = document.createElement('img');
    img.src = imageData.data || imageData.url; // Support both base64 and URL
    img.alt = imageData.filename || 'Kỷ niệm';
    img.loading = 'lazy';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteImage(key);
    };

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(deleteBtn);
    item.appendChild(imageWrapper);

    // Add caption bubble if caption exists
    if (imageData.caption && imageData.caption.trim()) {
        const captionBubble = document.createElement('div');
        captionBubble.className = 'gallery-item-caption-bubble';
        captionBubble.textContent = imageData.caption;
        captionBubble.title = imageData.caption; // Show full caption on hover
        item.appendChild(captionBubble);
    }

    // Click to view full image with caption and ability to edit
    item.addEventListener('click', () => {
        showImageViewer(imageData.data || imageData.url, imageData.caption || '', key);
    });

    return item;
}

// Show image viewer modal
function showImageViewer(imageUrl, caption = '', imageKey = null) {
    // Create modal if not exists
    let modal = document.querySelector('.image-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-viewer-content">
                <button class="image-viewer-close">
                    <i class="fas fa-times"></i>
                </button>
                <img src="" alt="Xem ảnh">
                <div class="image-caption">
                    <span class="image-caption-text"></span>
                    <button class="image-caption-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on click outside or close button
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.image-viewer-close')) {
                modal.classList.remove('active');
            }
        });
    }

    const img = modal.querySelector('img');
    const captionDiv = modal.querySelector('.image-caption');
    const captionText = modal.querySelector('.image-caption-text');
    const editBtn = modal.querySelector('.image-caption-edit');

    img.src = imageUrl;

    // Store current caption in a variable that can be updated
    let currentCaption = caption;

    // Update caption display
    const updateCaptionDisplay = (newCaption) => {
        const text = modal.querySelector('.image-caption-text');
        const div = modal.querySelector('.image-caption');

        if (newCaption && newCaption.trim()) {
            text.textContent = newCaption;
            div.classList.remove('no-caption');
            div.style.display = 'block';
        } else {
            text.textContent = 'Click để thêm ghi chú...';
            div.classList.add('no-caption');
            div.style.display = 'block';
        }
    };

    updateCaptionDisplay(currentCaption);

    // Handle edit caption
    const handleEditCaption = async (e) => {
        e.stopPropagation();

        if (!imageKey) {
            showToast('Không thể chỉnh sửa ghi chú!', 'error');
            return;
        }

        // Check permission
        if (!currentUserPermissions.canEdit) {
            showToast('Bạn không có quyền chỉnh sửa ghi chú!', 'error');
            return;
        }

        const result = await showCaptionModal(imageUrl, currentCaption, true);

        if (result.saved) {
            // Update caption in SHARED database with editor info
            const currentUser = getCurrentUser();
            if (currentUser) {
                const imageRef = ref(db, `shared/foryou/gallery/${imageKey}`);
                const snapshot = await get(imageRef);
                const imageData = snapshot.val();

                await set(imageRef, {
                    ...imageData,
                    caption: result.caption,
                    lastEditedBy: {
                        uid: currentUser.uid,
                        username: currentUser.username || currentUser.email || 'Unknown',
                        displayName: currentUser.displayName || currentUser.username || currentUser.email || 'Unknown',
                        editedAt: Date.now()
                    }
                });

                // Update current caption and display immediately
                currentCaption = result.caption;
                updateCaptionDisplay(currentCaption);
                showToast('Đã cập nhật ghi chú! 💖', 'success');
            }
        }
    };

    // Remove old event listeners by cloning
    const newCaptionDiv = captionDiv.cloneNode(true);
    captionDiv.parentNode.replaceChild(newCaptionDiv, captionDiv);

    // Add event listeners to the new elements
    const finalCaptionDiv = modal.querySelector('.image-caption');
    const finalEditBtn = modal.querySelector('.image-caption-edit');

    finalEditBtn.addEventListener('click', handleEditCaption);
    finalCaptionDiv.addEventListener('click', handleEditCaption);

    modal.classList.add('active');
}

// Convert image to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Nén ảnh để giảm dung lượng trước khi lưu vào DB
async function compressImage(base64Str, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

// Show caption modal for image
function showCaptionModal(imageData, existingCaption = '', isEdit = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('captionModal');
        const preview = document.getElementById('captionPreview');
        const input = document.getElementById('captionInput');
        const charCount = document.getElementById('captionCharCount');
        const saveBtn = document.getElementById('captionSaveBtn');
        const skipBtn = document.getElementById('captionSkipBtn');
        const modalTitle = modal.querySelector('h3');

        // Update title based on mode
        if (isEdit) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa ghi chú';
            skipBtn.innerHTML = '<i class="fas fa-times"></i> Hủy';
        } else {
            modalTitle.innerHTML = '<i class="fas fa-pen"></i> Thêm ghi chú cho ảnh';
            skipBtn.innerHTML = '<i class="fas fa-forward"></i> Bỏ qua';
        }

        // Show preview
        preview.innerHTML = `<img src="${imageData}" alt="Preview">`;
        input.value = existingCaption;
        charCount.textContent = existingCaption.length.toString();

        // Show modal
        modal.classList.add('active');
        input.focus();

        // Select all text if editing
        if (isEdit && existingCaption) {
            input.select();
        }

        // Update character count
        const updateCount = () => {
            charCount.textContent = input.value.length;
        };
        input.addEventListener('input', updateCount);

        // Handle save
        const handleSave = () => {
            const caption = input.value.trim();
            cleanup();
            resolve({ saved: true, caption });
        };

        // Handle skip/cancel
        const handleSkip = () => {
            cleanup();
            resolve({ saved: false, caption: existingCaption });
        };

        // Cleanup function
        const cleanup = () => {
            modal.classList.remove('active');
            input.removeEventListener('input', updateCount);
            saveBtn.removeEventListener('click', handleSave);
            skipBtn.removeEventListener('click', handleSkip);
        };

        // Add event listeners
        saveBtn.addEventListener('click', handleSave);
        skipBtn.addEventListener('click', handleSkip);

        // Enter to save
        const handleKeydown = (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                handleSave();
            } else if (e.key === 'Escape') {
                handleSkip();
            }
        };
        input.addEventListener('keydown', handleKeydown);
    });
}

// Upload images (using base64 instead of Storage)
async function uploadImages(files) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('No current user');
        showToast('Vui lòng đăng nhập để upload hình ảnh!', 'error');
        return;
    }

    // Check permission
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền thêm hình ảnh!', 'error');
        return;
    }

    console.log('Uploading', files.length, 'files...');

    // Process files one by one to get captions
    let successCount = 0;

    for (const file of files) {
        try {
            console.log('Processing file:', file.name);

            // Tăng giới hạn lên 10MB
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} quá lớn (tối đa 10MB)`, 'error');
                continue;
            }

            // Convert to base64
            console.log('Converting to base64...');
            let base64 = await fileToBase64(file);
            
            // Nén ảnh nếu dung lượng gốc lớn
            if (file.size > 500 * 1024) {
                console.log('Compressing image...');
                base64 = await compressImage(base64);
            }
            console.log('Processing complete');

            // Show caption modal
            const result = await showCaptionModal(base64);
            console.log('Caption result:', result);

            // Save to SHARED database with user info
            const timestamp = Date.now();
            const galleryRef = ref(db, 'shared/foryou/gallery');
            const newImageRef = push(galleryRef);
            await set(newImageRef, {
                data: base64,
                filename: file.name,
                caption: result.caption,
                uploadedAt: timestamp,
                uploadedBy: {
                    uid: currentUser.uid,
                    username: currentUser.username || currentUser.email || 'Unknown',
                    displayName: currentUser.displayName || currentUser.username || currentUser.email || 'Unknown'
                }
            });

            console.log('Saved to database');
            successCount++;
        } catch (error) {
            console.error('Error uploading image:', error);
            console.error('Error details:', error.code, error.message);
            showToast('Lỗi khi tải ảnh lên: ' + error.message, 'error');
        }
    }

    console.log('Upload results:', successCount, 'successful out of', files.length);

    if (successCount > 0) {
        showToast(`Đã thêm ${successCount} hình ảnh vào kỷ niệm! 💖`, 'success');
    }
}

// Delete image
async function deleteImage(key) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Check permission
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền xóa hình ảnh!', 'error');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa hình ảnh này?')) {
        return;
    }

    try {
        // Delete from SHARED database
        const imageRef = ref(db, `shared/foryou/gallery/${key}`);
        await remove(imageRef);

        showToast('Đã xóa hình ảnh!', 'success');
    } catch (error) {
        console.error('Error deleting image:', error);
        showToast('Lỗi khi xóa hình ảnh: ' + error.message, 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast container if not exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        margin-bottom: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }

    updateUIOnAuth();
    loadAttendanceData();
    loadGalleryImages();
    createFloatingHearts();

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

    // Add image button
    const addImageBtn = document.getElementById('addImageBtn');
    const imageInput = document.getElementById('imageInput');

    console.log('Add image button:', addImageBtn);
    console.log('Image input:', imageInput);

    if (addImageBtn && imageInput) {
        addImageBtn.addEventListener('click', () => {
            console.log('Add image button clicked');
            imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            console.log('File input changed');
            const files = e.target.files;
            console.log('Selected files:', files);
            if (files && files.length > 0) {
                console.log('Calling uploadImages with', files.length, 'files');
                uploadImages(files);
                // Reset input
                e.target.value = '';
            }
        });
    } else {
        console.error('Add image button or input not found!');
    }

    // Check permissions and initialize
    checkEditPermission().then(() => {
        updateUIBasedOnPermissions();

        // Initialize timeline
        loadTimeline();
        initTimelineModal();
    }).catch(error => {
        console.error('Error checking permissions:', error);
        // Still initialize even if permission check fails
        updateUIBasedOnPermissions();
        loadTimeline();
        initTimelineModal();
    });
});

// ==================== TIMELINE FUNCTIONS ====================

let currentEditingMilestoneKey = null;
let currentMilestoneImage = null;

// Load timeline from database (SHARED - all users see the same content)
function loadTimeline() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Changed to shared path
    const timelineRef = ref(db, 'shared/foryou/timeline');

    onValue(timelineRef, (snapshot) => {
        const timeline = document.getElementById('timeline');
        const placeholder = document.getElementById('timelinePlaceholder');

        if (!timeline) return;

        const milestones = snapshot.val();

        if (milestones && Object.keys(milestones).length > 0) {
            if (placeholder) {
                placeholder.style.display = 'none';
            }

            // Clear old items
            const oldItems = timeline.querySelectorAll('.timeline-phase, .timeline-item');
            oldItems.forEach(item => item.remove());

            // Group by phase
            const phases = {};
            Object.entries(milestones).forEach(([key, data]) => {
                const phase = data.phase || 'Chưa phân loại';
                if (!phases[phase]) {
                    phases[phase] = [];
                }
                phases[phase].push({ key, ...data });
            });

            // Sort phases and items
            Object.keys(phases).forEach(phaseName => {
                // Sort items by date (newest first)
                phases[phaseName].sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

                // Create phase header
                const phaseDiv = document.createElement('div');
                phaseDiv.className = 'timeline-phase';
                phaseDiv.innerHTML = `
                    <div class="timeline-phase-header">
                        <i class="fas fa-layer-group"></i> ${phaseName}
                    </div>
                `;
                timeline.appendChild(phaseDiv);

                // Create items for this phase
                phases[phaseName].forEach(milestone => {
                    const item = createTimelineItem(milestone.key, milestone);
                    timeline.appendChild(item);
                });
            });
        } else {
            if (placeholder) {
                placeholder.style.display = 'block';
            }

            const oldItems = timeline.querySelectorAll('.timeline-phase, .timeline-item');
            oldItems.forEach(item => item.remove());
        }

        // Update UI based on permissions after loading
        updateUIBasedOnPermissions();
    });
}

// Create timeline item element
function createTimelineItem(key, data) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const date = data.date ? new Date(data.date).toLocaleDateString('vi-VN') : 'Chưa có ngày';

    item.innerHTML = `
        <div class="timeline-item-header">
            <div class="timeline-date">
                <i class="fas fa-calendar-alt"></i>
                <span>${date}</span>
            </div>
            <div class="timeline-item-actions">
                <button class="timeline-action-btn edit" data-key="${key}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="timeline-action-btn delete" data-key="${key}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="timeline-content">
            <h4>${data.title || 'Không có tiêu đề'}</h4>
            ${data.description ? `<p>${data.description}</p>` : ''}
            ${data.image ? `
                <div class="timeline-item-image">
                    <img src="${data.image}" alt="${data.title}">
                </div>
            ` : ''}
        </div>
    `;

    // Add event listeners
    const editBtn = item.querySelector('.edit');
    const deleteBtn = item.querySelector('.delete');

    editBtn.addEventListener('click', () => editMilestone(key, data));
    deleteBtn.addEventListener('click', () => deleteMilestone(key));

    // Add click event for image
    if (data.image) {
        const img = item.querySelector('.timeline-item-image img');
        if (img) {
            img.addEventListener('click', () => {
                showImageViewer(data.image, data.title || '', null);
            });
        }
    }

    return item;
}

// Initialize timeline modal
function initTimelineModal() {
    const modal = document.getElementById('milestoneModal');
    const addBtn = document.getElementById('addMilestoneBtn');
    const closeBtn = document.getElementById('milestoneModalClose');
    const cancelBtn = document.getElementById('milestoneCancelBtn');
    const saveBtn = document.getElementById('milestoneSaveBtn');
    const imageBtn = document.getElementById('milestoneImageBtn');
    const imageInput = document.getElementById('milestoneImageInput');
    const descInput = document.getElementById('milestoneDescription');
    const charCount = document.getElementById('milestoneDescCharCount');

    if (!modal) return;

    // Open modal
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            console.log('Add milestone button clicked');
            currentEditingMilestoneKey = null;
            currentMilestoneImage = null;
            openMilestoneModal();
        });
    } else {
        console.error('Add milestone button not found!');
    }

    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
        resetMilestoneForm();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Image upload
    if (imageBtn && imageInput) {
        imageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleMilestoneImageUpload);
    }

    // Character count
    if (descInput && charCount) {
        descInput.addEventListener('input', () => {
            charCount.textContent = descInput.value.length;
        });
    }

    // Save milestone
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMilestone);
    }

    // Load existing phases for dropdown
    loadPhaseOptions();
}

// Open milestone modal
function openMilestoneModal(isEdit = false) {
    console.log('Opening milestone modal, isEdit:', isEdit);
    const modal = document.getElementById('milestoneModal');
    const title = document.getElementById('milestoneModalTitle');

    if (!modal) {
        console.error('Milestone modal not found!');
        return;
    }

    if (title) {
        title.textContent = isEdit ? 'Chỉnh sửa khoảnh khắc' : 'Thêm khoảnh khắc đặc biệt';
    }

    modal.classList.add('active');
    console.log('Modal opened successfully');
}

// Reset milestone form
function resetMilestoneForm() {
    document.getElementById('milestonePhase').value = '';
    document.getElementById('milestoneNewPhase').value = '';
    document.getElementById('milestoneDate').value = '';
    document.getElementById('milestoneTitle').value = '';
    document.getElementById('milestoneDescription').value = '';
    document.getElementById('milestoneDescCharCount').textContent = '0';

    const preview = document.getElementById('milestoneImagePreview');
    preview.innerHTML = '';
    preview.classList.remove('active');

    currentEditingMilestoneKey = null;
    currentMilestoneImage = null;
}

// Load phase options
function loadPhaseOptions() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        // Changed to shared path
        const timelineRef = ref(db, 'shared/foryou/timeline');

        onValue(timelineRef, (snapshot) => {
            const select = document.getElementById('milestonePhase');
            if (!select) return;

            const milestones = snapshot.val();
            const phases = new Set();

            if (milestones) {
                Object.values(milestones).forEach(data => {
                    if (data.phase) {
                        phases.add(data.phase);
                    }
                });
            }

            // Clear and rebuild options
            select.innerHTML = '<option value="">-- Chọn hoặc tạo giai đoạn mới --</option>';
            phases.forEach(phase => {
                const option = document.createElement('option');
                option.value = phase;
                option.textContent = phase;
                select.appendChild(option);
            });
        }, {
            onlyOnce: false
        });
    } catch (error) {
        console.error('Error loading phase options:', error);
    }
}

// Handle milestone image upload
async function handleMilestoneImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Tăng giới hạn lên 10MB
    if (file.size > 10 * 1024 * 1024) {
        showToast('Hình ảnh quá lớn (tối đa 10MB)', 'error');
        return;
    }

    try {
        let base64 = await fileToBase64(file);
        
        // Nén ảnh nếu cần
        if (file.size > 500 * 1024) {
            base64 = await compressImage(base64);
        }
        
        currentMilestoneImage = base64;

        // Show preview
        const preview = document.getElementById('milestoneImagePreview');
        preview.innerHTML = `
            <img src="${base64}" alt="Preview">
            <button class="milestone-image-remove" onclick="removeMilestoneImage()">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.classList.add('active');
    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Lỗi khi tải ảnh lên!', 'error');
    }
}

// Remove milestone image
window.removeMilestoneImage = function() {
    currentMilestoneImage = null;
    const preview = document.getElementById('milestoneImagePreview');
    preview.innerHTML = '';
    preview.classList.remove('active');
    document.getElementById('milestoneImageInput').value = '';
};

// Save milestone
async function saveMilestone() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        return;
    }

    // Check permission
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền thêm/sửa khoảnh khắc!', 'error');
        return;
    }

    // Get form values
    const phaseSelect = document.getElementById('milestonePhase').value;
    const phaseNew = document.getElementById('milestoneNewPhase').value.trim();
    const date = document.getElementById('milestoneDate').value;
    const title = document.getElementById('milestoneTitle').value.trim();
    const description = document.getElementById('milestoneDescription').value.trim();

    // Validation
    if (!date) {
        showToast('Vui lòng chọn ngày tháng!', 'error');
        return;
    }

    if (!title) {
        showToast('Vui lòng nhập tiêu đề!', 'error');
        return;
    }

    const phase = phaseNew || phaseSelect || 'Chưa phân loại';

    try {
        const milestoneData = {
            phase,
            date,
            title,
            description,
            image: currentMilestoneImage || '',
            createdAt: Date.now()
        };

        // Changed to shared path
        const timelineRef = ref(db, 'shared/foryou/timeline');

        if (currentEditingMilestoneKey) {
            // Update existing with editor info
            const milestoneRef = ref(db, `shared/foryou/timeline/${currentEditingMilestoneKey}`);
            await set(milestoneRef, {
                ...milestoneData,
                lastEditedBy: {
                    uid: currentUser.uid,
                    username: currentUser.username || currentUser.email || 'Unknown',
                    displayName: currentUser.displayName || currentUser.username || currentUser.email || 'Unknown',
                    editedAt: Date.now()
                }
            });
            showToast('Đã cập nhật khoảnh khắc! 💖', 'success');
        } else {
            // Create new with creator info
            const newMilestoneRef = push(timelineRef);
            await set(newMilestoneRef, {
                ...milestoneData,
                createdBy: {
                    uid: currentUser.uid,
                    username: currentUser.username || currentUser.email || 'Unknown',
                    displayName: currentUser.displayName || currentUser.username || currentUser.email || 'Unknown'
                }
            });
            showToast('Đã thêm khoảnh khắc mới! ✨', 'success');
        }

        // Close modal
        document.getElementById('milestoneModal').classList.remove('active');
        resetMilestoneForm();
    } catch (error) {
        console.error('Error saving milestone:', error);
        showToast('Lỗi khi lưu khoảnh khắc!', 'error');
    }
}

// Edit milestone
function editMilestone(key, data) {
    currentEditingMilestoneKey = key;
    currentMilestoneImage = data.image || null;

    // Fill form
    document.getElementById('milestonePhase').value = data.phase || '';
    document.getElementById('milestoneNewPhase').value = '';
    document.getElementById('milestoneDate').value = data.date || '';
    document.getElementById('milestoneTitle').value = data.title || '';
    document.getElementById('milestoneDescription').value = data.description || '';
    document.getElementById('milestoneDescCharCount').textContent = (data.description || '').length;

    // Show image preview if exists
    if (data.image) {
        const preview = document.getElementById('milestoneImagePreview');
        preview.innerHTML = `
            <img src="${data.image}" alt="Preview">
            <button class="milestone-image-remove" onclick="removeMilestoneImage()">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.classList.add('active');
    }

    openMilestoneModal(true);
}

// Delete milestone
async function deleteMilestone(key) {
    // Check permission
    if (!currentUserPermissions.canEdit) {
        showToast('Bạn không có quyền xóa khoảnh khắc!', 'error');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa khoảnh khắc này?')) {
        return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        // Delete from SHARED database
        const milestoneRef = ref(db, `shared/foryou/timeline/${key}`);
        await remove(milestoneRef);
        showToast('Đã xóa khoảnh khắc!', 'success');
    } catch (error) {
        console.error('Error deleting milestone:', error);
        showToast('Lỗi khi xóa khoảnh khắc!', 'error');
    }
}

