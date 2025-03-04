// Main application entry point

// Configuration object
const config = {
  appVersion: '1.0.0',
  dbVersion: 1,
  syncInterval: 5 * 60 * 1000, // 5 minutes
};

// Global app state
const appState = {
  currentUser: null,
  isAuthenticated: false,
  family: [],
  currentView: 'dashboard',
  lastSync: null,
  isOnline: navigator.onLine,
  pendingSyncItems: [],
  settings: {
    theme: 'light',
    notifications: true,
    colorCoding: true,
  },
  originalUser: null,
  activeFamilyMember: null
};

// Initialize the application
async function initApp() {
  console.log('Initializing Family Organizer app...');

  // Check if browser supports service workers
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  // Initialize database
  try {
    await initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    showNotification('Error initializing app database', 'error');
  }

  // Initialize Local Auth
  initLocalAuth();

  // Set up event listeners
  setupEventListeners();

  // Load application settings
  loadSettings();

  // Set up network status listeners
  setupNetworkListeners();

  // Initialize UI
  initUI();

  console.log('App initialization complete');
}

// Set up main event listeners
function setupEventListeners() {
  // Navigation events
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', handleNavigation);
  });

  // Window hash change events
  window.addEventListener('hashchange', handleHashChange);

  // Modal events
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);
  document.querySelector('.modal-close').addEventListener('click', closeModal);
  document.querySelector('.modal-cancel').addEventListener('click', closeModal);
  document.querySelector('.modal-confirm').addEventListener('click', handleModalConfirm);

  // User profile events
  document.getElementById('logout-link').addEventListener('click', handleLogout);
  document.getElementById('profile-link').addEventListener('click', showProfileModal);
  document.getElementById('settings-link').addEventListener('click', showSettingsModal);
}

// Handle navigation item clicks
function handleNavigation(event) {
  event.preventDefault();
  const target = event.currentTarget;
  const view = target.dataset.view;
  
  changeView(view);
}

// Change active view
function changeView(viewName) {
  if (!viewName || viewName === appState.currentView) return;
  
  // Update navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update view containers
  document.querySelectorAll('.view-container').forEach(container => {
    if (container.id === `${viewName}-view`) {
      container.classList.add('active-view');
    } else {
      container.classList.remove('active-view');
    }
  });
  
  // Update URL hash
  window.location.hash = viewName;
  
  // Update current view in app state
  appState.currentView = viewName;
  
  // Load view-specific data
  loadViewData(viewName);
}

// Handle URL hash changes
function handleHashChange() {
  const hash = window.location.hash.substring(1);
  if (hash) {
    changeView(hash);
  } else {
    changeView('dashboard');
  }
}

// Load view-specific data
function loadViewData(viewName) {
  switch (viewName) {
    case 'dashboard':
      updateDashboard();
      break;
    case 'calendar':
      initCalendarView();
      break;
    case 'tasks':
      initTasksView();
      break;
    case 'meals':
      initMealsView();
      break;
    case 'grocery':
      initGroceryView();
      break;
    case 'family':
      initFamilyView();
      break;
    default:
      console.warn(`No handler for view: ${viewName}`);
  }
}

// Update dashboard with latest data
async function updateDashboard() {
  try {
    // Load today's events from database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const events = await getEventsForDateRange(today, tomorrow);
    updateTodayEvents(events);
    
    // Load today's tasks
    let tasks;
    if (appState.activeFamilyMember) {
      // If viewing as family member, only show their tasks
      tasks = await getTasksByAssignee(appState.activeFamilyMember.id);
      // Filter for today only
      tasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
    } else {
      // Otherwise show all tasks for today
      tasks = await getTasksForDay(today);
    }
    updateTodayTasks(tasks);
    
    // Load today's meals
    const meals = await getMealsForDay(today);
    updateTodayMeals(meals);
    
    // Load family members
    const family = await getFamilyMembers();
    updateFamilyWidget(family);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    showNotification('Error loading dashboard data', 'error');
  }
}

// Network status listeners
function setupNetworkListeners() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// Handle coming online
function handleOnline() {
  appState.isOnline = true;
  showNotification('You are back online', 'success');
  
  // Process any pending sync items
  if (appState.pendingSyncItems.length > 0) {
    processPendingSyncItems();
  }
}

// Handle going offline
function handleOffline() {
  appState.isOnline = false;
  showNotification('You are currently offline. Changes will be synced when you reconnect.', 'warning');
}

