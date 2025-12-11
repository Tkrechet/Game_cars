/**
 * Конфигурация уровней игры
 */
const LEVELS_CONFIG = {
    1: {
        name: 'Уровень 1',
        description: 'Выберите время управления. Ведите машину мышкой, чтобы обогнать автоматическую машину',
        roundsCount: { min: 3, max: 5 },
        difficulty: 'easy',
        timeLimit: 300,
        images: {
            road: 'images/road-top-view.png',
            car1: 'images/car_1.png',
            car2: 'images/car_2.png',
            finish: 'images/finish.png',
            checkpoint: 'images/checkpoint.png'
        },
        mechanics: {
            type: 'mouse_race',
            baseSpeed: 120 // Базовая скорость для уровня 1
        }
    },
    2: {
        name: 'Уровень 2',
        description: 'Выберите скорость автоматической машины. Ведите машину мышкой к финишу. Первый, кто достигнет финиша, побеждает!',
        roundsCount: { min: 3, max: 5 },
        difficulty: 'medium',
        timeLimit: 240,
        images: {
            road: 'images/road-top-view.png',
            car1: 'images/car_1.png',
            car2: 'images/car_2.png',
            finish: 'images/finish.png',
            checkpoint: 'images/checkpoint.png'
        },
        mechanics: {
            type: 'mouse_race',
            baseSpeed: 180 // Базовая скорость для уровня 2
        }
    },
    3: {
        name: 'Уровень 3',
        description: 'Доберитесь до финиша за целевое время (3-5 секунд ± 0.5). Если придете раньше или позже - проиграете!',
        roundsCount: { min: 3, max: 5 },
        difficulty: 'hard',
        timeLimit: 180,
        images: {
            road: 'images/road-top-view.png',
            car1: 'images/car_1.png',
            car2: 'images/car_2.png',
            finish: 'images/finish.png',
            checkpoint: 'images/checkpoint.png'
        },
        mechanics: {
            type: 'time_target',
            baseSpeed: 240, // Базовая скорость для уровня 3
            timeTolerance: 0.5 // Допустимое отклонение в секундах
        }
    }
};

/**
 * Объект текущего состояния игры
 */
const GameState = {
    currentLevel: 1,
    currentRound: 1,
    totalRounds: 0, // Общее количество раундов на текущем уровне
    isLevelActive: false,
    isRoundActive: false,
    levelStartTime: null,
    roundStartTime: null,
    levelTimeRemaining: 0,
    levelWins: 0, // Количество выигранных раундов на текущем уровне
    levelLosses: 0, // Количество проигранных раундов на текущем уровне
    
    /**
     * Инициализация уровня
     * @param {number} levelNumber - Номер уровня (1-3)
     * @param {Object} savedState - Опциональное сохраненное состояние для восстановления
     */
    initLevel(levelNumber, savedState = null) {
        this.currentLevel = levelNumber;
        this.isLevelActive = true;
        this.isRoundActive = false;
        this.levelStartTime = Date.now();
        
        if (savedState) {
            // Восстанавливаем сохраненное состояние
            this.currentRound = savedState.currentRound || 1;
            this.totalRounds = savedState.totalRounds || 0;
            this.levelWins = savedState.levelWins || 0;
            this.levelLosses = savedState.levelLosses || 0;
        } else {
            // Инициализируем новое состояние
            this.currentRound = 1;
            this.levelWins = 0;
            this.levelLosses = 0;
            
            // Генерируем случайное количество раундов для уровня
            const config = LEVELS_CONFIG[levelNumber];
            const roundsRange = config.roundsCount;
            this.totalRounds = Math.floor(
                Math.random() * (roundsRange.max - roundsRange.min + 1) + roundsRange.min
            );
        }
        
        const config = LEVELS_CONFIG[levelNumber];
        this.levelTimeRemaining = config.timeLimit;
    },
    
    /**
     * Начало нового раунда
     */
    startRound() {
        this.isRoundActive = true;
        this.roundStartTime = Date.now();
    },
    
    /**
     * Завершение раунда
     */
    endRound() {
        this.isRoundActive = false;
        this.currentRound++;
    },
    
    /**
     * Завершение уровня
     */
    endLevel() {
        this.isLevelActive = false;
        this.isRoundActive = false;
    },
    
    /**
     * Проверка, завершён ли уровень
     */
    isLevelComplete() {
        return this.currentRound > this.totalRounds;
    },
    
    /**
     * Получение конфигурации текущего уровня
     */
    getCurrentLevelConfig() {
        return LEVELS_CONFIG[this.currentLevel];
    }
};

