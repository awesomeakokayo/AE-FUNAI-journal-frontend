const API_BASE_URL = "https://ae-funai-journal-backend.onrender.com";
const TOKEN_KEY = 'journal_auth_token';
const USER_KEY = 'journal_user_data';

// ========== Utility Functions ==========
const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const showFeedback = (element, type, message) => {
    if (!element) return;
    element.style.display = 'block';
    element.className = `alert alert-${type}`;
    element.textContent = message;
    setTimeout(() => {
        if (type === 'success') {
            hideFeedback(element);
        }
    }, 5000);
};

const hideFeedback = (element) => {
    if (!element) return;
    element.style.display = 'none';
    element.textContent = '';
};

const truncateText = (text = '', maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
};

const extractFilenameFromHeader = (headerValue, fallbackName) => {
    if (!headerValue) return fallbackName;
    const match = headerValue.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    if (!match || !match[1]) return fallbackName;
    return match[1].replace(/['"]/g, '').trim() || fallbackName;
};

// ========== Token Management ==========
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);
const getUser = () => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
};
const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
const removeUser = () => localStorage.removeItem(USER_KEY);
const isAuthenticated = () => !!getToken();

// ========== API Helper Functions ==========
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = options.adminAuth ? getAdminToken() : getToken();
    
    const headers = {
        ...options.headers,
    };
    
    if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers,
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({ detail: response.statusText }));
        
        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
    } catch (error) {
        if (error.message.includes('401') || error.message.includes('Token')) {
            // Token expired or invalid
            removeToken();
            removeUser();
            if (window.location.pathname !== '/login.html' && window.location.pathname !== '/index.html') {
                window.location.href = 'login.html';
            }
        }
        throw error;
    }
};

// ========== API Endpoints ==========
const api = {
    // Auth
    async register(fullName, email, password) {
        return apiRequest('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, email, password }),
            skipAuth: true,
        });
    },
    
    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        return apiRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
            skipAuth: true,
        });
    },
    
    async getCurrentUser() {
        return apiRequest('/users/me');
    },
    
    async adminLogin(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        return apiRequest('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
            skipAuth: true,
        });
    },
    
    // Journals
    async uploadJournal(title, authors, abstract, file) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        if (abstract) formData.append('abstract', abstract);
        formData.append('file', file);
        
        return apiRequest('/admin/journals/upload', {
            method: 'POST',
            body: formData,
        });
    },
    
    async listJournals(query = '') {
        const endpoint = query ? `/journals?q=${encodeURIComponent(query)}` : '/journals';
        return apiRequest(endpoint, { skipAuth: false });
    },
    
    async getJournal(journalId) {
        return apiRequest(`/journals/${journalId}`, { skipAuth: false });
    },
    
    getDownloadUrl(journalId) {
        return `${API_BASE_URL}/journals/${journalId}/download`;
    },
    
    async getMyJournals() {
        return apiRequest('/journals/me');
    },
    
    async deleteJournal(journalId) {
        return apiRequest(`/journals/${journalId}`, {
            method: 'DELETE',
        });
    },
    
    // Submissions (for regular users)
    async submitJournal(title, authors, abstract, file) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        if (abstract) formData.append('abstract', abstract);
        formData.append('file', file);
        
        return apiRequest('/submissions/submit', {
            method: 'POST',
            body: formData,
        });
    },
    
    async getMySubmissions() {
        return apiRequest('/submissions/my');
    },
    
    // Admin endpoints
    async getSubmissions(statusFilter = null) {
        const endpoint = statusFilter 
            ? `/admin/submissions?status_filter=${statusFilter}`
            : '/admin/submissions';
        return apiRequest(endpoint, { adminAuth: true});
    },
    
    getSubmissionDownloadUrl(submissionId) {
        return `${API_BASE_URL}/admin/submissions/${submissionId}/download`;
    },
    
    async adminUploadJournal(title, authors, abstract, file, submissionId = null, category = null) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        if (abstract) formData.append('abstract', abstract);
        formData.append('file', file);
        if (submissionId) formData.append('submission_id', submissionId);
        if (category) formData.append('category', category);
        
        return apiRequest('/admin/journals/upload', {
            method: 'POST',
            body: formData,
        });
    },
    
    async adminDeleteJournal(journalId) {
        return apiRequest(`/admin/journals/${journalId}`, {
            method: 'DELETE',
        });
    },
    
    async approveAndPublishSubmission(submissionId, category = null) {
        const formData = new FormData();
        if (category) formData.append('category', category);
        
        return apiRequest(`/admin/submissions/${submissionId}/approve-publish`, {
            method: 'POST',
            body: formData,
        });
    },
    
    async getCategories() {
        return apiRequest('/journals/categories', { skipAuth: true });
    },
    
    async listJournalsByCategory(category) {
        return apiRequest(`/journals?category=${encodeURIComponent(category)}`, { skipAuth: true });
    },
};

