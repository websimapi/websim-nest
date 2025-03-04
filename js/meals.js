// Meal planning functionality for the Family Organizer app

// Initialize meals view
function initMealsView() {
  console.log('Initializing meals view');
  
  // Get the meals container
  const mealsView = document.getElementById('meals-view');
  
  // Check if user is authenticated
  if (!appState.isAuthenticated) {
    mealsView.innerHTML = `
      <h1>Meal Planning</h1>
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to manage your meal plans</p>
      </div>
    `;
    return;
  }
  
  // Load meal planning interface
  loadMealPlanner();
}

// Load meal planner interface
async function loadMealPlanner() {
  try {
    // Get the meals container
    const mealsView = document.getElementById('meals-view');
    
    // Create meal planner interface
    mealsView.innerHTML = `
      <h1>Meal Planning</h1>
      
      <div class="meal-controls">
        <div class="date-navigation">
          <button id="prev-week" class="btn btn-icon"><i class="material-icons">chevron_left</i></button>
          <h2 id="current-week">Week of May 1, 2023</h2>
          <button id="next-week" class="btn btn-icon"><i class="material-icons">chevron_right</i></button>
        </div>
        
        <button id="add-meal-btn" class="btn btn-primary">
          <i class="material-icons">add</i>
          <span>Add Meal</span>
        </button>
      </div>
      
      <div class="meal-planner">
        <div class="meal-calendar" id="meal-calendar">
          <!-- Meal calendar will be loaded here -->
        </div>
        
        <div class="recipe-section">
          <h3>My Recipes</h3>
          <div class="recipe-search">
            <input type="text" id="recipe-search" placeholder="Search recipes...">
            <button class="btn btn-icon"><i class="material-icons">search</i></button>
          </div>
          <div class="recipe-list" id="recipe-list">
            <!-- Recipes will be loaded here -->
          </div>
          <button id="add-recipe-btn" class="btn btn-outline">
            <i class="material-icons">add</i>
            <span>Add Recipe</span>
          </button>
        </div>
      </div>
      
      <div class="grocery-generator">
        <h3>Generate Grocery List</h3>
        <p>Create a grocery list based on your meal plan.</p>
        <div class="date-range-selector">
          <label for="grocery-start-date">Start Date:</label>
          <input type="date" id="grocery-start-date">
          <label for="grocery-end-date">End Date:</label>
          <input type="date" id="grocery-end-date">
        </div>
        <button id="generate-grocery-btn" class="btn btn-primary">
          <i class="material-icons">shopping_cart</i>
          <span>Generate Grocery List</span>
        </button>
      </div>
    `;
    
    // Set initial dates for grocery list generator
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of week (Saturday)
    
    document.getElementById('grocery-start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('grocery-end-date').value = endDate.toISOString().split('T')[0];
    
    // Set up event listeners
    document.getElementById('prev-week').addEventListener('click', navigateToPreviousWeek);
    document.getElementById('next-week').addEventListener('click', navigateToNextWeek);
    document.getElementById('add-meal-btn').addEventListener('click', showAddMealModal);
    document.getElementById('add-recipe-btn').addEventListener('click', showAddRecipeModal);
    document.getElementById('generate-grocery-btn').addEventListener('click', generateGroceryList);
    document.getElementById('recipe-search').addEventListener('input', searchRecipes);
    
    // Load meal calendar with current week
    loadMealCalendar(startDate);
    
    // Load recipes
    loadRecipes();
  } catch (error) {
    console.error('Error loading meal planner:', error);
    showNotification('Failed to load meal planner', 'error');
  }
}

// Load meal calendar for a specific week
async function loadMealCalendar(startDate) {
  try {
    const calendarContainer = document.getElementById('meal-calendar');
    
    // Create a copy of the start date
    const weekStart = new Date(startDate);
    
    // Update header text
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    document.getElementById('current-week').textContent = `Week of ${weekStart.toLocaleDateString(undefined, options)}`;
    
    // Create calendar structure
    let html = `
      <div class="meal-calendar-header">
        <div class="meal-calendar-cell"></div>
        <div class="meal-calendar-cell">Breakfast</div>
        <div class="meal-calendar-cell">Lunch</div>
        <div class="meal-calendar-cell">Dinner</div>
        <div class="meal-calendar-cell">Snacks</div>
      </div>
    `;
    
    // Create rows for each day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const dateString = currentDate.toISOString().split('T')[0];
      
      html += `
        <div class="meal-calendar-row ${isToday ? 'today' : ''}">
          <div class="meal-calendar-cell day-cell">
            <div class="day-name">${days[i]}</div>
            <div class="day-date">${currentDate.getDate()}</div>
          </div>
          <div class="meal-calendar-cell meal-cell" data-date="${dateString}" data-type="breakfast"></div>
          <div class="meal-calendar-cell meal-cell" data-date="${dateString}" data-type="lunch"></div>
          <div class="meal-calendar-cell meal-cell" data-date="${dateString}" data-type="dinner"></div>
          <div class="meal-calendar-cell meal-cell" data-date="${dateString}" data-type="snack"></div>
        </div>
      `;
    }
    
    calendarContainer.innerHTML = html;
    
    // Make cells droppable for drag-and-drop
    document.querySelectorAll('.meal-cell').forEach(cell => {
      cell.addEventListener('dragover', handleMealDragOver);
      cell.addEventListener('drop', handleMealDrop);
      
      // Add click handler to add meal
      cell.addEventListener('click', handleMealCellClick);
    });
    
    // Load meals for the week
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    
    const meals = await getMealsForDateRange(weekStart, endDate);
    populateMealCalendar(meals);
  } catch (error) {
    console.error('Error loading meal calendar:', error);
    showNotification('Failed to load meal calendar', 'error');
  }
}

