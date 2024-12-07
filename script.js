function main() {
    const { canvas, ctx } = createCanvas();
    const terrain = generateTerrain({
        width: canvas.width,
        minHeight: 10,
        maxHeight: 100,
        step: 20,
        jaggedness: 10,
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
    });

    const secondsPerFrame = 1 / 60;
    const interval = setInterval(() => {
        drawBackground(canvas, ctx);
        drawTerrain(canvas, ctx, terrain);
        lander.move(secondsPerFrame, terrain);
        lander.draw(canvas, ctx);

        drawSpeed(ctx, lander);
        drawFuel(ctx, lander);
        if (lander.crashed || lander.landed) {
            clearInterval(interval);
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
}

function createCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
}

function generateTerrain({ width, minHeight, maxHeight, step, jaggedness }) {
    const vertices = [];
    for (
        let x = 0, lastHeight = random(minHeight, maxHeight);
        x <= width;
        x += step
    ) {
        let height = Math.floor(lastHeight + random(-1, 1) * jaggedness);
        height = clamp(height, minHeight, maxHeight);
        vertices.push([x, height]);
        lastHeight = height;
    }

    const terrain = Array.from({ length: width + 1 }, () => undefined);
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
    }
    return terrain;
}

function drawBackground(canvas, ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTerrain(canvas, ctx, terrain) {
    ctx.fillStyle = 'gray';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - terrain[0][1]);
    terrain.slice(1).forEach((height, x) => {
        ctx.lineTo(x, canvas.height - height);
    });
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
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

class Lander {
    constructor({
        x,
        y,
        mass,
        fuel,
        thrustX,
        thrustY,
        maxLandingSpeed,
        width = 20,
        height = 20,
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
        const fuelHeight = (1 - fuelRatio) * this.height;

        // Body
        ctx.fillStyle = this.crashed ? 'red' : this.landed ? 'green' : 'black';
        ctx.strokeStyle = 'white';
        ctx.fillRect(left, top, this.width, this.height);
        ctx.strokeRect(left, top, this.width, this.height);

        // Fuel
        if (!this.crashed && !this.landed) {
            ctx.fillStyle = `hsl(210 100% 50%)`;
            ctx.fillRect(
                left,
                top + fuelHeight,
                this.width,
                this.height - fuelHeight
            );
            ctx.strokeRect(
                left,
                top + fuelHeight,
                this.width,
                this.height - fuelHeight
            );
        }
    }
}

main();
