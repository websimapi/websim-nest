// Core calendar functionality for the Family Organizer app

// Cache for calendar data
let calendarCache = {
  events: [],
  lastSync: null,
  syncToken: null,
  calendars: []
};

// Current calendar view state
const calendarState = {
  currentDate: new Date(),
  viewMode: 'month',
  selectedCalendars: [],
  draggedEvent: null,
  selectedDate: new Date() // Default to today
};

// Initialize calendar synchronization
async function initCalendarSync() {
  if (!appState.isAuthenticated) {
    console.warn('Cannot sync calendar: User not authenticated');
    return;
  }
  
  try {
    // For now, we'll just load local calendar data
    // since Google Calendar sync is removed
    await refreshEventCache();
    
    // Update last sync time
    calendarCache.lastSync = new Date();
    appState.lastSync = new Date();
    
    console.log('Local calendar data loaded successfully');
    
    // Update UI if calendar view is active
    if (appState.currentView === 'calendar') {
      refreshCalendarView();
    }
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
    
  } catch (error) {
    console.error('Error loading calendar data:', error);
    showNotification('Failed to load calendar data', 'error');
  }
}

// Refresh the event cache from IndexedDB
async function refreshEventCache() {
  try {
    // Get all events from IndexedDB
    let events = await getAllEvents();
    
    // If viewing as family member, filter events
    if (appState.activeFamilyMember) {
      // This is a simplified approach - in a real app, you'd track event ownership
      // Here we just filter by events that include the family member's name
      events = events.filter(event => 
        event.summary.toLowerCase().includes(appState.activeFamilyMember.name.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(appState.activeFamilyMember.name.toLowerCase()))
      );
    }
    
    calendarCache.events = events;
    return events;
  } catch (error) {
    console.error('Error refreshing event cache:', error);
    return [];
  }
}

// Initialize the calendar view
function initCalendarView() {
  console.log('Initializing calendar view');
  
  // Set up event listeners for calendar controls
  document.getElementById('prev-month').addEventListener('click', navigateToPreviousMonth);
  document.getElementById('next-month').addEventListener('click', navigateToNextMonth);
  document.getElementById('sync-calendar').addEventListener('click', handleManualSync);
  document.getElementById('add-event').addEventListener('click', () => showAddEventModal(calendarState.selectedDate));
  
  // Set up view option buttons
  document.querySelectorAll('.view-options button').forEach(button => {
    button.addEventListener('click', handleViewChange);
  });
  
  // Update calendar header with current month/year
  updateCalendarHeader();
  
  // Ensure event cache is refreshed before rendering
  refreshEventCache().then(() => {
    // Render the calendar with events
    renderCalendar();
  }).catch(error => {
    console.error('Error refreshing calendar events:', error);
    renderCalendar(); // Still render even if there's an error
  });
}

// Handle manual calendar sync button click
async function handleManualSync() {
  // Check if already syncing
  if (document.getElementById('sync-calendar').disabled) {
    return;
  }
  
  // Disable button and show syncing state
  const syncButton = document.getElementById('sync-calendar');
  syncButton.disabled = true;
  syncButton.innerHTML = '<i class="material-icons rotating">sync</i><span>Syncing...</span>';
  
  try {
    await initCalendarSync();
    showNotification('Calendar synced successfully', 'success');
  } catch (error) {
    console.error('Manual sync failed:', error);
    showNotification('Calendar sync failed', 'error');
  } finally {
    // Restore button state
    syncButton.disabled = false;
    syncButton.innerHTML = '<i class="material-icons">sync</i><span>Sync Calendar</span>';
  }
}

// Handle calendar view change
function handleViewChange(event) {
  const button = event.currentTarget;
  const viewMode = button.dataset.view;
  
  // Update active button
  document.querySelectorAll('.view-options button').forEach(btn => {
    btn.classList.toggle('active', btn === button);
  });
  
  // Update calendar state
  calendarState.viewMode = viewMode;
  
  // Re-render calendar with new view
  renderCalendar();
}

// Navigate to previous month
function navigateToPreviousMonth() {
  calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() - 1);
  updateCalendarHeader();
  renderCalendar();
}

// Navigate to next month
function navigateToNextMonth() {
  calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() + 1);
  updateCalendarHeader();
  renderCalendar();
}

// Update calendar header with current month/year
function updateCalendarHeader() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = monthNames[calendarState.currentDate.getMonth()];
  const year = calendarState.currentDate.getFullYear();
  
  document.getElementById('current-month').textContent = `${month} ${year}`;
}

// Get events for a date range
function getEventsForDateRange(startDate, endDate, eventsArray = null) {
  // Use provided events array or the cached events
  const events = eventsArray || calendarCache.events || [];
  
  if (!events || !Array.isArray(events) || events.length === 0) {
    return [];
  }
  
  return events.filter(event => {
    // Get event start/end times
    const eventStart = event.start?.dateTime 
      ? new Date(event.start.dateTime)
      : event.start?.date 
        ? new Date(event.start.date)
        : null;
    
    const eventEnd = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date)
        : null;
    
    if (!eventStart || !eventEnd) return false;
    
    // Check if event overlaps with the specified range
    return eventStart < endDate && eventEnd > startDate;
  });
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

// Refresh the calendar view
function refreshCalendarView() {
  if (appState.currentView === 'calendar') {
    // Update the event cache before rendering
    refreshEventCache().then(() => {
      renderCalendar();
    }).catch(error => {
      console.error('Error refreshing events:', error);
      renderCalendar(); // Still render even if there's an error
    });
  }
}

// Render the calendar based on current view mode
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  
  if (!appState.isAuthenticated) {
    container.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to access your calendar</p>
      </div>
    `;
    return;
  }
  
  // Clear previous content
  container.innerHTML = '';
  
  // Set today as default selected date if none is already selected
  if (!calendarState.selectedDate) {
    calendarState.selectedDate = new Date();
  }
  
  // Render based on view mode
  switch (calendarState.viewMode) {
    case 'month':
      renderMonthView(container);
      break;
    case 'week':
      renderWeekView(container);
      break;
    case 'day':
      renderDayView(container);
      break;
    case 'list':
      renderListView(container);
      break;
    default:
      renderMonthView(container);
  }
}

// ... existing code ...
