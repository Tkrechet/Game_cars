/**
 * Модуль управления пользовательским интерфейсом
 * Интегрирует GameRenderer с UI элементами
 */

let gameRenderer = null;
let currentLevel = 1;

/**
 * Сохранение текущего уровня в localStorage
 * @param {number} level - Номер уровня
 */
function saveCurrentLevel(level) {
    try {
        localStorage.setItem('savedLevel', level.toString());
    } catch (error) {
        console.error('Ошибка при сохранении уровня:', error);
    }
}

/**
 * Загрузка сохраненного уровня из localStorage
 * @returns {number} Номер уровня или 1, если сохранение отсутствует
 */
function loadSavedLevel() {
    try {
        const savedLevel = localStorage.getItem('savedLevel');
        if (savedLevel) {
            const level = parseInt(savedLevel, 10);
            // Проверяем, что уровень валидный (1-3)
            if (level >= 1 && level <= 3 && LEVELS_CONFIG[level]) {
                return level;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке уровня:', error);
    }
    return 1;
}

/**
 * Очистка сохраненного уровня из localStorage
 */
function clearSavedLevel() {
    try {
        localStorage.removeItem('savedLevel');
        localStorage.removeItem('savedRound');
        localStorage.removeItem('savedTotalRounds');
        localStorage.removeItem('savedLevelWins');
        localStorage.removeItem('savedLevelLosses');
        // Очищаем сохраненные очки
        clearSavedScore();
    } catch (error) {
        console.error('Ошибка при очистке уровня:', error);
    }
}

/**
 * Сохранение состояния раунда в localStorage
 */
function saveRoundState() {
    try {
        localStorage.setItem('savedRound', GameState.currentRound.toString());
        localStorage.setItem('savedTotalRounds', GameState.totalRounds.toString());
        localStorage.setItem('savedLevelWins', GameState.levelWins.toString());
        localStorage.setItem('savedLevelLosses', GameState.levelLosses.toString());
    } catch (error) {
        console.error('Ошибка при сохранении состояния раунда:', error);
    }
}

/**
 * Загрузка сохраненного состояния раунда из localStorage
 * @returns {Object|null} Объект с состоянием или null, если сохранение отсутствует
 */
function loadRoundState() {
    try {
        const savedRound = localStorage.getItem('savedRound');
        const savedTotalRounds = localStorage.getItem('savedTotalRounds');
        const savedLevelWins = localStorage.getItem('savedLevelWins');
        const savedLevelLosses = localStorage.getItem('savedLevelLosses');
        
        if (savedRound && savedTotalRounds) {
            return {
                currentRound: parseInt(savedRound, 10),
                totalRounds: parseInt(savedTotalRounds, 10),
                levelWins: savedLevelWins ? parseInt(savedLevelWins, 10) : 0,
                levelLosses: savedLevelLosses ? parseInt(savedLevelLosses, 10) : 0
            };
        }
    } catch (error) {
        console.error('Ошибка при загрузке состояния раунда:', error);
    }
    return null;
}

/**
 * Конвертация скорости из px/s в km/h
 * @param {number} pxPerSecond - Скорость в пикселях в секунду
 * @returns {number} Скорость в километрах в час
 */
function convertPxToKmh(pxPerSecond) {
    // Используем соотношение: 1 пиксель = 0.1 метра
    // px/s * 0.1 м/px * 3.6 (км/ч)/(м/с) = px/s * 0.36 км/ч
    // Для более реалистичных значений используем коэффициент 0.5
    return Math.round(pxPerSecond * 0.5);
}

/**
 * Инициализация игры
 */
async function initGame() {
    try {
        // Проверяем наличие имени игрока
        const playerName = localStorage.getItem('currentPlayerName');
        if (!playerName) {
            // Если имени нет, перенаправляем на страницу авторизации
            window.location.href = 'index.html';
            return;
        }
        
        // Восстанавливаем сохраненный уровень
        currentLevel = loadSavedLevel();
        
        // Если нет сохраненного уровня, сбрасываем очки (новая игра)
        const hasSavedLevel = localStorage.getItem('savedLevel');
        if (!hasSavedLevel) {
            resetScore();
            clearSavedScore();
        } else {
            // Инициализируем систему очков (загружает сохраненные очки, если есть)
            initScore();
        }

        // Создаём рендерер игры
        gameRenderer = new GameRenderer('gameCanvas');

        // Загружаем изображения для текущего уровня
        const levelConfig = LEVELS_CONFIG[currentLevel];
        await gameRenderer.loadLevelImages(levelConfig);

        // Загружаем сохраненное состояние раунда
        const savedRoundState = loadRoundState();
        
        // Инициализируем уровень с восстановлением состояния, если оно есть
        GameState.initLevel(currentLevel, savedRoundState);
        
        // Сохраняем уровень и состояние раунда при инициализации (на случай перезагрузки страницы)
        saveCurrentLevel(currentLevel);
        saveRoundState();

        // Обновляем UI
        updateLevelUI();
        showLevelControls();

        // Настраиваем обработчики событий
        setupEventHandlers();

        // Запускаем игровой цикл
        gameRenderer.start();

        // Начинаем первый раунд
        startNewRound();
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        alert('Ошибка загрузки игры: ' + error.message);
    }
}

/**
 * Обновление UI уровня
 */
function updateLevelUI() {
    const levelConfig = GameState.getCurrentLevelConfig();
    
    document.getElementById('currentLevel').textContent = GameState.currentLevel;
    document.getElementById('currentRound').textContent = GameState.currentRound;
    document.getElementById('totalRounds').textContent = GameState.totalRounds;
    document.getElementById('levelTitle').textContent = levelConfig.name;
    document.getElementById('levelDesc').textContent = levelConfig.description;
    
    // Показываем/скрываем прогресс-бар в зависимости от уровня
    updateProgressBarVisibility();
}

/**
 * Обновление видимости прогресс-бара
 */
function updateProgressBarVisibility() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    if (progressBarContainer) {
        // Показываем прогресс-бар только на уровнях 2 и 3
        if (GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            progressBarContainer.style.display = 'block';
        } else {
            progressBarContainer.style.display = 'none';
        }
    }
}

/**
 * Обновление прогресс-бара до финиша
 */
function updateProgressBar() {
    // Показываем прогресс-бар только на уровнях 2 и 3
    if (GameState.currentLevel !== 2 && GameState.currentLevel !== 3) {
        return;
    }
    
    if (!gameRenderer || !gameRenderer.currentRoundParams) {
        return;
    }
    
    // Находим машину игрока
    const mouseCar = gameRenderer.currentRoundParams.cars.find(car => car.isControlledByMouse);
    if (!mouseCar) {
        return;
    }
    
    // Получаем прогресс (от 0 до 1)
    const progress = Math.min(Math.max(mouseCar.progress || 0, 0), 1);
    const percent = Math.round(progress * 100);
    
    // Обновляем прогресс-бар
    const progressBarFill = document.getElementById('progressBarFill');
    const progressBarPercent = document.getElementById('progressBarPercent');
    
    if (progressBarFill) {
        progressBarFill.style.width = `${percent}%`;
    }
    
    if (progressBarPercent) {
        progressBarPercent.textContent = `${percent}%`;
    }
}

/**
 * Показ элементов управления в зависимости от уровня
 */
function showLevelControls() {
    // Показываем единую панель для всех уровней
    const controlsLevel3 = document.getElementById('controlsLevel3');
    if (controlsLevel3) {
        controlsLevel3.style.display = 'block';
    }
    
    // Обновляем отображение информации о времени в зависимости от уровня
    const targetTimeDisplay = document.getElementById('targetTimeDisplay');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const timeLabel = controlsLevel3 ? controlsLevel3.querySelector('p:first-of-type') : null;
    
    if (GameState.currentLevel === 2) {
        // Для уровня 2 скрываем информацию о времени
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'none';
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'none';
        }
        if (timeLabel) {
            timeLabel.textContent = 'Перемещайте мышь по дорожке, чтобы вести машину к финишу';
        }
    } else if (GameState.currentLevel === 3) {
        // Для уровня 3 показываем информацию о целевом времени
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'block';
            // targetTime будет обновлен в updateControlsForRound из roundParams
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'block';
            currentTimeDisplay.textContent = '0.0';
        }
        if (timeLabel) {
            timeLabel.textContent = 'Доберитесь до финиша за целевое время!';
        }
    } else {
        // Для уровня 1 показываем информацию о времени
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'block';
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'block';
        }
        if (timeLabel) {
            timeLabel.textContent = 'Перемещайте мышь по дорожке, чтобы вести машину';
        }
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Обработчик для всех уровней: начало игры
    const startLevel3Btn = document.getElementById('startLevel3Btn');
    if (startLevel3Btn) {
        startLevel3Btn.addEventListener('click', handleStartGame);
    }

    // Обработчик движения мыши для всех уровней
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
    }

    // Обработчик завершения уровня
    const endLevelBtn = document.getElementById('endLevelBtn');
    if (endLevelBtn) {
        endLevelBtn.addEventListener('click', handleEndLevel);
    }

    // Обработчик следующего раунда
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    if (nextRoundBtn) {
        nextRoundBtn.addEventListener('click', handleNextRound);
    }

    // Обработчик следующего уровня
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', handleNextLevel);
    }

    // Обработчик перехода к рейтингу
    const toRatingBtn = document.getElementById('toRatingBtn');
    if (toRatingBtn) {
        toRatingBtn.addEventListener('click', handleToRating);
    }
}

