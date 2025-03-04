// Task management functionality for the Family Organizer app

// Initialize tasks view
function initTasksView() {
  console.log('Initializing tasks view');
  
  // Get the tasks container
  const tasksView = document.getElementById('tasks-view');
  
  // Check if user is authenticated
  if (!appState.isAuthenticated) {
    tasksView.innerHTML = `
      <h1>Tasks & Chores</h1>
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to manage your tasks and chores</p>
      </div>
    `;
    return;
  }
  
  // Load task data
  loadTasks();
}

// Load tasks from database
async function loadTasks() {
  try {
    // Get the tasks container
    const tasksView = document.getElementById('tasks-view');
    
    // Create task view interface
    tasksView.innerHTML = `
      <h1>Tasks & Chores</h1>
      
      <div class="tasks-controls">
        <div class="filter-controls">
          <select id="task-filter">
            <option value="all">All Tasks</option>
            <option value="today">Due Today</option>
            <option value="week">Due This Week</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
          
          <select id="task-assignee-filter">
            <option value="all">All Family Members</option>
            <!-- Dynamic options will be added here -->
          </select>
        </div>
        
        <div class="view-controls">
          <button id="board-view-btn" class="btn btn-outline active">
            <i class="material-icons">view_column</i>
            <span>Board</span>
          </button>
          <button id="list-view-btn" class="btn btn-outline">
            <i class="material-icons">view_list</i>
            <span>List</span>
          </button>
        </div>
        
        <button id="add-task-btn" class="btn btn-primary">
          <i class="material-icons">add</i>
          <span>Add Task</span>
        </button>
      </div>
      
      <div id="task-board-view" class="task-view-container active">
        <div class="task-columns">
          <div class="task-column" id="todo-column">
            <div class="column-header">
              <h3>To Do</h3>
              <span class="task-count" id="todo-count">0</span>
            </div>
            <div class="column-content" id="todo-tasks">
              <!-- Tasks will be added here -->
            </div>
          </div>
          
          <div class="task-column" id="in-progress-column">
            <div class="column-header">
              <h3>In Progress</h3>
              <span class="task-count" id="in-progress-count">0</span>
            </div>
            <div class="column-content" id="in-progress-tasks">
              <!-- Tasks will be added here -->
            </div>
          </div>
          
          <div class="task-column" id="completed-column">
            <div class="column-header">
              <h3>Completed</h3>
              <span class="task-count" id="completed-count">0</span>
            </div>
            <div class="column-content" id="completed-tasks">
              <!-- Tasks will be added here -->
            </div>
          </div>
        </div>
      </div>
      
      <div id="task-list-view" class="task-view-container">
        <table class="task-table">
          <thead>
            <tr>
              <th width="5%"></th>
              <th width="30%">Task</th>
              <th width="15%">Assignee</th>
              <th width="15%">Due Date</th>
              <th width="15%">Priority</th>
              <th width="10%">Status</th>
              <th width="10%">Actions</th>
            </tr>
          </thead>
          <tbody id="task-list-tbody">
            <!-- Tasks will be added here -->
          </tbody>
        </table>
      </div>
      
      <div id="chore-chart-section">
        <h2>Family Chore Chart</h2>
        <div class="chore-chart" id="chore-chart">
          <!-- Chore chart will be added here -->
        </div>
      </div>
    `;
    
    // Populate family member filter
    const assigneeFilter = document.getElementById('task-assignee-filter');
    
    // Add current user
    if (appState.currentUser) {
      const option = document.createElement('option');
      option.value = appState.currentUser.id;
      option.textContent = `${appState.currentUser.name} (You)`;
      assigneeFilter.appendChild(option);
    }
    
    // Add family members
    if (appState.family && appState.family.length > 0) {
      appState.family.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        assigneeFilter.appendChild(option);
      });
    }
    
    // Set up event listeners
    document.getElementById('task-filter').addEventListener('change', filterTasks);
    document.getElementById('task-assignee-filter').addEventListener('change', filterTasks);
    document.getElementById('board-view-btn').addEventListener('click', switchToTaskBoardView);
    document.getElementById('list-view-btn').addEventListener('click', switchToTaskListView);
    document.getElementById('add-task-btn').addEventListener('click', showAddTaskModal);
    
    // Make columns droppable for drag-and-drop
    document.querySelectorAll('.column-content').forEach(column => {
      column.addEventListener('dragover', handleTaskDragOver);
      column.addEventListener('drop', handleTaskDrop);
    });
    
    // Fetch and display tasks
    await refreshTasks();
    
    // Also load chore chart
    loadChoreChart();
  } catch (error) {
    console.error('Error loading tasks:', error);
    showNotification('Failed to load tasks', 'error');
  }
}

