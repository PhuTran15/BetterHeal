// BetterHeal - Feelings Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update, get, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { checkAuth, getCurrentUser, updateUIOnAuth, logoutUser } from "./auth.js";

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
const db = getDatabase(app);

// Database references
const feelingsRef = ref(db, 'feelings');
const messagesRef = ref(db, 'supportMessages');
const notificationsRef = ref(db, 'notifications');
const conversationsRef = ref(db, 'conversations');

// Current user
let currentUser = null;

// Check if user is logged in
if (!checkAuth()) {
    window.location.href = 'login.html';
} else {
    currentUser = getCurrentUser();

    // Debug: Kiểm tra thông tin người dùng
    console.log('Current user:', currentUser);
}

// Update UI based on authentication state
document.addEventListener('DOMContentLoaded', () => {
    updateUIOnAuth();

    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Sử dụng trực tiếp Firebase Auth để đăng xuất
                const auth = getAuth();
                await signOut(auth);

                // Xóa thông tin người dùng khỏi localStorage
                localStorage.removeItem('currentUser');

                // Chuyển hướng đến trang đăng nhập
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Đăng xuất thất bại. Vui lòng thử lại.');
            }
        });
    }

    // Setup tabs
    setupTabs();

    // Đảm bảo tab "Tất cả nỗi lòng" được hiển thị khi trang được tải
    document.getElementById('all-feelings').style.display = 'block';

    // Setup form submission
    const feelingForm = document.getElementById('feelingForm');
    if (feelingForm) {
        feelingForm.addEventListener('submit', submitFeeling);
    }

    // Load feelings
    loadAllFeelings();
    loadMyFeelings();

    // Load notifications
    loadNotifications();

    // Setup message form submission and button actions
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('send-message-btn')) {
            const feelingId = e.target.getAttribute('data-feeling-id');
            const messageInput = document.getElementById(`message-${feelingId}`);

            if (messageInput && messageInput.value.trim()) {
                sendSupportMessage(feelingId, messageInput.value.trim());
                messageInput.value = '';
            }
        } else if (e.target && e.target.classList.contains('delete-btn')) {
            const feelingId = e.target.getAttribute('data-feeling-id');
            deleteFeeling(feelingId);
        }
    });

    // Setup conversation modal
    setupConversationModal();
});

// Setup tabs functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all tab contents
            tabContents.forEach(content => content.style.display = 'none');

            // Show the selected tab content
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';

            // If notifications tab is clicked, mark notifications as read
            if (tabId === 'notifications') {
                markNotificationsAsRead();
            }
        });
    });
}

// Submit a new feeling
async function submitFeeling(e) {
    e.preventDefault();

    const content = document.getElementById('feelingContent').value.trim();
    const anonymous = document.getElementById('anonymousCheck').checked;

    if (!content) return;

    try {
        // Debug: Kiểm tra thông tin người dùng trước khi tạo feeling
        console.log('Creating feeling with user:', currentUser);

        const newFeeling = {
            content,
            anonymous,
            userId: currentUser.uid,
            username: anonymous ? 'Ẩn danh' : (currentUser.displayName || currentUser.username),
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        };

        // Lưu tên thật của người dùng khi họ chia sẻ ẩn danh (chỉ admin mới thấy)
        if (anonymous) {
            newFeeling.realUsername = currentUser.displayName || currentUser.username;
            console.log('Saving real username for anonymous post:', newFeeling.realUsername);
        }

        await push(feelingsRef, newFeeling);

        // Clear form
        document.getElementById('feelingContent').value = '';
        document.getElementById('anonymousCheck').checked = false;

        // Show success message
        const successMsg = document.getElementById('successMessage');
        successMsg.textContent = 'Chia sẻ của bạn đã được gửi thành công!';
        successMsg.style.display = 'block';

        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

        // Switch to My Feelings tab
        document.querySelector('.tab-btn[data-tab="my-feelings"]').click();

    } catch (error) {
        console.error('Error submitting feeling:', error);

        // Show error message
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = 'Đã xảy ra lỗi khi gửi chia sẻ. Vui lòng thử lại.';
        errorMsg.style.display = 'block';

        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 3000);
    }
}

