// 1. Import necessary packages
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

// 2. Initialize the Express app
const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

// --- Connect to MongoDB ---
const MONGO_URI = process.env.MONGO_URI; // Get the connection string from environment variables

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

// --- Define the Task Schema and Model ---
const taskSchema = new mongoose.Schema({
    subject: String,
    deadline: Date,
    priority: String,
    estTime: Number,
});
const Task = mongoose.model('Task', taskSchema);

// 3. Set up middleware
// CORS: Allows our frontend (running on a different port) to communicate with this backend.
app.use(cors());
// JSON Parser: Allows the server to accept and parse JSON in request bodies.
app.use(express.json());

// 4. Define a basic test route
// This is just to confirm the server is working.
app.get('/', (req, res) => {
    res.send('Hello from the Smart Study Planner Backend!');
});

// 1. GET: Fetch all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. POST: Create a new task
app.post('/api/tasks', async (req, res) => {
    const task = new Task(req.body);
    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 3. DELETE: Remove a task by ID
app.delete('/api/tasks/:id', async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
});

// --- Smart Scheduling Algorithm ---
function generateSchedule(tasks) {
    // 1. Sort tasks by deadline (earliest first), then by priority
    const priorityScore = { 'high': 3, 'medium': 2, 'low': 1 };
    tasks.sort((a, b) => {
        const dateA = new Date(a.deadline).getTime();
        const dateB = new Date(b.deadline).getTime();
        if (dateA === dateB) {
            return priorityScore[b.priority] - priorityScore[a.priority];
        }
        return dateA - dateB; 
    });

    const schedule = [];
    const maxHoursPerDay = 4; // Daily study limit
    const hoursAssignedPerDay = {}; // Tracks workload per day

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start scheduling from midnight today

    tasks.forEach(task => {
        let remainingTime = task.estTime;
        let currentDay = new Date(today);
        const deadlineDay = new Date(task.deadline);
        deadlineDay.setHours(0, 0, 0, 0);

        // Distribute hours until task is fully scheduled or deadline is reached
        while (remainingTime > 0 && currentDay <= deadlineDay) {
            const dateStr = currentDay.toISOString().split('T')[0];
            if (!hoursAssignedPerDay[dateStr]) hoursAssignedPerDay[dateStr] = 0;

            const availableHours = maxHoursPerDay - hoursAssignedPerDay[dateStr];

            if (availableHours > 0) {
                const hoursToStudy = Math.min(remainingTime, availableHours);

                schedule.push({
                    id: task._id + '-' + dateStr,
                    scheduledDate: new Date(currentDay),
                    subject: task.subject,
                    allocatedTime: hoursToStudy,
                    priority: task.priority
                });

                hoursAssignedPerDay[dateStr] += hoursToStudy;
                remainingTime -= hoursToStudy;
            }
            // Move to the next day
            currentDay.setDate(currentDay.getDate() + 1);
        }

        // If time still remains, squeeze it into the deadline day (Overtime)
        if (remainingTime > 0) {
            const dateStr = deadlineDay.toISOString().split('T')[0];
            schedule.push({
                id: task._id + '-overflow',
                scheduledDate: new Date(deadlineDay),
                subject: task.subject + " (Overtime)",
                allocatedTime: remainingTime,
                priority: task.priority
            });
        }
    });

    // Sort final schedule by date so it renders chronologically
    schedule.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return schedule;
}

// 4. GET: Fetch generated study schedule
app.get('/api/schedule', async (req, res) => {
    try {
        const tasks = await Task.find();
        const schedule = generateSchedule(tasks);
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});