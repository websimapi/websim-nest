// Grocery management functionality for the Family Organizer app

// Initialize grocery view
function initGroceryView() {
  console.log('Initializing grocery view');
  
  // Get the grocery container
  const groceryView = document.getElementById('grocery-view');
  
  // Check if user is authenticated
  if (!appState.isAuthenticated) {
    groceryView.innerHTML = `
      <h1>Grocery List</h1>
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to manage your grocery lists</p>
      </div>
    `;
    return;
  }
  
  // Load grocery list interface
  loadGroceryList();
}

// Load grocery list interface
async function loadGroceryList() {
  try {
    // Get the grocery container
    const groceryView = document.getElementById('grocery-view');
    
    // Create grocery list interface
    groceryView.innerHTML = `
      <h1>Grocery List</h1>
      
      <div class="grocery-controls">
        <div class="filter-controls">
          <select id="grocery-filter">
            <option value="all">All Items</option>
            <option value="active">Active Items</option>
            <option value="completed">Completed Items</option>
          </select>
          
          <select id="grocery-category-filter">
            <option value="all">All Categories</option>
            <option value="produce">Produce</option>
            <option value="meat">Meat & Seafood</option>
            <option value="dairy">Dairy</option>
            <option value="bakery">Bakery</option>
            <option value="canned">Canned Goods</option>
            <option value="dry goods">Dry Goods</option>
            <option value="frozen">Frozen</option>
            <option value="beverages">Beverages</option>
            <option value="snacks">Snacks</option>
            <option value="condiments">Condiments</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <button id="add-grocery-item-btn" class="btn btn-primary">
          <i class="material-icons">add</i>
          <span>Add Item</span>
        </button>
      </div>
      
      <div class="grocery-list-container">
        <div class="grocery-categories" id="grocery-categories">
          <!-- Categories will be added here -->
        </div>
      </div>
      
      <div class="grocery-actions">
        <button id="clear-completed-btn" class="btn btn-outline">
          <i class="material-icons">delete_sweep</i>
          <span>Clear Completed</span>
        </button>
        <button id="print-grocery-btn" class="btn btn-outline">
          <i class="material-icons">print</i>
          <span>Print List</span>
        </button>
      </div>
    `;
    
    // Set up event listeners
    document.getElementById('grocery-filter').addEventListener('change', filterGroceryItems);
    document.getElementById('grocery-category-filter').addEventListener('change', filterGroceryItems);
    document.getElementById('add-grocery-item-btn').addEventListener('click', showAddGroceryItemModal);
    document.getElementById('clear-completed-btn').addEventListener('click', clearCompletedItems);
    document.getElementById('print-grocery-btn').addEventListener('click', printGroceryList);
    
    // Load grocery items
    await refreshGroceryItems();
    
  } catch (error) {
    console.error('Error loading grocery list:', error);
    showNotification('Failed to load grocery list', 'error');
  }
}

// Refresh grocery items based on current filters
async function refreshGroceryItems() {
  try {
    // Get filter values
    const filterType = document.getElementById('grocery-filter').value;
    const categoryFilter = document.getElementById('grocery-category-filter').value;
    
    // Get all grocery items
    let items = await getGroceryItems();
    
    // Apply filters
    items = filterGroceryByType(items, filterType);
    items = filterGroceryByCategory(items, categoryFilter);
    
    // Group items by category
    const itemsByCategory = groupItemsByCategory(items);
    
    // Update the UI
    updateGroceryList(itemsByCategory);
    
    return items;
  } catch (error) {
    console.error('Error refreshing grocery items:', error);
    showNotification('Failed to load grocery items', 'error');
    return [];
  }
}

// Filter grocery items by type (all, active, completed)
function filterGroceryByType(items, filterType) {
  if (filterType === 'all') {
    return items;
  }
  
  return items.filter(item => {
    if (filterType === 'active') {
      return !item.completed;
    } else if (filterType === 'completed') {
      return item.completed;
    }
    return true;
  });
}

// Filter grocery items by category
function filterGroceryByCategory(items, categoryFilter) {
  if (categoryFilter === 'all') {
    return items;
  }
  
  return items.filter(item => item.category === categoryFilter);
}

// Group items by category
function groupItemsByCategory(items) {
  const groups = {};
  
  items.forEach(item => {
    const category = item.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  });
  
  return groups;
}

