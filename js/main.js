/**
 * Получает список всех имен из рейтинговой таблицы
 * @returns {Array<string>} Массив имен игроков
 */
function getExistingPlayerNames() {
    const leaderboard = getLeaderboard();
    return leaderboard.map(result => result.name).filter(name => name && name.trim() !== '');
}

/**
 * Проверяет, существует ли имя в рейтинговой таблице
 * @param {string} name - Имя для проверки
 * @returns {boolean} true, если имя уже существует
 */
function isNameInLeaderboard(name) {
    const existingNames = getExistingPlayerNames();
    return existingNames.some(existingName => 
        existingName.toLowerCase().trim() === name.toLowerCase().trim()
    );
}

/**
 * Показывает сообщение об ошибке
 * @param {string} message - Текст сообщения
 */
function showNameError(message) {
    const errorElement = document.getElementById('nameError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Скрывает сообщение об ошибке
 */
function hideNameError() {
    const errorElement = document.getElementById('nameError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Обработчик загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Получаем форму и поле ввода
    const startForm = document.getElementById('startForm');
    const playerNameInput = document.getElementById('playerName');

    // Предзаполняем поле имени, если есть сохраненное имя
    const lastPlayerName = localStorage.getItem('lastPlayerName');
    if (lastPlayerName && playerNameInput) {
        playerNameInput.value = lastPlayerName;
        // Проверяем предзаполненное имя на наличие в рейтинге
        if (isNameInLeaderboard(lastPlayerName)) {
            showNameError('Это имя уже занято, выбери другое имя');
        }
    }

    // Проверка имени в реальном времени при вводе
    if (playerNameInput) {
        playerNameInput.addEventListener('input', function() {
            const playerName = playerNameInput.value.trim();
            if (playerName === '') {
                hideNameError();
                return;
            }
            
            if (isNameInLeaderboard(playerName)) {
                showNameError('Это имя уже занято, выбери другое имя');
            } else {
                hideNameError();
            }
        });
    }

    // Навешиваем обработчик на отправку формы
    startForm.addEventListener('submit', function(event) {
        // Предотвращаем стандартное поведение формы
        event.preventDefault();

        // Получаем имя игрока
        const playerName = playerNameInput.value.trim();

        // Проверяем, что имя не пустое (на случай, если required не сработал)
        if (playerName === '') {
            alert('Пожалуйста, введите ваше имя');
            return;
        }

        // Проверяем, не используется ли имя в рейтинговой таблице
        if (isNameInLeaderboard(playerName)) {
            showNameError('Это имя уже занято, выбери другое имя');
            playerNameInput.focus();
            return;
        }

        // Проверяем, совпадает ли введенное имя с сохраненным
        const savedPlayerName = localStorage.getItem('currentPlayerName');
        
        // Если имя отличается от сохраненного, очищаем все данные игры
        if (savedPlayerName && savedPlayerName !== playerName) {
            // Очищаем все сохраненные данные игры
            localStorage.removeItem('savedLevel');
            localStorage.removeItem('savedRound');
            localStorage.removeItem('savedTotalRounds');
            localStorage.removeItem('savedLevelWins');
            localStorage.removeItem('savedLevelLosses');
            localStorage.removeItem('savedScore');
            // Очищаем сохраненное имя для повторной игры (новый игрок)
            localStorage.removeItem('lastPlayerName');
        } else if (savedPlayerName && savedPlayerName === playerName) {
            // Если имя совпадает, сохраняем его для повторной игры
            localStorage.setItem('lastPlayerName', playerName);
        } else {
            // Новый игрок - очищаем сохраненное имя
            localStorage.removeItem('lastPlayerName');
        }

        // Сохраняем имя в localStorage
        localStorage.setItem('currentPlayerName', playerName);

        // Переходим на страницу игры
        window.location.href = 'game.html';
    });

    // Обработчик кнопки просмотра рейтинга
    const viewRatingBtn = document.getElementById('viewRatingBtn');
    if (viewRatingBtn) {
        viewRatingBtn.addEventListener('click', function() {
            displayRatingModal();
        });
    }

    // Обработчик кнопки закрытия рейтинга
    const closeRatingBtn = document.getElementById('closeRatingBtn');
    if (closeRatingBtn) {
        closeRatingBtn.addEventListener('click', function() {
            closeRatingModal();
        });
    }

    // Закрытие модального окна при клике вне его
    const ratingModal = document.getElementById('ratingModal');
    if (ratingModal) {
        ratingModal.addEventListener('click', function(event) {
            if (event.target === ratingModal) {
                closeRatingModal();
            }
        });
    }
});

/**
 * Отображение модального окна с рейтингом
 */
function displayRatingModal() {
    const modal = document.getElementById('ratingModal');
    const tbody = document.getElementById('ratingTableBody');
    
    if (!modal || !tbody) return;
    
    // Получаем рейтинг
    const leaderboard = getLeaderboard();
    
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
    } else {
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
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

/**
 * Закрытие модального окна с рейтингом
 */
function closeRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