// Load all feelings from database
function loadAllFeelings() {
    onValue(feelingsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const feelings = Object.entries(data)
            .map(([key, feeling]) => ({
                id: key,
                ...feeling
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        displayFeelings(feelings, 'allFeelingsList');
    });
}

// Load my feelings from database
function loadMyFeelings() {
    onValue(feelingsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const feelings = Object.entries(data)
            .map(([key, feeling]) => ({
                id: key,
                ...feeling
            }))
            .filter(feeling => feeling.userId === currentUser.uid)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        displayFeelings(feelings, 'myFeelingsList');
    });
}

// Display feelings in the UI
function displayFeelings(feelings, containerId) {
    const feelingsList = document.getElementById(containerId);
    if (!feelingsList) return;

    feelingsList.innerHTML = '';

    if (feelings.length === 0) {
        feelingsList.innerHTML = '<div class="no-feelings">Chưa có chia sẻ nào. Hãy là người đầu tiên chia sẻ cảm xúc của bạn!</div>';
        return;
    }

    feelings.forEach(feeling => {
        const feelingCard = document.createElement('div');

        // Thêm class đặc biệt nếu là nỗi lòng của người dùng hiện tại
        let cardClasses = 'feeling-card';
        if (feeling.userId === currentUser.uid) {
            cardClasses += ' my-feeling';
        }

        feelingCard.className = cardClasses;

        // Xóa nút trò chuyện theo yêu cầu
        let replyButton = '';

        // Create delete button if it's the user's own feeling or user is admin
        let deleteButton = '';
        if (feeling.userId === currentUser.uid || currentUser.isAdmin) {
            deleteButton = `
                <button class="delete-btn" data-feeling-id="${feeling.id}">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            `;
        }

        // Không hiển thị form gửi lời động viên nếu là nỗi lòng của chính mình
        const supportForm = feeling.userId === currentUser.uid ?
            '' :
            `<div class="send-message-form">
                <textarea id="message-${feeling.id}" class="form-control" placeholder="Gửi lời động viên..."></textarea>
                <button type="button" class="send-message-btn" data-feeling-id="${feeling.id}">Gửi</button>
            </div>`;

        // Hiển thị tên người dùng cho admin
        let authorDisplay = feeling.username;

        // Debug: Kiểm tra thông tin feeling và người dùng
        console.log('Feeling:', feeling);
        console.log('Current user:', currentUser);

        // Kiểm tra xem người dùng hiện tại có phải là admin không
        const isAdmin = currentUser && (currentUser.isAdmin === true || currentUser.username === 'admin');
        console.log('Is admin?', isAdmin);

        if (isAdmin) {
            console.log('Admin viewing feeling:', feeling.id);

            // Kiểm tra xem bài đăng có phải ẩn danh không
            if (feeling.username === 'Ẩn danh') {
                if (feeling.realUsername) {
                    // Nếu có tên thật, hiển thị tên thật
                    authorDisplay = `${feeling.realUsername} <span class="admin-view">(Ẩn danh)</span>`;
                    console.log('Showing real name for anonymous post:', feeling.realUsername);
                } else if (feeling.userId) {
                    // Nếu không có tên thật nhưng có userId, hiển thị "Người dùng (Ẩn danh)"
                    authorDisplay = `Người dùng <span class="admin-view">(Ẩn danh)</span>`;
                    console.log('No real username found, showing generic name');
                }
            }
        }

        feelingCard.innerHTML = `
            <div class="feeling-header">
                <div class="feeling-author">${authorDisplay}</div>
                <div class="feeling-time">${feeling.datetime}</div>
            </div>
            <div class="feeling-content">${feeling.content}</div>
            <div class="support-messages" id="messages-${feeling.id}">
                <div class="loading-messages">Đang tải tin nhắn...</div>
            </div>
            ${supportForm}
            <div class="feeling-actions">
                ${replyButton}
                ${deleteButton}
            </div>
        `;

        feelingsList.appendChild(feelingCard);

        // Load messages for this feeling
        loadMessages(feeling.id);
    });
}

// Load support messages for a feeling
async function loadMessages(feelingId) {
    const messagesContainer = document.getElementById(`messages-${feelingId}`);
    if (!messagesContainer) return;

    // Lấy thông tin về nỗi lòng để kiểm tra xem người dùng hiện tại có phải là chủ sở hữu không
    const feelingRef = ref(db, `feelings/${feelingId}`);
    const feelingSnapshot = await get(feelingRef);
    const feeling = feelingSnapshot.val();

    if (!feeling) return;

    const isOwner = feeling.userId === currentUser.uid;

    const feelingMessagesRef = ref(db, `supportMessages/${feelingId}`);

    onValue(feelingMessagesRef, (snapshot) => {
        const data = snapshot.val() || {};

        // Lọc tin nhắn: chỉ hiển thị tin nhắn của người dùng hiện tại hoặc tất cả tin nhắn nếu người dùng là chủ sở hữu
        const messages = Object.entries(data)
            .map(([key, message]) => ({
                id: key,
                ...message
            }))
            .filter(message => isOwner || message.userId === currentUser.uid)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            if (isOwner) {
                messagesContainer.innerHTML = '<div class="no-messages">Chưa có lời động viên nào.</div>';
            } else {
                messagesContainer.innerHTML = '<div class="no-messages">Bạn chưa gửi lời động viên nào. Hãy gửi lời động viên!</div>';
            }
            return;
        }

        // Hiển thị số lượng lời động viên nếu người dùng là chủ sở hữu
        if (isOwner && Object.keys(data).length > messages.length) {
            const totalMessages = Object.keys(data).length;
            const hiddenMessages = totalMessages - messages.length;

            const messageCountEl = document.createElement('div');
            messageCountEl.className = 'message-count';
            messageCountEl.textContent = `Bạn đã nhận được ${totalMessages} lời động viên.`;
            messagesContainer.appendChild(messageCountEl);
        }

        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = 'support-message';
            messageEl.innerHTML = `
                <div class="message-author">${message.username}</div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${message.datetime}</div>
            `;
            messagesContainer.appendChild(messageEl);
        });
    });
}

