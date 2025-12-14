
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
            baseSpeed: 120 
        }
    },
    2: {
        name: 'Уровень 2',
        description: 'Выберите скорость авто соперника. Ведите свою машину стрелками, ускоряйтесь пробелом. Первый, кто проедет 3 круга, побеждает!',
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
            baseSpeed: 180 
        }
    },
    3: {
        name: 'Уровень 3',
        description: 'Доберитесь до финиша за целевое время, ведите машину курсором. Если придете раньше или позже - проиграете! Выходить за рамки дороги нельзя :)',
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
            baseSpeed: 240, 
            timeTolerance: 0.5 
        }
    }
};

const GameState = {
    currentLevel: 1,
    currentRound: 1,
    totalRounds: 0, 
    isLevelActive: false,
    isRoundActive: false,
    runStartTime: null,
    levelStartTime: null,
    roundStartTime: null,
    levelTimeRemaining: 0,
    levelWins: 0, 
    levelLosses: 0, 

    initLevel(levelNumber, savedState = null) {
        this.currentLevel = levelNumber;
        this.isLevelActive = true;
        this.isRoundActive = false;
        if (!this.runStartTime) {
            this.runStartTime = Date.now();
        }
        this.levelStartTime = Date.now();
        
        if (savedState) {
            
            this.currentRound = savedState.currentRound || 1;
            this.totalRounds = savedState.totalRounds || 0;
            this.levelWins = savedState.levelWins || 0;
            this.levelLosses = savedState.levelLosses || 0;
        } else {
            
            this.currentRound = 1;
            this.levelWins = 0;
            this.levelLosses = 0;

            const config = LEVELS_CONFIG[levelNumber];
            const roundsRange = config.roundsCount;
            this.totalRounds = Math.floor(
                Math.random() * (roundsRange.max - roundsRange.min + 1) + roundsRange.min
            );
        }
        
        const config = LEVELS_CONFIG[levelNumber];
        this.levelTimeRemaining = config.timeLimit;
    },

    startRound() {
        this.isRoundActive = true;
        this.roundStartTime = Date.now();
    },

    endRound() {
        this.isRoundActive = false;
        this.currentRound++;
    },

    endLevel() {
        this.isLevelActive = false;
        this.isRoundActive = false;
    },

    isLevelComplete() {
        return this.currentRound > this.totalRounds;
    },

    getCurrentLevelConfig() {
        return LEVELS_CONFIG[this.currentLevel];
    }
};

