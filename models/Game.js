const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    points: { type: Number, default: 10 }
});

const levelSchema = new mongoose.Schema({
    levelNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: String,
    videoUrl: { type: String, required: true },
    thumbnail: String,
    questions: [questionSchema],
    minScore: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    coverImage: String,
    gameType: { 
        type: String, 
        enum: ['quiz', 'puzzle', 'memory', 'adventure'],
        default: 'quiz'
    },
    levels: [levelSchema],
    active: { type: Boolean, default: true },
    totalPlays: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);