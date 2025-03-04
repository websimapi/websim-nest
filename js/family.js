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
      ${user.imageUrl ? `<img src="${user.imageUrl}" alt="${user.name}">` : user.name.charAt(0).toUpperCase()}
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
        <button id="add-first-member-btn" class="btn btn-primary">
          <i class="material-icons">person_add</i>
          <span>Add Your First Family Member</span>
        </button>
      </div>
    `;
    
    // Add event listener to the add first member button
    document.getElementById('add-first-member-btn')?.addEventListener('click', showAddFamilyMemberModal);
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
    
    // Format birthdate if available
    let birthdateDisplay = '';
    if (member.birthdate) {
      const birthdate = new Date(member.birthdate);
      const options = { month: 'long', day: 'numeric' };
      const formattedDate = birthdate.toLocaleDateString(undefined, options);
      
      // Calculate age
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const m = today.getMonth() - birthdate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      
      birthdateDisplay = `
        <div class="member-birthdate">
          <i class="material-icons">cake</i>
          <span>${formattedDate} (${age} years old)</span>
        </div>
      `;
    }
    
    memberCard.innerHTML = `
      <div class="member-avatar" style="background-color: ${member.color || '#4285F4'}">
        ${initials}
      </div>
      <div class="member-info">
        <h4>${member.name}</h4>
        <div class="member-role">${capitalizeFirstLetter(member.role || 'Member')}</div>
        ${birthdateDisplay}
        <div class="member-access-level">
          <i class="material-icons">${getAccessLevelIcon(member.accessLevel)}</i>
          <span>${capitalizeFirstLetter(member.accessLevel || 'Limited')} Access</span>
        </div>
        <div class="member-status">
          ${getMemberActivityStatus(member)}
        </div>
        ${member.notes ? `<div class="member-notes">"${member.notes}"</div>` : ''}
      </div>
      <div class="member-actions">
        <button class="btn btn-primary switch-to-member-btn" data-member-id="${member.id}" title="Switch to this account">
          <i class="material-icons">switch_account</i>
          <span>Switch to</span>
        </button>
        <button class="btn btn-icon view-member-btn" data-member-id="${member.id}" title="View details">
          <i class="material-icons">visibility</i>
        </button>
        <button class="btn btn-icon edit-member-btn" data-member-id="${member.id}" title="Edit member">
          <i class="material-icons">edit</i>
        </button>
        <button class="btn btn-icon delete-member-btn" data-member-id="${member.id}" title="Delete member">
          <i class="material-icons">delete</i>
        </button>
      </div>
    `;
    
    familyGrid.appendChild(memberCard);
  });
  
  // Add event listeners
  familyGrid.querySelectorAll('.view-member-btn').forEach(button => {
    button.addEventListener('click', handleViewFamilyMemberClick);
  });
  
  familyGrid.querySelectorAll('.edit-member-btn').forEach(button => {
    button.addEventListener('click', handleEditFamilyMemberClick);
  });
  
  familyGrid.querySelectorAll('.delete-member-btn').forEach(button => {
    button.addEventListener('click', handleDeleteFamilyMemberClick);
  });
  
  // Add event listener for switch-to-member buttons
  familyGrid.querySelectorAll('.switch-to-member-btn').forEach(button => {
    button.addEventListener('click', handleSwitchToMember);
  });
}

// Get icon for access level
function getAccessLevelIcon(accessLevel) {
  switch (accessLevel) {
    case 'full': return 'security';
    case 'limited': return 'partial_security';
    case 'restricted': return 'shield';
    default: return 'shield';
  }
}

// Handle viewing a family member
function handleViewFamilyMemberClick(event) {
  const memberId = event.currentTarget.dataset.memberId;
  
  // Get family member from database
  getFamilyMemberById(memberId).then(member => {
    if (!member) {
      showNotification('Family member not found', 'error');
      return;
    }
    
    showMemberDetailsModal(member);
  }).catch(error => {
    console.error('Error loading family member details:', error);
    showNotification('Failed to load family member details', 'error');
  });
}

// Show member details modal
function showMemberDetailsModal(member) {
  // Format birthdate if available
  let birthdateSection = '';
  if (member.birthdate) {
    const birthdate = new Date(member.birthdate);
    const formattedDate = birthdate.toLocaleDateString(undefined, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    
    birthdateSection = `
      <div class="info-item">
        <i class="material-icons">cake</i>
        <span>Born: ${formattedDate} (${age} years old)</span>
      </div>
    `;
  }
  
  // Format created date
  let createdSection = '';
  if (member.createdAt) {
    const createdDate = new Date(member.createdAt);
    const formattedDate = createdDate.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    createdSection = `
      <div class="info-item">
        <i class="material-icons">event_available</i>
        <span>Added to family: ${formattedDate}</span>
      </div>
    `;
  }
  
  // Format PIN display
  let pinDisplay = member.pin ? '•'.repeat(member.pin.length) : 'Not set';
  
  // Create initials for avatar
  const initials = member.name.split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  // Build HTML content
  const content = `
    <div class="member-details">
      <div class="member-header" style="background-color: ${member.color || '#4285F4'}10; border-left: 4px solid ${member.color || '#4285F4'}">
        <div class="large-avatar" style="background-color: ${member.color || '#4285F4'}">
          ${initials}
        </div>
        <h3>${member.name}</h3>
        <div class="member-role">${capitalizeFirstLetter(member.role || 'Member')}</div>
      </div>
      
      <div class="member-info-details">
        ${birthdateSection}
        
        <div class="info-item">
          <i class="material-icons">${getAccessLevelIcon(member.accessLevel)}</i>
          <span>Access Level: ${capitalizeFirstLetter(member.accessLevel || 'Limited')}</span>
        </div>
        
        <div class="info-item">
          <i class="material-icons">pin</i>
          <span>PIN Code: ${pinDisplay}</span>
        </div>
        
        <div class="info-item">
          <i class="material-icons">schedule</i>
          <span>Activity Status: ${getMemberActivityStatus(member)}</span>
        </div>
        
        ${createdSection}
        
        ${member.notes ? `
          <div class="info-item notes">
            <i class="material-icons">note</i>
            <div>
              <div class="label">Notes:</div>
              <p>${member.notes}</p>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="activity-section">
        <h4>Recent Activity</h4>
        <div class="activity-list">
          <div class="activity-item">
            <i class="material-icons">info</i>
            <span>Activity tracking is coming soon</span>
          </div>
        </div>
      </div>
      
      <div class="member-actions">
        <button id="edit-member" class="btn btn-outline">
          <i class="material-icons">edit</i>
          <span>Edit</span>
        </button>
        <button id="delete-member" class="btn btn-outline danger">
          <i class="material-icons">delete</i>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;
  
  showModal(`Family Member: ${member.name}`, content);
  
  // Add event listeners to buttons
  document.getElementById('edit-member').addEventListener('click', () => {
    closeModal();
    showEditFamilyMemberModal(member);
  });
  
  document.getElementById('delete-member').addEventListener('click', () => {
    closeModal();
    const confirmContent = `
      <div class="confirmation-dialog">
        <p>Are you sure you want to delete ${member.name} from your family?</p>
        <p>This will also remove their assigned tasks and events.</p>
        <p>This action cannot be undone.</p>
      </div>
    `;
    
    showModal('Delete Family Member', confirmContent, () => confirmDeleteFamilyMember(member.id));
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
            <option value="parent">Parent</option>
            <option value="grandparent">Grandparent</option>
            <option value="pet">Pet</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-color">Color</label>
          <input type="color" id="member-color" value="${getRandomMemberColor()}">
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
            <option value="limited" selected>Limited Access</option>
            <option value="restricted">Restricted Access</option>
          </select>
          <div class="help-text">
            <span><i class="material-icons small">info</i> Determines what this person can view and edit in the app</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="member-pin">PIN Code (for login)</label>
          <input type="text" id="member-pin" placeholder="Optional 4-digit PIN" pattern="[0-9]{4}" maxlength="4">
          <div class="help-text">
            <span><i class="material-icons small">info</i> For family members to quickly access their account</span>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-notes">Notes</label>
        <textarea id="member-notes" rows="3" placeholder="Optional notes about this family member"></textarea>
      </div>
    </form>
  `;
  
  showModal('Add Family Member', content, handleAddFamilyMember);
}

