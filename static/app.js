// API Base URL
const API_BASE = '/api/tasks';

// Global variables
let tasks = [];
let draggedTask = null;
let currentDate = new Date();
let selectedDate = null;
let allTags = new Set();

// DOM elements
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const addTaskBtn = document.getElementById('addTaskBtn');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close');
const taskHasBall = document.getElementById('taskHasBall');
const ballHolderGroup = document.getElementById('ballHolderGroup');
const taskTagsInput = document.getElementById('taskTags');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    setupDragAndDrop();
    setupTabs();
    setupCalendar();
    setupTagAutocomplete();
});

// Setup tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update active button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}View`) {
                    content.classList.add('active');
                }
            });

            // Refresh calendar if switching to calendar tab
            if (tabName === 'calendar') {
                renderCalendar();
            }
        });
    });
}

// Setup calendar
function setupCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

// Render calendar
function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthEl = document.getElementById('currentMonth');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update month title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Clear calendar
    calendarDays.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayEl = createDayElement(daysInPrevMonth - i, true);
        calendarDays.appendChild(dayEl);
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = getTasksForDate(dateStr);
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

        const dayEl = createDayElement(day, false, dateStr, dayTasks, isToday);
        calendarDays.appendChild(dayEl);
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createDayElement(day, true);
        calendarDays.appendChild(dayEl);
    }

    // Update selected date tasks if a date is selected
    if (selectedDate) {
        showSelectedDateTasks(selectedDate);
    }
}

// Create calendar day element
function createDayElement(day, isOtherMonth, dateStr = null, dayTasks = [], isToday = false) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';

    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }

    if (isToday) {
        dayEl.classList.add('today');
    }

    if (dateStr && selectedDate === dateStr) {
        dayEl.classList.add('selected');
    }

    if (dayTasks.length > 0) {
        dayEl.classList.add('has-tasks');
    }

    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    // Task dots
    if (dayTasks.length > 0) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'calendar-day-dots';

        const priorities = dayTasks.map(t => t.priority);
        const uniquePriorities = [...new Set(priorities)].slice(0, 7);

        uniquePriorities.forEach(priority => {
            const dot = document.createElement('div');
            dot.className = `calendar-day-dot ${priority}`;
            dotsContainer.appendChild(dot);
        });

        dayEl.appendChild(dotsContainer);
    }

    // Click handler
    if (dateStr && !isOtherMonth) {
        dayEl.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
            selectedDate = dateStr;
            showSelectedDateTasks(dateStr);
        });
    }

    return dayEl;
}

// Get tasks for a specific date
function getTasksForDate(dateStr) {
    return tasks.filter(task => {
        return task.start_date === dateStr || task.due_date === dateStr;
    });
}

// Show tasks for selected date
function showSelectedDateTasks(dateStr) {
    const container = document.getElementById('selectedDateTasks');
    const title = document.getElementById('selectedDateTitle');
    const taskList = document.getElementById('calendarTaskList');

    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    title.textContent = formattedDate;

    const dayTasks = getTasksForDate(dateStr);
    taskList.innerHTML = '';

    if (dayTasks.length === 0) {
        taskList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No tasks for this date</p>';
        return;
    }

    dayTasks.forEach(task => {
        const card = createCalendarTaskCard(task);
        taskList.appendChild(card);
    });
}

// Create task card for calendar view
function createCalendarTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority}`;
    card.dataset.taskId = task.id;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    const isStartTask = task.start_date === selectedDate;
    const isDueTask = task.due_date === selectedDate;

    card.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.name)}</div>
            <div class="task-actions">
                <button class="btn btn-edit" onclick="editTask('${task.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
        ${task.memo ? `<div class="task-memo">${escapeHtml(task.memo)}</div>` : ''}
        <div class="task-meta">
            ${task.status === 'done' ? '<span class="ball-indicator has-ball">Done</span>' : ''}
            ${isStartTask ? `<span>Start</span>` : ''}
            ${isDueTask ? `<span class="due-date">Due</span>` : ''}
        </div>
    `;

    return card;
}

// Setup tag autocomplete
function setupTagAutocomplete() {
    let suggestionsBox = null;

    taskTagsInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const lastTag = value.split(',').pop().trim().toLowerCase();

        // Remove existing suggestions
        if (suggestionsBox) {
            suggestionsBox.remove();
            suggestionsBox = null;
        }

        if (!lastTag || allTags.size === 0) return;

        // Find matching tags
        const matches = [...allTags].filter(tag =>
            tag.toLowerCase().includes(lastTag)
        );

        if (matches.length === 0) return;

        // Create suggestions box
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'tag-suggestions';

        matches.forEach(tag => {
            const suggestion = document.createElement('div');
            suggestion.className = 'tag-suggestion';
            suggestion.textContent = tag;
            suggestion.addEventListener('click', () => {
                const currentTags = value.split(',').slice(0, -1);
                currentTags.push(tag);
                taskTagsInput.value = currentTags.join(', ');
                suggestionsBox.remove();
                suggestionsBox = null;
            });
            suggestionsBox.appendChild(suggestion);
        });

        taskTagsInput.parentElement.appendChild(suggestionsBox);
    });

    // Remove suggestions on outside click
    document.addEventListener('click', (e) => {
        if (suggestionsBox && !taskTagsInput.parentElement.contains(e.target)) {
            suggestionsBox.remove();
            suggestionsBox = null;
        }
    });
}

