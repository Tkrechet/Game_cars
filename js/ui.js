

let gameRenderer = null;
let currentLevel = 1;

const RUN_START_TIME_KEY = 'carsGameRunStartTime';

function saveRunStartTime(timestampMs) {
    try {
        localStorage.setItem(RUN_START_TIME_KEY, timestampMs.toString());
    } catch (error) {
        console.error('Ошибка при сохранении времени старта:', error);
    }
}

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

function clearRunStartTime() {
    try {
        localStorage.removeItem(RUN_START_TIME_KEY);
    } catch (error) {
        console.error('Ошибка при очистке времени старта:', error);
    }
}

function saveCurrentLevel(level) {
    try {
        localStorage.setItem('savedLevel', level.toString());
    } catch (error) {
        console.error('Ошибка при сохранении уровня:', error);
    }
}

function loadSavedLevel() {
    try {
        const savedLevel = localStorage.getItem('savedLevel');
        if (savedLevel) {
            const level = parseInt(savedLevel, 10);
            
            if (level >= 1 && level <= 3 && LEVELS_CONFIG[level]) {
                return level;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке уровня:', error);
    }
    return 1;
}

function clearSavedLevel() {
    try {
        localStorage.removeItem('savedLevel');
        localStorage.removeItem('savedRound');
        localStorage.removeItem('savedTotalRounds');
        localStorage.removeItem('savedLevelWins');
        localStorage.removeItem('savedLevelLosses');
        
        clearRunStartTime();
        clearSavedScore();
    } catch (error) {
        console.error('Ошибка при очистке уровня:', error);
    }
}

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

function convertPxToKmh(pxPerSecond) {

    return Math.round(pxPerSecond * 0.5);
}

function formatRunTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60)
        .toString()
        .padStart(2, '0');
    const secs = (safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

let runTimerInterval = null;

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

function startRunTimer() {
    stopRunTimer();
    updateRunTimeDisplay();
    
    if (!GameState.runStartTime) return;
    
    runTimerInterval = setInterval(() => {
        updateRunTimeDisplay();
    }, 1000);
}

function stopRunTimer() {
    if (runTimerInterval) {
        clearInterval(runTimerInterval);
        runTimerInterval = null;
    }
}

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const gameArea = document.getElementById('gameArea');
    
    if (!canvas || !gameArea) return;

    const containerWidth = gameArea.clientWidth - 10; 
    const containerHeight = gameArea.clientHeight - 10;

    const baseWidth = 1600;
    const baseHeight = 800;
    const aspectRatio = baseWidth / baseHeight; 

    if (containerWidth <= 0 || containerHeight <= 0) {
        
        canvas.width = baseWidth;
        canvas.height = baseHeight;
        canvas.style.width = baseWidth + 'px';
        canvas.style.height = baseHeight + 'px';
        return;
    }

    let displayWidth, displayHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
        
        displayHeight = Math.floor(containerHeight);
        displayWidth = Math.floor(displayHeight * aspectRatio);
    } else {
        
        displayWidth = Math.floor(containerWidth);
        displayHeight = Math.floor(displayWidth / aspectRatio);
    }

    displayWidth = Math.max(displayWidth, 1000);
    displayHeight = Math.max(displayHeight, 500);

    canvas.width = baseWidth;
    canvas.height = baseHeight;

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    canvas._scaleX = baseWidth / displayWidth;
    canvas._scaleY = baseHeight / displayHeight;

    if (gameRenderer && gameRenderer.currentRoundParams) {
        const road = gameRenderer.currentRoundParams.road;
        gameRenderer.cameraOffset = road.startX - canvas.width / 2;
    }
}

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

async function initGame() {
    try {
        
        const playerName = localStorage.getItem('currentPlayerName');
        if (!playerName) {
            
            window.location.href = 'index.html';
            return;
        }

        currentLevel = loadSavedLevel();

        const hasSavedLevel = localStorage.getItem('savedLevel');

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
            
            initScore();
        }

        resizeCanvas();

        gameRenderer = new GameRenderer('gameCanvas');

        setTimeout(() => {
            resizeCanvas();
        }, 100);

        const levelConfig = LEVELS_CONFIG[currentLevel];
        await gameRenderer.loadLevelImages(levelConfig);

        const savedRoundState = loadRoundState();

        GameState.initLevel(currentLevel, savedRoundState);

        saveCurrentLevel(currentLevel);
        saveRoundState();

        updateLevelUI();
        showLevelControls();
        startRunTimer();

        setupEventHandlers();

        updateLevelSwitcherButtons(currentLevel);

        window.addEventListener('resize', () => {
            resizeCanvas();
        });

        gameRenderer.start();

        setTimeout(() => {
            resizeCanvas();
        }, 200);

        startNewRound();
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        alert('Ошибка загрузки игры: ' + error.message);
    }
}

