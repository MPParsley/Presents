/**
 * Gift Name Shuffler - Main Application Logic
 *
 * This file handles:
 * - Data persistence via localStorage
 * - CRUD operations for persons, groups, occasions
 * - The shuffler algorithm with business rules
 * - UI rendering and interactions
 */

// ===========================================
// DATA STORAGE KEYS
// ===========================================
const STORAGE_KEYS = {
    PERSONS: 'giftApp.persons',
    GROUPS: 'giftApp.groups',
    OCCASIONS: 'giftApp.occasions',
    EDITIONS: 'giftApp.editions'
};

// ===========================================
// DATA STRUCTURES
// Each entity has a unique ID (generated via Date.now() + random)
// ===========================================

/**
 * Generate a unique ID for entities
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Load data from localStorage, or return empty array if not present
 */
function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

/**
 * Save data to localStorage
 */
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ===========================================
// PERSONS MANAGEMENT
// ===========================================

/**
 * Get all persons
 */
function getPersons() {
    return loadData(STORAGE_KEYS.PERSONS);
}

/**
 * Add a new person (optionally to a group)
 */
function addPerson() {
    const nameInput = document.getElementById('person-name');
    const groupSelect = document.getElementById('person-group');
    const name = nameInput.value.trim();
    const groupId = groupSelect.value;

    if (!name) {
        alert('Please enter a person name.');
        return;
    }

    const persons = getPersons();

    // Check for duplicate names
    if (persons.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('A person with this name already exists.');
        return;
    }

    const personId = generateId();
    persons.push({
        id: personId,
        name: name
    });

    saveData(STORAGE_KEYS.PERSONS, persons);

    // If a group was selected, add the person to that group
    if (groupId) {
        const groups = getGroups();
        const group = groups.find(g => g.id === groupId);
        if (group) {
            group.memberIds.push(personId);
            saveData(STORAGE_KEYS.GROUPS, groups);
        }
    }

    nameInput.value = '';
    renderPersons();
    renderGroupsUI();
    updatePersonGroupDropdown();
}

/**
 * Delete a person
 */
function deletePerson(id) {
    if (!confirm('Are you sure you want to delete this person? They will also be removed from all groups.')) {
        return;
    }

    // Remove person from persons list
    let persons = getPersons();
    persons = persons.filter(p => p.id !== id);
    saveData(STORAGE_KEYS.PERSONS, persons);

    // Remove person from all groups
    let groups = getGroups();
    groups.forEach(g => {
        g.memberIds = g.memberIds.filter(mId => mId !== id);
    });
    saveData(STORAGE_KEYS.GROUPS, groups);

    renderPersons();
    renderGroupsUI();
}

/**
 * Render the persons list in the UI
 */
function renderPersons() {
    const list = document.getElementById('persons-list');
    const persons = getPersons();
    const groups = getGroups();

    if (persons.length === 0) {
        list.innerHTML = '<li><em>No persons added yet.</em></li>';
        return;
    }

    // Sort persons alphabetically
    const sortedPersons = [...persons].sort((a, b) => a.name.localeCompare(b.name));

    // Find which group each person belongs to
    const personGroupMap = {};
    groups.forEach(g => {
        g.memberIds.forEach(pId => {
            personGroupMap[pId] = g;
        });
    });

    list.innerHTML = sortedPersons.map(p => {
        const group = personGroupMap[p.id];
        const groupName = group ? group.name : 'No group';
        return `
            <li id="person-item-${p.id}">
                <span class="item-name">${escapeHtml(p.name)} <small class="group-tag">(${escapeHtml(groupName)})</small></span>
                <span class="item-buttons">
                    <button class="small-btn" onclick="editPerson('${p.id}')">Edit</button>
                    <button class="small-btn danger-btn" onclick="deletePerson('${p.id}')">Delete</button>
                </span>
            </li>
        `;
    }).join('');
}

