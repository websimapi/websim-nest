// IndexedDB functionality for the Family Organizer app

// Database connection
let db = null;

// Database object store names
const stores = {
  users: 'users',
  family: 'family',
  events: 'events',
  tasks: 'tasks',
  meals: 'meals',
  recipes: 'recipes',
  groceries: 'groceries',
  settings: 'settings',
  sync: 'sync'
};

// Initialize the database
async function initDatabase() {
  try {
    db = await idb.openDB('familyOrganizer', config.dbVersion, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create object stores as needed based on the old version
        if (oldVersion < 1) {
          // Users store
          const userStore = db.createObjectStore(stores.users, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
          
          // Family members store
          const familyStore = db.createObjectStore(stores.family, { keyPath: 'id' });
          familyStore.createIndex('userId', 'userId', { unique: false });
          
          // Calendar events store
          const eventsStore = db.createObjectStore(stores.events, { keyPath: 'id' });
          eventsStore.createIndex('calendarId', 'calendarId', { unique: false });
          eventsStore.createIndex('googleId', 'googleId', { unique: false });
          eventsStore.createIndex('start', 'start.dateTime', { unique: false });
          
          // Tasks store
          const tasksStore = db.createObjectStore(stores.tasks, { keyPath: 'id' });
          tasksStore.createIndex('assigneeId', 'assigneeId', { unique: false });
          tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
          tasksStore.createIndex('completed', 'completed', { unique: false });
          
          // Meal planning store
          const mealsStore = db.createObjectStore(stores.meals, { keyPath: 'id' });
          mealsStore.createIndex('date', 'date', { unique: false });
          mealsStore.createIndex('type', 'type', { unique: false });
          mealsStore.createIndex('recipeId', 'recipeId', { unique: false });
          
          // Recipes store
          const recipesStore = db.createObjectStore(stores.recipes, { keyPath: 'id' });
          recipesStore.createIndex('category', 'category', { unique: false });
          recipesStore.createIndex('createdBy', 'createdBy', { unique: false });
          
          // Grocery list store
          const groceryStore = db.createObjectStore(stores.groceries, { keyPath: 'id' });
          groceryStore.createIndex('category', 'category', { unique: false });
          groceryStore.createIndex('completed', 'completed', { unique: false });
          
          // Settings store
          db.createObjectStore(stores.settings, { keyPath: 'id' });
          
          // Sync store for tracking sync state
          const syncStore = db.createObjectStore(stores.sync, { keyPath: 'id' });
          syncStore.createIndex('entityType', 'entityType', { unique: false });
        }
        
        // Add future upgrade steps as needed
      }
    });
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User-related database functions
async function getUserById(userId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.users, userId);
}

async function addUser(user) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.users, user);
}

async function updateUser(user) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.users, user);
}

async function deleteUser(userId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.users, userId);
}

// Family member database functions
async function getFamilyMembersByUserId(userId) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.family, 'readonly');
  const index = tx.store.index('userId');
  return index.getAll(userId);
}

async function getFamilyMemberById(memberId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.family, memberId);
}

async function addFamilyMember(member) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.family, member);
}

async function updateFamilyMember(member) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.family, member);
}

async function deleteFamilyMember(memberId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.family, memberId);
}

async function getFamilyMembers() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.family);
}

// Event-related database functions
async function getEventById(eventId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.events, eventId);
}

async function storeEvent(event) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.events, event);
}

async function updateEvent(event) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.events, event);
}

async function deleteEvent(eventId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.events, eventId);
}

async function getEventsForDateRange(startDate, endDate) {
  if (!db) throw new Error('Database not initialized');
  
  // Get all events and filter client-side
  // This is simpler than trying to query with complex date logic
  const allEvents = await db.getAll(stores.events);
  
  return allEvents.filter(event => {
    // Get event start/end times
    const eventStart = event.start.dateTime 
      ? new Date(event.start.dateTime)
      : new Date(event.start.date);
    
    const eventEnd = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date);
    
    // Check if event overlaps with the specified range
    return eventStart < endDate && eventEnd > startDate;
  });
}

async function getAllEvents() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.events);
}

async function clearCalendarEvents(calendarId) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.events, 'readwrite');
  const index = tx.store.index('calendarId');
  const events = await index.getAll(calendarId);
  
  for (const event of events) {
    await tx.store.delete(event.id);
  }
  
  await tx.done;
}

// Calendar sync-related functions
async function storeCalendars(calendars) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.sync, 'readwrite');
  await tx.store.put({
    id: 'calendars',
    data: calendars,
    timestamp: new Date().toISOString()
  });
  
  await tx.done;
}

async function getStoredCalendars() {
  if (!db) throw new Error('Database not initialized');
  
  const calendarData = await db.get(stores.sync, 'calendars');
  return calendarData ? calendarData.data : [];
}

async function getSyncTokenForCalendar(calendarId) {
  if (!db) throw new Error('Database not initialized');
  
  const syncData = await db.get(stores.sync, `syncToken_${calendarId}`);
  return syncData ? syncData.token : null;
}