const downloadSubmissionFile = async (submissionId) => {
    const token = getToken();
    if (!token) {
        throw new Error('Please login again to download this submission.');
    }

    const response = await fetch(`${API_BASE_URL}/admin/submissions/${submissionId}/download`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        throw new Error(errorText || `Failed to download submission (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    const filename = extractFilenameFromHeader(
        response.headers.get('Content-Disposition'),
        `submission-${submissionId}.pdf`
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// ========== Authentication Guards ==========
const requireAuth = () => {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
};

const requireAdmin = async () => {
    if (!requireAuth()) return false;
    const user = getUser();
    // Check if user is admin (either from database or auth.py admin)
    if (!user || (user.is_admin !== 1 && user.email !== 'admin@admin')) {
        alert('Admin access required');
        window.location.href = 'index.html';
        return false;
    }
    return true;
};

// ========== Logout Function ==========
const logout = () => {
    removeToken();
    removeUser();
    window.location.href = 'index.html';
};

// ========== Navigation Updates ==========
const updateNavigation = () => {
    const authLinks = document.querySelectorAll('[data-auth]');
    authLinks.forEach(link => {
        const requiresAuth = link.dataset.auth === 'required';
        const hideIfAuth = link.dataset.auth === 'hide-if-authenticated';
        const showIfAuth = link.dataset.auth === 'show-if-authenticated';
        
        if (requiresAuth && !isAuthenticated()) {
            link.style.display = 'none';
        } else if (hideIfAuth && isAuthenticated()) {
            link.style.display = 'none';
        } else if (showIfAuth && !isAuthenticated()) {
            link.style.display = 'none';
        } else {
            link.style.display = '';
        }
    });
    
    // Update logout buttons
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
};

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Set year in footer
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    // Load current user if authenticated
    let currentUser = getUser();
    if (isAuthenticated() && !currentUser) {
        try {
            currentUser = await api.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
            removeToken();
        }
    }
    
    // Update navigation based on auth state
    updateNavigation();
    
    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage && currentUser) {
        welcomeMessage.textContent = `Welcome back, ${currentUser.full_name || 'User'}!`;
    }
    
    // Initialize page-specific handlers
    initRegisterForm();
    initLoginForm();
    initAdminLoginForm();
    initSubmitForm();
    initBrowsePage();
    initDetailsPage();
    initMySubmissionsPage();
    initAdminPages();
    initHomePage();
    initArchivesPage();
    initCurrentPage();
});

// ========== Form Handlers ==========
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    const feedbackEl = document.getElementById('registerFeedback');
    
    registerForm.addEventListener('input', () => hideFeedback(feedbackEl));
    
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const fullName = registerForm.fullName.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const confirmPassword = registerForm.confirmPassword.value;
        
        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            showFeedback(feedbackEl, 'error', 'All fields are required.');
            return;
        }
        
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showFeedback(feedbackEl, 'error', 'Please enter a valid email address.');
            return;
        }
        
        if (password.length < 8) {
            showFeedback(feedbackEl, 'error', 'Password must be at least 8 characters.');
            return;
        }
        
        if (password !== confirmPassword) {
            showFeedback(feedbackEl, 'error', 'Passwords do not match.');
            return;
        }
        
        // Submit to API
        try {
            const submitButton = registerForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Account...';
            
            await api.register(fullName, email, password);
            
            showFeedback(feedbackEl, 'success', 'Account created successfully! Please check your email to verify your account. Redirecting to login...');
            registerForm.reset();
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } catch (error) {
            showFeedback(feedbackEl, 'error', error.message || 'Registration failed. Please try again.');
            const submitButton = registerForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    });
}

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    const feedbackEl = document.getElementById('loginFeedback');
    
    loginForm.addEventListener('input', () => hideFeedback(feedbackEl));
    
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
        
        if (!email || !password) {
            showFeedback(feedbackEl, 'error', 'Email and password are required.');
            return;
        }
        
        try {
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            
            const response = await api.login(email, password);
            
            // Store token
            setToken(response.access_token);
            
            // Fetch and store user data
            const user = await api.getCurrentUser();
            setUser(user);
            
            showFeedback(feedbackEl, 'success', 'Login successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
        } catch (error) {
            showFeedback(feedbackEl, 'error', error.message || 'Login failed. Please check your credentials.');
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });
}

function initAdminLoginForm() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (!adminLoginForm) return;
    
    const feedbackEl = document.getElementById('adminLoginFeedback');
    
    adminLoginForm.addEventListener('input', () => hideFeedback(feedbackEl));
    
    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = adminLoginForm.username.value.trim();
        const password = adminLoginForm.password.value;
        
        if (!username || !password) {
            showFeedback(feedbackEl, 'error', 'Username and password are required.');
            return;
        }
        
        try {
            const submitButton = adminLoginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            
            const response = await api.adminLogin(username, password);
            
            // Store token
            setAdminToken(response.access_token);
            
            // Store admin user data
            setUser({
                id: 0,
                full_name: 'Admin',
                email: 'admin@admin',
                is_admin: 1
            });
            
            showFeedback(feedbackEl, 'success', 'Admin login successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        } catch (error) {
            showFeedback(feedbackEl, 'error', error.message || 'Admin login failed. Please check your credentials.');
            const submitButton = adminLoginForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Login as Admin';
        }
    });
}

function initSubmitForm() {
    const submitForm = document.getElementById('submitForm');
    if (!submitForm) return;
    
    if (!requireAuth()) return;
    
    const feedbackEl = document.getElementById('submitFeedback');
    
    submitForm.addEventListener('input', () => hideFeedback(feedbackEl));
    
    submitForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const author = submitForm.author.value.trim();
        const title = submitForm.title.value.trim();
        const abstract = submitForm.abstract.value.trim();
        const fileInput = submitForm.file;
        const file = fileInput.files[0];
        
        if (!author || !title || !abstract || !file) {
            showFeedback(feedbackEl, 'error', 'Please complete every field and attach your document.');
            return;
        }
        
        const allowedTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            showFeedback(feedbackEl, 'error', 'Only DOC, DOCX, or PDF files are allowed.');
            return;
        }
        
        if (file.size > 15 * 1024 * 1024) {
            showFeedback(feedbackEl, 'error', 'File size must be less than 15MB.');
            return;
        }
        
        try {
            const submitButton = submitForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            
            await api.submitJournal(title, author, abstract, file);
            
            showFeedback(feedbackEl, 'success', 'Journal submitted successfully! It has been sent for review via email.');
            submitForm.reset();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        } catch (error) {
            showFeedback(feedbackEl, 'error', error.message || 'Submission failed. Please try again.');
        } finally {
            const submitButton = submitForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit for Review';
        }
    });
}

// ========== Page Handlers ==========
function initBrowsePage() {
    const resultsContainer = document.getElementById('browseResults');
    if (!resultsContainer) return;
    
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    const render = (journals) => {
        if (!journals || journals.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No journals found. ${searchInput?.value ? 'Try a different search term.' : 'Be the first to upload a journal!'}</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = journals.map((journal) => `
            <article class="journal-card">
                <h3>${journal.title || 'Untitled'}</h3>
                <div class="journal-meta">
                    <span class="badge">👤 ${journal.authors || 'Unknown Author'}</span>
                    <span class="pill">Uploaded ${formatDate(journal.upload_date)}</span>
                </div>
                <p>${truncateText(journal.abstract || '', 150)}</p>
                <div class="journal-actions">
                    <a href="details.html?id=${journal.id}" class="btn btn-primary">View Details</a>
                    <a href="${api.getDownloadUrl(journal.id)}" class="btn btn-outline" target="_blank" rel="noopener">Download PDF</a>
                </div>
            </article>
        `).join('');
    };
    
    const loadJournals = async (query = '') => {
        try {
            resultsContainer.innerHTML = '<div class="empty-state"><p>Loading journals...</p></div>';
            const journals = await api.listJournals(query);
            render(journals);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load journals: ${error.message}</p>
                </div>
            `;
        }
    };
    
    // Initial load
    loadJournals();
    
    // Search with debounce
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            clearTimeout(searchTimeout);
            const query = event.target.value.trim();
            searchTimeout = setTimeout(() => {
                loadJournals(query);
            }, 500);
        });
    }
}

