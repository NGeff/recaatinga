let currentLevel = null;
let currentQuestionIndex = 0;
let currentScore = 0;
let selectedAnswer = null;

function startLevel(gameId, levelId, videoUrl) {
    currentLevel = gameData.levels.find(l => l._id === levelId);
    if (!currentLevel) return;
    
    document.getElementById('levelsSection').style.display = 'none';
    document.getElementById('videoSection').style.display = 'block';
    
    const videoPlayer = document.getElementById('videoPlayer');
    const videoId = extractVideoId(videoUrl);
    
    if (videoId) {
        videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else {
        videoPlayer.src = videoUrl;
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function skipVideo() {
    document.getElementById('videoSection').style.display = 'none';
    startQuiz();
}

function startQuiz() {
    currentQuestionIndex = 0;
    currentScore = 0;
    selectedAnswer = null;
    
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('quizTitle').textContent = currentLevel.title;
    document.getElementById('currentScore').textContent = '0';
    
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= currentLevel.questions.length) {
        finishQuiz();
        return;
    }
    
    const question = currentLevel.questions[currentQuestionIndex];
    const quizContent = document.getElementById('quizContent');
    
    quizContent.innerHTML = `
        <div class="question-card">
            <p class="question-text">${currentQuestionIndex + 1}. ${question.question}</p>
            <div class="options-grid">
                ${question.options.map((option, index) => `
                    <button class="option-btn" onclick="selectAnswer(${index})">
                        ${option}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('btnNextQuestion').style.display = 'none';
}

function selectAnswer(answerIndex) {
    if (selectedAnswer !== null) return;
    
    selectedAnswer = answerIndex;
    const question = currentLevel.questions[currentQuestionIndex];
    const options = document.querySelectorAll('.option-btn');
    
    options.forEach((btn, index) => {
        btn.disabled = true;
        if (index === question.correctAnswer) {
            btn.classList.add('correct');
        } else if (index === answerIndex && index !== question.correctAnswer) {
            btn.classList.add('wrong');
        }
    });
    
    if (answerIndex === question.correctAnswer) {
        currentScore += question.points || 10;
        document.getElementById('currentScore').textContent = currentScore;
    }
    
    document.getElementById('btnNextQuestion').style.display = 'block';
}

function nextQuestion() {
    selectedAnswer = null;
    currentQuestionIndex++;
    showQuestion();
}

function finishQuiz() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    
    document.getElementById('finalScore').textContent = currentScore;
    
    const passed = currentScore >= (currentLevel.minScore || 0);
    const resultMessage = document.getElementById('resultMessage');
    
    if (passed) {
        resultMessage.innerHTML = '<p style="color: var(--cor-sucesso); font-size: 1.2rem;">Parabéns! Você passou de fase!</p>';
        saveProgress();
    } else {
        resultMessage.innerHTML = `<p style="color: var(--cor-erro); font-size: 1.2rem;">Você precisava de ${currentLevel.minScore} pontos. Tente novamente!</p>`;
    }
}

async function saveProgress() {
    try {
        await fetch(`/api/games/${gameData._id}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                levelId: currentLevel._id,
                score: currentScore
            })
        });
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

function cancelQuiz() {
    if (confirm('Tem certeza que deseja cancelar? Seu progresso será perdido.')) {
        backToLevels();
    }
}

function backToLevels() {
    document.getElementById('videoSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('levelsSection').style.display = 'grid';
    
    window.location.reload();
}