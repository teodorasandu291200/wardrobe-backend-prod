// routes/clothingRoutes.js
const express = require('express'); 
const router = express.Router();
const Clothing = require('../models/clothing');
const Outfit = require('../models/outfit'); // Import Outfit model
const User = require('../models/user');
const authenticate = require('../routes/auth');
const multer = require('multer');
const multerS3 = require('multer-s3');
const cron = require('node-cron');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');

const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION, // Make sure this is set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const upload = multer({
    storage: multerS3({
      s3: new AWS.S3(), // ✔ Use AWS.S3() for Multer-S3
      bucket: process.env.AWS_S3_BUCKET, // Use environment variable
      acl: 'public-read',
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        cb(null, `uploads/${Date.now()}_${file.originalname}`);
      }
    })
  });
  

router.post('/', upload.single('file'), authenticate, async (req, res) => {
    console.log("File uploaded to S3:", req.file);

    console.log("The request body to be sent:", req.body);
    const { name, size, color, brand, category, user } = req.body;
    console.log("This is the user id in clothingRoutes but userId: ",user);
    
        const userObject = await User.findById(user);
        if (!userObject) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // File URL from S3
        const file = req.file.location;  // S3 URL returned by multer-s3
        if (!name || !size || !color || !brand || !category) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        console.log("The user:" , userObject);

        try {
        const clothing = new Clothing({
            name,
            size,
            color,
            brand,
            category,
            file,
            user: userObject
        });
        await clothing.save();

        if (!userObject.clothes) {
            userObject.clothes = []; // Initialize if undefined
        }
        userObject.clothes.push(clothing._id);
        await userObject.save();

        res.status(201).json(clothing);
        console.log('Completed request to add clothes');
    } catch (error) {
        res.status(400).json({ message: "Error with saving user: " ,error: error.message });
    }
});

// GET route to fetch all clothing items for a user
router.get('/clothes/:userId/clothes', async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
    }

    try { 
        const clothes = await Clothing.find({ user: userId }); // Ensure this query filters by `createdBy`
        if (!clothes) {
            return res.status(404).json({ error: 'No clothes added by this user' });
        }

        res.status(200).json(clothes);
    } catch (error) {
        console.error("Error fetching clothes:", error);
        res.status(500).json({ message: "Error fetching clothes" });
    }
});

// DELETE route to remove a clothing item by ID
router.delete('/clothes/:id', async (req, res) => {
    try {
        await Clothing.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get a clothing item by ID
router.get('/clothes/:id', async (req, res) => {
    try { 
        const cloth = await Clothing.find(req.params.id);
        res.status(204).json(cloth);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/clothes/:id', async (req, res) => {
    try {
        const updatedClothing = await Clothing.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }  // Return the updated item and validate input
        );
        if (!updatedClothing) {
            return res.status(404).json({ message: 'Clothing item not found' });
        }
        res.status(200).json(updatedClothing);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/clothes/:id/wear', async (req, res) => {
    try {
        const clothingId = req.params.id;
        const updatedClothing = await Clothing.findByIdAndUpdate(
            clothingId,
            { lastWorn: new Date() },
            { new: true }
        );
        if (!updatedClothing) {
            return res.status(404).json({ message: 'Clothing item not found' });
        }
        res.status(200).json(updatedClothing);
    } catch (err) {
        console.error('Error updating last worn date:', error);
        res.status(400).json({ error: err.message });
    }
});

router.post('/outfits', async (req, res) => {
    try {
        const { name, clothingItems, createdBy } = req.body;

        if (!mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ error: 'Invalid createdBy format' });
        }

        // Basic validation
        if (!name || !clothingItems || clothingItems.length === 0 || !createdBy) {
            return res.status(400).json({ error: 'Name, clothingItems, and createdBy are required.' });
        }

        // Validate maximum of 3 clothing items
        if (clothingItems.length > 3) {
            return res.status(400).json({ error: 'An outfit can contain up to 3 clothing items only.' });
        }

        // Validate `createdBy` is a valid user
        const user = await User.findById(createdBy);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Validate all `clothingItems` are valid ObjectIds
        if (!clothingItems.every((item) => mongoose.Types.ObjectId.isValid(item))) {
            return res.status(400).json({ error: 'All clothingItems must be valid ObjectIds.' });
        }

        // Create and save the outfit
        const newOutfit = new Outfit({
            name,
            clothingItems, // Array of ObjectIds
            createdBy,
        });

        await newOutfit.save();

        // Populate clothingItems and return the saved outfit
        const populatedOutfit = await Outfit.findById(newOutfit._id).populate('clothingItems');
        res.status(201).json(populatedOutfit);
    } catch (error) {
        console.error('Error saving outfit:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Invalid data provided. Please check your input.' });
        }

        res.status(500).json({ error: 'Failed to save outfit.' });
    }
});

router.get('/outfits/:userId', async (req, res) => {
    const { userId } = req.params;

    // Log the received userId to check the format
    console.log('Received userId:', userId);

    // Validate that the userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
    }

    try {
        // Log the userId after validation to confirm it's valid
        console.log('Valid userId:', userId);

        // Use `new mongoose.Types.ObjectId(userId)` to correctly create ObjectId
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Find the outfits for the user
        const outfits = await Outfit.find({ createdBy: userObjectId }).populate('clothingItems');
        console.log('Fetched outfits:', outfits);  // Log fetched outfits

        if (!outfits || outfits.length === 0) {
            return res.status(404).json({ error: 'No outfits found for this user' });
        }

        res.status(200).json(outfits);
    } catch (error) {
        console.error('Error fetching outfits:', error);
        res.status(500).json({ message: 'Error fetching outfits' });
    }
});




module.exports = router;