// Switch to board view
function switchToTaskBoardView() {
  document.getElementById('board-view-btn').classList.add('active');
  document.getElementById('list-view-btn').classList.remove('active');
  
  document.getElementById('task-board-view').classList.add('active');
  document.getElementById('task-list-view').classList.remove('active');
}

// Switch to list view
function switchToTaskListView() {
  document.getElementById('board-view-btn').classList.remove('active');
  document.getElementById('list-view-btn').classList.add('active');
  
  document.getElementById('task-board-view').classList.remove('active');
  document.getElementById('task-list-view').classList.add('active');
}

// Filter tasks based on filter values
async function filterTasks() {
  await refreshTasks();
}

// Refresh tasks based on current filters
async function refreshTasks() {
  try {
    // Get filter values
    const filterType = document.getElementById('task-filter').value;
    const assigneeFilter = document.getElementById('task-assignee-filter').value;
    
    // Get all tasks
    let tasks = await getAllTasks();
    
    // Apply filters
    tasks = filterTasksByType(tasks, filterType);
    tasks = filterTasksByAssignee(tasks, assigneeFilter);
    
    // Update board view
    updateTaskBoardView(tasks);
    
    // Update list view
    updateTaskListView(tasks);
    
    return tasks;
  } catch (error) {
    console.error('Error refreshing tasks:', error);
    showNotification('Failed to load tasks', 'error');
    return [];
  }
}

// Filter tasks by type (all, today, week, overdue, completed)
function filterTasksByType(tasks, filterType) {
  if (filterType === 'all') {
    return tasks;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  return tasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    switch (filterType) {
      case 'today':
        return dueDate.getTime() === today.getTime();
      case 'week':
        return dueDate >= today && dueDate <= nextWeek;
      case 'overdue':
        return dueDate < today && !task.completed;
      case 'completed':
        return task.completed;
      default:
        return true;
    }
  });
}

// Filter tasks by assignee
function filterTasksByAssignee(tasks, assigneeId) {
  if (assigneeId === 'all') {
    return tasks;
  }
  
  return tasks.filter(task => task.assigneeId === assigneeId);
}

// Update the board view with tasks
function updateTaskBoardView(tasks) {
  // Clear existing tasks
  document.getElementById('todo-tasks').innerHTML = '';
  document.getElementById('in-progress-tasks').innerHTML = '';
  document.getElementById('completed-tasks').innerHTML = '';
  
  // Counter for each column
  let todoCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  
  // Sort tasks by due date
  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  // Add tasks to appropriate columns
  tasks.forEach(task => {
    const taskElement = createTaskCardElement(task);
    
    if (task.completed) {
      document.getElementById('completed-tasks').appendChild(taskElement);
      completedCount++;
    } else if (task.status === 'in-progress') {
      document.getElementById('in-progress-tasks').appendChild(taskElement);
      inProgressCount++;
    } else {
      document.getElementById('todo-tasks').appendChild(taskElement);
      todoCount++;
    }
  });
  
  // Update counts
  document.getElementById('todo-count').textContent = todoCount;
  document.getElementById('in-progress-count').textContent = inProgressCount;
  document.getElementById('completed-count').textContent = completedCount;
  
  // Add empty state if needed
  if (todoCount === 0) {
    document.getElementById('todo-tasks').innerHTML = `
      <div class="empty-column-message">
        <i class="material-icons">check_circle_outline</i>
        <p>No tasks to do</p>
      </div>
    `;
  }
  
  if (inProgressCount === 0) {
    document.getElementById('in-progress-tasks').innerHTML = `
      <div class="empty-column-message">
        <i class="material-icons">hourglass_empty</i>
        <p>No tasks in progress</p>
      </div>
    `;
  }
  
  if (completedCount === 0) {
    document.getElementById('completed-tasks').innerHTML = `
      <div class="empty-column-message">
        <i class="material-icons">done_all</i>
        <p>No completed tasks</p>
      </div>
    `;
  }
}

