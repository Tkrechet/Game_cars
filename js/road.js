/**
 * Модуль отрисовки дороги
 * Использует изображение road-top-view.png
 */

class RoadRenderer {
    constructor() {
        this.roadImage = null;
        this.imageLoaded = false;
    }

    /**
     * Загрузка изображения дороги
     * @param {string} imagePath - Путь к изображению
     * @returns {Promise} Промис загрузки изображения
     */
    loadImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.roadImage = new Image();
            this.roadImage.onload = () => {
                this.imageLoaded = true;
                resolve();
            };
            this.roadImage.onerror = () => {
                reject(new Error(`Не удалось загрузить изображение дороги: ${imagePath}`));
            };
            this.roadImage.src = imagePath;
        });
    }

    /**
     * Отрисовка дороги на canvas
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {RoadParams} roadParams - Параметры дороги
     * @param {number} cameraOffset - Смещение камеры по X
     * @param {number} canvasWidth - Ширина canvas
     * @param {number} maxCarX - Максимальная позиция X машин (для расчета необходимой длины дороги)
     */
    render(ctx, roadParams, cameraOffset = 0, canvasWidth = 800, maxCarX = 0) {
        if (!this.imageLoaded || !this.roadImage) {
            // Fallback: отрисовка простой дороги, если изображение не загружено
            this.renderFallback(ctx, roadParams, cameraOffset, canvasWidth, maxCarX);
            return;
        }

        const roadWidth = roadParams.width;
        const startX = roadParams.startX;
        const startY = roadParams.startY;

        // Вычисляем угол дороги (для будущего расширения с кривыми)
        const angle = Math.atan2(
            roadParams.endY - roadParams.startY,
            1 // Для бесконечной дороги используем горизонтальное направление
        );

        // Сохраняем состояние контекста
        ctx.save();

        // Перемещаем начало координат в стартовую точку с учетом камеры
        ctx.translate(startX - cameraOffset, startY);
        ctx.rotate(angle);

        // Отрисовываем дорогу, повторяя изображение по длине
        // Для бесконечной дороги отрисовываем достаточно сегментов, чтобы покрыть видимую область и область движения машин
        const imageWidth = this.roadImage.width;
        
        // После translate(startX - cameraOffset, startY) координата 0 соответствует началу дороги
        // Видимая область на экране (canvas): от 0 до canvasWidth
        
        // Вычисляем, где находится левая граница экрана в системе координат дороги
        // Левая граница экрана (0 на canvas) в системе координат дороги: -(startX - cameraOffset)
        const leftEdgeInRoadCoords = -(startX - cameraOffset);
        
        // Для конечной дороги используем её длину, для бесконечной - вычисляем
        let roadEnd;
        if (roadParams.length !== Infinity) {
            // Для конечной дороги отрисовываем до финиша
            roadEnd = roadParams.length;
        } else {
            // Для бесконечной дороги вычисляем максимальное расстояние от начала дороги
            // Используем максимальную позицию машин или видимую область, что больше
            const maxDistanceFromStart = Math.max(
                canvasWidth, // Видимая область
                maxCarX - startX + canvasWidth // Позиция машин + запас
            );
            
            // Добавляем очень большой запас (минимум 20 экранов вперед) для бесконечной дороги
            // Это гарантирует, что дорога всегда будет отрисовываться достаточно далеко
            roadEnd = maxDistanceFromStart + canvasWidth * 20;
        }
        
        // Вычисляем начальный и конечный индексы сегментов
        // Начинаем с сегмента, который покрывает левую границу экрана (с запасом)
        const startSegment = Math.floor(leftEdgeInRoadCoords / imageWidth) - 1;
        const endSegment = Math.ceil(roadEnd / imageWidth) + 1;

        // Отрисовываем все необходимые сегменты дороги непрерывно слева направо
        // Сегменты идут без пробелов: каждый следующий начинается там, где заканчивается предыдущий
        // Используем точное вычисление позиций для гарантии отсутствия пробелов
        for (let i = startSegment; i <= endSegment; i++) {
            // Позиция сегмента относительно начала дороги (в системе координат дороги после translate)
            // Сегменты идут непрерывно: ..., -2*imageWidth, -imageWidth, 0, imageWidth, 2*imageWidth, ...
            // Используем небольшое смещение влево для создания перекрытия и гарантии отсутствия пробелов
            const segmentX = i * imageWidth - 1;
            ctx.drawImage(
                this.roadImage,
                segmentX,
                -roadWidth / 2,
                imageWidth,
                roadWidth
            );
        }

        // Восстанавливаем состояние контекста
        ctx.restore();
    }

    /**
     * Резервная отрисовка дороги (если изображение не загружено)
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {RoadParams} roadParams - Параметры дороги
     * @param {number} cameraOffset - Смещение камеры по X
     * @param {number} canvasWidth - Ширина canvas
     * @param {number} maxCarX - Максимальная позиция X машин (для расчета необходимой длины дороги)
     */
    renderFallback(ctx, roadParams, cameraOffset = 0, canvasWidth = 800, maxCarX = 0) {
        const roadWidth = roadParams.width;
        const startX = roadParams.startX;
        const startY = roadParams.startY;

        // Вычисляем видимую область
        const visibleStart = Math.max(0, cameraOffset - startX);
        
        // Для конечной дороги используем её длину, для бесконечной - вычисляем
        let roadEnd;
        if (roadParams.length !== Infinity) {
            // Для конечной дороги отрисовываем до финиша
            roadEnd = roadParams.length;
        } else {
            // Для бесконечной дороги вычисляем максимальное расстояние
            const maxDistance = Math.max(
                visibleStart + canvasWidth,
                maxCarX - startX + canvasWidth
            );
            
            // Добавляем очень большой запас (минимум 20 экранов вперед) для бесконечной дороги
            roadEnd = maxDistance + canvasWidth * 20;
        }

        // Отрисовываем простую серую дорогу
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(startX - cameraOffset, startY - roadWidth / 2);
        ctx.lineTo(startX - cameraOffset + roadEnd, startY - roadWidth / 2);
        ctx.lineTo(startX - cameraOffset + roadEnd, startY + roadWidth / 2);
        ctx.lineTo(startX - cameraOffset, startY + roadWidth / 2);
        ctx.closePath();
        ctx.fill();

        // Отрисовываем разметку
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(startX - cameraOffset, startY);
        ctx.lineTo(startX - cameraOffset + roadEnd, startY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoadRenderer };
}

