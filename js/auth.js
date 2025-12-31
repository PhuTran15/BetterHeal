// Firebase Authentication Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, set, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

// Register a new user
export async function registerUser(username, password, displayName) {
    try {
        // Generate a unique email for Firebase Auth (since it requires email)
        const email = `${username.toLowerCase()}@betterheal.local`;

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional user info to the database
        await set(ref(db, 'users/' + user.uid), {
            username: username,
            displayName: displayName || username,
            email: email,
            createdAt: new Date().toISOString()
        });

        return { success: true, user };
    } catch (error) {
        // Xử lý lỗi email đã tồn tại (có thể là username đã tồn tại)
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: "Tên đăng nhập đã tồn tại" };
        }
        return { success: false, error: error.message };
    }
}

// Login user with username
export async function loginUser(username, password) {
    try {
        // Kiểm tra nếu đây là tài khoản admin
        if (username === 'admin' && password === '281015') {
            // Tạo tài khoản admin nếu chưa tồn tại
            return await createAdminAccount(username, password);
        }

        // Generate email from username
        const email = `${username.toLowerCase()}@betterheal.local`;

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user data from database
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            // This should not happen normally, but just in case
            return { success: false, error: "Không tìm thấy thông tin người dùng" };
        }

        const userData = snapshot.val();

        // Store user data in localStorage for easy access
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            username: userData.username,
            displayName: userData.displayName || userData.username,
            isAdmin: userData.isAdmin || false
        }));

        return { success: true, user: userData };
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            return { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" };
        }
        return { success: false, error: error.message };
    }
}

// Create admin account if it doesn't exist
async function createAdminAccount(username, password) {
    try {
        const email = `${username.toLowerCase()}@betterheal.local`;

        // Kiểm tra xem tài khoản admin đã tồn tại chưa
        try {
            // Thử đăng nhập với tài khoản admin
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Lấy dữ liệu người dùng từ database
            const userRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.val();

                // Cập nhật quyền admin nếu chưa có
                if (!userData.isAdmin) {
                    await update(userRef, { isAdmin: true });
                    userData.isAdmin = true;
                }

                // Lưu thông tin người dùng vào localStorage
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    username: userData.username,
                    displayName: userData.displayName || userData.username,
                    isAdmin: true
                }));

                return { success: true, user: userData };
            }
        } catch (error) {
            // Nếu tài khoản chưa tồn tại, tiếp tục tạo mới
            console.log("Admin account doesn't exist, creating...");
        }

        // Tạo tài khoản admin mới
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Lưu thông tin admin vào database
        await set(ref(db, 'users/' + user.uid), {
            username: username,
            displayName: 'Admin',
            email: email,
            isAdmin: true,
            createdAt: new Date().toISOString()
        });

        // Lưu thông tin người dùng vào localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            username: username,
            displayName: 'Admin',
            isAdmin: true
        }));

        return { success: true, user: { username, displayName: 'Admin', isAdmin: true } };
    } catch (error) {
        console.error("Error creating admin account:", error);
        return { success: false, error: error.message };
    }
}

// Logout user
export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check if user is logged in
export function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Listen for auth state changes
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// Check if user is logged in and redirect if not
export function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Update UI based on auth state
export function updateUIOnAuth() {
    const currentUser = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const menuPasswordLink = document.getElementById('menuPasswordLink');

    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            
            // Handle multiple possible username displays
            const usernameDisplay = document.getElementById('usernameDisplay');
            const usernameElement = userInfo.querySelector('.username') || userInfo.querySelector('.user-name');
            
            let displayName = 'Người dùng';
            if (currentUser.displayName) {
                displayName = currentUser.displayName;
            } else if (currentUser.username) {
                displayName = currentUser.username;
            }

            if (usernameDisplay) {
                usernameDisplay.textContent = displayName;
            } else if (usernameElement) {
                usernameElement.textContent = displayName;
            }

            // Handle admin link
            if (menuPasswordLink) {
                if (currentUser.username === 'admin' || currentUser.username === 'thaonguyen') {
                    menuPasswordLink.style.display = 'flex';
                } else {
                    menuPasswordLink.style.display = 'none';
                }
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (menuPasswordLink) menuPasswordLink.style.display = 'none';
    }
}