/**
 * Обработчик начала игры (для всех уровней)
 */
function handleStartGame() {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    const roundParams = gameRenderer.currentRoundParams;
    
    // Для уровня 1 требуется время, для уровня 2 и 3 - нет
    if (GameState.currentLevel === 1) {
        if (!roundParams.selectedTime || roundParams.selectedTime === 0) {
            alert('Пожалуйста, выберите время управления');
            return;
        }
    }
    
    // Для уровня 1 и 2 требуется скорость, для уровня 3 - нет
    if (GameState.currentLevel === 1 || GameState.currentLevel === 2) {
        if (!roundParams.selectedSpeed || roundParams.selectedSpeed === 0) {
            alert('Пожалуйста, выберите скорость автоматической машины');
            return;
        }
    }
    
    // Получаем машины
    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const mouseCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    if (!mouseCar) return;
    
    // Для уровня 1 и 2 запускаем автоматическую машину
    if (GameState.currentLevel === 1 || GameState.currentLevel === 2) {
        if (!autoCar) return;
        // Устанавливаем выбранную скорость автоматической машине
        autoCar.speed = roundParams.selectedSpeed;
        // Запускаем автоматическую машину
        autoCar.start();
    }
    
    // Запускаем машину, управляемую мышкой
    mouseCar.start();
    mouseCar.startTime = Date.now();
    
    // Для уровня 3 запускаем таймер для отображения текущего времени
    if (GameState.currentLevel === 3) {
        startLevel3Timer();
    }
    
    // Отключаем кнопку
    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Игра началась';
    }
    
    // Для уровня 1 запускаем таймер для проверки результата по времени
    // Для уровня 2 и 3 проверка происходит при достижении финиша
    if (GameState.currentLevel === 1 && roundParams.selectedTime) {
        startGameTimer(roundParams.selectedTime, roundParams);
    }
}

