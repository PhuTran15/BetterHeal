// Journal Module for BetterHeal
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    remove, 
    update,
    serverTimestamp,
    query,
    orderByChild
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { checkAuth, getCurrentUser, logoutUser, updateUIOnAuth } from "./auth.js";

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

// State
let selectedMood = 'calm';
let currentEditingId = null;
let editSelectedMood = 'calm';

let currentCalendarDate = new Date(); // To track month in calendar


// Mood labels and icons mapper
const moodMap = {
    'happy': { icon: 'fa-smile', label: 'Vui vẻ', color: '#ffd700' },
    'sad': { icon: 'fa-frown', label: 'Buồn bã', color: '#6495ed' },
    'calm': { icon: 'fa-leaf', label: 'Bình yên', color: '#20b2aa' },
    'angry': { icon: 'fa-angry', label: 'Bực bội', color: '#ff6347' },
    'excited': { icon: 'fa-star', label: 'Hào hứng', color: '#ff69b4' }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Check
    if (!checkAuth()) return;
    updateUIOnAuth();

    const currentUser = getCurrentUser();
    
    // 2. UI Elements
    const moodBtns = document.querySelectorAll('.mood-btn');
    const saveBtn = document.getElementById('saveJournalBtn');
    const titleInput = document.getElementById('journalTitle');
    const contentInput = document.getElementById('journalContent');
    const entryListContainer = document.getElementById('entryList');
    const logoutBtn = document.getElementById('logoutBtn');
    // Auth UI is handled by updateUIOnAuth() above

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const editTitleInput = document.getElementById('editJournalTitle');
    const editContentInput = document.getElementById('editJournalContent');
    const editMoodBtns = document.querySelectorAll('#editMoodOptions .mood-btn');
    const updateBtn = document.getElementById('updateJournalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    // Calendar Elements
    const calendarModal = document.getElementById('calendarModal');
    const viewCalendarBtn = document.getElementById('viewCalendarBtn');
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const closeCalendarBtn = document.querySelector('.close-calendar-btn');

    // Entry Preview Elements
    const entryPreviewModal = document.getElementById('entryPreviewModal');
    const previewDateHeader = document.getElementById('previewDate');
    const previewEntriesList = document.getElementById('previewEntriesList');
    const closePreviewBtn = document.querySelector('.close-preview-btn');

    // 3. Handle Mood Selection (Create)
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMood = btn.dataset.mood;
        });
    });

    // Handle Mood Selection (Edit)
    editMoodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            editMoodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editSelectedMood = btn.dataset.mood;
        });
    });

    // 4. Handle Save Entry
    saveBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!content) {
            alert('Vui lòng viết nội dung nhật ký trước khi lưu.');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        try {
            const journalRef = ref(db, `journals/${currentUser.uid}/entries`);
            await push(journalRef, {
                title: title || 'Nhật ký ngày ' + new Date().toLocaleDateString('vi-VN'),
                content: content,
                mood: selectedMood,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString()
            });

            // Clear form
            titleInput.value = '';
            contentInput.value = '';
            alert('Nhật ký đã được lưu giữ thành công. 🌿');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Có lỗi xảy ra khi lưu nhật ký. Vui lòng thử lại.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-feather-alt"></i> Lưu vào nhật ký';
        }
    });

    // 5. Fetch and Render Entries
    const journalEntriesRef = ref(db, `journals/${currentUser.uid}/entries`);
    // Note: To sort by timestamp in RDB, we use query and orderByChild
    // But for a simple list, we can just fetch and sort locally or use CSS flex-direction: column-reverse
    
    onValue(journalEntriesRef, (snapshot) => {
        entryListContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            entryListContainer.innerHTML = `
                <div class="empty-entries">
                    <i class="fas fa-book-open"></i>
                    <p>Bạn chưa có bài viết nhật ký nào. Hãy bắt đầu ghi lại cảm xúc của mình nhé!</p>
                </div>
            `;
            return;
        }

        const entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        // Store globally for editing
        window.entriesData = entries;

        // Sort by timestamp newest first
        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        entries.forEach(entry => {
            renderEntry(entry, entryListContainer);
        });
    });

    // 6. Handle Deletion & Edition (Event Delegation)
    entryListContainer.addEventListener('click', async (e) => {
        const item = e.target.closest('.entry-item');
        if (!item) return;
        const entryId = item.dataset.id;

        // Delete Logic
        if (e.target.closest('.delete-entry-btn')) {
            if (confirm('Bạn có chắc chắn muốn xóa bài viết nhật ký này không?')) {
                try {
                    await remove(ref(db, `journals/${currentUser.uid}/entries/${entryId}`));
                } catch (error) {
                    console.error('Delete failed:', error);
                    alert('Không thể xóa bài viết. Vui lòng thử lại.');
                }
            }
        }

        // Edit Logic (Open Modal)
        if (e.target.closest('.edit-entry-btn')) {
            const currentEntry = entriesData.find(en => en.id === entryId);
            if (currentEntry) {
                currentEditingId = entryId;
                editTitleInput.value = currentEntry.title || '';
                editContentInput.value = currentEntry.content || '';
                editSelectedMood = currentEntry.mood || 'calm';
                
                // Update mood UI in modal
                editMoodBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mood === editSelectedMood);
                });

                editModal.style.display = 'flex';
            }
        }
    });

    // Handle Update Save
    updateBtn.addEventListener('click', async () => {
        const title = editTitleInput.value.trim();
        const content = editContentInput.value.trim();

        if (!content) {
            alert('Nội dung không được để trống.');
            return;
        }

        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';

        try {
            const entryRef = ref(db, `journals/${currentUser.uid}/entries/${currentEditingId}`);
            await update(entryRef, {
                title: title,
                content: content,
                mood: editSelectedMood,
                updatedAt: new Date().toISOString()
            });

            editModal.style.display = 'none';
        } catch (error) {
            console.error('Update failed:', error);
            alert('Cập nhật thất bại.');
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = 'Cập nhật';
        }
    });

    // Close Modal Logic
    const closeModal = () => { editModal.style.display = 'none'; };
    cancelEditBtn.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);

    // Calendar Logic
    viewCalendarBtn.addEventListener('click', () => {
        currentCalendarDate = new Date();
        renderCalendar();
        calendarModal.style.display = 'flex';
    });

    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    const closeCalendar = () => { calendarModal.style.display = 'none'; };
    closeCalendarBtn.addEventListener('click', closeCalendar);

    const closePreview = () => { entryPreviewModal.style.display = 'none'; };
    closePreviewBtn.addEventListener('click', closePreview);

    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
        if (e.target === calendarModal) closeCalendar();
        if (e.target === entryPreviewModal) closePreview();
    });

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        currentMonthYear.textContent = `Tháng ${month + 1}, ${year}`;

        // Get first day of month (0 = Sunday, we want Monday = 0)
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDiv);
        }

        // Days
        const now = new Date();
        const entriesByDay = groupEntriesByDay();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (entriesByDay[dateStr]) {
                dayDiv.classList.add('has-entry');
                const lastEntry = entriesByDay[dateStr][0]; // Most recent mood of that day
                const mood = moodMap[lastEntry.mood];
                dayDiv.innerHTML = `
                    <span class="day-number">${day}</span>
                    <i class="fas ${mood.icon} day-mood-icon" style="color: ${mood.color}"></i>
                `;
                dayDiv.addEventListener('click', () => showDayPreview(dateStr, entriesByDay[dateStr]));
            } else {
                dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
            }

            if (year === now.getFullYear() && month === now.getMonth() && day === now.getDate()) {
                dayDiv.classList.add('today');
            }

            calendarGrid.appendChild(dayDiv);
        }
    }

    function groupEntriesByDay() {
        const groups = {};
        if (!window.entriesData) return groups;

        window.entriesData.forEach(entry => {
            const date = new Date(entry.timestamp || entry.createdAt);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(entry);
        });
        return groups;
    }

    function showDayPreview(dateStr, dayEntries) {
        const dateObj = new Date(dateStr);
        previewDateHeader.textContent = `Nhật ký ngày ${dateObj.toLocaleDateString('vi-VN')}`;
        previewEntriesList.innerHTML = '';

        dayEntries.forEach(entry => {
            const mood = moodMap[entry.mood];
            const time = new Date(entry.timestamp || entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            const item = document.createElement('div');
            item.className = 'preview-entry-item';
            item.style.borderLeftColor = mood.color;
            item.innerHTML = `
                <div class="preview-entry-header">
                    <span style="color: ${mood.color}; font-weight: 700;">
                        <i class="fas ${mood.icon}"></i> ${mood.label}
                    </span>
                    <span>${time}</span>
                </div>
                <div class="preview-entry-title">${entry.title}</div>
                <div class="preview-entry-content">${escapeHtml(entry.content)}</div>
            `;
            previewEntriesList.appendChild(item);
        });

        entryPreviewModal.style.display = 'flex';
    }


    // 7. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await logoutUser();
            if (result.success) window.location.href = 'login.html';
        });
    }
});

function renderEntry(entry, container) {
    const mood = moodMap[entry.mood] || moodMap['calm'];
    const date = new Date(entry.timestamp || entry.createdAt).toLocaleString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const entryEl = document.createElement('div');
    entryEl.className = 'entry-item';
    entryEl.dataset.mood = entry.mood;
    entryEl.dataset.id = entry.id;

    entryEl.innerHTML = `
        <div class="entry-header">
            <div class="entry-meta">
                <span class="entry-date"><i class="far fa-calendar-alt"></i> ${date}</span>
                <span class="entry-mood-tag" style="background-color: ${mood.color}20; color: ${mood.color}">
                    <i class="fas ${mood.icon}"></i> ${mood.label}
                </span>
            </div>
            <div class="entry-actions">
                <button class="edit-entry-btn" title="Sửa nhật ký">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-entry-btn" title="Xóa nhật ký">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <h3 class="entry-title">${entry.title}</h3>
        <div class="entry-content">${escapeHtml(entry.content)}</div>
    `;

    container.appendChild(entryEl);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