class RoadParams {
    constructor() {
        this.length = Infinity; 
        this.width = 120; 
        this.startX = 50; 
        this.startY = 0; 
        this.endX = Infinity; 
        this.endY = 0; 
        this.checkpoints = []; 
        this.path = []; 
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }; 
        this.segmentLengths = []; 
        this.laps = 1; 
        this.lapLength = 0; 
    }

    generate(level) {
        this.startX = 50;
        this.startY = 200 + Math.random() * 100;
        this.laps = 1;

        if (level === 2) {
            this.generatePolygonLoop();
            this.updateBounds();
            return;
        }

        if (level === 1 || level === 3) {
            
            this.length = 4500 + Math.random() * 2000;

            if (level === 1) {
                this.generateZigzagPath();
            } else {
                
                this.endX = this.startX + this.length;
                this.endY = this.startY;
            }
        } else {
            
            this.length = Infinity;
            this.endX = Infinity;
            this.endY = this.startY;
        }

        this.checkpoints = [];
        this.updateBounds();
    }

    generateZigzagPath() {
        const pathLength = this.length;
        
        const segments = 6 + Math.floor(Math.random() * 7);
        
        this.path = [];
        let currentX = this.startX;
        let currentY = this.startY;

        this.path.push({ x: currentX, y: currentY });

        const avgSegmentLength = pathLength / segments;

        let isHorizontal = true; 
        let directionX = 1; 
        let directionY = 1; 
        
        const minY = 100;
        const maxY = 500;
        const minX = 50;
        const maxX = this.startX + pathLength * 0.9; 
        
        for (let i = 0; i < segments; i++) {
            
            const segmentLength = avgSegmentLength * (0.8 + Math.random() * 0.4);
            
            if (isHorizontal) {
                
                const backtrackChance = 0.35; 
                directionX = Math.random() > backtrackChance ? 1 : -1;
                currentX += directionX * segmentLength;

                currentX = Math.max(minX, Math.min(maxX, currentX));

                isHorizontal = false;
                
                directionY = Math.random() > 0.5 ? 1 : -1;
            } else {
                
                currentY += directionY * segmentLength;

                currentY = Math.max(minY, Math.min(maxY, currentY));

                isHorizontal = true;
                
            }
            
            this.path.push({ x: currentX, y: currentY });
        }

        const finalLength = avgSegmentLength * 1.2;
        currentX = Math.max(currentX + finalLength, this.startX + 200); 
        this.path.push({ x: currentX, y: currentY });

        this.computePathMetrics();
    }

    generatePolygonLoop() {
        this.width = 140;
        const centerX = 800;
        const centerY = 400;
        const laps = 3;
        this.laps = laps;

        const vertexCount = 4 + Math.floor(Math.random() * 6); 
        const baseRadius = 420 + Math.random() * 280; 
        const radiusJitter = 0.55; 
        const centerJitter = 40;

        const jitteredCenterX = centerX + (Math.random() - 0.5) * centerJitter;
        const jitteredCenterY = centerY + (Math.random() - 0.5) * centerJitter;

        const angles = [];
        for (let i = 0; i < vertexCount; i++) {
            angles.push(Math.random() * Math.PI * 2);
        }
        angles.sort((a, b) => a - b);

        const loopPoints = angles.map((angle) => {
            const radius = baseRadius * (1 - radiusJitter / 2 + Math.random() * radiusJitter);
            const wobbleX = (Math.random() - 0.5) * 30;
            const wobbleY = (Math.random() - 0.5) * 30;
            return {
                x: jitteredCenterX + Math.cos(angle) * radius + wobbleX,
                y: jitteredCenterY + Math.sin(angle) * radius + wobbleY
            };
        });

        this.path = [];
        this.path.push({ ...loopPoints[0] });
        for (let lap = 0; lap < laps; lap++) {
            for (let i = 1; i < loopPoints.length; i++) {
                this.path.push({ ...loopPoints[i] });
            }
            
            this.path.push({ ...loopPoints[0] });
        }

        this.computePathMetrics();
        this.lapLength = this.length / Math.max(1, this.laps);
    }

    computePathMetrics() {
        if (!this.path || this.path.length < 2) {
            return;
        }

        this.segmentLengths = [];
        let totalLength = 0;

        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            this.segmentLengths.push(segmentLength);
            totalLength += segmentLength;
        }

        this.startX = this.path[0].x;
        this.startY = this.path[0].y;
        const lastPoint = this.path[this.path.length - 1];
        this.endX = lastPoint.x;
        this.endY = lastPoint.y;
        this.length = totalLength;
    }

    getPointAtDistance(distance) {
        if (!this.path || this.path.length < 2) {
            
            const clamped = Math.max(0, Math.min(distance, this.length));
            return {
                x: this.startX + clamped,
                y: this.startY,
                angle: Math.atan2(this.endY - this.startY, this.endX - this.startX)
            };
        }

        const clampedDistance = Math.max(0, Math.min(distance, this.length));
        let remaining = clampedDistance;

        for (let i = 0; i < this.segmentLengths.length; i++) {
            const segLen = this.segmentLengths[i] || 0;
            if (remaining <= segLen) {
                const p1 = this.path[i];
                const p2 = this.path[i + 1];
                const t = segLen === 0 ? 0 : remaining / segLen;
                const x = p1.x + (p2.x - p1.x) * t;
                const y = p1.y + (p2.y - p1.y) * t;
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                return { x, y, angle };
            }
            remaining -= segLen;
        }

        const last = this.path[this.path.length - 1];
        const prev = this.path[this.path.length - 2];
        return {
            x: last.x,
            y: last.y,
            angle: Math.atan2(last.y - prev.y, last.x - prev.x)
        };
    }

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