async function storeSyncToken(calendarId, token) {
  if (!db) throw new Error('Database not initialized');
  
  await db.put(stores.sync, {
    id: `syncToken_${calendarId}`,
    token: token,
    timestamp: new Date().toISOString()
  });
}

async function clearSyncToken(calendarId) {
  if (!db) throw new Error('Database not initialized');
  
  await db.delete(stores.sync, `syncToken_${calendarId}`);
}

// Task-related database functions
async function getTaskById(taskId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.tasks, taskId);
}

async function addTask(task) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.tasks, task);
}

async function updateTask(task) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.tasks, task);
}

async function deleteTask(taskId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.tasks, taskId);
}

async function getTasksForDay(date) {
  if (!db) throw new Error('Database not initialized');
  
  // Start and end of the day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  // Get all tasks and filter client-side
  const allTasks = await db.getAll(stores.tasks);
  
  return allTasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    return dueDate >= startDate && dueDate <= endDate;
  });
}

async function getTasksByAssignee(assigneeId) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.tasks, 'readonly');
  const index = tx.store.index('assigneeId');
  return index.getAll(assigneeId);
}

async function getIncompleteTasks() {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.tasks, 'readonly');
  const index = tx.store.index('completed');
  return index.getAll(false);
}

// Meal-related database functions
async function getMealById(mealId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.meals, mealId);
}

async function addMeal(meal) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.meals, meal);
}

async function updateMeal(meal) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.meals, meal);
}

async function deleteMeal(mealId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.meals, mealId);
}

async function getMealsForDay(date) {
  if (!db) throw new Error('Database not initialized');
  
  const dateString = date.toISOString().split('T')[0];
  
  const tx = db.transaction(stores.meals, 'readonly');
  const index = tx.store.index('date');
  return index.getAll(dateString);
}

async function getMealsForDateRange(startDate, endDate) {
  if (!db) throw new Error('Database not initialized');
  
  // Format dates as strings
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Get all meals and filter client-side
  const allMeals = await db.getAll(stores.meals);
  
  return allMeals.filter(meal => {
    return meal.date >= startDateStr && meal.date <= endDateStr;
  });
}

// Recipe-related database functions
async function getRecipeById(recipeId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.recipes, recipeId);
}

async function addRecipe(recipe) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.recipes, recipe);
}

async function updateRecipe(recipe) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.recipes, recipe);
}

async function deleteRecipe(recipeId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.recipes, recipeId);
}

async function getRecipes() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.recipes);
}

async function getRecipesByCategory(category) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.recipes, 'readonly');
  const index = tx.store.index('category');
  return index.getAll(category);
}

async function getRecipesCreatedBy(userId) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.recipes, 'readonly');
  const index = tx.store.index('createdBy');
  return index.getAll(userId);
}

// Grocery-related database functions
async function getGroceryItemById(itemId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.groceries, itemId);
}

async function addGroceryItem(item) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.groceries, item);
}

async function updateGroceryItem(item) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.groceries, item);
}

async function deleteGroceryItem(itemId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.groceries, itemId);
}

async function getGroceryItems() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.groceries);
}

async function getGroceryItemsByCategory(category) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.groceries, 'readonly');
  const index = tx.store.index('category');
  return index.getAll(category);
}

async function getIncompleteGroceryItems() {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(stores.groceries, 'readonly');
  const index = tx.store.index('completed');
  return index.getAll(false);
}

// Settings-related database functions
async function getSettings() {
  if (!db) throw new Error('Database not initialized');
  
  const settings = await db.get(stores.settings, 'appSettings');
  return settings ? settings.data : null;
}

async function saveSettings(settingsData) {
  if (!db) throw new Error('Database not initialized');
  
  await db.put(stores.settings, {
    id: 'appSettings',
    data: settingsData,
    timestamp: new Date().toISOString()
  });
}

// Data export functions
async function exportAllData() {
  if (!db) throw new Error('Database not initialized');
  
  const exportData = {};
  
  // Export data from each store
  for (const store of Object.values(stores)) {
    exportData[store] = await db.getAll(store);
  }
  
  return exportData;
}

// Data import functions
async function importData(data) {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(Object.values(stores), 'readwrite');
  
  try {
    // Clear each store first
    for (const store of Object.values(stores)) {
      await tx.objectStore(store).clear();
    }
    
    // Import data to each store
    for (const store of Object.values(stores)) {
      if (data[store] && Array.isArray(data[store])) {
        for (const item of data[store]) {
          await tx.objectStore(store).add(item);
        }
      }
    }
    
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    await tx.abort();
    throw error;
  }
}

// Clear all data (for logout/reset)
async function clearAllData() {
  if (!db) throw new Error('Database not initialized');
  
  const tx = db.transaction(Object.values(stores), 'readwrite');
  
  try {
    for (const store of Object.values(stores)) {
      await tx.objectStore(store).clear();
    }
    
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    await tx.abort();
    throw error;
  }
}