function updateLevelUI() {
    const levelConfig = GameState.getCurrentLevelConfig();
    
    document.getElementById('currentLevel').textContent = GameState.currentLevel;
    document.getElementById('currentRound').textContent = GameState.currentRound;
    document.getElementById('totalRounds').textContent = GameState.totalRounds;
    document.getElementById('levelTitle').textContent = levelConfig.name;
    document.getElementById('levelDesc').textContent = levelConfig.description;

    updateProgressBarVisibility();

    updateRunTimeDisplay();
}

function updateProgressBarVisibility() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    if (progressBarContainer) {
        progressBarContainer.style.display = GameState.currentLevel === 3 ? 'block' : 'none';
    }
    const lapInfo = document.getElementById('lapInfo');
    if (lapInfo) {
        lapInfo.style.display = GameState.currentLevel === 2 ? 'block' : 'none';
    }
}

function updateProgressBar() {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    if (GameState.currentLevel === 2) {
        const lapCounter = document.getElementById('lapCounter');
        const lapInfo = document.getElementById('lapInfo');
        if (lapInfo) lapInfo.style.display = 'block';

        const road = gameRenderer.currentRoundParams.road;
        const laps = road && road.laps ? road.laps : 1;

        const mouseCar = gameRenderer.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!mouseCar || !lapCounter) return;

        const currentLap = Math.min(laps, (mouseCar.completedLaps || 0) + 1);
        lapCounter.textContent = `${currentLap} / ${laps}`;
        return;
    }

    if (GameState.currentLevel === 3) {
        const progressBarContainer = document.getElementById('progressBarContainer');
        const progressBarFill = document.getElementById('progressBarFill');
        const progressBarValue = document.getElementById('progressBarValue');
        if (!progressBarContainer || !progressBarFill || !progressBarValue) return;

        progressBarContainer.style.display = 'block';

        const road = gameRenderer.currentRoundParams.road;
        const mouseCar = gameRenderer.currentRoundParams.cars.find(car => car.isControlledByMouse);

        if (!road || !mouseCar || !road.length || !Number.isFinite(road.length)) {
            progressBarFill.style.width = '0%';
            progressBarValue.textContent = '0%';
            return;
        }

        const progress = Math.max(0, Math.min(1, mouseCar.progress || 0));
        const percent = Math.round(progress * 100);

        progressBarFill.style.width = `${percent}%`;
        progressBarValue.textContent = `${percent}%`;
        return;
    }

    const progressBarContainer = document.getElementById('progressBarContainer');
    if (progressBarContainer) {
        progressBarContainer.style.display = 'none';
    }
}