// Populate meal calendar with meals
function populateMealCalendar(meals) {
  if (!meals || meals.length === 0) return;
  
  meals.forEach(meal => {
    const cell = document.querySelector(`.meal-cell[data-date="${meal.date}"][data-type="${meal.type}"]`);
    
    if (cell) {
      // Create meal element
      const mealElement = document.createElement('div');
      mealElement.className = 'meal-item';
      mealElement.dataset.mealId = meal.id;
      mealElement.draggable = true;
      
      // Add event listeners for drag-and-drop
      mealElement.addEventListener('dragstart', handleMealDragStart);
      mealElement.addEventListener('dragend', handleMealDragEnd);
      
      // Set meal content
      mealElement.innerHTML = `
        <div class="meal-name">${meal.name}</div>
        <div class="meal-actions">
          <button class="btn btn-icon edit-meal-btn" data-meal-id="${meal.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="btn btn-icon delete-meal-btn" data-meal-id="${meal.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
      `;
      
      // Add to cell
      cell.appendChild(mealElement);
      
      // Add event listeners
      mealElement.querySelector('.edit-meal-btn').addEventListener('click', handleEditMealClick);
      mealElement.querySelector('.delete-meal-btn').addEventListener('click', handleDeleteMealClick);
      
      // Add click handler for meal details
      mealElement.addEventListener('click', (e) => {
        if (!e.target.closest('.meal-actions')) {
          showMealDetails(meal);
        }
      });
    }
  });
}

// Load recipes from database
async function loadRecipes() {
  try {
    const recipes = await getAllRecipes();
    const recipeList = document.getElementById('recipe-list');
    
    if (!recipes || recipes.length === 0) {
      recipeList.innerHTML = `
        <div class="placeholder-message">
          <i class="material-icons">menu_book</i>
          <p>No recipes added yet</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    recipes.forEach(recipe => {
      html += `
        <div class="recipe-card" draggable="true" data-recipe-id="${recipe.id}">
          <div class="recipe-header">
            <h4>${recipe.name}</h4>
            <span class="recipe-time">${recipe.preparationTime} min</span>
          </div>
          <p class="recipe-description">${recipe.description.substring(0, 60)}${recipe.description.length > 60 ? '...' : ''}</p>
          <div class="recipe-footer">
            <span class="recipe-category">${recipe.category}</span>
            <div class="recipe-actions">
              <button class="btn btn-icon edit-recipe-btn" data-recipe-id="${recipe.id}">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn btn-icon delete-recipe-btn" data-recipe-id="${recipe.id}">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    recipeList.innerHTML = html;
    
    // Add event listeners for drag-and-drop
    recipeList.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('dragstart', handleRecipeDragStart);
      card.addEventListener('dragend', handleRecipeDragEnd);
      
      // Add click handler for recipe details
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.recipe-actions')) {
          const recipeId = card.dataset.recipeId;
          showRecipeDetails(recipes.find(r => r.id === recipeId));
        }
      });
      
      // Add event listeners for edit and delete
      card.querySelector('.edit-recipe-btn').addEventListener('click', handleEditRecipeClick);
      card.querySelector('.delete-recipe-btn').addEventListener('click', handleDeleteRecipeClick);
    });
  } catch (error) {
    console.error('Error loading recipes:', error);
    showNotification('Failed to load recipes', 'error');
  }
}

// Handle meal cell click
function handleMealCellClick(event) {
  // Only respond if clicking on empty space (not on an existing meal)
  if (event.target === event.currentTarget) {
    const date = event.currentTarget.dataset.date;
    const type = event.currentTarget.dataset.type;
    
    showAddMealModal(date, type);
  }
}

// Show add meal modal
function showAddMealModal(date, type) {
  // If called from button rather than cell click, use default values
  const currentDate = new Date();
  const dateValue = date || currentDate.toISOString().split('T')[0];
  const typeValue = type || 'dinner';
  
  // Get recipes for select dropdown
  getAllRecipes().then(recipes => {
    let recipeOptions = '<option value="">Select a recipe...</option>';
    
    if (recipes && recipes.length > 0) {
      recipes.forEach(recipe => {
        recipeOptions += `<option value="${recipe.id}">${recipe.name}</option>`;
      });
    }
    
    // Create modal content
    const content = `
      <form id="add-meal-form" class="meal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="meal-date">Date</label>
            <input type="date" id="meal-date" required value="${dateValue}">
          </div>
          
          <div class="form-group">
            <label for="meal-type">Meal Type</label>
            <select id="meal-type" required>
              <option value="breakfast" ${typeValue === 'breakfast' ? 'selected' : ''}>Breakfast</option>
              <option value="lunch" ${typeValue === 'lunch' ? 'selected' : ''}>Lunch</option>
              <option value="dinner" ${typeValue === 'dinner' ? 'selected' : ''}>Dinner</option>
              <option value="snack" ${typeValue === 'snack' ? 'selected' : ''}>Snack</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="meal-recipe">Recipe</label>
          <select id="meal-recipe">
            ${recipeOptions}
          </select>
        </div>
        
        <div class="form-group meal-or-divider">
          <span>OR</span>
        </div>
        
        <div class="form-group">
          <label for="meal-name">Meal Name</label>
          <input type="text" id="meal-name" placeholder="Enter meal name">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="meal-time">Time</label>
            <input type="time" id="meal-time">
          </div>
          
          <div class="form-group">
            <label for="meal-prep-time">Preparation Time (minutes)</label>
            <input type="number" id="meal-prep-time" min="0" value="30">
          </div>
        </div>
        
        <div class="form-group">
          <label for="meal-notes">Notes</label>
          <textarea id="meal-notes" rows="3" placeholder="Optional notes about this meal"></textarea>
        </div>
      </form>
    `;
    
    showModal('Add Meal', content, handleAddMeal);
    
    // Add listener for recipe selection to auto-fill fields
    document.getElementById('meal-recipe').addEventListener('change', async function() {
      const recipeId = this.value;
      if (!recipeId) return;
      
      try {
        const recipe = await getRecipeById(recipeId);
        if (recipe) {
          document.getElementById('meal-name').value = recipe.name;
          document.getElementById('meal-prep-time').value = recipe.preparationTime;
        }
      } catch (error) {
        console.error('Error loading recipe details:', error);
      }
    });
  });
}

