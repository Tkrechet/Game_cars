/**
 * Модуль отрисовки дороги
 * Использует простую черную заливку вместо изображений
 */

class RoadRenderer {
    constructor() {
        // Больше не используем изображения, только простую черную заливку
        this.roadImage = null;
        this.imageLoaded = false;
    }

    /**
     * Загрузка изображения дороги (оставлено для совместимости, но не используется)
     * @param {string} imagePath - Путь к изображению
     * @returns {Promise} Промис загрузки изображения
     */
    loadImage(imagePath) {
        return Promise.resolve(); // Всегда успешно, так как не используем изображения
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
        // Используем простую черную заливку вместо изображений
        this.renderSimpleRoad(ctx, roadParams, cameraOffset, canvasWidth, maxCarX);
    }
    
    /**
     * Отрисовка дороги простой черной заливкой
     */
    renderSimpleRoad(ctx, roadParams, cameraOffset = 0, canvasWidth = 800, maxCarX = 0) {
        const roadWidth = roadParams.width;
        
        // Для зигзагообразной дороги используем специальную отрисовку
        if (roadParams.path && roadParams.path.length > 1) {
            this.renderZigzagRoadSimple(ctx, roadParams, cameraOffset, canvasWidth);
            return;
        }
        
        // Для прямой дороги
        const startX = roadParams.startX;
        const startY = roadParams.startY;
        const endX = roadParams.endX;
        const endY = roadParams.endY;
        
        // Отрисовываем простую черную дорогу
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(startX, startY - roadWidth / 2);
        ctx.lineTo(endX, endY - roadWidth / 2);
        ctx.lineTo(endX, endY + roadWidth / 2);
        ctx.lineTo(startX, startY + roadWidth / 2);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Отрисовка зигзагообразной дороги простой черной заливкой
     */
    renderZigzagRoadSimple(ctx, roadParams, cameraOffset = 0, canvasWidth = 800) {
        const roadWidth = roadParams.width;
        const path = roadParams.path;
        
        if (!path || path.length < 2) return;
        ctx.fillStyle = '#000000';

        // Отрисовываем каждый сегмент как прямоугольник (ось X/Y, повороты 90°)
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            // Горизонтальный сегмент
            if (Math.abs(dx) >= Math.abs(dy)) {
                const x = Math.min(p1.x, p2.x);
                const y = p1.y - roadWidth / 2;
                const width = Math.abs(dx);
                ctx.fillRect(x, y, width, roadWidth);
            } else {
                // Вертикальный сегмент
                const x = p1.x - roadWidth / 2;
                const y = Math.min(p1.y, p2.y);
                const height = Math.abs(dy);
                ctx.fillRect(x, y, roadWidth, height);
            }
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoadRenderer };
}