// Update the list view with tasks
function updateTaskListView(tasks) {
  const tbody = document.getElementById('task-list-tbody');
  tbody.innerHTML = '';
  
  if (tasks.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="7" class="empty-table-message">
        <div class="placeholder-message">
          <i class="material-icons">assignment</i>
          <p>No tasks found matching your filters</p>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }
  
  // Sort tasks by due date
  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  // Add each task
  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.className = task.completed ? 'completed-task' : '';
    
    // Find assignee name
    let assigneeName = 'Unassigned';
    let assigneeColor = '#888';
    
    if (task.assigneeId) {
      if (task.assigneeId === appState.currentUser.id) {
        assigneeName = appState.currentUser.name;
        assigneeColor = appState.currentUser.color;
      } else {
        const familyMember = appState.family.find(m => m.id === task.assigneeId);
        if (familyMember) {
          assigneeName = familyMember.name;
          assigneeColor = familyMember.color;
        }
      }
    }
    
    // Format due date
    const dueDate = new Date(task.dueDate);
    const isOverdue = !task.completed && dueDate < new Date();
    const formattedDate = dueDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Priority badge
    const priorityBadges = {
      high: '<span class="priority high">High</span>',
      medium: '<span class="priority medium">Medium</span>',
      low: '<span class="priority low">Low</span>'
    };
    
    // Status badge
    const statusBadges = {
      'todo': '<span class="status todo">To Do</span>',
      'in-progress': '<span class="status in-progress">In Progress</span>',
      'completed': '<span class="status completed">Completed</span>'
    };
    
    const status = task.completed ? 'completed' : task.status;
    
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" 
          ${task.completed ? 'checked' : ''}>
      </td>
      <td>
        <div class="task-title ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
          ${task.title}
        </div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
      </td>
      <td>
        <div class="assignee-chip" style="background-color: ${assigneeColor}">
          ${assigneeName.charAt(0).toUpperCase()}
        </div>
        <span class="assignee-name">${assigneeName}</span>
      </td>
      <td class="${isOverdue ? 'overdue' : ''}">${formattedDate}</td>
      <td>${priorityBadges[task.priority] || priorityBadges.medium}</td>
      <td>${statusBadges[status] || statusBadges.todo}</td>
      <td>
        <button class="btn btn-icon edit-task-btn" data-task-id="${task.id}">
          <i class="material-icons">edit</i>
        </button>
        <button class="btn btn-icon delete-task-btn" data-task-id="${task.id}">
          <i class="material-icons">delete</i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Add event listeners
  tbody.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleTaskCheckboxChange);
  });
  
  tbody.querySelectorAll('.edit-task-btn').forEach(button => {
    button.addEventListener('click', handleEditTaskClick);
  });
  
  tbody.querySelectorAll('.delete-task-btn').forEach(button => {
    button.addEventListener('click', handleDeleteTaskClick);
  });
}

