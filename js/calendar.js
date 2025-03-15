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

// Render week view calendar
function renderWeekView(container) {
  const currentDate = new Date(calendarState.currentDate);
  
  // Adjust to start of week (Sunday)
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);
  
  // Create calendar grid
  const calendarWeek = document.createElement('div');
  calendarWeek.className = 'calendar-week';
  
  // Create time gutter
  const timeGutter = document.createElement('div');
  timeGutter.className = 'time-gutter';
  
  // Add hour labels (5 AM to 9 PM)
  for (let hour = 5; hour <= 21; hour++) {
    const hourLabel = document.createElement('div');
    hourLabel.className = 'hour-label';
    hourLabel.textContent = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
    timeGutter.appendChild(hourLabel);
  }
  
  calendarWeek.appendChild(timeGutter);
  
  // Get today's date for highlighting
  const today = new Date();
  
  // Create day columns
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currentDate);
    dayDate.setDate(currentDate.getDate() + i);
    
    const dayColumn = document.createElement('div');
    dayColumn.className = 'day-column';
    
    // Highlight today's column
    if (
      dayDate.getDate() === today.getDate() &&
      dayDate.getMonth() === today.getMonth() &&
      dayDate.getFullYear() === today.getFullYear()
    ) {
      dayColumn.classList.add('today');
    }
    
    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
    dayHeader.innerHTML = `
      <div class="weekday">${weekday}</div>
      <div class="date">${dayDate.getDate()}</div>
    `;
    
    dayColumn.appendChild(dayHeader);
    
    // Event container for timed events
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'day-events-container';
    
    // Create hour grid
    for (let hour = 5; hour <= 21; hour++) {
      const hourCell = document.createElement('div');
      hourCell.className = 'hour-cell';
      hourCell.dataset.hour = hour;
      
      eventsContainer.appendChild(hourCell);
    }
    
    // Find events for this day
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEvents = getEventsForDateRange(dayStart, dayEnd, calendarCache.events);
    
    if (Array.isArray(dayEvents)) {
      // Place timed events
      const timedEvents = dayEvents.filter(event => event.start.dateTime);
      
      timedEvents.forEach(event => {
        // Skip all-day events
        if (!event.start.dateTime) return;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'week-event';
        eventElement.dataset.eventId = event.id;
        
        // Set color
        if (event.colorId) {
          eventElement.style.borderLeftColor = getColorForId(event.colorId);
        }
        
        // Calculate position
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
        
        // Skip events outside our displayed range (5am-9pm)
        if (endHour < 5 || startHour > 21) return;
        
        const displayStartHour = Math.max(5, startHour);
        const displayEndHour = Math.min(21, endHour);
        
        const top = (displayStartHour - 5) * 60; // 60px per hour
        const height = (displayEndHour - displayStartHour) * 60;
        
        eventElement.style.top = `${top}px`;
        eventElement.style.height = `${height}px`;
        
        // Format time
        const formattedStartTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        eventElement.innerHTML = `
          <div class="event-time">${formattedStartTime}</div>
          <div class="event-title">${event.summary}</div>
        `;
        
        // Add click event listener
        eventElement.addEventListener('click', () => showEventDetails(event));
        
        eventsContainer.appendChild(eventElement);
      });
      
      // Add all-day events at top
      const allDayEvents = dayEvents.filter(event => !event.start.dateTime);
      if (allDayEvents.length > 0) {
        const allDayContainer = document.createElement('div');
        allDayContainer.className = 'all-day-container';
        
        allDayEvents.forEach(event => {
          const eventElement = document.createElement('div');
          eventElement.className = 'all-day-event';
          eventElement.dataset.eventId = event.id;
          
          if (event.colorId) {
            eventElement.style.backgroundColor = getColorForId(event.colorId);
          }
          
          eventElement.textContent = event.summary;
          
          // Add click event listener
          eventElement.addEventListener('click', () => showEventDetails(event));
          
          allDayContainer.appendChild(eventElement);
        });
        
        // Fix: Append the allDayContainer to dayColumn before the eventsContainer is appended
        dayColumn.appendChild(allDayContainer);
      }
    }
    
    dayColumn.appendChild(eventsContainer);
    calendarWeek.appendChild(dayColumn);
  }
  
  container.appendChild(calendarWeek);
}

