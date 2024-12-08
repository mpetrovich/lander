function main() {
    play().then(() =>
        window.addEventListener('keydown', () => main(), { once: true })
    );
}

const play = () =>
    new Promise((resolve, reject) => {
        const { canvas, ctx } = createCanvas();

        resizeCanvas(canvas);
        window.addEventListener('resize', () => resizeCanvas(canvas));

        const stars = generateStars(canvas.width, canvas.height, 1000);

        const landingPadWidth = 80;
        const [backgroundTerrain] = generateTerrain({
            width: canvas.width,
            heightRange: [200, 300],
            minHeight: 20,
            maxHeight: 500,
            step: 20,
            jaggedness: 20,
            hilliness: 0.5,
        });
        const [midgroundTerrain] = generateTerrain({
            width: canvas.width,
            heightRange: [100, 300],
            minHeight: 20,
            maxHeight: 500,
            step: 20,
            jaggedness: 10,
            hilliness: 0.5,
        });
        const [terrain, landingPads] = generateTerrain({
            width: canvas.width,
            heightRange: [50, 100],
            minHeight: 20,
            maxHeight: 500,
            step: 10,
            jaggedness: 10,
            hilliness: 0.8,
            landingPadCount: 1,
            landingPadWidth,
        });
        images = loadImages({
            flying: 'img/lander.png',
            landed: 'img/lander-landed.png',
            crashed: 'img/lander-crashed.png',
        });
        const lander = new Lander({
            x: 50,
            y: canvas.height - 50,
            velocityX: 0.3,
            velocityY: 0.3,
            mass: 0.01,
            fuel: 12,
            thrustX: 0.05,
            thrustY: 0.1,
            maxLandingSpeed: 0.5,
            gravity: 9.8,
            images,
        });

        const secondsPerFrame = 1 / 60;
        const interval = setInterval(() => {
            drawBackground(canvas, ctx);
            drawStars(canvas, ctx, stars);
            drawTerrain(canvas, ctx, backgroundTerrain, 'hsl(0 0% 10%)');
            drawTerrain(canvas, ctx, midgroundTerrain, 'hsl(0 0% 15%)');
            drawTerrain(canvas, ctx, terrain, 'hsl(0 0% 50%)');
            drawLandingPads(canvas, ctx, landingPads, landingPadWidth);
            lander.move(secondsPerFrame, terrain);
            lander.draw(canvas, ctx);

            drawSpeed(ctx, lander);
            drawFuel(ctx, lander);

            if (lander.crashed || lander.landed) {
                clearInterval(interval);
                resolve();
                return;
            }
        }, secondsPerFrame);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                lander.thrustUp();
            }
            if (event.key === 'ArrowLeft') {
                lander.thrustLeft();
            }
            if (event.key === 'ArrowRight') {
                lander.thrustRight();
            }
        });
    });

function createCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
}

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function loadImages(srcs) {
    const images = {};
    for (const [key, src] of Object.entries(srcs)) {
        images[key] = new Image();
        images[key].src = src;
    }
    return images;
}

function generateTerrain({
    width,
    heightRange,
    minHeight,
    maxHeight,
    step,
    jaggedness,
    hilliness,
    landingPadCount = 0,
    landingPadWidth,
}) {
    const vertices = generateTerrainPath({
        width,
        heightRange,
        minHeight,
        maxHeight,
        step,
        jaggedness,
        hilliness,
    });

    const landingPads = [];
    const landingPadStepSize = Math.ceil(landingPadWidth / step) + 1;
    for (let i = 0; i < landingPadCount; i++) {
        const vi = Math.floor(
            random(landingPadStepSize, vertices.length - landingPadStepSize - 1)
        );
        const landingPadStartVertex = vertices[vi];
        const landingPadVertices = Array.from(
            { length: landingPadStepSize },
            () => undefined
        ).map((vertex, i) => {
            const x = landingPadStartVertex[0] + i * step;
            const y = landingPadStartVertex[1];
            return [x, y];
        });
        vertices.splice(vi, landingPadStepSize, ...landingPadVertices);
        landingPads.push(landingPadStartVertex);
    }

    const terrain = rasterizeTerrainPath(width, vertices);
    return [terrain, landingPads];
}