// Update all tags from tasks
function updateAllTags() {
    allTags.clear();
    tasks.forEach(task => {
        if (task.tags) {
            task.tags.forEach(tag => allTags.add(tag));
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    addTaskBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    taskForm.addEventListener('submit', handleSubmit);
    taskHasBall.addEventListener('change', toggleBallHolder);

    // Close modal on outside click
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });
}

// Toggle ball holder input
function toggleBallHolder() {
    ballHolderGroup.style.display = taskHasBall.checked ? 'none' : 'block';
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch(API_BASE);
        const data = await response.json();
        tasks = data.tasks || [];
        updateAllTags();
        renderTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

// Render tasks
function renderTasks() {
    const todoList = document.getElementById('todoList');
    const inProgressList = document.getElementById('inProgressList');
    const doneList = document.getElementById('doneList');

    // Clear
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    // Distribute tasks by status
    tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        switch (task.status) {
            case 'todo':
                todoList.appendChild(taskCard);
                break;
            case 'in_progress':
                inProgressList.appendChild(taskCard);
                break;
            case 'done':
                doneList.appendChild(taskCard);
                break;
        }
    });

    // Update calendar if visible
    if (document.getElementById('calendarView').classList.contains('active')) {
        renderCalendar();
    }
}

// Create task card
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority}`;
    card.draggable = true;
    card.dataset.taskId = task.id;

    // Date format
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Check overdue
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

    // Tags HTML
    const tagsHtml = task.tags && task.tags.length > 0
        ? `<div class="task-tags">${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
        : '';

    const tagCustomHtml = task.tag_custom
        ? `<div class="task-tags"><span class="tag tag-custom">${escapeHtml(task.tag_custom)}</span></div>`
        : '';

    // Ball indicator
    const ballHtml = task.has_ball
        ? `<span class="ball-indicator has-ball">Mine</span>`
        : task.ball_holder
            ? `<span class="ball-indicator no-ball">${escapeHtml(task.ball_holder)}</span>`
            : '';

    card.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.name)}</div>
            <div class="task-actions">
                <button class="btn btn-edit" onclick="editTask('${task.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
        ${task.memo ? `<div class="task-memo">${escapeHtml(task.memo)}</div>` : ''}
        <div class="task-meta">
            ${ballHtml}
            ${task.due_date ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">Due ${formatDate(task.due_date)}</span>` : ''}
            ${task.start_date ? `<span>Start ${formatDate(task.start_date)}</span>` : ''}
        </div>
        ${tagsHtml}
        ${tagCustomHtml}
    `;

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup drag and drop
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.task-list');

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
}

function handleDragLeave(e) {
    if (e.target.classList.contains('task-card')) {
        e.target.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();

    const column = e.currentTarget;
    const newStatus = column.parentElement.dataset.status;

    if (draggedTask) {
        const taskId = draggedTask.dataset.taskId;
        const task = tasks.find(t => t.id === taskId);

        if (task && task.status !== newStatus) {
            task.status = newStatus;
            await updateTask(taskId, task);
        }
    }
}

// Modal operations
function openModal(task = null) {
    modalTitle.textContent = task ? 'Edit Task' : 'New Task';

    if (task) {
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskMemo').value = task.memo || '';
        document.getElementById('taskTags').value = task.tags ? task.tags.join(', ') : '';
        document.getElementById('taskTagCustom').value = task.tag_custom || '';
        document.getElementById('taskHasBall').checked = task.has_ball || false;
        document.getElementById('taskBallHolder').value = task.ball_holder || '';
        document.getElementById('taskStartDate').value = task.start_date || '';
        document.getElementById('taskDueDate').value = task.due_date || '';
    } else {
        taskForm.reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskStatus').value = 'todo';
        document.getElementById('taskPriority').value = 'medium';
    }

    toggleBallHolder();
    taskModal.classList.add('show');
}

function closeModal() {
    taskModal.classList.remove('show');
}

// Form submit
async function handleSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const tagsValue = document.getElementById('taskTags').value;
    const tags = tagsValue ? tagsValue.split(',').map(t => t.trim()).filter(t => t) : [];

    const taskData = {
        name: document.getElementById('taskName').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        memo: document.getElementById('taskMemo').value,
        tags: tags,
        tag_custom: document.getElementById('taskTagCustom').value,
        has_ball: document.getElementById('taskHasBall').checked,
        ball_holder: document.getElementById('taskBallHolder').value,
        start_date: document.getElementById('taskStartDate').value,
        due_date: document.getElementById('taskDueDate').value
    };

    try {
        if (taskId) {
            await updateTask(taskId, taskData);
        } else {
            await createTask(taskData);
        }
        closeModal();
    } catch (error) {
        console.error('Failed to save task:', error);
        showNotification('Failed to save task', 'error');
    }
}

// API calls
async function createTask(taskData) {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });

    if (!response.ok) throw new Error('Failed to create task');

    await loadTasks();
}

async function updateTask(taskId, taskData) {
    const response = await fetch(`${API_BASE}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });

    if (!response.ok) throw new Error('Failed to update task');

    await loadTasks();
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;

    const response = await fetch(`${API_BASE}/${taskId}`, {
        method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete task');

    await loadTasks();
}

// Notification (simple toast)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(99, 102, 241, 0.9)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-size: 14px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Global functions (called from HTML)
window.editTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) openModal(task);
};

window.deleteTask = function(taskId) {
    deleteTask(taskId);
};