// Render day view calendar
function renderDayView(container) {
  const currentDate = new Date(calendarState.currentDate);
  
  // Create day view container
  const dayView = document.createElement('div');
  dayView.className = 'day-view';
  
  // Day header
  const dayHeader = document.createElement('div');
  dayHeader.className = 'day-header';
  
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
  dayHeader.innerHTML = `
    <h3>${weekday}, ${currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
  `;
  
  dayView.appendChild(dayHeader);
  
  // Create main day content with time gutter and events
  const dayContent = document.createElement('div');
  dayContent.className = 'day-content';
  
  // Create time gutter
  const timeGutter = document.createElement('div');
  timeGutter.className = 'time-gutter';
  
  // Add hour labels (5 AM to 9 PM)
  for (let hour = 5; hour <= 21; hour++) {
    const hourLabel = document.createElement('div');
    hourLabel.className = 'hour-label';
    hourLabel.textContent = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
    timeGutter.appendChild(hourLabel);
  }
  
  dayContent.appendChild(timeGutter);
  
  // Create event container
  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'day-events-container';
  
  // Create hour grid
  for (let hour = 5; hour <= 21; hour++) {
    const hourCell = document.createElement('div');
    hourCell.className = 'hour-cell';
    hourCell.dataset.hour = hour;
    
    // Add half-hour divider
    const halfHourDivider = document.createElement('div');
    halfHourDivider.className = 'half-hour-divider';
    hourCell.appendChild(halfHourDivider);
    
    eventsContainer.appendChild(hourCell);
  }
  
  // Find events for this day
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayEvents = getEventsForDateRange(dayStart, dayEnd, calendarCache.events);
  
  if (Array.isArray(dayEvents)) {
    // Add all-day events section if needed
    const allDayEvents = dayEvents.filter(event => !event.start.dateTime);
    if (allDayEvents.length > 0) {
      const allDaySection = document.createElement('div');
      allDaySection.className = 'all-day-section';
      
      const allDayHeader = document.createElement('div');
      allDayHeader.className = 'all-day-header';
      allDayHeader.textContent = 'All Day';
      
      const allDayContent = document.createElement('div');
      allDayContent.className = 'all-day-content';
      
      allDayEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'all-day-event';
        eventElement.dataset.eventId = event.id;
        
        if (event.colorId) {
          eventElement.style.backgroundColor = getColorForId(event.colorId);
        }
        
        eventElement.textContent = event.summary;
        
        // Add click event listener
        eventElement.addEventListener('click', () => showEventDetails(event));
        
        allDayContent.appendChild(eventElement);
      });
      
      allDaySection.appendChild(allDayHeader);
      allDaySection.appendChild(allDayContent);
      
      dayView.appendChild(allDaySection);
    }
    
    // Place timed events
    const timedEvents = dayEvents.filter(event => event.start.dateTime);
    
    timedEvents.forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.className = 'day-event';
      eventElement.dataset.eventId = event.id;
      
      // Set color
      if (event.colorId) {
        eventElement.style.borderLeftColor = getColorForId(event.colorId);
      }
      
      // Calculate position
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      
      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
      const endHour = endTime.getHours() + endTime.getMinutes() / 60;
      
      // Skip events outside our displayed range (5am-9pm)
      if (endHour < 5 || startHour > 21) return;
      
      const displayStartHour = Math.max(5, startHour);
      const displayEndHour = Math.min(21, endHour);
      
      const top = (displayStartHour - 5) * 60; // 60px per hour
      const height = (displayEndHour - displayStartHour) * 60;
      
      eventElement.style.top = `${top}px`;
      eventElement.style.height = `${height}px`;
      
      // Format times
      const formattedStartTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      eventElement.innerHTML = `
        <div class="event-time">${formattedStartTime} - ${formattedEndTime}</div>
        <div class="event-title">${event.summary}</div>
        <div class="event-location">${event.location || ''}</div>
      `;
      
      // Add click event listener
      eventElement.addEventListener('click', () => showEventDetails(event));
      
      eventsContainer.appendChild(eventElement);
    });
    
    // Add current time indicator if today
    const today = new Date();
    if (
      today.getDate() === currentDate.getDate() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    ) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      
      if (currentHour >= 5 && currentHour <= 21) {
        const timeIndicator = document.createElement('div');
        timeIndicator.className = 'current-time-indicator';
        
        const top = (currentHour - 5) * 60;
        timeIndicator.style.top = `${top}px`;
        
        eventsContainer.appendChild(timeIndicator);
      }
    }
  }
  
  dayContent.appendChild(eventsContainer);
  dayView.appendChild(dayContent);
  
  container.appendChild(dayView);
}

