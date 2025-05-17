// BetterHeal - Feelings Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { checkAuth, getCurrentUser, updateUIOnAuth } from "./auth.js";

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

// Check if user is logged in
if (!checkAuth()) {
    window.location.href = 'login.html';
}

// Update UI based on authentication state
document.addEventListener('DOMContentLoaded', () => {
    updateUIOnAuth();

    // Setup form submission
    const feelingForm = document.getElementById('feelingForm');
    if (feelingForm) {
        feelingForm.addEventListener('submit', submitFeeling);
    }

    // Load feelings
    loadFeelings();

    // Setup message form submission
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('send-message-btn')) {
            const feelingId = e.target.getAttribute('data-feeling-id');
            const messageInput = document.getElementById(`message-${feelingId}`);

            if (messageInput && messageInput.value.trim()) {
                sendSupportMessage(feelingId, messageInput.value.trim());
                messageInput.value = '';
            }
        }
    });
});

// Submit a new feeling
async function submitFeeling(e) {
    e.preventDefault();

    const content = document.getElementById('feelingContent').value.trim();
    const anonymous = document.getElementById('anonymousCheck').checked;

    if (!content) return;

    const currentUser = getCurrentUser();

    try {
        await push(feelingsRef, {
            content,
            anonymous,
            userId: currentUser.uid,
            username: anonymous ? 'Ẩn danh' : (currentUser.displayName || currentUser.username),
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        });

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

// Load feelings from database
function loadFeelings() {
    onValue(feelingsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const feelings = Object.entries(data)
            .map(([key, feeling]) => ({
                id: key,
                ...feeling
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        displayFeelings(feelings);
    });
}

// Display feelings in the UI
function displayFeelings(feelings) {
    const feelingsList = document.getElementById('feelingsList');
    if (!feelingsList) return;

    feelingsList.innerHTML = '';

    if (feelings.length === 0) {
        feelingsList.innerHTML = '<div class="no-feelings">Chưa có chia sẻ nào. Hãy là người đầu tiên chia sẻ cảm xúc của bạn!</div>';
        return;
    }

    feelings.forEach(feeling => {
        const feelingCard = document.createElement('div');
        feelingCard.className = 'feeling-card';
        feelingCard.innerHTML = `
            <div class="feeling-header">
                <div class="feeling-author">${feeling.username}</div>
                <div class="feeling-time">${feeling.datetime}</div>
            </div>
            <div class="feeling-content">${feeling.content}</div>
            <div class="support-messages" id="messages-${feeling.id}">
                <div class="loading-messages">Đang tải tin nhắn...</div>
            </div>
            <div class="send-message-form">
                <textarea id="message-${feeling.id}" class="form-control" placeholder="Gửi lời động viên..."></textarea>
                <button type="button" class="send-message-btn" data-feeling-id="${feeling.id}">Gửi</button>
            </div>
        `;

        feelingsList.appendChild(feelingCard);

        // Load messages for this feeling
        loadMessages(feeling.id);
    });
}

// Load support messages for a feeling
function loadMessages(feelingId) {
    const messagesContainer = document.getElementById(`messages-${feelingId}`);
    if (!messagesContainer) return;

    const feelingMessagesRef = ref(db, `supportMessages/${feelingId}`);

    onValue(feelingMessagesRef, (snapshot) => {
        const data = snapshot.val() || {};
        const messages = Object.values(data)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="no-messages">Chưa có lời động viên nào. Hãy gửi lời động viên đầu tiên!</div>';
            return;
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
    const currentUser = getCurrentUser();

    try {
        await push(ref(db, `supportMessages/${feelingId}`), {
            content,
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.username,
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN')
        });
    } catch (error) {
        console.error('Error sending support message:', error);
        alert('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.');
    }
}