/**
 * Таймер для игры
 */
function startGameTimer(targetTime, roundParams) {
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = targetTime - elapsed;
        
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = elapsed.toFixed(1);
        }
        
        // Для уровня 1 проверяем результат по истечении времени
        // Для уровня 2 проверка происходит при достижении финиша
        if (GameState.currentLevel === 1 && elapsed >= targetTime) {
            clearInterval(timerInterval);
            checkGameResult(roundParams);
        }
    }, 100);
}

/**
 * Проверка результата игры (для уровня 1)
 */
function checkGameResult(roundParams) {
    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const mouseCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    // Останавливаем машины
    if (autoCar && autoCar.isMoving) {
        autoCar.stop();
    }
    if (mouseCar && mouseCar.isMoving) {
        mouseCar.stop();
    }
    
    // Проверяем победу: наша машина должна быть правее автоматической
    const isWin = gameRenderer.checkWin();
    
    const autoX = autoCar.x.toFixed(1);
    const mouseX = mouseCar.x.toFixed(1);
    
    // Находим индекс выбранной скорости для уровней 1 и 2
    let speedLevelIndex = null;
    if ((GameState.currentLevel === 1 || GameState.currentLevel === 2) && roundParams.selectedSpeed) {
        const speedIndex = roundParams.speedOptions.indexOf(roundParams.selectedSpeed);
        if (speedIndex !== -1) {
            speedLevelIndex = speedIndex;
        }
    }
    
    showRoundResult(
        isWin,
        `Автоматическая машина: ${autoX} px, Ваша машина: ${mouseX} px`,
        isWin ? 'Победа! Вы обогнали автоматическую машину!' : 'Вы не обогнали автоматическую машину',
        speedLevelIndex
    );
}