// Render agenda-style list view
function renderListView(container) {
  const listView = document.createElement('div');
  listView.className = 'list-view';
  
  // Get start and end dates (2 weeks range)
  const startDate = new Date(calendarState.currentDate);
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(calendarState.currentDate);
  endDate.setDate(endDate.getDate() + 14);
  endDate.setHours(23, 59, 59, 999);
  
  // Get all events in the range
  const events = getEventsForDateRange(startDate, endDate, calendarCache.events);
  
  // Ensure events is an array
  if (!Array.isArray(events) || events.length === 0) {
    const noEvents = document.createElement('div');
    noEvents.className = 'no-events-message';
    noEvents.innerHTML = `
      <i class="material-icons">event_busy</i>
      <p>No events scheduled for the selected period</p>
    `;
    listView.appendChild(noEvents);
    container.appendChild(listView);
    return;
  }
  
  // Group events by date
  const eventsByDate = {};
  
  events.forEach(event => {
    const date = event.start.dateTime 
      ? new Date(event.start.dateTime).toDateString() 
      : new Date(event.start.date).toDateString();
    
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    
    eventsByDate[date].push(event);
  });
  
  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a) - new Date(b));
  
  // Render each date group
  sortedDates.forEach(dateString => {
    const date = new Date(dateString);
    const dateEvents = eventsByDate[dateString];
    
    // Create date header
    const dateHeader = document.createElement('div');
    dateHeader.className = 'list-date-header';
    
    const isToday = date.toDateString() === new Date().toDateString();
    if (isToday) {
      dateHeader.classList.add('today');
    }
    
    const formattedDate = date.toLocaleDateString(undefined, { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
    
    dateHeader.textContent = formattedDate + (isToday ? ' (Today)' : '');
    listView.appendChild(dateHeader);
    
    // Create events list for this date
    const eventsList = document.createElement('div');
    eventsList.className = 'list-events';
    
    // Sort events by time
    dateEvents.sort((a, b) => {
      const aTime = a.start.dateTime ? new Date(a.start.dateTime) : new Date(a.start.date);
      const bTime = b.start.dateTime ? new Date(b.start.dateTime) : new Date(b.start.date);
      return aTime - bTime;
    });
    
    // Add each event
    dateEvents.forEach(event => {
      const eventItem = document.createElement('div');
      eventItem.className = 'list-event-item';
      eventItem.dataset.eventId = event.id;
      
      // Color indicator
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'event-color-indicator';
      colorIndicator.style.backgroundColor = event.colorId ? getColorForId(event.colorId) : '#4285F4';
      
      // Event content
      const eventContent = document.createElement('div');
      eventContent.className = 'list-event-content';
      
      // Format time
      let timeStr = 'All day';
      if (event.start.dateTime) {
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        timeStr = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      eventContent.innerHTML = `
        <div class="event-time">${timeStr}</div>
        <div class="event-title">${event.summary}</div>
        ${event.location ? `<div class="event-location"><i class="material-icons">place</i>${event.location}</div>` : ''}
      `;
      
      // Action buttons
      const eventActions = document.createElement('div');
      eventActions.className = 'list-event-actions';
      
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-icon';
      editButton.innerHTML = '<i class="material-icons">edit</i>';
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showEditEventModal(event);
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-icon';
      deleteButton.innerHTML = '<i class="material-icons">delete</i>';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteEventConfirmation(event);
      });
      
      eventActions.appendChild(editButton);
      eventActions.appendChild(deleteButton);
      
      // Assemble event item
      eventItem.appendChild(colorIndicator);
      eventItem.appendChild(eventContent);
      eventItem.appendChild(eventActions);
      
      // Add click event listener for the whole item
      eventItem.addEventListener('click', () => showEventDetails(event));
      
      eventsList.appendChild(eventItem);
    });
    
    listView.appendChild(eventsList);
  });
  
  container.appendChild(listView);
}