// Update the grocery list UI
function updateGroceryList(itemsByCategory) {
  const categoriesContainer = document.getElementById('grocery-categories');
  categoriesContainer.innerHTML = '';
  
  // Check if there are no items
  if (Object.keys(itemsByCategory).length === 0) {
    categoriesContainer.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">shopping_cart</i>
        <p>No grocery items found</p>
      </div>
    `;
    return;
  }
  
  // Get category names in a specific order
  const categoryOrder = [
    'produce', 'meat', 'dairy', 'bakery', 'canned', 
    'dry goods', 'frozen', 'beverages', 'snacks', 'condiments', 'other'
  ];
  
  // Sort categories
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  // Create sections for each category
  sortedCategories.forEach(category => {
    const items = itemsByCategory[category];
    if (items.length === 0) return;
    
    const categorySection = document.createElement('div');
    categorySection.className = 'grocery-category';
    
    // Category header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.innerHTML = `
      <h3>${capitalizeFirstLetter(category)}</h3>
      <span class="item-count">${items.length}</span>
    `;
    
    // Category items
    const itemsList = document.createElement('div');
    itemsList.className = 'grocery-items';
    
    items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = `grocery-item ${item.completed ? 'completed' : ''}`;
      itemElement.dataset.itemId = item.id;
      
      itemElement.innerHTML = `
        <div class="item-checkbox">
          <input type="checkbox" id="item-${item.id}" ${item.completed ? 'checked' : ''}>
          <label for="item-${item.id}"></label>
        </div>
        <div class="item-content">
          <div class="item-name">${item.name}</div>
          ${item.quantity ? `
            <div class="item-details">
              <span class="item-quantity">${item.quantity} ${item.unit || ''}</span>
            </div>
          ` : ''}
          ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
        </div>
        <div class="item-actions">
          <button class="btn btn-icon edit-item-btn" data-item-id="${item.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="btn btn-icon delete-item-btn" data-item-id="${item.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
      `;
      
      itemsList.appendChild(itemElement);
    });
    
    categorySection.appendChild(categoryHeader);
    categorySection.appendChild(itemsList);
    categoriesContainer.appendChild(categorySection);
  });
  
  // Add event listeners to checkboxes and buttons
  document.querySelectorAll('.item-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', handleGroceryItemCheckboxChange);
  });
  
  document.querySelectorAll('.edit-item-btn').forEach(button => {
    button.addEventListener('click', handleEditGroceryItemClick);
  });
  
  document.querySelectorAll('.delete-item-btn').forEach(button => {
    button.addEventListener('click', handleDeleteGroceryItemClick);
  });
}

// Show add grocery item modal
function showAddGroceryItemModal() {
  const content = `
    <form id="add-grocery-item-form" class="grocery-form">
      <div class="form-group">
        <label for="item-name">Item Name *</label>
        <input type="text" id="item-name" required placeholder="Enter item name">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="item-quantity">Quantity</label>
          <input type="number" id="item-quantity" min="1" value="1">
        </div>
        
        <div class="form-group">
          <label for="item-unit">Unit</label>
          <input type="text" id="item-unit" placeholder="e.g., lb, oz, pkg">
        </div>
      </div>
      
      <div class="form-group">
        <label for="item-category">Category</label>
        <select id="item-category">
          <option value="produce">Produce</option>
          <option value="meat">Meat & Seafood</option>
          <option value="dairy">Dairy</option>
          <option value="bakery">Bakery</option>
          <option value="canned">Canned Goods</option>
          <option value="dry goods">Dry Goods</option>
          <option value="frozen">Frozen</option>
          <option value="beverages">Beverages</option>
          <option value="snacks">Snacks</option>
          <option value="condiments">Condiments</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="item-notes">Notes</label>
        <textarea id="item-notes" rows="2" placeholder="Optional notes about this item"></textarea>
      </div>
    </form>
  `;
  
  showModal('Add Grocery Item', content, handleAddGroceryItem);
}

// Handle adding a grocery item
async function handleAddGroceryItem() {
  const form = document.getElementById('add-grocery-item-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const name = document.getElementById('item-name').value;
    const quantity = document.getElementById('item-quantity').value;
    const unit = document.getElementById('item-unit').value;
    const category = document.getElementById('item-category').value;
    const notes = document.getElementById('item-notes').value;
    
    // Create item object
    const groceryItem = {
      id: 'grocery_' + Date.now(),
      name: name,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit,
      category: category,
      notes: notes,
      completed: false,
      createdBy: appState.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await addGroceryItem(groceryItem);
    
    showNotification('Item added successfully', 'success');
    
    // Refresh grocery list
    await refreshGroceryItems();
    
  } catch (error) {
    console.error('Error adding grocery item:', error);
    showNotification('Failed to add item', 'error');
  }
}

// Handle grocery item checkbox change
async function handleGroceryItemCheckboxChange(event) {
  const checkbox = event.target;
  const itemId = checkbox.id.replace('item-', '');
  const completed = checkbox.checked;
  
  try {
    // Get the item from database
    const item = await getGroceryItemById(itemId);
    if (!item) {
      showNotification('Item not found', 'error');
      return;
    }
    
    // Update item
    item.completed = completed;
    item.updatedAt = new Date().toISOString();
    
    // Save to database
    await updateGroceryItem(item);
    
    // Update UI
    const itemElement = checkbox.closest('.grocery-item');
    if (completed) {
      itemElement.classList.add('completed');
    } else {
      itemElement.classList.remove('completed');
    }
    
  } catch (error) {
    console.error('Error updating grocery item:', error);
    showNotification('Failed to update item', 'error');
    
    // Revert checkbox state
    checkbox.checked = !completed;
  }
}

// Handle editing a grocery item
function handleEditGroceryItemClick(event) {
  const itemId = event.currentTarget.dataset.itemId;
  
  // Get item from database
  getGroceryItemById(itemId).then(item => {
    if (!item) {
      showNotification('Item not found', 'error');
      return;
    }
    
    showEditGroceryItemModal(item);
  }).catch(error => {
    console.error('Error loading grocery item for edit:', error);
    showNotification('Failed to load item', 'error');
  });
}

// Show edit grocery item modal
function showEditGroceryItemModal(item) {
  const content = `
    <form id="edit-grocery-item-form" class="grocery-form" data-item-id="${item.id}">
      <div class="form-group">
        <label for="item-name">Item Name *</label>
        <input type="text" id="item-name" required placeholder="Enter item name" value="${item.name}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="item-quantity">Quantity</label>
          <input type="number" id="item-quantity" min="1" value="${item.quantity || 1}">
        </div>
        
        <div class="form-group">
          <label for="item-unit">Unit</label>
          <input type="text" id="item-unit" placeholder="e.g., lb, oz, pkg" value="${item.unit || ''}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="item-category">Category</label>
          <select id="item-category">
            <option value="produce" ${item.category === 'produce' ? 'selected' : ''}>Produce</option>
            <option value="meat" ${item.category === 'meat' ? 'selected' : ''}>Meat & Seafood</option>
            <option value="dairy" ${item.category === 'dairy' ? 'selected' : ''}>Dairy</option>
            <option value="bakery" ${item.category === 'bakery' ? 'selected' : ''}>Bakery</option>
            <option value="canned" ${item.category === 'canned' ? 'selected' : ''}>Canned Goods</option>
            <option value="dry goods" ${item.category === 'dry goods' ? 'selected' : ''}>Dry Goods</option>
            <option value="frozen" ${item.category === 'frozen' ? 'selected' : ''}>Frozen</option>
            <option value="beverages" ${item.category === 'beverages' ? 'selected' : ''}>Beverages</option>
            <option value="snacks" ${item.category === 'snacks' ? 'selected' : ''}>Snacks</option>
            <option value="condiments" ${item.category === 'condiments' ? 'selected' : ''}>Condiments</option>
            <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="item-completed">Status</label>
          <select id="item-completed">
            <option value="false" ${!item.completed ? 'selected' : ''}>Active</option>
            <option value="true" ${item.completed ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="item-notes">Notes</label>
        <textarea id="item-notes" rows="2" placeholder="Optional notes about this item">${item.notes || ''}</textarea>
      </div>
    </form>
  `;
  
  showModal('Edit Grocery Item', content, () => handleUpdateGroceryItem(item));
}

// Handle updating a grocery item
async function handleUpdateGroceryItem(originalItem) {
  const form = document.getElementById('edit-grocery-item-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const itemId = form.dataset.itemId;
    const name = document.getElementById('item-name').value;
    const quantity = document.getElementById('item-quantity').value;
    const unit = document.getElementById('item-unit').value;
    const category = document.getElementById('item-category').value;
    const completed = document.getElementById('item-completed').value === 'true';
    const notes = document.getElementById('item-notes').value;
    
    // Create updated item object
    const updatedItem = {
      ...originalItem,
      name: name,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit,
      category: category,
      notes: notes,
      completed: completed,
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await updateGroceryItem(updatedItem);
    
    showNotification('Item updated successfully', 'success');
    
    // Refresh grocery list
    await refreshGroceryItems();
    
  } catch (error) {
    console.error('Error updating grocery item:', error);
    showNotification('Failed to update item', 'error');
  }
}

// Handle deleting a grocery item
function handleDeleteGroceryItemClick(event) {
  const itemId = event.currentTarget.dataset.itemId;
  
  // Show confirmation dialog
  const confirmContent = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to delete this item?</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Delete Grocery Item', confirmContent, () => confirmDeleteGroceryItem(itemId));
}

// Confirm grocery item deletion
async function confirmDeleteGroceryItem(itemId) {
  try {
    await deleteGroceryItem(itemId);
    
    showNotification('Item deleted successfully', 'success');
    
    // Refresh grocery list
    await refreshGroceryItems();
    
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    showNotification('Failed to delete item', 'error');
  }
}

// Handle filtering grocery items
function filterGroceryItems() {
  refreshGroceryItems();
}

// Clear completed items
async function clearCompletedItems() {
  // Show confirmation dialog
  const confirmContent = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to clear all completed items?</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Clear Completed Items', confirmContent, confirmClearCompletedItems);
}

// Confirm clearing completed items
async function confirmClearCompletedItems() {
  try {
    // Get completed items
    const allItems = await getGroceryItems();
    const completedItems = allItems.filter(item => item.completed);
    
    if (completedItems.length === 0) {
      showNotification('No completed items to clear', 'info');
      return;
    }
    
    // Delete each completed item
    for (const item of completedItems) {
      await deleteGroceryItem(item.id);
    }
    
    showNotification(`Cleared ${completedItems.length} completed items`, 'success');
    
    // Refresh grocery list
    await refreshGroceryItems();
    
  } catch (error) {
    console.error('Error clearing completed items:', error);
    showNotification('Failed to clear completed items', 'error');
  }
}

// Print grocery list
function printGroceryList() {
  // Show modal with print options
  const content = `
    <div class="print-options">
      <div class="form-group">
        <label for="print-filter">Include Items</label>
        <select id="print-filter">
          <option value="all">All Items</option>
          <option value="active" selected>Active Items Only</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="print-sort">Sort By</label>
        <select id="print-sort">
          <option value="category" selected>Category</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Options</label>
        <div class="checkbox-option">
          <input type="checkbox" id="print-include-quantities" checked>
          <label for="print-include-quantities">Include Quantities</label>
        </div>
        <div class="checkbox-option">
          <input type="checkbox" id="print-include-notes">
          <label for="print-include-notes">Include Notes</label>
        </div>
      </div>
    </div>
  `;
  
  showModal('Print Grocery List', content, executePrintGroceryList);
}

// Execute printing the grocery list
async function executePrintGroceryList() {
  try {
    // Get print options
    const includeFilter = document.getElementById('print-filter').value;
    const sortBy = document.getElementById('print-sort').value;
    const includeQuantities = document.getElementById('print-include-quantities').checked;
    const includeNotes = document.getElementById('print-include-notes').checked;
    
    // Get items
    let items = await getGroceryItems();
    
    // Apply filter
    if (includeFilter === 'active') {
      items = items.filter(item => !item.completed);
    }
    
    if (items.length === 0) {
      showNotification('No items to print', 'warning');
      return;
    }
    
    // Generate print content
    let printContent = '';
    
    if (sortBy === 'category') {
      // Group by category
      const itemsByCategory = groupItemsByCategory(items);
      
      // Get sorted categories
      const categoryOrder = [
        'produce', 'meat', 'dairy', 'bakery', 'canned', 
        'dry goods', 'frozen', 'beverages', 'snacks', 'condiments', 'other'
      ];
      
      const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      // Generate HTML for each category
      sortedCategories.forEach(category => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems.length === 0) return;
        
        printContent += `
          <div class="print-category">
            <h3>${capitalizeFirstLetter(category)}</h3>
            <ul>
              ${categoryItems.map(item => `
                <li>
                  <span class="print-checkbox">☐</span>
                  <span class="print-item-name">${item.name}</span>
                  ${includeQuantities && item.quantity ? `
                    <span class="print-item-quantity">(${item.quantity} ${item.unit || ''})</span>
                  ` : ''}
                  ${includeNotes && item.notes ? `
                    <div class="print-item-notes">${item.notes}</div>
                  ` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      });
    } else {
      // Sort by name
      items.sort((a, b) => a.name.localeCompare(b.name));
      
      printContent += `
        <div class="print-items">
          <ul>
            ${items.map(item => `
              <li>
                <span class="print-checkbox">☐</span>
                <span class="print-item-name">${item.name}</span>
                ${includeQuantities && item.quantity ? `
                  <span class="print-item-quantity">(${item.quantity} ${item.unit || ''})</span>
                ` : ''}
                ${includeNotes && item.notes ? `
                  <div class="print-item-notes">${item.notes}</div>
                ` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    // Open print window
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Grocery List</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; }
          h1 { color: #4285F4; }
          h3 { margin-top: 20px; margin-bottom: 10px; color: #4285F4; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 8px 0; }
          .print-checkbox { display: inline-block; width: 20px; height: 20px; margin-right: 10px; }
          .print-item-name { font-weight: bold; }
          .print-item-quantity { color: #5f6368; margin-left: 10px; }
          .print-item-notes { margin-left: 30px; font-size: 0.9em; color: #5f6368; }
          .print-date { color: #5f6368; margin-bottom: 20px; }
          .print-controls { margin-top: 20px; }
          @media print {
            .print-controls { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Grocery List</h1>
        <div class="print-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        
        ${printContent}
        
        <div class="print-controls">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
  } catch (error) {
    console.error('Error printing grocery list:', error);
    showNotification('Failed to print grocery list', 'error');
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}