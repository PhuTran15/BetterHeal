/**
 * BetterHeal Mobile Navigation Logic
 */

const initNavigation = () => {
    const header = document.querySelector('.premium-header');
    if (!header) return;

    const navbarContainer = header.querySelector('.navbar-container');
    const navMenu = header.querySelector('.nav-menu');
    if (!navMenu) return;

    // Create Mobile Toggle Button if not exists
    let mobileToggle = header.querySelector('.mobile-toggle');
    if (!mobileToggle && navbarContainer) {
        mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-toggle';
        mobileToggle.setAttribute('aria-label', 'Toggle Menu');
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        navbarContainer.prepend(mobileToggle);
    }

    // Create Overlay if not exists
    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);
    }

    // Toggle Function
    const toggleMenu = () => {
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        const isActive = navMenu.classList.contains('active');
        mobileToggle.innerHTML = isActive ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        document.body.style.overflow = isActive ? 'hidden' : '';
    };

    if (mobileToggle) {
        // Clone and replace to avoid multiple listeners if init called twice
        const newToggle = mobileToggle.cloneNode(true);
        mobileToggle.parentNode.replaceChild(newToggle, mobileToggle);
        mobileToggle = newToggle;
        
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    if (overlay) {
        // Clone and replace to avoid multiple listeners
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);
        overlay = newOverlay;
        
        overlay.addEventListener('click', toggleMenu);
    }

    // Close menu on link click (for mobile)
    const navLinks = navMenu.querySelectorAll('.nav-link-custom');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Close on escape key
    document.removeEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleEsc);
};

const handleEsc = (e) => {
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.nav-overlay');
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        const mobileToggle = document.querySelector('.mobile-toggle');
        if (mobileToggle) mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
};

// Run immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}
