import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, remove, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase config
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

// State
let currentUser = null;
const SHARED_PATH = 'shared/dalat_travel';

// DOM Elements
const travelModal = document.getElementById('travelModal');
const travelForm = document.getElementById('travelForm');
const saveTravelBtn = document.getElementById('saveTravelBtn');
const itineraryList = document.getElementById('itineraryList');
const locationGrid = document.getElementById('locationGrid');
const checklistContainer = document.getElementById('checklistContainer');
const travelNotes = document.getElementById('travelNotes');
const saveNotesBtn = document.getElementById('saveNotesBtn');
const notesStatus = document.getElementById('notesStatus');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUIOnAuth(user);
    } else {
        // Since it's a shared page, we might want to allow viewing, 
        // but let's check localStorage as well which is used by this project
        const storedUser = JSON.parse(localStorage.getItem('currentUser'));
        if (storedUser) {
            currentUser = storedUser;
            updateUIOnAuth(storedUser);
        } else {
            window.location.href = 'login.html';
        }
    }
});

function updateUIOnAuth(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameElem = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userInfo && userNameElem) {
        userInfo.style.display = 'flex';
        const name = user.displayName || user.username || user.email.split('@')[0];
        userNameElem.textContent = name;
        if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
    }
}

// Load Data
function loadTravelData() {
    const travelRef = ref(db, SHARED_PATH);
    
    onValue(travelRef, (snapshot) => {
        const data = snapshot.val() || {};
        const plans = data.plans || {};
        const locations = data.locations || {};
        const checklist = data.checklist || {};
        
        renderItinerary(plans);
        renderLocations(locations);
        renderChecklist(checklist);
        
        // Load notes once
        if (data.notes !== undefined && travelNotes.value === '') {
            travelNotes.value = data.notes;
            const lastUpdated = data.notesUpdatedAt ? new Date(data.notesUpdatedAt).toLocaleString('vi-VN') : 'vừa xong';
            notesStatus.textContent = `Đã cập nhật lúc: ${lastUpdated}`;
        }
        
        // Update stats
        document.getElementById('locationCount').textContent = Object.keys(locations).length;
        document.getElementById('planCount').textContent = Object.keys(plans).length;
    });
}

// Render Functions
function renderItinerary(plans) {
    if (!itineraryList) return;
    
    const planArray = Object.entries(plans).map(([id, val]) => ({ id, ...val }));
    
    // Sort by date then time
    planArray.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
        return dateA - dateB;
    });

    if (planArray.length === 0) {
        itineraryList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plane-departure"></i>
                <p>Chưa có lịch trình nào được lập...</p>
            </div>
        `;
        return;
    }

    itineraryList.innerHTML = '';
    planArray.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'itinerary-item';
        
        // Format date
        const dateObj = new Date(plan.date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        
        item.innerHTML = `
            <div class="itinerary-time">
                <span class="time-val">${plan.time || '--:--'}</span>
                <span class="date-val">${day}/${month}</span>
            </div>
            <div class="itinerary-info">
                <h4>${plan.title}</h4>
                <p>${plan.desc || ''}</p>
            </div>
            <div class="item-actions">
                <button class="action-btn" onclick="editItem('plan', '${plan.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteItem('plans', '${plan.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        itineraryList.appendChild(item);
    });
}

function renderLocations(locations) {
    if (!locationGrid) return;
    
    const locArray = Object.entries(locations).map(([id, val]) => ({ id, ...val }));

    if (locArray.length === 0) {
        locationGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-map-marked-alt"></i>
                <p>Chưa có địa điểm nào được thêm vào...</p>
            </div>
        `;
        return;
    }

    locationGrid.innerHTML = '';
    locArray.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'location-card';
        
        const imgSrc = loc.image || 'https://images.unsplash.com/photo-1596395819057-e37f55a8519a?auto=format&fit=crop&q=80&w=600';
        
        card.innerHTML = `
            <div class="loc-img" style="background-image: url('${imgSrc}')"></div>
            <div class="loc-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4>${loc.title}</h4>
                    <div class="item-actions">
                        <button class="action-btn" onclick="editItem('location', '${loc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteItem('locations', '${loc.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <p>${loc.desc || ''}</p>
            </div>
        `;
        locationGrid.appendChild(card);
    });
}

function renderChecklist(checklist) {
    if (!checklistContainer) return;
    
    const checkArray = Object.entries(checklist).map(([id, val]) => ({ id, ...val }));

    if (checkArray.length === 0) {
        checklistContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Danh sách chuẩn bị đang trống...</p>
            </div>
        `;
        return;
    }

    checklistContainer.innerHTML = '';
    checkArray.forEach(item => {
        const div = document.createElement('div');
        div.className = `checklist-item ${item.completed ? 'completed' : ''}`;
        
        div.innerHTML = `
            <input type="checkbox" class="check-input" ${item.completed ? 'checked' : ''} 
                onchange="toggleChecklistItem('${item.id}', this.checked)">
            <span class="check-text">${item.title}</span>
            <div class="item-actions">
                <button class="action-btn delete" onclick="deleteItem('checklist', '${item.id}')"><i class="fas fa-times"></i></button>
            </div>
        `;
        checklistContainer.appendChild(div);
    });
}

