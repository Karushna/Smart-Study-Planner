// Grab DOM elements
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const scheduleView = document.getElementById('schedule-view');

// URL of our Node.js backend API
const API_URL = 'http://localhost:5000/api/tasks';
const SCHEDULE_API_URL = 'http://localhost:5000/api/schedule';

// Arrays to hold data fetched from the backend
let tasks = [];
let schedule = [];

// --- Notification System ---
function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
    }
}

// 1. Fetch tasks from the backend
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        tasks = await response.json();
        renderTasks();
        fetchSchedule(); // Also fetch and render the schedule
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// 2. Add a new task to the backend
taskForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const subject = document.getElementById('subject').value;
    const deadline = document.getElementById('deadline').value;
    const priority = document.getElementById('priority').value;
    const estTime = document.getElementById('est-time').value;

    const newTask = { subject, deadline, priority, estTime };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            // Instead of just pushing, we re-fetch to get the DB-generated _id
            await fetchTasks();
            taskForm.reset();
            fetchSchedule(); // Re-fetch and render schedule after adding a task
            sendNotification("Task Scheduled! 📚", `"${newTask.subject}" has been added to your smart schedule.`);
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
});

// 3. Delete a task from the backend
window.deleteTask = async function(taskId) {
    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Filter out the deleted task using its _id
            tasks = tasks.filter(task => task._id !== taskId);
            fetchSchedule(); // Re-fetch and render schedule after deleting a task
            renderTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
};

// Function to render tasks to the screen
function renderTasks() {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        taskList.innerHTML = '<p style="color: #777;">No tasks added yet. Start planning!</p>';
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        // MongoDB uses _id, so we pass task._id to the delete function
        li.setAttribute('data-id', task._id);

        const formattedDate = new Date(task.deadline).toLocaleString();

        li.innerHTML = `
            <div class="task-details">
                <strong>${task.subject}</strong>
                <span>🗓 Deadline: ${formattedDate}</span>
                <span>⏱ Est. Time: ${task.estTime} hours</span>
            </div>
            <div class="task-actions">
                <span class="badge ${task.priority}">${task.priority.toUpperCase()}</span>
                <button onclick="deleteTask('${task._id}')" class="delete-btn">Delete</button>
            </div>
        `;

        taskList.appendChild(li);
    });
}

// Function to fetch and render the study schedule
async function fetchSchedule() {
    try {
        const response = await fetch(SCHEDULE_API_URL);
        schedule = await response.json();
        renderSchedule();
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

// Function to render the schedule to the screen
function renderSchedule() {
    scheduleView.innerHTML = ''; // Clear current schedule

    if (schedule.length === 0) {
        scheduleView.innerHTML = '<p style="color: #777;">No schedule generated yet. Add some tasks!</p>';
        return;
    }

    // Group tasks by day for a daily view
    const groupedSchedule = schedule.reduce((acc, block) => {
        const date = new Date(block.scheduledDate);
        // Format the date to a readable string for grouping
        const day = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(block);
        return acc;
    }, {});

    // Render each day's tasks
    for (const day in groupedSchedule) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'schedule-day';
        dayDiv.innerHTML = `<h3>${day}</h3>`;

        groupedSchedule[day].forEach(block => {
            const taskP = document.createElement('p');
            taskP.className = 'schedule-item';
            taskP.innerHTML = `<strong>${block.subject}</strong> - ${block.allocatedTime} hours (Priority: ${block.priority.toUpperCase()})`;
            dayDiv.appendChild(taskP);
        });
        scheduleView.appendChild(dayDiv);
    }
}

// Initial fetch to load tasks from backend when the page loads
requestNotificationPermission();
fetchTasks();
