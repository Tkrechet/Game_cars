

class RoadRenderer {
    constructor() {
        
        this.roadImage = null;
        this.imageLoaded = false;
    }

    loadImage(imagePath) {
        return Promise.resolve(); 
    }

    render(ctx, roadParams, cameraOffset = 0, canvasWidth = 800, maxCarX = 0) {
        
        this.renderSimpleRoad(ctx, roadParams, cameraOffset, canvasWidth, maxCarX);
    }

    renderSimpleRoad(ctx, roadParams, cameraOffset = 0, canvasWidth = 800, maxCarX = 0) {
        const roadWidth = roadParams.width;

        if (roadParams.path && roadParams.path.length > 1) {
            this.renderPathRoadSimple(ctx, roadParams);
            return;
        }

        const startX = roadParams.startX;
        const startY = roadParams.startY;
        const endX = roadParams.endX;
        const endY = roadParams.endY;

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(startX, startY - roadWidth / 2);
        ctx.lineTo(endX, endY - roadWidth / 2);
        ctx.lineTo(endX, endY + roadWidth / 2);
        ctx.lineTo(startX, startY + roadWidth / 2);
        ctx.closePath();
        ctx.fill();
    }

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoadRenderer };
}
