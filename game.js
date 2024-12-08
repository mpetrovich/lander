const DEBUG = false;
const GRAVITY_EARTH = 9.8;
const GRAVITY_MOON = 1.625;
const GRAVITY_JUPITER = 24.79;
let score = 0;

function main() {
    play()
        .then(({ lander }) => {
            const points = calculatePoints(lander);
            score += points;
        })
        .catch(() => {})
        .finally(() =>
            window.addEventListener('keydown', () => main(), { once: true })
        );
}

function calculatePoints(lander) {
    const points = Math.round((lander.fuel / lander.initialFuel) * 100);
    return points;
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
            minHeight: 30,
            maxHeight: 500,
            step: 10,
            jaggedness: 10,
            hilliness: 0.8,
            landingPadCount: 1,
            landingPadWidth,
        });
        images = loadImages({
            flying: 'img/rocket.png',
            landed: 'img/rocket.png',
            crashed: 'img/rocket-crashed.png',
        });
        const lander = new Lander({
            width: 100 / 3,
            height: 150 / 3,
            offsetY: 0,
            x: 50,
            y: canvas.height - 100,
            velocityX: 0.4,
            velocityY: 0.2,
            mass: 0.03,
            fuel: 12,
            thrustAccelX: 0.05,
            thrustAccelY: 0.1,
            maxLandingSpeed: 0.5,
            gravity: GRAVITY_MOON,
            images,
        });

        const secondsPerFrame = 1 / 60;
        const starfieldPrecession = random(-0.01, 0.01);
        const starfieldSpeed = random(1, 5);
        let time = 0;
        let starfieldAngle = random(0, 360);
        const interval = setInterval(() => {
            lander.move(secondsPerFrame, terrain, landingPads, landingPadWidth);

            drawBackground(canvas, ctx);
            drawStars({
                canvas,
                ctx,
                stars,
                time,
                angle: starfieldAngle,
                speed: starfieldSpeed,
            });
            drawTerrain(canvas, ctx, backgroundTerrain, 'hsl(0 0% 10%)');
            drawTerrain(canvas, ctx, midgroundTerrain, 'hsl(0 0% 15%)');
            drawTerrain(canvas, ctx, terrain, 'hsl(0 0% 50%)');
            drawLandingPads(canvas, ctx, landingPads, landingPadWidth, lander);
            lander.draw(canvas, ctx);
            drawScore({ canvas, ctx, score });

            if (lander.crashed || lander.landed) {
                clearInterval(interval);
                if (lander.landed) {
                    resolve({ lander, time });
                } else {
                    reject();
                }
                return;
            }
            time += secondsPerFrame;
            starfieldAngle += starfieldPrecession;
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

        document.addEventListener('keyup', (event) => {
            lander.thrust(0, 0);
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
            randomBias(
                landingPadStepSize,
                vertices.length - landingPadStepSize - 1
            )
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

function drawStars({ canvas, ctx, stars, time = 0, angle = 0, speed = 1 }) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(degToRad(angle));
    stars.forEach(([x, y]) => {
        ctx.fillStyle = `rgb(255 255 255 / ${random(0.5, 0.8)})`;
        ctx.fillRect(
            -canvas.width / 2 + ((x + time * speed) % canvas.width),
            -canvas.height * 1.5 + y,
            1,
            1
        );
        ctx.fillRect(
            -canvas.width / 2 + ((x + time * speed) % canvas.width),
            -canvas.height * 0.5 + y,
            1,
            1
        );
        ctx.fillRect(
            -canvas.width / 2 + ((x + time * speed) % canvas.width),
            canvas.height * 0.5 + y,
            1,
            1
        );
    });
    ctx.restore();
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

function drawLandingPads(canvas, ctx, landingPads, landingPadWidth, lander) {
    landingPads.forEach(([x, height]) => {
        if (lander.landed && x <= lander.x && lander.x <= x + landingPadWidth) {
            ctx.fillStyle = 'green';
        } else if (lander.speed > lander.maxLandingSpeed) {
            ctx.fillStyle = 'red';
        } else if (lander.crashed) {
            ctx.fillStyle = 'red';
        } else {
            ctx.fillStyle = 'yellow';
        }
        ctx.fillRect(x, canvas.height - height, landingPadWidth, 5);

        if (lander.speed > lander.maxLandingSpeed) {
            ctx.fillStyle = 'rgb(150 0 0)';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                'TOO FAST',
                x + landingPadWidth / 2,
                canvas.height - height + 20
            );
        } else if (lander.crashed) {
            ctx.fillStyle = 'rgb(150 0 0)';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                'OFF TARGET',
                x + landingPadWidth / 2,
                canvas.height - height + 20
            );
        } else if (lander.landed) {
            ctx.fillStyle = 'rgb(0 100 0)';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                'SUCCESS!',
                x + landingPadWidth / 2,
                canvas.height - height + 20
            );
        }
    });
}

function drawScore({ canvas, ctx, score }) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 30, 30);
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

