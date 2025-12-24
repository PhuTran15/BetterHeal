# 🔐 Hướng dẫn sử dụng Quản lý mật khẩu Menu

## 📋 Tổng quan

Hệ thống quản lý mật khẩu menu cho phép admin bảo vệ các tính năng chưa hoàn thiện bằng mật khẩu. Người dùng thường sẽ phải nhập mật khẩu để truy cập các menu được bảo vệ.

## 🎯 Tính năng

### ✨ Cho Admin:
- ✅ Bật/tắt mật khẩu cho từng menu
- ✅ Đặt mật khẩu riêng cho từng menu
- ✅ Đổi mật khẩu bất kỳ lúc nào
- ✅ Bypass tự động (admin không cần nhập mật khẩu)
- ✅ Giao diện quản lý trực quan

### 🔒 Cho người dùng thường:
- Nhập mật khẩu một lần mỗi phiên (session)
- Giao diện nhập mật khẩu đẹp mắt
- Thông báo lỗi rõ ràng

## 🚀 Cách sử dụng

### 1️⃣ Truy cập trang quản lý (Admin only)

**Cách 1:** Từ trang chủ
- Đăng nhập với tài khoản admin
- Click nút **"🔒 Quản lý mật khẩu"** trên thanh navigation

**Cách 2:** Truy cập trực tiếp
- Mở URL: `menu-password-manager.html`

### 2️⃣ Bật mật khẩu cho menu

1. Tìm menu muốn bảo vệ trong danh sách
2. Click vào **toggle switch** (nút bật/tắt)
3. Nhập mật khẩu trong popup
4. Nhập lại mật khẩu để xác nhận
5. Click **"💾 Lưu mật khẩu"**

✅ **Thành công!** Menu đã được bảo vệ bằng mật khẩu.

### 3️⃣ Đổi mật khẩu

1. Tìm menu đã có mật khẩu
2. Click nút **"🔑 Đổi mật khẩu"**
3. Nhập mật khẩu mới
4. Xác nhận mật khẩu
5. Click **"💾 Lưu mật khẩu"**

### 4️⃣ Tắt mật khẩu

1. Tìm menu đang được bảo vệ
2. Click vào **toggle switch** để tắt
3. Xác nhận

✅ Menu không còn yêu cầu mật khẩu nữa.

## 📱 Danh sách menu có thể bảo vệ

| Menu | ID | URL | Icon |
|------|----|----|------|
| Nỗi lòng | `feelings` | `feelings.html` | 💖 |
| Nhật ký | `diary` | `diary.html` | 📖 |
| Thiền | `meditation` | `meditation.html` | 🧘 |
| Tâm sự | `chat` | `chat.html` | 💬 |
| Giáng sinh | `christmas` | `merry-christmas.html` | 🎄 |
| Điều ước Giáng sinh (Admin) | `christmas-wishes` | `christmas-wishes-admin.html` | ⭐ |

## 🔐 Cách hoạt động

### Khi người dùng truy cập menu được bảo vệ:

1. **Kiểm tra quyền admin:**
   - Nếu là admin → Bypass, không cần mật khẩu
   - Nếu không phải admin → Tiếp tục kiểm tra

2. **Kiểm tra session:**
   - Nếu đã nhập mật khẩu đúng trong phiên này → Cho phép truy cập
   - Nếu chưa → Hiện popup nhập mật khẩu

3. **Nhập mật khẩu:**
   - Người dùng nhập mật khẩu
   - Hệ thống kiểm tra với mật khẩu đã lưu
   - Nếu đúng → Lưu vào session, cho phép truy cập
   - Nếu sai → Hiện lỗi, yêu cầu nhập lại

4. **Session:**
   - Mật khẩu được lưu trong `sessionStorage`
   - Chỉ tồn tại trong phiên hiện tại
   - Đóng tab/browser → Phải nhập lại

## 💾 Lưu trữ dữ liệu

Mật khẩu được lưu trong Firebase Realtime Database:

```
menuPasswords/
  ├── feelings/
  │   ├── enabled: true
  │   ├── password: "your_password"
  │   └── updatedAt: "2024-12-24T..."
  ├── diary/
  │   ├── enabled: false
  │   └── password: ""
  └── ...
```

## 🛡️ Bảo mật

- ✅ Chỉ admin mới truy cập được trang quản lý
- ✅ Mật khẩu được lưu trực tiếp (không hash - vì đây là demo)
- ✅ Session-based authentication
- ✅ Không lưu mật khẩu trong localStorage
- ⚠️ **Lưu ý:** Trong production, nên hash mật khẩu trước khi lưu

## 🎨 Giao diện

### Trang quản lý:
- 🎨 Gradient background đẹp mắt
- 📱 Responsive, hoạt động tốt trên mobile
- 🔄 Toggle switch mượt mà
- 🎯 Card layout rõ ràng
- 🔔 Toast notifications

### Popup nhập mật khẩu:
- 🎭 Backdrop blur effect
- 👁️ Toggle hiện/ẩn mật khẩu
- ⚡ Animation mượt mà
- ❌ Validation rõ ràng
- 📱 Mobile-friendly

## 🔧 Tích hợp vào menu mới

Để thêm mật khẩu cho menu mới:

1. **Thêm vào danh sách menu** (`js/menu-password-manager.js`):
```javascript
const menus = [
    // ... existing menus
    { 
        id: 'new-menu', 
        name: 'Menu mới', 
        icon: 'fa-icon', 
        url: 'new-menu.html' 
    }
];
```

2. **Thêm script vào trang HTML** của menu:
```html
<script type="module" src="js/menu-password-check.js"></script>
```

3. **Xong!** Menu mới đã có thể được bảo vệ bằng mật khẩu.

## 📞 Hỗ trợ

Nếu có vấn đề:
1. Kiểm tra console log
2. Kiểm tra Firebase Database Rules
3. Đảm bảo đã đăng nhập với tài khoản admin
4. Clear cache và thử lại

---

**Tạo bởi:** BetterHeal Team 💖
**Ngày:** 24/12/2024 🎄

