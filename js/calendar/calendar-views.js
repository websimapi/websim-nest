// Calendar views functionality for the Family Organizer app

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
        
        dayColumn.insertBefore(allDayContainer, eventsContainer);
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