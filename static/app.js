// API Base URL
const API_BASE = '/api/tasks';

// Global variables
let tasks = [];
let draggedTask = null;
let currentDate = new Date();
let selectedDate = null;
let allTags = new Set();

// Filter state
let currentBallFilter = 'all';
let selectedTagFilters = new Set(['all']);

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
const calendarModal = document.getElementById('calendarModal');
const calendarDateTitle = document.getElementById('calendarDateTitle');
const closeCalendarBtn = document.querySelector('.close-calendar');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    setupDragAndDrop();
    setupTabs();
    setupCalendar();
    setupTagAutocomplete();
    setupFilters();
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
        closeCalendarModal();
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        closeCalendarModal();
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
        const taskPeriods = getTaskPeriodsForDate(dateStr);

        const dayEl = createDayElement(day, false, dateStr, dayTasks, taskPeriods, isToday);
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
    if (selectedDate && calendarModal.classList.contains('show')) {
        showSelectedDateTasks(selectedDate);
    }
}

// Get tasks that cover this date (within their start/end period)
function getTaskPeriodsForDate(dateStr) {
    const taskList = [];
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
        if (task.start_date && task.due_date) {
            const startDate = new Date(task.start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(task.due_date);
            endDate.setHours(23, 59, 59, 999);

            if (checkDate >= startDate && checkDate <= endDate) {
                taskList.push({
                    task: task,
                    priority: task.priority,
                    isFirst: task.start_date === dateStr,
                    isLast: task.due_date === dateStr
                });
            }
        }
    });

    return taskList;
}

// Get tasks for a specific date (tasks with start/due on this date)
function getTasksForDate(dateStr) {
    return tasks.filter(task => {
        return task.start_date === dateStr || task.due_date === dateStr;
    });
}

// Create day element for calendar
function createDayElement(day, isOtherMonth, dateStr = null, dayTasks = [], taskPeriods = [], isToday = false) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    if (isToday) dayEl.classList.add('today');
    if (dayTasks.length > 0 || taskPeriods.length > 0) dayEl.classList.add('has-tasks');

    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    // Task names list (show up to 3 tasks)
    if (taskPeriods.length > 0) {
        const taskNamesContainer = document.createElement('div');
        taskNamesContainer.className = 'calendar-day-tasks';

        // タスクを完了していないもの優先で、最大3つ表示
        const displayTasks = taskPeriods
            .sort((a, b) => {
                if (a.task.status === 'done' && b.task.status !== 'done') return 1;
                if (a.task.status !== 'done' && b.task.status === 'done') return -1;
                return 0;
            })
            .slice(0, 3);

        displayTasks.forEach(period => {
            const taskEl = document.createElement('div');
            taskEl.className = `calendar-task-name priority-${period.priority}`;
            if (period.task.status === 'done') {
                taskEl.classList.add('task-done');
            }

            // タスク名を短縮（最大8文字）
            const shortName = period.task.name.length > 8
                ? period.task.name.substring(0, 7) + '…'
                : period.task.name;

            taskEl.textContent = shortName;
            taskEl.title = period.task.name; // ホバーでフルネーム表示
            taskNamesContainer.appendChild(taskEl);
        });

        // 3つ以上ある場合は「+N」を表示
        if (taskPeriods.length > 3) {
            const moreEl = document.createElement('div');
            moreEl.className = 'calendar-task-more';
            moreEl.textContent = `+${taskPeriods.length - 3}`;
            taskNamesContainer.appendChild(moreEl);
        }

        dayEl.appendChild(taskNamesContainer);
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

// Show tasks for selected date
function showSelectedDateTasks(dateStr) {
    const title = calendarDateTitle;
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
        taskList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px 20px;">No tasks for this date</p>';
    } else {
        dayTasks.forEach(task => {
            const card = createTaskCard(task);
            taskList.appendChild(card);
        });
    }

    // Open modal
    calendarModal.classList.add('show');
}

