/**
 * Модуль управления пользовательским интерфейсом
 * Интегрирует GameRenderer с UI элементами
 */

let gameRenderer = null;
let currentLevel = 1;

const RUN_START_TIME_KEY = 'carsGameRunStartTime';

/**
 * Сохранение времени начала забега
 * @param {number} timestampMs - Метка времени в миллисекундах
 */
function saveRunStartTime(timestampMs) {
    try {
        localStorage.setItem(RUN_START_TIME_KEY, timestampMs.toString());
    } catch (error) {
        console.error('Ошибка при сохранении времени старта:', error);
    }
}

/**
 * Загрузка времени начала забега
 * @returns {number|null} Метка времени или null
 */
function loadRunStartTime() {
    try {
        const saved = localStorage.getItem(RUN_START_TIME_KEY);
        if (!saved) return null;
        const parsed = parseInt(saved, 10);
        return Number.isFinite(parsed) ? parsed : null;
    } catch (error) {
        console.error('Ошибка при загрузке времени старта:', error);
        return null;
    }
}

/**
 * Очистка времени начала забега
 */
function clearRunStartTime() {
    try {
        localStorage.removeItem(RUN_START_TIME_KEY);
    } catch (error) {
        console.error('Ошибка при очистке времени старта:', error);
    }
}

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
        clearRunStartTime();
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
 * Форматирование прошедшего времени в мм:сс
 * @param {number} seconds
 * @returns {string}
 */
function formatRunTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60)
        .toString()
        .padStart(2, '0');
    const secs = (safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

let runTimerInterval = null;

/**
 * Обновление отображения времени забега
 */
function updateRunTimeDisplay() {
    const timeElement = document.getElementById('timeRemaining');
    if (!timeElement) return;
    
    if (!GameState.runStartTime) {
        timeElement.textContent = '--:--';
        return;
    }
    
    const elapsedSeconds = (Date.now() - GameState.runStartTime) / 1000;
    timeElement.textContent = formatRunTime(elapsedSeconds);
}

/**
 * Запуск таймера отображения времени забега
 */
function startRunTimer() {
    stopRunTimer();
    updateRunTimeDisplay();
    
    if (!GameState.runStartTime) return;
    
    runTimerInterval = setInterval(() => {
        updateRunTimeDisplay();
    }, 1000);
}

/**
 * Остановка таймера отображения времени забега
 */
function stopRunTimer() {
    if (runTimerInterval) {
        clearInterval(runTimerInterval);
        runTimerInterval = null;
    }
}

/**
 * Адаптация размера canvas под контейнер
 */
function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const gameArea = document.getElementById('gameArea');
    
    if (!canvas || !gameArea) return;
    
    // Получаем размеры контейнера
    const containerWidth = gameArea.clientWidth - 10; // Учитываем padding (5px с каждой стороны)
    const containerHeight = gameArea.clientHeight - 10;
    
    // Базовое разрешение для игры (высокое качество)
    const baseWidth = 1600;
    const baseHeight = 800;
    const aspectRatio = baseWidth / baseHeight; // 2:1
    
    // Минимальные размеры
    if (containerWidth <= 0 || containerHeight <= 0) {
        // Если контейнер еще не готов, используем базовое разрешение
        canvas.width = baseWidth;
        canvas.height = baseHeight;
        canvas.style.width = baseWidth + 'px';
        canvas.style.height = baseHeight + 'px';
        return;
    }
    
    // Вычисляем размеры отображения с сохранением пропорций
    let displayWidth, displayHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
        // Контейнер шире, ограничиваем по высоте
        displayHeight = Math.floor(containerHeight);
        displayWidth = Math.floor(displayHeight * aspectRatio);
    } else {
        // Контейнер выше, ограничиваем по ширине
        displayWidth = Math.floor(containerWidth);
        displayHeight = Math.floor(displayWidth / aspectRatio);
    }
    
    // Минимальные размеры отображения (увеличены для лучшей видимости)
    displayWidth = Math.max(displayWidth, 1000);
    displayHeight = Math.max(displayHeight, 500);
    
    // Устанавливаем внутреннее разрешение canvas (высокое качество)
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    
    // Устанавливаем размер отображения (адаптивный)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Сохраняем коэффициент масштабирования для обработки мыши
    canvas._scaleX = baseWidth / displayWidth;
    canvas._scaleY = baseHeight / displayHeight;
    
    // Если рендерер уже создан, обновляем камеру
    if (gameRenderer && gameRenderer.currentRoundParams) {
        const road = gameRenderer.currentRoundParams.road;
        gameRenderer.cameraOffset = road.startX - canvas.width / 2;
    }
}