/**
 * Параметры дороги
 */
class RoadParams {
    constructor() {
        this.length = Infinity; // Длина дороги бесконечна
        this.width = 60; // Ширина дороги
        this.startX = 50; // Начальная позиция X
        this.startY = 0; // Начальная позиция Y
        this.endX = Infinity; // Конечная позиция X (бесконечность)
        this.endY = 0; // Конечная позиция Y
        this.checkpoints = []; // Контрольные точки для уровня 3 (не используются для бесконечной дороги)
        this.path = []; // Массив точек для кривой дороги (если нужна)
    }
    
    /**
     * Генерация случайных параметров дороги
     * @param {number} level - Номер уровня (влияет на сложность)
     */
    generate(level) {
        this.startX = 50;
        this.startY = 200 + Math.random() * 100;
        
        // Для уровня 2 и 3 делаем конечную дорогу с финишем
        if (level === 2 || level === 3) {
            // Длина дороги от 2000 до 3000 пикселей
            this.length = 2000 + Math.random() * 1000;
            this.endX = this.startX + this.length;
            this.endY = this.startY;
        } else {
            // Для остальных уровней дорога бесконечна
            this.length = Infinity;
            this.endX = Infinity;
            this.endY = this.startY;
        }
        
        // Для бесконечной дороги контрольные точки не нужны
        this.checkpoints = [];
    }
}

/**
 * Параметры скорости машины
 */
class SpeedParams {
    constructor() {
        this.minSpeed = 0;
        this.maxSpeed = 0;
        this.currentSpeed = 0;
        this.targetSpeed = 0; // Целевая скорость для уровня 2
    }
    
    /**
     * Генерация случайных параметров скорости
     * @param {number} level - Номер уровня
     * @param {number} roadLength - Длина дороги
     */
    generate(level, roadLength) {
        // Базовая скорость зависит от уровня (сложнее = быстрее)
        const baseSpeed = 30 + (level * 15);
        const speedVariation = 20;
        
        this.minSpeed = baseSpeed;
        this.maxSpeed = baseSpeed + speedVariation;
        
        // Генерируем случайную скорость в диапазоне
        this.currentSpeed = Math.floor(
            Math.random() * (this.maxSpeed - this.minSpeed + 1) + this.minSpeed
        );
        
        // Для уровня 2 генерируем целевую скорость для второй машины
        if (level === 2) {
            this.targetSpeed = Math.floor(
                Math.random() * (this.maxSpeed - this.minSpeed + 1) + this.minSpeed
            );
        }
    }
}

/**
 * Состояние машины
 */
class CarState {
    constructor(id) {
        this.id = id; // Уникальный идентификатор машины
        this.x = 0; // Текущая позиция X
        this.y = 0; // Текущая позиция Y
        this.speed = 0; // Текущая скорость (пикселей в секунду)
        this.isMoving = false; // Движется ли машина
        this.startTime = null; // Время начала движения
        this.stopTime = null; // Время остановки
        this.distanceTraveled = 0; // Пройденное расстояние
        this.targetTime = null; // Целевое время для уровня 1 и 3
        this.isControlledByMouse = false; // Управляется ли мышью (уровень 3)
        this.progress = 0; // Прогресс от 0 до 1
        this.reachedFinish = false; // Достигла ли машина финиша (для уровня 2)
    }
    
    /**
     * Инициализация машины
     * @param {RoadParams} road - Параметры дороги
     * @param {SpeedParams} speedParams - Параметры скорости
     */
    init(road, speedParams) {
        this.x = road.startX;
        this.y = road.startY;
        this.speed = speedParams.currentSpeed;
        this.isMoving = false;
        this.distanceTraveled = 0;
        this.progress = 0;
        this.reachedFinish = false;
    }
    
    /**
     * Запуск движения машины
     */
    start() {
        this.isMoving = true;
        this.startTime = Date.now();
    }
    
    /**
     * Остановка машины
     */
    stop() {
        this.isMoving = false;
        this.stopTime = Date.now();
    }
    
