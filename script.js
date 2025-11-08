document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES & LOCAL STORAGE KEYS ---
    let isAuthenticated = false;
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide .slide');
    const totalSlides = slides.length;
    const BOOKINGS_KEY = 'venueBookings';
    const USERS_KEY = 'registeredUsers';

    // NEW: Admin key constant - **CHANGE THIS VALUE TO A SECURE KEY**
    const SECRET_ADMIN_KEY = 'CMU-ADMIN-2025';

    // NEW VENUE DATA FOR THE MAP (Coordinates are based on percentage of map width/height)
    const VENUES = [
        { id: 1, name: "Grand Auditorium", capacity: 500, status: "available", map_x: 20, map_y: 30, details: "The largest venue. Ideal for large conferences, graduation, and major events. Max capacity: 500." },
        { id: 2, name: "Conference Room A", capacity: 50, status: "reserved", map_x: 70, map_y: 55, details: "Standard meeting room with full AV equipment and video conferencing. Max capacity: 50." },
        { id: 3, name: "Lecture Hall 101", capacity: 150, status: "available", map_x: 45, map_y: 80, details: "Tiered seating for lectures, seminars, and mid-sized presentations. Max capacity: 150." },
        { id: 4, name: "Multi-Purpose Hall", capacity: 300, status: "available", map_x: 60, map_y: 15, details: "Flexible space for sports, exhibitions, and social gatherings. Max capacity: 300." },
    ];


    // --- DOM ELEMENTS ---
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    // NEW: Admin key field elements
    const registerUserTypeSelect = document.getElementById('register-user-type');
    const adminKeyGroup = document.getElementById('admin-key-group');
    const registerAdminKeyInput = document.getElementById('register-admin-key');

    // NEW: Tracking Form elements
    const trackingForm = document.getElementById('tracking-form');
    const trackingCard = document.getElementById('tracking-card');

    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userIconToggle = document.getElementById('user-icon-toggle');
    const userDropdown = document.getElementById('user-dropdown');
    const currentUsernameSpan = document.getElementById('current-username');

    // ADMIN & NAV ELEMENTS
    const navHome = document.getElementById('nav-home');
    const navVenues = document.getElementById('nav-venues');
    const navBookings = document.getElementById('nav-bookings');
    const navAdminReview = document.getElementById('nav-admin-review');
    const venueMapDisplay = document.getElementById('venue-map-display');
    const venueModal = document.getElementById('venue-modal'); // Assuming HTML uses 'venue-modal'
    const closeBtn = venueModal ? venueModal.querySelector('.close-btn') : null; // Get the close button

    // NEW MAP ELEMENTS
    const mapScalable = document.getElementById('map-scale-pan-container');
    const mapHotspots = document.querySelectorAll('.map-hotspot');


    // --- UTILITY FUNCTIONS ---
    const getStoredBookings = () => JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    const setStoredBookings = (bookings) => localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    const getStoredUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const setStoredUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const getModalInfoPanel = () => document.getElementById('modal-venue-info');


    // --- RENDER & ACTION FUNCTIONS ---

    window.handleCancelBooking = (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;

        let bookings = getStoredBookings();
        bookings = bookings.filter(b => b.id !== bookingId);
        setStoredBookings(bookings);

        renderUserBookings();
        renderAdminBookings(); // Refresh admin view if necessary
    };

    window.handleAdminAction = (bookingId, action) => {
        let bookings = getStoredBookings();
        const bookingIndex = bookings.findIndex(b => b.id === bookingId);

        if (bookingIndex === -1) return;

        switch(action) {
            case 'approve':
                bookings[bookingIndex].approvalStatus = 'Approved';
                break;
            case 'deny':
                bookings[bookingIndex].approvalStatus = 'Denied';
                break;
            case 'pay':
                bookings[bookingIndex].paymentStatus = 'Paid';
                break;
            case 'pending':
                bookings[bookingIndex].paymentStatus = 'Pending';
                break;
            default:
                return;
        }

        setStoredBookings(bookings);
        renderAdminBookings();
        renderUserBookings(); // Ensure user view updates
    };


    const renderUserBookings = () => {
        const tableBody = document.querySelector('#bookings-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

        if (!currentUser) return;

        const userBookings = getStoredBookings().filter(b => b.userId === currentUser.id);

        userBookings.forEach(booking => {
            const row = tableBody.insertRow();

            const statusClass = booking.approvalStatus.toLowerCase().replace(' ', '-');
            const paymentClass = booking.paymentStatus.toLowerCase();

            row.innerHTML = `<td>${booking.refId}</td> <td>${booking.venue}</td><td>${booking.date}<br>(${booking.startTime} - ${booking.endTime})</td> <td><span class="status-${statusClass}">${booking.approvalStatus}</span></td> <td><span class="status-${paymentClass}">${booking.paymentStatus}</span></td> <td>
    ${booking.approvalStatus === 'Pending Review' ?
                        `<button class="cancel-btn" onclick="handleCancelBooking(${booking.id})">Cancel</button>` :
                        '-'
                    }
                </td>
            `;
        });
    };

    const renderAdminBookings = () => {
        const tableBody = document.querySelector('#admin-bookings-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const bookings = getStoredBookings();

        bookings.forEach(booking => {
            const row = tableBody.insertRow();

            const statusClass = booking.approvalStatus.toLowerCase().replace(' ', '-');
            const paymentClass = booking.paymentStatus.toLowerCase();

            // 1. Ref ID
            row.insertCell().textContent = booking.refId;
          
            // 2. User/Role
            row.insertCell().textContent = booking.username;
            row.insertCell().textContent = booking.userRole;
            // 3. Venue
            row.insertCell().textContent = booking.venue;
            // 4. Date/Time
            row.insertCell().innerHTML = `${booking.date}<br>(${booking.startTime} - ${booking.endTime})`;

            // 5. Purpose/Requirements
            const reqsCell = row.insertCell();
            const filesHtml = booking.files ? `(${booking.files.split(', ').length} file(s) attached)` : '(No files)';
            reqsCell.innerHTML = `<p>${booking.purpose.substring(0, 50)}...</p><p style="font-size: 0.8em; color: #00A99D;">${filesHtml}</p>`;

            // 6. Payment Status/Toggle
            const paymentCell = row.insertCell();
            paymentCell.innerHTML = `
                <span class="status-${paymentClass}">${booking.paymentStatus}</span><br>
                <button class="approve-btn" style="margin-top: 5px; padding: 5px 10px;" onclick="handleAdminAction(${booking.id}, '${booking.paymentStatus === 'Paid' ? 'pending' : 'pay'}')">
                    ${booking.paymentStatus === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                </button>
            `;

            // 7. Actions (Approve/Deny)
            const actionsCell = row.insertCell();
            actionsCell.classList.add('action-buttons');

            if (booking.approvalStatus === 'Pending Review') {
                actionsCell.innerHTML = `
                    <button class="approve-btn" onclick="handleAdminAction(${booking.id}, 'approve')">Approve</button>
                    <button class="deny-btn" onclick="handleAdminAction(${booking.id}, 'deny')">Deny</button>
                `;
            } else {
                actionsCell.innerHTML = `
                    <span class="status-${booking.approvalStatus.toLowerCase().replace(' ', '-')}" style="white-space: nowrap;">
                        ${booking.approvalStatus}
                    </span>
                `;
            }
        });
    };

    const renderBookingSelect = () => {
        const select = document.getElementById('booking-venue');
        if (!select) return;

        select.innerHTML = ''; // Clear previous options
        VENUES.forEach(venue => {
            const option = document.createElement('option');
            // FIX: Ensure value is the venue name for submission, or ID for lookup consistency
            option.value = venue.name; 
            option.textContent = venue.name;
            select.appendChild(option);
        });
    };

    const switchTab = (tabId) => {
        // Hide all tabs
        document.querySelectorAll('.portal-tab').forEach(tab => tab.classList.remove('active'));
        // Show the requested tab
        document.getElementById(tabId).classList.add('active');

        // Update active class on nav links
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const navLink = document.getElementById(`nav-${tabId.replace('-tab', '')}`);
        if (navLink) {
            navLink.classList.add('active');
        }

        // Store the active tab (only for authenticated users)
        if (isAuthenticated) {
            sessionStorage.setItem('lastActiveTab', tabId);
        }

        // RENDER ADMIN BOOKINGS WHEN ADMIN TAB IS SHOWN (Ensures fresh data)
        if (tabId === 'admin-review-tab') {
            renderAdminBookings();
        }
    };


    // --- CAROUSEL LOGIC ---

    const updateCarousel = () => {
        const offset = -currentSlide * 100;
        const slideContainer = document.getElementById('carousel-slide');
        if (slideContainer) {
            slideContainer.style.transform = `translateX(${offset}%)`;
        }
    };

    const nextSlide = () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    };

    const prevSlide = () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    };
    
    // --- MAP LOGIC (Pan/Zoom/Hotspot) ---

    // State variables for map interaction
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX, startY;
    let mapRect;

    const applyTransform = () => {
        if (!mapScalable) return;
        mapScalable.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    };
    
    // FIX: Replaced undeclared 'mapContainer' with 'venueMapDisplay'
    const restrictBoundaries = () => {
        if (!venueMapDisplay || scale === 1) return; 
        
        // Update rectangle dimensions
        mapRect = venueMapDisplay.getBoundingClientRect();

        const maxOffsetX = mapRect.width * (1 - scale);
        const maxOffsetY = mapRect.height * (1 - scale);
        
        // Clamp offsets
        offsetX = Math.min(0, Math.max(offsetX, maxOffsetX));
        offsetY = Math.min(0, Math.max(offsetY, maxOffsetY));

        applyTransform();
    }


    const renderVenueModal = (venue) => {
        const infoPanel = getModalInfoPanel();
        if (!infoPanel || !venueModal) return; // Ensure modal is defined

        const statusClass = venue.status.toLowerCase();
        
        infoPanel.innerHTML = `
            <h2>${venue.name}</h2>
            <p>${venue.details}</p>
            <p><strong>Capacity:</strong> ${venue.capacity} guests</p>
            <div class="venue-status ${statusClass}">${venue.status}</div>
            <button id="details-book-btn" class="book-now-btn" data-venue-name="${venue.name}">Proceed to Booking</button>
        `;
        venueModal.classList.add('show');
    };


    // --- AUTHENTICATION & SESSION MANAGEMENT ---

    const checkSession = () => {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUser) {
            isAuthenticated = true;
            splashScreen.classList.add('hidden');
            mainContent.classList.remove('hidden');
            currentUsernameSpan.textContent = currentUser.username;
            userIconToggle.textContent = currentUser.username.charAt(0).toUpperCase();


            // Show/Hide Admin Tab
            const isAdmin = currentUser.userType === 'Admin';
            navAdminReview.classList.toggle('hidden-admin', !isAdmin);

            // Navigate to last active tab or default
            const lastActiveTab = sessionStorage.getItem('lastActiveTab') || 'home-tab';
            
            // Check if user is NOT admin but last tab was admin, default to home
            const targetTab = (lastActiveTab === 'admin-review-tab' && !isAdmin) ? 'home-tab' : lastActiveTab;

            switchTab(targetTab);
            
            // Render specific data
            renderBookingSelect();
            renderUserBookings();
            renderAdminBookings();

        } else {
            isAuthenticated = false;
            splashScreen.classList.remove('hidden');
            mainContent.classList.add('hidden');
            sessionStorage.clear(); // Clear session on non-authenticated load
            // Ensure login card is visible by default
            loginCard.classList.remove('hidden');
            registerCard.classList.add('hidden');
        }
    };


    // --- EVENT LISTENERS ---

    // Login/Register Form Switching
    showRegisterBtn.addEventListener('click', () => {
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });
    
    // Register User Type Change (for Admin Key field)
    registerUserTypeSelect.addEventListener('change', (e) => {
        const isSelectedAdmin = e.target.value === 'Admin';
        adminKeyGroup.classList.toggle('hidden', !isSelectedAdmin);
        registerAdminKeyInput.required = isSelectedAdmin;
    });

    // Login Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('error-message');

        const users = getStoredUsers();
        const user = users.find(u => (u.username === username || u.email === username) && u.password === password);

        if (user) {
            // FIX: Ensure userType is stored correctly (used 'role' previously, standardizing to 'userType')
            sessionStorage.setItem('currentUser', JSON.stringify({...user, userType: user.role || user.userType || 'Student'}));
            errorMessage.textContent = '';
            checkSession();
        } else {
            errorMessage.textContent = 'Invalid username/email or password.';
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const errorMessage = document.getElementById('register-error-message');
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const userType = registerUserTypeSelect.value;
        const organization = document.getElementById('register-organization').value;
        const adminKey = registerAdminKeyInput.value;

        if (userType === 'Admin' && adminKey !== SECRET_ADMIN_KEY) {
            errorMessage.textContent = 'Invalid Admin Secret Key.';
            return;
        }

        let users = getStoredUsers();
        if (users.some(u => u.username === username)) {
            errorMessage.textContent = 'Username already exists.';
            return;
        }
        if (users.some(u => u.email === email)) {
            errorMessage.textContent = 'Email already exists.';
            return;
        }

        const newUser = {
            id: Date.now(),
            username,
            email,
            password,
            userType,
            organization
        };

        users.push(newUser);
        setStoredUsers(users);

        // Auto-login new user
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));
        errorMessage.textContent = '';
        checkSession();
    });

    // Tracking Form Submission
    trackingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const refId = document.getElementById('tracking-ref-id').value.toUpperCase();
        const output = document.getElementById('tracking-output');
        const bookings = getStoredBookings();
        const booking = bookings.find(b => b.refId === refId);

        if (booking) {
            output.innerHTML = `
                <strong>Status:</strong> <span class="status-${booking.approvalStatus.toLowerCase().replace(' ', '-')}">${booking.approvalStatus}</span><br>
                <strong>Venue:</strong> ${booking.venue}<br>
                <strong>Date:</strong> ${booking.date} (${booking.startTime} - ${booking.endTime})
            `;
            output.style.color = '#203F4A';
        } else {
            output.textContent = 'Error: Reference ID not found.';
            output.style.color = '#d32f2f';
        }
    });

    // Header Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = e.target.id.replace('nav-', '') + '-tab';
            switchTab(tabId);
        });
    });

    // User Dropdown Toggle
    userIconToggle.addEventListener('click', () => {
        userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userIconToggle.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('lastActiveTab');
        isAuthenticated = false;
        userDropdown.classList.remove('show');
        checkSession();
    });
    
    // Booking Form Submission
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const bookingMessage = document.getElementById('booking-message');
        
        // Basic form validation (for time clash, a server would be needed)
        const venueName = document.getElementById('booking-venue').value;
        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('booking-start-time').value;
        const endTime = document.getElementById('booking-end-time').value;
        const purpose = document.getElementById('booking-purpose').value;
        // FIX: Changed ID to match HTML
        const files = document.getElementById('booking-requirements-file').files; 
        const fileNames = Array.from(files).map(f => f.name).join(', ');

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

        // Simple unique ID for booking (not globally unique, but unique for the session)
        const refId = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const newBooking = {
            id: Date.now(),
            refId: refId,
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.userType,
            venue: venueName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            purpose: purpose,
            files: fileNames,
            approvalStatus: 'Pending Review',
            paymentStatus: 'Pending' // Initial payment status
        };

        const bookings = getStoredBookings();
        bookings.push(newBooking);
        setStoredBookings(bookings);

        bookingMessage.textContent = `Success! Your reservation for ${venueName} is submitted. Reference ID: ${refId}`;
        bookingMessage.style.color = '#00A99D'; // Green for success
        bookingForm.reset();

        renderUserBookings(); // Refresh user table
        renderAdminBookings(); // Refresh admin table
    });

    // Sub-tab switching logic for My Bookings
    document.querySelectorAll('.tabs .tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active from all buttons and content
            document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active to clicked button
            e.target.classList.add('active');

            // Show corresponding content
            const targetTabId = e.target.dataset.tab;
            document.getElementById(targetTabId).classList.add('active');
        });
    });


    // --- CAROUSEL BUTTON EVENT LISTENERS (NEW) ---
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
    }
    
   
    // --- HOTSPOT & MODAL FUNCTIONALITY ---

    mapHotspots.forEach(hotspot => {
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents map dragging/panning from interfering

            const venueId = parseInt(hotspot.dataset.venueId);
            const venue = VENUES.find(v => v.id === venueId);
            
            if (venue) {
                renderVenueModal(venue);
            }
        });
    });

    // Close Modal on Close Button Click
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            venueModal.classList.remove('show');
        });
    }

    // Close Modal on Outside Click
    window.addEventListener('click', (event) => {
        if (event.target === venueModal) {
            venueModal.classList.remove('show');
        }
    });

    // Handle "Proceed to Booking" button click inside modal
    window.addEventListener('click', (e) => {
        if (e.target.id === 'details-book-btn') {
            const venueName = e.target.dataset.venueName;
            
            // 1. Close the modal
            venueModal.classList.remove('show');
            
            // 2. Switch to the Booking tab
            switchTab('bookings-tab');

            // 3. Select the venue in the dropdown
            const bookingSelect = document.getElementById('booking-venue');
            if (bookingSelect) {
                bookingSelect.value = venueName;
            }

            // Ensure the 'New Booking' sub-tab is selected and active
            document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelector('.tabs .tab-btn[data-tab="new-booking-section"]').classList.add('active');
            document.getElementById('new-booking-section').classList.add('active');
        }
    });


    // --- INITIALIZATION ---
    window.renderAdminBookings = renderAdminBookings;
    window.renderVenueModal = renderVenueModal; 

    checkSession();
});