function showLevelControls() {
    
    const controlsLevel3 = document.getElementById('controlsLevel3');
    if (controlsLevel3) {
        controlsLevel3.style.display = 'block';
    }
    const lapInfo = document.getElementById('lapInfo');
    if (lapInfo) {
        lapInfo.style.display = GameState.currentLevel === 2 ? 'block' : 'none';
    }

    const targetTimeDisplay = document.getElementById('targetTimeDisplay');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const controlsLeft = document.getElementById('controlsLeft');
    const timeLabel = controlsLeft ? controlsLeft.querySelector('p:first-of-type') : null;
    
    if (GameState.currentLevel === 1) {
        
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
        
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'none';
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.parentElement.style.display = 'none';
        }
        if (timeLabel) {
            timeLabel.style.display = 'none'; 
        }
    } else if (GameState.currentLevel === 3) {
        
        if (targetTimeDisplay) {
            targetTimeDisplay.parentElement.style.display = 'block';
            
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

function setupEventHandlers() {
    
    const startLevel3Btn = document.getElementById('startLevel3Btn');
    if (startLevel3Btn) {
        startLevel3Btn.addEventListener('click', handleStartGame);
    }

    window.addEventListener('keydown', (event) => {
        
        if (event.key === 'Enter' || event.keyCode === 13) {
            const startBtn = document.getElementById('startLevel3Btn');
            
            if (startBtn && !startBtn.disabled && startBtn.offsetParent !== null) {
                
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                if (!isInputFocused) {
                    event.preventDefault();
                    handleStartGame();
                }
            }
        }
    });

    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
    }

    window.addEventListener('keydown', handleKeyboardDown);
    window.addEventListener('keyup', handleKeyboardUp);

    const endLevelBtn = document.getElementById('endLevelBtn');
    if (endLevelBtn) {
        endLevelBtn.addEventListener('click', handleEndLevel);
    }

    const nextRoundBtn = document.getElementById('nextRoundBtn');
    if (nextRoundBtn) {
        nextRoundBtn.addEventListener('click', handleNextRound);
    }

    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', handleNextLevel);
    }

    const toRatingBtn = document.getElementById('toRatingBtn');
    if (toRatingBtn) {
        toRatingBtn.addEventListener('click', handleToRating);
    }

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

function handleStartGame() {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    const roundParams = gameRenderer.currentRoundParams;

    if (GameState.currentLevel === 2) {
        if (!roundParams.selectedSpeed || roundParams.selectedSpeed === 0) {
            alert('Пожалуйста, выберите скорость автоматической машины');
            return;
        }
    }

    const autoCar = roundParams.cars.find(car => !car.isControlledByMouse);
    const playerCar = roundParams.cars.find(car => car.isControlledByMouse);
    
    if (!playerCar) return;

    if (GameState.currentLevel === 2) {
        if (!autoCar) return;
        
        autoCar.speed = roundParams.selectedSpeed;
        
        if (gameRenderer && typeof gameRenderer.setLevel2PlayerBaseSpeed === 'function') {
            gameRenderer.setLevel2PlayerBaseSpeed(autoCar.speed);
        }
        playerCar.speed = autoCar.speed;
        
        autoCar.start();
    }

    playerCar.start();
    playerCar.startTime = Date.now();

    if (GameState.currentLevel === 1) {
        startLevel1Timer(roundParams);
    }

    if (GameState.currentLevel === 3) {
        startLevel3Timer();
    }

    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Игра началась';
    }
}

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

let level3TimerInterval = null;

function startLevel3Timer() {
    
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

function checkFinishResult(roundParams, playerWon) {
    
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

function checkFinishResultLevel3(roundParams, isWin, finishTime, targetTime, tolerance) {
    
    stopLevel3Timer();
    
    const minTime = targetTime - tolerance;
    const maxTime = targetTime + tolerance;

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

function handleCanvasMouseMove(event) {
    if (!gameRenderer || !gameRenderer.currentRoundParams) return;

    if (GameState.currentLevel === 1) return;

    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();

    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;

    if (!canvas._scaleX || !canvas._scaleY) {
        const displayWidth = rect.width || canvas.width;
        const displayHeight = rect.height || canvas.height;
        canvas._scaleX = canvas.width / displayWidth;
        canvas._scaleY = canvas.height / displayHeight;
    }

    const scaleX = canvas._scaleX || 1;
    const scaleY = canvas._scaleY || 1;
    const mouseX = displayX * scaleX;
    const mouseY = displayY * scaleY;

    gameRenderer.handleMouseMove(mouseX, mouseY);
}

function handleKeyboardDown(event) {
    if (!gameRenderer) return;
    gameRenderer.handleKeyDown(event);
}

function handleKeyboardUp(event) {
    if (!gameRenderer) return;
    gameRenderer.handleKeyUp(event);
}

function handleEndLevel() {
    
    if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
        if (GameState.levelWins === 0) {
            alert('Вы не можете завершить уровень досрочно, пока не выиграете хотя бы один раунд!');
            return;
        }
    }

    GameState.endLevel();

    if (gameRenderer && gameRenderer.currentRoundParams) {
        gameRenderer.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });
    }

    showLevelComplete();
}

function handleNextRound() {
    
    document.getElementById('roundResult').style.display = 'none';

    startNewRound();
}

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

function startNewRound() {
    if (GameState.isLevelComplete()) {
        
        showLevelComplete();
        return;
    }

    stopLevel1Timer();

    stopLevel3Timer();

    if (GameState.currentLevel === 3) {
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = '0.0';
        }
    }

    const roundParams = new RoundParams();
    roundParams.generate(GameState.currentLevel);
    applySelectedCarSkins(roundParams);
    if (GameState.currentLevel === 1) {
        roundParams.timeLimitSeconds = calculateLevel1TimeLimit(roundParams.road);
        GameState.levelTimeRemaining = roundParams.timeLimitSeconds;
    } else {
        roundParams.timeLimitSeconds = 0;
    }

    gameRenderer.initRound(roundParams);

    GameState.startRound();

    saveRoundState();

    updateLevelUI();

    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        startBtn.textContent = 'Начать (Enter)';
    }

    updateControlsForRound(roundParams);

    resetProgressBar();

    setTimeout(() => {
        resizeCanvas();
    }, 50);
}

