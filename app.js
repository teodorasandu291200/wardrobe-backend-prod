// app.js

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const clothingRoutes = require('./routes/clothingRoutes');
const authRoutes = require('./routes/auth');
const removeBgRoutes = require('./routes/removeBackgroundRoute');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(bodyParser.json());
app.set('trust proxy', 1);  // Helps with HTTP/2 issues in Railway

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/clothing', clothingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/remove-bg', removeBgRoutes);

app.use('/uploads', express.static('uploads'));

// Cron job to send reminder emails at midnight
const sendReminderEmail = (email, subject, text) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

cron.schedule('0 0 * * *', async () => {
    console.log('Running email check at midnight...');

    try {
        const users = await User.find().populate('clothes');

        users.forEach(user => {
            user.clothes.forEach(item => {
                const lastWornDate = item.lastWorn;
                const currentDate = new Date();
                const daysDiff = (currentDate - new Date(lastWornDate)) / (1000 * 3600 * 24);

                if (daysDiff > 180) {
                    const subject = 'Reminder: Your clothing item has not been worn for over 180 days';
                    const text = `Hello, this is a reminder that the clothing item '${item.name}' has not been worn for more than 180 days.`;
                    sendReminderEmail(user.email, subject, text);
                }
            });
        });
    } catch (err) {
        console.error('Error fetching users for email reminders:', err);
    }
});

// Global error handler for improved stability
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => 
    console.log(`Server running on port ${PORT}`));