function generateTerrainPath({
    width,
    heightRange,
    minHeight,
    maxHeight,
    step,
    jaggedness,
    hilliness,
}) {
    const vertices = [];
    for (
        let x = 0,
            lastHeight = random(heightRange[0], heightRange[1]),
            slopeBias = 0;
        x <= width;
        x += step
    ) {
        lastSlopeBias = slopeBias;
        slopeBias = random(-1, 1) + lastSlopeBias * hilliness;
        let height = Math.floor(lastHeight + slopeBias * jaggedness);
        height = clamp(height, minHeight, maxHeight);
        vertices.push([x, height]);
        lastHeight = height;
    }
    return vertices;
}

function rasterizeTerrainPath(width, vertices) {
    const terrain = Array.from({ length: width }, () => 0);
    let startVertex = vertices.shift();
    let endVertex = vertices.shift();
    for (let x = 0; x <= width; x++) {
        const slope =
            (endVertex[1] - startVertex[1]) / (endVertex[0] - startVertex[0]);
        const height = startVertex[1] + slope * (x - startVertex[0]);
        terrain[x] = height;
        if (x === endVertex[0]) {
            startVertex = endVertex;
            endVertex = vertices.shift();
        }
        if (endVertex === undefined) {
            break;
        }
    }
    return terrain;
}

function generateStars(width, height, numStars) {
    const stars = Array.from({ length: numStars }, () => [
        random(0, width),
        random(0, height),
    ]);
    return stars;
}

function drawBackground(canvas, ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStars(canvas, ctx, stars) {
    stars.forEach(([x, y]) => {
        ctx.fillStyle = `rgb(255 255 255 / ${random(0.5, 0.8)})`;
        ctx.fillRect(x, y, 1, 1);
    });
}

function drawTerrain(canvas, ctx, terrain, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - terrain[0]);
    terrain.slice(1).forEach((height, x) => {
        ctx.lineTo(x, canvas.height - height);
    });
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
}

function drawLandingPads(canvas, ctx, landingPads, landingPadWidth) {
    landingPads.forEach(([x, height]) => {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(x, canvas.height - height, landingPadWidth, 5);
    });
}

function drawSpeed(ctx, lander) {
    const width = 300;
    const maxSpeedWidth = width * 0.8;
    const height = 6;
    const x = 20;
    const y = 40;
    const speed = Math.sqrt(lander.velocityX ** 2 + lander.velocityY ** 2);
    const speedRatio = speed / lander.maxLandingSpeed;

    ctx.strokeStyle = 'white';
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = speedRatio >= 1 ? 'red' : 'green';
    ctx.fillRect(x, y, Math.min(maxSpeedWidth * speedRatio, width), height);

    ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
    ctx.fillRect(maxSpeedWidth - 1, y, 2, height);

    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.fillText('Speed', x, 30);
}

function drawFuel(ctx, lander) {
    const width = 300;
    const height = 6;
    const x = 20;
    const y = 80;
    const fuelRatio = lander.fuel / lander.initialFuel;

    ctx.strokeStyle = 'white';
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'hsl(220 100% 50%)';
    ctx.fillRect(x, y, Math.min(width * fuelRatio, width), height);

    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.fillText('Fuel', x, 70);
}

function realToCanvasX(canvasWidth, x) {
    return x;
}

