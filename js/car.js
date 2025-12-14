/**
 * Модуль отрисовки машин

 */

class CarRenderer {
    constructor() {
        this.carImages = {};
        this.loadedImages = {};
    }

    /**
     * Загрузка изображений машин
     * @param {Object} imagePaths - Объект с путями к изображениям {car1: 'path', car2: 'path'}
     * @returns {Promise} Промис загрузки всех изображений
     */
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

    /**
     * Загрузка одного изображения
     * @param {string} key - Ключ изображения
     * @param {string} imagePath - Путь к изображению
     * @returns {Promise} Промис загрузки изображения
     */
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

    /**
     * Отрисовка машины на canvas
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {CarState} carState - Состояние машины
     * @param {string} carType - Тип машины ('car1' или 'car2')
     * @param {number} carSize - Размер машины (ширина и высота)
     * @param {number} yOffset - Смещение по Y для визуального размещения (опционально)
     */
    render(ctx, carState, carType = 'car1', carSize = 40, yOffset = 0) {
        const x = carState.x;
        const y = carState.y + yOffset;

        // Проверяем, загружено ли изображение
        if (this.loadedImages[carType] && this.carImages[carType]) {
            // Отрисовываем изображение машины
            const img = this.carImages[carType];
            ctx.save();
            ctx.translate(x, y);
            
            // Базовый угол изображения (по умолчанию машина смотрит вверх),
            // поэтому поворачиваем на 90° вправо и добавляем пользовательский угол.
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
            // Fallback: отрисовка простого прямоугольника
            this.renderFallback(ctx, carState, carType, carSize, yOffset);
        }
    }

    /**
     * Резервная отрисовка машины (если изображение не загружено)
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {CarState} carState - Состояние машины
     * @param {string} carType - Тип машины
     * @param {number} carSize - Размер машины
     * @param {number} yOffset - Смещение по Y для визуального размещения (опционально)
     */
    renderFallback(ctx, carState, carType, carSize, yOffset = 0) {
        const x = carState.x;
        const y = carState.y + yOffset;

        // Разные цвета для разных машин
        const colors = {
            car1: '#00f0ff',
            car2: '#b026ff',
            autoCar: '#00f0ff',
            mouseCar: '#b026ff'
        };

        const color = colors[carType] || '#ffffff';

        // Отрисовываем прямоугольник машины
        ctx.fillStyle = color;
        ctx.fillRect(x - carSize / 2, y - carSize / 2, carSize, carSize);

        // Добавляем обводку
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - carSize / 2, y - carSize / 2, carSize, carSize);
    }

    /**
     * Проверка, загружены ли все необходимые изображения
     * @param {Array} requiredTypes - Массив требуемых типов машин
     * @returns {boolean} true, если все изображения загружены
     */
    areImagesLoaded(requiredTypes) {
        return requiredTypes.every(type => this.loadedImages[type]);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CarRenderer };
}