/**
 * Применяет выбранные скины к машинам текущего раунда
 * @param {RoundParams} roundParams - параметры раунда
 */
function applySelectedCarSkins(roundParams) {
    if (!roundParams || !roundParams.cars || !roundParams.cars.length) {
        return;
    }
    const selection = typeof getCarSelection === 'function' ? getCarSelection() : { player: 'car2', enemy: 'car1' };
    const playerSkin = selection.player === 'car1' ? 'car1' : 'car2';
    const enemySkin = playerSkin === 'car1' ? 'car2' : 'car1';
    roundParams.cars.forEach(car => {
        if (car.isControlledByMouse) {
            car.skin = playerSkin;
        } else {
            car.skin = enemySkin;
        }
    });
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
        
        // Инициализируем время начала забега
        const savedRunStartTime = loadRunStartTime();
        if (hasSavedLevel && savedRunStartTime) {
            GameState.runStartTime = savedRunStartTime;
        } else {
            GameState.runStartTime = Date.now();
            saveRunStartTime(GameState.runStartTime);
        }
        
        if (!hasSavedLevel) {
            resetScore();
            clearSavedScore();
        } else {
            // Инициализируем систему очков (загружает сохраненные очки, если есть)
            initScore();
        }

        // Адаптируем размер canvas перед созданием рендерера
        resizeCanvas();
        
        // Создаём рендерер игры
        gameRenderer = new GameRenderer('gameCanvas');
        
        // Адаптируем размер canvas после создания рендерера (с небольшой задержкой для корректного расчета размеров)
        setTimeout(() => {
            resizeCanvas();
        }, 100);

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
        startRunTimer();

        // Настраиваем обработчики событий
        setupEventHandlers();

        // Обновляем активную кнопку в переключателе уровней
        updateLevelSwitcherButtons(currentLevel);
        
        // Настраиваем обработчик изменения размера окна
        window.addEventListener('resize', () => {
            resizeCanvas();
        });

        // Запускаем игровой цикл
        gameRenderer.start();

        // Адаптируем canvas после полной загрузки
        setTimeout(() => {
            resizeCanvas();
        }, 200);

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
    
    // Обновляем отображение времени забега
    updateRunTimeDisplay();
}

/**
 * Обновление видимости прогресс-бара
 */
function updateProgressBarVisibility() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    if (progressBarContainer) {
        // Показываем прогресс-бар только для уровней 2 и 3 (без уровня 1)
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
    // Показываем прогресс-бар только для уровней 2 и 3 (без уровня 1)
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
    const controlsLeft = document.getElementById('controlsLeft');
    const timeLabel = controlsLeft ? controlsLeft.querySelector('p:first-of-type') : null;
    
    if (GameState.currentLevel === 1) {
        // Для уровня 1 показываем таймер до финиша
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'block';
            targetTimeDisplay.textContent = '—';
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'block';
            currentTimeDisplay.textContent = '—';
        }
        if (timeLabel) {
            timeLabel.style.display = 'block';
            timeLabel.textContent = 'Доберитесь до финиша, пока не истек таймер';
        }
    } else if (GameState.currentLevel === 2) {
        // Для уровня 2 скрываем информацию о времени и первую строку
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'none';
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'none';
        }
        if (timeLabel) {
            timeLabel.style.display = 'none'; // Скрываем первую строку для экономии места
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
            timeLabel.textContent = 'Доберитесь до финиша за целевое время';
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

    // Обработчик движения мыши для уровней 2 и 3 (уровень 1 использует клавиатуру)
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
    }
    
    // Обработчики клавиатуры для уровня 1
    window.addEventListener('keydown', handleKeyboardDown);
    window.addEventListener('keyup', handleKeyboardUp);

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

    // Обработчики переключения уровней для преподавателя
    const levelSwitcher = document.getElementById('levelSwitcher');
    if (levelSwitcher) {
        const levelButtons = levelSwitcher.querySelectorAll('.level-switch-btn');
        levelButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetLevel = parseInt(btn.getAttribute('data-level'), 10);
                if (targetLevel >= 1 && targetLevel <= 3) {
                    switchToLevel(targetLevel);
                }
            });
        });
    }
}