/**
 * Таймер для уровня 3 (отображение текущего времени)
 */
let level3TimerInterval = null;

function startLevel3Timer() {
    // Останавливаем предыдущий таймер, если он был
    if (level3TimerInterval) {
        clearInterval(level3TimerInterval);
    }
    
    const startTime = Date.now();
    level3TimerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = elapsed.toFixed(1);
        }
    }, 100);
}

function stopLevel3Timer() {
    if (level3TimerInterval) {
        clearInterval(level3TimerInterval);
        level3TimerInterval = null;
    }
}

/**
 * Проверка результата при достижении финиша (для уровня 2)
 * @param {RoundParams} roundParams - Параметры раунда
 * @param {boolean} playerWon - true, если игрок достиг финиша первым
 */
function checkFinishResult(roundParams, playerWon) {
    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const mouseCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    const autoX = autoCar.x.toFixed(1);
    const mouseX = mouseCar.x.toFixed(1);
    
    // Находим индекс выбранной скорости для уровней 1 и 2
    let speedLevelIndex = null;
    if ((GameState.currentLevel === 1 || GameState.currentLevel === 2) && roundParams.selectedSpeed) {
        const speedIndex = roundParams.speedOptions.indexOf(roundParams.selectedSpeed);
        if (speedIndex !== -1) {
            speedLevelIndex = speedIndex;
        }
    }
    
    if (playerWon) {
        showRoundResult(
            true,
            `Вы достигли финиша первым!`,
            `Автоматическая машина: ${autoX} px, Ваша машина: ${mouseX} px`,
            speedLevelIndex
        );
    } else {
        showRoundResult(
            false,
            `Автоматическая машина достигла финиша первой`,
            `Автоматическая машина: ${autoX} px, Ваша машина: ${mouseX} px`,
            speedLevelIndex
        );
    }
}

/**
 * Проверка результата при достижении финиша (для уровня 3)
 * @param {RoundParams} roundParams - Параметры раунда
 * @param {boolean} isWin - true, если время попало в допустимый диапазон
 * @param {number} finishTime - Время достижения финиша в секундах
 * @param {number} targetTime - Целевое время в секундах
 * @param {number} tolerance - Допустимое отклонение в секундах
 */
