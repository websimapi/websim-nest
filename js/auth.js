// Authentication functionality for the Family Organizer app

// Local auth state
let localAuth = null;

// Initialize local authentication
function initLocalAuth() {
  console.log('Initializing local authentication...');
  
  // Check if user is already logged in
  checkLocalLoginStatus();
  
  // Set up auth-related DOM event listeners
  document.getElementById('login-button').addEventListener('click', showLocalLoginModal);
}

// Check if user is already logged in via local storage
function checkLocalLoginStatus() {
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      updateSignInStatus(true, user);
    } catch (error) {
      console.error('Error parsing saved user:', error);
      localStorage.removeItem('currentUser');
    }
  } else {
    updateSignInStatus(false);
  }
}

// Update UI based on sign-in status
async function updateSignInStatus(isSignedIn, user = null) {
  const loginButton = document.getElementById('login-button');
  const userProfile = document.getElementById('user-profile');
  
  if (isSignedIn && user) {
    // User is signed in
    loginButton.classList.add('hidden');
    userProfile.classList.remove('hidden');
    
    // Set user information in the UI
    document.getElementById('user-name').textContent = user.name;
    
    if (user.imageUrl) {
      document.getElementById('user-avatar').src = user.imageUrl;
    } else {
      // Create initial avatar
      document.getElementById('user-avatar').src = generateInitialsAvatar(user.name);
    }
    
    // Update app state
    appState.currentUser = user;
    appState.isAuthenticated = true;
    
    // Store/update user in the database
    try {
      // Check if user already exists
      const existingUser = await getUserById(user.id);
      
      if (existingUser) {
        // Update existing user
        user.color = existingUser.color;
        user.notifications = existingUser.notifications;
        user.role = existingUser.role;
        user.createdAt = existingUser.createdAt;
        await updateUser(user);
      } else {
        // Create new user
        await addUser(user);
      }
      
      // Load family members associated with this user
      const familyMembers = await getFamilyMembersByUserId(user.id);
      appState.family = familyMembers;
      
      // Update current view based on login
      loadViewData(appState.currentView);
      
      showNotification(`Welcome, ${user.name}!`, 'success');
    } catch (error) {
      console.error('Error updating user data:', error);
      showNotification('Error updating user profile', 'error');
    }
  } else {
    // User is signed out
    loginButton.classList.remove('hidden');
    userProfile.classList.add('hidden');
    
    // Clear user state
    appState.currentUser = null;
    appState.isAuthenticated = false;
    appState.family = [];
    
    // Update UI for logged-out state
    updateUIForLoggedOut();
    
    console.log('User is signed out');
  }
}