// Send a support message
async function sendSupportMessage(feelingId, content) {
    try {
        // Get feeling details
        const feelingRef = ref(db, `feelings/${feelingId}`);
        const feelingSnapshot = await get(feelingRef);
        const feeling = feelingSnapshot.val();

        if (!feeling) return;

        // Không cho phép gửi lời động viên cho nỗi lòng của chính mình
        if (feeling.userId === currentUser.uid) {
            alert('Bạn không thể gửi lời động viên cho nỗi lòng của chính mình.');
            return;
        }

        // Add message to support messages
        const newMessage = {
            content,
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.username,
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        };

        await push(ref(db, `supportMessages/${feelingId}`), newMessage);

        // Create notification for feeling owner (if not the current user)
        if (feeling.userId !== currentUser.uid) {
            await push(ref(db, `notifications/${feeling.userId}`), {
                type: 'support',
                feelingId,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || currentUser.username,
                message: content,
                read: false,
                timestamp: new Date().toISOString(),
                datetime: new Date().toLocaleString('vi-VN')
            });
        }
    } catch (error) {
        console.error('Error sending support message:', error);
        alert('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.');
    }
}

// Load notifications
function loadNotifications() {
    if (!currentUser) return;

    const userNotificationsRef = ref(db, `notifications/${currentUser.uid}`);

    onValue(userNotificationsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const notifications = Object.entries(data)
            .map(([key, notification]) => ({
                id: key,
                ...notification
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        displayNotifications(notifications);
        updateNotificationBadge(notifications);
    });
}

// Display notifications in the UI
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    notificationsList.innerHTML = '';

    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-notifications">Bạn chưa có thông báo nào.</div>';
        return;
    }

    // Biến lưu trữ thông báo hiện tại cho menu ngữ cảnh
    let currentContextNotification = null;

    // Thiết lập menu ngữ cảnh
    setupContextMenu();

    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
        notificationItem.setAttribute('data-id', notification.id);
        notificationItem.setAttribute('data-type', notification.type);

        let content = '';

        if (notification.type === 'support') {
            content = `<strong>${notification.senderName}</strong> đã gửi lời động viên cho bạn: "${notification.message}"`;
            notificationItem.setAttribute('data-feeling-id', notification.feelingId);
            notificationItem.setAttribute('data-sender-id', notification.senderId);
            notificationItem.setAttribute('data-sender-name', notification.senderName);
        } else if (notification.type === 'conversation') {
            content = `<strong>${notification.senderName}</strong> đã gửi tin nhắn cho bạn: "${notification.message}"`;
            notificationItem.setAttribute('data-sender-id', notification.senderId);
            notificationItem.setAttribute('data-sender-name', notification.senderName);
        }

        notificationItem.innerHTML = `
            <div class="notification-content">${content}</div>
            <div class="notification-time">${notification.datetime}</div>
        `;

        // Kiểm tra xem thiết bị có phải là thiết bị di động không
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Xử lý sự kiện click thông thường
        notificationItem.addEventListener('click', (e) => {
            if (isMobile) {
                // Trên thiết bị di động, click thông thường sẽ hiển thị menu ngữ cảnh
                e.preventDefault();

                // Lưu thông báo hiện tại
                currentContextNotification = notification;

                // Hiển thị menu ngữ cảnh
                const contextMenu = document.getElementById('notificationContextMenu');

                // Vị trí menu ngữ cảnh trên mobile - hiển thị gần vị trí nhấn
                const rect = notificationItem.getBoundingClientRect();
                contextMenu.style.display = 'block';

                // Đặt menu ở dưới thông báo
                contextMenu.style.left = `${rect.left}px`;
                contextMenu.style.top = `${rect.bottom + window.scrollY}px`;
                contextMenu.style.width = `${rect.width}px`;

                // Ẩn/hiện các mục menu tùy thuộc vào loại thông báo
                const replyMenuItem = document.getElementById('replyMenuItem');
                const viewMenuItem = document.getElementById('viewMenuItem');

                if (notification.type === 'support') {
                    replyMenuItem.style.display = 'flex';
                    viewMenuItem.style.display = 'flex';
                } else if (notification.type === 'conversation') {
                    replyMenuItem.style.display = 'flex';
                    viewMenuItem.style.display = 'none';
                }
            } else {
                // Trên desktop, click thông thường sẽ xử lý thông báo
                handleNotificationClick(notification);
            }
        });

        // Xử lý sự kiện click chuột phải (chỉ trên desktop)
        notificationItem.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Ngăn menu ngữ cảnh mặc định của trình duyệt

            if (!isMobile) {
                // Lưu thông báo hiện tại
                currentContextNotification = notification;

                // Hiển thị menu ngữ cảnh
                const contextMenu = document.getElementById('notificationContextMenu');
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.top = `${e.pageY}px`;
                contextMenu.style.width = 'auto'; // Reset width for desktop

                // Ẩn/hiện các mục menu tùy thuộc vào loại thông báo
                const replyMenuItem = document.getElementById('replyMenuItem');
                const viewMenuItem = document.getElementById('viewMenuItem');

                if (notification.type === 'support') {
                    replyMenuItem.style.display = 'flex';
                    viewMenuItem.style.display = 'flex';
                } else if (notification.type === 'conversation') {
                    replyMenuItem.style.display = 'flex';
                    viewMenuItem.style.display = 'none';
                }
            }
        });

        notificationsList.appendChild(notificationItem);
    });

    // Thiết lập menu ngữ cảnh
    function setupContextMenu() {
        const contextMenu = document.getElementById('notificationContextMenu');
        const replyMenuItem = document.getElementById('replyMenuItem');
        const viewMenuItem = document.getElementById('viewMenuItem');
        const markAsReadMenuItem = document.getElementById('markAsReadMenuItem');

        // Đóng menu ngữ cảnh khi click ra ngoài
        document.addEventListener('click', (e) => {
            // Kiểm tra xem click có phải là trên menu hoặc trên thông báo đang mở menu không
            const isClickInsideMenu = contextMenu.contains(e.target);
            const isClickOnNotification = e.target.closest('.notification-item');

            // Nếu click không phải trên menu và không phải trên thông báo đang mở menu, đóng menu
            if (!isClickInsideMenu && (!isClickOnNotification || isClickOnNotification !== notificationItem)) {
                contextMenu.style.display = 'none';
            }
        });

        // Thêm sự kiện touchstart để đóng menu khi chạm vào nơi khác trên màn hình (mobile)
        document.addEventListener('touchstart', (e) => {
            const isClickInsideMenu = contextMenu.contains(e.target);
            const isClickOnNotification = e.target.closest('.notification-item');

            if (!isClickInsideMenu && (!isClickOnNotification || isClickOnNotification !== notificationItem)) {
                contextMenu.style.display = 'none';
            }
        });

        // Xử lý sự kiện click vào các mục menu
        replyMenuItem.addEventListener('click', () => {
            if (currentContextNotification) {
                openConversation(
                    currentContextNotification.senderId,
                    currentContextNotification.senderName
                );
                markNotificationAsRead(currentContextNotification.id);
            }
        });

        viewMenuItem.addEventListener('click', () => {
            if (currentContextNotification && currentContextNotification.type === 'support') {
                // Chuyển đến tab "Nỗi lòng của tôi"
                document.querySelector('.tab-btn[data-tab="my-feelings"]').click();

                // Cuộn đến nỗi lòng tương ứng
                setTimeout(() => {
                    const feelingElement = document.querySelector(`#myFeelingsList [data-feeling-id="${currentContextNotification.feelingId}"]`);
                    if (feelingElement) {
                        feelingElement.scrollIntoView({ behavior: 'smooth' });
                        feelingElement.classList.add('highlight');
                        setTimeout(() => {
                            feelingElement.classList.remove('highlight');
                        }, 2000);
                    }
                }, 300);

                markNotificationAsRead(currentContextNotification.id);
            }
        });

        markAsReadMenuItem.addEventListener('click', () => {
            if (currentContextNotification) {
                markNotificationAsRead(currentContextNotification.id);

                // Cập nhật giao diện
                const notificationItem = document.querySelector(`.notification-item[data-id="${currentContextNotification.id}"]`);
                if (notificationItem) {
                    notificationItem.classList.remove('unread');
                }
            }
        });
    }
}

