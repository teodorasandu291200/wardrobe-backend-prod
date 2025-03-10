const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true, 
    }, // For naming the outfit (e.g., "Casual Summer Look")
    clothingItems: [
        {
            type: mongoose.Schema.Types.ObjectId, // References to Clothing items
            ref: 'Clothing', // Reference to the Clothing model
            required: true
        },
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId, // User who created this outfit
        ref: 'User',
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now
    },
    lastWorn: {
        type: Date, // Optional: When this outfit was last worn
    },
});

const Outfit = mongoose.model('Outfit', outfitSchema);

module.exports = Outfit;
