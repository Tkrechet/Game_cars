

class CarRenderer {
    constructor() {
        this.carImages = {};
        this.loadedImages = {};
    }

    loadImages(imagePaths) {
        const promises = [];

        if (imagePaths.car1) {
            promises.push(this.loadSingleImage('car1', imagePaths.car1));
        }
        if (imagePaths.car2) {
            promises.push(this.loadSingleImage('car2', imagePaths.car2));
        }

        return Promise.all(promises);
    }

    loadSingleImage(key, imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.carImages[key] = img;
                this.loadedImages[key] = true;
                resolve();
            };
            img.onerror = () => {
                reject(new Error(`Не удалось загрузить изображение машины: ${imagePath}`));
            };
            img.src = imagePath;
        });
    }

    render(ctx, carState, carType = 'car1', carSize = 40, yOffset = 0) {
        const x = carState.x;
        const y = carState.y + yOffset;

        if (this.loadedImages[carType] && this.carImages[carType]) {
            
            const img = this.carImages[carType];
            ctx.save();
            ctx.translate(x, y);

            const baseAngle = Math.PI / 2;
            const extraAngle = carState.renderAngle || 0;
            ctx.rotate(baseAngle + extraAngle);
            
            ctx.drawImage(
                img,
                -carSize / 2,
                -carSize / 2,
                carSize,
                carSize
            );
            ctx.restore();
        } else {
            
            this.renderFallback(ctx, carState, carType, carSize, yOffset);
        }
    }

    renderFallback(ctx, carState, carType, carSize, yOffset = 0) {
        const x = carState.x;
        const y = carState.y + yOffset;

        const colors = {
            car1: '#00f0ff',
            car2: '#b026ff',
            autoCar: '#00f0ff',
            mouseCar: '#b026ff'
        };

        const color = colors[carType] || '#ffffff';

        ctx.fillStyle = color;
        ctx.fillRect(x - carSize / 2, y - carSize / 2, carSize, carSize);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - carSize / 2, y - carSize / 2, carSize, carSize);
    }

    areImagesLoaded(requiredTypes) {
        return requiredTypes.every(type => this.loadedImages[type]);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CarRenderer };
}

