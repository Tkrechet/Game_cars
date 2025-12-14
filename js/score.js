

let currentScore = 0;

const SCORE_PER_LEVEL = {
    1: 50,   
    2: 100,  
    3: 200   
};

function getCurrentScore() {
    return currentScore;
}

function addScoreForWin(level, speedLevelIndex = null) {
    let points = 0;

    if ((level === 1 || level === 2) && speedLevelIndex !== null && speedLevelIndex >= 0 && speedLevelIndex <= 4) {
        if (level === 1) {
            
            points = 25 * (speedLevelIndex + 1);
        } else if (level === 2) {
            
            points = 150 + 25 * speedLevelIndex;
        }
    } else {
        
        points = SCORE_PER_LEVEL[level] || 0;
    }
    
    if (points > 0) {
        currentScore += points;
        updateScoreDisplay();
        saveCurrentScore();
        return points;
    }
    return 0;
}

function resetScore() {
    currentScore = 0;
    updateScoreDisplay();
}

function subtractScore(points) {
    if (points > 0) {
        currentScore -= points;
        updateScoreDisplay();
        saveCurrentScore();
        return points;
    }
    return 0;
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('currentScore');
    if (scoreElement) {
        scoreElement.textContent = currentScore;
    }
}

function saveCurrentScore() {
    try {
        localStorage.setItem('savedScore', currentScore.toString());
    } catch (error) {
        console.error('Ошибка при сохранении очков:', error);
    }
}

function loadSavedScore() {
    try {
        const savedScore = localStorage.getItem('savedScore');
        if (savedScore !== null) {
            return parseInt(savedScore, 10);
        }
    } catch (error) {
        console.error('Ошибка при загрузке очков:', error);
    }
    return 0;
}

function clearSavedScore() {
    try {
        localStorage.removeItem('savedScore');
    } catch (error) {
        console.error('Ошибка при очистке очков:', error);
    }
}

function initScore() {
    
    currentScore = loadSavedScore();
    updateScoreDisplay();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentScore,
        addScoreForWin,
        resetScore,
        subtractScore,
        updateScoreDisplay,
        initScore,
        saveCurrentScore,
        loadSavedScore,
        clearSavedScore
    };
}

