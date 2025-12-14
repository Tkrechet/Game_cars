

function initResults() {
    displayLeaderboard();
    setupEventHandlers();
}

function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    const tbody = document.getElementById('resultsTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        
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

    leaderboard.forEach((result, index) => {
        const row = document.createElement('tr');
        row.className = index < 3 ? 'top-player' : '';

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

        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.textContent = result.name || 'Неизвестный игрок';
        row.appendChild(nameCell);

        const scoreCell = document.createElement('td');
        scoreCell.className = 'score-cell';
        scoreCell.textContent = result.score || 0;
        row.appendChild(scoreCell);

        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        const timeSpent = result.timeSpent || 0;
        const minutes = Math.floor(timeSpent / 60);
        const seconds = Math.floor(timeSpent % 60);
        timeCell.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        row.appendChild(timeCell);

        const levelCell = document.createElement('td');
        levelCell.className = 'level-cell';
        levelCell.textContent = result.levelReached || 1;
        row.appendChild(levelCell);
        
        tbody.appendChild(row);
    });
}

function setupEventHandlers() {
    
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            
            const lastPlayerName = localStorage.getItem('lastPlayerName');
            
            if (lastPlayerName) {
                
                localStorage.removeItem('savedLevel');
                localStorage.removeItem('savedRound');
                localStorage.removeItem('savedTotalRounds');
                localStorage.removeItem('savedLevelWins');
                localStorage.removeItem('savedLevelLosses');
                localStorage.removeItem('savedScore');

                localStorage.setItem('currentPlayerName', lastPlayerName);

                window.location.href = 'game.html';
            } else {
                
                window.location.href = 'index.html';
            }
        });

        const lastPlayerName = localStorage.getItem('lastPlayerName');
        if (!lastPlayerName) {
            playAgainBtn.style.display = 'none';
        }
    }

    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            
            localStorage.removeItem('lastPlayerName');
            window.location.href = 'index.html';
        });
    }

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResults);
} else {
    initResults();
}