    /**
     * Обновление позиции машины
     * @param {number} deltaTime - Время в миллисекундах с последнего обновления
     * @param {RoadParams} road - Параметры дороги
     * @param {number} stopAfterTime - Остановить через указанное время в секундах (для уровня 1)
     * @returns {boolean} true, если машина достигла финиша (для уровня 2)
     */
    update(deltaTime, road, stopAfterTime = null) {
        if (!this.isMoving) return false;
        
        // Проверяем, нужно ли остановить по времени (только для уровня 1)
        if (stopAfterTime !== null && this.startTime) {
            const elapsedSeconds = (Date.now() - this.startTime) / 1000;
            if (elapsedSeconds >= stopAfterTime) {
                this.stop();
                return false;
            }
        }
        
        // Вычисляем пройденное расстояние
        const distance = (this.speed * deltaTime) / 1000; // Конвертируем в пиксели
        this.distanceTraveled += distance;
        
        // Для уровня 2 проверяем достижение финиша
        if (road.length !== Infinity && this.distanceTraveled >= road.length) {
            this.distanceTraveled = road.length;
            this.x = road.endX;
            this.y = road.endY;
            this.progress = 1;
            this.reachedFinish = true;
            this.stop();
            return true; // Достигли финиша
        }
        
        // Обновляем позицию
        this.x = road.startX + this.distanceTraveled;
        this.y = road.startY;
        
        // Для бесконечной дороги прогресс не ограничен 1
        // Для конечной дороги прогресс от 0 до 1
        if (road.length !== Infinity) {
            this.progress = this.distanceTraveled / road.length;
        } else {
            this.progress = this.distanceTraveled / 1000; // Нормализуем для отображения
        }
        
        return false; // Не достигли финиша
    }
    
    /**
     * Получение времени движения машины
     * @returns {number} Время в секундах или null, если машина не останавливалась
     */
    getTravelTime() {
        if (this.startTime && this.stopTime) {
            return (this.stopTime - this.startTime) / 1000;
        }
        return null;
    }
    
    /**
     * Установка позиции для управления мышью (уровень 3)
     * @param {number} x - Позиция X (с учетом смещения камеры)
     * @param {number} y - Позиция Y
     * @param {RoadParams} road - Параметры дороги
     * @param {number} cameraOffset - Смещение камеры по X
     */
    setMousePosition(x, y, road, cameraOffset = 0) {
        // Вычисляем позицию относительно начала дороги с учетом камеры
        const worldX = x + cameraOffset;
        const distanceFromStart = worldX - road.startX;
        
        // Для конечной дороги (уровень 2) ограничиваем максимальной длиной
        if (road.length !== Infinity) {
            if (distanceFromStart >= road.length) {
                this.distanceTraveled = road.length;
                this.x = road.endX;
                this.y = road.endY;
                this.progress = 1;
                if (!this.reachedFinish) {
                    this.reachedFinish = true;
                    this.stop();
                }
                return;
            }
        }
        
        // Для бесконечной дороги ограничиваем только минимальной позицией
        if (distanceFromStart > this.distanceTraveled) {
            this.distanceTraveled = Math.max(0, distanceFromStart);
        }
        
        this.x = road.startX + this.distanceTraveled;
        this.y = road.startY;
        
        if (road.length !== Infinity) {
            this.progress = this.distanceTraveled / road.length;
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
    }
}

/**
 * Параметры раунда
 */
class RoundParams {
    constructor() {
        this.road = new RoadParams();
        this.roads = null; // Массив дорог для уровня 2 (две разные дороги)
        this.speedParams = new SpeedParams();
        this.cars = []; // Массив машин
        this.targetTime = 0; // Целевое время для уровня 1 (результат) и уровня 3 (генерируется)
        this.speedOptions = []; // Варианты скоростей для выбора автоматической машины
        this.timeOptions = []; // Варианты времени для выбора (уровень 1)
        this.synchronizationTime = 0; // Время синхронизации для уровня 2
        this.selectedSpeed = 0; // Выбранная скорость для автоматической машины
        this.selectedTime = 0; // Выбранное время для уровня 1
        this.measuredTime = 0; // Измеренное время для уровня 1
    }
    
