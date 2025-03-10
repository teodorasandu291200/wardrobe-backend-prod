// models/clothing.js
const mongoose = require('mongoose');

// Define the schema for a clothing item
const clothingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    file: { type: String },
    lastWorn: {type:Date, default: null},
    createdAt: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Create the model
const Clothing = mongoose.model('Clothing', clothingSchema);

module.exports = Clothing;