// Show login modal
function showLocalLoginModal() {
  const content = `
    <div class="login-container">
      <div class="login-options">
        <div class="tab-controls">
          <button class="tab-btn active" data-tab="login">Login</button>
          <button class="tab-btn" data-tab="register">Register</button>
        </div>
        
        <div class="tab-content">
          <div id="login-tab" class="tab-pane active">
            <form id="login-form">
              <div class="form-group">
                <label for="login-email">Email</label>
                <input type="email" id="login-email" required>
              </div>
              <div class="form-group">
                <label for="login-password">Password</label>
                <input type="password" id="login-password" required>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary login-submit">Login</button>
              </div>
            </form>
          </div>
          
          <div id="register-tab" class="tab-pane">
            <form id="register-form">
              <div class="form-group">
                <label for="register-name">Full Name</label>
                <input type="text" id="register-name" required>
              </div>
              <div class="form-group">
                <label for="register-email">Email</label>
                <input type="email" id="register-email" required>
              </div>
              <div class="form-group">
                <label for="register-password">Password</label>
                <input type="password" id="register-password" required minlength="6">
              </div>
              <div class="form-group">
                <label for="register-color">Profile Color</label>
                <input type="color" id="register-color" value="#4285F4">
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary register-submit">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  
  showModal('Family Organizer Account', content);
  
  // Set up event listeners
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update active tab content
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
  
  // Form submissions
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLocalLogin();
  });
  
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLocalRegister();
  });
}

// Handle local login
async function handleLocalLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  // Get users from localStorage
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  
  // Find user with matching email
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    showNotification('User not found. Please register first.', 'error');
    return;
  }
  
  // Basic password check (in a real app, this would use proper hashing)
  if (user.password !== password) {
    showNotification('Incorrect password. Please try again.', 'error');
    return;
  }
  
  // Login successful
  localStorage.setItem('currentUser', JSON.stringify(user));
  closeModal();
  updateSignInStatus(true, user);
}

// Handle local registration
async function handleLocalRegister() {
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const color = document.getElementById('register-color').value;
  
  // Get existing users
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  
  // Check if email already exists
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    showNotification('This email is already registered. Please login instead.', 'error');
    return;
  }
  
  // Create new user
  const newUser = {
    id: 'user_' + Date.now(),
    name: name,
    email: email,
    password: password, // In a real app, this would be hashed
    color: color,
    role: 'admin',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    notifications: 'all'
  };
  
  // Add to local storage
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  
  // Log the user in
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  closeModal();
  updateSignInStatus(true, newUser);
  
  showNotification('Account created successfully!', 'success');
}

// Handle logout
function handleLogout(event) {
  event.preventDefault();
  
  // Clear current user from localStorage
  localStorage.removeItem('currentUser');
  
  // Update UI
  updateSignInStatus(false);
  
  showNotification('You have been signed out', 'info');
}

// Update UI for logged-out state
function updateUIForLoggedOut() {
  // Clear any personal data from the UI
  document.querySelectorAll('.placeholder-message').forEach(placeholder => {
    if (placeholder.parentElement.id === 'today-events') {
      placeholder.querySelector('p').textContent = 'Please sign in to view your events';
    } else if (placeholder.parentElement.id === 'today-tasks') {
      placeholder.querySelector('p').textContent = 'Please sign in to view your tasks';
    } else if (placeholder.parentElement.id === 'today-meals') {
      placeholder.querySelector('p').textContent = 'Please sign in to view your meal plan';
    } else if (placeholder.parentElement.id === 'family-members') {
      placeholder.querySelector('p').textContent = 'Please sign in to view your family';
    }
  });
  
  // Clear calendar if visible
  const calendarContainer = document.getElementById('calendar-container');
  if (calendarContainer) {
    calendarContainer.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to access your calendar</p>
      </div>
    `;
  }
}

// Helper function to generate avatar with initials
function generateInitialsAvatar(name) {
  // Get initials
  const initials = name.split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  // Create canvas for the avatar
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = appState.currentUser?.color || '#4285F4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
  
  // Return data URL
  return canvas.toDataURL('image/png');
}

// Add a family member
async function addFamilyMember(memberData) {
  if (!appState.isAuthenticated) {
    showNotification('You must be logged in to add family members', 'error');
    return null;
  }
  
  try {
    // Generate a unique ID for the family member
    const memberId = 'member_' + Date.now();
    
    const newMember = {
      id: memberId,
      userId: appState.currentUser.id, // Associate with current user
      name: memberData.name,
      role: memberData.role || 'member',
      color: memberData.color || getNextFamilyColor(),
      pin: memberData.pin || null,
      birthdate: memberData.birthdate || null,
      createdAt: new Date().toISOString(),
      lastActivity: null,
      accessLevel: memberData.accessLevel || 'restricted'
    };
    
    await addFamilyMember(newMember);
    
    // Add to app state
    appState.family.push(newMember);
    
    showNotification(`${newMember.name} added to your family`, 'success');
    return newMember;
  } catch (error) {
    console.error('Error adding family member:', error);
    showNotification('Failed to add family member', 'error');
    return null;
  }
}

// Get the next available color for a family member
function getNextFamilyColor() {
  const colors = [
    'var(--family-color-1)',
    'var(--family-color-2)',
    'var(--family-color-3)',
    'var(--family-color-4)',
    'var(--family-color-5)',
    'var(--family-color-6)'
  ];
  
  // Find which colors are already used
  const usedColors = appState.family.map(member => member.color);
  
  // Find the first unused color
  const availableColor = colors.find(color => !usedColors.includes(color));
  
  // Return the first unused color or the first color if all are used
  return availableColor || colors[0];
}