function closeCalendarModal() {
    calendarModal.classList.remove('show');
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
        </div>
        ${task.memo ? `<div class="task-memo">${escapeHtml(task.memo)}</div>` : ''}
        <div class="task-meta">
            ${task.status === 'done' ? '<span class="ball-indicator has-ball">Done</span>' : ''}
            ${isStartTask ? `<span>Start</span>` : ''}
            ${isDueTask ? `<span class="due-date">Due</span>` : ''}
        </div>
    `;

    // Click to edit
    card.addEventListener('click', () => {
        openModal(task);
    });

    return card;
}

// Setup tag autocomplete
function setupTagAutocomplete() {
    let suggestionsBox = null;

    function showSuggestions(tags) {
        // Remove existing suggestions
        if (suggestionsBox) {
            suggestionsBox.remove();
            suggestionsBox = null;
        }

        if (tags.length === 0) return;

        // Create suggestions box
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'tag-suggestions';

        tags.forEach(tag => {
            const suggestion = document.createElement('div');
            suggestion.className = 'tag-suggestion';
            suggestion.textContent = tag;
            suggestion.addEventListener('click', () => {
                const value = taskTagsInput.value;
                const currentTags = value.split(',').slice(0, -1);
                currentTags.push(tag);
                taskTagsInput.value = currentTags.join(', ');
                suggestionsBox.remove();
                suggestionsBox = null;
            });
            suggestionsBox.appendChild(suggestion);
        });

        taskTagsInput.parentElement.appendChild(suggestionsBox);
    }

    // Show all tags when input is focused
    taskTagsInput.addEventListener('focus', () => {
        if (allTags.size > 0) {
            showSuggestions([...allTags]);
        }
    });

    taskTagsInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const lastTag = value.split(',').pop().trim().toLowerCase();

        if (!lastTag) {
            // Show all tags when empty
            if (allTags.size > 0) {
                showSuggestions([...allTags]);
            }
            return;
        }

        // Find matching tags
        const matches = [...allTags].filter(tag =>
            tag.toLowerCase().includes(lastTag)
        );

        showSuggestions(matches);
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
    handleTagFilterUpdate();
}

// Setup event listeners
function setupEventListeners() {
    addTaskBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    taskForm.addEventListener('submit', handleSubmit);
    taskHasBall.addEventListener('change', toggleBallHolder);

    // Delete button
    document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
        const taskId = document.getElementById('taskId').value;
        if (taskId) {
            if (confirm('Delete this task?')) {
                await deleteTask(taskId);
                closeModal();
            }
        }
    });

    // Calendar modal events
    closeCalendarBtn.addEventListener('click', closeCalendarModal);
    calendarModal.addEventListener('click', (e) => {
        if (e.target === calendarModal) closeCalendarModal();
    });

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

    // Filter tasks
    const filteredTasks = tasks.filter(task => passesFilters(task));

    // Distribute tasks by status
    filteredTasks.forEach(task => {
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

// Check if task passes current filters
function passesFilters(task) {
    // Ball filter
    if (currentBallFilter === 'mine') {
        if (!task.has_ball) return false;
    } else if (currentBallFilter === 'others') {
        if (task.has_ball) return false;
    }

    // Tag filter
    if (!selectedTagFilters.has('all') && selectedTagFilters.size > 0) {
        if (!task.tags || task.tags.length === 0) return false;
        const hasMatchingTag = task.tags.some(tag => selectedTagFilters.has(tag));
        if (!hasMatchingTag) return false;
    }

    return true;
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

    // Click to edit
    card.addEventListener('click', () => {
        openModal(task);
    });

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
            // 即時反映（楽観的更新）
            const oldStatus = task.status;
            task.status = newStatus;
            renderTasks();
            showNotification('ステータスを変更中...', 'info');

            // バックグラウンドで保存
            try {
                const response = await fetch(`${API_BASE}/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) throw new Error('Failed to update task');

                showNotification('ステータスを変更しました', 'success');
            } catch (error) {
                // エラー時は元に戻す
                task.status = oldStatus;
                renderTasks();
                showNotification('更新に失敗しました', 'error');
            }
        }
    }
}

// Modal operations
function openModal(task = null) {
    modalTitle.textContent = task ? 'Edit Task' : 'New Task';

    const deleteBtn = document.getElementById('deleteTaskBtn');
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
        document.getElementById('taskDueDate'). value = task.due_date || '';
        deleteBtn.style.display = 'block';
    } else {
        taskForm.reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskStatus').value = 'todo';
        document.getElementById('taskPriority').value = 'medium';
        deleteBtn.style.display = 'none';
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
    // 楽観的UI更新のために一時IDを生成
    const tempId = 'temp-' + Date.now();

    // サーバーに送信前にUIに追加（即時フィードバック）
    const tempTask = {
        id: tempId,
        ...taskData,
        created_at: new Date().toISOString()
    };
    tasks.push(tempTask);
    renderTasks();
    showNotification('タスクを追加中...', 'info');

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) throw new Error('Failed to create task');

        const result = await response.json();

        // 一時タスクを本物に置き換え
        const index = tasks.findIndex(t => t.id === tempId);
        if (index !== -1) {
            tasks[index] = result;
        }
        renderTasks();
        showNotification('タスクを追加しました', 'success');
    } catch (error) {
        // エラー時は一時タスクを削除
        const index = tasks.findIndex(t => t.id === tempId);
        if (index !== -1) {
            tasks.splice(index, 1);
        }
        renderTasks();
        throw error;
    }
}

