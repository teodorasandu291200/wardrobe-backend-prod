// app.js

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const clothingRoutes = require('./routes/clothingRoutes');
const authRoutes = require('./routes/auth');
const removeBgRoutes = require('./routes/removeBackgroundRoute')
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// Set up nodemailer transporter (use valid credentials here)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Replace with your email
        pass: process.env.EMAIL_PASSWORD,   // Replace with your email password (or app-specific password)
    },
});

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

/*
// Function to send test email
const sendTestEmail = () => {
    const mailOptions = {
        from: 'virtuwear25@gmail.com',
        to: 'sandu.teodora2912@gmail.com',  // You can replace with the email to receive the test
        subject: 'Test Email from Cron Job',
        text: 'This is a test email sent by the cron job!',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Test email sent: ' + info.response);
        }
    });
};

// Test cron job that runs every minute
cron.schedule('* * * * *', () => {
    console.log('Running cron job to send test email...');
    sendTestEmail();  // Send the test email
});
*/

// Middleware
app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGIN, // Adjust this to your frontend's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));
    
// Routes
app.use('/api', clothingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/', removeBgRoutes);

app.use('/uploads', express.static('uploads'));

// Cron job to run daily at midnight

// Function to send email reminder
const sendReminderEmail = (email, subject, text) => {
    const mailOptions = {
        from: 'your-email@example.com',
        to: email,
        subject: subject,
        text: text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

// Cron job that runs daily at midnight
cron.schedule('* * * * *', async () => {
    console.log('Running email check at midnight...');

    // Get all users in the database
    const users = await User.find().populate('clothes'); // Populate clothing items of users

    users.forEach((user) => {
        user.clothes.forEach((item) => {
            const lastWornDate = item.lastWorn;
            const currentDate = new Date();
            const timeDiff = currentDate - new Date(lastWornDate);
            const daysDiff = timeDiff / (1000 * 3600 * 24); // Convert milliseconds to days

            // If the clothing item has not been worn for more than 180 days
            if (daysDiff > 180) {
                const subject = 'Reminder: Your clothing item has not been worn for over 180 days';
                const text = `Hello, this is a reminder that the clothing item '${item.name}' has not been worn for more than 180 days.`;

                // Send email to the user who owns the clothing item
                sendReminderEmail(user.email, subject, text);
            }
        });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => 
    console.log(`Server running on port ${PORT}`));