// Create a task card element for the board view
function createTaskCardElement(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;
  card.draggable = true;
  
  // Add draggable behavior
  card.addEventListener('dragstart', handleTaskDragStart);
  card.addEventListener('dragend', handleTaskDragEnd);
  
  // Find assignee name and color
  let assigneeName = 'Unassigned';
  let assigneeColor = '#888';
  
  if (task.assigneeId) {
    if (task.assigneeId === appState.currentUser.id) {
      assigneeName = appState.currentUser.name;
      assigneeColor = appState.currentUser.color;
    } else {
      const familyMember = appState.family.find(m => m.id === task.assigneeId);
      if (familyMember) {
        assigneeName = familyMember.name;
        assigneeColor = familyMember.color;
      }
    }
  }
  
  // Format due date
  const dueDate = new Date(task.dueDate);
  const isOverdue = !task.completed && dueDate < new Date();
  const formattedDate = dueDate.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Priority indicator
  const priorityClass = `priority-${task.priority || 'medium'}`;
  
  // Build card HTML
  card.innerHTML = `
    <div class="card-header ${priorityClass}">
      <div class="task-checkbox-container">
        <input type="checkbox" class="task-checkbox" id="card-${task.id}" 
          ${task.completed ? 'checked' : ''}>
        <label for="card-${task.id}"></label>
      </div>
      <div class="task-title ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
        ${task.title}
      </div>
      <div class="task-actions">
        <button class="btn btn-icon edit-task-btn" data-task-id="${task.id}">
          <i class="material-icons">edit</i>
        </button>
        <button class="btn btn-icon delete-task-btn" data-task-id="${task.id}">
          <i class="material-icons">delete</i>
        </button>
      </div>
    </div>
    ${task.description ? `
      <div class="task-description">
        ${task.description}
      </div>
    ` : ''}
    <div class="task-footer">
      <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
        <i class="material-icons">event</i>
        ${formattedDate}
      </div>
      <div class="task-assignee" style="color: ${assigneeColor}">
        <div class="assignee-chip" style="background-color: ${assigneeColor}">
          ${assigneeName.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  card.querySelector('.task-checkbox').addEventListener('change', handleTaskCheckboxChange);
  card.querySelector('.edit-task-btn').addEventListener('click', handleEditTaskClick);
  card.querySelector('.delete-task-btn').addEventListener('click', handleDeleteTaskClick);
  
  // Make the card clickable to see details
  card.addEventListener('click', (e) => {
    // Ignore clicks on action buttons and checkbox
    if (!e.target.closest('.task-actions') && !e.target.closest('.task-checkbox-container')) {
      showTaskDetailsModal(task);
    }
  });
  
  return card;
}

// Show the add task modal
function showAddTaskModal() {
  // Create family member options for assignee select
  let assigneeOptions = '<option value="">Unassigned</option>';
  
  // Add current user
  if (appState.currentUser) {
    assigneeOptions += `
      <option value="${appState.currentUser.id}" selected>
        ${appState.currentUser.name} (You)
      </option>
    `;
  }
  
  // Add family members
  if (appState.family && appState.family.length > 0) {
    appState.family.forEach(member => {
      assigneeOptions += `
        <option value="${member.id}">${member.name}</option>
      `;
    });
  }
  
  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const defaultDueDate = tomorrow.toISOString().slice(0, 16);
  
  // Create modal content
  const content = `
    <form id="add-task-form" class="task-form">
      <div class="form-group">
        <label for="task-title">Task Title *</label>
        <input type="text" id="task-title" required placeholder="Enter task title">
      </div>
      
      <div class="form-group">
        <label for="task-description">Description</label>
        <textarea id="task-description" rows="3" placeholder="Task description"></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="task-assignee">Assigned To</label>
          <select id="task-assignee">
            ${assigneeOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label for="task-priority">Priority</label>
          <select id="task-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="task-due-date">Due Date & Time *</label>
        <input type="datetime-local" id="task-due-date" required value="${defaultDueDate}">
      </div>
      
      <div class="form-group">
        <label for="task-recurrence">Repeat</label>
        <select id="task-recurrence">
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom...</option>
        </select>
      </div>
      
      <div id="recurrence-details" class="hidden">
        <!-- Will be shown if custom recurrence is selected -->
      </div>
      
      <div class="form-group">
        <label for="task-category">Category</label>
        <select id="task-category">
          <option value="task">Task</option>
          <option value="chore">Chore</option>
          <option value="homework">Homework</option>
          <option value="errand">Errand</option>
          <option value="other">Other</option>
        </select>
      </div>
    </form>
  `;
  
  showModal('Add Task', content, handleAddTask);
  
  // Handle recurrence selection
  document.getElementById('task-recurrence').addEventListener('change', function() {
    const recurrenceDetails = document.getElementById('recurrence-details');
    
    if (this.value === 'custom') {
      recurrenceDetails.classList.remove('hidden');
      recurrenceDetails.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="recurrence-interval">Repeat every</label>
            <div class="input-with-select">
              <input type="number" id="recurrence-interval" min="1" value="1">
              <select id="recurrence-period">
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
                <option value="year">year(s)</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="recurrence-ends">Ends</label>
            <select id="recurrence-ends">
              <option value="never">Never</option>
              <option value="after">After</option>
              <option value="on-date">On date</option>
            </select>
          </div>
        </div>
        
        <div id="recurrence-ends-details"></div>
      `;
      
      // Add listener for ends selection
      document.getElementById('recurrence-ends').addEventListener('change', function() {
        const endsDetails = document.getElementById('recurrence-ends-details');
        
        if (this.value === 'after') {
          endsDetails.innerHTML = `
            <div class="form-group">
              <label for="recurrence-count">Occurrences</label>
              <input type="number" id="recurrence-count" min="1" value="10">
            </div>
          `;
        } else if (this.value === 'on-date') {
          const threeMonthsLater = new Date();
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          
          endsDetails.innerHTML = `
            <div class="form-group">
              <label for="recurrence-until">End date</label>
              <input type="date" id="recurrence-until" value="${threeMonthsLater.toISOString().split('T')[0]}">
            </div>
          `;
        } else {
          endsDetails.innerHTML = '';
        }
      });
      
      // Trigger initial ends display
      document.getElementById('recurrence-ends').dispatchEvent(new Event('change'));
    } else {
      recurrenceDetails.classList.add('hidden');
    }
  });
}