    /**
     * Генерация параметров раунда
     * @param {number} level - Номер уровня
     */
    generate(level) {
        // Генерируем дорогу
        this.road.generate(level);
        
        // Получаем базовую скорость для уровня
        const levelConfig = LEVELS_CONFIG[level];
        const baseSpeed = levelConfig.mechanics.baseSpeed;
        
        // Генерируем варианты времени для выбора (для управления мышкой)
        this.timeOptions = this.generateTimeOptions(level);
        
        // Генерируем варианты скорости для автоматической машины
        this.speedOptions = this.generateSpeedOptions(baseSpeed, level);
        
        // Для уровня 3 генерируем случайное целевое время от 3 до 5 секунд с шагом 0.5 для каждого раунда
        if (level === 3) {
            const minTime = 3;
            const maxTime = 5;
            const step = 0.5;
            // Генерируем все возможные значения: [3.0, 3.5, 4.0, 4.5, 5.0]
            const timeOptions = [];
            for (let time = minTime; time <= maxTime; time += step) {
                timeOptions.push(Math.round(time * 10) / 10);
            }
            // Случайно выбираем одно значение для текущего раунда
            const randomIndex = Math.floor(Math.random() * timeOptions.length);
            this.targetTime = timeOptions[randomIndex];
        }
        
        // Генерируем машины: всегда 2 машины на всех уровнях
        this.cars = [];
        
        // Автоматическая машина (движется с выбранной скоростью)
        const autoCar = new CarState('autoCar');
        autoCar.init(this.road, this.speedParams);
        // Скорость будет задана игроком через UI
        autoCar.speed = 0;
        this.cars.push(autoCar);
        
        // Машина, управляемая мышкой
        const mouseCar = new CarState('mouseCar');
        mouseCar.init(this.road, this.speedParams);
        mouseCar.isControlledByMouse = true;
        this.cars.push(mouseCar);
        
        // Сохраняем базовую скорость для использования в UI
        this.baseSpeed = baseSpeed;
    }
    
    /**
     * Генерация вариантов времени для управления мышкой
     * @param {number} level - Номер уровня
     * @returns {Array} Массив вариантов времени в секундах
     */
    generateTimeOptions(level) {
        const count = 5; // 5 вариантов времени
        
        if (level === 1) {
            // Для уровня 1: генерируем все возможные значения от 3 до 7 с шагом 0.5
            const minTime = 3;
            const maxTime = 7;
            const step = 0.5;
            const allOptions = [];
            
            for (let time = minTime; time <= maxTime; time += step) {
                allOptions.push(Math.round(time * 10) / 10);
            }
            
            // Случайно выбираем 5 значений и сортируем по возрастанию
            const selected = [];
            const available = [...allOptions];
            for (let i = 0; i < count && available.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * available.length);
                selected.push(available.splice(randomIndex, 1)[0]);
            }
            
            return selected.sort((a, b) => a - b);
        } else {
            // Для остальных уровней: время от 3 до 8 секунд
            const options = [];
            const minTime = 3;
            const maxTime = 8;
            const timeStep = (maxTime - minTime) / (count - 1);
            
            for (let i = 0; i < count; i++) {
                const time = Math.round((minTime + (timeStep * i)) * 10) / 10;
                options.push(time);
            }
            
            return options;
        }
    }
    
    /**
     * Генерация вариантов скорости для автоматической машины
     * @param {number} baseSpeed - Базовая скорость уровня
     * @param {number} level - Номер уровня
     * @returns {Array} Массив вариантов скорости в пикселях в секунду
     */
    generateSpeedOptions(baseSpeed, level) {
        const count = 5; // 5 вариантов скорости
        
        if (level === 1 || level === 2) {
            // Для уровня 1 и 2: генерируем все возможные значения от 1000 до 1600 с шагом 50
            const minSpeed = 1000;
            const maxSpeed = 1600;
            const step = 50;
            const allOptions = [];
            
            for (let speed = minSpeed; speed <= maxSpeed; speed += step) {
                allOptions.push(speed);
            }
            
            // Случайно выбираем 5 значений и сортируем по возрастанию
            const selected = [];
            const available = [...allOptions];
            for (let i = 0; i < count && available.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * available.length);
                selected.push(available.splice(randomIndex, 1)[0]);
            }
            
            return selected.sort((a, b) => a - b);
        } else {
            // Для остальных уровней: скорость от baseSpeed - 60 до baseSpeed + 60
            const options = [];
            const minSpeed = Math.max(50, baseSpeed - 60);
            const maxSpeed = baseSpeed + 60;
            const speedStep = (maxSpeed - minSpeed) / (count - 1);
            
            for (let i = 0; i < count; i++) {
                const speed = Math.round(minSpeed + (speedStep * i));
                options.push(speed);
            }
            
            return options;
        }
    }
}

/**
 * Экспорт для использования в других модулях
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LEVELS_CONFIG,
        GameState,
        RoadParams,
        SpeedParams,
        CarState,
        RoundParams
    };
}

