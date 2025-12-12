/**
 * Конфигурация уровней игры
 */
const LEVELS_CONFIG = {
    1: {
        name: 'Уровень 1',
        description: 'Ведите свою машину стрелками клавиатуры и доберитесь до финиша. Пробел дает ускорение.',
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
            type: 'keyboard_finish',
            baseSpeed: 120 // Базовая скорость для уровня 1
        }
    },
    2: {
        name: 'Уровень 2',
        description: 'Выберите скорость авто соперника. Ведите свою машину стрелками, ускоряйтесь пробелом. Первый, кто достигнет финиша, побеждает!',
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
        description: 'Доберитесь до финиша за целевое время (3-5 секунд ± 0.5). Если придете раньше или позже - проиграете! Выходить за рамки дороги нельзя :)',
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
    runStartTime: null,
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
        if (!this.runStartTime) {
            this.runStartTime = Date.now();
        }
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
        this.width = 120; // Более широкая дорога (чтобы машина уверенно помещалась)
        this.startX = 50; // Начальная позиция X
        this.startY = 0; // Начальная позиция Y
        this.endX = Infinity; // Конечная позиция X (бесконечность)
        this.endY = 0; // Конечная позиция Y
        this.checkpoints = []; // Контрольные точки для уровня 3 (не используются для бесконечной дороги)
        this.path = []; // Массив точек для кривой дороги (если нужна)
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }; // Границы полотна с учетом ширины
    }
    
    /**
     * Генерация случайных параметров дороги
     * @param {number} level - Номер уровня (влияет на сложность)
     */
    generate(level) {
        this.startX = 50;
        this.startY = 200 + Math.random() * 100;
        
        // Для всех уровней делаем конечную дорогу с финишем
        if (level === 1 || level === 2 || level === 3) {
            // Длина дороги от 4500 до 6500 пикселей (длиннее карта)
            this.length = 4500 + Math.random() * 2000;
            
            // Для уровня 1 создаем зигзагообразную дорогу
            if (level === 1) {
                this.generateZigzagPath();
            } else {
                // Для уровней 2 и 3 - прямая дорога
                this.endX = this.startX + this.length;
                this.endY = this.startY;
            }
        } else {
            // Для остальных уровней дорога бесконечна
            this.length = Infinity;
            this.endX = Infinity;
            this.endY = this.startY;
        }
        
        // Контрольные точки не используются
        this.checkpoints = [];
        this.updateBounds();
    }
    
    /**
     * Генерация пути с поворотами под углом 90 градусов
     * Дорога генерируется непрерывной без промежутков
     */
    generateZigzagPath() {
        const pathLength = this.length;
        // Случайное количество сегментов от 6 до 12 (чуть больше для сценариев с возвратом)
        const segments = 6 + Math.floor(Math.random() * 7);
        
        this.path = [];
        let currentX = this.startX;
        let currentY = this.startY;
        
        // Начальная точка
        this.path.push({ x: currentX, y: currentY });
        
        // Вычисляем среднюю длину сегмента
        const avgSegmentLength = pathLength / segments;
        
        // Начинаем с движения вправо (горизонтально)
        let isHorizontal = true; // true = горизонтально, false = вертикально
        let directionX = 1; // 1 = вправо, -1 = влево
        let directionY = 1; // 1 = вниз, -1 = вверх
        
        const minY = 100;
        const maxY = 500;
        const minX = 50;
        const maxX = this.startX + pathLength * 0.9; // Динамический предел вправо
        
        for (let i = 0; i < segments; i++) {
            // Случайная длина сегмента (80-120% от средней)
            const segmentLength = avgSegmentLength * (0.8 + Math.random() * 0.4);
            
            if (isHorizontal) {
                // Движемся горизонтально, с шансом вернуться влево
                const backtrackChance = 0.35; // шанс повернуть назад влево
                directionX = Math.random() > backtrackChance ? 1 : -1;
                currentX += directionX * segmentLength;
                
                // Ограничиваем позицию X
                currentX = Math.max(minX, Math.min(maxX, currentX));
                
                // Следующий сегмент будет вертикальным
                isHorizontal = false;
                // Случайно выбираем направление вертикального движения
                directionY = Math.random() > 0.5 ? 1 : -1;
            } else {
                // Движемся вертикально (вверх или вниз)
                currentY += directionY * segmentLength;
                
                // Ограничиваем позицию Y, чтобы дорога оставалась на экране
                currentY = Math.max(minY, Math.min(maxY, currentY));
                
                // Следующий сегмент будет горизонтальным
                isHorizontal = true;
                // Горизонтальное направление выбирается при самом сегменте (см. выше)
            }
            
            this.path.push({ x: currentX, y: currentY });
        }
        
        // Финальный сегмент: уводим финиш вправо, чтобы трасса заканчивалась правее старта
        const finalLength = avgSegmentLength * 1.2;
        currentX = Math.max(currentX + finalLength, this.startX + 200); // гарантируем смещение вправо
        this.path.push({ x: currentX, y: currentY });
        
        // Финиш в последней точке
        this.endX = currentX;
        this.endY = currentY;
        
        // Вычисляем реальную длину пути
        let totalLength = 0;
        for (let i = 0; i < this.path.length - 1; i++) {
            const dx = this.path[i + 1].x - this.path[i].x;
            const dy = this.path[i + 1].y - this.path[i].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        this.length = totalLength;
        
        // Корректируем стартовые координаты, чтобы машина спавнилась точно по центру дороги
        this.startX = this.path[0].x;
        this.startY = this.path[0].y;
    }

    /**
     * Пересчитывает границы дороги с учетом ширины полотна
     */
    updateBounds() {
        const halfWidth = this.width / 2;

        if (this.path && this.path.length > 0) {
            let minX = this.path[0].x;
            let maxX = this.path[0].x;
            let minY = this.path[0].y;
            let maxY = this.path[0].y;

            for (let i = 1; i < this.path.length; i++) {
                const point = this.path[i];
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }

            this.bounds = {
                minX: minX - halfWidth,
                maxX: maxX + halfWidth,
                minY: minY - halfWidth,
                maxY: maxY + halfWidth
            };
        } else {
            const minX = Math.min(this.startX, this.endX);
            const maxX = Math.max(this.startX, this.endX);
            const minY = Math.min(this.startY, this.endY);
            const maxY = Math.max(this.startY, this.endY);

            this.bounds = {
                minX: minX - halfWidth,
                maxX: maxX + halfWidth,
                minY: minY - halfWidth,
                maxY: maxY + halfWidth
            };
        }
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
        this.skin = null; // Ключ скина ('car1' | 'car2')
        this.x = 0; // Текущая позиция X
        this.y = 0; // Текущая позиция Y
        this.speed = 0; // Текущая скорость (пикселей в секунду)
        this.isBoosting = false; // Флаг активного ускорения (пробел)
        this.isMoving = false; // Движется ли машина
        this.startTime = null; // Время начала движения
        this.stopTime = null; // Время остановки
        this.distanceTraveled = 0; // Пройденное расстояние
        this.targetTime = null; // Целевое время для уровня 1 и 3
        this.isControlledByMouse = false; // Управляется ли мышью (уровень 3)
        this.progress = 0; // Прогресс от 0 до 1
        this.reachedFinish = false; // Достигла ли машина финиша (для уровня 2)
        this.angle = 0; // Угол направления движения (в радианах), 0 = вправо
        this.renderAngle = 0; // Угол поворота спрайта для отрисовки
        this.hasTouchedRoad = false; // Для уровня 3: флаг первого касания дороги
        this.crashArmedAt = null; // Время, когда разрешено аварийное срабатывание
    }
    
    /**
     * Инициализация машины
     * @param {RoadParams} road - Параметры дороги
     * @param {SpeedParams} speedParams - Параметры скорости
     */
    init(road, speedParams) {
        this.speed = speedParams.currentSpeed;
        this.isMoving = false;
        this.reachedFinish = false;

        // Старт чуть внутри дороги на уровне 1
        let startX = road.startX;
        let startY = road.startY;
        this.distanceTraveled = 0;
        if (GameState.currentLevel === 1 && road.path && road.path.length > 1) {
            const p1 = road.path[0];
            const p2 = road.path[1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredOffset = 80;
            const offset = Math.min(desiredOffset, segmentLength * 0.8);
            const t = offset / segmentLength;
            startX = p1.x + dx * t;
            startY = p1.y + dy * t;
            this.distanceTraveled = offset;
        }

        this.x = startX;
        this.y = startY;
        if (road.length !== Infinity) {
            this.progress = Math.min(1, this.distanceTraveled / road.length);
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
        // Инициализируем угол движения по направлению дороги
        if (road.path && road.path.length > 1) {
            // Для зигзагообразной дороги берем направление первого сегмента
            const p1 = road.path[0];
            const p2 = road.path[1];
            this.angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        } else {
            // Для прямой дороги вычисляем угол от начала к концу
            this.angle = Math.atan2(road.endY - road.startY, road.endX - road.startX);
        }
        this.renderAngle = 0;
        this.hasTouchedRoad = false;
        this.crashArmedAt = null;
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
        this.isBoosting = false;
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
        
        // Автоматическое движение не использует ускорение
        this.isBoosting = false;
        
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
        const halfWidth = (road.width || 0) / 2;
        const clampedY = Math.min(Math.max(y, road.startY - halfWidth), road.startY + halfWidth);
        
        // Для конечной дороги (уровень 2) ограничиваем максимальной длиной
        if (road.length !== Infinity) {
            if (distanceFromStart >= road.length) {
                this.distanceTraveled = road.length;
                this.x = road.endX;
                this.y = clampedY;
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
        this.y = clampedY;
        
        if (road.length !== Infinity) {
            this.progress = this.distanceTraveled / road.length;
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
    }
    
    /**
     * Перемещение машины клавишами на уровне 2 с ускорением пробелом
     * @param {number} deltaTime - Время в миллисекундах с последнего обновления
     * @param {RoadParams} road - Параметры дороги
     * @param {Object} keys - Состояние нажатых клавиш
     * @param {number} baseSpeed - Базовая скорость игрока
     * @param {number} boostMultiplier - Множитель ускорения при зажатом пробеле
     */
    moveByKeyboardLevel2(deltaTime, road, keys, baseSpeed, boostMultiplier = 1.2) {
        if (!this.isMoving) {
            this.isBoosting = false;
            return;
        }
        
        // Двигаемся только при зажатой стрелке
        const hasDirectionKey = keys.right || keys.left || keys.up || keys.down;
        if (!hasDirectionKey) {
            this.isBoosting = false;
            return;
        }
        
        const normalizedBaseSpeed = Math.max(0, baseSpeed || 0);
        if (normalizedBaseSpeed === 0) {
            this.isBoosting = false;
            return;
        }
        
        const isBoostActive = Boolean(keys.space);
        const effectiveSpeed = normalizedBaseSpeed * (isBoostActive ? boostMultiplier : 1);
        this.isBoosting = isBoostActive;
        const direction = (keys.left || keys.down) ? -1 : 1;
        const distanceDelta = (effectiveSpeed * deltaTime) / 1000 * direction;
        
        // Ограничиваем внутри дороги
        const maxDistance = road.length !== Infinity ? road.length : this.distanceTraveled + Math.abs(distanceDelta);
        this.distanceTraveled = Math.min(
            Math.max(0, this.distanceTraveled + distanceDelta),
            maxDistance
        );
        
        this.x = road.startX + this.distanceTraveled;
        this.y = road.startY;
        
        if (road.length !== Infinity) {
            this.progress = Math.min(1, this.distanceTraveled / road.length);
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
    }
    
    /**
     * Перемещение машины следованием за цветом дороги (уровень 1)
     * @param {number} deltaTime - Время в миллисекундах с последнего обновления
     * @param {RoadParams} road - Параметры дороги
     * @param {Object} keys - Объект с состоянием нажатых клавиш (используется для направления)
     * @param {CanvasRenderingContext2D} bgCtx - Контекст фонового canvas для получения цвета
     * @param {HTMLCanvasElement} bgCanvas - Фоновый canvas
     * @param {number} moveSpeed - Скорость перемещения в пикселях в секунду
     */
    moveByColorFollowing(deltaTime, road, keys, bgCtx, bgCanvas, moveSpeed = 420) {
        if (!this.isMoving) {
            this.isBoosting = false;
            return;
        }
        
        // Движемся только при зажатой клавише направления
        const hasDirectionKey = keys.right || keys.left || keys.up || keys.down;
        if (!hasDirectionKey) {
            this.isBoosting = false;
            return;
        }
        
        // Ускорение при зажатом пробеле
        const isBoostActive = Boolean(keys.space);
        this.isBoosting = isBoostActive;
        const effectiveMoveSpeed = moveSpeed * (isBoostActive ? 3 : 1);
        
        // Определяем целевой цвет дороги - теперь это просто черная заливка
        const targetColor = { r: 0, g: 0, b: 0, tolerance: 50 };
        const whiteColor = { r: 255, g: 255, b: 255, tolerance: 50 };
        
        // Функция для получения цвета пикселя
        const getPixelColor = (x, y) => {
            const px = Math.max(0, Math.min(Math.floor(x), bgCanvas.width - 1));
            const py = Math.max(0, Math.min(Math.floor(y), bgCanvas.height - 1));
            
            try {
                const data = bgCtx.getImageData(px, py, 1, 1).data;
                return { r: data[0], g: data[1], b: data[2] };
            } catch (e) {
                return { r: 255, g: 255, b: 255 }; // Белый по умолчанию при ошибке
            }
        };
        
        // Функция проверки цвета
        const colorMatch = (color, target) => {
            const dr = Math.abs(color.r - target.r);
            const dg = Math.abs(color.g - target.g);
            const db = Math.abs(color.b - target.b);
            return (dr + dg + db <= target.tolerance);
        };
        
        // Определяем направление движения на основе клавиш
        let desiredAngle = this.angle || 0;
        if (keys.right) desiredAngle = 0; // Вправо
        else if (keys.left) desiredAngle = Math.PI; // Влево
        else if (keys.up) desiredAngle = -Math.PI / 2; // Вверх
        else if (keys.down) desiredAngle = Math.PI / 2; // Вниз
        
        // Если клавиша нажата, обновляем угол
        if (keys.right || keys.left || keys.up || keys.down) {
            this.angle = desiredAngle;
        }
        
        // Расстояние сенсоров
        const sensorDistance = 30;
        
        // Три сенсора: влево, центр, вправо
        const leftAngle = this.angle - Math.PI / 4;
        const centerAngle = this.angle;
        const rightAngle = this.angle + Math.PI / 4;
        
        const leftX = this.x + Math.cos(leftAngle) * sensorDistance;
        const leftY = this.y + Math.sin(leftAngle) * sensorDistance;
        const centerX = this.x + Math.cos(centerAngle) * sensorDistance;
        const centerY = this.y + Math.sin(centerAngle) * sensorDistance;
        const rightX = this.x + Math.cos(rightAngle) * sensorDistance;
        const rightY = this.y + Math.sin(rightAngle) * sensorDistance;
        
        // Получаем цвета под сенсорами
        const leftColor = getPixelColor(leftX, leftY);
        const centerColor = getPixelColor(centerX, centerY);
        const rightColor = getPixelColor(rightX, rightY);
        
        const leftOnRoad = colorMatch(leftColor, targetColor);
        const centerOnRoad = colorMatch(centerColor, targetColor);
        const rightOnRoad = colorMatch(rightColor, targetColor);
        
        // Проверяем текущую позицию - если вне дороги, не двигаемся
        const currentColor = getPixelColor(this.x, this.y);
        const isOnRoadCurrent = colorMatch(currentColor, targetColor);
        if (!isOnRoadCurrent) {
            return;
        }

        // Логика движения на основе сенсоров и клавиш
        let moveX = 0;
        let moveY = 0;
        
        // Определяем направление движения на основе сенсоров и клавиш
        if (centerOnRoad) {
            // Если центр на дороге, движемся прямо
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (leftOnRoad && !rightOnRoad) {
            // Поворачиваем налево
            this.angle -= 0.08;
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (rightOnRoad && !leftOnRoad) {
            // Поворачиваем направо
            this.angle += 0.08;
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (leftOnRoad && rightOnRoad) {
            // Оба сенсора видят дорогу - движемся прямо
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (hasDirectionKey) {
            // Если нажата клавиша направления, но сенсоры не видят дорогу, движемся медленнее
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * 0.7 * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * 0.7 * (deltaTime / 1000);
        } else {
            // Не видим дорогу и нет направления - делаем небольшой поворот для поиска
            this.angle += 0.03;
        }
        
        // Вычисляем новую позицию
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        let boundedX = newX;
        let boundedY = newY;
        if (road.bounds) {
            const safetyMargin = Math.min(20, road.width * 0.25);
            const minY = (Number.isFinite(road.bounds.minY) ? road.bounds.minY : -Infinity) + safetyMargin;
            const maxY = (Number.isFinite(road.bounds.maxY) ? road.bounds.maxY : Infinity) - safetyMargin;
            boundedY = Math.min(Math.max(boundedY, minY), maxY);
        }
        
        // Проверяем цвет новой позиции
        const newColor = getPixelColor(boundedX, boundedY);
        const isNewPosOnRoad = colorMatch(newColor, targetColor);
        
        // Двигаемся только если новая позиция на дороге
        if (isNewPosOnRoad) {
            this.x = boundedX;
            this.y = boundedY;
        } else {
            // Впереди белое — не двигаемся. Небольшая коррекция угла в сторону ближайшего сенсора на дороге.
            if (leftOnRoad && !rightOnRoad) {
                this.angle -= 0.1;
            } else if (rightOnRoad && !leftOnRoad) {
                this.angle += 0.1;
            }
            return;
        }
        
        // Обновляем пройденное расстояние по пути дороги
        if (road.path && road.path.length > 0) {
            this.updateDistanceByPath(road);
        } else {
            this.distanceTraveled = Math.max(0, this.x - road.startX);
        }
        
        if (road.length !== Infinity) {
            this.progress = Math.min(1, this.distanceTraveled / road.length);
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
    }
    
    /**
     * Обновление пройденного расстояния по пути дороги
     * @param {RoadParams} road - Параметры дороги
     */
    updateDistanceByPath(road) {
        if (!road.path || road.path.length < 2) {
            this.distanceTraveled = 0;
            return;
        }
        
        // Находим ближайшую точку на пути к текущей позиции машины
        let minDistance = Infinity;
        let totalPathDistance = 0;
        
        for (let i = 0; i < road.path.length - 1; i++) {
            const p1 = road.path[i];
            const p2 = road.path[i + 1];
            
            // Вычисляем расстояние от точки до отрезка
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            
            // Проекция точки на отрезок
            const t = Math.max(0, Math.min(1, 
                ((this.x - p1.x) * dx + (this.y - p1.y) * dy) / (segmentLength * segmentLength)
            ));
            
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            
            const distToSegment = Math.sqrt(
                Math.pow(this.x - projX, 2) + Math.pow(this.y - projY, 2)
            );
            
            if (distToSegment < minDistance) {
                minDistance = distToSegment;
                // Вычисляем расстояние от начала пути до этой точки
                totalPathDistance = 0;
                for (let j = 0; j < i; j++) {
                    const segDx = road.path[j + 1].x - road.path[j].x;
                    const segDy = road.path[j + 1].y - road.path[j].y;
                    totalPathDistance += Math.sqrt(segDx * segDx + segDy * segDy);
                }
                // Добавляем расстояние по текущему сегменту
                totalPathDistance += t * segmentLength;
            }
        }
        
        this.distanceTraveled = Math.max(0, totalPathDistance);
    }

    /**
     * Привязка позиции машины к ближайшей точке дороги
     * @param {RoadParams} road - Параметры дороги
     */
    snapToRoad(road) {
        if (!road) return;

        // Прямая дорога
        if (!road.path || road.path.length < 2) {
            const clampedX = Math.max(road.startX, Math.min(road.endX, this.x));
            this.x = clampedX;
            this.y = road.startY;
            this.distanceTraveled = Math.max(0, clampedX - road.startX);
            if (road.length !== Infinity) {
                this.progress = Math.min(1, this.distanceTraveled / road.length);
            }
            this.angle = Math.atan2(road.endY - road.startY, road.endX - road.startX);
            return;
        }

        // Зигзаг: проекция на ближайший сегмент
        let bestDistance = Infinity;
        let bestPoint = { x: road.path[0].x, y: road.path[0].y };
        let bestTraveled = 0;
        let bestAngle = this.angle;
        let traveledAccum = 0;

        for (let i = 0; i < road.path.length - 1; i++) {
            const p1 = road.path[i];
            const p2 = road.path[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy) || 1;

            const t = Math.max(0, Math.min(1, ((this.x - p1.x) * dx + (this.y - p1.y) * dy) / (segmentLength * segmentLength)));
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const distToSeg = Math.sqrt(Math.pow(this.x - projX, 2) + Math.pow(this.y - projY, 2));

            if (distToSeg < bestDistance) {
                bestDistance = distToSeg;
                bestPoint = { x: projX, y: projY };
                bestTraveled = traveledAccum + t * segmentLength;
                bestAngle = Math.atan2(dy, dx);
            }

            traveledAccum += segmentLength;
        }

        this.x = bestPoint.x;
        this.y = bestPoint.y;
        this.distanceTraveled = Math.max(0, bestTraveled);
        if (road.length !== Infinity) {
            this.progress = Math.min(1, this.distanceTraveled / road.length);
        }
        this.angle = bestAngle;
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
        this.timeLimitSeconds = 0; // Лимит времени для уровня 1
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
        
        // Для уровня 1 не генерируем варианты времени и скорости
        if (level === 1) {
            this.timeOptions = [];
            this.speedOptions = [];
        } else {
            // Генерируем варианты времени для выбора (для управления мышкой)
            this.timeOptions = this.generateTimeOptions(level);
            
            // Генерируем варианты скорости для автоматической машины
            this.speedOptions = this.generateSpeedOptions(baseSpeed, level);
        }
        
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
        
        // Генерируем машины
        this.cars = [];
        
        // Для уровня 1 создаем только машину игрока
        if (level === 1) {
            const playerCar = new CarState('mouseCar');
            playerCar.init(this.road, this.speedParams);
            playerCar.isControlledByMouse = true;
            this.cars.push(playerCar);
        } else {
            // Для остальных уровней создаем 2 машины
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
        }
        
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

