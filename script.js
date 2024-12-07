function main() {
    const { canvas, ctx } = createCanvas();
    const lander = new Lander({
        x: 50,
        y: canvas.height - 50,
        mass: 0.01,
        fuel: 5,
        thrustX: 0.05,
        thrustY: 0.1,
    });

    const secondsPerFrame = 1 / 60;
    setInterval(() => {
        drawBackground(canvas, ctx);
        lander.draw(canvas, ctx);
        lander.move(secondsPerFrame);
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

function drawBackground(canvas, ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

class Lander {
    constructor({
        x,
        y,
        mass,
        fuel,
        thrustX,
        thrustY,
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
    }) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.fuel = fuel;
        this.initialFuel = fuel;
        this.thrustX = thrustX;
        this.thrustY = thrustY;
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
    }

    move(seconds) {
        const GRAVITY = 9.8;
        const mass = this.mass + (this.fuel / this.initialFuel) * this.mass;
        this.accelerate(0, -mass * GRAVITY * seconds);
        if (this.y > 0) {
            this.x = clamp(this.x + this.velocityX, this.minX, this.maxX);
            this.y = clamp(this.y + this.velocityY, this.minY, this.maxY);
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
        const width = 20;
        const height = 20;
        const midX = realToCanvasX(canvas.width, this.x);
        const midY = realToCanvasY(canvas.height, this.y);
        const left = midX - width / 2;
        const top = midY - height / 2;
        const fuelRatio = this.fuel / this.initialFuel;
        const fuelHeight = (1 - fuelRatio) * height;

        // Body
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'white';
        ctx.fillRect(left, top, width, height);
        ctx.strokeRect(left, top, width, height);

        // Fuel
        ctx.fillStyle = `hsl(${fuelRatio * 120} 100% 50%)`;
        ctx.fillRect(left, top + fuelHeight, width, height - fuelHeight);
        ctx.strokeRect(left, top + fuelHeight, width, height - fuelHeight);
    }
}

main();
