// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

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
initializeApp(firebaseConfig);

// Get current user from localStorage
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Check user authentication status and redirect accordingly
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getCurrentUser();
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' ||
                          currentPath === '/index.html' ||
                          currentPath.endsWith('/');

    // If user is logged in and we're on the landing page, redirect to dashboard
    if (currentUser && isLandingPage) {
        window.location.href = 'dashboard.html';
    }
    // If user is NOT logged in and we're on the landing page, redirect to login
    else if (!currentUser && isLandingPage) {
        window.location.href = 'login.html';
    }
    // If user is NOT logged in and trying to access protected pages, redirect to login
    else if (!currentUser &&
            (currentPath.includes('dashboard.html') ||
             currentPath.includes('feelings.html') ||
             currentPath.includes('journal.html') ||
             currentPath.includes('meditation.html') ||
             currentPath.includes('community.html'))) {
        window.location.href = 'login.html';
    }
});