function checkFinishResultLevel3(roundParams, isWin, finishTime, targetTime, tolerance) {
    // Останавливаем таймер
    stopLevel3Timer();
    
    const minTime = targetTime - tolerance;
    const maxTime = targetTime + tolerance;
    
    // Для уровня 3 индекс скорости не используется (передаем null)
    if (isWin) {
        showRoundResult(
            true,
            `Победа! Вы достигли финиша за ${finishTime.toFixed(2)} сек (целевое время: ${targetTime} ± ${tolerance} сек)`,
            `Время: ${finishTime.toFixed(2)} сек (допустимый диапазон: ${minTime.toFixed(1)} - ${maxTime.toFixed(1)} сек)`,
            null
        );
    } else {
        let reason = '';
        if (finishTime < minTime) {
            reason = `Вы пришли слишком рано (${finishTime.toFixed(2)} сек < ${minTime.toFixed(1)} сек)`;
        } else {
            reason = `Вы пришли слишком поздно (${finishTime.toFixed(2)} сек > ${maxTime.toFixed(1)} сек)`;
        }
        showRoundResult(
            false,
            `Проигрыш! ${reason}`,
            `Время: ${finishTime.toFixed(2)} сек (допустимый диапазон: ${minTime.toFixed(1)} - ${maxTime.toFixed(1)} сек)`,
            null
        );
    }
}

/**
 * Обработчик движения мыши по canvas (для всех уровней)
 */
function handleCanvasMouseMove(event) {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    gameRenderer.handleMouseMove(mouseX, mouseY);
}

/**
 * Обработчик завершения уровня
 */
function handleEndLevel() {
    // Для всех уровней (1, 2, 3) проверяем, можно ли завершить досрочно
    if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
        if (GameState.levelWins === 0) {
            alert('Вы не можете завершить уровень досрочно, пока не выиграете хотя бы один раунд!');
            return;
        }
    }
    
    // Завершаем уровень
    GameState.endLevel();
    
    // Останавливаем машины, если они движутся
    if (gameRenderer && gameRenderer.currentRoundParams) {
        gameRenderer.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });
    }
    
    // Показываем модальное окно завершения уровня
    showLevelComplete();
}

/**
 * Обработчик следующего раунда
 */
function handleNextRound() {
    // Скрываем результат раунда
    document.getElementById('roundResult').style.display = 'none';

    // Генерируем новый раунд
    startNewRound();
}

/**
 * Начало нового раунда
 */
function startNewRound() {
    if (GameState.isLevelComplete()) {
        // Уровень завершён
        showLevelComplete();
        return;
    }
    
    // Останавливаем таймер уровня 3, если он запущен
    stopLevel3Timer();
    
    // Сбрасываем отображение времени для уровня 3
    if (GameState.currentLevel === 3) {
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = '0.0';
        }
    }

    // Генерируем параметры раунда
    const roundParams = new RoundParams();
    roundParams.generate(GameState.currentLevel);

    // Инициализируем раунд в рендерере
    gameRenderer.initRound(roundParams);

    // Начинаем раунд
    GameState.startRound();
    
    // Сохраняем состояние раунда
    saveRoundState();

    // Обновляем UI
    updateLevelUI();

    // Обновляем элементы управления в зависимости от уровня
    updateControlsForRound(roundParams);
    
    // Сбрасываем прогресс-бар
    resetProgressBar();
}

/**
 * Сброс прогресс-бара
 */
function resetProgressBar() {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressBarPercent = document.getElementById('progressBarPercent');
    
    if (progressBarFill) {
        progressBarFill.style.width = '0%';
    }
    
    if (progressBarPercent) {
        progressBarPercent.textContent = '0%';
    }
}

/**
 * Обновление элементов управления для раунда
 */
function updateControlsForRound(roundParams) {
    // Для всех уровней: выбор времени управления
    updateTimeSelection(roundParams);
    
    // Для уровня 3 обновляем отображение целевого времени
    if (GameState.currentLevel === 3) {
        const targetTimeDisplay = document.getElementById('targetTimeDisplay');
        if (targetTimeDisplay && roundParams.targetTime) {
            const levelConfig = LEVELS_CONFIG[3];
            const tolerance = levelConfig.mechanics.timeTolerance;
            targetTimeDisplay.textContent = `${roundParams.targetTime} ± ${tolerance}`;
        }
    }
}