// Handle notification click
function handleNotificationClick(notification) {
    // Mark notification as read
    markNotificationAsRead(notification.id);

    // Handle based on notification type
    if (notification.type === 'support') {
        // Hiển thị hộp thoại xác nhận
        if (confirm(`Bạn có muốn phản hồi lại lời động viên của ${notification.senderName}?`)) {
            // Mở hộp thoại trò chuyện với người gửi lời động viên
            openConversation(notification.senderId, notification.senderName);
        } else {
            // Nếu không, chuyển đến nỗi lòng của người dùng
            // Switch to My Feelings tab
            document.querySelector('.tab-btn[data-tab="my-feelings"]').click();

            // Scroll to the feeling
            setTimeout(() => {
                const feelingElement = document.querySelector(`#myFeelingsList [data-feeling-id="${notification.feelingId}"]`);
                if (feelingElement) {
                    feelingElement.scrollIntoView({ behavior: 'smooth' });
                    feelingElement.classList.add('highlight');
                    setTimeout(() => {
                        feelingElement.classList.remove('highlight');
                    }, 2000);
                }
            }, 300);
        }
    } else if (notification.type === 'conversation') {
        // Open conversation with sender
        openConversation(notification.senderId, notification.senderName);
    }
}

// Update notification badge
function updateNotificationBadge(notifications) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const unreadCount = notifications.filter(notification => !notification.read).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await update(ref(db, `notifications/${currentUser.uid}/${notificationId}`), {
            read: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
async function markNotificationsAsRead() {
    try {
        const userNotificationsRef = ref(db, `notifications/${currentUser.uid}`);
        const snapshot = await get(userNotificationsRef);

        if (!snapshot.exists()) return;

        const updates = {};

        snapshot.forEach(childSnapshot => {
            const notification = childSnapshot.val();
            if (!notification.read) {
                updates[`${childSnapshot.key}/read`] = true;
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(userNotificationsRef, updates);
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// Setup conversation modal
function setupConversationModal() {
    const modal = document.getElementById('conversationModal');
    const closeBtn = document.querySelector('.close-modal');
    const sendBtn = document.getElementById('sendConversationBtn');

    if (!modal || !closeBtn || !sendBtn) return;

    // Close modal when clicking the close button
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Send message when clicking the send button
    sendBtn.addEventListener('click', sendConversationMessage);

    // Send message when pressing Enter (but allow Shift+Enter for new line)
    document.getElementById('conversationInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendConversationMessage();
        }
    });
}

// Open conversation with user
function openConversation(userId, username) {
    const modal = document.getElementById('conversationModal');
    const usernameEl = document.getElementById('conversationUsername');
    const sendBtn = document.getElementById('sendConversationBtn');

    if (!modal || !usernameEl || !sendBtn) return;

    // Set conversation partner info
    usernameEl.textContent = username;
    sendBtn.setAttribute('data-receiver-id', userId);

    // Clear previous messages
    document.getElementById('conversationMessages').innerHTML = '<div class="loading-messages">Đang tải tin nhắn...</div>';

    // Clear input
    document.getElementById('conversationInput').value = '';

    // Show modal
    modal.style.display = 'block';

    // Load conversation messages
    loadConversationMessages(userId);
}

// Load conversation messages
function loadConversationMessages(partnerId) {
    const conversationId = getConversationId(currentUser.uid, partnerId);
    const conversationMessagesRef = ref(db, `conversations/${conversationId}/messages`);

    onValue(conversationMessagesRef, (snapshot) => {
        const messagesContainer = document.getElementById('conversationMessages');
        if (!messagesContainer) return;

        const data = snapshot.val() || {};
        const messages = Object.values(data)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="no-messages">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>';
            return;
        }

        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `message-bubble ${message.senderId === currentUser.uid ? 'message-sent' : 'message-received'}`;
            messageEl.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-time">${message.datetime}</div>
            `;
            messagesContainer.appendChild(messageEl);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Send conversation message
async function sendConversationMessage() {
    const input = document.getElementById('conversationInput');
    const content = input.value.trim();
    const receiverId = document.getElementById('sendConversationBtn').getAttribute('data-receiver-id');

    if (!content || !receiverId) return;

    try {
        const conversationId = getConversationId(currentUser.uid, receiverId);

        // Add message to conversation
        const newMessage = {
            content,
            senderId: currentUser.uid,
            receiverId,
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        };

        await push(ref(db, `conversations/${conversationId}/messages`), newMessage);

        // Create notification for receiver
        await push(ref(db, `notifications/${receiverId}`), {
            type: 'conversation',
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.username,
            message: content,
            read: false,
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        });

        // Clear input
        input.value = '';
    } catch (error) {
        console.error('Error sending conversation message:', error);
        alert('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.');
    }
}

// Get conversation ID (ensures same ID regardless of who initiated)
function getConversationId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Delete a feeling
async function deleteFeeling(feelingId) {
    if (!confirm('Bạn có chắc chắn muốn xóa nỗi lòng này không?')) {
        return;
    }

    try {
        // Xóa nỗi lòng
        await remove(ref(db, `feelings/${feelingId}`));

        // Xóa tất cả lời động viên liên quan
        await remove(ref(db, `supportMessages/${feelingId}`));

        // Hiển thị thông báo thành công
        alert('Đã xóa nỗi lòng thành công!');

        // Nếu người dùng là admin, tải lại tất cả nỗi lòng
        if (currentUser.username === 'admin') {
            loadAllFeelings();
        }

        // Tải lại nỗi lòng của người dùng
        loadMyFeelings();
    } catch (error) {
        console.error('Error deleting feeling:', error);
        alert('Đã xảy ra lỗi khi xóa nỗi lòng. Vui lòng thử lại.');
    }
}
