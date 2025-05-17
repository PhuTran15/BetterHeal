// BetterHeal - Registration Module
import { registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const displayName = document.getElementById('displayName').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Reset messages
        errorMessage.textContent = '';
        successMessage.textContent = '';

        // Validate inputs
        if (!username || !displayName || !password || !confirmPassword) {
            errorMessage.textContent = 'Vui lòng nhập đầy đủ thông tin';
            return;
        }

        // Validate username (only allow letters, numbers, and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorMessage.textContent = 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Mật khẩu xác nhận không khớp';
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
            return;
        }

        // Show loading state
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng ký...';

        try {
            const result = await registerUser(username, password, displayName);

            if (result.success) {
                // Show success message
                successMessage.textContent = 'Đăng ký thành công! Đang chuyển hướng đến trang chính...';

                // Clear form
                registerForm.reset();

                // Redirect to dashboard page after a delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                errorMessage.textContent = result.error || 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.';
            }
        } catch (error) {
            console.error('Registration error:', error);
            errorMessage.textContent = 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.';
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
});
