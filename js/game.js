

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

        this.cameraOffsetX = 0; 
        this.cameraOffsetY = 0; 
        this.cameraFollowSpeed = 0.15; 

        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };
        this.keyboardMoveSpeed = 420; 
        this.level2PlayerBaseSpeed = 0; 
        this.level2BoostMultiplier = 1.2; 

        this.smokeParticles = [];
        this.smokeEmitCooldowns = {};
        this.smokeEmitInterval = 60; 
        
        this.explosionParticles = [];
        this.crashTriggered = false;

        this.bgCanvas = null;
        this.bgCtx = null;
    }

    async loadLevelImages(levelConfig) {
        const promises = [];

        if (levelConfig.images.road) {
            promises.push(this.roadRenderer.loadImage(levelConfig.images.road));
        }

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

        if (levelConfig.images.finish && (GameState.currentLevel === 2 || GameState.currentLevel === 3)) {
            promises.push(this.loadFinishImage(levelConfig.images.finish));
        }

        if (levelConfig.images.checkpoint) {
            promises.push(this.loadCheckpointImage(levelConfig.images.checkpoint));
        }

        await Promise.all(promises);
        this.imagesLoaded = true;
    }

    loadFinishImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.finishImage = new Image();
            this.finishImage.onload = () => resolve();
            this.finishImage.onerror = () => reject(new Error(`Не удалось загрузить изображение финиша: ${imagePath}`));
            this.finishImage.src = imagePath;
        });
    }

    loadCheckpointImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.checkpointImage = new Image();
            this.checkpointImage.onload = () => resolve();
            this.checkpointImage.onerror = () => reject(new Error(`Не удалось загрузить изображение контрольной точки: ${imagePath}`));
            this.checkpointImage.src = imagePath;
        });
    }

    initRound(roundParams) {
        this.currentRoundParams = roundParams;
        this.lastUpdateTime = Date.now();
        
        const playerCar = roundParams.cars.find(car => car.isControlledByMouse) || { x: roundParams.road.startX, y: roundParams.road.startY };
        this.cameraOffsetX = (playerCar.x || roundParams.road.startX) - this.canvas.width / 2;
        this.cameraOffsetY = (playerCar.y || roundParams.road.startY) - this.canvas.height / 2;
        
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
        
        this.smokeParticles = [];
        this.smokeEmitCooldowns = {};
        
        this.explosionParticles = [];
        this.crashTriggered = false;
        
        if (GameState.currentLevel === 1) {
            this.createBackgroundCanvas();
            
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

        this.currentRoundParams.cars.forEach((car) => {
            if (car.isMoving && !car.isControlledByMouse) {

                if (GameState.currentLevel !== 3) {
                    const selectedTime = this.currentRoundParams.selectedTime;
                    if (GameState.currentLevel === 1 && selectedTime) {
                        car.update(deltaTime, this.currentRoundParams.road, selectedTime);
                    } else {
                        car.update(deltaTime, this.currentRoundParams.road);
                    }

                    if (GameState.currentLevel === 2 && car.reachedFinish && !car.isControlledByMouse) {
                        const mouseCar = this.currentRoundParams.cars.find(c => c.isControlledByMouse);
                        if (mouseCar && !mouseCar.reachedFinish) {
                            
                            if (mouseCar.isMoving) {
                                mouseCar.stop();
                            }
                            this.handleFinishReached(false);
                            return; 
                        }
                    }
                }
            }

            if (GameState.currentLevel === 1 && car.isControlledByMouse && car.isMoving) {
                
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

        if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.checkFinishReached();
        }

        this.updateSmokeSystem(deltaTime);
        
        this.updateExplosionSystem(deltaTime);

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
        const baseAngle = (car.renderAngle || 0) + Math.PI; 
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

        if (GameState.currentLevel === 1) {
            const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
            if (!playerCar) return;
            
            if (playerCar.isMoving && !playerCar.reachedFinish) {
                
                let reached = false;

                const finishTargetX = road.path && road.path.length > 0 ? road.path[road.path.length - 1].x : road.endX;
                const finishTargetY = road.path && road.path.length > 0 ? road.path[road.path.length - 1].y : road.endY;
                const distanceToFinish = Math.sqrt(
                    Math.pow(playerCar.x - finishTargetX, 2) + Math.pow(playerCar.y - finishTargetY, 2)
                );
                const touchRadius = road.width * 0.8; 
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
                    
                    this.handleFinishReached(true);
                }
            }
            return;
        }
        
        const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        
        if (!autoCar || !mouseCar) return;

        if (GameState.currentLevel === 2) {
            const roadConfigLaps = this.currentRoundParams.road.laps;
            const lapsCount = (Number.isFinite(roadConfigLaps) && roadConfigLaps > 0) ? roadConfigLaps : 3; 
            const lapLength = lapsCount > 0
                ? ((this.currentRoundParams.road.lapLength && this.currentRoundParams.road.lapLength > 0)
                    ? this.currentRoundParams.road.lapLength
                    : (this.currentRoundParams.road.length || 0) / lapsCount)
                : this.currentRoundParams.road.length;
            const finishDistance = (lapsCount > 0 ? lapLength * lapsCount : this.currentRoundParams.road.length) || 0;
            const finishX = this.currentRoundParams.road.endX;
            const finishY = this.currentRoundParams.road.endY;
            
            const finishHalfSize = Math.abs(this.currentRoundParams.road.width || 0) * 0.8;
            const finishPadding = Math.max(8, (this.currentRoundParams.road.width || 0) * 0.12);
            const isInsideFinish = (car) => {
                const dx = Math.abs((car.x || 0) - finishX);
                const dy = Math.abs((car.y || 0) - finishY);
                return dx <= finishHalfSize + finishPadding && dy <= finishHalfSize + finishPadding;
            };

            const updateLapForCar = (car) => {
                const closeToFinish = isInsideFinish(car);
                const wasInFinishZone = car.isInFinishZone || false;
                car.isInFinishZone = closeToFinish;

                if (wasInFinishZone && !closeToFinish) {
                    
                    if (!car.hasLeftFinishFirstTime) {
                        car.hasLeftFinishFirstTime = true;
                        car.distanceAtLastLap = car.distanceTraveled || 0;
                        car.maxDistanceSinceLastLap = car.distanceTraveled || 0;
                    } else {

                        const isValidDirection = car.isMovingForward !== false;
                        const currentDistance = car.distanceTraveled || 0;
                        const lastLapDistance = car.distanceAtLastLap || 0;

                        if (currentDistance > car.maxDistanceSinceLastLap) {
                            car.maxDistanceSinceLastLap = currentDistance;
                        }

                        let distanceSinceLastLap;
                        if (car.maxDistanceSinceLastLap >= lastLapDistance) {
                            
                            distanceSinceLastLap = car.maxDistanceSinceLastLap - lastLapDistance;
                        } else {

                            distanceSinceLastLap = (finishDistance - lastLapDistance) + car.maxDistanceSinceLastLap;
                        }
                        
                        const minLapDistance = lapLength * 0.7; 
                        const hasCompletedFullLap = distanceSinceLastLap >= minLapDistance;
                        
                        if (isValidDirection && hasCompletedFullLap) {
                            
                            car.completedLaps = Math.min(lapsCount, car.completedLaps + 1);
                            car.distanceAtLastLap = currentDistance;
                            car.maxDistanceSinceLastLap = currentDistance;
                        }
                    }
                }
            };

            if (autoCar.isMoving && !autoCar.reachedFinish && autoCar.hasLeftFinishFirstTime) {
                const currentDist = autoCar.distanceTraveled || 0;
                if (currentDist > autoCar.maxDistanceSinceLastLap) {
                    autoCar.maxDistanceSinceLastLap = currentDist;
                }
            }

            if (autoCar.isMoving && !autoCar.reachedFinish) {
                updateLapForCar(autoCar);

                if (autoCar.completedLaps >= lapsCount - 1 && autoCar.isInFinishZone) {
                    autoCar.reachedFinish = true;
                    autoCar.distanceTraveled = finishDistance;
                    autoCar.x = finishX;
                    autoCar.y = finishY;
                    autoCar.progress = 1;
                    autoCar.stop();
                    
                    if (!mouseCar.reachedFinish) {
                        
                        if (mouseCar.isMoving) {
                            mouseCar.stop();
                        }
                        this.handleFinishReached(false);
                        return; 
                    }
                }
            }

            if (mouseCar.isMoving && !mouseCar.reachedFinish && mouseCar.hasLeftFinishFirstTime) {
                const currentDist = mouseCar.distanceTraveled || 0;
                if (currentDist > mouseCar.maxDistanceSinceLastLap) {
                    mouseCar.maxDistanceSinceLastLap = currentDist;
                }
            }

            if (mouseCar.isMoving && !mouseCar.reachedFinish) {
                updateLapForCar(mouseCar);

                if (mouseCar.completedLaps >= lapsCount - 1 && mouseCar.isInFinishZone) {
                    mouseCar.reachedFinish = true;
                    mouseCar.distanceTraveled = finishDistance;
                    mouseCar.x = finishX;
                    mouseCar.y = finishY;
                    mouseCar.progress = 1;
                    mouseCar.stop();
                    
                    if (!autoCar.reachedFinish) {
                        
                        if (autoCar.isMoving) {
                            autoCar.stop();
                        }
                        this.handleFinishReached(true);
                        return; 
                    }
                }
            }
        }

        if (GameState.currentLevel === 3) {
            if (mouseCar.isMoving && !mouseCar.reachedFinish) {
                
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
                    
                    this.handleFinishReachedLevel3(mouseCar);
                }
            }
        }
    }

    handleFinishReached(playerWon) {
        
        this.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });

        if (typeof checkFinishResult === 'function') {
            checkFinishResult(this.currentRoundParams, playerWon);
        }
    }

    handleFinishReachedLevel3(mouseCar) {
        
        this.currentRoundParams.cars.forEach(car => {
            if (car.isMoving) {
                car.stop();
            }
        });

        if (!mouseCar.startTime) return;
        
        const finishTime = (Date.now() - mouseCar.startTime) / 1000; 

        const levelConfig = LEVELS_CONFIG[3];
        const targetTime = this.currentRoundParams.targetTime; 
        const tolerance = levelConfig.mechanics.timeTolerance;

        const minTime = targetTime - tolerance;
        const maxTime = targetTime + tolerance;
        const isWin = finishTime >= minTime && finishTime <= maxTime;

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

        if (typeof updateProgressBar === 'function') {
            updateProgressBar();
        }

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        let maxCarX = 0;
        if (this.currentRoundParams.cars && this.currentRoundParams.cars.length > 0) {
            this.currentRoundParams.cars.forEach((car) => {
                if (car.x > maxCarX) {
                    maxCarX = car.x;
                }
            });
        }
        
        const road = this.currentRoundParams.road;

        if (road.length !== Infinity) {
            
            maxCarX = Math.max(maxCarX, road.endX);
        } else {
            
            if (maxCarX === 0) {
                maxCarX = road.startX;
            }
            maxCarX = Math.max(maxCarX, road.startX) + this.canvas.width * 10;
        }

        this.ctx.save();
        this.ctx.translate(-this.cameraOffsetX, -this.cameraOffsetY);

        this.roadRenderer.render(this.ctx, this.currentRoundParams.road, this.cameraOffsetX, this.canvas.width, maxCarX);

        if (GameState.currentLevel === 1 || GameState.currentLevel === 2 || GameState.currentLevel === 3) {
            this.renderFinish();
        }

        this.renderSmokeParticles();
        
        this.renderExplosionParticles();

        this.renderCars();

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
        
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x0, y0, size, size);
    }

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
        const checkpointSize = 50; 
        const spacing = checkpointSize + 25; 
        const yPosition = road.startY - road.width / 2 - checkpointSize - 20; 

        const visibleStart = this.cameraOffsetX;
        const visibleEnd = this.cameraOffsetX + this.canvas.width;

        const startIndex = Math.floor((visibleStart - road.startX) / spacing) - 1;
        const endIndex = Math.ceil((visibleEnd - road.startX) / spacing) + 1;

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
        if (road.length === Infinity) return; 

        const finishX = road.endX;
        const finishY = road.endY;

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
            
            if (GameState.currentLevel === 3 && !car.isControlledByMouse) {
                return;
            }

            let carType = car.skin || null;
            if (!carType) {
                carType = (car.id === 'car2' || car.id === 'mouseCar') ? 'car2' : 'car1';
            }

            const carYOffset = this.getCarYOffset(car); 

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

    setLevel2PlayerBaseSpeed(speed) {
        this.level2PlayerBaseSpeed = Math.max(0, speed || 0);
    }

    handleMouseMove(mouseX, mouseY) {
        if (!this.currentRoundParams) return;

        if (GameState.currentLevel === 1) return;
        
        if (GameState.currentLevel === 2) return;

        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        const road = this.currentRoundParams.road;
        const worldX = mouseX + this.cameraOffsetX;
        const worldY = mouseY + this.cameraOffsetY;

        const cursorOnRoad = this.isPointOnRoad(worldX, worldY, road);
        if (!mouseCar.hasTouchedRoad) {
            if (!cursorOnRoad) return;
            mouseCar.hasTouchedRoad = true;
            mouseCar.crashArmedAt = Date.now();
        }

        if (mouseCar && mouseCar.isMoving) {
            
            mouseCar.setMousePosition(mouseX, mouseY, this.currentRoundParams.road, this.cameraOffsetX);

            const crashArmed = mouseCar.hasTouchedRoad && mouseCar.crashArmedAt && (Date.now() - mouseCar.crashArmedAt >= 200);
            if (!this.isPointOnRoad(mouseCar.x, mouseCar.y, road) && crashArmed) {
                this.handleCrashOffRoad(mouseCar);
                return;
            }

            if (GameState.currentLevel === 2 && mouseCar.reachedFinish) {
                const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
                if (autoCar && !autoCar.reachedFinish) {
                    
                    this.handleFinishReached(true);
                }
            }

            if (GameState.currentLevel === 3 && mouseCar.reachedFinish) {
                this.handleFinishReachedLevel3(mouseCar);
            }
        }
    }

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

        if (!road.path || road.path.length < 2) {
            const minX = Math.min(road.startX, road.endX);
            const maxX = Math.max(road.startX, road.endX) + finishTolerance;
            const minY = (road.startY || 0) - safeHalfWidth;
            const maxY = (road.startY || 0) + safeHalfWidth;
            return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
        }

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

    handleCrashOffRoad(mouseCar) {
        if (this.crashTriggered) return;
        this.crashTriggered = true;

        const carYOffset = this.getCarYOffset(mouseCar);
        this.spawnExplosion(mouseCar.x, mouseCar.y + carYOffset);

        mouseCar.stop();
        mouseCar.reachedFinish = true;

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
                
                checkFinishResultLevel3(this.currentRoundParams, false, finishTime, this.currentRoundParams.targetTime, LEVELS_CONFIG[3].mechanics.timeTolerance);
            }
        }, 1000);
    }

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

    setPlayerRenderAngle(angleRad) {
        if (!this.currentRoundParams || !this.currentRoundParams.cars) return;
        const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!playerCar) return;
        playerCar.renderAngle = angleRad;
    }

    checkWin() {
        if (!this.currentRoundParams) return false;
        
        const autoCar = this.currentRoundParams.cars.find(car => !car.isControlledByMouse);
        const mouseCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        
        if (!autoCar || !mouseCar) return false;

        return mouseCar.x > autoCar.x;
    }

    createBackgroundCanvas() {
        
        const road = this.currentRoundParams.road;
        const roadWidth = Math.max(this.canvas.width, road.length !== Infinity ? road.endX + 100 : 5000);
        const roadHeight = this.canvas.height;
        
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = roadWidth;
        this.bgCanvas.height = roadHeight;
        this.bgCtx = this.bgCanvas.getContext('2d');

        this.renderLevel1Background();
    }

    renderLevel1Background() {
        if (!this.bgCtx || !this.currentRoundParams) return;
        
        const road = this.currentRoundParams.road;
        const ctx = this.bgCtx;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        ctx.fillStyle = '#000000';
        this.drawRoadPath(ctx, road);
    }

    ensureCarOnRoad() {
        if (!this.currentRoundParams || !this.bgCtx || !this.bgCanvas) return;
        
        const road = this.currentRoundParams.road;
        const playerCar = this.currentRoundParams.cars.find(car => car.isControlledByMouse);
        if (!playerCar) return;

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

        const currentColor = getPixelColor(playerCar.x, playerCar.y);
        if (!isOnRoad(currentColor)) {
            
            placeAtStart();
        }

        playerCar.snapToRoad(road);
    }

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
            
            ctx.fillRect(
                road.startX,
                road.startY - road.width / 2,
                road.endX - road.startX,
                road.width
            );
        }
    }
    
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameRenderer };
}