function realToCanvasY(canvasHeight, y) {
    return canvasHeight - y;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function random(min, max) {
    return min + (max - min) * Math.random();
}

function round(value, precision) {
    return Math.round(value * 10 ** precision) / 10 ** precision;
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

class Lander {
    constructor({
        x,
        y,
        mass,
        fuel,
        thrustX,
        thrustY,
        maxLandingSpeed,
        width = 48,
        height = 60,
        minX = 0,
        maxX = Infinity,
        minY = 0,
        maxY = Infinity,
        velocityX = 0,
        velocityY = 0,
        minVelocityX = -Infinity,
        maxVelocityX = Infinity,
        minVelocityY = -Infinity,
        maxVelocityY = Infinity,
        gravity = 9.8,
        images,
    }) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.fuel = fuel;
        this.initialFuel = fuel;
        this.thrustX = thrustX;
        this.thrustY = thrustY;
        this.maxLandingSpeed = maxLandingSpeed;
        this.width = width;
        this.height = height;
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.minVelocityX = minVelocityX;
        this.maxVelocityX = maxVelocityX;
        this.minVelocityY = minVelocityY;
        this.maxVelocityY = maxVelocityY;
        this.gravity = gravity;
        this.images = images;
    }

    move(seconds, terrain) {
        const mass = this.mass + (this.fuel / this.initialFuel) * this.mass;
        this.accelerate(0, -mass * this.gravity * seconds);

        const terrainHeight = terrain[Math.round(this.x)] + this.height / 2;
        if (this.y > terrainHeight) {
            this.x = clamp(this.x + this.velocityX, this.minX, this.maxX);
            this.y = clamp(this.y + this.velocityY, this.minY, this.maxY);
        } else {
            const landingSpeed = Math.sqrt(
                this.velocityX ** 2 + this.velocityY ** 2
            );
            if (landingSpeed <= this.maxLandingSpeed) {
                this.landed = true;
            } else {
                this.crashed = true;
            }

            this.y = terrainHeight;
        }
    }

    thrustUp() {
        this.thrust(0, this.thrustY);
    }

    thrustLeft() {
        this.thrust(-this.thrustX, 0);
    }

    thrustRight() {
        this.thrust(this.thrustX, 0);
    }

    thrust(dx, dy) {
        this.fuel = clamp(this.fuel - Math.abs(dx) - Math.abs(dy), 0, Infinity);
        if (this.fuel > 0) {
            this.accelerate(dx, dy);
            this.thrustDirection = dx === 0 ? 0 : dx > 0 ? 1 : -1;
        }
    }

    accelerate(dx, dy) {
        this.velocityX = clamp(
            this.velocityX + dx,
            this.minVelocityX,
            this.maxVelocityX
        );
        this.velocityY = clamp(
            this.velocityY + dy,
            this.minVelocityY,
            this.maxVelocityY
        );
    }

    draw(canvas, ctx) {
        const midX = realToCanvasX(canvas.width, this.x);
        const midY = realToCanvasY(canvas.height, this.y);
        const left = midX - this.width / 2;
        const top = midY - this.height / 2;
        const fuelRatio = this.fuel / this.initialFuel;
        const fuelWidth = 5;
        const fuelHeight = (1 - fuelRatio) * this.height;

        // Fuel
        if (!this.crashed && !this.landed) {
            ctx.fillStyle = `hsl(210 100% 50%)`;
            ctx.fillRect(
                left + this.width + 10,
                top + fuelHeight,
                fuelWidth,
                this.height - fuelHeight
            );
        }

        const rotateAngle = this.thrustDirection * 10;
        ctx.translate(midX, midY);
        ctx.rotate(degToRad(rotateAngle));

        // Sprite
        const img =
            this.images[
                this.crashed ? 'crashed' : this.landed ? 'landed' : 'flying'
            ];
        const imgX = -this.width / 2;
        const imgY = -this.height / 2;
        const imgWidth = this.width;
        const imgHeight = this.height;
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

        ctx.rotate(degToRad(-rotateAngle));
        ctx.translate(-midX, -midY);
    }
}

main();