class SpeedParams {
    constructor() {
        this.minSpeed = 0;
        this.maxSpeed = 0;
        this.currentSpeed = 0;
        this.targetSpeed = 0; 
    }

    generate(level, roadLength) {
        
        const baseSpeed = 30 + (level * 15);
        const speedVariation = 20;
        
        this.minSpeed = baseSpeed;
        this.maxSpeed = baseSpeed + speedVariation;

        this.currentSpeed = Math.floor(
            Math.random() * (this.maxSpeed - this.minSpeed + 1) + this.minSpeed
        );

        if (level === 2) {
            this.targetSpeed = Math.floor(
                Math.random() * (this.maxSpeed - this.minSpeed + 1) + this.minSpeed
            );
        }
    }
}

class CarState {
    constructor(id) {
        this.id = id; 
        this.skin = null; 
        this.x = 0; 
        this.y = 0; 
        this.speed = 0; 
        this.isBoosting = false; 
        this.isMoving = false; 
        this.startTime = null; 
        this.stopTime = null; 
        this.distanceTraveled = 0; 
        this.targetTime = null; 
        this.isControlledByMouse = false; 
        this.progress = 0; 
        this.reachedFinish = false; 
        this.previousLap = 0; 
        this.isInFinishZone = false; 
        this.completedLaps = 0; 
        this.angle = 0; 
        this.renderAngle = 0; 
        this.hasTouchedRoad = false; 
        this.crashArmedAt = null; 
        this.hasLeftFinishFirstTime = false; 
        this.isMovingForward = true; 
        this.distanceAtLastLap = 0; 
        this.maxDistanceSinceLastLap = 0; 
    }

    init(road, speedParams) {
        this.speed = speedParams.currentSpeed;
        this.isMoving = false;
        this.reachedFinish = false;
        this.previousLap = 0;
        this.isInFinishZone = false;
        this.completedLaps = 0;
        this.hasLeftFinishFirstTime = false;
        this.isMovingForward = true;
        this.distanceAtLastLap = 0;
        this.maxDistanceSinceLastLap = 0;

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
        
        if (road.path && road.path.length > 1) {
            
            const p1 = road.path[0];
            const p2 = road.path[1];
            this.angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        } else {
            
            this.angle = Math.atan2(road.endY - road.startY, road.endX - road.startX);
        }
        this.renderAngle = this.angle;
        this.hasTouchedRoad = false;
        this.crashArmedAt = null;
    }

    start() {
        this.isMoving = true;
        this.startTime = Date.now();
    }

    stop() {
        this.isMoving = false;
        this.stopTime = Date.now();
        this.isBoosting = false;
    }

    update(deltaTime, road, stopAfterTime = null) {
        if (!this.isMoving) return false;

        this.isBoosting = false;

        if (stopAfterTime !== null && this.startTime) {
            const elapsedSeconds = (Date.now() - this.startTime) / 1000;
            if (elapsedSeconds >= stopAfterTime) {
                this.stop();
                return false;
            }
        }

        const distance = (this.speed * deltaTime) / 1000; 
        this.distanceTraveled += distance;

        this.isMovingForward = true;

        if (road.length !== Infinity && this.distanceTraveled >= road.length) {
            this.distanceTraveled = road.length;
            const finishPos = typeof road.getPointAtDistance === 'function'
                ? road.getPointAtDistance(this.distanceTraveled)
                : { x: road.endX, y: road.endY, angle: this.angle };
            this.x = finishPos.x;
            this.y = finishPos.y;
            this.progress = 1;
            this.angle = (finishPos.angle != null) ? finishPos.angle : this.angle;
            this.renderAngle = this.angle;
            this.reachedFinish = true;
            this.stop();
            return true; 
        }

        const pos = typeof road.getPointAtDistance === 'function'
            ? road.getPointAtDistance(this.distanceTraveled)
            : { x: road.startX + this.distanceTraveled, y: road.startY, angle: this.angle };
        this.x = pos.x;
        this.y = pos.y;
        this.angle = (pos.angle != null) ? pos.angle : this.angle;
        this.renderAngle = this.angle;

        if (road.length !== Infinity) {
            this.progress = this.distanceTraveled / road.length;
        } else {
            this.progress = this.distanceTraveled / 1000; 
        }
        
        return false; 
    }

