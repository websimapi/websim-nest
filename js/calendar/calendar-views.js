// ... existing code ...

// Render week view calendar
function renderWeekView(container) {
  const currentDate = new Date(calendarState.currentDate);
  
  // Adjust to start of week (Sunday)
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);
  
  // Create calendar grid
  const calendarWeek = document.createElement('div');
  calendarWeek.className = 'calendar-week';

  // Create nav controls for scrolling
  const scrollControls = document.createElement('div');
  scrollControls.className = 'week-scroll-controls';
  scrollControls.innerHTML = `
    <button class="btn btn-icon scroll-up" title="Scroll up"><i class="material-icons">keyboard_arrow_up</i></button>
    <button class="btn btn-icon scroll-down" title="Scroll down"><i class="material-icons">keyboard_arrow_down</i></button>
  `;
  container.appendChild(scrollControls);
  
  // Create time gutter
  const timeGutter = document.createElement('div');
  timeGutter.className = 'time-gutter';
  
  // Add hour labels (1 AM to 12 AM) - updated to show all 24 hours
  for (let hour = 0; hour < 24; hour++) {
    const hourLabel = document.createElement('div');
    hourLabel.className = 'hour-label';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const amPm = hour < 12 ? 'AM' : 'PM';
    hourLabel.textContent = `${displayHour} ${amPm}`;
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
    
    // Create hour grid for all 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const hourCell = document.createElement('div');
      hourCell.className = 'hour-cell';
      hourCell.dataset.hour = hour;
      
      // Add different styling for working hours and off-hours
      if (hour >= 9 && hour < 17) {
        hourCell.classList.add('working-hours');
      } else if (hour >= 17 && hour < 21) {
        hourCell.classList.add('evening-hours');
      } else {
        hourCell.classList.add('night-hours');
      }
      
      // Add half-hour divider
      const halfHourDivider = document.createElement('div');
      halfHourDivider.className = 'half-hour-divider';
      hourCell.appendChild(halfHourDivider);
      
      eventsContainer.appendChild(hourCell);
    }
    
    // Find events for this day
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEvents = getEventsForDateRange(dayStart, dayEnd, calendarCache.events);
    
    if (Array.isArray(dayEvents) && dayEvents.length > 0) {
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
          eventElement.style.backgroundColor = `${getColorForId(event.colorId)}22`; // Add transparency
        }
        
        // Calculate position
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
        
        // Position based on actual hour (0-23 scale)
        const top = startHour * 60; // 60px per hour
        const height = Math.max(30, (endHour - startHour) * 60); // Min height of 30px
        
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
  
  // Add scroll controls event listeners
  document.querySelector('.scroll-up').addEventListener('click', () => {
    calendarWeek.scrollBy({
      top: -200,
      behavior: 'smooth'
    });
  });
  
  document.querySelector('.scroll-down').addEventListener('click', () => {
    calendarWeek.scrollBy({
      top: 200,
      behavior: 'smooth'
    });
  });
  
  // Add wheel event listener for smooth scrolling
  calendarWeek.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      calendarWeek.scrollBy({
        top: e.deltaY < 0 ? -100 : 100,
        behavior: 'smooth'
      });
    }
  }, { passive: false });
}

// ... existing code ...