/**
 * Обновление выбора времени для всех уровней
 */
function updateTimeSelection(roundParams) {
    // Сбрасываем выбранное время и скорость
    roundParams.selectedTime = 0;
    roundParams.selectedSpeed = 0;
    
    const timeContainer = document.querySelector('.mouse-control-info');
    if (!timeContainer) return;
    
    // Очищаем контейнер (кроме кнопки запуска)
    const existingTimeSelection = timeContainer.querySelector('.time-selection');
    if (existingTimeSelection) {
        existingTimeSelection.remove();
    }
    const existingSpeedSelection = timeContainer.querySelector('.speed-selection');
    if (existingSpeedSelection) {
        existingSpeedSelection.remove();
    }
    
    // Для уровня 1 и 2 создаем выбор скорости для автоматической машины
    if (GameState.currentLevel === 1 || GameState.currentLevel === 2) {
        const speedSelectionDiv = document.createElement('div');
        speedSelectionDiv.className = 'speed-selection';
        speedSelectionDiv.innerHTML = '<p class="control-label">Выберите скорость автоматической машины:</p>';
        
        const speedButtonsDiv = document.createElement('div');
        speedButtonsDiv.className = 'speed-options';
        speedButtonsDiv.style.marginBottom = '20px';
        
        roundParams.speedOptions.forEach((speed) => {
            const btn = document.createElement('button');
            btn.className = 'speed-option-btn';
            const speedKmh = convertPxToKmh(speed);
            btn.textContent = `${speedKmh} km/h`;
            btn.addEventListener('click', () => {
                // Убираем выделение с других кнопок
                speedButtonsDiv.querySelectorAll('.speed-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Устанавливаем скорость
                roundParams.selectedSpeed = speed;
                
                // Проверяем, можно ли включить кнопку запуска
                checkStartButtonState(roundParams);
            });
            speedButtonsDiv.appendChild(btn);
        });
        
        speedSelectionDiv.appendChild(speedButtonsDiv);
        
        // Вставляем перед кнопкой запуска
        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            timeContainer.insertBefore(speedSelectionDiv, startBtn);
        } else {
            timeContainer.appendChild(speedSelectionDiv);
        }
    }
    
    // Для уровня 1 создаем выбор времени, для уровня 2 и 3 - нет
    if (GameState.currentLevel === 1) {
        const timeSelectionDiv = document.createElement('div');
        timeSelectionDiv.className = 'time-selection';
        timeSelectionDiv.innerHTML = '<p class="control-label">Выберите время управления мышкой:</p>';
        
        const timeButtonsDiv = document.createElement('div');
        timeButtonsDiv.className = 'time-options';
        timeButtonsDiv.style.marginBottom = '20px';
        
        roundParams.timeOptions.forEach((time) => {
            const btn = document.createElement('button');
            btn.className = 'time-option-btn';
            btn.textContent = `${time.toFixed(1)} сек`;
            btn.addEventListener('click', () => {
                // Убираем выделение с других кнопок
                timeButtonsDiv.querySelectorAll('.time-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Устанавливаем время
                roundParams.selectedTime = time;
                
                // Обновляем отображение целевого времени
                const targetTimeDisplay = document.getElementById('targetTimeDisplay');
                if (targetTimeDisplay) {
                    targetTimeDisplay.textContent = time.toFixed(1);
                }
                
                // Проверяем, можно ли включить кнопку запуска
                checkStartButtonState(roundParams);
            });
            timeButtonsDiv.appendChild(btn);
        });
        
        timeSelectionDiv.appendChild(timeButtonsDiv);
        
        // Вставляем перед кнопкой запуска
        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            timeContainer.insertBefore(timeSelectionDiv, startBtn);
        } else {
            timeContainer.appendChild(timeSelectionDiv);
        }
    }
    
    // Отключаем кнопку запуска до выбора скорости (и времени для уровня 1)
    // Для уровня 3 кнопка доступна сразу
    const startBtn2 = document.getElementById('startLevel3Btn');
    if (startBtn2) {
        if (GameState.currentLevel === 3) {
            startBtn2.disabled = false;
        } else {
            startBtn2.disabled = true;
        }
    }
}

