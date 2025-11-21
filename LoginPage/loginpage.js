const ADMIN_CREDENTIALS = {
    username: 'Deuz',
    password: 'Deuz1234'
};

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    initializeEventListeners();
});

function initializeEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const adminForm = document.getElementById('adminForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    try {
        localStorage.setItem('membership_theme', newTheme);
    } catch (e) {
        console.warn('Could not save theme preference:', e);
    }
    
    const themeButton = document.querySelector('.theme-toggle');
    themeButton.textContent = newTheme === 'dark' ? '⋆.˚🪻༘⋆' : '⋆.˚🌷༘⋆';
}

function loadTheme() {
    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem('membership_theme') || 'light';
    } catch (e) {
        console.warn('Could not load theme preference:', e);
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeButton = document.querySelector('.theme-toggle');
    if (themeButton) {
        themeButton.textContent = savedTheme === 'dark' ? '⋆.˚🪻༘⋆' : '⋆.˚🌷༘⋆';
    }
}

function showLogin() {
    document.getElementById('loginCard').style.display = 'block';
    document.getElementById('signupCard').style.display = 'none';
    document.getElementById('adminCard').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('signupCard').style.display = 'block';
    document.getElementById('adminCard').style.display = 'none';
}

function showAdminLogin() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('signupCard').style.display = 'none';
    document.getElementById('adminCard').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !username || !password) {
        showAlert('Please fill in all fields!', 'error');
        return;
    }
    
   try {
    // Wait for Firebase to load
    if (!window.dbRefs) {
        showAlert('Firebase still loading. Please wait...', 'error');
        return;
    }

    // Use firebase.database() directly
    const snapshot = await firebase.database().ref('users').once('value');
    let users = [];
    
    if (snapshot.exists()) {
        users = Object.values(snapshot.val());
        
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            showAlert('Email already exists!', 'error');
            return;
        }
        
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            showAlert('Username already exists!', 'error');
            return;
        }
    }
    
    const userId = Date.now();
    const newUser = {
        id: userId,
        email: email,
        username: username,
        password: password,
        createdAt: new Date().toISOString(),
        isAdmin: false
    };
    
    // Save to Firebase
    await firebase.database().ref('users/' + userId).set(newUser);
    
    showAlert('Account created successfully! Redirecting to login...', 'success');
    
    document.getElementById('signupForm').reset();

    setTimeout(() => {
        showLogin();
    }, 2000);
} catch (error) {
    console.error('Signup error:', error);
    showAlert('Failed to create account: ' + error.message, 'error');
}

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (!email || !username || !password || !confirmPassword) {
        showAlert('Please fill in all fields!', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    try {
        // FIX: Wait for Firebase to be ready
        if (!window.dbRefs) {
            showAlert('Firebase is still loading. Please try again.', 'error');
            return;
        }

        // Check existing users
        const usersRef = firebase.database().ref('users');
        const snapshot = await usersRef.once('value');
        let users = [];
        
        if (snapshot.exists()) {
            users = Object.values(snapshot.val());
            
            if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                showAlert('Email already exists!', 'error');
                return;
            }
            
            if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                showAlert('Username already exists!', 'error');
                return;
            }
        }
        
        // Create new user
        const userId = Date.now();
        const newUser = {
            id: userId,
            email: email,
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            isAdmin: false
        };
        
        // Save to Firebase
        await firebase.database().ref('users/' + userId).set(newUser);
        
        showAlert('Account created successfully! Redirecting to login...', 'success');
        
        document.getElementById('signupForm').reset();

        setTimeout(() => {
            showLogin();
        }, 2000);
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('Failed to create account: ' + error.message, 'error');
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
        showAlert('Please fill in all fields!', 'error');
        return;
    }
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const adminUser = {
            id: 0,
            username: username,
            email: 'admin@membership.com',
            isAdmin: true
        };
        setCurrentUser(adminUser);
        
        showAlert('Admin login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'Adminpage/adminpage.html';
        }, 1500);
    } else {
        showAlert('Invalid admin credentials!', 'error');
    }
}

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('membership_current_user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error loading current user:', error);
        return null;
    }
}

function setCurrentUser(user) {
    try {
        localStorage.setItem('membership_current_user', JSON.stringify(user));
        return true;
    } catch (error) {
        console.error('Error saving current user:', error);
        return false;
    }
}

function logout() {
    try {
        localStorage.removeItem('membership_current_user');
    } catch (e) {
        console.warn('Could not clear user session:', e);
    }
    window.location.href = 'index.html';
}

function showAlert(message, type) {
    const alertId = type === 'success' ? 'successAlert' : 'errorAlert';
    const alertElement = document.getElementById(alertId);
    
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        
        if (alertElement.timeoutId) {
            clearTimeout(alertElement.timeoutId);
        }
        
        alertElement.timeoutId = setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

console.log('Login system with Firebase initialized successfully!');
}

