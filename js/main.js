import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEK54N506sR3dkYdhXtrP1mQPjz1QfVLg",
  authDomain: "betterheal-117ed.firebaseapp.com",
    databaseURL: "https://betterheal-117ed-default-rtdb.asia-southeast1.firebasedatabase.app", // Quan trọng
  projectId: "betterheal-117ed",
  storageBucket: "betterheal-117ed.firebasestorage.app",
  messagingSenderId: "482091866987",
  appId: "1:482091866987:web:51e473cd51db4f632b0a2e",
  measurementId: "G-HSBSJ63EXT"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const productsRef = ref(db, 'products');

// Biến lưu trữ sản phẩm
let products = [];
let productKeys = [];

// Thêm reference cho history
const historyRef = ref(db, 'history');

// Thêm reference cho notes
const notesRef = ref(db, 'notes');

// Thêm reference cho note history
const noteHistoryRef = ref(db, 'noteHistory');

// Hàm thêm lịch sử
function addHistory(action, details) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    push(historyRef, {
        action: action,
        details: details,
        timestamp: new Date().toISOString(),
        datetime: new Date().toLocaleString('vi-VN'),
        username: currentUser.username || 'Hệ thống'
    });
}

// Thêm hàm addNoteHistory
function addNoteHistory(action, details) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    push(noteHistoryRef, {
        action: action,
        details: details,
        timestamp: new Date().toISOString(),
        datetime: new Date().toLocaleString('vi-VN'),
        username: currentUser.username || 'Hệ thống'
    });
}

// Lắng nghe thay đổi dữ liệu realtime
onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    products = [];
    productKeys = [];
    
    for (let key in data) {
        products.push(data[key]);
        productKeys.push(key);
    }
    displayProducts();
});

// Hiển thị sản phẩm
function displayProducts() {
    const productsList = document.getElementById('productsList');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    productsList.innerHTML = '';
    
    // Sửa lại header của bảng
    const thead = document.querySelector('.products-table thead tr');
    if (currentUser.role === 'staff') {
        // Ẩn cột thao tác nếu là nhân viên
        thead.lastElementChild.style.display = 'none';
    }
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.price.toLocaleString('vi-VN')} VNĐ</td>
            <td>${product.note || ''}</td>
            ${currentUser.role === 'admin' ? `
            <td>
                <button class="edit-btn" onclick="openEditModal('${productKeys[index]}')">Sửa</button>
                <button class="delete-btn" onclick="deleteProduct('${productKeys[index]}')">Xóa</button>
            </td>
            ` : ''}
        `;
        productsList.appendChild(row);
    });
}

// Thêm sản phẩm mới
document.getElementById('productForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const note = document.getElementById('productNote').value;
    
    if (name && price) {
        push(productsRef, { name, price, note });
        
        // Thêm lịch sử
        addHistory('Thêm sản phẩm', `Đã thêm sản phẩm "${name}" với giá ${price.toLocaleString('vi-VN')} VNĐ`);
        
        // Reset form
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productNote').value = '';
    }
});

// Xóa sản phẩm
window.deleteProduct = function(key) {
    const index = productKeys.indexOf(key);
    const product = products[index];
    
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        remove(ref(db, `products/${key}`));
        
        // Thêm lịch sử
        addHistory('Xóa sản phẩm', `Đã xóa sản phẩm "${product.name}"`);
    }
}

// Biến lưu key sản phẩm đang sửa
let editingKey = null;

// Mở modal sửa sản phẩm
window.openEditModal = function(key) {
    editingKey = key;
    const index = productKeys.indexOf(key);
    const product = products[index];
    
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductNote').value = product.note || '';
    
    document.getElementById('editModal').style.display = 'block';
}

// Đóng modal
window.closeEditModal = function() {
    document.getElementById('editModal').style.display = 'none';
    editingKey = null;
}

// Xử lý form sửa sản phẩm
document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!editingKey) return;
    
    const name = document.getElementById('editProductName').value;
    const price = parseInt(document.getElementById('editProductPrice').value);
    const note = document.getElementById('editProductNote').value;
    
    if (name && price) {
        const oldProduct = products[productKeys.indexOf(editingKey)];
        update(ref(db, `products/${editingKey}`), {
            name, price, note
        });
        
        // Thêm lịch sử
        addHistory('Sửa sản phẩm', 
            `Đã sửa sản phẩm "${oldProduct.name}" thành "${name}", ` +
            `giá từ ${oldProduct.price.toLocaleString('vi-VN')} VNĐ thành ${price.toLocaleString('vi-VN')} VNĐ`
        );
        
        closeEditModal();
    }
});

// Tìm kiếm sản phẩm
window.searchProducts = function() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const productsList = document.getElementById('productsList');
    const rows = productsList.getElementsByTagName('tr');
    let hasResults = false;

    products.forEach((product, index) => {
        const row = rows[index];
        const productName = product.name.toLowerCase();
        
        if (productName.includes(searchText)) {
            row.style.display = '';
            hasResults = true;
        } else {
            row.style.display = 'none';
        }
    });

    const noResults = document.querySelector('.no-results');
    if (!hasResults) {
        if (!noResults) {
            const message = document.createElement('tr');
            message.className = 'no-results';
            message.innerHTML = '<td colspan="5">Không tìm thấy sản phẩm nào</td>';
            productsList.appendChild(message);
        }
    } else {
        if (noResults) {
            noResults.remove();
        }
    }
}

// Đóng modal khi click ra ngoài
window.addEventListener('click', function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
});

// Thêm hiển thị lịch sử
let histories = [];
onValue(historyRef, (snapshot) => {
    const data = snapshot.val() || {};
    histories = Object.values(data)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20); // Chỉ lấy 20 mục gần nhất
    
    // Xóa các mục cũ nếu có nhiều hơn 20
    const allKeys = Object.keys(data);
    if (allKeys.length > 20) {
        const keysToRemove = allKeys
            .sort((a, b) => new Date(data[b].timestamp) - new Date(data[a].timestamp))
            .slice(20);
            
        keysToRemove.forEach(key => {
            remove(ref(db, `history/${key}`));
        });
    }
    
    displayHistory();
});

function displayHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    histories.forEach(history => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.setAttribute('data-action', history.action);
        item.innerHTML = `
            <div class="history-time">${history.datetime}</div>
            <div class="history-action">${history.action}</div>
            <div class="history-details">
                <span class="history-user">${history.username}</span>
                ${history.details}
            </div>
        `;
        historyList.appendChild(item);
    });
}

// Xử lý chuyển tab
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        // Ẩn tất cả các tab
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hiển thị tab được chọn
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        // Cập nhật trạng thái active của menu
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Xử lý thêm ghi chú
document.getElementById('noteForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const content = document.getElementById('noteContent').value.trim();
    if (content) {
        push(notesRef, {
            content: content,
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('vi-VN'),
            status: 'pending'
        });
        
        addNoteHistory('Thêm ghi chú', `Đã thêm ghi chú: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        
        document.getElementById('noteContent').value = '';
    }
});

