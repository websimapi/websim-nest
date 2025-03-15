// Calendar events functionality for the Family Organizer app

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
  const dateStr = selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate;
  
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