// Show modal with event details
function showEventDetails(event) {
  // Format times
  let timeStr = 'All day';
  if (event.start.dateTime) {
    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    
    const options = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    };
    
    timeStr = `${startTime.toLocaleString(undefined, options)} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    const startDate = new Date(event.start.date);
    const options = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    };
    timeStr = startDate.toLocaleDateString(undefined, options);
  }
  
  // Find calendar this event belongs to
  const calendar = calendarCache.calendars.find(cal => cal.id === event.calendarId);
  const calendarName = calendar ? calendar.summary : 'Unknown Calendar';
  
  // Build HTML content
  const content = `
    <div class="event-details">
      <div class="event-header" style="border-left: 4px solid ${event.colorId ? getColorForId(event.colorId) : '#4285F4'}">
        <h3>${event.summary}</h3>
      </div>
      <div class="event-info">
        <div class="info-item">
          <i class="material-icons">access_time</i>
          <span>${timeStr}</span>
        </div>
        ${event.location ? `
          <div class="info-item">
            <i class="material-icons">place</i>
            <span>${event.location}</span>
          </div>
        ` : ''}
        <div class="info-item">
          <i class="material-icons">calendar_today</i>
          <span>${calendarName}</span>
        </div>
        ${event.description ? `
          <div class="info-item description">
            <i class="material-icons">description</i>
            <span>${event.description}</span>
          </div>
        ` : ''}
      </div>
      <div class="event-actions">
        <button id="edit-event" class="btn btn-outline">
          <i class="material-icons">edit</i>
          <span>Edit</span>
        </button>
        <button id="delete-event" class="btn btn-outline danger">
          <i class="material-icons">delete</i>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;
  
  showModal('Event Details', content);
  
  // Add event listeners to buttons
  document.getElementById('edit-event').addEventListener('click', () => {
    closeModal();
    showEditEventModal(event);
  });
  
  document.getElementById('delete-event').addEventListener('click', () => {
    closeModal();
    showDeleteEventConfirmation(event);
  });
}

