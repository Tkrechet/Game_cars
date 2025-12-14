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
        
        // Для дорог с путём используем полилинию (подходит и для круга)
        if (roadParams.path && roadParams.path.length > 1) {
            this.renderPathRoadSimple(ctx, roadParams);
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
    renderPathRoadSimple(ctx, roadParams) {
        const roadWidth = roadParams.width;
        const path = roadParams.path;
        
        if (!path || path.length < 2) return;

        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = roadWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoadRenderer };
}