    getTravelTime() {
        if (this.startTime && this.stopTime) {
            return (this.stopTime - this.startTime) / 1000;
        }
        return null;
    }

    setMousePosition(x, y, road, cameraOffset = 0) {
        
        const worldX = x + cameraOffset;
        const distanceFromStart = worldX - road.startX;
        const prevX = this.x;
        const prevY = this.y;
        const targetY = y; 

        if (road.length !== Infinity) {
            if (distanceFromStart >= road.length) {
                this.distanceTraveled = road.length;
                this.x = road.endX;
                this.y = targetY;
                this.progress = 1;
                if (!this.reachedFinish) {
                    this.reachedFinish = true;
                    this.stop();
                }
                return;
            }
        }

        if (distanceFromStart > this.distanceTraveled) {
            this.distanceTraveled = Math.max(0, distanceFromStart);
        }

        const clampedDistance = Math.max(0, Math.min(
            road.length !== Infinity ? road.length : Infinity,
            this.distanceTraveled
        ));
        this.distanceTraveled = clampedDistance;
        this.x = road.startX + clampedDistance;
        this.y = targetY;

        if (road.length !== Infinity) {
            this.distanceTraveled = Math.min(this.distanceTraveled, road.length);
            this.progress = this.distanceTraveled / road.length;
        } else {
            this.progress = this.distanceTraveled / 1000;
        }

        const dx = this.x - prevX;
        const dy = this.y - prevY;
        if (Math.abs(dx) + Math.abs(dy) > 0.001) {
            const desiredAngle = Math.atan2(dy, dx);
            this.angle = desiredAngle;
            this.renderAngle = desiredAngle;
        }
    }

    moveByKeyboardLevel2(deltaTime, road, keys, baseSpeed, boostMultiplier = 1.2) {
        if (!this.isMoving) {
            this.isBoosting = false;
            return;
        }

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

        let dirX = 0;
        let dirY = 0;
        if (keys.right) dirX += 1;
        if (keys.left) dirX -= 1;
        if (keys.down) dirY += 1;
        if (keys.up) dirY -= 1;

        if (dirX === 0 && dirY === 0) {
            this.isBoosting = false;
            return;
        }

        const desiredAngle = Math.atan2(dirY, dirX);
        const distanceDelta = (effectiveSpeed * deltaTime) / 1000;
        const candidateX = this.x + Math.cos(desiredAngle) * distanceDelta;
        const candidateY = this.y + Math.sin(desiredAngle) * distanceDelta;

        const tolerance = (road.width || 0) / 2 + 8;
        let bestDistance = Infinity;
        let bestTraveled = this.distanceTraveled;
        let bestAngle = desiredAngle;
        let traveledAccum = 0;

        if (road.path && road.path.length > 1) {
            for (let i = 0; i < road.path.length - 1; i++) {
                const p1 = road.path[i];
                const p2 = road.path[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLenSq = dx * dx + dy * dy;
                if (segLenSq === 0) {
                    traveledAccum += Math.sqrt(segLenSq);
                    continue;
                }
                const t = Math.max(0, Math.min(1, ((candidateX - p1.x) * dx + (candidateY - p1.y) * dy) / segLenSq));
                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;
                const distToSeg = Math.sqrt(Math.pow(candidateX - projX, 2) + Math.pow(candidateY - projY, 2));
                if (distToSeg < bestDistance) {
                    bestDistance = distToSeg;
                    bestTraveled = traveledAccum + t * Math.sqrt(segLenSq);
                    bestAngle = Math.atan2(dy, dx);
                }
                traveledAccum += Math.sqrt(segLenSq);
            }
        } else {
            
            const dx = road.endX - road.startX;
            const dy = road.endY - road.startY;
            const lenSq = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((candidateX - road.startX) * dx + (candidateY - road.startY) * dy) / lenSq));
            const projX = road.startX + t * dx;
            const projY = road.startY + t * dy;
            bestDistance = Math.sqrt(Math.pow(candidateX - projX, 2) + Math.pow(candidateY - projY, 2));
            bestTraveled = t * Math.sqrt(lenSq);
            bestAngle = Math.atan2(dy, dx);
        }