/**
 * Проверка состояния кнопки запуска (включена, если выбраны время и скорость)
 */
function checkStartButtonState(roundParams) {
    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        // Для уровня 1 требуется время и скорость, для уровня 2 - только скорость, для уровня 3 - ничего не требуется
        if (GameState.currentLevel === 1) {
            startBtn.disabled = !(roundParams.selectedTime > 0 && roundParams.selectedSpeed > 0);
        } else if (GameState.currentLevel === 2) {
            startBtn.disabled = !(roundParams.selectedSpeed > 0);
        } else {
            // Уровень 3 - кнопка всегда доступна
            startBtn.disabled = false;
        }
    }
}


/**
 * Показ результата раунда
 */
function showRoundResult(isCorrect, message, details, speedLevelIndex = null) {
    // Останавливаем таймер уровня 3, если он запущен
    if (GameState.currentLevel === 3) {
        stopLevel3Timer();
    }
    
    const resultDiv = document.getElementById('roundResult');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const resultScoreValue = document.getElementById('resultScoreValue');

    if (isCorrect) {
        // Начисляем очки за победу в раунде
        const pointsEarned = addScoreForWin(GameState.currentLevel, speedLevelIndex);
        resultTitle.textContent = 'Правильно!';
        resultMessage.textContent = message;
        resultScoreValue.textContent = pointsEarned;
        // Увеличиваем счетчик побед на уровне
        GameState.levelWins++;
    } else {
        resultTitle.textContent = 'Неправильно';
        resultMessage.textContent = message;
        if (details) {
            resultMessage.textContent += ` (${details})`;
        }
        resultScoreValue.textContent = '0';
        // Увеличиваем счетчик поражений на уровне
        GameState.levelLosses++;
    }

    resultDiv.style.display = 'flex';
    
    // Завершаем раунд
    GameState.endRound();
    
    // Сохраняем состояние раунда
    saveRoundState();
}

/**
 * Показ модального окна завершения уровня
 */
