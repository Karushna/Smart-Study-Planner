// 1. Import necessary packages
const express = require('express');
const cors = require('cors');

// 2. Initialize the Express app
const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

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

// --- API Endpoints for tasks will go here in the future ---

// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});