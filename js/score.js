/**
 * Модуль управления системой очков
 */

// Текущие очки игрока
let currentScore = 0;

// Очки за победу в раунде для каждого уровня
const SCORE_PER_LEVEL = {
    1: 50,   
    2: 100,  
    3: 200   
};

/**
 * Получить текущие очки
 * @returns {number} Текущие очки
 */
function getCurrentScore() {
    return currentScore;
}

/**
 * Начислить очки за победу в раунде
 * @param {number} level - Номер уровня (1-3)
 * @param {number|null} speedLevelIndex - Индекс уровня скорости (0-4 для уровней 1-2, null для уровня 3)
 * @returns {number} Начисленные очки
 */
function addScoreForWin(level, speedLevelIndex = null) {
    let points = 0;
    
    // Для уровней 1 и 2 очки зависят от уровня скорости
    if ((level === 1 || level === 2) && speedLevelIndex !== null && speedLevelIndex >= 0 && speedLevelIndex <= 4) {
        if (level === 1) {
            // Уровень 1: 25 * (индекс + 1) = 25, 50, 75, 100, 125
            points = 25 * (speedLevelIndex + 1);
        } else if (level === 2) {
            // Уровень 2: 150 + 25 * индекс = 150, 175, 200, 225, 250
            points = 150 + 25 * speedLevelIndex;
        }
    } else {
        // Для уровня 3 или если индекс не передан, используем фиксированные значения
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

/**
 * Сбросить очки
 */
function resetScore() {
    currentScore = 0;
    updateScoreDisplay();
}

/**
 * Вычесть очки (можно уйти в минус)
 * @param {number} points - Количество очков для вычитания
 * @returns {number} Вычтенные очки
 */
function subtractScore(points) {
    if (points > 0) {
        currentScore -= points;
        updateScoreDisplay();
        saveCurrentScore();
        return points;
    }
    return 0;
}

/**
 * Обновить отображение очков в UI
 */
function updateScoreDisplay() {
    const scoreElement = document.getElementById('currentScore');
    if (scoreElement) {
        scoreElement.textContent = currentScore;
    }
}

/**
 * Сохранение текущих очков в localStorage
 */
function saveCurrentScore() {
    try {
        localStorage.setItem('savedScore', currentScore.toString());
    } catch (error) {
        console.error('Ошибка при сохранении очков:', error);
    }
}

/**
 * Загрузка сохраненных очков из localStorage
 * @returns {number} Сохраненные очки или 0, если сохранение отсутствует
 */
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

/**
 * Очистка сохраненных очков из localStorage
 */
function clearSavedScore() {
    try {
        localStorage.removeItem('savedScore');
    } catch (error) {
        console.error('Ошибка при очистке очков:', error);
    }
}

/**
 * Инициализация системы очков
 */
function initScore() {
    // Восстанавливаем сохраненные очки
    currentScore = loadSavedScore();
    updateScoreDisplay();
}

// Экспорт для использования в других модулях
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