        if (bestDistance > tolerance) {
            this.isBoosting = false;
            return;
        }

        const moveVecX = candidateX - this.x;
        const moveVecY = candidateY - this.y;
        const tangentX = Math.cos(bestAngle);
        const tangentY = Math.sin(bestAngle);
        const dot = moveVecX * tangentX + moveVecY * tangentY;
        const forwardSign = dot >= 0 ? 1 : -1;

        this.isMovingForward = forwardSign >= 0;

        this.x = candidateX;
        this.y = candidateY;
        const newDistance = this.distanceTraveled + forwardSign * distanceDelta;
        const maxDistance = road.length || newDistance;
        this.distanceTraveled = Math.max(0, Math.min(newDistance, maxDistance));

        if (road.length !== Infinity && this.distanceTraveled >= road.length) {
            this.distanceTraveled = road.length;
            const finishPos = typeof road.getPointAtDistance === 'function'
                ? road.getPointAtDistance(this.distanceTraveled)
                : { x: road.endX, y: road.endY, angle: desiredAngle };
            this.x = finishPos.x;
            this.y = finishPos.y;
            this.angle = (finishPos.angle != null) ? finishPos.angle : desiredAngle;
            this.renderAngle = this.angle;
            this.progress = 1;
            return;
        }

        this.angle = desiredAngle;
        this.renderAngle = desiredAngle;