/**
 * Show edit form for a person
 */
function editPerson(id) {
    const persons = getPersons();
    const person = persons.find(p => p.id === id);
    if (!person) return;

    const groups = getGroups();
    const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

    // Find current group
    let currentGroupId = '';
    groups.forEach(g => {
        if (g.memberIds.includes(id)) {
            currentGroupId = g.id;
        }
    });

    const li = document.getElementById(`person-item-${id}`);
    li.innerHTML = `
        <div class="edit-form">
            <input type="text" id="edit-name-${id}" value="${escapeHtml(person.name)}" placeholder="Name">
            <select id="edit-group-${id}">
                <option value="">-- No group --</option>
                ${sortedGroups.map(g => `<option value="${g.id}" ${g.id === currentGroupId ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
            </select>
            <button class="small-btn primary-btn" onclick="savePersonEdit('${id}')">Save</button>
            <button class="small-btn" onclick="renderPersons()">Cancel</button>
        </div>
    `;
}

/**
 * Save person edit
 */
function savePersonEdit(id) {
    const nameInput = document.getElementById(`edit-name-${id}`);
    const groupSelect = document.getElementById(`edit-group-${id}`);
    const newName = nameInput.value.trim();
    const newGroupId = groupSelect.value;

    if (!newName) {
        alert('Please enter a name.');
        return;
    }

    const persons = getPersons();
    const person = persons.find(p => p.id === id);
    if (!person) return;

    // Check for duplicate names (excluding current person)
    if (persons.some(p => p.id !== id && p.name.toLowerCase() === newName.toLowerCase())) {
        alert('A person with this name already exists.');
        return;
    }

    // Update name
    person.name = newName;
    saveData(STORAGE_KEYS.PERSONS, persons);

    // Update group membership
    const groups = getGroups();

    // Remove from all groups first
    groups.forEach(g => {
        g.memberIds = g.memberIds.filter(mId => mId !== id);
    });

    // Add to new group if selected
    if (newGroupId) {
        const newGroup = groups.find(g => g.id === newGroupId);
        if (newGroup) {
            newGroup.memberIds.push(id);
        }
    }

    saveData(STORAGE_KEYS.GROUPS, groups);

    renderPersons();
    renderGroupsUI();
}

// ===========================================
// GROUPS MANAGEMENT
// ===========================================

/**
 * Get all groups
 */
function getGroups() {
    return loadData(STORAGE_KEYS.GROUPS);
}

/**
 * Add a new group
 */
function addGroup() {
    const nameInput = document.getElementById('group-name');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a group name.');
        return;
    }

    const groups = getGroups();

    // Check for duplicate names
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        alert('A group with this name already exists.');
        return;
    }

    groups.push({
        id: generateId(),
        name: name,
        memberIds: []  // Array of person IDs
    });

    saveData(STORAGE_KEYS.GROUPS, groups);
    nameInput.value = '';
    renderGroupsUI();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
}

/**
 * Delete a group
 */
function deleteGroup(id) {
    if (!confirm('Are you sure you want to delete this group? All editions for this group will also be deleted.')) {
        return;
    }

    // Remove group
    let groups = getGroups();
    groups = groups.filter(g => g.id !== id);
    saveData(STORAGE_KEYS.GROUPS, groups);

    // Remove editions for this group
    let editions = getEditions();
    editions = editions.filter(e => e.groupId !== id);
    saveData(STORAGE_KEYS.EDITIONS, editions);

    renderGroupsUI();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
    updateEditionsList();
}

/**
 * Add a member to a group
 */
function addMemberToGroup(groupId) {
    const select = document.getElementById(`add-member-${groupId}`);
    const personId = select.value;

    if (!personId) {
        alert('Please select a person to add.');
        return;
    }

    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return;

    // Check if already a member
    if (group.memberIds.includes(personId)) {
        alert('This person is already a member of this group.');
        return;
    }

    group.memberIds.push(personId);
    saveData(STORAGE_KEYS.GROUPS, groups);
    renderGroupsUI();
}

/**
 * Remove a member from a group
 */
function removeMemberFromGroup(groupId, personId) {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return;

    group.memberIds = group.memberIds.filter(id => id !== personId);
    saveData(STORAGE_KEYS.GROUPS, groups);
    renderGroupsUI();
}

/**
 * Render the groups UI with members
 */
function renderGroupsUI() {
    const container = document.getElementById('groups-container');
    const groups = getGroups();
    const persons = getPersons();

    if (groups.length === 0) {
        container.innerHTML = '<p><em>No groups created yet.</em></p>';
        return;
    }

    // Collect all person IDs that are already in ANY group
    const allAssignedPersonIds = new Set();
    groups.forEach(g => {
        g.memberIds.forEach(id => allAssignedPersonIds.add(id));
    });

    // Get persons not in ANY group (sorted alphabetically)
    const unassignedPersons = persons
        .filter(p => !allAssignedPersonIds.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Sort groups alphabetically
    const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = sortedGroups.map(group => {
        // Get members of this group (sorted alphabetically)
        const members = group.memberIds
            .map(id => persons.find(p => p.id === id))
            .filter(p => p) // Filter out any deleted persons
            .sort((a, b) => a.name.localeCompare(b.name));

        const membersHtml = members.length === 0
            ? '<li><em>No members yet.</em></li>'
            : members.map(m => `
                <li>
                    <span class="item-name">${escapeHtml(m.name)}</span>
                    <button class="small-btn danger-btn" onclick="removeMemberFromGroup('${group.id}', '${m.id}')">Remove</button>
                </li>
            `).join('');

        const addMemberHtml = unassignedPersons.length === 0
            ? '<em>All persons are assigned to a group.</em>'
            : `
                <select id="add-member-${group.id}">
                    <option value="">-- Select Person --</option>
                    ${unassignedPersons.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                </select>
                <button class="small-btn" onclick="addMemberToGroup('${group.id}')">Add Member</button>
            `;

        return `
            <div class="group-card">
                <h4>
                    <span>${escapeHtml(group.name)}</span>
                    <button class="small-btn danger-btn" onclick="deleteGroup('${group.id}')">Delete Group</button>
                </h4>
                <strong>Members (${members.length}):</strong>
                <ul class="members-list">${membersHtml}</ul>
                <div class="add-member-row">${addMemberHtml}</div>
            </div>
        `;
    }).join('');
}

// ===========================================
// OCCASIONS MANAGEMENT
// ===========================================

/**
 * Get all occasions
 */
function getOccasions() {
    return loadData(STORAGE_KEYS.OCCASIONS);
}

/**
 * Add a new occasion
 */
function addOccasion() {
    const nameInput = document.getElementById('occasion-name');
    const dateInput = document.getElementById('occasion-date');
    const name = nameInput.value.trim();
    const date = dateInput.value.trim();

    if (!name) {
        alert('Please enter an occasion name.');
        return;
    }

    const occasions = getOccasions();

    occasions.push({
        id: generateId(),
        name: name,
        date: date || null
    });

    saveData(STORAGE_KEYS.OCCASIONS, occasions);
    nameInput.value = '';
    dateInput.value = '';
    renderOccasions();
    updateSelectDropdowns();
}

/**
 * Delete an occasion
 */
function deleteOccasion(id) {
    if (!confirm('Are you sure you want to delete this occasion? All editions for this occasion will also be deleted.')) {
        return;
    }

    // Remove occasion
    let occasions = getOccasions();
    occasions = occasions.filter(o => o.id !== id);
    saveData(STORAGE_KEYS.OCCASIONS, occasions);

    // Remove editions for this occasion
    let editions = getEditions();
    editions = editions.filter(e => e.occasionId !== id);
    saveData(STORAGE_KEYS.EDITIONS, editions);

    renderOccasions();
    updateSelectDropdowns();
    updateEditionsList();
}

/**
 * Render the occasions list
 */
function renderOccasions() {
    const list = document.getElementById('occasions-list');
    const occasions = getOccasions();

    if (occasions.length === 0) {
        list.innerHTML = '<li><em>No occasions added yet.</em></li>';
        return;
    }

    // Sort occasions alphabetically
    const sortedOccasions = [...occasions].sort((a, b) => a.name.localeCompare(b.name));

    list.innerHTML = sortedOccasions.map(o => `
        <li id="occasion-item-${o.id}">
            <span class="item-name">${escapeHtml(o.name)}${o.date ? ` (${escapeHtml(o.date)})` : ''}</span>
            <span class="item-buttons">
                <button class="small-btn" onclick="editOccasion('${o.id}')">Edit</button>
                <button class="small-btn danger-btn" onclick="deleteOccasion('${o.id}')">Delete</button>
            </span>
        </li>
    `).join('');
}

/**
 * Show edit form for an occasion
 */
function editOccasion(id) {
    const occasions = getOccasions();
    const occasion = occasions.find(o => o.id === id);
    if (!occasion) return;

    const li = document.getElementById(`occasion-item-${id}`);
    li.innerHTML = `
        <div class="edit-form">
            <input type="text" id="edit-occasion-name-${id}" value="${escapeHtml(occasion.name)}" placeholder="Name">
            <input type="date" id="edit-occasion-date-${id}" value="${occasion.date || ''}">
            <button class="small-btn primary-btn" onclick="saveOccasionEdit('${id}')">Save</button>
            <button class="small-btn" onclick="renderOccasions()">Cancel</button>
        </div>
    `;
}

/**
 * Save occasion edit
 */
function saveOccasionEdit(id) {
    const nameInput = document.getElementById(`edit-occasion-name-${id}`);
    const dateInput = document.getElementById(`edit-occasion-date-${id}`);
    const newName = nameInput.value.trim();
    const newDate = dateInput.value.trim();

    if (!newName) {
        alert('Please enter a name.');
        return;
    }

    const occasions = getOccasions();
    const occasion = occasions.find(o => o.id === id);
    if (!occasion) return;

    // Update occasion
    occasion.name = newName;
    occasion.date = newDate || null;
    saveData(STORAGE_KEYS.OCCASIONS, occasions);

    renderOccasions();
    updateSelectDropdowns();
}

// ===========================================
// EDITIONS MANAGEMENT
// ===========================================

/**
 * Get all editions
 */
function getEditions() {
    return loadData(STORAGE_KEYS.EDITIONS);
}

/**
 * Get editions for a specific group and occasion
 */
function getEditionsForGroupAndOccasion(groupId, occasionId) {
    const editions = getEditions();
    return editions
        .filter(e => e.groupId === groupId && e.occasionId === occasionId)
        .sort((a, b) => a.createdAt - b.createdAt); // Sort by creation time
}

/**
 * Update the editions dropdown based on selected group and occasion
 */
function updateEditionsList() {
    const groupId = document.getElementById('select-group').value;
    const occasionId = document.getElementById('select-occasion').value;
    const editionSelect = document.getElementById('select-edition');

    // Clear current assignments display
    document.getElementById('assignments-list').innerHTML = '';

    if (!groupId || !occasionId) {
        editionSelect.innerHTML = '<option value="">-- Select Edition --</option>';
        return;
    }

    const editions = getEditionsForGroupAndOccasion(groupId, occasionId);

    if (editions.length === 0) {
        editionSelect.innerHTML = '<option value="">-- No editions yet --</option>';
        return;
    }

    editionSelect.innerHTML = '<option value="">-- Select Edition --</option>' +
        editions.map((e, idx) => {
            const isLatest = idx === editions.length - 1;
            const date = new Date(e.createdAt).toLocaleDateString();
            return `<option value="${e.id}">Edition ${idx + 1} (${date})${isLatest ? ' [Latest]' : ''}</option>`;
        }).join('');
}

/**
 * Show assignments for the selected edition
 */
function showAssignments() {
    const editionId = document.getElementById('select-edition').value;
    const list = document.getElementById('assignments-list');

    if (!editionId) {
        list.innerHTML = '';
        return;
    }

    const editions = getEditions();
    const edition = editions.find(e => e.id === editionId);

    if (!edition) {
        list.innerHTML = '<li><em>Edition not found.</em></li>';
        return;
    }

    const persons = getPersons();

    list.innerHTML = edition.assignments.map(a => {
        const giver = persons.find(p => p.id === a.giverId);
        const recipient = persons.find(p => p.id === a.recipientId);
        const giverName = giver ? giver.name : '[Deleted Person]';
        const recipientName = recipient ? recipient.name : '[Deleted Person]';

        return `
            <li>
                <span>${escapeHtml(giverName)}</span>
                <span class="arrow">buys a gift for</span>
                <span>${escapeHtml(recipientName)}</span>
            </li>
        `;
    }).join('');
}

// ===========================================
// SHUFFLER ALGORITHM
// ===========================================

/**
 * Run the shuffle algorithm to create a new edition
 *
 * Business Rules:
 * 1. Only members of the selected group participate
 * 2. No one can be assigned to themselves
 * 3. No one can be assigned to the same recipient as in any previous edition
 */
function runShuffle() {
    const groupId = document.getElementById('select-group').value;
    const occasionId = document.getElementById('select-occasion').value;

    // Validation
    if (!groupId || !occasionId) {
        alert('Please select both a group and an occasion.');
        return;
    }

    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
        alert('Selected group not found.');
        return;
    }

    const memberIds = group.memberIds;

    if (memberIds.length < 2) {
        alert('The group must have at least 2 members to run a shuffle.');
        return;
    }

    // Get previous assignments for this group + occasion
    const previousEditions = getEditionsForGroupAndOccasion(groupId, occasionId);

    // Build a map of "forbidden" assignments: giverId -> Set of recipientIds they've had before
    const forbidden = {};
    memberIds.forEach(id => {
        forbidden[id] = new Set();
    });

    previousEditions.forEach(edition => {
        edition.assignments.forEach(a => {
            if (forbidden[a.giverId]) {
                forbidden[a.giverId].add(a.recipientId);
            }
        });
    });

    // Try to find a valid assignment using random permutations
    // We'll attempt up to MAX_ATTEMPTS times before giving up
    const MAX_ATTEMPTS = 1000;
    let assignments = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const result = tryCreateAssignment(memberIds, forbidden);
        if (result) {
            assignments = result;
            break;
        }
    }

    if (!assignments) {
        alert(
            'Could not find a valid assignment after many attempts.\n\n' +
            'This can happen if:\n' +
            '- The group is too small\n' +
            '- There have been too many previous editions\n' +
            '- The constraints are impossible to satisfy\n\n' +
            'Try adding more members to the group or using a different occasion.'
        );
        return;
    }

    // Create the edition
    const edition = {
        id: generateId(),
        groupId: groupId,
        occasionId: occasionId,
        createdAt: Date.now(),
        assignments: assignments
    };

    const editions = getEditions();
    editions.push(edition);
    saveData(STORAGE_KEYS.EDITIONS, editions);

    // Update UI
    updateEditionsList();

    // Auto-select the new edition
    document.getElementById('select-edition').value = edition.id;
    showAssignments();

    alert('Shuffle complete! New edition created successfully.');
}

/**
 * Try to create a valid assignment using a random derangement
 *
 * A "derangement" is a permutation where no element appears in its original position.
 * We also need to respect the "forbidden" constraints from previous editions.
 *
 * Algorithm:
 * 1. Shuffle the members list randomly
 * 2. Assign each person to the next person in the shuffled list (circular)
 * 3. Check if all assignments are valid (not self, not forbidden)
 * 4. If valid, return the assignments; otherwise, return null to try again
 *
 * @param {string[]} memberIds - Array of member IDs
 * @param {Object} forbidden - Map of giverId -> Set of forbidden recipientIds
 * @returns {Array|null} Array of {giverId, recipientId} or null if failed
 */
function tryCreateAssignment(memberIds, forbidden) {
    // Create a shuffled copy of memberIds
    const shuffled = [...memberIds];
    shuffleArray(shuffled);

    const assignments = [];

    // Each person gives to the next person in the shuffled array (circular)
    for (let i = 0; i < shuffled.length; i++) {
        const giverId = shuffled[i];
        const recipientId = shuffled[(i + 1) % shuffled.length];

        // Rule 2: Can't give to yourself
        if (giverId === recipientId) {
            return null; // This shouldn't happen with our algorithm, but check anyway
        }

        // Rule 3: Can't give to someone from a previous edition
        if (forbidden[giverId] && forbidden[giverId].has(recipientId)) {
            return null; // Constraint violated, try again
        }

        assignments.push({ giverId, recipientId });
    }

    return assignments;
}

/**
 * Fisher-Yates shuffle algorithm to randomize an array in place
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ===========================================
// SELECT DROPDOWNS
// ===========================================

/**
 * Update the group and occasion select dropdowns
 */
function updateSelectDropdowns() {
    const groupSelect = document.getElementById('select-group');
    const occasionSelect = document.getElementById('select-occasion');

    const groups = getGroups();
    const occasions = getOccasions();

    // Preserve current selections
    const currentGroup = groupSelect.value;
    const currentOccasion = occasionSelect.value;

    // Sort groups alphabetically
    const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

    // Sort occasions alphabetically
    const sortedOccasions = [...occasions].sort((a, b) => a.name.localeCompare(b.name));

    groupSelect.innerHTML = '<option value="">-- Select Group --</option>' +
        sortedGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

    occasionSelect.innerHTML = '<option value="">-- Select Occasion --</option>' +
        sortedOccasions.map(o => `<option value="${o.id}">${escapeHtml(o.name)}${o.date ? ` (${escapeHtml(o.date)})` : ''}</option>`).join('');

    // Restore selections if still valid
    if (groups.some(g => g.id === currentGroup)) {
        groupSelect.value = currentGroup;
    }
    if (occasions.some(o => o.id === currentOccasion)) {
        occasionSelect.value = currentOccasion;
    }
}

/**
 * Update the group dropdown in the "Add Person" form
 */
function updatePersonGroupDropdown() {
    const groupSelect = document.getElementById('person-group');
    const groups = getGroups();

    // Sort groups alphabetically
    const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

    groupSelect.innerHTML = '<option value="">-- No group --</option>' +
        sortedGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
}

// ===========================================
// RESET DATA
// ===========================================

/**
 * Reset all data with confirmation
 */
function resetAllData() {
    if (!confirm('Are you sure you want to delete ALL data?\n\nThis will remove all persons, groups, occasions, and editions.\n\nThis action cannot be undone!')) {
        return;
    }

    // Double confirmation for safety
    if (!confirm('This is your last chance to cancel.\n\nClick OK to permanently delete all data.')) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.PERSONS);
    localStorage.removeItem(STORAGE_KEYS.GROUPS);
    localStorage.removeItem(STORAGE_KEYS.OCCASIONS);
    localStorage.removeItem(STORAGE_KEYS.EDITIONS);

    // Re-render everything
    renderPersons();
    renderGroupsUI();
    renderOccasions();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
    updateEditionsList();

    alert('All data has been reset.');
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initialize the app on page load
 */
function init() {
    renderPersons();
    renderGroupsUI();
    renderOccasions();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
    updateEditionsList();
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
