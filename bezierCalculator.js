const controlPoints = [];
let isAdding = false;
let isDragging = false;
let draggedIndex = -1;

const deCasteljau = (points, t) => {
    let current = [...points];
    const allSteps = [current];

    while (current.length > 1) {
        current = current.slice(0, -1).map((p, i) => ({
            x: (1 - t) * p.x + t * current[i + 1].x,
            y: (1 - t) * p.y + t * current[i + 1].y
        }));
        allSteps.push([...current]);
    }

    return allSteps;
};

const drawLine = (ctx, points, color, width, dash = []) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(({ x, y }) => ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.stroke();
};

const drawIntermediatePoints = (ctx, allPoints, finalPoints, drawFinal) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw the gray dashed lines
    drawLine(ctx, allPoints[0], 'gray', 2, [5, 5]);

    // Draw intermediate points as black circles
    ctx.fillStyle = 'black';
    allPoints[0].forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Draw intermediate red lines (if not drawing final curve)
    if (!drawFinal) {
        allPoints.slice(1).forEach(points => drawLine(ctx, points, 'red', 1));
    }

    // Draw the final blue Bézier curve
    if (finalPoints.length > 0) {
        drawLine(ctx, finalPoints, 'blue', 3);
    }
};

const bezierCurveDerivative = () => controlPoints.slice(0, -1)
    .map((p, i) => ({
        x: controlPoints[i + 1].x - p.x,
        y: controlPoints[i + 1].y - p.y
    }));

const drawArrowhead = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));

    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
};

const drawDerivativeVectors = (ctx, derivativeVectors, centerX, centerY) => {
    ctx.beginPath();
    ctx.strokeStyle = 'red';

    derivativeVectors.forEach(vector => {
        const toX = centerX + vector.x;
        const toY = centerY + vector.y;

        ctx.moveTo(centerX, centerY);
        ctx.lineTo(toX, toY);

        drawArrowhead(ctx, centerX, centerY, toX, toY);
    });

    ctx.stroke();
};

const animateBezierCurve = (ctx, points, steps, derivativeVectors, centerX, centerY) => {
    let t = 0;
    const finalPoints = [];

    const animate = () => {
        if (t > 1) {
            if (derivativeVectors) {
                const translatedVectors = derivativeVectors.map(vector => ({
                    x: vector.x + centerX,
                    y: vector.y + centerY
                }));

                drawIntermediatePoints(ctx, [translatedVectors], finalPoints, true);
                drawDerivativeVectors(ctx, derivativeVectors, centerX, centerY);
            } else {
                drawIntermediatePoints(ctx, [points], finalPoints, true);
            }
            return;
        }

        const allPoints = deCasteljau(points, t);
        finalPoints.push(allPoints[allPoints.length - 1][0]);
        drawIntermediatePoints(ctx, allPoints, finalPoints, false);

        const tracingPoint = allPoints[allPoints.length - 1][0];
        ctx.beginPath();
        ctx.arc(tracingPoint.x, tracingPoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'green';
        ctx.fill();

        if (derivativeVectors) {
            drawDerivativeVectors(ctx, derivativeVectors, centerX, centerY);
        }

        t += 1 / steps;
        requestAnimationFrame(animate);
    };

    animate();
};

const resetCanvas = (ctx, derivativeCtx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    derivativeCtx.clearRect(0, 0, derivativeCtx.canvas.width, derivativeCtx.canvas.height);
    controlPoints.length = 0;
};

globalThis.onload = function() {
    const canvas = document.getElementById('bezierCanvas');
    const ctx = canvas.getContext('2d');
    const derivativeCanvas = document.getElementById('derivativeCanvas');
    const derivativeCtx = derivativeCanvas.getContext('2d');

    canvas.addEventListener('click', (event) => {
        if (isAdding) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            controlPoints.push({ x, y });
            drawIntermediatePoints(ctx, [controlPoints], []);
        }
    });

    canvas.addEventListener('mousedown', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        for (let i = 0; i < controlPoints.length; i++) {
            const point = controlPoints[i];
            const dx = point.x - x;
            const dy = point.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 5) {
                isDragging = true;
                draggedIndex = i;
                break;
            }
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            controlPoints[draggedIndex] = { x, y };
            let finalPoints = [];
            for (let i = 0; i <= 150; i++) {
                const t = i / 150;
                const allPoints = deCasteljau(controlPoints, t);
                finalPoints.push(allPoints[allPoints.length - 1][0]);
            }
            drawIntermediatePoints(ctx, [controlPoints], finalPoints, true);

            const derivativeVectors = bezierCurveDerivative();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const translatedVectors = derivativeVectors.map(vector => ({
                x: vector.x + centerX,
                y: vector.y + centerY
            }));

            finalPoints = [];
            for (let i = 0; i <= 150; i++) {
                const t = i / 150;
                const allPoints = deCasteljau(translatedVectors, t);
                finalPoints.push(allPoints[allPoints.length - 1][0]);
            }

            drawIntermediatePoints(derivativeCtx, [translatedVectors], finalPoints, true);
            drawDerivativeVectors(derivativeCtx, derivativeVectors, centerX, centerY);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        draggedIndex = -1;
    });

    document.getElementById('controlPointsButton').addEventListener('click', () => {
        isAdding = true;
    });

    document.getElementById('bezierCurveButton').addEventListener('click', () => {
        isAdding = false;
        animateBezierCurve(ctx, controlPoints, 150);

        const derivativeVectors = bezierCurveDerivative();
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const translatedVectors = derivativeVectors.map(vector => ({
            x: vector.x + centerX,
            y: vector.y + centerY
        }));

        animateBezierCurve(derivativeCtx, translatedVectors, 150, derivativeVectors, centerX, centerY);
    });

    document.getElementById('resetButton').addEventListener('click', () => {
        resetCanvas(ctx, derivativeCtx);
    });
};