// Show modal to add a new event
function showAddEventModal(date) {
  // Use provided date, selected date, or current date
  const selectedDate = date || calendarState.selectedDate || new Date();
  
  // Format date for form
  const dateStr = selectedDate.toISOString().split('T')[0];
  
  // Set default times (current time rounded to nearest half hour)
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
  const startTime = now.toTimeString().substring(0, 5);
  
  now.setHours(now.getHours() + 1);
  const endTime = now.toTimeString().substring(0, 5);
  
  // Build calendar selection options
  let calendarOptions = '';
  calendarCache.calendars.forEach(calendar => {
    calendarOptions += `<option value="${calendar.id}">${calendar.summary}</option>`;
  });
  
  // Build color selection options with visual color swatches
  let colorOptions = '';
  const colorMap = {
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
  
  for (const [id, color] of Object.entries(colorMap)) {
    colorOptions += `
      <div class="color-option ${id === '1' ? 'selected' : ''}" data-color-id="${id}">
        <div class="color-swatch" style="background-color: ${color}"></div>
      </div>
    `;
  }
  
  // Determine if all-day should be selected by default
  // If a date object was passed, it's a timed event, otherwise it's all-day
  const isAllDay = !(selectedDate instanceof Date);
  
  // Build HTML content
  const content = `
    <form id="add-event-form" class="event-form">
      <div class="form-group">
        <label for="event-title">Event Title *</label>
        <div class="input-with-icon">
          <i class="material-icons">event</i>
          <input type="text" id="event-title" required placeholder="Enter event title">
        </div>
      </div>
      
      <div class="event-type-toggle">
        <label>Event Type:</label>
        <div class="toggle-container">
          <label for="event-timed" class="toggle-option ${!isAllDay ? 'active' : ''}">
            <input type="radio" id="event-timed" name="event-type" value="timed" ${!isAllDay ? 'checked' : ''}>
            <span>Timed</span>
          </label>
          <label for="event-all-day" class="toggle-option ${isAllDay ? 'active' : ''}">
            <input type="radio" id="event-all-day" name="event-type" value="allday" ${isAllDay ? 'checked' : ''}>
            <span>All Day</span>
          </label>
        </div>
      </div>
      
      <div class="form-row time-inputs">
        <div class="form-group">
          <label for="event-date">Date *</label>
          <div class="input-with-icon">
            <i class="material-icons">calendar_today</i>
            <input type="date" id="event-date" required value="${dateStr}">
          </div>
        </div>
        
        <div class="form-group start-time" ${isAllDay ? 'style="display: none"' : ''}>
          <label for="event-start-time">Start Time *</label>
          <div class="input-with-icon">
            <i class="material-icons">access_time</i>
            <input type="time" id="event-start-time" required value="${startTime}">
          </div>
        </div>
        
        <div class="form-group end-time" ${isAllDay ? 'style="display: none"' : ''}>
          <label for="event-end-time">End Time *</label>
          <div class="input-with-icon">
            <i class="material-icons">access_time</i>
            <input type="time" id="event-end-time" required value="${endTime}">
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-location">Location</label>
        <div class="input-with-icon">
          <i class="material-icons">place</i>
          <input type="text" id="event-location" placeholder="Add location">
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-calendar">Calendar</label>
        <div class="input-with-icon">
          <i class="material-icons">event_note</i>
          <select id="event-calendar">
            ${calendarOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label>Color</label>
        <div class="color-selector">
          ${colorOptions}
          <input type="hidden" id="event-color" value="1">
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-description">Description</label>
        <div class="input-with-icon textarea-icon">
          <i class="material-icons">notes</i>
          <textarea id="event-description" rows="3" placeholder="Add description"></textarea>
        </div>
      </div>
    </form>
  `;
  
  showModal('Add Event', content, handleAddEvent);
  
  // Update toggle option styling when radio changes
  document.querySelectorAll('.toggle-option input').forEach(radio => {
    radio.addEventListener('change', function() {
      // Remove active class from all options
      document.querySelectorAll('.toggle-option').forEach(option => {
        option.classList.remove('active');
      });
      
      // Add active class to selected option
      this.closest('.toggle-option').classList.add('active');
      
      // Show/hide time inputs based on selection
      const timeInputs = document.querySelectorAll('.time-inputs .form-group.start-time, .time-inputs .form-group.end-time');
      if (this.id === 'event-all-day') {
        timeInputs.forEach(input => {
          input.style.display = 'none';
        });
      } else {
        timeInputs.forEach(input => {
          input.style.display = 'block';
        });
      }
    });
  });
  
  // Handle color selector
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      // Add selected class to clicked option
      option.classList.add('selected');
      // Update hidden input value
      document.getElementById('event-color').value = option.dataset.colorId;
    });
  });
}

