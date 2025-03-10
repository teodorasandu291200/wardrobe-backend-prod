// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming you have a User model

// Middleware to authenticate the user and get their email
const authenticateToken = async (req, res, next) => {
    // Get the token from the Authorization header (bearer token)
    const token = req.header('Authorization')?.split(' ')[1];

    // If no token, return an error response
    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Fetch the user from the database using the user ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Attach the user object to the request for further use in other routes
        req.user = user;  // This adds the user object to `req` for future use

        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authenticateToken;
