// BetterHeal - Login Module
import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            errorMessage.textContent = 'Vui lòng nhập đầy đủ thông tin';
            return;
        }

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            const result = await loginUser(username, password);

            if (result.success) {
                // Redirect to dashboard page
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.';
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
});