/**
 * Обработчик начала игры (для всех уровней)
 */
function handleStartGame() {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    const roundParams = gameRenderer.currentRoundParams;
    
    // Для уровня 2 требуется скорость, для уровней 1 и 3 - нет
    if (GameState.currentLevel === 2) {
        if (!roundParams.selectedSpeed || roundParams.selectedSpeed === 0) {
            alert('Пожалуйста, выберите скорость автоматической машины');
            return;
        }
    }
    
    // Получаем машины
    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const playerCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    if (!playerCar) return;
    
    // Для уровня 2 запускаем автоматическую машину
    if (GameState.currentLevel === 2) {
        if (!autoCar) return;
        // Устанавливаем выбранную скорость автоматической машине
        autoCar.speed = roundParams.selectedSpeed;
        // Базовая скорость игрока равна выбранной скорости противника
        if (gameRenderer && typeof gameRenderer.setLevel2PlayerBaseSpeed === 'function') {
            gameRenderer.setLevel2PlayerBaseSpeed(autoCar.speed);
        }
        playerCar.speed = autoCar.speed;
        // Запускаем автоматическую машину
        autoCar.start();
    }
    
    // Запускаем машину игрока
    playerCar.start();
    playerCar.startTime = Date.now();
    
    // Для уровня 1 запускаем таймер обратного отсчета
    if (GameState.currentLevel === 1) {
        startLevel1Timer(roundParams);
    }
    
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
}

/**
 * Таймер обратного отсчета для уровня 1
 */
let level1TimerInterval = null;
let level1TimerDeadline = null;

function startLevel1Timer(roundParams) {
    stopLevel1Timer();
    
    if (!roundParams || !roundParams.timeLimitSeconds) return;
    
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const deadline = Date.now() + roundParams.timeLimitSeconds * 1000;
    level1TimerDeadline = deadline;
    
    if (currentTimeDisplay) {
        currentTimeDisplay.textContent = roundParams.timeLimitSeconds.toFixed(1);
    }
    
    level1TimerInterval = setInterval(() => {
        const remainingSeconds = Math.max(0, (deadline - Date.now()) / 1000);
        
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = remainingSeconds.toFixed(1);
        }
        
        if (!GameState.isRoundActive) {
            stopLevel1Timer();
            return;
        }
        
        const playerCar = roundParams.cars.find(car => car.isControlledByMouse);
        if (playerCar && playerCar.reachedFinish) {
            stopLevel1Timer();
            return;
        }
        
        if (remainingSeconds <= 0) {
            stopLevel1Timer();
            handleLevel1Timeout(roundParams);
        }
    }, 100);
}

function stopLevel1Timer() {
    if (level1TimerInterval) {
        clearInterval(level1TimerInterval);
        level1TimerInterval = null;
    }
    level1TimerDeadline = null;
}

