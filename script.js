document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- STATE VARIABLES & LOCAL STORAGE KEYS ---
    let isAuthenticated = false;
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide .slide') || [];
    const totalSlides = slides.length;
    const BOOKINGS_KEY = 'venueBookings';
    const USERS_KEY = 'registeredUsers';

    // NEW: Admin key constant - **CHANGE THIS VALUE TO A SECURE KEY**
    const SECRET_ADMIN_KEY = 'CMU-ADMIN-2025';

    // NEW VENUE DATA FOR THE MAP (Coordinates are based on percentage of map width/height)
    const VENUES = [
        {
            id: 1,
            name: 'Grand Auditorium',
            capacity: 500,
            status: 'Available',
            map_x: 20,
            map_y: 30,
            details:
                'The largest venue. Ideal for large conferences, graduation, and major events. Max capacity: 500.',
        },
        {
            id: 2,
            name: 'Conference Room A',
            capacity: 50,
            status: 'Reserved',
            map_x: 70,
            map_y: 55,
            details:
                'Standard meeting room with full AV equipment and video conferencing. Max capacity: 50.',
        },
        {
            id: 3,
            name: 'Lecture Hall 101',
            capacity: 150,
            status: 'Available',
            map_x: 45,
            map_y: 80,
            details:
                'Tiered seating for lectures, seminars, and mid-sized presentations. Max capacity: 150.',
        },
        {
            id: 4,
            name: 'Multi-Purpose Hall',
            capacity: 300,
            status: 'Available',
            map_x: 60,
            map_y: 15,
            details:
                'Flexible space for sports, exhibitions, and social gatherings. Max capacity: 300.',
        },
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

    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userIconToggle = document.getElementById('user-icon-toggle');
    const userDropdown = document.getElementById('user-dropdown');
    const currentUsernameSpan = document.getElementById('current-username');

    // ADMIN & NAV ELEMENTS
    const navAdminReview = document.getElementById('nav-admin-review');
    const venueMapDisplay = document.getElementById('venue-map-display');
    const venueModal = document.getElementById('venue-modal');
    const closeBtn = venueModal ? venueModal.querySelector('.close-btn') : null;

    // NEW MAP ELEMENTS
    const mapScalable = document.getElementById('map-scale-pan-container');
    const mapHotspots = document.querySelectorAll('.map-hotspot') || [];

    // --- UTILITY FUNCTIONS ---
    const getStoredBookings = () => JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    const setStoredBookings = (bookings) => localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    const getStoredUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const setStoredUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const getModalInfoPanel = () => document.getElementById('modal-venue-info');

    // --- RENDER & ACTION FUNCTIONS ---
    window.handleCancelBooking = (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            return;
        }

        let bookings = getStoredBookings();
        bookings = bookings.filter((b) => b.id !== bookingId);
        setStoredBookings(bookings);

        renderUserBookings();
        renderAdminBookings(); // Refresh admin view if necessary
    };

    window.handleAdminAction = (bookingId, action) => {
        const bookings = getStoredBookings();
        const bookingIndex = bookings.findIndex((b) => b.id === bookingId);

        if (bookingIndex === -1) {
            return;
        }

        switch (action) {
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
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '';
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

        if (!currentUser) {
            return;
        }

        const userBookings = getStoredBookings().filter((b) => b.userId === currentUser.id);

        userBookings.forEach((booking) => {
            const row = tableBody.insertRow();

            const approvalStatus = booking.approvalStatus || 'Pending Review';
            const paymentStatus = booking.paymentStatus || 'Pending';

            const statusClass = approvalStatus.toLowerCase().replace(/ /g, '-');
            const paymentClass = paymentStatus.toLowerCase().replace(/ /g, '-');

            row.innerHTML = `
                <td>${booking.refId || ''}</td>
                <td>${booking.venue || ''}</td>
                <td>${booking.date || ''}<br>(${booking.startTime || ''} - ${booking.endTime || ''})</td>
                <td><span class="status-${statusClass}">${approvalStatus}</span></td>
                <td><span class="status-${paymentClass}">${paymentStatus}</span></td>
                <td>
                    ${
                        approvalStatus === 'Pending Review'
                            ? `<button class="cancel-btn" onclick="handleCancelBooking(${booking.id})">Cancel</button>`
                            : '-'
                    }
                </td>
            `;
        });
    };

    const renderAdminBookings = () => {
        const tableBody = document.querySelector('#admin-bookings-table tbody');
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '';
        const bookings = getStoredBookings();

        bookings.forEach((booking) => {
            const row = tableBody.insertRow();

            const approvalStatus = booking.approvalStatus || 'Pending Review';
            const paymentStatus = booking.paymentStatus || 'Pending';

            const statusClass = approvalStatus.toLowerCase().replace(/ /g, '-');
            const paymentClass = paymentStatus.toLowerCase().replace(/ /g, '-');

            // 1. Ref ID
            row.insertCell().textContent = booking.refId || '';

            // 2. User/Role
            row.insertCell().textContent = booking.username || '';
            row.insertCell().textContent = booking.userRole || '';

            // 3. Venue
            row.insertCell().textContent = booking.venue || '';

            // 4. Date/Time
            row.insertCell().innerHTML = `${booking.date || ''}<br>(${booking.startTime || ''} - ${booking.endTime || ''})`;

            // 5. Purpose/Requirements
            const reqsCell = row.insertCell();
            const filesHtml = booking.files ? `(${booking.files.split(', ').length} file(s) attached)` : '(No files)';
            const purposeText = booking.purpose ? booking.purpose.substring(0, 50) : '';
            reqsCell.innerHTML = `<p>${purposeText}${booking.purpose && booking.purpose.length > 50 ? '...' : ''}</p><p style="font-size: 0.8em; color: #00A99D;">${filesHtml}</p>`;

            // 6. Payment Status/Toggle
            const paymentCell = row.insertCell();
            paymentCell.innerHTML = `
                <span class="status-${paymentClass}">${paymentStatus}</span><br>
                <button class="approve-btn" style="margin-top: 5px; padding: 5px 10px;" onclick="handleAdminAction(${booking.id}, '${paymentStatus === 'Paid' ? 'pending' : 'pay'}')">
                    ${paymentStatus === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                </button>
            `;

            // 7. Actions (Approve/Deny)
            const actionsCell = row.insertCell();
            actionsCell.classList.add('action-buttons');

            if (approvalStatus === 'Pending Review') {
                actionsCell.innerHTML = `
                    <button class="approve-btn" onclick="handleAdminAction(${booking.id}, 'approve')">Approve</button>
                    <button class="deny-btn" onclick="handleAdminAction(${booking.id}, 'deny')">Deny</button>
                `;
            } else {
                actionsCell.innerHTML = `
                    <span class="status-${statusClass}" style="white-space: nowrap;">
                        ${approvalStatus}
                    </span>
                `;
            }
        });
    };

    const renderBookingSelect = () => {
        const select = document.getElementById('booking-venue');
        if (!select) {
            return;
        }

        select.innerHTML = ''; // Clear previous options
        VENUES.forEach((venue) => {
            const option = document.createElement('option');
            option.value = venue.name;
            option.textContent = venue.name;
            select.appendChild(option);
        });
    };

    const switchTab = (tabId) => {
        // Hide all tabs
        document.querySelectorAll('.portal-tab').forEach((tab) => tab.classList.remove('active'));
        // Show the requested tab
        const target = document.getElementById(tabId);
        if (target) {
            target.classList.add('active');
        }

        // Update active class on nav links
        document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
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
        if (totalSlides === 0) {
            return;
        }
        const offset = -currentSlide * 100;
        const slideContainer = document.getElementById('carousel-slide');
        if (slideContainer) {
            slideContainer.style.transform = `translateX(${offset}%)`;
        }
    };

    const nextSlide = () => {
        if (totalSlides === 0) {
            return;
        }
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    };

    const prevSlide = () => {
        if (totalSlides === 0) {
            return;
        }
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    };

    // --- MAP LOGIC (Pan/Zoom/Hotspot) ---
    // State variables for map interaction (prefixed underscored if unused presently)
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let _isDragging = false;
    let _startX;
    let _startY;
    let mapRect;

    const applyTransform = () => {
        if (!mapScalable) {
            return;
        }
        mapScalable.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    };

    const restrictBoundaries = () => {
        if (!venueMapDisplay || scale === 1) {
            return;
        }

        mapRect = venueMapDisplay.getBoundingClientRect();

        const maxOffsetX = mapRect.width * (1 - scale);
        const maxOffsetY = mapRect.height * (1 - scale);

        offsetX = Math.min(0, Math.max(offsetX, maxOffsetX));
        offsetY = Math.min(0, Math.max(offsetY, maxOffsetY));

        applyTransform();
    };

    const renderVenueModal = (venue) => {
        const infoPanel = getModalInfoPanel();
        if (!infoPanel || !venueModal) {
            return;
        }

        const statusClass = (venue.status || '').toLowerCase();

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
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser) {
            isAuthenticated = true;
            if (splashScreen) {
                splashScreen.classList.add('hidden');
            }
            if (mainContent) {
                mainContent.classList.remove('hidden');
            }
            if (currentUsernameSpan) {
                currentUsernameSpan.textContent = currentUser.username || '';
            }
            if (userIconToggle && currentUser.username) {
                userIconToggle.textContent = currentUser.username.charAt(0).toUpperCase();
            }

            const isAdmin = currentUser.userType === 'Admin';
            if (navAdminReview) {
                navAdminReview.classList.toggle('hidden-admin', !isAdmin);
            }

            const lastActiveTab = sessionStorage.getItem('lastActiveTab') || 'home-tab';
            const targetTab = lastActiveTab === 'admin-review-tab' && !isAdmin ? 'home-tab' : lastActiveTab;

            switchTab(targetTab);

            renderBookingSelect();
            renderUserBookings();
            renderAdminBookings();
        } else {
            isAuthenticated = false;
            if (splashScreen) {
                splashScreen.classList.remove('hidden');
            }
            if (mainContent) {
                mainContent.classList.add('hidden');
            }
            sessionStorage.clear();
            if (loginCard) {
                loginCard.classList.remove('hidden');
            }
            if (registerCard) {
                registerCard.classList.add('hidden');
            }
        }
    };

    // --- EVENT LISTENERS ---
    if (showRegisterBtn && loginCard && registerCard) {
        showRegisterBtn.addEventListener('click', () => {
            loginCard.classList.add('hidden');
            registerCard.classList.remove('hidden');
        });
    }

    if (showLoginBtn && loginCard && registerCard) {
        showLoginBtn.addEventListener('click', () => {
            registerCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
        });
    }

    if (registerUserTypeSelect && adminKeyGroup && registerAdminKeyInput) {
        registerUserTypeSelect.addEventListener('change', (e) => {
            const isSelectedAdmin = e.target.value === 'Admin';
            adminKeyGroup.classList.toggle('hidden', !isSelectedAdmin);
            registerAdminKeyInput.required = !!isSelectedAdmin;
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameEl = document.getElementById('login-username');
            const passwordEl = document.getElementById('login-password');
            const username = usernameEl ? usernameEl.value : '';
            const password = passwordEl ? passwordEl.value : '';
            const errorMessage = document.getElementById('error-message');

            const users = getStoredUsers();
            const user = users.find((u) => (u.username === username || u.email === username) && u.password === password);

            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify({ ...user, userType: user.role || user.userType || 'Student' }));
                if (errorMessage) {
                    errorMessage.textContent = '';
                }
                checkSession();
            } else if (errorMessage) {
                errorMessage.textContent = 'Invalid username/email or password.';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const errorMessage = document.getElementById('register-error-message');
            const usernameEl = document.getElementById('register-username');
            const emailEl = document.getElementById('register-email');
            const passwordEl = document.getElementById('register-password');
            const organizationEl = document.getElementById('register-organization');

            const username = usernameEl ? usernameEl.value : '';
            const email = emailEl ? emailEl.value : '';
            const password = passwordEl ? passwordEl.value : '';
            const userType = registerUserTypeSelect ? registerUserTypeSelect.value : 'Student';
            const organization = organizationEl ? organizationEl.value : '';
            const adminKey = registerAdminKeyInput ? registerAdminKeyInput.value : '';

            if (userType === 'Admin' && adminKey !== SECRET_ADMIN_KEY) {
                if (errorMessage) {
                    errorMessage.textContent = 'Invalid Admin Secret Key.';
                }
                return;
            }

            const users = getStoredUsers();
            if (users.some((u) => u.username === username)) {
                if (errorMessage) {
                    errorMessage.textContent = 'Username already exists.';
                }
                return;
            }
            if (users.some((u) => u.email === email)) {
                if (errorMessage) {
                    errorMessage.textContent = 'Email already exists.';
                }
                return;
            }

            const newUser = {
                id: Date.now(),
                username,
                email,
                password,
                userType,
                organization,
            };

            users.push(newUser);
            setStoredUsers(users);

            sessionStorage.setItem('currentUser', JSON.stringify(newUser));
            if (errorMessage) {
                errorMessage.textContent = '';
            }
            checkSession();
        });
    }

    if (trackingForm) {
        trackingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const refInput = document.getElementById('tracking-ref-id');
            const refId = refInput ? refInput.value.toUpperCase() : '';
            const output = document.getElementById('tracking-output');
            const bookings = getStoredBookings();
            const booking = bookings.find((b) => b.refId === refId);

            if (!output) {
                return;
            }

            if (booking) {
                output.innerHTML = `
                    <strong>Status:</strong> <span class="status-${(booking.approvalStatus || 'Pending Review').toLowerCase().replace(/ /g, '-')}">${booking.approvalStatus}</span><br>
                    <strong>Venue:</strong> ${booking.venue}<br>
                    <strong>Date:</strong> ${booking.date} (${booking.startTime} - ${booking.endTime})
                `;
                output.style.color = '#203F4A';
            } else {
                output.textContent = 'Error: Reference ID not found.';
                output.style.color = '#d32f2f';
            }
        });
    }

    const navLinks = document.querySelectorAll('.nav-link') || [];
    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = e.target.id.replace('nav-', '') + '-tab';
            switchTab(tabId);
        });
    });

    if (userIconToggle && userDropdown) {
        userIconToggle.addEventListener('click', (e) => {
            e.preventDefault();
            setTimeout(() => {
                userDropdown.classList.toggle('show');
            }, 10);
        });
    }

    if (logoutBtn && userDropdown) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('lastActiveTab');
            isAuthenticated = false;
            userDropdown.classList.remove('show');
            checkSession();
        });
    }

    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookingMessage = document.getElementById('booking-message');

            const bookingVenueEl = document.getElementById('booking-venue');
            const bookingDateEl = document.getElementById('booking-date');
            const bookingStartEl = document.getElementById('booking-start-time');
            const bookingEndEl = document.getElementById('booking-end-time');
            const bookingPurposeEl = document.getElementById('booking-purpose');
            const bookingFileEl = document.getElementById('booking-requirements-file');

            const venueName = bookingVenueEl ? bookingVenueEl.value : '';
            const date = bookingDateEl ? bookingDateEl.value : '';
            const startTime = bookingStartEl ? bookingStartEl.value : '';
            const endTime = bookingEndEl ? bookingEndEl.value : '';
            const purpose = bookingPurposeEl ? bookingPurposeEl.value : '';
            const files = bookingFileEl ? bookingFileEl.files : [];
            const fileNames = Array.from(files).map((f) => f.name).join(', ');

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (!currentUser) {
                if (bookingMessage) {
                    bookingMessage.textContent = 'You must be logged in to make a booking.';
                    bookingMessage.style.color = '#d32f2f';
                }
                return;
            }

            const refId = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

            const newBooking = {
                id: Date.now(),
                refId,
                userId: currentUser.id,
                username: currentUser.username,
                userRole: currentUser.userType,
                venue: venueName,
                date,
                startTime,
                endTime,
                purpose,
                files: fileNames,
                approvalStatus: 'Pending Review',
                paymentStatus: 'Pending',
            };

            const bookings = getStoredBookings();
            bookings.push(newBooking);
            setStoredBookings(bookings);

            if (bookingMessage) {
                bookingMessage.textContent = `Success! Your reservation for ${venueName} is submitted. Reference ID: ${refId}`;
                bookingMessage.style.color = '#00A99D';
            }
            bookingForm.reset();

            renderUserBookings();
            renderAdminBookings();
        });
    }

    const subTabButtons = document.querySelectorAll('.tabs .tab-btn') || [];
    if (subTabButtons.length > 0) {
        subTabButtons.forEach((button) => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.tabs .tab-btn').forEach((btn) => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

                e.target.classList.add('active');

                const targetTabId = e.target.dataset.tab;
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
    }

    if (mapHotspots && mapHotspots.length > 0) {
        mapHotspots.forEach((hotspot) => {
            hotspot.addEventListener('click', (e) => {
                e.stopPropagation();

                const venueId = Number.parseInt(hotspot.dataset.venueId, 10);
                const venue = VENUES.find((v) => v.id === venueId);

                if (venue) {
                    renderVenueModal(venue);
                }
            });
        });
    }

    if (closeBtn && venueModal) {
        closeBtn.addEventListener('click', () => {
            venueModal.classList.remove('show');
        });
    }

    window.addEventListener('click', (event) => {
        if (venueModal && event.target === venueModal) {
            venueModal.classList.remove('show');
            return;
        }

        if (event.target && event.target.id === 'details-book-btn') {
            const venueName = event.target.dataset.venueName;

            if (venueModal) {
                venueModal.classList.remove('show');
            }

            switchTab('bookings-tab');

            const bookingSelect = document.getElementById('booking-venue');
            if (bookingSelect) {
                bookingSelect.value = venueName;
            }

            document.querySelectorAll('.tabs .tab-btn').forEach((btn) => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
            const btn = document.querySelector('.tabs .tab-btn[data-tab="new-booking-section"]');
            if (btn) {
                btn.classList.add('active');
            }
            const newBookingSection = document.getElementById('new-booking-section');
            if (newBookingSection) {
                newBookingSection.classList.add('active');
            }
        }
    });

    // --- INITIALIZATION ---
    window.renderAdminBookings = renderAdminBookings;
    window.renderVenueModal = renderVenueModal;

    checkSession();
});
