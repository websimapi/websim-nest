// Family management functionality for the Family Organizer app

// Initialize family view
function initFamilyView() {
  console.log('Initializing family view');
  
  // Get the family container
  const familyView = document.getElementById('family-view');
  
  // Check if user is authenticated
  if (!appState.isAuthenticated) {
    familyView.innerHTML = `
      <h1>Family Members</h1>
      <div class="placeholder-message">
        <i class="material-icons">lock</i>
        <p>Please sign in to manage your family members</p>
      </div>
    `;
    return;
  }
  
  // Load family management interface
  loadFamilyManagement();
}

// Load family management interface
async function loadFamilyManagement() {
  try {
    // Get the family container
    const familyView = document.getElementById('family-view');
    
    // Create family management interface
    familyView.innerHTML = `
      <h1>Family Members</h1>
      
      <div class="family-controls">
        <button id="add-family-member-btn" class="btn btn-primary">
          <i class="material-icons">person_add</i>
          <span>Add Family Member</span>
        </button>
      </div>
      
      <div class="family-members-container">
        <div class="family-account-owner">
          <h3>Account Owner</h3>
          <div class="family-member-card" id="account-owner-card">
            <!-- Account owner will be added here -->
          </div>
        </div>
        
        <div class="family-members-list">
          <h3>Family Members</h3>
          <div id="family-members-grid">
            <!-- Family members will be added here -->
          </div>
        </div>
      </div>
      
      <div class="family-settings">
        <h3>Family Settings</h3>
        <div class="settings-card">
          <div class="setting-group">
            <h4>Sharing</h4>
            <div class="setting-item">
              <label for="share-calendar">Share Calendar with Family</label>
              <div class="toggle-switch">
                <input type="checkbox" id="share-calendar" checked>
                <span class="toggle-slider"></span>
              </div>
            </div>
            <div class="setting-item">
              <label for="share-tasks">Share Tasks with Family</label>
              <div class="toggle-switch">
                <input type="checkbox" id="share-tasks" checked>
                <span class="toggle-slider"></span>
              </div>
            </div>
            <div class="setting-item">
              <label for="share-meals">Share Meal Plans with Family</label>
              <div class="toggle-switch">
                <input type="checkbox" id="share-meals" checked>
                <span class="toggle-slider"></span>
              </div>
            </div>
          </div>
          
          <div class="setting-group">
            <h4>Notifications</h4>
            <div class="setting-item">
              <label for="notify-calendar">Calendar Updates</label>
              <div class="toggle-switch">
                <input type="checkbox" id="notify-calendar" checked>
                <span class="toggle-slider"></span>
              </div>
            </div>
            <div class="setting-item">
              <label for="notify-tasks">Task Assignments</label>
              <div class="toggle-switch">
                <input type="checkbox" id="notify-tasks" checked>
                <span class="toggle-slider"></span>
              </div>
            </div>
            <div class="setting-item">
              <label for="notify-meals">Meal Plan Changes</label>
              <div class="toggle-switch">
                <input type="checkbox" id="notify-meals">
                <span class="toggle-slider"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Set up event listeners
    document.getElementById('add-family-member-btn').addEventListener('click', showAddFamilyMemberModal);
    
    // Toggle switches for settings
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', updateFamilySettings);
    });
    
    // Load family members
    await refreshFamilyMembers();
    
  } catch (error) {
    console.error('Error loading family management:', error);
    showNotification('Failed to load family management', 'error');
  }
}

// Refresh family members
async function refreshFamilyMembers() {
  try {
    // Get current user (account owner)
    const accountOwner = appState.currentUser;
    
    // Get family members
    const familyMembers = await getFamilyMembers();
    
    // Display account owner
    displayAccountOwner(accountOwner);
    
    // Display family members
    displayFamilyMembers(familyMembers);
    
    return familyMembers;
  } catch (error) {
    console.error('Error refreshing family members:', error);
    showNotification('Failed to load family members', 'error');
    return [];
  }
}

// Display account owner card
function displayAccountOwner(user) {
  if (!user) return;
  
  const accountOwnerCard = document.getElementById('account-owner-card');
  
  accountOwnerCard.innerHTML = `
    <div class="member-avatar" style="background-color: ${user.color || '#4285F4'}">
      <img src="${user.imageUrl}" alt="${user.name}">
    </div>
    <div class="member-info">
      <h4>${user.name}</h4>
      <div class="member-email">${user.email}</div>
      <div class="member-role">Account Owner</div>
    </div>
    <div class="member-actions">
      <button class="btn btn-outline edit-profile-btn">
        <i class="material-icons">edit</i>
        <span>Edit Profile</span>
      </button>
    </div>
  `;
  
  // Add event listener to edit button
  accountOwnerCard.querySelector('.edit-profile-btn').addEventListener('click', showProfileModal);
}

// Display family members grid
function displayFamilyMembers(familyMembers) {
  const familyGrid = document.getElementById('family-members-grid');
  
  if (!familyMembers || familyMembers.length === 0) {
    familyGrid.innerHTML = `
      <div class="placeholder-message">
        <i class="material-icons">people_outline</i>
        <p>No family members added yet</p>
      </div>
    `;
    return;
  }
  
  familyGrid.innerHTML = '';
  
  // Add each family member
  familyMembers.forEach(member => {
    const memberCard = document.createElement('div');
    memberCard.className = 'family-member-card';
    memberCard.dataset.memberId = member.id;
    
    // Create initials for avatar
    const initials = member.name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
    
    memberCard.innerHTML = `
      <div class="member-avatar" style="background-color: ${member.color || '#4285F4'}">
        ${initials}
      </div>
      <div class="member-info">
        <h4>${member.name}</h4>
        <div class="member-role">${capitalizeFirstLetter(member.role || 'Member')}</div>
        <div class="member-status">
          ${getMemberActivityStatus(member)}
        </div>
      </div>
      <div class="member-actions">
        <button class="btn btn-icon edit-member-btn" data-member-id="${member.id}">
          <i class="material-icons">edit</i>
        </button>
        <button class="btn btn-icon delete-member-btn" data-member-id="${member.id}">
          <i class="material-icons">delete</i>
        </button>
      </div>
    `;
    
    familyGrid.appendChild(memberCard);
  });
  
  // Add event listeners
  familyGrid.querySelectorAll('.edit-member-btn').forEach(button => {
    button.addEventListener('click', handleEditFamilyMemberClick);
  });
  
  familyGrid.querySelectorAll('.delete-member-btn').forEach(button => {
    button.addEventListener('click', handleDeleteFamilyMemberClick);
  });
}

// Show add family member modal
function showAddFamilyMemberModal() {
  const content = `
    <form id="add-family-member-form" class="family-form">
      <div class="form-group">
        <label for="member-name">Name *</label>
        <input type="text" id="member-name" required placeholder="Enter family member name">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="member-role">Role</label>
          <select id="member-role">
            <option value="adult">Adult</option>
            <option value="child">Child</option>
            <option value="teen">Teen</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-color">Color</label>
          <input type="color" id="member-color" value="#EA4335">
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-birthdate">Birth Date</label>
        <input type="date" id="member-birthdate">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="member-access-level">Access Level</label>
          <select id="member-access-level">
            <option value="full">Full Access</option>
            <option value="limited">Limited Access</option>
            <option value="restricted">Restricted Access</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-pin">PIN Code (for login)</label>
          <input type="text" id="member-pin" placeholder="Optional 4-digit PIN" pattern="[0-9]{4}" maxlength="4">
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-notes">Notes</label>
        <textarea id="member-notes" rows="2" placeholder="Optional notes about this family member"></textarea>
      </div>
    </form>
  `;
  
  showModal('Add Family Member', content, handleAddFamilyMember);
}

// Handle adding a family member
async function handleAddFamilyMember() {
  const form = document.getElementById('add-family-member-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    const color = document.getElementById('member-color').value;
    const birthdate = document.getElementById('member-birthdate').value;
    const accessLevel = document.getElementById('member-access-level').value;
    const pin = document.getElementById('member-pin').value;
    const notes = document.getElementById('member-notes').value;
    
    // Create family member object
    const member = {
      id: 'member_' + Date.now(),
      userId: appState.currentUser.id, // Associate with current user
      name: name,
      role: role,
      color: color,
      birthdate: birthdate || null,
      accessLevel: accessLevel,
      pin: pin || null,
      notes: notes,
      createdAt: new Date().toISOString(),
      lastActivity: null
    };
    
    // Save to database
    await addFamilyMember(member);
    
    showNotification('Family member added successfully', 'success');
    
    // Refresh family members
    await refreshFamilyMembers();
    
  } catch (error) {
    console.error('Error adding family member:', error);
    showNotification('Failed to add family member', 'error');
  }
}

// Handle editing a family member
function handleEditFamilyMemberClick(event) {
  const memberId = event.currentTarget.dataset.memberId;
  
  // Get family member from database
  getFamilyMemberById(memberId).then(member => {
    if (!member) {
      showNotification('Family member not found', 'error');
      return;
    }
    
    showEditFamilyMemberModal(member);
  }).catch(error => {
    console.error('Error loading family member for edit:', error);
    showNotification('Failed to load family member', 'error');
  });
}

// Show edit family member modal
function showEditFamilyMemberModal(member) {
  const content = `
    <form id="edit-family-member-form" class="family-form" data-member-id="${member.id}">
      <div class="form-group">
        <label for="member-name">Name *</label>
        <input type="text" id="member-name" required placeholder="Enter family member name" value="${member.name}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="member-role">Role</label>
          <select id="member-role">
            <option value="adult" ${member.role === 'adult' ? 'selected' : ''}>Adult</option>
            <option value="child" ${member.role === 'child' ? 'selected' : ''}>Child</option>
            <option value="teen" ${member.role === 'teen' ? 'selected' : ''}>Teen</option>
            <option value="other" ${member.role === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-color">Color</label>
          <input type="color" id="member-color" value="${member.color || '#EA4335'}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-birthdate">Birth Date</label>
        <input type="date" id="member-birthdate" value="${member.birthdate || ''}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="member-access-level">Access Level</label>
          <select id="member-access-level">
            <option value="full" ${member.accessLevel === 'full' ? 'selected' : ''}>Full Access</option>
            <option value="limited" ${member.accessLevel === 'limited' ? 'selected' : ''}>Limited Access</option>
            <option value="restricted" ${member.accessLevel === 'restricted' ? 'selected' : ''}>Restricted Access</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-pin">PIN Code (for login)</label>
          <input type="text" id="member-pin" placeholder="Optional 4-digit PIN" pattern="[0-9]{4}" maxlength="4" value="${member.pin || ''}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-notes">Notes</label>
        <textarea id="member-notes" rows="2" placeholder="Optional notes about this family member">${member.notes || ''}</textarea>
      </div>
    </form>
  `;
  
  showModal('Edit Family Member', content, () => handleUpdateFamilyMember(member));
}

// Handle updating a family member
async function handleUpdateFamilyMember(originalMember) {
  const form = document.getElementById('edit-family-member-form');
  
  // Basic validation
  if (!form.checkValidity()) {
    showNotification('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    const memberId = form.dataset.memberId;
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    const color = document.getElementById('member-color').value;
    const birthdate = document.getElementById('member-birthdate').value;
    const accessLevel = document.getElementById('member-access-level').value;
    const pin = document.getElementById('member-pin').value;
    const notes = document.getElementById('member-notes').value;
    
    // Create updated member object
    const updatedMember = {
      ...originalMember,
      name: name,
      role: role,
      color: color,
      birthdate: birthdate || null,
      accessLevel: accessLevel,
      pin: pin || null,
      notes: notes,
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await updateFamilyMember(updatedMember);
    
    showNotification('Family member updated successfully', 'success');
    
    // Refresh family members
    await refreshFamilyMembers();
    
  } catch (error) {
    console.error('Error updating family member:', error);
    showNotification('Failed to update family member', 'error');
  }
}

// Handle deleting a family member
function handleDeleteFamilyMemberClick(event) {
  const memberId = event.currentTarget.dataset.memberId;
  
  // Show confirmation dialog
  const confirmContent = `
    <div class="confirmation-dialog">
      <p>Are you sure you want to delete this family member?</p>
      <p>This will also remove their assigned tasks and events.</p>
      <p>This action cannot be undone.</p>
    </div>
  `;
  
  showModal('Delete Family Member', confirmContent, () => confirmDeleteFamilyMember(memberId));
}

// Confirm family member deletion
async function confirmDeleteFamilyMember(memberId) {
  try {
    // Check for assigned tasks
    const tasks = await getTasksByAssignee(memberId);
    
    // Delete family member
    await deleteFamilyMember(memberId);
    
    // Update any tasks assigned to this member
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        task.assigneeId = null;
        task.updatedAt = new Date().toISOString();
        await updateTask(task);
      }
      
      showNotification(`Updated ${tasks.length} assigned tasks`, 'info');
    }
    
    showNotification('Family member deleted successfully', 'success');
    
    // Refresh family members
    await refreshFamilyMembers();
    
  } catch (error) {
    console.error('Error deleting family member:', error);
    showNotification('Failed to delete family member', 'error');
  }
}

// Update family settings
function updateFamilySettings(event) {
  const toggle = event.target;
  const settingId = toggle.id;
  const isEnabled = toggle.checked;
  
  // Save the setting
  saveSettingValue(settingId, isEnabled);
  
  // Show notification
  const settingName = toggle.parentElement.previousElementSibling.textContent;
  showNotification(`${settingName} ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
}

// Save a setting value
async function saveSettingValue(settingId, value) {
  try {
    // Get current settings
    let settings = await getSettings() || {};
    
    // Create familySettings if it doesn't exist
    if (!settings.familySettings) {
      settings.familySettings = {};
    }
    
    // Update the setting
    settings.familySettings[settingId] = value;
    
    // Save settings
    await saveSettings(settings);
    
  } catch (error) {
    console.error('Error saving setting:', error);
  }
}

// Get member activity status text
function getMemberActivityStatus(member) {
  if (!member.lastActivity) {
    return 'Never logged in';
  }
  
  const lastActivity = new Date(member.lastActivity);
  const now = new Date();
  const diffMs = now - lastActivity;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) {
    return diffMins <= 5 ? 'Online now' : `Active ${diffMins} mins ago`;
  } else if (diffHours < 24) {
    return `Active ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}