// Handle adding a new meal
async function handleAddMeal() {
  const form = document.getElementById('add-meal-form');
  
  // Basic validation
  const mealName = document.getElementById('meal-name').value;
  const recipeId = document.getElementById('meal-recipe').value;
  
  if (!mealName && !recipeId) {
    showNotification('Please enter a meal name or select a recipe', 'error');
    return;
  }
  
  try {
    const date = document.getElementById('meal-date').value;
    const type = document.getElementById('meal-type').value;
    const time = document.getElementById('meal-time').value;
    const preparationTime = document.getElementById('meal-prep-time').value;
    const notes = document.getElementById('meal-notes').value;
    
    // Create meal object
    const meal = {
      id: 'meal_' + Date.now(),
      date: date,
      type: type,
      name: mealName,
      recipeId: recipeId || null,
      time: time || getDefaultMealTime(type),
      preparationTime: parseInt(preparationTime) || 0,
      notes: notes,
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addMeal(meal);
    
    showNotification('Meal added successfully', 'success');
    
    // Reload meal calendar
    const startOfWeek = getStartOfWeek(new Date(date));
    loadMealCalendar(startOfWeek);
  } catch (error) {
    console.error('Error adding meal:', error);
    showNotification('Failed to add meal', 'error');
  }
}

// Get default meal time based on type
function getDefaultMealTime(type) {
  switch (type) {
    case 'breakfast': return '07:30';
    case 'lunch': return '12:00';
    case 'dinner': return '18:00';
    case 'snack': return '15:00';
    default: return '';
  }
}

// Get start of week (Sunday) for a given date
function getStartOfWeek(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

// Navigate to previous week
function navigateToPreviousWeek() {
  const currentWeekText = document.getElementById('current-week').textContent;
  const currentWeekStart = new Date(currentWeekText.replace('Week of ', ''));
  
  // Move to previous week
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  
  // Reload calendar
  loadMealCalendar(currentWeekStart);
}

// Navigate to next week
function navigateToNextWeek() {
  const currentWeekText = document.getElementById('current-week').textContent;
  const currentWeekStart = new Date(currentWeekText.replace('Week of ', ''));
  
  // Move to next week
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  
  // Reload calendar
  loadMealCalendar(currentWeekStart);
}

// Show add recipe modal
function showAddRecipeModal() {
  const content = `
    <form id="add-recipe-form" class="recipe-form">
      <div class="form-group">
        <label for="recipe-name">Recipe Name *</label>
        <input type="text" id="recipe-name" required placeholder="Enter recipe name">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="recipe-category">Category</label>
          <select id="recipe-category">
            <option value="main">Main Course</option>
            <option value="side">Side Dish</option>
            <option value="breakfast">Breakfast</option>
            <option value="dessert">Dessert</option>
            <option value="snack">Snack</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="recipe-prep-time">Preparation Time (minutes) *</label>
          <input type="number" id="recipe-prep-time" required min="0" value="30">
        </div>
      </div>
      
      <div class="form-group">
        <label for="recipe-description">Description</label>
        <textarea id="recipe-description" rows="3" placeholder="Brief description of the recipe"></textarea>
      </div>
      
      <div class="form-group">
        <label for="recipe-ingredients">Ingredients *</label>
        <textarea id="recipe-ingredients" rows="5" required placeholder="Enter ingredients, one per line"></textarea>
      </div>
      
      <div class="form-group">
        <label for="recipe-instructions">Instructions *</label>
        <textarea id="recipe-instructions" rows="5" required placeholder="Enter cooking instructions"></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="recipe-servings">Servings</label>
          <input type="number" id="recipe-servings" min="1" value="4">
        </div>
        
        <div class="form-group">
          <label for="recipe-calories">Calories per serving</label>
          <input type="number" id="recipe-calories" min="0">
        </div>
      </div>
    </form>
  `;
  
  showModal('Add Recipe', content, handleAddRecipe);
}

// Handle adding a new recipe
async function handleAddRecipe() {
  const form = document.getElementById('add-recipe-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const name = document.getElementById('recipe-name').value;
    const category = document.getElementById('recipe-category').value;
    const preparationTime = document.getElementById('recipe-prep-time').value;
    const description = document.getElementById('recipe-description').value;
    const ingredients = document.getElementById('recipe-ingredients').value;
    const instructions = document.getElementById('recipe-instructions').value;
    const servings = document.getElementById('recipe-servings').value;
    const calories = document.getElementById('recipe-calories').value;
    
    // Create recipe object
    const recipe = {
      id: 'recipe_' + Date.now(),
      name: name,
      category: category,
      preparationTime: parseInt(preparationTime) || 30,
      description: description,
      ingredients: ingredients.split('\n').filter(i => i.trim()),
      instructions: instructions,
      servings: parseInt(servings) || 4,
      calories: calories ? parseInt(calories) : null,
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addRecipe(recipe);
    
    showNotification('Recipe added successfully', 'success');
    
    // Reload recipes
    loadRecipes();
  } catch (error) {
    console.error('Error adding recipe:', error);
    showNotification('Failed to add recipe', 'error');
  }
}

// Drag and drop for meals
function handleMealDragStart(event) {
  event.dataTransfer.setData('mealId', event.currentTarget.dataset.mealId);
  event.currentTarget.classList.add('dragging');
}

function handleMealDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
}

function handleMealDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add('drag-over');
}

function handleMealDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  const mealId = event.dataTransfer.getData('mealId');
  if (!mealId) return;
  
  const targetDate = event.currentTarget.dataset.date;
  const targetType = event.currentTarget.dataset.type;
  
  // Move meal to new date/type
  moveMeal(mealId, targetDate, targetType);
}

// Drag and drop for recipes
function handleRecipeDragStart(event) {
  event.dataTransfer.setData('recipeId', event.currentTarget.dataset.recipeId);
  event.currentTarget.classList.add('dragging');
}

function handleRecipeDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
}