// Handle adding a new event
async function handleAddEvent() {
  const form = document.getElementById('add-event-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const title = document.getElementById('event-title').value;
    const isAllDay = document.getElementById('event-all-day').checked;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const location = document.getElementById('event-location').value;
    const calendarId = document.getElementById('event-calendar').value;
    const colorId = document.getElementById('event-color').value;
    const description = document.getElementById('event-description').value;
    
    // Create event object
    const event = {
      summary: title,
      location: location,
      description: description,
      colorId: colorId,
      calendarId: calendarId,
    };
    
    if (isAllDay) {
      // For all-day events, use date string
      event.start = {
        date: date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        date: date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } else {
      // For timed events, combine date and time
      event.start = {
        dateTime: `${date}T${startTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: `${date}T${endTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Add unique client ID
    event.id = 'event_' + Date.now();
    
    // Save to local database first
    await storeEvent(event);
    
    // Update the cache with the new event
    await refreshEventCache();
    
    // Try to sync with Google Calendar if online
    if (appState.isOnline) {
      await syncEventToGoogle(event);
      showNotification('Event added and synced to Google Calendar', 'success');
    } else {
      // Queue for syncing later
      appState.pendingSyncItems.push({
        type: 'calendar',
        data: event,
        processed: false
      });
      
      showNotification('Event added. Will sync to Google Calendar when online', 'info');
    }
    
    // Refresh the calendar view
    refreshCalendarView();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error adding event:', error);
    showNotification('Failed to add event', 'error');
  }
}

// Show modal to edit an existing event
function showEditEventModal(event) {
  // Format dates for form
  let dateStr, startTimeStr, endTimeStr;
  const isAllDay = !event.start.dateTime;
  
  if (isAllDay) {
    dateStr = event.start.date;
    startTimeStr = '09:00';
    endTimeStr = '10:00';
  } else {
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    
    dateStr = startDate.toISOString().split('T')[0];
    startTimeStr = startDate.toTimeString().substring(0, 5);
    endTimeStr = endDate.toTimeString().substring(0, 5);
  }
  
  // Build calendar selection options
  let calendarOptions = '';
  calendarCache.calendars.forEach(calendar => {
    const selected = calendar.id === event.calendarId ? 'selected' : '';
    calendarOptions += `<option value="${calendar.id}" ${selected}>${calendar.summary}</option>`;
  });
  
  // Build color selection options
  let colorOptions = '';
  for (let i = 1; i <= 11; i++) {
    const color = getColorForId(i.toString());
    const selected = i.toString() === event.colorId ? 'selected' : '';
    colorOptions += `
      <option value="${i}" ${selected} style="background-color: ${color}; color: white;">
        Color ${i}
      </option>
    `;
  }
  
  // Build HTML content
  const content = `
    <form id="edit-event-form" class="event-form" data-event-id="${event.id}">
      <div class="form-group">
        <label for="event-title">Event Title *</label>
        <input type="text" id="event-title" required placeholder="Enter event title" 
          value="${event.summary || ''}">
      </div>
      
      <div class="form-group">
        <label for="event-all-day">All Day Event</label>
        <input type="checkbox" id="event-all-day" ${isAllDay ? 'checked' : ''}>
      </div>
      
      <div class="form-row time-inputs">
        <div class="form-group">
          <label for="event-date">Date *</label>
          <input type="date" id="event-date" required value="${dateStr}">
        </div>
        
        <div class="form-group start-time" style="display: ${isAllDay ? 'none' : 'block'}">
          <label for="event-start-time">Start Time *</label>
          <input type="time" id="event-start-time" required value="${startTimeStr}">
        </div>
        
        <div class="form-group end-time" style="display: ${isAllDay ? 'none' : 'block'}">
          <label for="event-end-time">End Time *</label>
          <input type="time" id="event-end-time" required value="${endTimeStr}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-location">Location</label>
        <input type="text" id="event-location" placeholder="Add location" 
          value="${event.location || ''}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="event-calendar">Calendar</label>
          <select id="event-calendar">
            ${calendarOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label for="event-color">Color</label>
          <select id="event-color">
            ${colorOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="event-description">Description</label>
        <textarea id="event-description" rows="3" placeholder="Add description">${event.description || ''}</textarea>
      </div>
    </form>
  `;
  
  showModal('Edit Event', content, () => handleEditEvent(event));
  
  // Handle all-day checkbox
  document.getElementById('event-all-day').addEventListener('change', function() {
    const timeInputs = document.querySelectorAll('.time-inputs .form-group.start-time, .time-inputs .form-group.end-time');
    timeInputs.forEach(input => {
      input.style.display = this.checked ? 'none' : 'block';
    });
  });
}

// Handle editing an event
async function handleEditEvent(originalEvent) {
  const form = document.getElementById('edit-event-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const eventId = form.dataset.eventId;
    const title = document.getElementById('event-title').value;
    const isAllDay = document.getElementById('event-all-day').checked;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const location = document.getElementById('event-location').value;
    const calendarId = document.getElementById('event-calendar').value;
    const colorId = document.getElementById('event-color').value;
    const description = document.getElementById('event-description').value;
    
    // Create updated event object
    const updatedEvent = {
      ...originalEvent,
      summary: title,
      location: location,
      description: description,
      colorId: colorId
    };
    
    // Handle calendar change
    const isCalendarChanged = calendarId !== originalEvent.calendarId;
    if (isCalendarChanged) {
      updatedEvent.calendarId = calendarId;
    }
    
    // Update date/time properties
    if (isAllDay) {
      updatedEvent.start = {
        date: date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      updatedEvent.end = {
        date: date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } else {
      updatedEvent.start = {
        dateTime: `${date}T${startTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      updatedEvent.end = {
        dateTime: `${date}T${endTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Update local database
    await updateEvent(updatedEvent);
    
    // Update the cache with the updated event
    await refreshEventCache();
    
    // Try to sync with Google Calendar if online
    if (appState.isOnline) {
      await syncEventUpdateToGoogle(updatedEvent);
      showNotification('Event updated and synced to Google Calendar', 'success');
    } else {
      // Queue for syncing later
      appState.pendingSyncItems.push({
        type: 'calendar',
        data: updatedEvent,
        processed: false
      });
      
      showNotification('Event updated. Will sync to Google Calendar when online', 'info');
    }
    
    // Refresh the calendar view
    refreshCalendarView();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error updating event:', error);
    showNotification('Failed to update event', 'error');
  }
}

// Show confirmation dialog for deleting an event
function showDeleteEventConfirmation(event) {
  const content = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to delete the event "${event.summary}"?</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Delete Event', content, () => handleDeleteEvent(event));
}

// Handle deleting an event
async function handleDeleteEvent(event) {
  try {
    // Delete from local database
    await deleteEvent(event.id);
    
    // Update the cache to remove the deleted event
    await refreshEventCache();
    
    // Try to sync with Google Calendar if online
    if (appState.isOnline) {
      await syncEventDeleteToGoogle(event);
      showNotification('Event deleted and synced to Google Calendar', 'success');
    } else {
      // Queue for syncing later
      appState.pendingSyncItems.push({
        type: 'calendar',
        data: event,
        action: 'delete',
        processed: false
      });
      
      showNotification('Event deleted. Will sync to Google Calendar when online', 'info');
    }
    
    // Refresh the calendar view
    refreshCalendarView();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    showNotification('Failed to delete event', 'error');
  }
}

// Show modal with all events for a specific day
function showDayEventsModal(date, events) {
  const formattedDate = date.toLocaleDateString(undefined, { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
  
  let eventsHtml = '';
  
  // Sort events by time
  events.sort((a, b) => {
    if (!a.start.dateTime && !b.start.dateTime) return 0;
    if (!a.start.dateTime) return -1;
    if (!b.start.dateTime) return 1;
    return new Date(a.start.dateTime) - new Date(b.start.dateTime);
  });
  
  // Generate HTML for each event
  events.forEach(event => {
    let timeStr = 'All day';
    if (event.start.dateTime) {
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      timeStr = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    eventsHtml += `
      <div class="day-modal-event" style="border-left: 4px solid ${event.colorId ? getColorForId(event.colorId) : '#4285F4'}">
        <div class="event-time">${timeStr}</div>
        <div class="event-title">${event.summary}</div>
        ${event.location ? `<div class="event-location">${event.location}</div>` : ''}
        <div class="event-actions">
          <button class="btn btn-icon btn-edit" data-event-id="${event.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="btn btn-icon btn-delete" data-event-id="${event.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>
    `;
  });
  
  const content = `
    <div class="day-events-modal">
      <div class="add-event-button">
        <button id="add-event-day" class="btn btn-primary">
          <i class="material-icons">add</i>
          <span>Add Event</span>
        </button>
      </div>
      <div class="day-events-list">
        ${eventsHtml}
      </div>
    </div>
  `;
  
  showModal(`Events for ${formattedDate}`, content);
  
  // Add event listeners
  document.getElementById('add-event-day').addEventListener('click', () => {
    closeModal();
    showAddEventModal(date);
  });
  
  // Add listeners for edit buttons
  document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.dataset.eventId;
      const event = events.find(e => e.id === eventId);
      if (event) {
        closeModal();
        showEditEventModal(event);
      }
    });
  });
  
  // Add listeners for delete buttons
  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.dataset.eventId;
      const event = events.find(e => e.id === eventId);
      if (event) {
        closeModal();
        showDeleteEventConfirmation(event);
      }
    });
  });
  
  // Add listeners for event clicks (for details)
  document.querySelectorAll('.day-modal-event').forEach((element, index) => {
    element.addEventListener('click', (e) => {
      // Only respond to clicks on the event itself, not on the action buttons
      if (!e.target.closest('.event-actions')) {
        closeModal();
        showEventDetails(events[index]);
      }
    });
  });
}

// Drag and drop event handling
function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add('drag-over');
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  const draggedEventId = event.dataTransfer.getData('text/plain');
  if (!draggedEventId) return;
  
  // Find the event
  const draggedEvent = calendarCache.events.find(e => e.id === draggedEventId);
  if (!draggedEvent) return;
  
  // Get the date of the target cell
  const cell = event.currentTarget;
  const dayNumber = cell.querySelector('.day-number').textContent;
  const year = calendarState.currentDate.getFullYear();
  const month = calendarState.currentDate.getMonth();
  
  // Create new date object for the target date
  const targetDate = new Date(year, month, parseInt(dayNumber));
  
  // Update the event with the new date
  moveEventToDate(draggedEvent, targetDate);
}

// Move an event to a new date
async function moveEventToDate(event, targetDate) {
  try {
    // Create copy of the event
    const updatedEvent = { ...event };
    
    // Calculate the difference in days
    const originalDate = event.start.dateTime 
      ? new Date(event.start.dateTime) 
      : new Date(event.start.date);
    
    const daysDiff = Math.round((targetDate - originalDate) / (1000 * 60 * 60 * 24));
    
    // Update start and end dates
    if (event.start.dateTime) {
      // Timed event
      const newStart = new Date(event.start.dateTime);
      newStart.setDate(newStart.getDate() + daysDiff);
      
      const newEnd = new Date(event.end.dateTime);
      newEnd.setDate(newEnd.getDate() + daysDiff);
      
      updatedEvent.start.dateTime = newStart.toISOString();
      updatedEvent.end.dateTime = newEnd.toISOString();
    } else {
      // All-day event
      const newStart = new Date(event.start.date);
      newStart.setDate(newStart.getDate() + daysDiff);
      
      const newEnd = new Date(event.end.date);
      newEnd.setDate(newEnd.getDate() + daysDiff);
      
      updatedEvent.start.date = newStart.toISOString().split('T')[0];
      updatedEvent.end.date = newEnd.toISOString().split('T')[0];
    }
    
    // Update in local database
    await updateEvent(updatedEvent);
    
    // Sync with Google Calendar if online
    if (appState.isOnline) {
      await syncEventUpdateToGoogle(updatedEvent);
      showNotification('Event moved and synced to Google Calendar', 'success');
    } else {
      appState.pendingSyncItems.push({
        type: 'calendar',
        data: updatedEvent,
        processed: false
      });
      
      showNotification('Event moved. Will sync to Google Calendar when online', 'info');
    }
    
    // Refresh the calendar view
    refreshCalendarView();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error moving event:', error);
    showNotification('Failed to move event', 'error');
  }
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