function handleLevel1Timeout(roundParams) {
    if (!GameState.isRoundActive) return;
    
    const playerCar = roundParams ? roundParams.cars.find(car => car.isControlledByMouse) : null;
    if (playerCar && playerCar.isMoving) {
        playerCar.stop();
    }
    
    showRoundResult(
        false,
        'Время вышло! Вы не успели дойти до финиша',
        roundParams && roundParams.timeLimitSeconds ? `Лимит: ${roundParams.timeLimitSeconds.toFixed(1)} сек` : null,
        null
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
    // Для уровня 1 показываем просто победу
    if (GameState.currentLevel === 1) {
        const playerCar = roundParams.cars.find(car => car.isControlledByMouse);
        const travelTime = playerCar ? playerCar.getTravelTime() : null;
        const timeText = travelTime ? `Время: ${travelTime.toFixed(2)} сек` : '';
        
        showRoundResult(
            true,
            'Победа! Вы достигли финиша!',
            timeText,
            null
        );
        return;
    }
    
    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const mouseCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    if (!autoCar || !mouseCar) return;
    
    const autoX = autoCar.x.toFixed(1);
    const mouseX = mouseCar.x.toFixed(1);
    
    // Находим индекс выбранной скорости для уровня 2
    let speedLevelIndex = null;
    if (GameState.currentLevel === 2 && roundParams.selectedSpeed) {
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
 * Обработчик движения мыши по canvas (для уровней 2 и 3)
 */
function handleCanvasMouseMove(event) {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;
    
    // Для уровня 1 не используем мышь
    if (GameState.currentLevel === 1) return;

    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    
    // Получаем координаты мыши относительно canvas (в пикселях отображения)
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    
    // Вычисляем масштаб, если он еще не установлен
    if (!canvas._scaleX || !canvas._scaleY) {
        const displayWidth = rect.width || canvas.width;
        const displayHeight = rect.height || canvas.height;
        canvas._scaleX = canvas.width / displayWidth;
        canvas._scaleY = canvas.height / displayHeight;
    }
    
    // Масштабируем координаты к внутреннему разрешению canvas
    const scaleX = canvas._scaleX || 1;
    const scaleY = canvas._scaleY || 1;
    const mouseX = displayX * scaleX;
    const mouseY = displayY * scaleY;

    gameRenderer.handleMouseMove(mouseX, mouseY);
}

/**
 * Обработчик нажатия клавиши клавиатуры (для уровня 1)
 */
function handleKeyboardDown(event) {
    if (!gameRenderer) return;
    gameRenderer.handleKeyDown(event);
}

/**
 * Обработчик отпускания клавиши клавиатуры (для уровня 1)
 */
function handleKeyboardUp(event) {
    if (!gameRenderer) return;
    gameRenderer.handleKeyUp(event);
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
 * Расчет лимита времени для уровня 1 с учетом длины и сложности пути
 * @param {RoadParams} road - Сгенерированная дорога
 * @returns {number} Лимит времени в секундах
 */
function calculateLevel1TimeLimit(road) {
    if (!road || !road.length || !isFinite(road.length)) {
        return 12;
    }
    
    const moveSpeed = gameRenderer ? gameRenderer.keyboardMoveSpeed : 420;
    const straightSeconds = road.length / moveSpeed;
    const turnsCount = road.path && road.path.length > 1 ? road.path.length - 1 : 0;
    const turnsFactor = 1 + Math.min(0.25, turnsCount * 0.015);
    const safetyBuffer = Math.max(2.5, Math.min(4, road.length / 1800));
    
    let limitSeconds = straightSeconds * turnsFactor + safetyBuffer;
    limitSeconds = Math.max(8, Math.min(15, limitSeconds));
    return Math.round(limitSeconds * 10) / 10;
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
    
    // Останавливаем таймер уровня 1, если он запущен
    stopLevel1Timer();
    
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
    applySelectedCarSkins(roundParams);
    if (GameState.currentLevel === 1) {
        roundParams.timeLimitSeconds = calculateLevel1TimeLimit(roundParams.road);
        GameState.levelTimeRemaining = roundParams.timeLimitSeconds;
    } else {
        roundParams.timeLimitSeconds = 0;
    }

    // Инициализируем раунд в рендерере
    gameRenderer.initRound(roundParams);

    // Начинаем раунд
    GameState.startRound();
    
    // Сохраняем состояние раунда
    saveRoundState();

    // Обновляем UI
    updateLevelUI();

    // Сбрасываем состояние кнопки "Начать" после завершения раунда
    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        startBtn.textContent = 'Начать';
    }
    
    // Обновляем элементы управления в зависимости от уровня
    updateControlsForRound(roundParams);
    
    // Сбрасываем прогресс-бар
    resetProgressBar();
    
    // Адаптируем canvas после начала раунда
    setTimeout(() => {
        resizeCanvas();
    }, 50);
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
    
    if (GameState.currentLevel === 1) {
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        const targetTimeDisplay = document.getElementById('targetTimeDisplay');
        const limit = roundParams.timeLimitSeconds || GameState.levelTimeRemaining || 0;
        const limitText = limit ? `${limit.toFixed(1)}` : '—';
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = limitText;
        }
        if (targetTimeDisplay) {
            targetTimeDisplay.textContent = limitText;
        }
    }
    
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
    
    const timeContainer = document.getElementById('controlsLeft');
    if (!timeContainer) return;
    
    // Очищаем контейнер
    const existingTimeSelection = timeContainer.querySelector('.time-selection');
    if (existingTimeSelection) {
        existingTimeSelection.remove();
    }
    const existingSpeedSelection = timeContainer.querySelector('.speed-selection');
    if (existingSpeedSelection) {
        existingSpeedSelection.remove();
    }
    
    // Для уровня 2 создаем выбор скорости для автоматической машины
    if (GameState.currentLevel === 2) {
        const speedSelectionDiv = document.createElement('div');
        speedSelectionDiv.className = 'speed-selection';
        speedSelectionDiv.innerHTML = '<p class="control-label">Скорость авто противника:</p>';
        
        const speedButtonsDiv = document.createElement('div');
        speedButtonsDiv.className = 'speed-options';
        
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
        
        // Вставляем в контейнер параметров
        timeContainer.appendChild(speedSelectionDiv);
    }
    
    // Отключаем кнопку запуска до выбора скорости (для уровня 2)
    // Для уровней 1 и 3 кнопка доступна сразу
    const startBtn2 = document.getElementById('startLevel3Btn');
    if (startBtn2) {
        if (GameState.currentLevel === 1 || GameState.currentLevel === 3) {
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
        // Для уровня 1 и 3 кнопка всегда доступна, для уровня 2 - требуется скорость
        if (GameState.currentLevel === 1 || GameState.currentLevel === 3) {
            startBtn.disabled = false;
        } else if (GameState.currentLevel === 2) {
            startBtn.disabled = !(roundParams.selectedSpeed > 0);
        }
    }
}


/**
 * Показ результата раунда
 */
function showRoundResult(isCorrect, message, details, speedLevelIndex = null) {
    // Останавливаем активные таймеры, если они запущены
    if (GameState.currentLevel === 3) {
        stopLevel3Timer();
    }
    if (GameState.currentLevel === 1) {
        stopLevel1Timer();
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

        // Обновляем активную кнопку в переключателе уровней
        updateLevelSwitcherButtons(nextLevel);

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
        const runStart = GameState.runStartTime || GameState.levelStartTime;
        if (runStart) {
            timeSpent = Math.max(0, (Date.now() - runStart) / 1000); // В секундах
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
 * Переключение на указанный уровень (для преподавателя)
 * @param {number} targetLevel - Номер уровня (1-3)
 */
async function switchToLevel(targetLevel) {
    if (!LEVELS_CONFIG[targetLevel]) {
        console.error(`Уровень ${targetLevel} не существует`);
        return;
    }

    // Останавливаем текущую игру
    if (gameRenderer) {
        gameRenderer.stop();
        
        // Останавливаем все машины
        if (gameRenderer.currentRoundParams) {
            gameRenderer.currentRoundParams.cars.forEach(car => {
                if (car.isMoving) {
                    car.stop();
                }
            });
        }
    }

    // Останавливаем таймер уровня 3, если он запущен
    stopLevel3Timer();

    // Скрываем модальные окна и результаты
    const levelCompleteModal = document.getElementById('levelCompleteModal');
    if (levelCompleteModal) {
        levelCompleteModal.style.display = 'none';
    }
    
    const roundResult = document.getElementById('roundResult');
    if (roundResult) {
        roundResult.style.display = 'none';
    }

    try {
        // Переключаем уровень
        currentLevel = targetLevel;
        GameState.initLevel(targetLevel);
        
        // Сохраняем новый уровень
        saveCurrentLevel(targetLevel);
        saveRoundState();

        // Загружаем изображения для нового уровня
        const levelConfig = LEVELS_CONFIG[targetLevel];
        await gameRenderer.loadLevelImages(levelConfig);

        // Обновляем UI
        updateLevelUI();
        showLevelControls();
        updateProgressBarVisibility();

        // Обновляем активную кнопку в переключателе уровней
        updateLevelSwitcherButtons(targetLevel);

        // Сбрасываем состояние кнопки "Начать"
        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            startBtn.textContent = 'Начать';
            if (targetLevel === 3) {
                startBtn.disabled = false;
            } else {
                startBtn.disabled = true;
            }
        }

        // Начинаем новый раунд
        startNewRound();

        // Запускаем игровой цикл
        gameRenderer.start();
    } catch (error) {
        console.error('Ошибка переключения уровня:', error);
        alert('Ошибка переключения уровня: ' + error.message);
    }
}

/**
 * Обновление активной кнопки в переключателе уровней
 * @param {number} activeLevel - Номер активного уровня
 */
function updateLevelSwitcherButtons(activeLevel) {
    const levelSwitcher = document.getElementById('levelSwitcher');
    if (!levelSwitcher) return;

    const levelButtons = levelSwitcher.querySelectorAll('.level-switch-btn');
    levelButtons.forEach(btn => {
        const btnLevel = parseInt(btn.getAttribute('data-level'), 10);
        if (btnLevel === activeLevel) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Инициализация при загрузке страницы
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