function handleRecipeDrop(event) {
  // Check if this is a recipe being dropped (not a meal)
  const recipeId = event.dataTransfer.getData('recipeId');
  if (!recipeId) return;
  
  const targetDate = event.currentTarget.dataset.date;
  const targetType = event.currentTarget.dataset.type;
  
  // Create a new meal from the recipe
  createMealFromRecipe(recipeId, targetDate, targetType);
}

// Move a meal to a new date/type
async function moveMeal(mealId, targetDate, targetType) {
  try {
    // Get the meal from database
    const meal = await getMealById(mealId);
    if (!meal) {
      showNotification('Meal not found', 'error');
      return;
    }
    
    // Update meal
    meal.date = targetDate;
    meal.type = targetType;
    meal.updatedAt = new Date().toISOString();
    
    // Save to database
    await updateMeal(meal);
    
    showNotification('Meal moved successfully', 'success');
    
    // Reload meal calendar
    const startOfWeek = getStartOfWeek(new Date(targetDate));
    loadMealCalendar(startOfWeek);
  } catch (error) {
    console.error('Error moving meal:', error);
    showNotification('Failed to move meal', 'error');
  }
}

// Create a new meal from a recipe
async function createMealFromRecipe(recipeId, date, type) {
  try {
    // Get the recipe from database
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      showNotification('Recipe not found', 'error');
      return;
    }
    
    // Create meal object
    const meal = {
      id: 'meal_' + Date.now(),
      date: date,
      type: type,
      name: recipe.name,
      recipeId: recipe.id,
      time: getDefaultMealTime(type),
      preparationTime: recipe.preparationTime,
      notes: '',
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addMeal(meal);
    
    showNotification('Meal created from recipe', 'success');
    
    // Reload meal calendar
    const startOfWeek = getStartOfWeek(new Date(date));
    loadMealCalendar(startOfWeek);
  } catch (error) {
    console.error('Error creating meal from recipe:', error);
    showNotification('Failed to create meal', 'error');
  }
}

// Handle editing a meal
function handleEditMealClick(event) {
  event.stopPropagation();
  
  const mealId = event.currentTarget.dataset.mealId;
  
  // Get meal from database
  getMealById(mealId).then(meal => {
    if (!meal) {
      showNotification('Meal not found', 'error');
      return;
    }
    
    showEditMealModal(meal);
  }).catch(error => {
    console.error('Error loading meal for edit:', error);
    showNotification('Failed to load meal', 'error');
  });
}

// Show edit meal modal
function showEditMealModal(meal) {
  // Get recipes for select dropdown
  getAllRecipes().then(recipes => {
    let recipeOptions = '<option value="">Select a recipe...</option>';
    
    if (recipes && recipes.length > 0) {
      recipes.forEach(recipe => {
        const selected = meal.recipeId === recipe.id ? 'selected' : '';
        recipeOptions += `<option value="${recipe.id}" ${selected}>${recipe.name}</option>`;
      });
    }
    
    // Create modal content
    const content = `
      <form id="edit-meal-form" class="meal-form" data-meal-id="${meal.id}">
        <div class="form-row">
          <div class="form-group">
            <label for="meal-date">Date</label>
            <input type="date" id="meal-date" required value="${meal.date}">
          </div>
          
          <div class="form-group">
            <label for="meal-type">Meal Type</label>
            <select id="meal-type" required>
              <option value="breakfast" ${meal.type === 'breakfast' ? 'selected' : ''}>Breakfast</option>
              <option value="lunch" ${meal.type === 'lunch' ? 'selected' : ''}>Lunch</option>
              <option value="dinner" ${meal.type === 'dinner' ? 'selected' : ''}>Dinner</option>
              <option value="snack" ${meal.type === 'snack' ? 'selected' : ''}>Snack</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="meal-recipe">Recipe</label>
          <select id="meal-recipe">
            ${recipeOptions}
          </select>
        </div>
        
        <div class="form-group meal-or-divider">
          <span>OR</span>
        </div>
        
        <div class="form-group">
          <label for="meal-name">Meal Name</label>
          <input type="text" id="meal-name" placeholder="Enter meal name" value="${meal.name || ''}">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="meal-time">Time</label>
            <input type="time" id="meal-time" value="${meal.time || ''}">
          </div>
          
          <div class="form-group">
            <label for="meal-prep-time">Preparation Time (minutes)</label>
            <input type="number" id="meal-prep-time" min="0" value="${meal.preparationTime || 30}">
          </div>
        </div>
        
        <div class="form-group">
          <label for="meal-notes">Notes</label>
          <textarea id="meal-notes" rows="3" placeholder="Optional notes about this meal">${meal.notes || ''}</textarea>
        </div>
      </form>
    `;
    
    showModal('Edit Meal', content, () => handleUpdateMeal(meal));
  });
}

