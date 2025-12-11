/**
 * Основной модуль игры
 * Управляет отрисовкой всех элементов на canvas
 */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas с id "${canvasId}" не найден`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.roadRenderer = new RoadRenderer();
        this.carRenderer = new CarRenderer();
        
        this.finishImage = null;
        this.checkpointImage = null;
        this.imagesLoaded = false;
        
        this.currentRoundParams = null;
        this.animationFrameId = null;
        this.lastUpdateTime = Date.now();
        
        // Система камеры
        this.cameraOffset = 0; // Смещение камеры по X
        this.cameraFollowSpeed = 0.15; // Скорость следования камеры (0-1) - более плавное движение
    }

    /**
     * Загрузка всех изображений для уровня
     * @param {Object} levelConfig - Конфигурация уровня
     * @returns {Promise} Промис загрузки всех изображений
     */
    async loadLevelImages(levelConfig) {
        const promises = [];

        // Загружаем изображение дороги
        if (levelConfig.images.road) {
            promises.push(this.roadRenderer.loadImage(levelConfig.images.road));
        }

        // Загружаем изображения машин
        const carImages = {};
        if (levelConfig.images.car1) {
            carImages.car1 = levelConfig.images.car1;
        }
        if (levelConfig.images.car2) {
            carImages.car2 = levelConfig.images.car2;
        }
        if (Object.keys(carImages).length > 0) {
            promises.push(this.carRenderer.loadImages(carImages));
        }

        // Загружаем изображение финиша (для уровня 2 и 3)
        if (levelConfig.images.finish && (GameState.currentLevel === 2 || GameState.currentLevel === 3)) {
            promises.push(this.loadFinishImage(levelConfig.images.finish));
        }

        // Загружаем изображение контрольных точек (для уровня 3)
        if (levelConfig.images.checkpoint) {
            promises.push(this.loadCheckpointImage(levelConfig.images.checkpoint));
        }

        await Promise.all(promises);
        this.imagesLoaded = true;
    }

    /**
     * Загрузка изображения финиша
     * @param {string} imagePath - Путь к изображению
     * @returns {Promise} Промис загрузки изображения
     */
    loadFinishImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.finishImage = new Image();
            this.finishImage.onload = () => resolve();
            this.finishImage.onerror = () => reject(new Error(`Не удалось загрузить изображение финиша: ${imagePath}`));
            this.finishImage.src = imagePath;
        });
    }

    /**
     * Загрузка изображения контрольной точки
     * @param {string} imagePath - Путь к изображению
     * @returns {Promise} Промис загрузки изображения
     */
    loadCheckpointImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.checkpointImage = new Image();
            this.checkpointImage.onload = () => resolve();
            this.checkpointImage.onerror = () => reject(new Error(`Не удалось загрузить изображение контрольной точки: ${imagePath}`));
            this.checkpointImage.src = imagePath;
        });
    }

    /**
     * Инициализация раунда
     * @param {RoundParams} roundParams - Параметры раунда
     */
    initRound(roundParams) {
        this.currentRoundParams = roundParams;
        this.lastUpdateTime = Date.now();
        // Сбрасываем позицию камеры в начало дороги
        this.cameraOffset = roundParams.road.startX - this.canvas.width / 2;
    }

    
    update() {
        if (!this.currentRoundParams) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        // Обновляем позиции машин
        this.currentRoundParams.cars.forEach((car) => {
            if (car.isMoving && !car.isControlledByMouse) {
                // Автоматическая машина движется с заданной скоростью
                // Для уровня 1 останавливаем через выбранное время
                // Для уровня 2 движется до финиша
                // Для уровня 3 автоматическая машина не участвует
                if (GameState.currentLevel !== 3) {
                    const selectedTime = this.currentRoundParams.selectedTime;
                    if (GameState.currentLevel === 1 && selectedTime) {
                        car.update(deltaTime, this.currentRoundParams.road, selectedTime);
                    } else {
                        car.update(deltaTime, this.currentRoundParams.road);
                    }
                    
                    // Для уровня 2 немедленно проверяем достижение финиша автоматической машиной
                    if (GameState.currentLevel === 2 && car.reachedFinish && !car.isControlledByMouse) {
                        const mouseCar = this.currentRoundParams.cars.find(c => c.isControlledByMouse);
                        if (mouseCar && !mouseCar.reachedFinish) {
                            // Автоматическая машина достигла финиша первой - проигрыш
                            if (mouseCar.isMoving) {
                                mouseCar.stop();
                            }
                            this.handleFinishReached(false);
                            return; // Прерываем дальнейшее обновление
                        }
                    }
                }
            }
        });
        
        // Для уровня 2 и 3 проверяем достижение финиша ПОСЛЕ обновления позиций
        if (GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.checkFinishReached();
        }
        
        // Обновляем позицию камеры - следуем за самой правой машиной
        this.updateCamera();
    }
    
    
    checkFinishReached() {
        if (!this.currentRoundParams) return;
        
        const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        
        if (!autoCar || !mouseCar) return;
        
        // Проверяем, достигли ли финиша
        const road = this.currentRoundParams.road;
        if (road.length !== Infinity) {
            // Для уровня 2 проверяем обе машины
            if (GameState.currentLevel === 2) {
                // Проверяем автоматическую машину
                if (autoCar.isMoving && !autoCar.reachedFinish) {
                    if (autoCar.distanceTraveled >= road.length) {
                        autoCar.reachedFinish = true;
                        autoCar.distanceTraveled = road.length;
                        autoCar.x = road.endX;
                        autoCar.y = road.endY;
                        autoCar.progress = 1;
                        autoCar.stop();
                        // Если автоматическая машина достигла финиша первой - проигрыш
                        if (!mouseCar.reachedFinish) {
                            // Останавливаем машину игрока сразу
                            if (mouseCar.isMoving) {
                                mouseCar.stop();
                            }
                            this.handleFinishReached(false);
                            return; // Прерываем дальнейшую проверку
                        }
                    }
                }
                
                // Проверяем машину игрока
                if (mouseCar.isMoving && !mouseCar.reachedFinish) {
                    if (mouseCar.distanceTraveled >= road.length) {
                        mouseCar.reachedFinish = true;
                        mouseCar.distanceTraveled = road.length;
                        mouseCar.x = road.endX;
                        mouseCar.y = road.endY;
                        mouseCar.progress = 1;
                        mouseCar.stop();
                        // Если игрок достиг финиша первым - победа
                        if (!autoCar.reachedFinish) {
                            // Останавливаем автоматическую машину сразу
                            if (autoCar.isMoving) {
                                autoCar.stop();
                            }
                            this.handleFinishReached(true);
                            return; // Прерываем дальнейшую проверку
                        }
                    }
                }
            }
            
            // Для уровня 3 проверяем только машину игрока (автоматическая машина не участвует)
            if (GameState.currentLevel === 3) {
                if (mouseCar.isMoving && !mouseCar.reachedFinish) {
                    if (mouseCar.distanceTraveled >= road.length) {
                        mouseCar.reachedFinish = true;
                        mouseCar.stop();
                        // Проверяем время достижения финиша
                        this.handleFinishReachedLevel3(mouseCar);
                    }
                }
            }
        }
    }
    
    /**
     * Обработка достижения финиша
     * @param {boolean} playerWon - true, если игрок достиг финиша первым
     */
    handleFinishReached(playerWon) {
        // Останавливаем все машины
        this.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });
        
        // Вызываем обработчик результата через глобальную функцию
        if (typeof checkFinishResult === 'function') {
            checkFinishResult(this.currentRoundParams, playerWon);
        }
    }
    
    /**
     * Обработка достижения финиша для уровня 3 (проверка времени)
     * @param {CarState} mouseCar - Машина игрока
     */
    handleFinishReachedLevel3(mouseCar) {
        // Останавливаем все машины
        this.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });
        
        // Вычисляем время достижения финиша
        if (!mouseCar.startTime) return;
        
        const finishTime = (Date.now() - mouseCar.startTime) / 1000; // В секундах
        
        // Получаем конфигурацию уровня 3
        const levelConfig = LEVELS_CONFIG[3];
        const targetTime = this.currentRoundParams.targetTime; // Берем из параметров раунда
        const tolerance = levelConfig.mechanics.timeTolerance;
        
        // Проверяем, попало ли время в допустимый диапазон
        const minTime = targetTime - tolerance;
        const maxTime = targetTime + tolerance;
        const isWin = finishTime >= minTime && finishTime <= maxTime;
        
        // Вызываем обработчик результата через глобальную функцию
        if (typeof checkFinishResultLevel3 === 'function') {
            checkFinishResultLevel3(this.currentRoundParams, isWin, finishTime, targetTime, tolerance);
        }
    }
    
    
    updateCamera() {
        if (!this.currentRoundParams || this.currentRoundParams.cars.length === 0) return;
        
        // Находим самую правую машину (максимальный X)
        let maxX = 0;
        this.currentRoundParams.cars.forEach((car) => {
            if (car.x > maxX) {
                maxX = car.x;
            }
        });
        
        // Вычисляем целевую позицию камеры (центрируем машину на экране)
        const targetCameraOffset = maxX - this.canvas.width / 2;
        
        // Плавно перемещаем камеру к целевой позиции
        this.cameraOffset += (targetCameraOffset - this.cameraOffset) * this.cameraFollowSpeed;
        
        // Ограничиваем камеру, чтобы не уходила влево от начала дороги
        const road = this.currentRoundParams.road;
        if (this.cameraOffset < road.startX - this.canvas.width / 2) {
            this.cameraOffset = road.startX - this.canvas.width / 2;
        }
        
        // Для уровня 2 ограничиваем камеру справа, чтобы не уходила за финиш
        if (road.length !== Infinity) {
            const maxCameraOffset = road.endX - this.canvas.width / 2;
            if (this.cameraOffset > maxCameraOffset) {
                this.cameraOffset = maxCameraOffset;
            }
        }
    }

    
    render() {
        if (!this.currentRoundParams) return;

        // Обновляем прогресс-бар до финиша (для уровней 2 и 3)
        if (typeof updateProgressBar === 'function') {
            updateProgressBar();
        }

        // Заливаем canvas белым фоном
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Вычисляем максимальную позицию X машин для расчета необходимой длины дороги
        let maxCarX = 0;
        if (this.currentRoundParams.cars && this.currentRoundParams.cars.length > 0) {
            this.currentRoundParams.cars.forEach((car) => {
                if (car.x > maxCarX) {
                    maxCarX = car.x;
                }
            });
        }
        
        const road = this.currentRoundParams.road;
        
        // Для бесконечной дороги (уровень 1) всегда используем текущую позицию машин + большой запас
        if (road.length === Infinity) {
            if (maxCarX === 0) {
                // Если машины еще не начали движение, используем начальную позицию
                maxCarX = road.startX;
            }
            // Для бесконечной дороги всегда добавляем большой запас вперед от текущей позиции
            // Это гарантирует, что дорога будет отрисовываться достаточно далеко
            maxCarX = Math.max(maxCarX, road.startX) + this.canvas.width * 10;
        } else {
            // Для конечной дороги (уровень 2 и 3) используем расчет на основе выбранного времени
            if (this.currentRoundParams.selectedTime && this.currentRoundParams.selectedSpeed) {
                // Максимальное расстояние = максимальная скорость * максимальное время + запас
                // Учитываем выбранную скорость автоматической машины и максимальное время
                const maxSpeed = this.currentRoundParams.selectedSpeed;
                const maxTime = this.currentRoundParams.selectedTime;
                
                // Вычисляем максимальное расстояние, которое может проехать автоматическая машина
                const autoCarMaxDistance = maxSpeed * maxTime;
                
                // Для машины, управляемой мышкой, учитываем, что она может двигаться быстрее
                // Используем максимальную возможную скорость из вариантов (baseSpeed + 60)
                const levelConfig = LEVELS_CONFIG[GameState.currentLevel];
                const baseSpeed = levelConfig ? levelConfig.mechanics.baseSpeed : 240;
                const mouseCarMaxSpeed = baseSpeed + 60; // Максимальная возможная скорость
                const mouseCarMaxDistance = mouseCarMaxSpeed * maxTime;
                
                // Берем максимальное из двух расстояний
                const maxDistance = Math.max(autoCarMaxDistance, mouseCarMaxDistance);
                
                // Вычисляем максимальную позицию с учетом текущей позиции машин
                const calculatedMaxX = road.startX + maxDistance;
                maxCarX = Math.max(maxCarX, calculatedMaxX);
            } else if (maxCarX === 0) {
                // Если время и скорость еще не выбраны, используем начальную позицию
                maxCarX = road.startX;
            }
        }

        // Сохраняем состояние контекста для применения смещения камеры
        this.ctx.save();
        this.ctx.translate(-this.cameraOffset, 0);

        // Отрисовываем дорогу с учетом камеры и позиций машин
        this.roadRenderer.render(this.ctx, this.currentRoundParams.road, this.cameraOffset, this.canvas.width, maxCarX);

        // Отрисовываем checkpoint сверху дороги (как зрители)
        this.renderCheckpointAudience();

        // Отрисовываем финиш для уровня 2 и 3
        if (GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.renderFinish();
        }

        // Отрисовываем машины
        this.renderCars();

        // Восстанавливаем состояние контекста
        this.ctx.restore();
    }
    
    
    renderFinishForRoad(road) {
        if (!this.finishImage) {
            // Fallback: простая линия финиша
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(road.endX, road.endY - road.width / 2);
            this.ctx.lineTo(road.endX, road.endY + road.width / 2);
            this.ctx.stroke();
            return;
        }

        const finishSize = 50;
        this.ctx.drawImage(
            this.finishImage,
            road.endX - finishSize / 2,
            road.endY - finishSize / 2,
            finishSize,
            finishSize
        );
    }

    /**
     * Отрисовка контрольных точек
     */
    renderCheckpoints() {
        const checkpointSize = 30;
        this.currentRoundParams.road.checkpoints.forEach(checkpoint => {
            this.ctx.drawImage(
                this.checkpointImage,
                checkpoint.x - checkpointSize / 2,
                checkpoint.y - checkpointSize / 2,
                checkpointSize,
                checkpointSize
            );
        });
    }

    renderCheckpointAudience() {
        if (!this.checkpointImage || !this.currentRoundParams) return;

        const road = this.currentRoundParams.road;
        const checkpointSize = 40; // Размер checkpoint изображения
        const spacing = checkpointSize + 20; // Расстояние между checkpoint (размер + отступ)
        const yPosition = road.startY - road.width / 2 - checkpointSize - 20; // Позиция сверху дороги

        // После translate(-this.cameraOffset, 0) координаты на canvas уже смещены
        // Видимая область на экране: от 0 до canvas.width в системе координат после translate
        // В системе координат дороги это: от cameraOffset до cameraOffset + canvas.width
        const visibleStart = this.cameraOffset;
        const visibleEnd = this.cameraOffset + this.canvas.width;

        // Вычисляем начальный и конечный индексы checkpoint для отрисовки
        // Используем координаты относительно начала дороги
        const startIndex = Math.floor((visibleStart - road.startX) / spacing) - 1;
        const endIndex = Math.ceil((visibleEnd - road.startX) / spacing) + 1;

        // Отрисовываем checkpoint изображения
        // После translate координаты автоматически смещаются на -cameraOffset
        for (let i = startIndex; i <= endIndex; i++) {
            const xPosition = road.startX + i * spacing;
            this.ctx.drawImage(
                this.checkpointImage,
                xPosition - checkpointSize / 2,
                yPosition,
                checkpointSize,
                checkpointSize
            );
        }
    }

    
    renderFinish() {
        if (!this.currentRoundParams) return;
        
        const road = this.currentRoundParams.road;
        if (road.length === Infinity) return; // Финиш только для конечной дороги
        
        // Позиция финиша (translate уже применен в render(), поэтому используем абсолютные координаты)
        const finishX = road.endX;
        const finishY = road.endY;
        
        if (!this.finishImage) {
            // Fallback: простая линия финиша
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(finishX, finishY - road.width / 2);
            this.ctx.lineTo(finishX, finishY + road.width / 2);
            this.ctx.stroke();
            return;
        }

        const finishSize = 50;
        this.ctx.drawImage(
            this.finishImage,
            finishX - finishSize / 2,
            finishY - finishSize / 2,
            finishSize,
            finishSize
        );
    }

    
    renderCars() {
        this.currentRoundParams.cars.forEach((car, index) => {
            // Для уровня 3 не отображаем автоматическую машину
            if (GameState.currentLevel === 3 && !car.isControlledByMouse) {
                return;
            }
            
            // Определяем тип машины по её id
            let carType = 'car1';
            if (car.id === 'car2' || car.id === 'mouseCar') {
                carType = 'car2';
            } else if (car.id === 'autoCar') {
                carType = 'car1';
            }

            // Визуально смещаем машины по Y, чтобы они были видны на разных полосах
            const carYOffset = car.isControlledByMouse ? 15 : -15; // Управляемая мышкой ниже, автоматическая выше
            
            this.carRenderer.render(this.ctx, car, carType, 40, carYOffset);
        });
    }
    
    
    getRoadForCar(carIndex) {
        if (GameState.currentLevel === 2 && this.currentRoundParams.roads) {
            return this.currentRoundParams.roads[carIndex];
        }
        return this.currentRoundParams.road;
    }

    
    start() {
        const gameLoop = () => {
            this.update();
            this.render();
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Обработка движения мыши (для всех уровней)
     * @param {number} mouseX - Координата X мыши (относительно canvas)
     * @param {number} mouseY - Координата Y мыши (относительно canvas)
     */
    handleMouseMove(mouseX, mouseY) {
        if (!this.currentRoundParams) return;

        // Находим машину, управляемую мышью
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (mouseCar && mouseCar.isMoving) {
            // Передаем смещение камеры для правильного вычисления позиции
            mouseCar.setMousePosition(mouseX, mouseY, this.currentRoundParams.road, this.cameraOffset);
            
            // Для уровня 2 проверяем достижение финиша после обновления позиции
            if (GameState.currentLevel === 2 && mouseCar.reachedFinish) {
                const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
                if (autoCar && !autoCar.reachedFinish) {
                    // Игрок достиг финиша первым
                    this.handleFinishReached(true);
                }
            }
            
            // Для уровня 3 проверяем достижение финиша после обновления позиции
            if (GameState.currentLevel === 3 && mouseCar.reachedFinish) {
                this.handleFinishReachedLevel3(mouseCar);
            }
        }
    }
    
    /**
     * Проверка победы: наша машина правее автоматической
     * @returns {boolean} true, если мы победили
     */
    checkWin() {
        if (!this.currentRoundParams) return false;
        
        const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        
        if (!autoCar || !mouseCar) return false;
        
        // Победа, если наша машина правее автоматической
        return mouseCar.x > autoCar.x;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameRenderer };
}