// Modal Functions
window.openModal = function(type) {
    document.getElementById('itemType').value = type;
    document.getElementById('itemId').value = '';
    
    // Reset forms
    document.getElementById('planFields').style.display = type === 'plan' ? 'block' : 'none';
    document.getElementById('locationFields').style.display = type === 'location' ? 'block' : 'none';
    document.getElementById('checklistFields').style.display = type === 'checklist' ? 'block' : 'none';
    
    const titles = {
        'plan': 'Thêm hoạt động',
        'location': 'Thêm địa điểm định đến',
        'checklist': 'Thêm đồ cần chuẩn bị'
    };
    document.getElementById('modalTitle').textContent = titles[type];
    
    travelForm.reset();
    travelModal.classList.add('active');
};

window.closeModal = function() {
    travelModal.classList.remove('active');
};

// Edit/Delete
window.editItem = async (type, id) => {
    // We need to fetch data for the item
    const path = `${SHARED_PATH}/${type === 'plan' ? 'plans' : type + 's'}/${id}`;
    const itemRef = ref(db, path);
    onValue(itemRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        openModal(type);
        document.getElementById('itemId').value = id;
        
        if (type === 'plan') {
            document.getElementById('planDate').value = data.date;
            document.getElementById('planTime').value = data.time;
            document.getElementById('planTitle').value = data.title;
            document.getElementById('planDesc').value = data.desc;
        } else if (type === 'location') {
            document.getElementById('locTitle').value = data.title;
            document.getElementById('locImage').value = data.image;
            document.getElementById('locDesc').value = data.desc;
        } else if (type === 'checklist') {
            document.getElementById('checkTitle').value = data.title;
        }
    }, { onlyOnce: true });
};

window.deleteItem = async (folder, id) => {
    if (confirm('Bạn có chắc muốn xóa không?')) {
        await remove(ref(db, `${SHARED_PATH}/${folder}/${id}`));
    }
};

window.toggleChecklistItem = async (id, completed) => {
    await update(ref(db, `${SHARED_PATH}/checklist/${id}`), { completed });
};

// Save
saveTravelBtn.addEventListener('click', async () => {
    const type = document.getElementById('itemType').value;
    const id = document.getElementById('itemId').value;
    
    let data = {};
    let folder = '';
    
    if (type === 'plan') {
        folder = 'plans';
        data = {
            date: document.getElementById('planDate').value,
            time: document.getElementById('planTime').value,
            title: document.getElementById('planTitle').value,
            desc: document.getElementById('planDesc').value
        };
        if (!data.date || !data.title) return alert('Vui lòng nhập ngày và tên hoạt động');
    } else if (type === 'location') {
        folder = 'locations';
        data = {
            title: document.getElementById('locTitle').value,
            image: document.getElementById('locImage').value,
            desc: document.getElementById('locDesc').value
        };
        if (!data.title) return alert('Vui lòng nhập tên địa điểm');
    } else if (type === 'checklist') {
        folder = 'checklist';
        data = {
            title: document.getElementById('checkTitle').value,
            completed: false
        };
        if (!data.title) return alert('Vui lòng nhập tên đồ vật');
    }
    
    try {
        if (id) {
            await update(ref(db, `${SHARED_PATH}/${folder}/${id}`), data);
        } else {
            await push(ref(db, `${SHARED_PATH}/${folder}`), data);
        }
        closeModal();
    } catch (error) {
        console.error("Error saving travel data:", error);
        alert('Lỗi khi lưu dữ liệu!');
    }
});

// Save Notes
if (saveNotesBtn) {
    saveNotesBtn.addEventListener('click', async () => {
        const notes = travelNotes.value;
        const timestamp = Date.now();
        
        saveNotesBtn.disabled = true;
        saveNotesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        
        try {
            await update(ref(db, SHARED_PATH), {
                notes: notes,
                notesUpdatedAt: timestamp
            });
            
            notesStatus.textContent = `Đã lưu lúc: ${new Date(timestamp).toLocaleString('vi-VN')}`;
            setTimeout(() => {
                saveNotesBtn.disabled = false;
                saveNotesBtn.innerHTML = '<i class="fas fa-save"></i> Lưu ghi chú';
            }, 1000);
        } catch (error) {
            console.error("Error saving notes:", error);
            alert('Lỗi khi lưu ghi chú!');
            saveNotesBtn.disabled = false;
            saveNotesBtn.innerHTML = '<i class="fas fa-save"></i> Lưu ghi chú';
        }
    });
}

// Init
loadTravelData();
