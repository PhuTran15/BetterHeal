import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Firebase config - Updated to correct project
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

// Initialize Firebase (check if already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// Get menu ID from current page
function getCurrentMenuId() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    const menuMap = {
        'feelings.html': 'feelings',
        'journal.html': 'diary',
        'meditation.html': 'meditation',
        'community.html': 'chat',
        'attendance.html': 'attendance',
        'foryou.html': 'foryou',
        'trai-tim-to.html': 'trai-tim-to',
        'thuong-em.html': 'thuong-em',
        'merry-christmas.html': 'christmas',
        'christmas-wishes-admin.html': 'christmas-wishes',
        'admin-permissions.html': 'admin-permissions'
    };
    
    return menuMap[filename] || null;
}

// Check if password is required
async function checkPasswordRequired() {
    const menuId = getCurrentMenuId();
    console.log("Current menu ID:", menuId);
    if (!menuId) return; // Not a protected page

    // Check if user is admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && (currentUser.username === 'admin' || currentUser.username === 'thaonguyen')) {
        console.log("Admin bypass enabled");
        return; // Admin bypass
    }

    try {
        // Check if password is enabled for this menu in Firebase
        const passwordRef = ref(db, `menuPasswords/${menuId}`);
        const snapshot = await get(passwordRef);
        const passwordData = snapshot.val();

        if (passwordData && passwordData.enabled) {
            // Always show password prompt as requested by user
            showPasswordPrompt(menuId, passwordData.password);
        }
    } catch (error) {
        console.error("Error checking password requirement:", error);
    }
}

// Show password prompt
function showPasswordPrompt(menuId, correctPassword) {
    // Hide body content to prevent peaking
    document.body.style.overflow = 'hidden';

    // Create modal HTML
    const modalHTML = `
        <div id="menuPasswordModal" class="menu-password-modal">
            <div class="menu-password-content">
                <div class="menu-password-header">
                    <i class="fas fa-lock"></i>
                    <h2>Trang này được bảo vệ</h2>
                    <p>Vui lòng nhập mật khẩu để tiếp tục</p>
                </div>
                <div class="menu-password-body">
                    <div class="password-input-group">
                        <input 
                            type="password" 
                            id="menuPasswordInput" 
                            placeholder="Nhập mật khẩu..."
                            autocomplete="off"
                        >
                        <button type="button" id="toggleMenuPassword">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <div id="passwordError" class="password-error"></div>
                </div>
                <div class="menu-password-footer">
                    <button id="cancelPasswordBtn" class="btn-cancel">
                        <i class="fas fa-times"></i> Quay lại
                    </button>
                    <button id="submitPasswordBtn" class="btn-submit">
                        <i class="fas fa-check"></i> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles if not already added
    if (!document.getElementById('menuPasswordStyles')) {
        addPasswordModalStyles();
    }

    // Event listeners
    const modal = document.getElementById('menuPasswordModal');
    const input = document.getElementById('menuPasswordInput');
    const submitBtn = document.getElementById('submitPasswordBtn');
    const cancelBtn = document.getElementById('cancelPasswordBtn');
    const toggleBtn = document.getElementById('toggleMenuPassword');
    const errorDiv = document.getElementById('passwordError');

    // Focus input
    setTimeout(() => input.focus(), 100);

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        const icon = toggleBtn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });

    // Submit password
    const submitPassword = () => {
        const enteredPassword = input.value;

        if (!enteredPassword) {
            errorDiv.textContent = 'Vui lòng nhập mật khẩu!';
            input.classList.add('error');
            return;
        }
        if (enteredPassword === correctPassword) {
            // Restore overflow and remove modal
            document.body.style.overflow = '';
            modal.remove();
        } else {
            errorDiv.textContent = 'Mật khẩu không đúng!';
            input.classList.add('error');
            input.value = '';
            input.focus();
        }
    };

    submitBtn.addEventListener('click', submitPassword);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitPassword();
    });

    // Cancel - go back
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Clear error on input
    input.addEventListener('input', () => {
        errorDiv.textContent = '';
        input.classList.remove('error');
    });
}

// Add modal styles
function addPasswordModalStyles() {
    const style = document.createElement('style');
    style.id = 'menuPasswordStyles';
    style.textContent = `
        .menu-password-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .menu-password-content {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .menu-password-header {
            padding: 2rem 1.5rem;
            text-align: center;
            background: #f8f9fa;
            border-bottom: 2px solid #f0f0f0;
        }

        .menu-password-header i {
            font-size: 2.5rem;
            color: #5b8a72;
            margin-bottom: 1rem;
        }

        .menu-password-header h2 {
            font-size: 1.5rem;
            color: #333;
            margin: 0 0 0.5rem 0;
        }

        .menu-password-header p {
            color: #666;
            font-size: 0.9rem;
            margin: 0;
        }

        .menu-password-body {
            padding: 1.5rem;
        }

        .password-input-group {
            position: relative;
        }

        .password-input-group input {
            width: 100%;
            padding: 0.9rem 3rem 0.9rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }

        .password-input-group input:focus {
            outline: none;
            border-color: #5b8a72;
            box-shadow: 0 0 0 4px rgba(91, 138, 114, 0.1);
        }

        .password-input-group input.error {
            border-color: #dc3545;
            animation: shake 0.5s;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        .password-input-group button {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.5rem;
            transition: all 0.3s ease;
        }

        .password-input-group button:hover {
            color: #5b8a72;
        }

        .password-error {
            color: #dc3545;
            font-size: 0.85rem;
            min-height: 20px;
            margin-top: 0.5rem;
            text-align: center;
        }

        .menu-password-footer {
            padding: 1rem 1.5rem 1.5rem;
            display: flex;
            gap: 1rem;
        }

        .menu-password-footer button {
            flex: 1;
            padding: 0.8rem;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-size: 1rem;
        }

        .btn-cancel {
            background: #f0f0f0;
            color: #333;
        }

        .btn-cancel:hover {
            background: #e0e0e0;
        }

        .btn-submit {
            background: #5b8a72;
            color: white;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            background: #4a7260;
            box-shadow: 0 5px 15px rgba(91, 138, 114, 0.3);
        }
    `;
    document.head.appendChild(style);
}

// Initialize check
checkPasswordRequired();
