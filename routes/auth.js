// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Make sure you have a User model
const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validation check
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to the database
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        console.log('User successfully registered:', user); // Debug log
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Error during registration:', error); // Detailed error log

        if (error.code === 11000) {
            // Duplicate key error
            const duplicateField = error.keyPattern.email ? 'Email' : 'Username';
            return res.status(400).json({ error: `${duplicateField} already exists.` });
        }

        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if the provided password matches the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        // Generate a JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respond with the token and user information
        console.log('Generated Token:', token);
        res.json({ token, email: user.email, username: user.username });
    } catch (error) {
        console.error('Login error:', error); // Log the error for debugging
        res.status(500).json({ error: 'Internal Server Error' }); // Send a generic error response
    }
});


module.exports = router;
