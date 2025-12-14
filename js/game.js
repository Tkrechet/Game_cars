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
        this.cameraOffsetX = 0; // Смещение камеры по X
        this.cameraOffsetY = 0; // Смещение камеры по Y
        this.cameraFollowSpeed = 0.15; // Скорость следования камеры (0-1) - более плавное движение
        
        // Управление клавиатурой для уровня 1 (направление движения)
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };
        this.keyboardMoveSpeed = 420; // Скорость перемещения в пикселях в секунду (еще быстрее)
        this.level2PlayerBaseSpeed = 0; // Базовая скорость игрока на уровне 2
        this.level2BoostMultiplier = 1.2; // Ускорение при зажатом пробеле на уровне 2
        
        // Частицы дыма при ускорении
        this.smokeParticles = [];
        this.smokeEmitCooldowns = {};
        this.smokeEmitInterval = 60; // мс между частицами
        // Частицы взрыва при аварии
        this.explosionParticles = [];
        this.crashTriggered = false;
        
        // Фоновый canvas для системы следования за цветом (уровень 1)
        this.bgCanvas = null;
        this.bgCtx = null;
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
        const playerCar = roundParams.cars.find(car => car.isControlledByMouse) || { x: roundParams.road.startX, y: roundParams.road.startY };
        this.cameraOffsetX = (playerCar.x || roundParams.road.startX) - this.canvas.width / 2;
        this.cameraOffsetY = (playerCar.y || roundParams.road.startY) - this.canvas.height / 2;
        // Сбрасываем состояние клавиш при начале нового раунда
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };
        if (GameState.currentLevel === 2) {
            this.level2PlayerBaseSpeed = 0;
        }
        // Сбрасываем частицы ускорения
        this.smokeParticles = [];
        this.smokeEmitCooldowns = {};
        // Сбрасываем аварии и взрывы
        this.explosionParticles = [];
        this.crashTriggered = false;
        // Для уровня 1 создаем фоновый canvas сразу, чтобы проверить позицию машины
        if (GameState.currentLevel === 1) {
            this.createBackgroundCanvas();
            // Проверяем и корректируем позицию машины, чтобы она была на дороге
            this.ensureCarOnRoad();
        } else {
            this.bgCanvas = null;
            this.bgCtx = null;
        }
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
            
            // Для уровня 1 обновляем позицию машины, используя систему следования за цветом
            if (GameState.currentLevel === 1 && car.isControlledByMouse && car.isMoving) {
                // Фоновый canvas уже создан в initRound()
                if (this.bgCanvas && this.bgCtx) {
                    car.moveByColorFollowing(
                        deltaTime, 
                        this.currentRoundParams.road, 
                        this.keys, 
                        this.bgCtx, 
                        this.bgCanvas, 
                        this.keyboardMoveSpeed
                    );
                }
            }
        });
        
        // Управление машиной игрока на уровне 2 с клавиатуры
        if (GameState.currentLevel === 2) {
            const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
            if (playerCar && playerCar.isMoving) {
                const baseSpeed = this.level2PlayerBaseSpeed || this.currentRoundParams.selectedSpeed || playerCar.speed || this.keyboardMoveSpeed;
                const boostMultiplier = this.level2BoostMultiplier || 1;
                playerCar.moveByKeyboardLevel2(
                    deltaTime,
                    this.currentRoundParams.road,
                    this.keys,
                    baseSpeed,
                    boostMultiplier
                );
            }
        }
        
        // Для уровня 1, 2 и 3 проверяем достижение финиша ПОСЛЕ обновления позиций
        if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.checkFinishReached();
        }
        
        // Обновляем анимацию дымового шлейфа
        this.updateSmokeSystem(deltaTime);
        // Обновляем анимацию взрыва
        this.updateExplosionSystem(deltaTime);
        
        // Обновляем позицию камеры - следуем за самой правой машиной
        this.updateCamera();
    }
    
    
    updateSmokeSystem(deltaTime) {
        const dtSeconds = deltaTime / 1000;
        const activeParticles = [];
        
        this.smokeParticles.forEach((particle) => {
            const updatedLife = particle.life - deltaTime;
            if (updatedLife <= 0) {
                return;
            }
            
            particle.life = updatedLife;
            particle.x += Math.cos(particle.direction) * particle.speed * dtSeconds;
            particle.y += Math.sin(particle.direction) * particle.speed * dtSeconds;
            particle.size += particle.growth * dtSeconds;
            const lifeFactor = particle.life / particle.maxLife;
            particle.opacity = particle.baseOpacity * lifeFactor;
            
            activeParticles.push(particle);
        });
        
        this.smokeParticles = activeParticles;
        
        if (!this.currentRoundParams || !this.currentRoundParams.cars) return;
        
        this.currentRoundParams.cars.forEach((car) => {
            const cooldownKey = car.id || 'car';
            const nextCooldown = Math.max(0, (this.smokeEmitCooldowns[cooldownKey] || 0) - deltaTime);
            this.smokeEmitCooldowns[cooldownKey] = nextCooldown;
            
            if (car.isBoosting && car.isMoving && nextCooldown === 0) {
                this.emitBoostSmoke(car);
                this.smokeEmitCooldowns[cooldownKey] = this.smokeEmitInterval;
            }
        });
    }
    
    
    updateExplosionSystem(deltaTime) {
        const dtSeconds = deltaTime / 1000;
        const alive = [];
        this.explosionParticles.forEach((p) => {
            const life = p.life - deltaTime;
            if (life <= 0) return;
            p.life = life;
            p.x += Math.cos(p.direction) * p.speed * dtSeconds;
            p.y += Math.sin(p.direction) * p.speed * dtSeconds;
            p.size += p.growth * dtSeconds;
            const lf = p.life / p.maxLife;
            p.opacity = p.baseOpacity * lf;
            alive.push(p);
        });
        this.explosionParticles = alive;
    }

    renderExplosionParticles() {
        this.explosionParticles.forEach((p) => {
            const alpha = Math.max(0, Math.min(1, p.opacity));
            const color = p.color || '255,120,0';
            this.ctx.fillStyle = `rgba(${color}, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    spawnExplosion(x, y) {
        const count = 28;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 220 + Math.random() * 220;
            const size = 12 + Math.random() * 16;
            const maxLife = 450 + Math.random() * 250;
            const growth = 60 + Math.random() * 60;
            const baseOpacity = 0.9;
            const palette = ['255,140,0', '255,200,80', '255,80,60'];
            const color = palette[Math.floor(Math.random() * palette.length)];
            this.explosionParticles.push({
                x,
                y,
                size,
                growth,
                direction: angle,
                speed,
                maxLife,
                life: maxLife,
                baseOpacity,
                opacity: baseOpacity,
                color
            });
        }
    }

    emitBoostSmoke(car) {
        const carYOffset = this.getCarYOffset(car);
        const baseAngle = (car.renderAngle || 0) + Math.PI; // точка позади машины
        const offsetDistance = 38 + Math.random() * 8;
        const spawnX = car.x + Math.cos(baseAngle) * offsetDistance;
        const spawnY = car.y + carYOffset + Math.sin(baseAngle) * offsetDistance;
        const spread = (Math.random() - 0.5) * 0.7;
        
        this.smokeParticles.push({
            x: spawnX,
            y: spawnY,
            size: 12 + Math.random() * 6,
            growth: 28 + Math.random() * 10,
            direction: baseAngle + spread,
            speed: 25 + Math.random() * 25,
            maxLife: 450,
            life: 450,
            baseOpacity: 0.5,
            opacity: 0.5
        });
    }
    
    
    checkFinishReached() {
        if (!this.currentRoundParams) return;
        
        const road = this.currentRoundParams.road;
        if (road.length === Infinity) return;
        
        // Для уровня 1 проверяем только машину игрока
        if (GameState.currentLevel === 1) {
            const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
            if (!playerCar) return;
            
            if (playerCar.isMoving && !playerCar.reachedFinish) {
                // Проверяем достижение финиша по расстоянию или прогрессу
                let reached = false;
                
                // Проверяем расстояние до финиша — считаем касание по ширине дороги
                const finishTargetX = road.path && road.path.length > 0 ? road.path[road.path.length - 1].x : road.endX;
                const finishTargetY = road.path && road.path.length > 0 ? road.path[road.path.length - 1].y : road.endY;
                const distanceToFinish = Math.sqrt(
                    Math.pow(playerCar.x - finishTargetX, 2) + Math.pow(playerCar.y - finishTargetY, 2)
                );
                const touchRadius = road.width * 0.8; // касание по ширине дороги
                reached = distanceToFinish <= touchRadius;
                
                if (reached) {
                    playerCar.reachedFinish = true;
                    playerCar.progress = 1;
                    playerCar.distanceTraveled = road.length;
                    if (road.path && road.path.length > 0) {
                        const lastPoint = road.path[road.path.length - 1];
                        playerCar.x = lastPoint.x;
                        playerCar.y = lastPoint.y;
                    } else {
                        playerCar.x = road.endX;
                        playerCar.y = road.endY;
                    }
                    playerCar.stop();
                    // Победа на уровне 1 - достигли финиша
                    this.handleFinishReached(true);
                }
            }
            return;
        }
        
        const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        
        if (!autoCar || !mouseCar) return;
        
        // Проверяем, достигли ли финиша
        // Для уровня 2 проверяем обе машины
        if (GameState.currentLevel === 2) {
            const roadConfigLaps = this.currentRoundParams.road.laps;
            const lapsCount = (Number.isFinite(roadConfigLaps) && roadConfigLaps > 0) ? roadConfigLaps : 3; // жёстко 3 круга
            const lapLength = lapsCount > 0
                ? ((this.currentRoundParams.road.lapLength && this.currentRoundParams.road.lapLength > 0)
                    ? this.currentRoundParams.road.lapLength
                    : (this.currentRoundParams.road.length || 0) / lapsCount)
                : this.currentRoundParams.road.length;
            const finishDistance = (lapsCount > 0 ? lapLength * lapsCount : this.currentRoundParams.road.length) || 0;
            const finishX = this.currentRoundParams.road.endX;
            const finishY = this.currentRoundParams.road.endY;
            // Привязка к фактическому объекту финиша (клетка size = width * 1.6)
            const finishHalfSize = Math.abs(this.currentRoundParams.road.width || 0) * 0.8;
            const finishPadding = Math.max(8, (this.currentRoundParams.road.width || 0) * 0.12);
            const isInsideFinish = (car) => {
                const dx = Math.abs((car.x || 0) - finishX);
                const dy = Math.abs((car.y || 0) - finishY);
                return dx <= finishHalfSize + finishPadding && dy <= finishHalfSize + finishPadding;
            };

            // Функция для проверки и обновления кругов
            const updateLapForCar = (car) => {
                const closeToFinish = isInsideFinish(car);
                const wasInFinishZone = car.isInFinishZone || false;
                car.isInFinishZone = closeToFinish;
                
                // Если машина вышла из финишной зоны, обновляем количество завершенных кругов
                if (wasInFinishZone && !closeToFinish) {
                    // При первом покидании финиша (старте раунда) не обновляем круги, но запоминаем расстояние
                    if (!car.hasLeftFinishFirstTime) {
                        car.hasLeftFinishFirstTime = true;
                        car.distanceAtLastLap = car.distanceTraveled || 0;
                        car.maxDistanceSinceLastLap = car.distanceTraveled || 0;
                    } else {
                        // Круг засчитывается только если:
                        // 1. Машина движется вперед (не развернулась)
                        // 2. Машина проехала минимум 70% длины круга с момента последнего засчитанного круга
                        const isValidDirection = car.isMovingForward !== false;
                        const currentDistance = car.distanceTraveled || 0;
                        const lastLapDistance = car.distanceAtLastLap || 0;
                        
                        // Обновляем максимальное расстояние с момента последнего круга
                        // Это нужно, чтобы учесть случай, когда машина проехала вперед, потом развернулась и вернулась
                        if (currentDistance > car.maxDistanceSinceLastLap) {
                            car.maxDistanceSinceLastLap = currentDistance;
                        }
                        
                        // Для замкнутой дороги учитываем, что расстояние может "перевернуться" через старт
                        let distanceSinceLastLap;
                        if (car.maxDistanceSinceLastLap >= lastLapDistance) {
                            // Обычный случай: максимальное расстояние увеличилось
                            distanceSinceLastLap = car.maxDistanceSinceLastLap - lastLapDistance;
                        } else {
                            // Машина проехала через старт (замкнутая дорога)
                            // Расстояние от последнего круга до конца дороги + от начала до максимальной позиции
                            distanceSinceLastLap = (finishDistance - lastLapDistance) + car.maxDistanceSinceLastLap;
                        }
                        
                        const minLapDistance = lapLength * 0.7; // Минимум 70% длины круга
                        const hasCompletedFullLap = distanceSinceLastLap >= minLapDistance;
                        
                        if (isValidDirection && hasCompletedFullLap) {
                            // Машина вышла из финишной зоны и проехала полный круг - круг завершен
                            car.completedLaps = Math.min(lapsCount, car.completedLaps + 1);
                            car.distanceAtLastLap = currentDistance;
                            car.maxDistanceSinceLastLap = currentDistance;
                        }
                    }
                }
            };

            // Обновляем максимальное расстояние для автоматической машины
            if (autoCar.isMoving && !autoCar.reachedFinish && autoCar.hasLeftFinishFirstTime) {
                const currentDist = autoCar.distanceTraveled || 0;
                if (currentDist > autoCar.maxDistanceSinceLastLap) {
                    autoCar.maxDistanceSinceLastLap = currentDist;
                }
            }
            
            // Проверяем автоматическую машину
            if (autoCar.isMoving && !autoCar.reachedFinish) {
                updateLapForCar(autoCar);
                
                // Проверяем выигрыш: если завершено 2 круга (completedLaps = 2) и машина касается финишной зоны
                // Это означает, что машина входит в финишную зону в 3-й раз (на 3-м круге)
                if (autoCar.completedLaps >= lapsCount - 1 && autoCar.isInFinishZone) {
                    autoCar.reachedFinish = true;
                    autoCar.distanceTraveled = finishDistance;
                    autoCar.x = finishX;
                    autoCar.y = finishY;
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
            
            // Обновляем максимальное расстояние для машины игрока
            if (mouseCar.isMoving && !mouseCar.reachedFinish && mouseCar.hasLeftFinishFirstTime) {
                const currentDist = mouseCar.distanceTraveled || 0;
                if (currentDist > mouseCar.maxDistanceSinceLastLap) {
                    mouseCar.maxDistanceSinceLastLap = currentDist;
                }
            }
            
            // Проверяем машину игрока
            if (mouseCar.isMoving && !mouseCar.reachedFinish) {
                updateLapForCar(mouseCar);
                
                // Проверяем выигрыш: если завершено 2 круга (completedLaps = 2) и машина касается финишной зоны
                // Это означает, что машина входит в финишную зону в 3-й раз (на 3-м круге)
                if (mouseCar.completedLaps >= lapsCount - 1 && mouseCar.isInFinishZone) {
                    mouseCar.reachedFinish = true;
                    mouseCar.distanceTraveled = finishDistance;
                    mouseCar.x = finishX;
                    mouseCar.y = finishY;
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
                // Финиш как только касаемся полотна финиша, а не его центра
                const finishTargetX = road.path && road.path.length > 0 ? road.path[road.path.length - 1].x : road.endX;
                const finishTargetY = road.path && road.path.length > 0 ? road.path[road.path.length - 1].y : road.endY;
                const finishHalfSize = Math.abs(road.width || 0) * 0.8;
                const finishPadding = Math.max(8, (road.width || 0) * 0.12);
                const insideFinish = Math.abs(mouseCar.x - finishTargetX) <= finishHalfSize + finishPadding
                    && Math.abs(mouseCar.y - finishTargetY) <= finishHalfSize + finishPadding;

                if (insideFinish || mouseCar.distanceTraveled >= road.length) {
                    mouseCar.reachedFinish = true;
                    mouseCar.distanceTraveled = road.length;
                    mouseCar.x = finishTargetX;
                    mouseCar.y = finishTargetY;
                    mouseCar.progress = 1;
                    mouseCar.stop();
                    // Проверяем время достижения финиша
                    this.handleFinishReachedLevel3(mouseCar);
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
        
        const road = this.currentRoundParams.road;
        if (!road) return;

        const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!playerCar) return;

        const bounds = road.bounds || {};
        const padding = Math.max(40, road.width || 0);

        const minX = Number.isFinite(bounds.minX) ? bounds.minX : road.startX - padding;
        const maxX = Number.isFinite(bounds.maxX) ? bounds.maxX : (road.endX || road.startX) + padding;
        const minY = Number.isFinite(bounds.minY) ? bounds.minY : (road.startY || 0) - padding;
        const maxY = Number.isFinite(bounds.maxY) ? bounds.maxY : (road.startY || 0) + padding;

        const targetCameraOffsetX = playerCar.x - this.canvas.width / 2;
        const targetCameraOffsetY = playerCar.y - this.canvas.height / 2;

        // Плавно двигаем камеру к игроку
        this.cameraOffsetX += (targetCameraOffsetX - this.cameraOffsetX) * this.cameraFollowSpeed;
        this.cameraOffsetY += (targetCameraOffsetY - this.cameraOffsetY) * this.cameraFollowSpeed;

        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

        const minCamX = minX - padding;
        const maxCamX = Math.max(minCamX, (maxX + padding) - this.canvas.width);
        const minCamY = minY - padding;
        const maxCamY = Math.max(minCamY, (maxY + padding) - this.canvas.height);

        this.cameraOffsetX = clamp(this.cameraOffsetX, minCamX, maxCamX);
        this.cameraOffsetY = clamp(this.cameraOffsetY, minCamY, maxCamY);
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
        
        // Для конечной дороги используем длину дороги
        if (road.length !== Infinity) {
            // Для конечной дороги используем позицию финиша
            maxCarX = Math.max(maxCarX, road.endX);
        } else {
            // Для бесконечной дороги (если будет в будущем)
            if (maxCarX === 0) {
                maxCarX = road.startX;
            }
            maxCarX = Math.max(maxCarX, road.startX) + this.canvas.width * 10;
        }

        // Сохраняем состояние контекста для применения смещения камеры
        this.ctx.save();
        this.ctx.translate(-this.cameraOffsetX, -this.cameraOffsetY);

        // Отрисовываем дорогу с учетом камеры и позиций машин
        this.roadRenderer.render(this.ctx, this.currentRoundParams.road, this.cameraOffsetX, this.canvas.width, maxCarX);

        // Отрисовываем checkpoint сверху дороги (как зрители) только для уровней 2 и 3
        // if (GameState.currentLevel !== 1) {
        //     this.renderCheckpointAudience();
        // }

        // Отрисовываем финиш для всех уровней с конечной дорогой
        if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.renderFinish();
        }

        // Отрисовываем дымовой шлейф при ускорении
        this.renderSmokeParticles();
        // Отрисовываем взрывы
        this.renderExplosionParticles();

        // Отрисовываем машины
        this.renderCars();

        // Восстанавливаем состояние контекста
        this.ctx.restore();
    }
    
    
    renderSmokeParticles() {
        this.smokeParticles.forEach((particle) => {
            const alpha = Math.max(0, Math.min(1, particle.opacity));
            this.ctx.fillStyle = `rgba(185, 185, 185, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    
    renderFinishForRoad(road) {
        // Рисуем заметный клетчатый финиш
        const size = road.width * 1.6;
        const x0 = road.endX - size / 2;
        const y0 = road.endY - size / 2;
        const cell = size / 6;
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                const isBlack = (i + j) % 2 === 0;
                this.ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
                this.ctx.fillRect(x0 + i * cell, y0 + j * cell, cell, cell);
            }
        }
        // Толстая рамка вокруг финиша
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x0, y0, size, size);
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
        const checkpointSize = 50; // Размер checkpoint изображения (увеличен)
        const spacing = checkpointSize + 25; // Расстояние между checkpoint (размер + отступ)
        const yPosition = road.startY - road.width / 2 - checkpointSize - 20; // Позиция сверху дороги

        // После translate(-this.cameraOffsetX, -this.cameraOffsetY) координаты на canvas уже смещены
        // Видимая область на экране: от 0 до canvas.width/height в системе координат после translate
        // В системе координат дороги это: от cameraOffsetX до cameraOffsetX + canvas.width
        const visibleStart = this.cameraOffsetX;
        const visibleEnd = this.cameraOffsetX + this.canvas.width;

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
        
        // Рисуем заметный клетчатый финиш (независимо от изображения)
        const size = road.width * 1.6;
        const x0 = finishX - size / 2;
        const y0 = finishY - size / 2;
        const cell = size / 6;
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                const isBlack = (i + j) % 2 === 0;
                this.ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
                this.ctx.fillRect(x0 + i * cell, y0 + j * cell, cell, cell);
            }
        }
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x0, y0, size, size);
    }

    
    getCarYOffset(car) {
        return car.isControlledByMouse ? 20 : -20;
    }
    
    
    renderCars() {
        this.currentRoundParams.cars.forEach((car, index) => {
            // Для уровня 3 не отображаем автоматическую машину
            if (GameState.currentLevel === 3 && !car.isControlledByMouse) {
                return;
            }
            
            // Определяем тип машины по её id
            let carType = car.skin || null;
            if (!carType) {
                carType = (car.id === 'car2' || car.id === 'mouseCar') ? 'car2' : 'car1';
            }

            // Визуально смещаем машины по Y, чтобы они были видны на разных полосах
            const carYOffset = this.getCarYOffset(car); // Управляемая мышкой ниже, автоматическая выше
            
            // Увеличиваем размер машинок для лучшей видимости
            const carSize = 60;
            
            this.carRenderer.render(this.ctx, car, carType, carSize, carYOffset);
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
     * Устанавливает базовую скорость игрока для уровня 2
     * @param {number} speed - Скорость в пикселях в секунду
     */
    setLevel2PlayerBaseSpeed(speed) {
        this.level2PlayerBaseSpeed = Math.max(0, speed || 0);
    }

    /**
     * Обработка движения мыши (для уровня 3)
     * @param {number} mouseX - Координата X мыши (относительно canvas)
     * @param {number} mouseY - Координата Y мыши (относительно canvas)
     */
    handleMouseMove(mouseX, mouseY) {
        if (!this.currentRoundParams) return;
        
        // Для уровня 1 не используем мышь, используется клавиатура
        if (GameState.currentLevel === 1) return;
        // Для уровня 2 используется клавиатура и ускорение пробелом
        if (GameState.currentLevel === 2) return;

        // Находим машину, управляемую мышью
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        const road = this.currentRoundParams.road;
        const worldX = mouseX + this.cameraOffsetX;
        const worldY = mouseY + this.cameraOffsetY;

        // Стартуем движение только после первого попадания курсора на дорогу,
        // но после арминга позволяем уйти курсором за пределы, чтобы сработал сход
        const cursorOnRoad = this.isPointOnRoad(worldX, worldY, road);
        if (!mouseCar.hasTouchedRoad) {
            if (!cursorOnRoad) return;
            mouseCar.hasTouchedRoad = true;
            mouseCar.crashArmedAt = Date.now();
        }

        if (mouseCar && mouseCar.isMoving) {
            // Передаем смещение камеры для правильного вычисления позиции
            mouseCar.setMousePosition(mouseX, mouseY, this.currentRoundParams.road, this.cameraOffsetX);

            // Взрыв только если сама машина ушла за пределы дороги
            const crashArmed = mouseCar.hasTouchedRoad && mouseCar.crashArmedAt && (Date.now() - mouseCar.crashArmedAt >= 200);
            if (!this.isPointOnRoad(mouseCar.x, mouseCar.y, road) && crashArmed) {
                this.handleCrashOffRoad(mouseCar);
                return;
            }
            
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
     * Проверяет, находится ли точка на полотне дороги с учетом ширины
     * @param {number} worldX - Мировая X-координата (с учетом камеры)
     * @param {number} worldY - Мировая Y-координата
     * @param {RoadParams} road - Параметры дороги
     * @returns {boolean}
     */
    isPointOnRoad(worldX, worldY, road) {
        if (!road) return false;
        const halfWidth = (road.width || 0) / 2;
        const tolerance = 2;
        const safeHalfWidth = halfWidth + tolerance;
        const finishTolerance = Math.max(10, road.width ? road.width * 0.2 : 10);

        const pointSegmentDistance = (px, py, a, b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) {
                return Math.sqrt(Math.pow(px - a.x, 2) + Math.pow(py - a.y, 2));
            }
            const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
            const projX = a.x + t * dx;
            const projY = a.y + t * dy;
            return Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
        };

        // Для прямой дороги
        if (!road.path || road.path.length < 2) {
            const minX = Math.min(road.startX, road.endX);
            const maxX = Math.max(road.startX, road.endX) + finishTolerance;
            const minY = (road.startY || 0) - safeHalfWidth;
            const maxY = (road.startY || 0) + safeHalfWidth;
            return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
        }

        // Для произвольной дороги: проверяем расстояние до каждого сегмента пути
        for (let i = 0; i < road.path.length - 1; i++) {
            const p1 = road.path[i];
            const p2 = road.path[i + 1];
            const dist = pointSegmentDistance(worldX, worldY, p1, p2);
            if (dist <= safeHalfWidth + finishTolerance * 0.2) {
                return true;
            }
        }

        return false;
    }

    /**
     * Авария при сходе с дороги на уровне 3
     * @param {CarState} mouseCar
     */
    handleCrashOffRoad(mouseCar) {
        if (this.crashTriggered) return;
        this.crashTriggered = true;

        const carYOffset = this.getCarYOffset(mouseCar);
        this.spawnExplosion(mouseCar.x, mouseCar.y + carYOffset);

        mouseCar.stop();
        mouseCar.reachedFinish = true;

        // Фиксируем время для статистики/отображения
        const finishTime = mouseCar.startTime ? (Date.now() - mouseCar.startTime) / 1000 : 0;

        if (typeof stopLevel3Timer === 'function') {
            stopLevel3Timer();
        }

        setTimeout(() => {
            if (typeof showRoundResult === 'function') {
                showRoundResult(
                    false,
                    'Авария! Вы слетели с дороги',
                    'Держитесь на черной полосе, чтобы продолжать движение',
                    null
                );
            } else if (typeof checkFinishResultLevel3 === 'function') {
                // Фоллбэк, если основной обработчик недоступен
                checkFinishResultLevel3(this.currentRoundParams, false, finishTime, this.currentRoundParams.targetTime, LEVELS_CONFIG[3].mechanics.timeTolerance);
            }
        }, 1000);
    }
    
    /**
     * Обработка нажатия клавиши клавиатуры (для уровней 1 и 2)
     * @param {KeyboardEvent} event - Событие клавиатуры
     */
    handleKeyDown(event) {
        if (GameState.currentLevel !== 1 && GameState.currentLevel !== 2) return;
        
        switch(event.key) {
            case 'ArrowUp':
            case 'Up':
                this.keys.up = true;
                event.preventDefault();
                this.setPlayerRenderAngle(-Math.PI / 2);
                break;
            case 'ArrowDown':
            case 'Down':
                this.keys.down = true;
                event.preventDefault();
                this.setPlayerRenderAngle(Math.PI / 2);
                break;
            case 'ArrowLeft':
            case 'Left':
                this.keys.left = true;
                event.preventDefault();
                this.setPlayerRenderAngle(Math.PI);
                break;
            case 'ArrowRight':
            case 'Right':
                this.keys.right = true;
                event.preventDefault();
                this.setPlayerRenderAngle(0);
                break;
            case ' ':
            case 'Spacebar':
                this.keys.space = true;
                event.preventDefault();
                break;
        }
    }
    
    /**
     * Обработка отпускания клавиши клавиатуры (для уровней 1 и 2)
     * @param {KeyboardEvent} event - Событие клавиатуры
     */
    handleKeyUp(event) {
        if (GameState.currentLevel !== 1 && GameState.currentLevel !== 2) return;
        
        switch(event.key) {
            case 'ArrowUp':
            case 'Up':
                this.keys.up = false;
                event.preventDefault();
                break;
            case 'ArrowDown':
            case 'Down':
                this.keys.down = false;
                event.preventDefault();
                break;
            case 'ArrowLeft':
            case 'Left':
                this.keys.left = false;
                event.preventDefault();
                break;
            case 'ArrowRight':
            case 'Right':
                this.keys.right = false;
                event.preventDefault();
                break;
            case ' ':
            case 'Spacebar':
                this.keys.space = false;
                event.preventDefault();
                break;
        }
    }

    /**
     * Устанавливает угол поворота спрайта машины игрока (уровень 1) по последней нажатой клавише
     * @param {number} angleRad - угол в радианах
     */
    setPlayerRenderAngle(angleRad) {
        if (!this.currentRoundParams || !this.currentRoundParams.cars) return;
        const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!playerCar) return;
        playerCar.renderAngle = angleRad;
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
    
    /**
     * Создает фоновый canvas для системы следования за цветом (уровень 1)
     */
    createBackgroundCanvas() {
        // Создаем canvas достаточно большого размера для всей дороги
        const road = this.currentRoundParams.road;
        const roadWidth = Math.max(this.canvas.width, road.length !== Infinity ? road.endX + 100 : 5000);
        const roadHeight = this.canvas.height;
        
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = roadWidth;
        this.bgCanvas.height = roadHeight;
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        // Отрисовываем фон с дорогой
        this.renderLevel1Background();
    }
    
    /**
     * Отрисовывает фон для уровня 1 (белый фон с черной дорогой)
     */
    renderLevel1Background() {
        if (!this.bgCtx || !this.currentRoundParams) return;
        
        const road = this.currentRoundParams.road;
        const ctx = this.bgCtx;
        
        // Заливаем белым
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        // Отрисовываем черную дорогу
        ctx.fillStyle = '#000000';
        this.drawRoadPath(ctx, road);
    }
    
    /**
     * Проверяет и корректирует позицию машины, чтобы она была на дороге
     */
    ensureCarOnRoad() {
        if (!this.currentRoundParams || !this.bgCtx || !this.bgCanvas) return;
        
        const road = this.currentRoundParams.road;
        const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!playerCar) return;
        
        // Функция для получения цвета пикселя
        const getPixelColor = (x, y) => {
            const px = Math.max(0, Math.min(Math.floor(x), this.bgCanvas.width - 1));
            const py = Math.max(0, Math.min(Math.floor(y), this.bgCanvas.height - 1));
            
            try {
                const data = this.bgCtx.getImageData(px, py, 1, 1).data;
                return { r: data[0], g: data[1], b: data[2] };
            } catch (e) {
                return { r: 255, g: 255, b: 255 };
            }
        };
        
        // Функция проверки цвета (черный = дорога)
        const isOnRoad = (color) => {
            const targetColor = { r: 0, g: 0, b: 0 };
            const tolerance = 50;
            const dr = Math.abs(color.r - targetColor.r);
            const dg = Math.abs(color.g - targetColor.g);
            const db = Math.abs(color.b - targetColor.b);
            return (dr + dg + db <= tolerance);
        };

        const findRoadNear = (baseX, baseY) => {
            const steps = [
                0,
                Math.max(6, road.width * 0.2),
                Math.max(10, road.width * 0.35),
                Math.max(14, road.width * 0.5)
            ];
            for (const step of steps) {
                const offsets = step === 0 ? [[0, 0]] : [
                    [step, 0], [-step, 0], [0, step], [0, -step],
                    [step, step], [step, -step], [-step, step], [-step, -step]
                ];
                for (const [dx, dy] of offsets) {
                    const color = getPixelColor(baseX + dx, baseY + dy);
                    if (isOnRoad(color)) {
                        return { x: baseX + dx, y: baseY + dy };
                    }
                }
            }
            return null;
        };

        const placeAtStart = () => {
            if (GameState.currentLevel === 1 && road.path && road.path.length > 1) {
                const p1 = road.path[0];
                const p2 = road.path[1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segmentLength = Math.sqrt(dx * dx + dy * dy) || 1;
                const desiredOffset = 80;
                const offset = Math.min(desiredOffset, segmentLength * 0.8);
                const t = offset / segmentLength;
                const candidateX = p1.x + dx * t;
                const candidateY = p1.y + dy * t;
                const onRoad = findRoadNear(candidateX, candidateY);
                if (onRoad) {
                    playerCar.x = onRoad.x;
                    playerCar.y = onRoad.y;
                    return;
                }
                playerCar.x = candidateX;
                playerCar.y = candidateY;
                return;
            }
            playerCar.x = road.startX;
            playerCar.y = road.startY;
        };
        
        // Проверяем текущую позицию машины
        const currentColor = getPixelColor(playerCar.x, playerCar.y);
        if (!isOnRoad(currentColor)) {
            // Если машина вне дороги, ставим в начало пути
            placeAtStart();
        }

        // Дополнительно проецируем на дорогу для точного попадания в полотно
        playerCar.snapToRoad(road);
    }
    
    /**
     * Вспомогательная функция для отрисовки пути дороги (fallback)
     */
    drawRoadPath(ctx, road) {
        if (road.path && road.path.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = road.width;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(road.path[0].x, road.path[0].y);
            for (let i = 1; i < road.path.length; i++) {
                ctx.lineTo(road.path[i].x, road.path[i].y);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            // Отрисовываем прямую дорогу
            ctx.fillRect(
                road.startX,
                road.startY - road.width / 2,
                road.endX - road.startX,
                road.width
            );
        }
    }
    
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameRenderer };
}