// Handle adding a new task
async function handleAddTask() {
  const form = document.getElementById('add-task-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const assigneeId = document.getElementById('task-assignee').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    const recurrence = document.getElementById('task-recurrence').value;
    const category = document.getElementById('task-category').value;
    
    // Build recurrence rule if applicable
    let recurrenceRule = null;
    
    if (recurrence !== 'none') {
      if (recurrence === 'custom') {
        const interval = document.getElementById('recurrence-interval').value;
        const period = document.getElementById('recurrence-period').value;
        const ends = document.getElementById('recurrence-ends').value;
        
        recurrenceRule = {
          frequency: period,
          interval: parseInt(interval),
          ends: ends
        };
        
        if (ends === 'after') {
          recurrenceRule.count = parseInt(document.getElementById('recurrence-count').value);
        } else if (ends === 'on-date') {
          recurrenceRule.until = document.getElementById('recurrence-until').value;
        }
      } else {
        recurrenceRule = {
          frequency: recurrence,
          interval: 1,
          ends: 'never'
        };
      }
    }
    
    // Create task object
    const task = {
      id: 'task_' + Date.now(),
      title: title,
      description: description,
      assigneeId: assigneeId || null,
      priority: priority,
      dueDate: new Date(dueDate).toISOString(),
      status: 'todo',
      completed: false,
      completedDate: null,
      recurrence: recurrenceRule,
      category: category,
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addTask(task);
    
    // Create recurring tasks if needed
    if (recurrenceRule) {
      createRecurringTasks(task);
    }
    
    showNotification('Task added successfully', 'success');
    
    // Refresh tasks view
    await refreshTasks();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error adding task:', error);
    showNotification('Failed to add task', 'error');
  }
}

// Create recurring tasks
async function createRecurringTasks(baseTask) {
  try {
    const rule = baseTask.recurrence;
    if (!rule || rule.frequency === 'none') return;
    
    // Determine how many occurrences to create initially (max 10)
    let occurrences = 10;
    if (rule.ends === 'after') {
      occurrences = Math.min(rule.count, 10);
    }
    
    // Calculate interval in days
    let intervalDays = rule.interval;
    switch (rule.frequency) {
      case 'day':
      case 'daily':
        intervalDays = rule.interval;
        break;
      case 'week':
      case 'weekly':
        intervalDays = rule.interval * 7;
        break;
      case 'month':
      case 'monthly':
        intervalDays = rule.interval * 30; // Approximation
        break;
      case 'year':
        intervalDays = rule.interval * 365; // Approximation
        break;
    }
    
    // Create subsequent occurrences
    const baseDueDate = new Date(baseTask.dueDate);
    
    for (let i = 1; i < occurrences; i++) {
      // Calculate new due date
      const newDueDate = new Date(baseDueDate);
      newDueDate.setDate(newDueDate.getDate() + (intervalDays * i));
      
      // Check end date if applicable
      if (rule.ends === 'on-date' && rule.until) {
        const untilDate = new Date(rule.until);
        if (newDueDate > untilDate) break;
      }
      
      // Create new task
      const recurrenceTask = {
        ...baseTask,
        id: 'task_' + Date.now() + '_' + i,
        dueDate: newDueDate.toISOString(),
        parentTaskId: baseTask.id,
        isRecurrence: true,
        recurrenceNumber: i + 1
      };
      
      await addTask(recurrenceTask);
    }
  } catch (error) {
    console.error('Error creating recurring tasks:', error);
    showNotification('Warning: Error creating some recurring tasks', 'warning');
  }
}

// Handle editing a task
async function handleEditTaskClick(event) {
  event.stopPropagation();
  
  const taskId = event.currentTarget.dataset.taskId;
  
  try {
    // Get task from database
    const task = await getTaskById(taskId);
    if (!task) {
      showNotification('Task not found', 'error');
      return;
    }
    
    showEditTaskModal(task);
  } catch (error) {
    console.error('Error loading task for edit:', error);
    showNotification('Failed to load task', 'error');
  }
}

// Show edit task modal
function showEditTaskModal(task) {
  // Create family member options for assignee select
  let assigneeOptions = '<option value="">Unassigned</option>';
  
  // Add current user
  if (appState.currentUser) {
    const selected = task.assigneeId === appState.currentUser.id ? 'selected' : '';
    assigneeOptions += `
      <option value="${appState.currentUser.id}" ${selected}>
        ${appState.currentUser.name} (You)
      </option>
    `;
  }
  
  // Add family members
  if (appState.family && appState.family.length > 0) {
    appState.family.forEach(member => {
      const selected = task.assigneeId === member.id ? 'selected' : '';
      assigneeOptions += `
        <option value="${member.id}" ${selected}>${member.name}</option>
      `;
    });
  }
  
  // Format due date for datetime-local input
  const dueDate = new Date(task.dueDate);
  const formattedDueDate = dueDate.toISOString().slice(0, 16);
  
  // Create modal content
  const content = `
    <form id="edit-task-form" class="task-form" data-task-id="${task.id}">
      <div class="form-group">
        <label for="task-title">Task Title *</label>
        <input type="text" id="task-title" required placeholder="Enter task title" value="${task.title}">
      </div>
      
      <div class="form-group">
        <label for="task-description">Description</label>
        <textarea id="task-description" rows="3" placeholder="Task description">${task.description || ''}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="task-assignee">Assigned To</label>
          <select id="task-assignee">
            ${assigneeOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label for="task-priority">Priority</label>
          <select id="task-priority">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="task-due-date">Due Date & Time *</label>
          <input type="datetime-local" id="task-due-date" required value="${formattedDueDate}">
        </div>
        
        <div class="form-group">
          <label for="task-status">Status</label>
          <select id="task-status">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${task.completed ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="task-category">Category</label>
        <select id="task-category">
          <option value="task" ${task.category === 'task' ? 'selected' : ''}>Task</option>
          <option value="chore" ${task.category === 'chore' ? 'selected' : ''}>Chore</option>
          <option value="homework" ${task.category === 'homework' ? 'selected' : ''}>Homework</option>
          <option value="errand" ${task.category === 'errand' ? 'selected' : ''}>Errand</option>
          <option value="other" ${task.category === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      
      ${task.isRecurrence ? `
        <div class="form-group">
          <div class="recurrence-note">
            <i class="material-icons">info</i>
            <span>This is a recurring task. Editing it will not affect other occurrences.</span>
          </div>
        </div>
      ` : ''}
    </form>
  `;
  
  showModal('Edit Task', content, () => handleUpdateTask(task));
}

// Handle updating a task
async function handleUpdateTask(originalTask) {
  const form = document.getElementById('edit-task-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const taskId = form.dataset.taskId;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const assigneeId = document.getElementById('task-assignee').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    const status = document.getElementById('task-status').value;
    const category = document.getElementById('task-category').value;
    
    // Check if status changed to completed
    const wasCompleted = originalTask.completed;
    const isNowCompleted = status === 'completed';
    
    // Create updated task object
    const updatedTask = {
      ...originalTask,
      title: title,
      description: description,
      assigneeId: assigneeId || null,
      priority: priority,
      dueDate: new Date(dueDate).toISOString(),
      status: isNowCompleted ? originalTask.status : status,
      completed: isNowCompleted,
      completedDate: isNowCompleted && !wasCompleted ? new Date().toISOString() : originalTask.completedDate,
      category: category,
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await updateTask(updatedTask);
    
    showNotification('Task updated successfully', 'success');
    
    // Refresh tasks view
    await refreshTasks();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error updating task:', error);
    showNotification('Failed to update task', 'error');
  }
}

// Handle deleting a task
async function handleDeleteTaskClick(event) {
  event.stopPropagation();
  
  const taskId = event.currentTarget.dataset.taskId;
  
  // Show confirmation dialog
  const confirmContent = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to delete this task?</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Delete Task', confirmContent, () => confirmDeleteTask(taskId));
}

// Confirm task deletion
async function confirmDeleteTask(taskId) {
  try {
    await deleteTask(taskId);
    
    showNotification('Task deleted successfully', 'success');
    
    // Refresh tasks view
    await refreshTasks();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    showNotification('Failed to delete task', 'error');
  }
}

// Handle task checkbox change
async function handleTaskCheckboxChange(event) {
  const checkbox = event.target;
  const taskId = checkbox.dataset.taskId;
  const isChecked = checkbox.checked;
  
  try {
    // Get task from database
    const task = await getTaskById(taskId);
    if (!task) {
      showNotification('Task not found', 'error');
      return;
    }
    
    // Update task
    task.completed = isChecked;
    task.completedDate = isChecked ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();
    
    // Save to database
    await updateTask(task);
    
    // Show notification
    if (isChecked) {
      showNotification('Task marked as completed', 'success');
    } else {
      showNotification('Task marked as incomplete', 'info');
    }
    
    // Refresh tasks view
    await refreshTasks();
    
    // Also update dashboard if it's active
    if (appState.currentView === 'dashboard') {
      updateDashboard();
    }
  } catch (error) {
    console.error('Error updating task completion:', error);
    showNotification('Failed to update task', 'error');
    
    // Revert checkbox state
    checkbox.checked = !isChecked;
  }
}

// Show task details modal
function showTaskDetailsModal(task) {
  // Find assignee name
  let assigneeName = 'Unassigned';
  let assigneeColor = '#888';
  
  if (task.assigneeId) {
    if (task.assigneeId === appState.currentUser.id) {
      assigneeName = appState.currentUser.name;
      assigneeColor = appState.currentUser.color;
    } else {
      const familyMember = appState.family.find(m => m.id === task.assigneeId);
      if (familyMember) {
        assigneeName = familyMember.name;
        assigneeColor = familyMember.color;
      }
    }
  }
  
  // Format dates
  const dueDate = new Date(task.dueDate);
  const formattedDueDate = dueDate.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let completedInfo = '';
  if (task.completed && task.completedDate) {
    const completedDate = new Date(task.completedDate);
    const formattedCompletedDate = completedDate.toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    completedInfo = `
      <div class="info-item">
        <i class="material-icons">check_circle</i>
        <span>Completed on ${formattedCompletedDate}</span>
      </div>
    `;
  }
  
  // Build recurrence info
  let recurrenceInfo = '';
  if (task.recurrence) {
    const rec = task.recurrence;
    let recText = '';
    
    switch (rec.frequency) {
      case 'day':
      case 'daily':
        recText = rec.interval === 1 ? 'Daily' : `Every ${rec.interval} days`;
        break;
      case 'week':
      case 'weekly':
        recText = rec.interval === 1 ? 'Weekly' : `Every ${rec.interval} weeks`;
        break;
      case 'month':
      case 'monthly':
        recText = rec.interval === 1 ? 'Monthly' : `Every ${rec.interval} months`;
        break;
      case 'year':
        recText = rec.interval === 1 ? 'Yearly' : `Every ${rec.interval} years`;
        break;
    }
    
    if (rec.ends === 'after' && rec.count) {
      recText += `, ${rec.count} times`;
    } else if (rec.ends === 'on-date' && rec.until) {
      const untilDate = new Date(rec.until);
      recText += `, until ${untilDate.toLocaleDateString()}`;
    }
    
    recurrenceInfo = `
      <div class="info-item">
        <i class="material-icons">repeat</i>
        <span>Repeats: ${recText}</span>
      </div>
    `;
  } else if (task.isRecurrence) {
    recurrenceInfo = `
      <div class="info-item">
        <i class="material-icons">repeat</i>
        <span>Recurring task (#${task.recurrenceNumber})</span>
      </div>
    `;
  }
  
  // Priority badge
  const priorityBadges = {
    high: '<span class="priority high">High Priority</span>',
    medium: '<span class="priority medium">Medium Priority</span>',
    low: '<span class="priority low">Low Priority</span>'
  };
  
  // Build content
  const content = `
    <div class="task-details">
      <div class="task-header priority-${task.priority}">
        <div class="task-checkbox-container">
          <input type="checkbox" id="detail-${task.id}" ${task.completed ? 'checked' : ''}>
          <label for="detail-${task.id}"></label>
        </div>
        <h3 class="${task.completed ? 'completed' : ''}">${task.title}</h3>
        ${priorityBadges[task.priority] || priorityBadges.medium}
      </div>
      
      <div class="task-info">
        <div class="info-item">
          <i class="material-icons">person</i>
          <span>Assigned to: <span style="color: ${assigneeColor}">${assigneeName}</span></span>
        </div>
        
        <div class="info-item">
          <i class="material-icons">event</i>
          <span>Due: ${formattedDueDate}</span>
        </div>
        
        <div class="info-item">
          <i class="material-icons">category</i>
          <span>Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
        </div>
        
        ${completedInfo}
        ${recurrenceInfo}
        
        ${task.description ? `
          <div class="task-description">
            <h4>Description</h4>
            <p>${task.description}</p>
          </div>
        ` : ''}
      </div>
      
      <div class="task-actions">
        <button id="edit-task" class="btn btn-outline">
          <i class="material-icons">edit</i>
          <span>Edit</span>
        </button>
        <button id="delete-task" class="btn btn-outline danger">
          <i class="material-icons">delete</i>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;
  
  showModal('Task Details', content);
  
  // Add event listeners
  document.getElementById('detail-' + task.id).addEventListener('change', async function(e) {
    closeModal();
    
    const isChecked = e.target.checked;
    
    try {
      // Update task
      task.completed = isChecked;
      task.completedDate = isChecked ? new Date().toISOString() : null;
      task.updatedAt = new Date().toISOString();
      
      // Save to database
      await updateTask(task);
      
      // Show notification
      if (isChecked) {
        showNotification('Task marked as completed', 'success');
      } else {
        showNotification('Task marked as incomplete', 'info');
      }
      
      // Refresh tasks view
      await refreshTasks();
      
      // Also update dashboard if it's active
      if (appState.currentView === 'dashboard') {
        updateDashboard();
      }
    } catch (error) {
      console.error('Error updating task completion:', error);
      showNotification('Failed to update task', 'error');
    }
  });
  
  document.getElementById('edit-task').addEventListener('click', () => {
    closeModal();
    showEditTaskModal(task);
  });
  
  document.getElementById('delete-task').addEventListener('click', () => {
    closeModal();
    const confirmContent = `
      <div class="confirmation-dialog">
        <p>Are you sure you want to delete this task?</p>
        <p>This action cannot be undone.</p>
      </div>
    `;
    
    showModal('Delete Task', confirmContent, () => confirmDeleteTask(task.id));
  });
}

// Task drag and drop functionality
function handleTaskDragStart(event) {
  event.dataTransfer.setData('text/plain', event.currentTarget.dataset.taskId);
  event.currentTarget.classList.add('dragging');
}

function handleTaskDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
}

function handleTaskDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add('drag-over');
}

function handleTaskDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  const taskId = event.dataTransfer.getData('text/plain');
  if (!taskId) return;
  
  const column = event.currentTarget;
  const columnId = column.id;
  
  // Map column IDs to statuses
  const statusMap = {
    'todo-tasks': 'todo',
    'in-progress-tasks': 'in-progress',
    'completed-tasks': 'completed'
  };
  
  const newStatus = statusMap[columnId];
  if (!newStatus) return;
  
  // Update task status
  updateTaskStatus(taskId, newStatus);
}

// Update task status (e.g., when dropping into a new column)
async function updateTaskStatus(taskId, newStatus) {
  try {
    // Get task from database
    const task = await getTaskById(taskId);
    if (!task) {
      showNotification('Task not found', 'error');
      return;
    }
    
    // Update task
    task.status = newStatus === 'completed' ? task.status : newStatus;
    task.completed = newStatus === 'completed';
    task.completedDate = newStatus === 'completed' ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();
    
    // Save to database
    await updateTask(task);
    
    // Show notification
    if (newStatus === 'completed') {
      showNotification('Task marked as completed', 'success');
    } else {
      showNotification(`Task moved to ${newStatus.replace('-', ' ')}`, 'info');
    }
    
    // Refresh tasks view
    await refreshTasks();
  } catch (error) {
    console.error('Error updating task status:', error);
    showNotification('Failed to update task status', 'error');
  }
}

// Get all tasks from the database
async function getAllTasks() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.tasks);
}

// Load the chore chart
async function loadChoreChart() {
  // Get the chore chart container
  const choreChart = document.getElementById('chore-chart');
  
  // Get family members
  const familyMembers = [...appState.family];
  
  if (appState.currentUser) {
    familyMembers.push({
      id: appState.currentUser.id,
      name: appState.currentUser.name,
      color: appState.currentUser.color
    });
  }
  
  if (familyMembers.length === 0) {
    choreChart.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">people_outline</i>
        <p>No family members to display in the chore chart</p>
      </div>
    `;
    return;
  }
  
  // Get all tasks
  const allTasks = await getAllTasks();
  
  // Filter for chores
  const chores = allTasks.filter(task => task.category === 'chore');
  
  // Group chores by assignee
  const choresByAssignee = {};
  
  familyMembers.forEach(member => {
    choresByAssignee[member.id] = chores.filter(chore => chore.assigneeId === member.id);
  });
  
  // Create chore chart
  let html = `
    <div class="chore-chart-header">
      <div class="chore-chart-cell header-cell"></div>
      ${familyMembers.map(member => `
        <div class="chore-chart-cell header-cell" style="background-color: ${member.color}">
          ${member.name}
        </div>
      `).join('')}
    </div>
  `;
  
  // Get days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Create rows for each day
  days.forEach(day => {
    html += `
      <div class="chore-chart-row">
        <div class="chore-chart-cell day-cell">${day}</div>
        ${familyMembers.map(member => {
          const dayChores = choresByAssignee[member.id].filter(chore => {
            const dueDate = new Date(chore.dueDate);
            return dueDate.toLocaleDateString('en-US', { weekday: 'long' }) === day;
          });
          
          return `
            <div class="chore-chart-cell chore-cell">
              ${dayChores.length > 0 ? dayChores.map(chore => `
                <div class="chore-item ${chore.completed ? 'completed' : ''}" title="${chore.title}">
                  <span class="chore-title">${chore.title}</span>
                  <input type="checkbox" ${chore.completed ? 'checked' : ''} data-task-id="${chore.id}" class="task-checkbox">
                </div>
              `).join('') : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  });
  
  choreChart.innerHTML = html;
  
  // Add event listeners to checkboxes
  choreChart.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleTaskCheckboxChange);
  });
}