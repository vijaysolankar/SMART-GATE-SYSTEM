// === server.js ===
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

// --- Middleware ---
// This allows your HTML running in the browser to talk to this server
app.use(cors()); 
// This allows the server to understand JSON data sent from your forms
app.use(express.json()); 

// This tells the server to make the files in the current folder available to the browser
app.use(express.static('.'));

// --- MongoDB Connection ---
// Make sure your local MongoDB service is running!
mongoose.connect('mongodb://127.0.0.1:27017/smartGateSystem')
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- DATABASE SCHEMAS (The blueprints for your data) ---

// Blueprint for Users (Students, Authority, Security)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: String,
    password: { type: String, required: true }, // In a real app, never store raw passwords!
    role: { type: String, enum: ['student', 'authority', 'security'], required: true }
});
const User = mongoose.model('User', userSchema);

// Blueprint for Gate Passes
const gatePassSchema = new mongoose.Schema({
    passNo: String,
    studentName: String,
    studentUsername: String,
    rollNo: String,
    department: String,
    division: String,
    contact: String,
    roomNo: String,
    outTime: Date,
    inTime: Date,
    reason: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    appliedDate: String,
    approvedDate: String,
    actualOut: Date,
    actualIn: Date
});
const GatePass = mongoose.model('GatePass', gatePassSchema);

// --- API ROUTES (The "menu items" your server offers) ---

// 1. Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already taken" });
        }
        // Create and save new user
        const newUser = new User({ username, email, password, role });
        await newUser.save();
        res.json({ success: true, message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        // Find user matching all three criteria
        const user = await User.findOne({ username, password, role });
        
        if (user) {
            // Send back only necessary info, not the password
            res.json({ success: true, user: { username: user.username, role: user.role } });
        } else {
            res.json({ success: false, message: "Invalid credentials or incorrect role selected" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Get All Gate Passes Route (Used by all dashboards to load data)
app.get('/api/gatepasses', async (req, res) => {
    try {
        // Get all passes, sorting by newest first (_id desc)
        const passes = await GatePass.find().sort({ _id: -1 });
        res.json(passes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 4. Create New Gate Pass Route (Used by Student)
app.post('/api/gatepasses', async (req, res) => {
    try {
        const newPass = new GatePass(req.body);
        await newPass.save();
        res.json({ success: true, message: "Gate pass applied successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Update Gate Pass Route (Used by Authority to Approve/Reject, Security for Entry/Exit)
app.put('/api/gatepasses/:id', async (req, res) => {
    try {
        // Find the pass by ID and update whatever data was sent in the body
        const updatedPass = await GatePass.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true } // Return the updated version
        );
        res.json(updatedPass);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 6. Root Route to Serve the Main HTML Page
app.get('/', (req, res) => {
    // The __dirname variable gives us the absolute path to the folder this script is in
    res.sendFile(__dirname + '/index.html');
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Backend Server is running!`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Waiting for database connection...`);
    console.log(`=================================`);
});