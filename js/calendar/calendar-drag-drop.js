// Calendar drag and drop functionality for the Family Organizer app

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