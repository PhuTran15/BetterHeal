const users = {
    'phuongthuy123': {
        password: '123456',
        role: 'admin'
    },
    'xemsanpham': {
        password: '123456',
        role: 'staff'
    }
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    const user = users[username];
    
    if (user && user.password === password) {
        // Lưu thông tin đăng nhập vào localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            username: username,
            role: user.role
        }));
        
        // Chuyển hướng đến trang chính
        window.location.href = 'index.html';
    } else {
        errorMessage.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng';
    }
}); 