// Generate a random color for new family members
function getRandomMemberColor() {
  const colors = [
    '#4285F4', '#EA4335', '#FBBC05', '#34A853', 
    '#8E24AA', '#F06292', '#FF7043', '#039BE5', 
    '#0097A7', '#43A047', '#689F38', '#FDD835'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
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
            <option value="parent" ${member.role === 'parent' ? 'selected' : ''}>Parent</option>
            <option value="grandparent" ${member.role === 'grandparent' ? 'selected' : ''}>Grandparent</option>
            <option value="pet" ${member.role === 'pet' ? 'selected' : ''}>Pet</option>
            <option value="other" ${member.role === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="member-color">Color</label>
          <input type="color" id="member-color" value="${member.color || '#4285F4'}">
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
          <div class="help-text">
            <span><i class="material-icons small">info</i> Determines what this person can view and edit in the app</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="member-pin">PIN Code (for login)</label>
          <input type="text" id="member-pin" placeholder="Optional 4-digit PIN" pattern="[0-9]{4}" maxlength="4" value="${member.pin || ''}">
          <div class="help-text">
            <span><i class="material-icons small">info</i> For family members to quickly access their account</span>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="member-notes">Notes</label>
        <textarea id="member-notes" rows="3" placeholder="Optional notes about this family member">${member.notes || ''}</textarea>
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
    return '<span class="status-indicator offline"></span> Never logged in';
  }
  
  const lastActivity = new Date(member.lastActivity);
  const now = new Date();
  const diffMs = now - lastActivity;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) {
    return diffMins <= 5 
      ? '<span class="status-indicator online"></span> Online now' 
      : `<span class="status-indicator away"></span> Active ${diffMins} mins ago`;
  } else if (diffHours < 24) {
    return `<span class="status-indicator offline"></span> Active ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `<span class="status-indicator offline"></span> Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Handle switching to a family member's account view
function handleSwitchToMember(event) {
  const memberId = event.currentTarget.dataset.memberId;
  
  // Get family member from database
  getFamilyMemberById(memberId).then(member => {
    if (!member) {
      showNotification('Family member not found', 'error');
      return;
    }
    
    // Switch to the member's view
    switchToFamilyMember(member);
  }).catch(error => {
    console.error('Error switching to family member:', error);
    showNotification('Failed to switch accounts', 'error');
  });
}

// Switch the app view to a family member's account
function switchToFamilyMember(member) {
  // Store the original user for switching back
  if (!appState.originalUser) {
    appState.originalUser = appState.currentUser;
  }
  
  // Set the active family member
  appState.activeFamilyMember = member;
  
  // Update the UI to show we're in a family member's view
  updateActiveMemberUI(member);
  
  // Reload the current view with the member's context
  loadViewData(appState.currentView);
  
  showNotification(`Switched to ${member.name}'s account`, 'success');
}

// Update UI to show we're viewing as a family member
function updateActiveMemberUI(member) {
  // Update user name display
  document.getElementById('user-name').textContent = `${member.name} (View)`;
  
  // Update user avatar with member color
  const avatar = document.getElementById('user-avatar');
  const initials = member.name.split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  // Create canvas for the avatar
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = member.color || '#4285F4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
  
  // Set the avatar
  avatar.src = canvas.toDataURL('image/png');
  
  // Add "return to owner" button to dropdown
  const dropdown = document.querySelector('.dropdown-content');
  
  // Check if we already have the button
  if (!document.getElementById('return-to-owner')) {
    const returnLink = document.createElement('a');
    returnLink.href = '#';
    returnLink.id = 'return-to-owner';
    returnLink.textContent = 'Return to Owner Account';
    returnLink.addEventListener('click', returnToOwnerAccount);
    dropdown.insertBefore(returnLink, dropdown.firstChild);
  }
}

// Return to the owner's account
function returnToOwnerAccount(event) {
  if (event) event.preventDefault();
  
  if (appState.originalUser) {
    // Restore original user
    appState.currentUser = appState.originalUser;
    appState.originalUser = null;
    appState.activeFamilyMember = null;
    
    // Update UI
    document.getElementById('user-name').textContent = appState.currentUser.name;
    document.getElementById('user-avatar').src = generateInitialsAvatar(appState.currentUser.name);
    
    // Remove "return to owner" button
    const returnLink = document.getElementById('return-to-owner');
    if (returnLink) {
      returnLink.remove();
    }
    
    // Reload the current view
    loadViewData(appState.currentView);
    
    showNotification('Returned to owner account', 'success');
  }
}