function initDetailsPage() {
    const detailsSection = document.getElementById('journalDetails');
    if (!detailsSection) return;
    
    const params = new URLSearchParams(window.location.search);
    const journalId = params.get('id');
    
    if (!journalId) {
        detailsSection.innerHTML = `
            <div class="empty-state">
                <p>No journal ID provided.</p>
                <a href="browse.html" class="btn btn-primary" style="margin-top:1rem;">Back to Browse</a>
            </div>
        `;
        return;
    }
    
    const titleEl = document.getElementById('detailTitle');
    const authorEl = document.getElementById('detailAuthor');
    const dateEl = document.getElementById('detailDate');
    const abstractEl = document.getElementById('detailAbstract');
    const downloadEl = document.getElementById('detailDownload');
    
    const loadJournal = async () => {
        try {
            titleEl.textContent = 'Loading...';
            const journal = await api.getJournal(journalId);
            
            titleEl.textContent = journal.title || 'Untitled';
            authorEl.textContent = `Author: ${journal.authors || 'Unknown'}`;
            dateEl.textContent = `Uploaded ${formatDate(journal.upload_date)}`;
            abstractEl.textContent = journal.abstract || 'No abstract provided.';
            downloadEl.href = api.getDownloadUrl(journal.id);
        } catch (error) {
            detailsSection.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load journal: ${error.message}</p>
                    <a href="browse.html" class="btn btn-primary" style="margin-top:1rem;">Back to Browse</a>
                </div>
            `;
        }
    };
    
    loadJournal();
}

function initMySubmissionsPage() {
    const listContainer = document.getElementById('mySubmissionsList');
    if (!listContainer) return;
    
    if (!requireAuth()) return;
    
    const render = async () => {
        try {
            listContainer.innerHTML = '<div class="empty-state"><p>Loading your submissions...</p></div>';
            const submissions = await api.getMySubmissions();
            
            if (!submissions || submissions.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <p>You have not submitted any journals yet.</p>
                        <a href="submit.html" class="btn btn-primary" style="margin-top:1rem;">Submit now</a>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = submissions.map((sub) => {
                const statusBadge = sub.status === 'approved' ? '✅ Approved' 
                    : sub.status === 'rejected' ? '❌ Rejected' 
                    : '⏳ Pending';
                return `
                <article class="journal-card">
                    <h3>${sub.title || 'Untitled'}</h3>
                    <div class="journal-meta">
                        <span class="badge">👤 ${sub.authors || 'Unknown Author'}</span>
                        <span class="pill">${statusBadge}</span>
                        <span class="pill">Submitted ${formatDate(sub.submitted_at)}</span>
                    </div>
                    ${sub.abstract ? `<p>${truncateText(sub.abstract, 150)}</p>` : ''}
                </article>
            `;
            }).join('');
        } catch (error) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load submissions: ${error.message}</p>
                </div>
            `;
        }
    };
    
    render();
}

