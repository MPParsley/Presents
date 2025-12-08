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
    EDITIONS: 'giftApp.editions',
    EXCLUSIONS: 'giftApp.exclusions',
    INCLUSIONS: 'giftApp.inclusions'
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
    updateExclusionDropdowns();
    updateInclusionDropdowns();
}

/**
 * Delete a person
 */
function deletePerson(id) {
    if (!confirm('Are you sure you want to delete this person? They will also be removed from all groups, exclusions, and inclusions.')) {
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

    // Remove person from all exclusions
    let exclusions = getExclusions();
    exclusions = exclusions.filter(e => e.person1Id !== id && e.person2Id !== id);
    saveData(STORAGE_KEYS.EXCLUSIONS, exclusions);

    // Remove person from all inclusions
    let inclusions = getInclusions();
    inclusions = inclusions.filter(i => i.giverId !== id && i.recipientId !== id);
    saveData(STORAGE_KEYS.INCLUSIONS, inclusions);

    renderPersons();
    renderGroupsUI();
    renderExclusions();
    renderInclusions();
    updateExclusionDropdowns();
    updateInclusionDropdowns();
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
    renderExclusions();
    renderInclusions();
    updateExclusionDropdowns();
    updateInclusionDropdowns();
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
    if (!confirm('Are you sure you want to delete this group? Members will become unassigned.')) {
        return;
    }

    // Remove group
    let groups = getGroups();
    groups = groups.filter(g => g.id !== id);
    saveData(STORAGE_KEYS.GROUPS, groups);

    renderPersons(); // Update person list to show "No group"
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
                    <span class="item-buttons">
                        <button class="small-btn danger-btn" onclick="removeMemberFromGroup('${group.id}', '${m.id}')">Delete</button>
                    </span>
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
            <div class="group-card" id="group-card-${group.id}">
                <h4>
                    <span id="group-name-${group.id}">${escapeHtml(group.name)}</span>
                    <span class="item-buttons">
                        <button class="small-btn" onclick="editGroup('${group.id}')">Edit</button>
                        <button class="small-btn danger-btn" onclick="deleteGroup('${group.id}')">Delete</button>
                    </span>
                </h4>
                <strong>Members (${members.length}):</strong>
                <ul class="members-list">${membersHtml}</ul>
                <div class="add-member-row">${addMemberHtml}</div>
            </div>
        `;
    }).join('');
}

/**
 * Show edit form for a group name
 */
function editGroup(id) {
    const groups = getGroups();
    const group = groups.find(g => g.id === id);
    if (!group) return;

    const nameSpan = document.getElementById(`group-name-${id}`);
    nameSpan.innerHTML = `
        <input type="text" id="edit-group-name-${id}" value="${escapeHtml(group.name)}" placeholder="Group name" style="width: 150px;">
        <button class="small-btn primary-btn" onclick="saveGroupEdit('${id}')">Save</button>
        <button class="small-btn" onclick="renderGroupsUI()">Cancel</button>
    `;
}

/**
 * Save group name edit
 */
function saveGroupEdit(id) {
    const nameInput = document.getElementById(`edit-group-name-${id}`);
    const newName = nameInput.value.trim();

    if (!newName) {
        alert('Please enter a group name.');
        return;
    }

    const groups = getGroups();
    const group = groups.find(g => g.id === id);
    if (!group) return;

    // Check for duplicate names (excluding current group)
    if (groups.some(g => g.id !== id && g.name.toLowerCase() === newName.toLowerCase())) {
        alert('A group with this name already exists.');
        return;
    }

    // Update name
    group.name = newName;
    saveData(STORAGE_KEYS.GROUPS, groups);

    renderPersons(); // Update group tags in persons list
    renderGroupsUI();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
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
// EXCLUSIONS MANAGEMENT
// ===========================================

/**
 * Get all exclusions
 * Each exclusion is: { id, person1Id, person2Id }
 * Exclusions are bidirectional: person1 cannot give to person2 AND person2 cannot give to person1
 */
function getExclusions() {
    return loadData(STORAGE_KEYS.EXCLUSIONS);
}

/**
 * Add a new exclusion pair
 */
function addExclusion() {
    const person1Select = document.getElementById('exclusion-person1');
    const person2Select = document.getElementById('exclusion-person2');
    const person1Id = person1Select.value;
    const person2Id = person2Select.value;

    if (!person1Id || !person2Id) {
        alert('Please select both persons.');
        return;
    }

    if (person1Id === person2Id) {
        alert('Cannot exclude a person from themselves.');
        return;
    }

    const exclusions = getExclusions();

    // Check if exclusion already exists (in either direction)
    const exists = exclusions.some(e =>
        (e.person1Id === person1Id && e.person2Id === person2Id) ||
        (e.person1Id === person2Id && e.person2Id === person1Id)
    );

    if (exists) {
        alert('This exclusion already exists.');
        return;
    }

    exclusions.push({
        id: generateId(),
        person1Id: person1Id,
        person2Id: person2Id
    });

    saveData(STORAGE_KEYS.EXCLUSIONS, exclusions);
    person1Select.value = '';
    person2Select.value = '';
    renderExclusions();
}

/**
 * Remove an exclusion
 */
function removeExclusion(id) {
    let exclusions = getExclusions();
    exclusions = exclusions.filter(e => e.id !== id);
    saveData(STORAGE_KEYS.EXCLUSIONS, exclusions);
    renderExclusions();
}

/**
 * Render the exclusions list
 */
function renderExclusions() {
    const list = document.getElementById('exclusions-list');
    const exclusions = getExclusions();
    const persons = getPersons();

    if (exclusions.length === 0) {
        list.innerHTML = '<li><em>No exclusions added.</em></li>';
        return;
    }

    list.innerHTML = exclusions.map(e => {
        const person1 = persons.find(p => p.id === e.person1Id);
        const person2 = persons.find(p => p.id === e.person2Id);
        const name1 = person1 ? person1.name : '[Deleted]';
        const name2 = person2 ? person2.name : '[Deleted]';

        return `
            <li>
                <span class="exclusion-text">${escapeHtml(name1)} ↔ ${escapeHtml(name2)}</span>
                <span class="item-buttons">
                    <button class="small-btn danger-btn" onclick="removeExclusion('${e.id}')">Delete</button>
                </span>
            </li>
        `;
    }).join('');
}

/**
 * Update the exclusion person dropdowns
 */
function updateExclusionDropdowns() {
    const select1 = document.getElementById('exclusion-person1');
    const select2 = document.getElementById('exclusion-person2');
    const persons = getPersons();

    // Sort persons alphabetically
    const sortedPersons = [...persons].sort((a, b) => a.name.localeCompare(b.name));

    const options = '<option value="">-- Select Person --</option>' +
        sortedPersons.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    select1.innerHTML = options;
    select2.innerHTML = options;
}

// ===========================================
// INCLUSIONS MANAGEMENT
// ===========================================

/**
 * Get all inclusions
 * Each inclusion is: { id, giverId, recipientId }
 * Inclusions are one-directional: giver MUST give to recipient
 */
function getInclusions() {
    return loadData(STORAGE_KEYS.INCLUSIONS);
}

/**
 * Add a new inclusion (forced assignment)
 */
function addInclusion() {
    const giverSelect = document.getElementById('inclusion-giver');
    const recipientSelect = document.getElementById('inclusion-recipient');
    const giverId = giverSelect.value;
    const recipientId = recipientSelect.value;

    if (!giverId || !recipientId) {
        alert('Please select both giver and recipient.');
        return;
    }

    if (giverId === recipientId) {
        alert('A person cannot give to themselves.');
        return;
    }

    const inclusions = getInclusions();

    // Check if this giver already has a forced assignment
    const giverHasInclusion = inclusions.some(i => i.giverId === giverId);
    if (giverHasInclusion) {
        alert('This person already has a forced assignment. Remove it first to add a new one.');
        return;
    }

    // Check if this recipient already has a forced giver
    const recipientHasInclusion = inclusions.some(i => i.recipientId === recipientId);
    if (recipientHasInclusion) {
        alert('Someone else is already forced to give to this person. Remove it first.');
        return;
    }

    inclusions.push({
        id: generateId(),
        giverId: giverId,
        recipientId: recipientId
    });

    saveData(STORAGE_KEYS.INCLUSIONS, inclusions);
    giverSelect.value = '';
    recipientSelect.value = '';
    renderInclusions();
}

/**
 * Remove an inclusion
 */
function removeInclusion(id) {
    let inclusions = getInclusions();
    inclusions = inclusions.filter(i => i.id !== id);
    saveData(STORAGE_KEYS.INCLUSIONS, inclusions);
    renderInclusions();
}

/**
 * Render the inclusions list
 */
function renderInclusions() {
    const list = document.getElementById('inclusions-list');
    const inclusions = getInclusions();
    const persons = getPersons();

    if (inclusions.length === 0) {
        list.innerHTML = '<li><em>No forced assignments added.</em></li>';
        return;
    }

    list.innerHTML = inclusions.map(i => {
        const giver = persons.find(p => p.id === i.giverId);
        const recipient = persons.find(p => p.id === i.recipientId);
        const giverName = giver ? giver.name : '[Deleted]';
        const recipientName = recipient ? recipient.name : '[Deleted]';

        return `
            <li>
                <span class="inclusion-text">${escapeHtml(giverName)} → ${escapeHtml(recipientName)}</span>
                <span class="item-buttons">
                    <button class="small-btn danger-btn" onclick="removeInclusion('${i.id}')">Delete</button>
                </span>
            </li>
        `;
    }).join('');
}

/**
 * Update the inclusion person dropdowns
 */
function updateInclusionDropdowns() {
    const giverSelect = document.getElementById('inclusion-giver');
    const recipientSelect = document.getElementById('inclusion-recipient');
    const persons = getPersons();

    // Sort persons alphabetically
    const sortedPersons = [...persons].sort((a, b) => a.name.localeCompare(b.name));

    const giverOptions = '<option value="">-- Giver --</option>' +
        sortedPersons.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    const recipientOptions = '<option value="">-- Recipient --</option>' +
        sortedPersons.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    giverSelect.innerHTML = giverOptions;
    recipientSelect.innerHTML = recipientOptions;
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
 * Get editions for a specific occasion
 */
function getEditionsForOccasion(occasionId) {
    const editions = getEditions();
    return editions
        .filter(e => e.occasionId === occasionId)
        .sort((a, b) => a.createdAt - b.createdAt); // Sort by creation time
}

/**
 * Update the editions dropdown based on selected occasion
 */
function updateEditionsList() {
    const occasionId = document.getElementById('select-occasion').value;
    const editionSelect = document.getElementById('select-edition');

    // Clear current assignments display
    document.getElementById('assignments-list').innerHTML = '';

    if (!occasionId) {
        editionSelect.innerHTML = '<option value="">-- Select Edition --</option>';
        return;
    }

    const editions = getEditionsForOccasion(occasionId);

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
    const container = document.getElementById('assignments-container');

    // Remove any existing delete button
    const existingBtn = document.getElementById('delete-edition-btn');
    if (existingBtn) existingBtn.remove();

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
    const groups = getGroups();

    // Build a map: personId -> groupName
    const personToGroupName = {};
    groups.forEach(g => {
        g.memberIds.forEach(pId => {
            personToGroupName[pId] = g.name;
        });
    });

    list.innerHTML = edition.assignments.map(a => {
        const giver = persons.find(p => p.id === a.giverId);
        const recipient = persons.find(p => p.id === a.recipientId);
        const giverName = giver ? giver.name : '[Deleted Person]';
        const recipientName = recipient ? recipient.name : '[Deleted Person]';
        const giverGroup = personToGroupName[a.giverId] || 'No group';
        const recipientGroup = personToGroupName[a.recipientId] || 'No group';

        return `
            <li>
                <span>${escapeHtml(giverName)} <small class="group-tag">(${escapeHtml(giverGroup)})</small></span>
                <span class="arrow">→</span>
                <span>${escapeHtml(recipientName)} <small class="group-tag">(${escapeHtml(recipientGroup)})</small></span>
            </li>
        `;
    }).join('');

    // Add delete button for this edition
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'delete-edition-btn';
    deleteBtn.className = 'small-btn danger-btn';
    deleteBtn.style.marginTop = '10px';
    deleteBtn.textContent = 'Delete this Edition';
    deleteBtn.onclick = () => deleteEdition(editionId);
    container.appendChild(deleteBtn);
}

/**
 * Delete an edition
 */
function deleteEdition(id) {
    if (!confirm('Are you sure you want to delete this edition?\n\nThis will remove all assignments for this edition.')) {
        return;
    }

    let editions = getEditions();
    editions = editions.filter(e => e.id !== id);
    saveData(STORAGE_KEYS.EDITIONS, editions);

    // Reset the edition select and refresh
    document.getElementById('select-edition').value = '';
    updateEditionsList();
    showAssignments();
}

// ===========================================
// SHUFFLER ALGORITHM
// ===========================================

/**
 * Run the shuffle algorithm to create a new edition
 *
 * Business Rules:
 * 1. All persons who belong to a group participate
 * 2. No one can be assigned to themselves
 * 3. No one can be assigned to someone from their OWN group (cross-group assignment)
 * 4. No one can be assigned to the same recipient as in any previous edition
 * 5. (Optional) Prevent reciprocal gifts: if A→B happened, B→A is forbidden
 */
function runShuffle() {
    const occasionId = document.getElementById('select-occasion').value;
    const preventReciprocal = document.getElementById('prevent-reciprocal').checked;

    // Validation
    if (!occasionId) {
        alert('Please select an occasion.');
        return;
    }

    const groups = getGroups();
    const persons = getPersons();

    // Build a map: personId -> groupId
    const personToGroup = {};
    groups.forEach(g => {
        g.memberIds.forEach(pId => {
            personToGroup[pId] = g.id;
        });
    });

    // Get all persons who are in a group
    const participantIds = persons.filter(p => personToGroup[p.id]).map(p => p.id);

    if (participantIds.length < 2) {
        alert('At least 2 persons must be assigned to groups to run a shuffle.');
        return;
    }

    // Check that there are at least 2 groups with members
    const groupsWithMembers = groups.filter(g => g.memberIds.length > 0);
    if (groupsWithMembers.length < 2) {
        alert('At least 2 groups with members are required for cross-group shuffling.');
        return;
    }

    // Get previous assignments for this occasion
    const previousEditions = getEditionsForOccasion(occasionId);

    // Build a map of "forbidden" assignments: giverId -> Set of recipientIds they've had before
    const forbidden = {};
    participantIds.forEach(id => {
        forbidden[id] = new Set();
    });

    previousEditions.forEach(edition => {
        edition.assignments.forEach(a => {
            // Rule 4: Can't give to the same person again
            if (forbidden[a.giverId]) {
                forbidden[a.giverId].add(a.recipientId);
            }
            // Rule 5: If preventing reciprocals, B can't give to A if A gave to B before
            if (preventReciprocal && forbidden[a.recipientId]) {
                forbidden[a.recipientId].add(a.giverId);
            }
        });
    });

    // Rule 6: Apply exclusions (bidirectional - neither can give to the other)
    const exclusions = getExclusions();
    exclusions.forEach(e => {
        if (forbidden[e.person1Id]) {
            forbidden[e.person1Id].add(e.person2Id);
        }
        if (forbidden[e.person2Id]) {
            forbidden[e.person2Id].add(e.person1Id);
        }
    });

    // Rule 7: Get inclusions (forced assignments) and validate them
    const inclusions = getInclusions();
    const forcedAssignments = [];

    for (const inclusion of inclusions) {
        const giverId = inclusion.giverId;
        const recipientId = inclusion.recipientId;

        // Check if both giver and recipient are participants
        if (!participantIds.includes(giverId) || !participantIds.includes(recipientId)) {
            continue; // Skip if either person is not in a group
        }

        // Check if this forced assignment violates the cross-group rule
        if (personToGroup[giverId] === personToGroup[recipientId]) {
            alert(`Inclusion "${persons.find(p => p.id === giverId)?.name} → ${persons.find(p => p.id === recipientId)?.name}" violates the cross-group rule. Both are in the same group.`);
            return;
        }

        // Check if this forced assignment is forbidden
        if (forbidden[giverId] && forbidden[giverId].has(recipientId)) {
            alert(`Inclusion "${persons.find(p => p.id === giverId)?.name} → ${persons.find(p => p.id === recipientId)?.name}" conflicts with other rules (previous edition or exclusion).`);
            return;
        }

        forcedAssignments.push({ giverId, recipientId });
    }

    // Try to find a valid assignment using random permutations
    // We'll attempt up to MAX_ATTEMPTS times before giving up
    const MAX_ATTEMPTS = 1000;
    let assignments = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const result = tryCreateCrossGroupAssignment(participantIds, personToGroup, forbidden, forcedAssignments);
        if (result) {
            assignments = result;
            break;
        }
    }

    if (!assignments) {
        alert(
            'Could not find a valid assignment after many attempts.\n\n' +
            'This can happen if:\n' +
            '- Not enough persons in different groups\n' +
            '- There have been too many previous editions\n' +
            '- The constraints are impossible to satisfy\n' +
            (preventReciprocal ? '- Reciprocal prevention makes it harder to find valid assignments\n' : '') +
            '\nTry adding more persons to different groups, using a different occasion, or disabling reciprocal prevention.'
        );
        return;
    }

    // Create the edition
    const edition = {
        id: generateId(),
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
 * Try to create a valid cross-group assignment
 *
 * Algorithm:
 * 1. Start with forced assignments (inclusions)
 * 2. Build chains: for non-forced givers, randomly assign valid recipients
 * 3. Ensure circular structure: everyone gives and receives exactly once
 *
 * @param {string[]} participantIds - Array of participant IDs
 * @param {Object} personToGroup - Map of personId -> groupId
 * @param {Object} forbidden - Map of giverId -> Set of forbidden recipientIds
 * @param {Array} forcedAssignments - Array of {giverId, recipientId} that must be included
 * @returns {Array|null} Array of {giverId, recipientId} or null if failed
 */
function tryCreateCrossGroupAssignment(participantIds, personToGroup, forbidden, forcedAssignments = []) {
    // Track who is giving to whom
    const giverToRecipient = {};
    const recipientToGiver = {};

    // Apply forced assignments first
    for (const forced of forcedAssignments) {
        giverToRecipient[forced.giverId] = forced.recipientId;
        recipientToGiver[forced.recipientId] = forced.giverId;
    }

    // Get participants who still need assignments
    const unassignedGivers = participantIds.filter(id => !giverToRecipient[id]);
    const unassignedRecipients = participantIds.filter(id => !recipientToGiver[id]);

    // Shuffle unassigned givers for randomness
    shuffleArray(unassignedGivers);

    // For each unassigned giver, find a valid recipient
    for (const giverId of unassignedGivers) {
        // Find valid recipients (not already taken, different group, not forbidden)
        const validRecipients = unassignedRecipients.filter(recipientId => {
            // Rule 2: Can't give to yourself
            if (giverId === recipientId) return false;

            // Rule 3: Can't give to someone in your OWN group
            if (personToGroup[giverId] === personToGroup[recipientId]) return false;

            // Rule 4/5/6: Can't give to forbidden recipients
            if (forbidden[giverId] && forbidden[giverId].has(recipientId)) return false;

            // Already assigned as recipient
            if (recipientToGiver[recipientId]) return false;

            return true;
        });

        if (validRecipients.length === 0) {
            return null; // No valid recipient found, retry with different shuffle
        }

        // Pick a random valid recipient
        const recipientId = validRecipients[Math.floor(Math.random() * validRecipients.length)];

        giverToRecipient[giverId] = recipientId;
        recipientToGiver[recipientId] = giverId;

        // Remove from unassigned
        const idx = unassignedRecipients.indexOf(recipientId);
        if (idx > -1) unassignedRecipients.splice(idx, 1);
    }

    // Verify everyone has exactly one assignment
    if (Object.keys(giverToRecipient).length !== participantIds.length) {
        return null;
    }

    // Convert to array format
    const assignments = participantIds.map(giverId => ({
        giverId,
        recipientId: giverToRecipient[giverId]
    }));

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
 * Update the occasion select dropdown
 */
function updateSelectDropdowns() {
    const occasionSelect = document.getElementById('select-occasion');

    const occasions = getOccasions();

    // Preserve current selection
    const currentOccasion = occasionSelect.value;

    // Sort occasions alphabetically
    const sortedOccasions = [...occasions].sort((a, b) => a.name.localeCompare(b.name));

    occasionSelect.innerHTML = '<option value="">-- Select Occasion --</option>' +
        sortedOccasions.map(o => `<option value="${o.id}">${escapeHtml(o.name)}${o.date ? ` (${escapeHtml(o.date)})` : ''}</option>`).join('');

    // Restore selection if still valid
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
// DATA SHARING (IMPORT/EXPORT JSON)
// ===========================================

/**
 * Export all app data as a JSON file
 */
function exportDataJSON() {
    try {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            persons: getPersons(),
            groups: getGroups(),
            occasions: getOccasions(),
            editions: getEditions(),
            exclusions: getExclusions(),
            inclusions: getInclusions()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const filename = `gift-shuffler-data-${new Date().toISOString().split('T')[0]}.json`;

        // Create and trigger download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);

        // Use setTimeout to ensure the element is in the DOM
        setTimeout(() => {
            a.click();
            // Clean up after a delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 0);
    } catch (err) {
        alert('Error exporting data: ' + err.message);
        console.error('Export error:', err);
    }
}

/**
 * Import app data from a JSON file
 */
function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validate the data structure
            if (!data.persons || !data.groups || !data.occasions || !data.editions) {
                alert('Invalid data file. Missing required fields.');
                return;
            }

            // Ask user how to handle import
            const choice = confirm(
                'How do you want to import this data?\n\n' +
                'OK = Replace all existing data\n' +
                'Cancel = Merge with existing data'
            );

            if (choice) {
                // Replace all data
                saveData(STORAGE_KEYS.PERSONS, data.persons);
                saveData(STORAGE_KEYS.GROUPS, data.groups);
                saveData(STORAGE_KEYS.OCCASIONS, data.occasions);
                saveData(STORAGE_KEYS.EDITIONS, data.editions);
                saveData(STORAGE_KEYS.EXCLUSIONS, data.exclusions || []);
                saveData(STORAGE_KEYS.INCLUSIONS, data.inclusions || []);
            } else {
                // Merge data (add new items, skip duplicates by ID)
                const existingPersons = getPersons();
                const existingGroups = getGroups();
                const existingOccasions = getOccasions();
                const existingEditions = getEditions();
                const existingExclusions = getExclusions();
                const existingInclusions = getInclusions();

                const existingPersonIds = new Set(existingPersons.map(p => p.id));
                const existingGroupIds = new Set(existingGroups.map(g => g.id));
                const existingOccasionIds = new Set(existingOccasions.map(o => o.id));
                const existingEditionIds = new Set(existingEditions.map(e => e.id));
                const existingExclusionIds = new Set(existingExclusions.map(e => e.id));
                const existingInclusionIds = new Set(existingInclusions.map(i => i.id));

                // Add new items
                data.persons.forEach(p => {
                    if (!existingPersonIds.has(p.id)) {
                        existingPersons.push(p);
                    }
                });
                data.groups.forEach(g => {
                    if (!existingGroupIds.has(g.id)) {
                        existingGroups.push(g);
                    }
                });
                data.occasions.forEach(o => {
                    if (!existingOccasionIds.has(o.id)) {
                        existingOccasions.push(o);
                    }
                });
                data.editions.forEach(e => {
                    if (!existingEditionIds.has(e.id)) {
                        existingEditions.push(e);
                    }
                });
                if (data.exclusions) {
                    data.exclusions.forEach(e => {
                        if (!existingExclusionIds.has(e.id)) {
                            existingExclusions.push(e);
                        }
                    });
                }
                if (data.inclusions) {
                    data.inclusions.forEach(i => {
                        if (!existingInclusionIds.has(i.id)) {
                            existingInclusions.push(i);
                        }
                    });
                }

                saveData(STORAGE_KEYS.PERSONS, existingPersons);
                saveData(STORAGE_KEYS.GROUPS, existingGroups);
                saveData(STORAGE_KEYS.OCCASIONS, existingOccasions);
                saveData(STORAGE_KEYS.EDITIONS, existingEditions);
                saveData(STORAGE_KEYS.EXCLUSIONS, existingExclusions);
                saveData(STORAGE_KEYS.INCLUSIONS, existingInclusions);
            }

            // Refresh UI
            renderPersons();
            renderGroupsUI();
            renderOccasions();
            renderExclusions();
            renderInclusions();
            updateSelectDropdowns();
            updatePersonGroupDropdown();
            updateExclusionDropdowns();
            updateInclusionDropdowns();
            updateEditionsList();

            alert('Data imported successfully!');
        } catch (err) {
            alert('Error reading file: ' + err.message);
        }
    };

    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    event.target.value = '';
}

// ===========================================
// RESET DATA
// ===========================================

/**
 * Reset all data with confirmation
 */
function resetAllData() {
    if (!confirm('Are you sure you want to delete ALL data?\n\nThis will remove all persons, groups, occasions, editions, exclusions, and inclusions.\n\nThis action cannot be undone!')) {
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
    localStorage.removeItem(STORAGE_KEYS.EXCLUSIONS);
    localStorage.removeItem(STORAGE_KEYS.INCLUSIONS);

    // Re-render everything
    renderPersons();
    renderGroupsUI();
    renderOccasions();
    renderExclusions();
    renderInclusions();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
    updateExclusionDropdowns();
    updateInclusionDropdowns();
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
// SECRET FEATURE UNLOCK
// ===========================================

/**
 * Track clicks on shuffle heading to unlock advanced features
 */
let secretClickCount = 0;
let secretClickTimer = null;

function setupSecretUnlock() {
    const heading = document.getElementById('shuffle-heading');
    const advancedRules = document.getElementById('advanced-rules');

    if (!heading || !advancedRules) return;

    // Check if already unlocked (stored in localStorage)
    if (localStorage.getItem('giftApp.advancedUnlocked') === 'true') {
        advancedRules.style.display = 'block';
    }

    heading.style.cursor = 'pointer';
    heading.addEventListener('click', function() {
        secretClickCount++;

        // Reset counter after 2 seconds of inactivity
        clearTimeout(secretClickTimer);
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 2000);

        // Unlock after 5 clicks
        if (secretClickCount >= 5) {
            advancedRules.style.display = 'block';
            localStorage.setItem('giftApp.advancedUnlocked', 'true');
            secretClickCount = 0;
        }
    });
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
    renderExclusions();
    renderInclusions();
    updateSelectDropdowns();
    updatePersonGroupDropdown();
    updateExclusionDropdowns();
    updateInclusionDropdowns();
    updateEditionsList();
    setupSecretUnlock();
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