function resetProgressBar() {
    const lapCounter = document.getElementById('lapCounter');
    if (lapCounter) {
        lapCounter.textContent = '0 / 0';
    }
    const progressBarFill = document.getElementById('progressBarFill');
    const progressBarValue = document.getElementById('progressBarValue');
    if (progressBarFill) {
        progressBarFill.style.width = '0%';
    }
    if (progressBarValue) {
        progressBarValue.textContent = '0%';
    }
}

function updateControlsForRound(roundParams) {
    
    updateTimeSelection(roundParams);

    if (GameState.currentLevel === 2) {
        const lapCounter = document.getElementById('lapCounter');
        if (lapCounter) {
            const road = roundParams.road;
            const laps = road && road.laps ? road.laps : 0;
            lapCounter.textContent = laps > 0 ? `1 / ${laps}` : '0 / 0';
        }
        const lapInfo = document.getElementById('lapInfo');
        if (lapInfo) {
            lapInfo.style.display = 'block';
        }
    } else {
        const lapInfo = document.getElementById('lapInfo');
        if (lapInfo) {
            lapInfo.style.display = 'none';
        }
    }
    
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

    if (GameState.currentLevel === 3) {
        const targetTimeDisplay = document.getElementById('targetTimeDisplay');
        if (targetTimeDisplay && roundParams.targetTime) {
            const levelConfig = LEVELS_CONFIG[3];
            const tolerance = levelConfig.mechanics.timeTolerance;
            targetTimeDisplay.textContent = `${roundParams.targetTime} ± ${tolerance}`;
        }
    }
}

function updateTimeSelection(roundParams) {
    
    roundParams.selectedTime = 0;
    roundParams.selectedSpeed = 0;
    
    const timeContainer = document.getElementById('controlsLeft');
    if (!timeContainer) return;

    const existingTimeSelection = timeContainer.querySelector('.time-selection');
    if (existingTimeSelection) {
        existingTimeSelection.remove();
    }
    const existingSpeedSelection = timeContainer.querySelector('.speed-selection');
    if (existingSpeedSelection) {
        existingSpeedSelection.remove();
    }

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
                
                speedButtonsDiv.querySelectorAll('.speed-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                roundParams.selectedSpeed = speed;

                checkStartButtonState(roundParams);
            });
            speedButtonsDiv.appendChild(btn);
        });
        
        speedSelectionDiv.appendChild(speedButtonsDiv);

        timeContainer.appendChild(speedSelectionDiv);
    }

    const startBtn2 = document.getElementById('startLevel3Btn');
    if (startBtn2) {
        if (GameState.currentLevel === 1 || GameState.currentLevel === 3) {
            startBtn2.disabled = false;
        } else {
            startBtn2.disabled = true;
        }
    }
}

function checkStartButtonState(roundParams) {
    const startBtn = document.getElementById('startLevel3Btn');
    if (startBtn) {
        
        if (GameState.currentLevel === 1 || GameState.currentLevel === 3) {
            startBtn.disabled = false;
        } else if (GameState.currentLevel === 2) {
            startBtn.disabled = !(roundParams.selectedSpeed > 0);
        }
    }
}

function showRoundResult(isCorrect, message, details, speedLevelIndex = null) {
    
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
        
        const pointsEarned = addScoreForWin(GameState.currentLevel, speedLevelIndex);
        resultTitle.textContent = 'Правильно!';
        resultMessage.textContent = message;
        resultScoreValue.textContent = pointsEarned;
        
        GameState.levelWins++;
    } else {
        resultTitle.textContent = 'Неправильно';
        resultMessage.textContent = message;
        if (details) {
            resultMessage.textContent += ` (${details})`;
        }
        resultScoreValue.textContent = '0';
        
        GameState.levelLosses++;
    }

    resultDiv.style.display = 'flex';

    GameState.endRound();

    saveRoundState();
}