function showLevelComplete() {
    const modal = document.getElementById('levelCompleteModal');
    const title = document.getElementById('levelCompleteTitle');
    const message = document.getElementById('levelCompleteMessage');
    const nextLevelBtn = document.getElementById('nextLevelBtn');

    title.textContent = `Уровень ${GameState.currentLevel} завершён!`;
    
    // Проверяем результат уровня
    const nextLevel = GameState.currentLevel + 1;
    
    // Для всех уровней (1, 2, 3) проверяем условие списания очков
    // Если нет ни одной победы, вычитаем очки
    if (GameState.levelWins === 0) {
        const pointsLost = subtractScore(100);
        if (GameState.levelLosses > 0) {
            message.textContent = `Вы проиграли все раунды на уровне ${GameState.currentLevel}. С вас списано ${pointsLost} очков.`;
        } else {
            message.textContent = `Вы завершили уровень ${GameState.currentLevel}, но не выиграли ни одного раунда. С вас списано ${pointsLost} очков.`;
        }
    } else {
        // Есть хотя бы одна победа
        message.textContent = `Вы завершили уровень ${GameState.currentLevel}. Побед: ${GameState.levelWins}, поражений: ${GameState.levelLosses}.`;
    }
    
    // Всегда разрешаем переход на следующий уровень, если он существует
    if (LEVELS_CONFIG[nextLevel]) {
        nextLevelBtn.style.display = 'inline-block';
        nextLevelBtn.textContent = 'Следующий уровень';
    } else {
        nextLevelBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

/**
 * Обработчик перехода на следующий уровень
 */
function handleNextLevel() {
    const nextLevel = GameState.currentLevel + 1;
    
    // Проверяем, есть ли следующий уровень
    if (!LEVELS_CONFIG[nextLevel]) {
        // Если следующего уровня нет, сохраняем результат и переходим к рейтингу
        saveGameResult();
        // Очищаем сохраненный уровень при завершении игры
        clearSavedLevel();
        // Очищаем имя игрока при завершении игры
        localStorage.removeItem('currentPlayerName');
        window.location.href = 'results.html';
        return;
    }

    // Скрываем модальное окно
    const modal = document.getElementById('levelCompleteModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Скрываем результат раунда, если он открыт
    const roundResult = document.getElementById('roundResult');
    if (roundResult) {
        roundResult.style.display = 'none';
    }

    // Переходим на следующий уровень
    currentLevel = nextLevel;
    // При переходе на новый уровень начинаем с первого раунда (без сохраненного состояния)
    GameState.initLevel(nextLevel);
    
    // Сохраняем новый уровень и состояние раунда
    saveCurrentLevel(nextLevel);
    saveRoundState();

    // Сбрасываем очки при переходе на новый уровень (или оставляем накопленные - по желанию)
    // resetScore(); // Раскомментируйте, если нужно сбрасывать очки между уровнями

    // Загружаем изображения для нового уровня
    const levelConfig = LEVELS_CONFIG[nextLevel];
    gameRenderer.loadLevelImages(levelConfig).then(() => {
        // Сбрасываем состояние кнопки "Начать"
        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            startBtn.textContent = 'Начать';
            // Для уровня 3 кнопка доступна сразу
            if (nextLevel === 3) {
                startBtn.disabled = false;
            } else {
                startBtn.disabled = true;
            }
        }

        // Обновляем UI
        updateLevelUI();
        showLevelControls();
        
        // Обновляем видимость прогресс-бара
        updateProgressBarVisibility();

        // Начинаем первый раунд нового уровня
        startNewRound();
    }).catch(error => {
        console.error('Ошибка загрузки уровня:', error);
        alert('Ошибка загрузки уровня: ' + error.message);
    });
}

/**
 * Обработчик перехода к рейтингу
 */
function handleToRating() {
    // Сохраняем результат игрока перед переходом
    saveGameResult();
    
    // Сохраняем имя игрока для возможности повторной игры
    const playerName = localStorage.getItem('currentPlayerName');
    if (playerName) {
        localStorage.setItem('lastPlayerName', playerName);
    }
    
    // Очищаем сохраненный уровень при завершении игры
    clearSavedLevel();
    
    // Очищаем имя текущего игрока (оставляем lastPlayerName для повторной игры)
    localStorage.removeItem('currentPlayerName');
    
    // Переходим на страницу результатов
    window.location.href = 'results.html';
}

/**
 * Сохранение результата игрока
 */
function saveGameResult() {
    try {
        // Получаем имя игрока из localStorage
        const playerName = localStorage.getItem('currentPlayerName') || 'Неизвестный игрок';
        
        // Получаем текущие очки
        const finalScore = getCurrentScore();
        
        // Вычисляем затраченное время (от начала первого уровня до текущего момента)
        let timeSpent = 0;
        if (GameState.levelStartTime) {
            timeSpent = (Date.now() - GameState.levelStartTime) / 1000; // В секундах
        }
        
        // Получаем достигнутый уровень
        const levelReached = GameState.currentLevel;
        
        // Сохраняем результат
        savePlayerResult(playerName, finalScore, timeSpent, levelReached);
        
        // Имя игрока НЕ удаляем здесь - оно будет удалено только при переходе к рейтингу
    } catch (error) {
        console.error('Ошибка при сохранении результата:', error);
    }
}

/**
 * Инициализация при загрузке страницы
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

