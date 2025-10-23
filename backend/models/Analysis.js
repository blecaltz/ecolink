const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    analysisResult: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);