function showLevelComplete() {
    const modal = document.getElementById('levelCompleteModal');
    const title = document.getElementById('levelCompleteTitle');
    const message = document.getElementById('levelCompleteMessage');
    const nextLevelBtn = document.getElementById('nextLevelBtn');

    title.textContent = `Уровень ${GameState.currentLevel} завершён!`;

    const nextLevel = GameState.currentLevel + 1;

    if (GameState.levelWins === 0) {
        const pointsLost = subtractScore(100);
        if (GameState.levelLosses > 0) {
            message.textContent = `Вы проиграли все раунды на уровне ${GameState.currentLevel}. С вас списано ${pointsLost} очков.`;
        } else {
            message.textContent = `Вы завершили уровень ${GameState.currentLevel}, но не выиграли ни одного раунда. С вас списано ${pointsLost} очков.`;
        }
    } else {
        
        message.textContent = `Вы завершили уровень ${GameState.currentLevel}. Побед: ${GameState.levelWins}, поражений: ${GameState.levelLosses}.`;
    }

    if (LEVELS_CONFIG[nextLevel]) {
        nextLevelBtn.style.display = 'inline-block';
        nextLevelBtn.textContent = 'Следующий уровень';
    } else {
        nextLevelBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function handleNextLevel() {
    const nextLevel = GameState.currentLevel + 1;

    if (!LEVELS_CONFIG[nextLevel]) {
        
        saveGameResult();
        
        clearSavedLevel();
        
        localStorage.removeItem('currentPlayerName');
        window.location.href = 'results.html';
        return;
    }

    const modal = document.getElementById('levelCompleteModal');
    if (modal) {
        modal.style.display = 'none';
    }

    const roundResult = document.getElementById('roundResult');
    if (roundResult) {
        roundResult.style.display = 'none';
    }

    currentLevel = nextLevel;
    
    GameState.initLevel(nextLevel);

    saveCurrentLevel(nextLevel);
    saveRoundState();

    const levelConfig = LEVELS_CONFIG[nextLevel];
    gameRenderer.loadLevelImages(levelConfig).then(() => {
        
        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            startBtn.textContent = 'Начать (Enter)';
            
            if (nextLevel === 3) {
                startBtn.disabled = false;
            } else {
                startBtn.disabled = true;
            }
        }

        updateLevelUI();
        showLevelControls();

        updateProgressBarVisibility();

        updateLevelSwitcherButtons(nextLevel);

        startNewRound();
    }).catch(error => {
        console.error('Ошибка загрузки уровня:', error);
        alert('Ошибка загрузки уровня: ' + error.message);
    });
}

function handleToRating() {
    
    saveGameResult();

    const playerName = localStorage.getItem('currentPlayerName');
    if (playerName) {
        localStorage.setItem('lastPlayerName', playerName);
    }

    clearSavedLevel();

    localStorage.removeItem('currentPlayerName');

    window.location.href = 'results.html';
}

function saveGameResult() {
    try {
        
        const playerName = localStorage.getItem('currentPlayerName') || 'Неизвестный игрок';

        const finalScore = getCurrentScore();

        let timeSpent = 0;
        const runStart = GameState.runStartTime || GameState.levelStartTime;
        if (runStart) {
            timeSpent = Math.max(0, (Date.now() - runStart) / 1000); 
        }

        const levelReached = GameState.currentLevel;

        savePlayerResult(playerName, finalScore, timeSpent, levelReached);

    } catch (error) {
        console.error('Ошибка при сохранении результата:', error);
    }
}

async function switchToLevel(targetLevel) {
    if (!LEVELS_CONFIG[targetLevel]) {
        console.error(`Уровень ${targetLevel} не существует`);
        return;
    }

    if (gameRenderer) {
        gameRenderer.stop();

        if (gameRenderer.currentRoundParams) {
            gameRenderer.currentRoundParams.cars.forEach(car => {
                if (car.isMoving) {
                    car.stop();
                }
            });
        }
    }

    stopLevel3Timer();

    const levelCompleteModal = document.getElementById('levelCompleteModal');
    if (levelCompleteModal) {
        levelCompleteModal.style.display = 'none';
    }
    
    const roundResult = document.getElementById('roundResult');
    if (roundResult) {
        roundResult.style.display = 'none';
    }

    try {
        
        currentLevel = targetLevel;
        GameState.initLevel(targetLevel);

        saveCurrentLevel(targetLevel);
        saveRoundState();

        const levelConfig = LEVELS_CONFIG[targetLevel];
        await gameRenderer.loadLevelImages(levelConfig);

        updateLevelUI();
        showLevelControls();
        updateProgressBarVisibility();

        updateLevelSwitcherButtons(targetLevel);

        const startBtn = document.getElementById('startLevel3Btn');
        if (startBtn) {
            startBtn.textContent = 'Начать (Enter)';
            if (targetLevel === 3) {
                startBtn.disabled = false;
            } else {
                startBtn.disabled = true;
            }
        }

        startNewRound();

        gameRenderer.start();
    } catch (error) {
        console.error('Ошибка переключения уровня:', error);
        alert('Ошибка переключения уровня: ' + error.message);
    }
}

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

