// Authentication functionality for the Family Organizer app

// Local auth state
let localAuth = null;

// Initialize local authentication
function initLocalAuth() {
  console.log('Initializing local authentication...');
  
  // Check if user is already logged in
  checkLocalLoginStatus();
  
  // Set up auth-related DOM event listeners
  document.getElementById('login-button').addEventListener('click', showUserSwitcherModal);
  
  // Update login button text based on auth state
  updateLoginButtonText();
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
    
    // Update login button text
    updateLoginButtonText();
    
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
    
    // Update login button text
    updateLoginButtonText();
    
    // Update UI for logged-out state
    updateUIForLoggedOut();
    
    console.log('User is signed out');
  }
}

// Show user switcher modal
function showUserSwitcherModal() {
  // Check if user is logged in
  if (!appState.isAuthenticated) {
    showLoginModal();
    return;
  }
  
  // Get current user and family members
  const currentUser = appState.currentUser;
  const family = appState.family || [];
  
  // Create options HTML
  let familyOptions = '';
  
  // Add option for current user/account owner
  familyOptions += `
    <div class="user-option ${!appState.activeFamilyMember ? 'active' : ''}" data-user-type="owner">
      <div class="user-avatar" style="background-color: ${currentUser?.color || '#4285F4'}">
        ${currentUser?.name?.charAt(0) || 'U'}
      </div>
      <div class="user-info">
        <div class="user-name">${currentUser?.name || 'Account Owner'}</div>
        <div class="user-role">Account Owner</div>
      </div>
    </div>
  `;
  
  // Add options for family members
  family.forEach(member => {
    const isActive = appState.activeFamilyMember?.id === member.id;
    familyOptions += `
      <div class="user-option ${isActive ? 'active' : ''}" data-user-type="family" data-member-id="${member.id}">
        <div class="user-avatar" style="background-color: ${member.color || '#4285F4'}">
          ${member.name.charAt(0)}
        </div>
        <div class="user-info">
          <div class="user-name">${member.name}</div>
          <div class="user-role">${capitalizeFirstLetter(member.role || 'Family Member')}</div>
        </div>
      </div>
    `;
  });
  
  // Create modal content
  const content = `
    <div class="user-switcher-container">
      <h3>Switch User</h3>
      <p>Select which user account to view:</p>
      <div class="user-options">
        ${familyOptions}
      </div>
      ${!family.length ? '<p class="no-family-message">Add family members in the Family section to see more options.</p>' : ''}
    </div>
  `;
  
  showModal('Switch User', content);
  
  // Add event listeners to options
  document.querySelectorAll('.user-option').forEach(option => {
    option.addEventListener('click', () => {
      const userType = option.dataset.userType;
      
      if (userType === 'owner') {
        // Switch to owner account
        returnToOwnerAccount();
      } else if (userType === 'family') {
        const memberId = option.dataset.memberId;
        const member = family.find(m => m.id === memberId);
        
        if (member) {
          // Switch to family member
          switchToFamilyMember(member);
        }
      }
      
      closeModal();
    });
  });
}

// Show login modal
function showLoginModal() {
  const content = `
    <div class="login-container">
      <div class="tab-controls">
        <button id="login-tab-btn" class="tab-btn active">Login</button>
        <button id="register-tab-btn" class="tab-btn">Register</button>
      </div>
      
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
          <button type="submit" class="btn btn-primary login-submit">Login</button>
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
            <input type="password" id="register-password" required>
          </div>
          <div class="form-group">
            <label for="register-color">Profile Color</label>
            <input type="color" id="register-color" value="#4285F4">
          </div>
          <button type="submit" class="btn btn-primary register-submit">Register</button>
        </form>
      </div>
    </div>
  `;
  
  showModal('Account Access', content);
  
  // Set up tab switching
  document.getElementById('login-tab-btn').addEventListener('click', () => {
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('register-tab').classList.remove('active');
    document.getElementById('login-tab-btn').classList.add('active');
    document.getElementById('register-tab-btn').classList.remove('active');
  });
  
  document.getElementById('register-tab-btn').addEventListener('click', () => {
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('register-tab').classList.add('active');
    document.getElementById('login-tab-btn').classList.remove('active');
    document.getElementById('register-tab-btn').classList.add('active');
  });
  
  // Handle form submissions
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegistration);
}

// Handle login form submission
function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  // Simulate login (in a real app, we'd verify credentials with a server)
  // For demo purposes, we'll create a user if the email doesn't exist
  simulateLogin(email, password);
}

// Handle registration form submission
function handleRegistration(event) {
  event.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const color = document.getElementById('register-color').value;
  
  // Create a new user
  const newUser = {
    id: 'user_' + Date.now(),
    name: name,
    email: email,
    color: color,
    // In a real app, we would properly hash the password
    // and store it securely, but for this demo we won't store it
    createdAt: new Date().toISOString(),
    notifications: 'all',
    role: 'owner'
  };
  
  // Store user in localStorage
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  
  // Update app state
  updateSignInStatus(true, newUser);
  
  // Close the modal
  closeModal();
}

// Simulate login by checking existing users
async function simulateLogin(email, password) {
  try {
    // Get all users from the database
    const allUsers = await db.getAll(stores.users);
    
    // Find user with matching email
    const user = allUsers.find(u => u.email === email);
    
    if (user) {
      // In a real app, we would verify the password here
      // For demo purposes, we'll just log the user in
      localStorage.setItem('currentUser', JSON.stringify(user));
      updateSignInStatus(true, user);
    } else {
      // Create a new user if not found (just for demo)
      const newUser = {
        id: 'user_' + Date.now(),
        name: email.split('@')[0], // Use part of email as name
        email: email,
        color: '#4285F4',
        createdAt: new Date().toISOString(),
        notifications: 'all',
        role: 'owner'
      };
      
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      updateSignInStatus(true, newUser);
    }
    
    // Close the modal
    closeModal();
    
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed. Please try again.', 'error');
  }
}

// Update login button text based on auth state
function updateLoginButtonText() {
  const loginButton = document.getElementById('login-button');
  if (appState.isAuthenticated) {
    loginButton.textContent = 'Switch User';
  } else {
    loginButton.textContent = 'Login';
  }
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

// Note that the following functions were not provided in the original code and are assumed to be defined elsewhere:
// - showModal
// - closeModal
// - showNotification
// - returnToOwnerAccount
// - switchToFamilyMember
// - capitalizeFirstLetter
// - getUserById
// - updateUser
// - addUser
// - getFamilyMembersByUserId
// - addFamilyMember
// - loadViewData