async function updateTask(taskId, taskData) {
    // 楽観的UI更新（即時反映）
    const oldTask = tasks.find(t => t.id === taskId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...taskData };
        renderTasks();
    }
    showNotification('タスクを更新中...', 'info');

    try {
        const response = await fetch(`${API_BASE}/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) throw new Error('Failed to update task');

        const result = await response.json();

        // サーバーからの応答で更新
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            tasks[idx] = result;
        }
        renderTasks();
        showNotification('タスクを更新しました', 'success');
    } catch (error) {
        // エラー時は元に戻す
        if (oldTask && index !== -1) {
            tasks[index] = oldTask;
        }
        renderTasks();
        throw error;
    }
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;

    // 楽観的UI更新（即時削除）
    const oldTask = tasks.find(t => t.id === taskId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        tasks.splice(index, 1);
    }
    renderTasks();
    showNotification('タスクを削除中...', 'info');

    try {
        const response = await fetch(`${API_BASE}/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete task');

        showNotification('タスクを削除しました', 'success');
    } catch (error) {
        // エラー時は元に戻す
        if (oldTask) {
            tasks.splice(index, 0, oldTask);
        }
        renderTasks();
        throw error;
    }
}

// Notification (simple toast)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // タイプ別の色設定
    let bgColor;
    switch (type) {
        case 'error':
            bgColor = 'rgba(239, 68, 68, 0.9)';
            break;
        case 'success':
            bgColor = 'rgba(16, 185, 129, 0.9)';
            break;
        default:
            bgColor = 'rgba(99, 102, 241, 0.9)';
    }

    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${bgColor};
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
    }, 2000);
}

// Global functions (called from HTML)
window.editTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) openModal(task);
};

window.deleteTask = function(taskId) {
    deleteTask(taskId);
};

// ============================================
// Filter Functions
// ============================================

function setupFilters() {
    // Ball filter
    const ballFilter = document.getElementById('ballFilter');
    if (ballFilter) {
        ballFilter.addEventListener('change', (e) => {
            currentBallFilter = e.target.value;
            renderTasks();
        });
    }

    // Tag dropdown
    const tagDropdownBtn = document.getElementById('tagDropdownBtn');
    const tagDropdownContent = document.getElementById('tagDropdownContent');

    if (tagDropdownBtn && tagDropdownContent) {
        // Toggle dropdown
        tagDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tagDropdownBtn.classList.toggle('open');
            tagDropdownContent.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!tagDropdownBtn.contains(e.target) && !tagDropdownContent.contains(e.target)) {
                tagDropdownBtn.classList.remove('open');
                tagDropdownContent.classList.remove('show');
            }
        });

        // Handle checkbox changes
        tagDropdownContent.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                handleTagCheckboxChange(e.target);
            }
        });
    }
}

function handleTagFilterUpdate() {
    const tagDropdownContent = document.getElementById('tagDropdownContent');
    if (!tagDropdownContent) return;

    // Clear existing items (keep the "All" checkbox)
    const allCheckbox = tagDropdownContent.querySelector('input[value="all"]');
    tagDropdownContent.innerHTML = '';

    // Add "All" checkbox
    const allItem = document.createElement('label');
    allItem.className = 'dropdown-item';
    const allInput = document.createElement('input');
    allInput.type = 'checkbox';
    allInput.value = 'all';
    allInput.checked = selectedTagFilters.has('all');
    const allSpan = document.createElement('span');
    allSpan.textContent = 'All';
    allItem.appendChild(allInput);
    allItem.appendChild(allSpan);
    tagDropdownContent.appendChild(allItem);

    // Add tag checkboxes
    allTags.forEach(tag => {
        const item = document.createElement('label');
        item.className = 'dropdown-item';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = tag;
        input.checked = selectedTagFilters.has(tag);

        const span = document.createElement('span');
        span.textContent = tag;

        item.appendChild(input);
        item.appendChild(span);
        tagDropdownContent.appendChild(item);
    });

    // Update dropdown label
    updateTagDropdownLabel();
}

function handleTagCheckboxChange(checkbox) {
    const value = checkbox.value;

    if (value === 'all') {
        if (checkbox.checked) {
            selectedTagFilters.clear();
            selectedTagFilters.add('all');
        } else {
            selectedTagFilters.delete('all');
        }
    } else {
        selectedTagFilters.delete('all');
        if (checkbox.checked) {
            selectedTagFilters.add(value);
        } else {
            selectedTagFilters.delete(value);
        }

        // If no tags selected, select "All"
        if (selectedTagFilters.size === 0) {
            selectedTagFilters.add('all');
        }
    }

    // Update all checkboxes
    const allCheckbox = document.getElementById('tagDropdownContent').querySelector('input[value="all"]');
    const tagCheckboxes = Array.from(document.getElementById('tagDropdownContent').querySelectorAll('input[type="checkbox"]')).filter(cb => cb.value !== 'all');

    if (selectedTagFilters.has('all')) {
        allCheckbox.checked = true;
        tagCheckboxes.forEach(cb => cb.checked = false);
    } else {
        allCheckbox.checked = false;
    }

    updateTagDropdownLabel();
    renderTasks();
}

function updateTagDropdownLabel() {
    const label = document.getElementById('tagDropdownLabel');
    if (!label) return;

    if (selectedTagFilters.has('all')) {
        label.textContent = 'All';
    } else if (selectedTagFilters.size === 1) {
        label.textContent = [...selectedTagFilters][0];
    } else {
        label.textContent = `${selectedTagFilters.size} tags`;
    }
}
