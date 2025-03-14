// Calendar functionality for the Family Organizer app

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
  selectedDate: null
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

// Sync a new event (local storage only now)
async function syncEventToGoogle(event) {
  try {
    // Just store locally since Google Calendar sync is removed
    await storeEvent(event);
    return event;
  } catch (error) {
    console.error('Error storing event:', error);
    throw error;
  }
}

// Sync an updated event (local storage only now)
async function syncEventUpdateToGoogle(event) {
  try {
    // Just update locally since Google Calendar sync is removed
    await updateEvent(event);
    return event;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// Sync a deleted event (local storage only now)
async function syncEventDeleteToGoogle(event) {
  try {
    // Just delete locally since Google Calendar sync is removed
    await deleteEvent(event.id);
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
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
  
  // Render the calendar with events
  renderCalendar();
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

// Render month view calendar
function renderMonthView(container) {
  const currentDate = new Date(calendarState.currentDate);
  currentDate.setDate(1); // Set to first day of month
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  // Get first day of month and adjust for Sunday start
  const firstDay = new Date(year, month, 1).getDay();
  
  // Get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'calendar-grid month-view';
  
  // Add weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-header';
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });
  
  // Add blank cells for days before first day of month
  for (let i = 0; i < firstDay; i++) {
    const blankDay = document.createElement('div');
    blankDay.className = 'calendar-day empty';
    calendarGrid.appendChild(blankDay);
  }
  
  // Get current date for highlighting today
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  
  // Add cells for each day in month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    // Create date for this cell
    const cellDate = new Date(year, month, day);
    
    // Highlight today
    if (isCurrentMonth && day === today.getDate()) {
      dayCell.classList.add('today');
    }
    
    // Highlight selected date if it exists and matches this cell
    if (calendarState.selectedDate && 
        cellDate.getDate() === calendarState.selectedDate.getDate() &&
        cellDate.getMonth() === calendarState.selectedDate.getMonth() &&
        cellDate.getFullYear() === calendarState.selectedDate.getFullYear()) {
      dayCell.classList.add('selected');
    }
    
    // Day number display
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    // Event container
    const eventContainer = document.createElement('div');
    eventContainer.className = 'day-events';
    
    // Find events for this day
    const date = new Date(year, month, day);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEvents = getEventsForDateRange(dayStart, dayEnd, calendarCache.events);
    
    if (Array.isArray(dayEvents) && dayEvents.length > 0) {
      // Sort events by time
      dayEvents.sort((a, b) => {
        const aTime = a.start.dateTime ? new Date(a.start.dateTime) : new Date(a.start.date);
        const bTime = b.start.dateTime ? new Date(b.start.dateTime) : new Date(b.start.date);
        return aTime - bTime;
      });
      
      // Show only first 3 events (or fewer if there are less)
      const eventsToShow = dayEvents.slice(0, 3);
      
      eventsToShow.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.dataset.eventId = event.id;
        
        if (event.colorId) {
          eventElement.style.backgroundColor = getColorForId(event.colorId);
        }
        
        // Format time if not an all-day event
        let eventTime = '';
        if (event.start.dateTime) {
          const startTime = new Date(event.start.dateTime);
          eventTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        eventElement.innerHTML = `
          ${eventTime ? `<span class="event-time">${eventTime}</span>` : ''}
          <span class="event-title">${event.summary}</span>
        `;
        
        // Add click event listener
        eventElement.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent day cell click
          showEventDetails(event);
        });
        
        // Make events draggable
        eventElement.draggable = true;
        eventElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', event.id);
          eventElement.classList.add('dragging');
        });
        
        eventElement.addEventListener('dragend', () => {
          eventElement.classList.remove('dragging');
        });
        
        eventContainer.appendChild(eventElement);
      });
      
      // Show indicator if there are more events
      if (dayEvents.length > 3) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-events';
        moreIndicator.textContent = `+${dayEvents.length - 3} more`;
        
        // Add click handler to show all events for day
        moreIndicator.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent day cell click
          showDayEventsModal(date, dayEvents);
        });
        
        eventContainer.appendChild(moreIndicator);
      }
    }
    
    dayCell.appendChild(eventContainer);
    
    // Make day cell droppable for events
    dayCell.addEventListener('dragover', handleDragOver);
    dayCell.addEventListener('drop', handleDrop);
    dayCell.addEventListener('dragleave', (e) => {
      e.currentTarget.classList.remove('drag-over');
    });
    
    // Click to select this date
    dayCell.addEventListener('click', () => {
      // Clear previous selection
      document.querySelectorAll('.calendar-day.selected').forEach(cell => {
        cell.classList.remove('selected');
      });
      
      // Set new selection
      dayCell.classList.add('selected');
      calendarState.selectedDate = new Date(date);
    });
    
    // Double click to add event on this date
    dayCell.addEventListener('dblclick', () => showAddEventModal(date));
    
    // Add to calendar grid
    calendarGrid.appendChild(dayCell);
  }
  
  // Add blank cells for days after last day of month to complete grid
  const totalCells = weekdays.length * Math.ceil((firstDay + daysInMonth) / 7);
  const remainingCells = totalCells - (firstDay + daysInMonth);
  
  for (let i = 0; i < remainingCells; i++) {
    const blankDay = document.createElement('div');
    blankDay.className = 'calendar-day empty';
    calendarGrid.appendChild(blankDay);
  }
  
  container.appendChild(calendarGrid);
}

// ... existing code ...