function randomBias(min, max, bias = 2) {
    return min + (max - min) * Math.pow(Math.random(), bias);
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
        thrustAccelX,
        thrustAccelY,
        maxLandingSpeed,
        width,
        height,
        offsetY = 0,
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
        this.thrustAccelX = thrustAccelX;
        this.thrustAccelY = thrustAccelY;
        this.maxLandingSpeed = maxLandingSpeed;
        this.width = width;
        this.height = height;
        this.offsetY = offsetY;
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
        this.speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
    }

    move(seconds, terrain, landingPads, landingPadWidth) {
        const mass = this.mass + (this.fuel / this.initialFuel) * this.mass;
        this.accelerate(0, -mass * this.gravity * seconds);

        const terrainHeight = terrain[Math.round(this.x)] + this.height / 2;
        if (this.y > terrainHeight) {
            this.x = clamp(this.x + this.velocityX, this.minX, this.maxX);
            this.y = clamp(this.y + this.velocityY, this.minY, this.maxY);
        } else {
            const landerX = this.x;
            const landerWidth = this.width;
            if (
                this.speed <= this.maxLandingSpeed &&
                landingPads.some(
                    ([padX, height]) =>
                        padX <= landerX &&
                        landerX + landerWidth / 2 <= padX + landingPadWidth
                )
            ) {
                this.landed = true;
            } else {
                this.crashed = true;
            }
            this.y = terrainHeight;
            this.thrust(0, 0);
        }
    }

    thrustUp() {
        this.thrust(0, this.thrustAccelY);
    }

    thrustLeft() {
        this.thrust(-this.thrustAccelX, 0);
    }

    thrustRight() {
        this.thrust(this.thrustAccelX, 0);
    }

    thrust(dx, dy) {
        this.fuel = clamp(this.fuel - Math.abs(dx) - Math.abs(dy), 0, Infinity);
        if (this.fuel > 0) {
            this.accelerate(dx, dy);
            this.thrustX = dx;
            this.thrustY = dy;
        } else {
            this.thrustX = 0;
            this.thrustY = 0;
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
        this.speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
    }

    draw(canvas, ctx) {
        const midX = realToCanvasX(canvas.width, this.x);
        const midY = realToCanvasY(canvas.height, this.y);
        const left = midX - this.width / 2;
        const top = midY - this.height / 2;

        ctx.save();

        // Hitbox (debug)
        if (DEBUG) {
            ctx.strokeStyle = 'white';
            ctx.strokeRect(left, top, this.width, this.height);
        }

        const rotateAngle = this.thrustX * 100;
        ctx.translate(midX, midY);
        ctx.rotate(degToRad(rotateAngle));

        // Thrust up
        if (this.thrustY > 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)';
            ctx.beginPath();
            ctx.arc(
                -this.width / 4,
                this.height * 0.57,
                this.width / 5,
                0,
                Math.PI * 2
            );
            ctx.arc(
                this.width / 4,
                this.height * 0.57,
                this.width / 5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Thrust left
        if (this.thrustX < 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)';
            ctx.beginPath();
            ctx.arc(
                this.width / 4,
                this.height * 0.57,
                this.width / 5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Thrust right
        if (this.thrustX > 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)';
            ctx.beginPath();
            ctx.arc(
                -this.width / 4,
                this.height * 0.57,
                this.width / 5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Sprite
        const img =
            this.images[
                this.crashed ? 'crashed' : this.landed ? 'landed' : 'flying'
            ];
        const imgX = -this.width / 2;
        const imgY = -this.height / 2 + this.offsetY;
        const imgWidth = this.width;
        const imgHeight = this.height;
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

        ctx.restore();

        // Fuel
        if (!this.crashed && !this.landed) {
            const fuelRatio = this.fuel / this.initialFuel;
            ctx.fillStyle = `hsl(210 100% 50%)`;
            ctx.fillRect(left, top - 5, this.width * fuelRatio, 5);
        }
    }
}

main();