function initAdminPages() {
    // Admin submissions list
    const adminSubmissionsList = document.getElementById('adminSubmissionsList');
    if (adminSubmissionsList) {
        requireAdmin().then(isAdmin => {
            if (isAdmin) initAdminSubmissionsPage();
        });
    }
    
    // Admin upload form
    const adminUploadForm = document.getElementById('adminUploadForm');
    if (adminUploadForm) {
        requireAdmin().then(isAdmin => {
            if (isAdmin) initAdminUploadForm();
        });
    }
}

function initAdminSubmissionsPage() {
    const listContainer = document.getElementById('adminSubmissionsList');
    if (!listContainer) return;
    
    const statusFilter = document.getElementById('statusFilter');

    const ensureFeedbackEl = () => {
        let feedbackEl = listContainer.parentElement.querySelector('.alert');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.className = 'alert';
            feedbackEl.style.display = 'block';
            listContainer.parentElement.insertBefore(feedbackEl, listContainer);
        }
        return feedbackEl;
    };
    
    const render = async (filter = null) => {
        try {
            listContainer.innerHTML = '<div class="empty-state"><p>Loading submissions...</p></div>';
            const submissions = await api.getSubmissions(filter);
            
            if (!submissions || submissions.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No submissions found.</p>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = submissions.map((sub) => {
                const statusBadge = sub.status === 'approved' ? '✅ Approved' 
                    : sub.status === 'rejected' ? '❌ Rejected' 
                    : '⏳ Pending';
                return `
                <article class="journal-card">
                    <h3>${sub.title || 'Untitled'}</h3>
                    <div class="journal-meta">
                        <span class="badge">👤 ${sub.authors || 'Unknown Author'}</span>
                        <span class="badge">📧 ${sub.submitter_email || 'Unknown'}</span>
                        <span class="pill">${statusBadge}</span>
                        <span class="pill">Submitted ${formatDate(sub.submitted_at)}</span>
                    </div>
                    ${sub.abstract ? `<p>${truncateText(sub.abstract, 150)}</p>` : ''}
                    <div class="journal-actions">
                        <button class="btn btn-outline" data-action="download-submission" data-id="${sub.id}">Download</button>
                        ${sub.status === 'pending' ? `
                            <button class="btn btn-primary" data-id="${sub.id}" data-action="approve-upload">Approve & Upload</button>
                        ` : ''}
                    </div>
                </article>
            `;
            }).join('');

            listContainer.querySelectorAll('[data-action="download-submission"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const submissionId = btn.dataset.id;
                    const originalText = btn.textContent;

                    btn.disabled = true;
                    btn.textContent = 'Downloading...';

                    try {
                        await downloadSubmissionFile(submissionId);
                        showFeedback(ensureFeedbackEl(), 'success', 'Download started...');
                    } catch (error) {
                        showFeedback(ensureFeedbackEl(), 'error', error.message || 'Failed to download submission.');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                });
            });
            
            // Add event listeners for approve buttons
            listContainer.querySelectorAll('[data-action="approve-upload"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const submissionId = btn.dataset.id;
                    const submission = submissions.find(s => s.id == submissionId);
                    
                    if (!submission) return;
                    
                    // Ask for category (optional)
                    const category = prompt('Enter category (optional, press Cancel to skip):');
                    if (category === null) return; // User cancelled
                    
                    // Disable button
                    btn.disabled = true;
                    btn.textContent = 'Publishing...';
                    
                    try {
                        await api.approveAndPublishSubmission(submissionId, category || null);
                        showFeedback(ensureFeedbackEl(), 'success', 'Submission approved and published successfully!');
                        // Reload submissions
                        setTimeout(() => render(statusFilter?.value || null), 1500);
                    } catch (error) {
                        showFeedback(ensureFeedbackEl(), 'error', error.message || 'Failed to publish submission.');
                        btn.disabled = false;
                        btn.textContent = 'Approve & Publish';
                    }
                });
            });
        } catch (error) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load submissions: ${error.message}</p>
                </div>
            `;
        }
    };
    
    // Initial load
    render();
    
    // Filter change
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            render(e.target.value || null);
        });
    }
}

function initHomePage() {
    const latestContainer = document.getElementById('latestJournals');
    if (!latestContainer) return;
    
    const loadLatest = async () => {
        try {
            const journals = await api.listJournals();
            const latest = journals.slice(0, 3); // Show only 3 latest
            
            if (!latest || latest.length === 0) {
                latestContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No journals published yet. Be the first to submit!</p>
                    </div>
                `;
                return;
            }
            
            latestContainer.innerHTML = latest.map((journal) => `
                <article class="journal-card">
                    <h3>${journal.title || 'Untitled'}</h3>
                    <div class="journal-meta">
                        <span class="badge">👤 ${journal.authors || 'Unknown Author'}</span>
                        ${journal.category ? `<span class="badge">📁 ${journal.category}</span>` : ''}
                        <span class="pill">Published ${formatDate(journal.upload_date)}</span>
                    </div>
                    ${journal.abstract ? `<p>${truncateText(journal.abstract, 150)}</p>` : ''}
                    <div class="journal-actions">
                        <a href="details.html?id=${journal.id}" class="btn btn-primary">View Details</a>
                        <a href="${api.getDownloadUrl(journal.id)}" class="btn btn-outline" target="_blank" rel="noopener">Download PDF</a>
                    </div>
                </article>
            `).join('');
        } catch (error) {
            latestContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load latest journals: ${error.message}</p>
                </div>
            `;
        }
    };
    
    loadLatest();
}

function initCurrentPage() {
    const resultsContainer = document.getElementById('currentResults');
    if (!resultsContainer) return;
    
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    const render = (journals) => {
        if (!journals || journals.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No current journals found. ${searchInput?.value ? 'Try a different search term.' : ''}</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = journals.map((journal) => `
            <article class="journal-card">
                <h3>${journal.title || 'Untitled'}</h3>
                <div class="journal-meta">
                    <span class="badge">👤 ${journal.authors || 'Unknown Author'}</span>
                    ${journal.category ? `<span class="badge">📁 ${journal.category}</span>` : ''}
                    <span class="pill">Published ${formatDate(journal.upload_date)}</span>
                </div>
                ${journal.abstract ? `<p>${truncateText(journal.abstract, 150)}</p>` : ''}
                <div class="journal-actions">
                    <a href="details.html?id=${journal.id}" class="btn btn-primary">View Details</a>
                    <a href="${api.getDownloadUrl(journal.id)}" class="btn btn-outline" target="_blank" rel="noopener">Download PDF</a>
                </div>
            </article>
        `).join('');
    };
    
    const loadJournals = async (query = '') => {
        try {
            resultsContainer.innerHTML = '<div class="empty-state"><p>Loading journals...</p></div>';
            const journals = await api.listJournals(query);
            render(journals);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load journals: ${error.message}</p>
                </div>
            `;
        }
    };
    
    // Initial load
    loadJournals();
    
    // Search with debounce
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            clearTimeout(searchTimeout);
            const query = event.target.value.trim();
            searchTimeout = setTimeout(() => {
                loadJournals(query);
            }, 500);
        });
    }
}

