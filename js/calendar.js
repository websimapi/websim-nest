// ... existing code ...
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
        
        // Fix: Simply append to dayColumn - don't use insertBefore
        dayColumn.appendChild(allDayContainer);
      }
    }
    
    dayColumn.appendChild(eventsContainer);
    calendarWeek.appendChild(dayColumn);
// ... existing code ...