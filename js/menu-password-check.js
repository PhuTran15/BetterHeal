// import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
// import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Firebase config
// const firebaseConfig = {
//     apiKey: "AIzaSyDSzFT32QJNv_0H_jLw6CASZdD0gJTE-Uw",
//     authDomain: "betterheal-d59e9.firebaseapp.com",
//     databaseURL: "https://betterheal-d59e9-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "betterheal-d59e9",
//     storageBucket: "betterheal-d59e9.firebasestorage.app",
//     messagingSenderId: "1069393133390",
//     appId: "1:1069393133390:web:e0e8e8e8e8e8e8e8e8e8e8"
// };

// const app = initializeApp(firebaseConfig);
// const db = getDatabase(app);

// Get menu ID from current page
function getCurrentMenuId() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    const menuMap = {
        'feelings.html': 'feelings',
        'diary.html': 'diary',
        'meditation.html': 'meditation',
        'chat.html': 'chat',
        'merry-christmas.html': 'christmas',
        'christmas-wishes-admin.html': 'christmas-wishes',
        'thuong-em.html': 'thuong-em'
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
        return; // Admin bypass
    }

    // Check if password is enabled for this menu
    // const passwordRef = ref(db, `menuPasswords/${menuId}`);
    // const snapshot = await get(passwordRef);
    // const passwordData = snapshot.val();
    const passwordData = { enabled: true, password: "281015" };
    if (passwordData && passwordData.enabled) {
        // Check if user has already entered password in this session
        const sessionKey = `menu_password_${menuId}`;
        const sessionPassword = sessionStorage.getItem(sessionKey);
        // if (sessionPassword === passwordData.password) {
        //     return; // Password already verified
        // }

        // Show password prompt
        showPasswordPrompt(menuId, passwordData.password);
    }
}

// Show password prompt
function showPasswordPrompt(menuId, correctPassword) {
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
                        <i class="fas fa-times"></i> Hủy
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

    // Add styles
    addPasswordModalStyles();

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
            // Save to session
            sessionStorage.setItem(`menu_password_${menuId}`, enteredPassword);
            // Remove modal
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
    style.textContent = `
        .menu-password-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(100px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
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
            max-width: 450px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .menu-password-header {
            padding: 2rem;
            text-align: center;
            border-bottom: 2px solid #f0f0f0;
        }

        .menu-password-header i {
            font-size: 3rem;
            color: #667eea;
            margin-bottom: 1rem;
        }

        .menu-password-header h2 {
            font-size: 1.8rem;
            color: #333;
            margin-bottom: 0.5rem;
        }

        .menu-password-header p {
            color: #666;
            font-size: 1rem;
        }

        .menu-password-body {
            padding: 2rem;
        }

        .password-input-group {
            position: relative;
            margin-bottom: 1rem;
        }

        .password-input-group input {
            width: 100%;
            padding: 1rem 3rem 1rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1.1rem;
            transition: all 0.3s ease;
        }

        .password-input-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .password-input-group input.error {
            border-color: #dc3545;
            animation: shake 0.5s;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .password-input-group button {
            position: absolute;
            right: 10px;
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
            color: #667eea;
        }

        .password-error {
            color: #dc3545;
            font-size: 0.9rem;
            min-height: 20px;
            margin-top: 0.5rem;
        }

        .menu-password-footer {
            padding: 1.5rem 2rem;
            border-top: 2px solid #f0f0f0;
            display: flex;
            gap: 1rem;
        }

        .menu-password-footer button {
            flex: 1;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 10px;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
            .menu-password-content {
                width: 95%;
            }

            .menu-password-header {
                padding: 1.5rem;
            }

            .menu-password-body {
                padding: 1.5rem;
            }

            .menu-password-footer {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize check
checkPasswordRequired();