// Handle updating a meal
async function handleUpdateMeal(originalMeal) {
  const form = document.getElementById('edit-meal-form');
  
  // Basic validation
  const mealName = document.getElementById('meal-name').value;
  const recipeId = document.getElementById('meal-recipe').value;
  
  if (!mealName && !recipeId) {
    showNotification('Please enter a meal name or select a recipe', 'error');
    return;
  }
  
  try {
    const mealId = form.dataset.mealId;
    const date = document.getElementById('meal-date').value;
    const type = document.getElementById('meal-type').value;
    const time = document.getElementById('meal-time').value;
    const preparationTime = document.getElementById('meal-prep-time').value;
    const notes = document.getElementById('meal-notes').value;
    
    // Create updated meal object
    const updatedMeal = {
      ...originalMeal,
      date: date,
      type: type,
      name: mealName,
      recipeId: recipeId || null,
      time: time || getDefaultMealTime(type),
      preparationTime: parseInt(preparationTime) || 0,
      notes: notes,
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await updateMeal(updatedMeal);
    
    showNotification('Meal updated successfully', 'success');
    
    // Reload meal calendar
    const startOfWeek = getStartOfWeek(new Date(date));
    loadMealCalendar(startOfWeek);
  } catch (error) {
    console.error('Error updating meal:', error);
    showNotification('Failed to update meal', 'error');
  }
}

// Handle deleting a meal
function handleDeleteMealClick(event) {
  event.stopPropagation();
  
  const mealId = event.currentTarget.dataset.mealId;
  
  // Show confirmation dialog
  const confirmContent = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to delete this meal?</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Delete Meal', confirmContent, () => confirmDeleteMeal(mealId));
}

// Confirm meal deletion
async function confirmDeleteMeal(mealId) {
  try {
    // Get meal to know which date to refresh
    const meal = await getMealById(mealId);
    const mealDate = meal ? meal.date : null;
    
    // Delete the meal
    await deleteMeal(mealId);
    
    showNotification('Meal deleted successfully', 'success');
    
    // Reload meal calendar
    if (mealDate) {
      const startOfWeek = getStartOfWeek(new Date(mealDate));
      loadMealCalendar(startOfWeek);
    } else {
      // Fallback to current week if meal not found
      const startOfWeek = getStartOfWeek(new Date());
      loadMealCalendar(startOfWeek);
    }
  } catch (error) {
    console.error('Error deleting meal:', error);
    showNotification('Failed to delete meal', 'error');
  }
}

// Show meal details
async function showMealDetails(meal) {
  try {
    // Get recipe if meal has a recipeId
    let recipe = null;
    if (meal.recipeId) {
      recipe = await getRecipeById(meal.recipeId);
    }
    
    // Format meal time
    const mealTime = meal.time ? formatTime(meal.time) : getDefaultMealTime(meal.type);
    
    // Build content
    let content = `
      <div class="meal-details">
        <div class="meal-header">
          <h3>${meal.name}</h3>
          <div class="meal-meta">
            <span class="meal-type-badge ${meal.type}">${capitalizeFirstLetter(meal.type)}</span>
            <span class="meal-time">${mealTime}</span>
          </div>
        </div>
        
        <div class="meal-info">
          <div class="info-item">
            <i class="material-icons">event</i>
            <span>${formatDate(meal.date)}</span>
          </div>
          
          <div class="info-item">
            <i class="material-icons">schedule</i>
            <span>Preparation: ${meal.preparationTime} minutes</span>
          </div>
          
          ${meal.notes ? `
            <div class="meal-notes">
              <h4>Notes</h4>
              <p>${meal.notes}</p>
            </div>
          ` : ''}
        </div>
    `;
    
    // Add recipe details if available
    if (recipe) {
      content += `
        <div class="recipe-details">
          <h4>Recipe Information</h4>
          
          <div class="recipe-meta">
            <span>Category: ${capitalizeFirstLetter(recipe.category)}</span>
            <span>Servings: ${recipe.servings}</span>
            ${recipe.calories ? `<span>Calories: ${recipe.calories} per serving</span>` : ''}
          </div>
          
          ${recipe.description ? `
            <div class="recipe-description">
              <p>${recipe.description}</p>
            </div>
          ` : ''}
          
          <div class="recipe-ingredients">
            <h5>Ingredients</h5>
            <ul>
              ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
            </ul>
          </div>
          
          <div class="recipe-instructions">
            <h5>Instructions</h5>
            <p>${recipe.instructions}</p>
          </div>
        </div>
      `;
    }
    
    content += `
        <div class="meal-actions">
          <button id="edit-meal" class="btn btn-outline">
            <i class="material-icons">edit</i>
            <span>Edit</span>
          </button>
          <button id="delete-meal" class="btn btn-outline danger">
            <i class="material-icons">delete</i>
            <span>Delete</span>
          </button>
        </div>
      </div>
    `;
    
    showModal('Meal Details', content);
    
    // Add event listeners
    document.getElementById('edit-meal').addEventListener('click', () => {
      closeModal();
      showEditMealModal(meal);
    });
    
    document.getElementById('delete-meal').addEventListener('click', () => {
      closeModal();
      const confirmContent = `
        <div class="confirmation-dialog">
          <p>Are you sure you want to delete this meal?</p>
          <p>This action cannot be undone.</p>
        </div>
      `;
      
      showModal('Delete Meal', confirmContent, () => confirmDeleteMeal(meal.id));
    });
  } catch (error) {
    console.error('Error showing meal details:', error);
    showNotification('Failed to load meal details', 'error');
  }
}

// Handle editing a recipe
function handleEditRecipeClick(event) {
  event.stopPropagation();
  
  const recipeId = event.currentTarget.dataset.recipeId;
  
  // Get recipe from database
  getRecipeById(recipeId).then(recipe => {
    if (!recipe) {
      showNotification('Recipe not found', 'error');
      return;
    }
    
    showEditRecipeModal(recipe);
  }).catch(error => {
    console.error('Error loading recipe for edit:', error);
    showNotification('Failed to load recipe', 'error');
  });
}

// Show edit recipe modal
function showEditRecipeModal(recipe) {
  // Create modal content
  const content = `
    <form id="edit-recipe-form" class="recipe-form" data-recipe-id="${recipe.id}">
      <div class="form-group">
        <label for="recipe-name">Recipe Name *</label>
        <input type="text" id="recipe-name" required placeholder="Enter recipe name" value="${recipe.name}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="recipe-category">Category</label>
          <select id="recipe-category">
            <option value="main" ${recipe.category === 'main' ? 'selected' : ''}>Main Course</option>
            <option value="side" ${recipe.category === 'side' ? 'selected' : ''}>Side Dish</option>
            <option value="breakfast" ${recipe.category === 'breakfast' ? 'selected' : ''}>Breakfast</option>
            <option value="dessert" ${recipe.category === 'dessert' ? 'selected' : ''}>Dessert</option>
            <option value="snack" ${recipe.category === 'snack' ? 'selected' : ''}>Snack</option>
            <option value="other" ${recipe.category === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="recipe-prep-time">Preparation Time (minutes) *</label>
          <input type="number" id="recipe-prep-time" required min="0" value="${recipe.preparationTime}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="recipe-description">Description</label>
        <textarea id="recipe-description" rows="3" placeholder="Brief description of the recipe">${recipe.description || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label for="recipe-ingredients">Ingredients *</label>
        <textarea id="recipe-ingredients" rows="5" required placeholder="Enter ingredients, one per line">${recipe.ingredients.join('\n')}</textarea>
      </div>
      
      <div class="form-group">
        <label for="recipe-instructions">Instructions *</label>
        <textarea id="recipe-instructions" rows="5" required placeholder="Enter cooking instructions">${recipe.instructions}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="recipe-servings">Servings</label>
          <input type="number" id="recipe-servings" min="1" value="${recipe.servings}">
        </div>
        
        <div class="form-group">
          <label for="recipe-calories">Calories per serving</label>
          <input type="number" id="recipe-calories" min="0" value="${recipe.calories || ''}">
        </div>
      </div>
    </form>
  `;
  
  showModal('Edit Recipe', content, () => handleUpdateRecipe(recipe));
}

// Handle updating a recipe
async function handleUpdateRecipe(originalRecipe) {
  const form = document.getElementById('edit-recipe-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const recipeId = form.dataset.recipeId;
    const name = document.getElementById('recipe-name').value;
    const category = document.getElementById('recipe-category').value;
    const preparationTime = document.getElementById('recipe-prep-time').value;
    const description = document.getElementById('recipe-description').value;
    const ingredients = document.getElementById('recipe-ingredients').value;
    const instructions = document.getElementById('recipe-instructions').value;
    const servings = document.getElementById('recipe-servings').value;
    const calories = document.getElementById('recipe-calories').value;
    
    // Create updated recipe object
    const updatedRecipe = {
      ...originalRecipe,
      name: name,
      category: category,
      preparationTime: parseInt(preparationTime) || 30,
      description: description,
      ingredients: ingredients.split('\n').filter(i => i.trim()),
      instructions: instructions,
      servings: parseInt(servings) || 4,
      calories: calories ? parseInt(calories) : null,
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await updateRecipe(updatedRecipe);
    
    showNotification('Recipe updated successfully', 'success');
    
    // Reload recipes
    loadRecipes();
  } catch (error) {
    console.error('Error updating recipe:', error);
    showNotification('Failed to update recipe', 'error');
  }
}

// Handle deleting a recipe
function handleDeleteRecipeClick(event) {
  event.stopPropagation();
  
  const recipeId = event.currentTarget.dataset.recipeId;
  
  // Check if recipe is used in any meals
  getMealsByRecipeId(recipeId).then(meals => {
    if (meals && meals.length > 0) {
      // Recipe is used, show warning
      const warningContent = `
        <div class="confirmation-dialog warning">
          <p>This recipe is used in ${meals.length} meal plan(s).</p>
          <p>Deleting it will remove the recipe reference from these meals.</p>
          <p>Are you sure you want to continue?</p>
        </div>
      `;
      
      showModal('Recipe In Use', warningContent, () => confirmDeleteRecipe(recipeId, meals));
    } else {
      // Recipe not used, show normal confirmation
      const confirmContent = `
        <div class="confirmation-dialog">
          <p>Are you sure you want to delete this recipe?</p>
          <p>This action cannot be undone.</p>
        </div>
      `;
      
      showModal('Delete Recipe', confirmContent, () => confirmDeleteRecipe(recipeId));
    }
  }).catch(error => {
    console.error('Error checking recipe usage:', error);
    showNotification('Failed to check recipe usage', 'error');
  });
}

// Confirm recipe deletion
async function confirmDeleteRecipe(recipeId, affectedMeals = []) {
  try {
    // Update any meals that use this recipe
    if (affectedMeals.length > 0) {
      for (const meal of affectedMeals) {
        // Keep the meal name but remove recipe reference
        meal.recipeId = null;
        meal.updatedAt = new Date().toISOString();
        await updateMeal(meal);
      }
    }
    
    // Delete the recipe
    await deleteRecipe(recipeId);
    
    showNotification('Recipe deleted successfully', 'success');
    
    // Reload recipes
    loadRecipes();
    
    // Reload meal calendar if needed
    if (affectedMeals.length > 0) {
      const startOfWeek = getStartOfWeek(new Date());
      loadMealCalendar(startOfWeek);
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    showNotification('Failed to delete recipe', 'error');
  }
}

// Show recipe details
function showRecipeDetails(recipe) {
  // Build content
  const content = `
    <div class="recipe-details-modal">
      <div class="recipe-header">
        <h3>${recipe.name}</h3>
        <div class="recipe-meta">
          <span class="recipe-category">${capitalizeFirstLetter(recipe.category)}</span>
          <span class="recipe-prep-time">${recipe.preparationTime} min</span>
          <span class="recipe-servings">${recipe.servings} servings</span>
          ${recipe.calories ? `<span class="recipe-calories">${recipe.calories} cal/serving</span>` : ''}
        </div>
      </div>
      
      ${recipe.description ? `
        <div class="recipe-description">
          <p>${recipe.description}</p>
        </div>
      ` : ''}
      
      <div class="recipe-ingredients">
        <h4>Ingredients</h4>
        <ul>
          ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
        </ul>
      </div>
      
      <div class="recipe-instructions">
        <h4>Instructions</h4>
        <p>${recipe.instructions}</p>
      </div>
      
      <div class="recipe-actions">
        <button id="add-to-meal-plan" class="btn btn-primary">
          <i class="material-icons">add</i>
          <span>Add to Meal Plan</span>
        </button>
        <button id="edit-recipe" class="btn btn-outline">
          <i class="material-icons">edit</i>
          <span>Edit</span>
        </button>
        <button id="delete-recipe" class="btn btn-outline danger">
          <i class="material-icons">delete</i>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;
  
  showModal('Recipe Details', content);
  
  // Add event listeners
  document.getElementById('add-to-meal-plan').addEventListener('click', () => {
    closeModal();
    showAddMealFromRecipeModal(recipe);
  });
  
  document.getElementById('edit-recipe').addEventListener('click', () => {
    closeModal();
    showEditRecipeModal(recipe);
  });
  
  document.getElementById('delete-recipe').addEventListener('click', () => {
    closeModal();
    handleDeleteRecipeClick({ stopPropagation: () => {}, currentTarget: { dataset: { recipeId: recipe.id } } });
  });
}

// Show modal to add a meal from a recipe
function showAddMealFromRecipeModal(recipe) {
  // Set default date to today
  const today = new Date();
  const dateValue = today.toISOString().split('T')[0];
  
  // Create modal content
  const content = `
    <form id="add-meal-from-recipe-form" class="meal-form" data-recipe-id="${recipe.id}">
      <div class="recipe-preview">
        <h4>${recipe.name}</h4>
        <div class="recipe-meta">
          <span>Preparation: ${recipe.preparationTime} min</span>
          <span>Category: ${capitalizeFirstLetter(recipe.category)}</span>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="meal-date">Date</label>
          <input type="date" id="meal-date" required value="${dateValue}">
        </div>
        
        <div class="form-group">
          <label for="meal-type">Meal Type</label>
          <select id="meal-type" required>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner" selected>Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="meal-time">Time</label>
        <input type="time" id="meal-time" value="${getDefaultMealTime('dinner')}">
      </div>
      
      <div class="form-group">
        <label for="meal-notes">Notes</label>
        <textarea id="meal-notes" rows="3" placeholder="Optional notes about this meal"></textarea>
      </div>
    </form>
  `;
  
  showModal('Add to Meal Plan', content, () => handleAddMealFromRecipe(recipe));
}

// Handle adding a meal from a recipe
async function handleAddMealFromRecipe(recipe) {
  const form = document.getElementById('add-meal-from-recipe-form');
  
  try {
    const date = document.getElementById('meal-date').value;
    const type = document.getElementById('meal-type').value;
    const time = document.getElementById('meal-time').value;
    const notes = document.getElementById('meal-notes').value;
    
    // Create meal object
    const meal = {
      id: 'meal_' + Date.now(),
      date: date,
      type: type,
      name: recipe.name,
      recipeId: recipe.id,
      time: time || getDefaultMealTime(type),
      preparationTime: recipe.preparationTime,
      notes: notes,
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addMeal(meal);
    
    showNotification('Meal added to plan', 'success');
    
    // Reload meal calendar
    const startOfWeek = getStartOfWeek(new Date(date));
    loadMealCalendar(startOfWeek);
  } catch (error) {
    console.error('Error adding meal from recipe:', error);
    showNotification('Failed to add meal', 'error');
  }
}

// Generate grocery list from meal plan
async function generateGroceryList() {
  try {
    const startDate = document.getElementById('grocery-start-date').value;
    const endDate = document.getElementById('grocery-end-date').value;
    
    if (!startDate || !endDate) {
      showNotification('Please select start and end dates', 'error');
      return;
    }
    
    // Get meals for the selected date range
    const meals = await getMealsForDateRange(new Date(startDate), new Date(endDate));
    
    if (!meals || meals.length === 0) {
      showNotification('No meals found in the selected date range', 'warning');
      return;
    }
    
    // Collect recipe ingredients
    const ingredients = [];
    const processedRecipes = [];
    
    for (const meal of meals) {
      if (meal.recipeId && !processedRecipes.includes(meal.recipeId)) {
        const recipe = await getRecipeById(meal.recipeId);
        if (recipe && recipe.ingredients) {
          recipe.ingredients.forEach(ingredient => {
            ingredients.push(ingredient);
          });
          processedRecipes.push(meal.recipeId);
        }
      }
    }
    
    // Sort and group similar ingredients
    ingredients.sort();
    
    // Generate grocery list content
    let groceryContent = `
      <div class="grocery-list-result">
        <div class="grocery-header">
          <h3>Grocery List</h3>
          <p>For meals from ${formatDate(startDate)} to ${formatDate(endDate)}</p>
        </div>
        
        <div class="grocery-items">
    `;
    
    if (ingredients.length === 0) {
      groceryContent += `
        <div class="placeholder-message">
          <i class="material-icons">info</i>
          <p>No ingredients found for the selected meals</p>
        </div>
      `;
    } else {
      groceryContent += `
        <ul class="grocery-items-list">
          ${ingredients.map(ingredient => `
            <li>
              <label class="checkbox-container">
                <input type="checkbox" class="grocery-item-checkbox">
                <span class="checkmark"></span>
                ${ingredient}
              </label>
            </li>
          `).join('')}
        </ul>
      `;
    }
    
    groceryContent += `
        </div>
        
        <div class="grocery-actions">
          <button id="save-grocery-list" class="btn btn-primary">
            <i class="material-icons">save</i>
            <span>Save to Grocery List</span>
          </button>
          <button id="print-grocery-list" class="btn btn-outline">
            <i class="material-icons">print</i>
            <span>Print</span>
          </button>
        </div>
      </div>
    `;
    
    showModal('Grocery List', groceryContent);
    
    // Add event listeners
    document.getElementById('save-grocery-list').addEventListener('click', () => {
      saveGroceryList(ingredients);
      closeModal();
    });
    
    document.getElementById('print-grocery-list').addEventListener('click', () => {
      printGroceryList(ingredients, startDate, endDate);
    });
  } catch (error) {
    console.error('Error generating grocery list:', error);
    showNotification('Failed to generate grocery list', 'error');
  }
}

// Save grocery list to grocery store
async function saveGroceryList(ingredients) {
  try {
    // Get checked items
    const checkboxes = document.querySelectorAll('.grocery-item-checkbox');
    const checkedItems = Array.from(checkboxes)
      .map((checkbox, index) => checkbox.checked ? ingredients[index] : null)
      .filter(item => item !== null);
    
    // Get all ingredients
    const itemsToAdd = checkedItems.length > 0 ? checkedItems : ingredients;
    
    // Create grocery items
    for (const ingredient of itemsToAdd) {
      const groceryItem = {
        id: 'grocery_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: ingredient,
        category: detectCategory(ingredient),
        quantity: 1,
        unit: '',
        completed: false,
        notes: 'Added from meal plan',
        createdBy: appState.currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addGroceryItem(groceryItem);
    }
    
    showNotification(`${itemsToAdd.length} items added to grocery list`, 'success');
  } catch (error) {
    console.error('Error saving grocery list:', error);
    showNotification('Failed to save grocery list', 'error');
  }
}

// Print grocery list
function printGroceryList(ingredients, startDate, endDate) {
  const printWindow = window.open('', '_blank');
  
  // Create print content
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Grocery List</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h1 { color: #4285F4; }
        .date-range { color: #5f6368; margin-bottom: 20px; }
        ul { list-style-type: none; padding: 0; }
        li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .print-controls { margin-top: 20px; }
        @media print {
          .print-controls { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Grocery List</h1>
      <div class="date-range">For meals from ${formatDate(startDate)} to ${formatDate(endDate)}</div>
      
      <ul>
        ${ingredients.map(ingredient => `<li>☐ ${ingredient}</li>`).join('')}
      </ul>
      
      <div class="print-controls">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
}

// Helper function to detect ingredient category
function detectCategory(ingredient) {
  const lowerIngredient = ingredient.toLowerCase();
  
  const categories = {
    'produce': ['apple', 'banana', 'lettuce', 'tomato', 'carrot', 'onion', 'garlic', 'pepper', 'potato', 'spinach', 'kale', 'fruit', 'vegetable'],
    'meat': ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'steak', 'ground', 'sausage', 'bacon', 'ham'],
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
    'bakery': ['bread', 'roll', 'bun', 'bagel', 'pastry', 'cake', 'cookie'],
    'canned': ['can', 'soup', 'beans', 'tuna', 'tomato sauce'],
    'dry goods': ['pasta', 'rice', 'cereal', 'flour', 'sugar', 'spice'],
    'frozen': ['frozen', 'ice cream'],
    'beverages': ['water', 'juice', 'soda', 'coffee', 'tea'],
    'snacks': ['chip', 'cracker', 'pretzel', 'popcorn', 'nut'],
    'condiments': ['sauce', 'dressing', 'oil', 'vinegar', 'mayo', 'ketchup', 'mustard', 'jam', 'honey']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

// Search recipes
function searchRecipes() {
  const searchTerm = document.getElementById('recipe-search').value.toLowerCase();
  
  getAllRecipes().then(recipes => {
    // Filter recipes by search term
    const filteredRecipes = searchTerm 
      ? recipes.filter(recipe => 
          recipe.name.toLowerCase().includes(searchTerm) || 
          recipe.description.toLowerCase().includes(searchTerm) ||
          recipe.ingredients.some(i => i.toLowerCase().includes(searchTerm))
        )
      : recipes;
    
    // Update recipe list UI with filtered recipes
    const recipeList = document.getElementById('recipe-list');
    
    if (filteredRecipes.length === 0) {
      recipeList.innerHTML = `
        <div class="placeholder-message">
          <i class="material-icons">search</i>
          <p>No recipes found matching "${searchTerm}"</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    filteredRecipes.forEach(recipe => {
      html += `
        <div class="recipe-card" draggable="true" data-recipe-id="${recipe.id}">
          <div class="recipe-header">
            <h4>${recipe.name}</h4>
            <span class="recipe-time">${recipe.preparationTime} min</span>
          </div>
          <p class="recipe-description">${recipe.description.substring(0, 60)}${recipe.description.length > 60 ? '...' : ''}</p>
          <div class="recipe-footer">
            <span class="recipe-category">${recipe.category}</span>
            <div class="recipe-actions">
              <button class="btn btn-icon edit-recipe-btn" data-recipe-id="${recipe.id}">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn btn-icon delete-recipe-btn" data-recipe-id="${recipe.id}">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    recipeList.innerHTML = html;
    
    // Add event listeners for drag-and-drop
    recipeList.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('dragstart', handleRecipeDragStart);
      card.addEventListener('dragend', handleRecipeDragEnd);
      
      // Add click handler for recipe details
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.recipe-actions')) {
          const recipeId = card.dataset.recipeId;
          showRecipeDetails(filteredRecipes.find(r => r.id === recipeId));
        }
      });
      
      // Add event listeners for edit and delete
      card.querySelector('.edit-recipe-btn').addEventListener('click', handleEditRecipeClick);
      card.querySelector('.delete-recipe-btn').addEventListener('click', handleDeleteRecipeClick);
    });
  }).catch(error => {
    console.error('Error searching recipes:', error);
  });
}

// Helper function to format time
function formatTime(timeString) {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    
    return `${formattedHour}:${formattedMinute} ${period}`;
  } catch (error) {
    return timeString;
  }
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Database functions for meal planning

// Get a meal by ID
async function getMealById(mealId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.meals, mealId);
}

// Get recipes for a meal
async function getMealsByRecipeId(recipeId) {
  if (!db) throw new Error('Database not initialized');
  
  const allMeals = await db.getAll(stores.meals);
  return allMeals.filter(meal => meal.recipeId === recipeId);
}

// Get a recipe by ID
async function getRecipeById(recipeId) {
  if (!db) throw new Error('Database not initialized');
  return db.get(stores.recipes, recipeId);
}

// Get all recipes
async function getAllRecipes() {
  if (!db) throw new Error('Database not initialized');
  return db.getAll(stores.recipes);
}

// Add a recipe
async function addRecipe(recipe) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.recipes, recipe);
}

// Update a recipe
async function updateRecipe(recipe) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.recipes, recipe);
}

// Delete a recipe
async function deleteRecipe(recipeId) {
  if (!db) throw new Error('Database not initialized');
  return db.delete(stores.recipes, recipeId);
}

// Add a grocery item
async function addGroceryItem(item) {
  if (!db) throw new Error('Database not initialized');
  return db.put(stores.groceries, item);
}