function initArchivesPage() {
    const categoriesContainer = document.getElementById('categoriesList');
    const journalsContainer = document.getElementById('archivesResults');
    if (!categoriesContainer && !journalsContainer) return;
    
    const loadCategories = async () => {
        try {
            const categories = await api.getCategories();
            
            if (!categories || categories.length === 0) {
                if (categoriesContainer) {
                    categoriesContainer.innerHTML = `
                        <div class="empty-state">
                            <p>No categories available yet.</p>
                        </div>
                    `;
                }
                return;
            }
            
            if (categoriesContainer) {
                categoriesContainer.innerHTML = categories.map(cat => `
                    <button class="category-btn" data-category="${cat}">
                        <span class="icon">📁</span>
                        <span>${cat}</span>
                    </button>
                `).join('');
                
                // Add click handlers
                categoriesContainer.querySelectorAll('.category-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const category = btn.dataset.category;
                        loadJournalsByCategory(category);
                        // Update active state
                        categoriesContainer.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };
    
    const loadJournalsByCategory = async (category) => {
        if (!journalsContainer) return;
        
        try {
            journalsContainer.innerHTML = '<div class="empty-state"><p>Loading journals...</p></div>';
            const journals = await api.listJournalsByCategory(category);
            
            if (!journals || journals.length === 0) {
                journalsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No journals found in this category.</p>
                    </div>
                `;
                return;
            }
            
            journalsContainer.innerHTML = journals.map((journal) => `
                <article class="journal-card">
                    <h3>${journal.title || 'Untitled'}</h3>
                    <div class="journal-meta">
                        <span class="badge">👤 ${journal.authors || 'Unknown Author'}</span>
                        <span class="pill">Published ${formatDate(journal.upload_date)}</span>
                    </div>
                    ${journal.abstract ? `<p>${truncateText(journal.abstract, 150)}</p>` : ''}
                    <div class="journal-actions">
                        <a href="details.html?id=${journal.id}" class="btn btn-primary">View Details</a>
                        <a href="${api.getDownloadUrl(journal.id)}" class="btn btn-outline" target="_blank" rel="noopener">Download PDF</a>
                    </div>
                </article>
            `).join('');
        } catch (error) {
            journalsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load journals: ${error.message}</p>
                </div>
            `;
        }
    };
    
    // Load all journals initially if no category selected
    if (journalsContainer) {
        const loadAll = async () => {
            try {
                journalsContainer.innerHTML = '<div class="empty-state"><p>Loading all journals...</p></div>';
                const journals = await api.listJournals();
                
                if (!journals || journals.length === 0) {
                    journalsContainer.innerHTML = `
                        <div class="empty-state">
                            <p>No journals available yet.</p>
                        </div>
                    `;
                    return;
                }
                
                // Group by category
                const grouped = {};
                journals.forEach(journal => {
                    const cat = journal.category || 'Uncategorized';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(journal);
                });
                
                journalsContainer.innerHTML = Object.entries(grouped).map(([category, catJournals]) => `
                    <div class="category-section">
                        <h3 class="category-title">${category}</h3>
                        <div class="journal-list">
                            ${catJournals.map((journal) => `
                                <article class="journal-card">
                                    <h4>${journal.title || 'Untitled'}</h4>
                                    <div class="journal-meta">
                                        <span class="badge">👤 ${journal.authors || 'Unknown Author'}</span>
                                        <span class="pill">Published ${formatDate(journal.upload_date)}</span>
                                    </div>
                                    ${journal.abstract ? `<p>${truncateText(journal.abstract, 120)}</p>` : ''}
                                    <div class="journal-actions">
                                        <a href="details.html?id=${journal.id}" class="btn btn-primary">View Details</a>
                                        <a href="${api.getDownloadUrl(journal.id)}" class="btn btn-outline" target="_blank" rel="noopener">Download PDF</a>
                                    </div>
                                </article>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                journalsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>Failed to load journals: ${error.message}</p>
                    </div>
                `;
            }
        };
        
        loadAll();
    }
    
    loadCategories();
}

function initAdminUploadForm() {
    const uploadForm = document.getElementById('adminUploadForm');
    if (!uploadForm) return;
    
    const feedbackEl = document.getElementById('adminUploadFeedback');
    const params = new URLSearchParams(window.location.search);
    const submissionId = params.get('submission_id');
    
    // If submission_id is provided, load submission data
    if (submissionId) {
        api.getSubmissions().then(submissions => {
            const submission = submissions.find(s => s.id == submissionId);
            if (submission) {
                uploadForm.title.value = submission.title;
                uploadForm.authors.value = submission.authors;
                uploadForm.abstract.value = submission.abstract || '';
            }
        });
    }
    
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = uploadForm.title.value.trim();
        const authors = uploadForm.authors.value.trim();
        const abstract = uploadForm.abstract.value.trim();
        const category = uploadForm.category?.value.trim() || null;
        const fileInput = uploadForm.file;
        const file = fileInput.files[0];
        
        if (!title || !authors || !file) {
            showFeedback(feedbackEl, 'error', 'Title, authors, and PDF file are required.');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            showFeedback(feedbackEl, 'error', 'Only PDF files are allowed for published journals.');
            return;
        }
        
        if (file.size > 15 * 1024 * 1024) {
            showFeedback(feedbackEl, 'error', 'File size must be less than 15MB.');
            return;
        }
        
        try {
            const submitButton = uploadForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Uploading...';
            
            await api.adminUploadJournal(title, authors, abstract, file, submissionId ? parseInt(submissionId) : null, category);
            
            showFeedback(feedbackEl, 'success', 'Journal uploaded successfully to public site!');
            uploadForm.reset();
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } catch (error) {
            showFeedback(feedbackEl, 'error', error.message || 'Upload failed. Please try again.');
        } finally {
            const submitButton = uploadForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Upload Journal';
        }
    });
}

const ADMIN_TOKEN_KEY = "journal_admin_token";
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
const setAdminToken = (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token);
const removeAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);