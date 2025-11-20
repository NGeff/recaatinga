const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    gameId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Game', 
        required: true 
    },
    completedLevels: [{
        levelId: mongoose.Schema.Types.ObjectId,
        score: Number,
        completedAt: Date
    }],
    currentLevel: { type: Number, default: 1 },
    totalScore: { type: Number, default: 0 },
    achievements: [String],
    lastPlayed: { type: Date, default: Date.now }
}, { timestamps: true });

progressSchema.index({ userId: 1, gameId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);