// Xóa ghi chú
function deleteNote(key, content) {
    if (confirm('Bạn có chắc muốn xóa ghi chú này?')) {
        remove(ref(db, `notes/${key}`));
        addNoteHistory('Xóa ghi chú', `Đã xóa ghi chú: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    }
}

// Cập nhật trạng thái ghi chú
function toggleNoteStatus(key, currentStatus, content) {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    update(ref(db, `notes/${key}`), { status: newStatus });
    addNoteHistory('Cập nhật trạng thái', 
        `Đã chuyển ghi chú "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" ` +
        `sang trạng thái ${newStatus === 'completed' ? 'đã xong' : 'chưa xong'}`
    );
}

// Lắng nghe và hiển thị ghi chú
onValue(notesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const notes = Object.entries(data)
        .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(([key, note]) => ({key, ...note}));
    
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    notesList.innerHTML = '';
    notes.forEach(note => {
        const item = document.createElement('div');
        item.className = `note-item ${note.status || 'pending'}`;
        item.innerHTML = `
            <div class="note-content">${note.content}</div>
            <div class="note-time">${note.datetime}</div>
            <div class="note-actions">
                ${note.status === 'pending' ? 
                    `<button class="status-btn complete-btn" onclick="toggleNoteStatus('${note.key}', 'pending', '${note.content}')">Đã xong</button>` :
                    `<button class="status-btn pending-btn" onclick="toggleNoteStatus('${note.key}', 'completed', '${note.content}')">Chưa xong</button>`
                }
                <button class="delete-note-btn" onclick="deleteNote('${note.key}', '${note.content}')">Xóa</button>
            </div>
        `;
        notesList.appendChild(item);
    });
});

// Thêm các hàm vào window để có thể gọi từ HTML
window.deleteNote = deleteNote;
window.toggleNoteStatus = toggleNoteStatus;

// Kiểm tra đăng nhập
function checkLogin() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Hiển thị tên người dùng và nút đăng xuất
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <span>Xin chào, ${currentUser.username}</span>
        <button onclick="logout()" class="logout-btn">Đăng xuất</button>
    `;
    document.querySelector('nav').appendChild(userInfo);
    
    // Ẩn các chức năng theo role
    if (currentUser.role === 'staff') {
        // Ẩn form thêm sản phẩm
        document.querySelector('.add-product-form').style.display = 'none';
        // Ẩn các nút trong tab ghi chú
        document.querySelectorAll('.delete-note-btn, .status-btn').forEach(el => {
            el.remove();
        });
    }
}

// Hàm đăng xuất
window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Gọi hàm kiểm tra đăng nhập khi trang được tải
checkLogin(); 

// Thêm hiển thị lịch sử ghi chú
let noteHistories = [];
onValue(noteHistoryRef, (snapshot) => {
    const data = snapshot.val() || {};
    noteHistories = Object.values(data)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    
    // Xóa các mục cũ
    const allKeys = Object.keys(data);
    if (allKeys.length > 20) {
        const keysToRemove = allKeys
            .sort((a, b) => new Date(data[b].timestamp) - new Date(data[a].timestamp))
            .slice(20);
            
        keysToRemove.forEach(key => {
            remove(ref(db, `noteHistory/${key}`));
        });
    }
    
    displayNoteHistory();
});

// Thêm hàm hiển thị lịch sử ghi chú
function displayNoteHistory() {
    const historyList = document.getElementById('noteHistoryList');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    noteHistories.forEach(history => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.setAttribute('data-action', history.action);
        item.innerHTML = `
            <div class="history-time">${history.datetime}</div>
            <div class="history-action">${history.action}</div>
            <div class="history-details">
                <span class="history-user">${history.username}</span>
                ${history.details}
            </div>
        `;
        historyList.appendChild(item);
    });
} 