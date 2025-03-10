const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { removeBackground } = require("@imgly/background-removal-node");
const axios = require('axios');


// Multer setup for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');  // Set your file upload directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/remove-background', upload.single('file'), async (req, res) => {
    console.log('Uploaded file info:', req.file); // Debugging line
    // Check if file exists
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    if (!req.file.path) {
        return res.status(400).send('File path is not available.');
    }

    const imagePath = path.normalize(req.file.path); // Get the image path from the uploaded file
    console.log('Normalized Image Path:', imagePath);

   //const imageBuffer = fs.readFileSync(imagePath);
    //console.log(imageBuffer);
    //if (!imageBuffer) {
    //    return res.status(400).send("No image buffer provided");
    //}

    try {
        const removedImageBlob = await removeBackground(imagePath);

        console.log('Sending image buffer');

        // Set the response headers and send the image
        res.setHeader('Content-Type', 'image/png');
        console.log('LOGGED');
        console.log(removedImageBlob);
        res.send(removedImageBlob);
       
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Failed to remove background in backend');
    }
});



// Simple POST endpoint to process the image
router.post('/remove-background-test', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const imagePath = req.file.path;

    try {
        // Step 1: Remove background from the uploaded image
        const blob = await removeBackground(imagePath);
        const buffer = Buffer.from(await blob.arrayBuffer());

        // Step 2: Save the processed image locally
        const outputFilePath = `uploads/processed-${Date.now()}.png`;
        fs.writeFileSync(outputFilePath, buffer);

        // Step 3: Send the binary file back to the client
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename="processed-image.png"');
        res.send(buffer); // Send the binary data
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error removing background.' });
    }
});


// Simple POST endpoint to process the image
router.post('/remove-background-test-transparent', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const imagePath = req.file.path;

    try {
        const response = await axios.post(
            'https://api.remove.bg/v1.0/removebg',
            formData,
            {
                headers: {
                    'X-Api-Key': 'kzKDH2P2X6dqzTt2GqAsoCNw'
                },
                responseType: 'arraybuffer', // We expect the response to be an array of binary data (image)
            }
        );

        // Log the response data to check what is returned from Remove.bg
        console.log(response.data); // This logs the binary data that comes back

        const buffer = Buffer.from(response.data);

        // Save the image to a file (output.png)
        fs.writeFileSync('output.png', buffer);


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error removing background.' });
    }
});


module.exports = router;