// Process pending sync items
async function processPendingSyncItems() {
  showNotification('Syncing pending changes...', 'info');
  
  try {
    // Get all pending items
    const pendingItems = [...appState.pendingSyncItems];
    appState.pendingSyncItems = [];
    
    for (const item of pendingItems) {
      switch (item.type) {
        case 'calendar':
          await syncCalendarItem(item.data);
          break;
        case 'task':
          await syncTaskItem(item.data);
          break;
        // Add other sync types as needed
      }
    }
    
    showNotification('All changes synced successfully', 'success');
  } catch (error) {
    console.error('Error processing pending sync items:', error);
    showNotification('Some changes failed to sync', 'error');
    
    // Put failed items back in the queue
    appState.pendingSyncItems = [
      ...appState.pendingSyncItems,
      ...pendingItems.filter(item => !item.processed)
    ];
  }
}

// Load application settings
async function loadSettings() {
  try {
    const savedSettings = await getSettings();
    if (savedSettings) {
      appState.settings = { ...appState.settings, ...savedSettings };
    }
    applySettings();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Apply settings to the application
function applySettings() {
  // Apply theme
  document.body.classList.toggle('dark-theme', appState.settings.theme === 'dark');
  
  // Other settings applications
  if (!appState.settings.notifications) {
    // Disable notifications if user has turned them off
    Notification.permission = 'denied';
  }
}

// Modal handlers
function showModal(title, content, confirmCallback = null) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  
  // Store callback for confirm button
  appState.modalConfirmCallback = confirmCallback;
  
  document.getElementById('modal-container').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-container').classList.add('hidden');
  appState.modalConfirmCallback = null;
}

function handleModalConfirm() {
  if (typeof appState.modalConfirmCallback === 'function') {
    appState.modalConfirmCallback();
  }
  closeModal();
}

// Show profile modal
function showProfileModal() {
  if (!appState.isAuthenticated) return;
  
  const user = appState.currentUser;
  const content = `
    <div class="profile-modal">
      <div class="profile-header">
        <img src="${user.imageUrl}" alt="${user.name}" class="profile-avatar">
        <h3>${user.name}</h3>
        <p>${user.email}</p>
      </div>
      <div class="profile-details">
        <div class="form-group">
          <label for="profile-color">Your Color:</label>
          <input type="color" id="profile-color" value="${user.color || '#4285F4'}">
        </div>
        <div class="form-group">
          <label for="profile-notification">Notification Preferences:</label>
          <select id="profile-notification">
            <option value="all" ${user.notifications === 'all' ? 'selected' : ''}>All Notifications</option>
            <option value="important" ${user.notifications === 'important' ? 'selected' : ''}>Important Only</option>
            <option value="none" ${user.notifications === 'none' ? 'selected' : ''}>None</option>
          </select>
        </div>
      </div>
    </div>
  `;
  
  showModal('Your Profile', content, updateUserProfile);
}

// Show settings modal
function showSettingsModal() {
  const content = `
    <div class="settings-modal">
      <div class="form-group">
        <label for="settings-theme">Theme:</label>
        <select id="settings-theme">
          <option value="light" ${appState.settings.theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${appState.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </div>
      <div class="form-group">
        <label for="settings-notifications">Enable Notifications:</label>
        <input type="checkbox" id="settings-notifications" ${appState.settings.notifications ? 'checked' : ''}>
      </div>
      <div class="form-group">
        <label for="settings-color-coding">Use Color Coding:</label>
        <input type="checkbox" id="settings-color-coding" ${appState.settings.colorCoding ? 'checked' : ''}>
      </div>
      <div class="form-group">
        <button id="export-data" class="btn btn-outline">Export All Data</button>
        <button id="import-data" class="btn btn-outline">Import Data</button>
      </div>
    </div>
  `;
  
  showModal('Application Settings', content, updateAppSettings);
}

// Update user profile from modal
async function updateUserProfile() {
  try {
    const color = document.getElementById('profile-color').value;
    const notifications = document.getElementById('profile-notification').value;
    
    appState.currentUser.color = color;
    appState.currentUser.notifications = notifications;
    
    await updateUser(appState.currentUser);
    showNotification('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile', 'error');
  }
}

// Update application settings from modal
async function updateAppSettings() {
  try {
    const theme = document.getElementById('settings-theme').value;
    const notifications = document.getElementById('settings-notifications').checked;
    const colorCoding = document.getElementById('settings-color-coding').checked;
    
    appState.settings = { ...appState.settings, theme, notifications, colorCoding };
    
    await saveSettings(appState.settings);
    applySettings();
    showNotification('Settings updated successfully', 'success');
  } catch (error) {
    console.error('Error updating settings:', error);
    showNotification('Failed to update settings', 'error');
  }
}

// Update today's events on dashboard
function updateTodayEvents(events) {
  const container = document.getElementById('today-events');
  
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">event_busy</i>
        <p>No events scheduled for today</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  events.forEach(event => {
    const startTime = new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    html += `
      <div class="event-item" style="border-left: 4px solid ${event.colorId ? getColorForId(event.colorId) : '#4285F4'}">
        <div class="event-time">${startTime} - ${endTime}</div>
        <div class="event-title">${event.summary}</div>
        <div class="event-location">${event.location || ''}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Update today's tasks on dashboard
function updateTodayTasks(tasks) {
  const container = document.getElementById('today-tasks');
  
  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">check_circle_outline</i>
        <p>No tasks for today</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  tasks.forEach(task => {
    html += `
      <div class="task-item">
        <div class="task-checkbox">
          <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
          <label for="task-${task.id}"></label>
        </div>
        <div class="task-content">
          <div class="task-title ${task.completed ? 'completed' : ''}">${task.title}</div>
          <div class="task-info">
            <span class="task-due">Due: ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="task-assignee" style="color: ${task.assigneeColor || '#4285F4'}">${task.assignee || 'Unassigned'}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Add event listeners to checkboxes
  container.querySelectorAll('.task-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', handleTaskStatusChange);
  });
}

// Update today's meals on dashboard
function updateTodayMeals(meals) {
  const container = document.getElementById('today-meals');
  
  if (!meals || meals.length === 0) {
    container.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">restaurant</i>
        <p>No meals planned for today</p>
      </div>
    `;
    return;
  }
  
  // Sort meals by type in a specific order: breakfast, lunch, dinner, snack
  const mealTypeOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
  
  const sortedMeals = [...meals].sort((a, b) => {
    return mealTypeOrder[a.type] - mealTypeOrder[b.type];
  });
  
  let html = '';
  sortedMeals.forEach(meal => {
    let typeBadge = `<span class="meal-type-badge ${meal.type}">${capitalizeFirstLetter(meal.type)}</span>`;
    
    html += `
      <div class="meal-item">
        <div class="meal-type">${typeBadge}</div>
        <div class="meal-name">${meal.name}</div>
        <div class="meal-info">
          <span>${meal.time ? formatTime(meal.time) : ''}</span>
          ${meal.preparationTime ? `<span class="meal-preparationTime">Prep: ${meal.preparationTime} min</span>` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Update family widget on dashboard
function updateFamilyWidget(family) {
  const container = document.getElementById('family-members');
  
  if (!family || family.length === 0) {
    container.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">people_outline</i>
        <p>No family members added yet</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  family.forEach(member => {
    html += `
      <div class="family-member">
        <div class="member-avatar" style="background-color: ${member.color || '#4285F4'}">
          ${member.name.charAt(0).toUpperCase()}
        </div>
        <div class="member-info">
          <div class="member-name">${member.name}</div>
          <div class="member-status">${getMemberStatus(member)}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Helper function to get member status
function getMemberStatus(member) {
  if (member.lastActivity) {
    const lastActive = new Date(member.lastActivity);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));
    
    if (diffMinutes < 5) {
      return 'Online now';
    } else if (diffMinutes < 60) {
      return `Active ${diffMinutes} min ago`;
    } else if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return `Active ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(diffMinutes / (24 * 60));
      return `Last seen ${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  }
  
  return 'Status unknown';
}

// Helper function to format time
function formatTime(timeString) {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    
    return `${formattedHour}:${formattedMinute} ${period}`;
  } catch (error) {
    return timeString;
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Handle task status change
async function handleTaskStatusChange(event) {
  const checkbox = event.target;
  const taskId = checkbox.id.replace('task-', '');
  const completed = checkbox.checked;
  
  try {
    // Get the full task object
    const task = await getTaskById(taskId);
    if (!task) return;
    
    // Update it
    task.completed = completed;
    task.completedDate = completed ? new Date().toISOString() : null;
    
    // Save changes
    await updateTask(task);
    
    // Update UI
    const taskTitle = checkbox.parentElement.nextElementSibling.querySelector('.task-title');
    if (completed) {
      taskTitle.classList.add('completed');
    } else {
      taskTitle.classList.remove('completed');
    }
    
    showNotification(`Task marked as ${completed ? 'completed' : 'incomplete'}`, 'success');
    
    // Handle sync if online
    if (appState.isOnline) {
      syncTaskItem(task);
    } else {
      // Queue for later sync
      appState.pendingSyncItems.push({
        type: 'task',
        data: task,
        processed: false
      });
      
      showNotification('Task will be synced when you are back online', 'info');
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    showNotification('Failed to update task status', 'error');
    
    // Revert checkbox state
    checkbox.checked = !completed;
  }
}

// Helper function to get color for ID
function getColorForId(colorId) {
  const colors = {
    '1': '#7986CB', // Lavender
    '2': '#33B679', // Sage
    '3': '#8E24AA', // Grape
    '4': '#E67C73', // Flamingo
    '5': '#F6BF26', // Banana
    '6': '#F4511E', // Tangerine
    '7': '#039BE5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3F51B5', // Blueberry
    '10': '#0B8043', // Basil
    '11': '#D50000', // Tomato
  };
  
  return colors[colorId] || '#4285F4'; // Default to blue
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);