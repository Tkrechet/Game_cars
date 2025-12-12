/**
 * Модуль отображения таблицы рейтингов
 */

/**
 * Инициализация страницы результатов
 */
function initResults() {
    displayLeaderboard();
    setupEventHandlers();
}

/**
 * Отображение таблицы лидеров
 */
function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    const tbody = document.getElementById('resultsTableBody');
    
    if (!tbody) return;
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        // Если результатов нет, показываем сообщение
        const row = document.createElement('tr');
        row.className = 'no-results-row';
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'Пока нет результатов. Будьте первым!';
        cell.style.textAlign = 'center';
        cell.style.padding = '30px';
        cell.style.color = 'var(--text-muted)';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    // Отображаем результаты
    leaderboard.forEach((result, index) => {
        const row = document.createElement('tr');
        row.className = index < 3 ? 'top-player' : '';
        
        // Место
        const placeCell = document.createElement('td');
        placeCell.className = 'place-cell';
        placeCell.textContent = index + 1;
        if (index === 0) {
            placeCell.innerHTML = '🥇';
        } else if (index === 1) {
            placeCell.innerHTML = '🥈';
        } else if (index === 2) {
            placeCell.innerHTML = '🥉';
        }
        row.appendChild(placeCell);
        
        // Имя игрока
        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.textContent = result.name || 'Неизвестный игрок';
        row.appendChild(nameCell);
        
        // Очки
        const scoreCell = document.createElement('td');
        scoreCell.className = 'score-cell';
        scoreCell.textContent = result.score || 0;
        row.appendChild(scoreCell);
        
        // Время
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        const timeSpent = result.timeSpent || 0;
        const minutes = Math.floor(timeSpent / 60);
        const seconds = Math.floor(timeSpent % 60);
        timeCell.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        row.appendChild(timeCell);
        
        // Уровень
        const levelCell = document.createElement('td');
        levelCell.className = 'level-cell';
        levelCell.textContent = result.levelReached || 1;
        row.appendChild(levelCell);
        
        tbody.appendChild(row);
    });
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Кнопка игры снова (тем же игроком)
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            // Получаем сохраненное имя игрока
            const lastPlayerName = localStorage.getItem('lastPlayerName');
            
            if (lastPlayerName) {
                // Очищаем все данные игры (уровень, раунд, очки и т.д.)
                localStorage.removeItem('savedLevel');
                localStorage.removeItem('savedRound');
                localStorage.removeItem('savedTotalRounds');
                localStorage.removeItem('savedLevelWins');
                localStorage.removeItem('savedLevelLosses');
                localStorage.removeItem('savedScore');
                
                // Устанавливаем имя текущего игрока
                localStorage.setItem('currentPlayerName', lastPlayerName);
                
                // Переходим на страницу игры
                window.location.href = 'game.html';
            } else {
                // Если имя не сохранено, переходим на главную страницу
                window.location.href = 'index.html';
            }
        });
        
        // Скрываем кнопку, если нет сохраненного имени
        const lastPlayerName = localStorage.getItem('lastPlayerName');
        if (!lastPlayerName) {
            playAgainBtn.style.display = 'none';
        }
    }
    
    // Кнопка новой игры
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            // Очищаем сохраненное имя для создания нового игрока
            localStorage.removeItem('lastPlayerName');
            window.location.href = 'index.html';
        });
    }
    
    // Кнопка очистки результатов
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить все результаты?')) {
                localStorage.removeItem('carsGameResults');
                displayLeaderboard();
            }
        });
    }
}

/**
 * Инициализация при загрузке страницы
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResults);
} else {
    initResults();
}