        if (road.length !== Infinity) {
            this.progress = Math.min(1, this.distanceTraveled / road.length);
        } else {
            this.progress = this.distanceTraveled / 1000;
        }
    }

    moveByColorFollowing(deltaTime, road, keys, bgCtx, bgCanvas, moveSpeed = 420) {
        if (!this.isMoving) {
            this.isBoosting = false;
            return;
        }

        const hasDirectionKey = keys.right || keys.left || keys.up || keys.down;
        if (!hasDirectionKey) {
            this.isBoosting = false;
            return;
        }

        const isBoostActive = Boolean(keys.space);
        this.isBoosting = isBoostActive;
        const effectiveMoveSpeed = moveSpeed * (isBoostActive ? 3 : 1);

        const targetColor = { r: 0, g: 0, b: 0, tolerance: 50 };
        const whiteColor = { r: 255, g: 255, b: 255, tolerance: 50 };

        const getPixelColor = (x, y) => {
            const px = Math.max(0, Math.min(Math.floor(x), bgCanvas.width - 1));
            const py = Math.max(0, Math.min(Math.floor(y), bgCanvas.height - 1));
            
            try {
                const data = bgCtx.getImageData(px, py, 1, 1).data;
                return { r: data[0], g: data[1], b: data[2] };
            } catch (e) {
                return { r: 255, g: 255, b: 255 }; 
            }
        };

        const colorMatch = (color, target) => {
            const dr = Math.abs(color.r - target.r);
            const dg = Math.abs(color.g - target.g);
            const db = Math.abs(color.b - target.b);
            return (dr + dg + db <= target.tolerance);
        };

        let desiredAngle = (this.angle != null) ? this.angle : 0;
        if (keys.right) desiredAngle = 0; 
        else if (keys.left) desiredAngle = Math.PI; 
        else if (keys.up) desiredAngle = -Math.PI / 2; 
        else if (keys.down) desiredAngle = Math.PI / 2; 

        if (keys.right || keys.left || keys.up || keys.down) {
            this.angle = desiredAngle;
        }

        const sensorDistance = 30;

        const leftAngle = this.angle - Math.PI / 4;
        const centerAngle = this.angle;
        const rightAngle = this.angle + Math.PI / 4;
        
        const leftX = this.x + Math.cos(leftAngle) * sensorDistance;
        const leftY = this.y + Math.sin(leftAngle) * sensorDistance;
        const centerX = this.x + Math.cos(centerAngle) * sensorDistance;
        const centerY = this.y + Math.sin(centerAngle) * sensorDistance;
        const rightX = this.x + Math.cos(rightAngle) * sensorDistance;
        const rightY = this.y + Math.sin(rightAngle) * sensorDistance;

        const leftColor = getPixelColor(leftX, leftY);
        const centerColor = getPixelColor(centerX, centerY);
        const rightColor = getPixelColor(rightX, rightY);
        
        const leftOnRoad = colorMatch(leftColor, targetColor);
        const centerOnRoad = colorMatch(centerColor, targetColor);
        const rightOnRoad = colorMatch(rightColor, targetColor);

        const currentColor = getPixelColor(this.x, this.y);
        const isOnRoadCurrent = colorMatch(currentColor, targetColor);
        if (!isOnRoadCurrent) {
            return;
        }

        let moveX = 0;
        let moveY = 0;

        if (centerOnRoad) {
            
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (leftOnRoad && !rightOnRoad) {
            
            this.angle -= 0.08;
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (rightOnRoad && !leftOnRoad) {
            
            this.angle += 0.08;
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (leftOnRoad && rightOnRoad) {
            
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * (deltaTime / 1000);
        } else if (hasDirectionKey) {
            
            moveX = Math.cos(this.angle) * effectiveMoveSpeed * 0.7 * (deltaTime / 1000);
            moveY = Math.sin(this.angle) * effectiveMoveSpeed * 0.7 * (deltaTime / 1000);
        } else {
            
            this.angle += 0.03;
        }

        const newX = this.x + moveX;
        const newY = this.y + moveY;

        const newColor = getPixelColor(newX, newY);
        const isNewPosOnRoad = colorMatch(newColor, targetColor);
        
        if (!isNewPosOnRoad) {
            
            if (leftOnRoad && !rightOnRoad) {
                this.angle -= 0.1;
            } else if (rightOnRoad && !leftOnRoad) {
                this.angle += 0.1;
            }
            return;
        }

        let boundedX = newX;
        let boundedY = newY;
        const halfWidth = road.width / 2;
        const maxDistanceFromRoad = halfWidth - 5; 
        
        if (road.path && road.path.length > 1) {
            
            let minDist = Infinity;
            let closestPoint = { x: newX, y: newY };
            
            for (let i = 0; i < road.path.length - 1; i++) {
                const p1 = road.path[i];
                const p2 = road.path[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const lenSq = dx * dx + dy * dy;
                
                if (lenSq === 0) continue;
                
                const t = Math.max(0, Math.min(1, ((newX - p1.x) * dx + (newY - p1.y) * dy) / lenSq));
                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;
                const dist = Math.sqrt(Math.pow(newX - projX, 2) + Math.pow(newY - projY, 2));
                
                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = { x: projX, y: projY };
                }
            }

            if (minDist > maxDistanceFromRoad) {
                
                const angleFromRoad = Math.atan2(newY - closestPoint.y, newX - closestPoint.x);
                boundedX = closestPoint.x + Math.cos(angleFromRoad) * maxDistanceFromRoad;
                boundedY = closestPoint.y + Math.sin(angleFromRoad) * maxDistanceFromRoad;
            } else {
                
                boundedX = newX;
                boundedY = newY;
            }
        } else {
            
            const roadCenterY = road.startY || 0;
            const minY = roadCenterY - maxDistanceFromRoad;
            const maxY = roadCenterY + maxDistanceFromRoad;
            boundedY = Math.min(Math.max(boundedY, minY), maxY);
        }

        const boundedColor = getPixelColor(boundedX, boundedY);
        if (!colorMatch(boundedColor, targetColor)) {
            
            if (leftOnRoad && !rightOnRoad) {
                this.angle -= 0.1;
            } else if (rightOnRoad && !leftOnRoad) {
                this.angle += 0.1;
            }
            return;
        }

        this.x = boundedX;
        this.y = boundedY;

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

    updateDistanceByPath(road) {
        if (!road.path || road.path.length < 2) {
            this.distanceTraveled = 0;
            return;
        }

        let minDistance = Infinity;
        let totalPathDistance = 0;
        
        for (let i = 0; i < road.path.length - 1; i++) {
            const p1 = road.path[i];
            const p2 = road.path[i + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

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
                
                totalPathDistance = 0;
                for (let j = 0; j < i; j++) {
                    const segDx = road.path[j + 1].x - road.path[j].x;
                    const segDy = road.path[j + 1].y - road.path[j].y;
                    totalPathDistance += Math.sqrt(segDx * segDx + segDy * segDy);
                }
                
                totalPathDistance += t * segmentLength;
            }
        }
        
        this.distanceTraveled = Math.max(0, totalPathDistance);
    }

    snapToRoad(road) {
        if (!road) return;

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

class RoundParams {
    constructor() {
        this.road = new RoadParams();
        this.roads = null; 
        this.speedParams = new SpeedParams();
        this.cars = []; 
        this.targetTime = 0; 
        this.timeLimitSeconds = 0; 
        this.speedOptions = []; 
        this.timeOptions = []; 
        this.synchronizationTime = 0; 
        this.selectedSpeed = 0; 
        this.selectedTime = 0; 
        this.measuredTime = 0; 
    }

    generate(level) {
        
        this.road.generate(level);

        const levelConfig = LEVELS_CONFIG[level];
        const baseSpeed = levelConfig.mechanics.baseSpeed;

        if (level === 1) {
            this.timeOptions = [];
            this.speedOptions = [];
        } else {
            
            this.timeOptions = this.generateTimeOptions(level);

            this.speedOptions = this.generateSpeedOptions(baseSpeed, level);
        }

        if (level === 3) {
            const minTime = 3;
            const maxTime = 5;
            const step = 0.5;
            
            const timeOptions = [];
            for (let time = minTime; time <= maxTime; time += step) {
                timeOptions.push(Math.round(time * 10) / 10);
            }
            
            const randomIndex = Math.floor(Math.random() * timeOptions.length);
            this.targetTime = timeOptions[randomIndex];
        }

        this.cars = [];

        if (level === 1) {
            const playerCar = new CarState('mouseCar');
            playerCar.init(this.road, this.speedParams);
            playerCar.isControlledByMouse = true;
            this.cars.push(playerCar);
        } else {

            const autoCar = new CarState('autoCar');
            autoCar.init(this.road, this.speedParams);
            
            autoCar.speed = 0;
            this.cars.push(autoCar);

            const mouseCar = new CarState('mouseCar');
            mouseCar.init(this.road, this.speedParams);
            mouseCar.isControlledByMouse = true;
            this.cars.push(mouseCar);
        }

        this.baseSpeed = baseSpeed;
    }

    generateTimeOptions(level) {
        const count = 5; 
        
        if (level === 1) {
            
            const minTime = 3;
            const maxTime = 7;
            const step = 0.5;
            const allOptions = [];
            
            for (let time = minTime; time <= maxTime; time += step) {
                allOptions.push(Math.round(time * 10) / 10);
            }

            const selected = [];
            const available = [...allOptions];
            for (let i = 0; i < count && available.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * available.length);
                selected.push(available.splice(randomIndex, 1)[0]);
            }
            
            return selected.sort((a, b) => a - b);
        } else {
            
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

    generateSpeedOptions(baseSpeed, level) {
        const count = 5; 
        
        if (level === 1) {
            
            const minSpeed = 1000;
            const maxSpeed = 1600;
            const step = 50;
            const allOptions = [];
            
            for (let speed = minSpeed; speed <= maxSpeed; speed += step) {
                allOptions.push(speed);
            }

            const selected = [];
            const available = [...allOptions];
            for (let i = 0; i < count && available.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * available.length);
                selected.push(available.splice(randomIndex, 1)[0]);
            }
            
            return selected.sort((a, b) => a - b);
        } else if (level === 2) {
            
            const minSpeed = 420;
            const maxSpeed = 780;
            const step = 60;
            const options = [];
            
            for (let speed = minSpeed; speed <= maxSpeed && options.length < count; speed += step) {
                options.push(speed);
            }
            
            return options.slice(0, count);
        } else {
            
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

