import Lander from './lander.js'
import Projectile from './projectile.js'
import Terrain from './terrain.js'
import { realToCanvasX, realToCanvasY, random, degToRad } from './utils.js'

const DEBUG = false
const GRAVITY_EARTH = 9.8
const GRAVITY_MOON = 1.625
const GRAVITY_JUPITER = 24.79
let score = 0

export default function main() {
    play()
        .then(({ lander }) => {
            const points = calculatePoints(lander)
            score += points
        })
        .catch((e) => {
            console.log(e)
        })
        .finally(() =>
            setTimeout(
                () =>
                    window.addEventListener('keydown', () => main(), {
                        once: true,
                    }),
                500
            )
        )
}

function calculatePoints(lander) {
    const points = Math.round((lander.fuel / lander.initialFuel) * 100)
    return points
}

const play = () =>
    new Promise((resolve, reject) => {
        const canvas = createCanvas()
        const ctx = canvas.getContext('2d')

        resizeCanvas(canvas)
        window.addEventListener('resize', () => resizeCanvas(canvas))

        const stars = generateStars(canvas.width, canvas.height, 1000)

        const gravity = GRAVITY_MOON
        const terrainWidth = canvas.width * 2
        const terrainHeight = canvas.height
        const starsWidth = canvas.width * 2
        const starsHeight = canvas.height * 2
        const landingPadWidth = 80
        const turretWidth = 60
        const turretCount = 0
        const turretBarrelLength = 30

        const projectileSpeed = 50

        const [backgroundTerrain] = Terrain.generate({
            width: terrainWidth,
            heightRange: [200, 300],
            minHeight: 20,
            maxHeight: 500,
            stepWidth: 20,
            jaggedness: 20,
            hilliness: 0.5,
        })
        const [midgroundTerrain] = Terrain.generate({
            width: terrainWidth,
            heightRange: [100, 300],
            minHeight: 20,
            maxHeight: 500,
            stepWidth: 20,
            jaggedness: 10,
            hilliness: 0.5,
        })
        const [terrain, landingPads, turrets] = Terrain.generate({
            width: terrainWidth,
            heightRange: [50, 100],
            minHeight: 30,
            maxHeight: 300,
            stepWidth: 10,
            jaggedness: 10,
            hilliness: 0.8,
            landingPadCount: 1,
            landingPadEvery: terrainWidth,
            landingPadWidth,
            turretCount,
            turretWidth,
            turretEvery: terrainWidth / 3,
        })
        const projectiles = []
        const images = loadImages({
            flying: 'img/rocket.png',
            landed: 'img/rocket.png',
            crashed: 'img/rocket-crashed.png',
        })
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
            gravity,
            images,
        })

        const secondsPerFrame = 1 / 60
        const starfieldPrecession = random(-0.005, 0.005)
        const starfieldSpeed = random(1, 5)
        let time = 0
        let frames = 0
        let starfieldAngle = random(0, 360)
        let dropBomb = false
        let angleToLander

        const interval = setInterval(() => {
            if (dropBomb) {
                dropBomb = false
                projectiles.push(
                    new Projectile({
                        source: 'lander',
                        x: lander.x,
                        y: lander.y - lander.height / 2,
                        size: 8,
                        gravity: gravity * 4,
                        speed: Math.sqrt(lander.velocityX ** 2 + lander.velocityY ** 2) / secondsPerFrame,
                        angle: Math.atan2(lander.velocityY, lander.velocityX),
                        color: 'hsl(30 100% 50%)',
                    })
                )
            }

            if (turrets.length > 0) {
                angleToLander = Math.atan2(lander.y - turrets[0][1], lander.x - turrets[0][0])
                if (frames % 500 === 0) {
                    projectiles.push(
                        generateTurretProjectile({
                            turrets,
                            turretWidth,
                            turretBarrelLength,
                            angleToLander,
                            projectileSpeed,
                        })
                    )
                }
                if (frames % 500 === 50) {
                    projectiles.push(
                        generateTurretProjectile({
                            turrets,
                            turretWidth,
                            turretBarrelLength,
                            angleToLander,
                            projectileSpeed,
                        })
                    )
                }
                if (frames % 500 === 100) {
                    projectiles.push(
                        generateTurretProjectile({
                            turrets,
                            turretWidth,
                            turretBarrelLength,
                            angleToLander,
                            projectileSpeed,
                        })
                    )
                }
            }

            lander.move(secondsPerFrame, terrain, landingPads, landingPadWidth)
            projectiles.forEach((projectile) => {
                projectile.move(secondsPerFrame)
            })
            projectiles.forEach((projectile, index) => {
                if (projectile.x < 0 || projectile.x > canvas.width) {
                    projectiles.splice(index, 1)
                }
            })
            projectiles.forEach((projectile, index) => {
                if (projectile.source !== 'lander' && hitboxesIntersect(projectile.getHitbox(), lander.getHitbox())) {
                    // Hit lander
                    projectiles.splice(index, 1)
                    lander.crashed = true
                }

                turrets.forEach((turret, turretIndex) => {
                    if (
                        projectile.source === 'lander' &&
                        hitboxesIntersect(projectile.getHitbox(), {
                            left: turret[0],
                            top: turret[1] + turretWidth / 2,
                            right: turret[0] + turretWidth,
                            bottom: turret[1],
                        })
                    ) {
                        // Hit turret
                        projectiles.splice(index, 1)
                        turrets.splice(turretIndex, 1)
                    }
                })

                if (
                    projectile.y < 0 ||
                    projectile.y > canvas.height ||
                    projectile.x < 0 ||
                    projectile.x > canvas.width
                ) {
                    // Out of bounds
                    projectiles.splice(index, 1)
                }

                if (projectile.y <= terrain[Math.round(projectile.x)]) {
                    // Hit terrain
                    projectiles.splice(index, 1)
                }
            })

            drawBackground(canvas)

            ctx.save()

            const scrollStartThreshold = canvas.width / 3
            if (lander.x < scrollStartThreshold) {
                ctx.translate(0, 0)
            } else {
                ctx.translate(0 - (lander.x - scrollStartThreshold), 0)
            }

            drawStars({
                canvas,
                width: starsWidth,
                height: starsHeight,
                stars,
                time,
                angle: starfieldAngle,
                speed: starfieldSpeed,
            })
            drawTerrain({ canvas, terrainWidth, terrainHeight, terrain: backgroundTerrain, color: 'hsl(0 0% 10%)' })
            drawTerrain({ canvas, terrainWidth, terrainHeight, terrain: midgroundTerrain, color: 'hsl(0 0% 15%)' })
            drawTerrain({ canvas, terrainWidth, terrainHeight, terrain, color: 'hsl(0 0% 50%)' })
            drawLandingPads(canvas, landingPads, landingPadWidth, lander)

            for (const [x, height] of turrets) {
                ctx.fillStyle = 'hsl(0 100% 50%)'
                ctx.strokeStyle = ctx.fillStyle
                ctx.lineWidth = 4

                // Dome
                ctx.beginPath()
                ctx.arc(x + turretWidth / 2, canvas.height - height, turretWidth / 4, Math.PI, Math.PI * 2)
                ctx.fill()

                // Barrel
                ctx.beginPath()
                ctx.moveTo(x + turretWidth / 2, canvas.height - height)
                ctx.lineTo(
                    x + turretWidth / 2 + turretBarrelLength * Math.cos(angleToLander),
                    canvas.height - height - turretBarrelLength * Math.sin(angleToLander)
                )
                ctx.stroke()
            }
            lander.draw(canvas)
            drawProjectiles(canvas, projectiles)

            if (lander.crashed || lander.landed) {
                clearInterval(interval)
                if (lander.landed) {
                    resolve({ lander, time })
                } else {
                    drawExplosion(canvas, lander.x, lander.y, reject)
                }
                return
            }

            ctx.restore()

            drawScore({ canvas, score })

            time += secondsPerFrame
            frames++
            starfieldAngle += starfieldPrecession
        }, secondsPerFrame)

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                lander.thrustUp()
            }
            if (event.key === 'ArrowLeft') {
                lander.thrustLeft()
            }
            if (event.key === 'ArrowRight') {
                lander.thrustRight()
            }
            if (event.key === ' ') {
                dropBomb = true
            }
        })

        document.addEventListener('keyup', (event) => {
            lander.thrust(0, 0)
        })
    })

function createCanvas() {
    const canvas = document.getElementById('canvas')
    return canvas
}

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

function loadImages(srcs) {
    const images = {}
    for (const [key, src] of Object.entries(srcs)) {
        images[key] = new Image()
        images[key].src = src
    }
    return images
}

function generateStars(width, height, numStars) {
    const stars = Array.from({ length: numStars }, () => [random(0, width), random(0, height)])
    return stars
}

function generateTurretProjectile({ turrets, turretWidth, turretBarrelLength, angleToLander, projectileSpeed }) {
    return new Projectile({
        source: 'turret',
        x: turrets[0][0] + turretWidth / 2 + turretBarrelLength * Math.cos(angleToLander),
        y: turrets[0][1] + turretBarrelLength * Math.sin(angleToLander),
        size: 3,
        speed: projectileSpeed,
        angle: angleToLander,
        color: 'yellow',
        gravity: 0,
    })
}

function drawBackground(canvas) {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawStars({ canvas, width, height, stars, time = 0, angle = 0, speed = 1 }) {
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(degToRad(angle))
    for (const [x, y] of stars) {
        ctx.fillStyle = `rgb(255 255 255 / ${random(0.5, 0.8)})`
        ctx.fillRect(-canvas.width / 2 + ((x + time * speed) % canvas.width), -canvas.height * 1.5 + y, 1, 1)
        ctx.fillRect(-canvas.width / 2 + ((x + time * speed) % canvas.width), -canvas.height * 0.5 + y, 1, 1)
        ctx.fillRect(-canvas.width / 2 + ((x + time * speed) % canvas.width), canvas.height * 0.5 + y, 1, 1)
    }
    ctx.restore()
}

function drawTerrain({ canvas, terrainWidth, terrainHeight, terrain, color }) {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, terrainHeight - terrain[0])
    for (let x = 1; x < terrainWidth; x++) {
        ctx.lineTo(x, terrainHeight - terrain[x])
    }
    ctx.lineTo(terrainWidth, terrainHeight)
    ctx.lineTo(0, terrainHeight)
    ctx.fill()
}

function drawLandingPads(canvas, landingPads, landingPadWidth, lander) {
    const ctx = canvas.getContext('2d')
    landingPads.forEach(([x, height]) => {
        if (lander.landed && x <= lander.x && lander.x <= x + landingPadWidth) {
            ctx.fillStyle = 'green'
        } else if (lander.speed > lander.maxLandingSpeed) {
            ctx.fillStyle = 'yellow'
        } else if (lander.crashed) {
            ctx.fillStyle = 'red'
        } else {
            ctx.fillStyle = 'white'
        }
        ctx.fillRect(x, canvas.height - height, landingPadWidth, 5)

        if (lander.speed > lander.maxLandingSpeed) {
            ctx.fillStyle = 'yellow'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('TOO FAST', x + landingPadWidth / 2, canvas.height - height + 20)
        } else if (lander.crashed) {
            ctx.fillStyle = 'red'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('CRASHED', x + landingPadWidth / 2, canvas.height - height + 20)
        } else if (lander.landed) {
            ctx.fillStyle = 'green'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('SUCCESS!', x + landingPadWidth / 2, canvas.height - height + 20)
        }
    })
}

function drawProjectiles(canvas, projectiles) {
    const ctx = canvas.getContext('2d')
    projectiles.forEach((projectile) => {
        projectile.draw(canvas)
    })
}

function drawScore({ canvas, score }) {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 30, 30)
}

function drawExplosion(canvas, x, y, onComplete) {
    const ctx = canvas.getContext('2d')
    let frame = 0
    const interval = setInterval(() => {
        ctx.fillStyle = `hsl(50 100% 50%)`
        ctx.beginPath()
        ctx.arc(realToCanvasX(canvas.width, x), realToCanvasY(canvas.height, y), frame * 8, 0, Math.PI * 2)
        ctx.fill()
        frame++
        if (frame > 5) {
            clearInterval(interval)
            onComplete()
        }
    }, 1000 / 60)
}

function hitboxesIntersect(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top >= b.bottom && a.bottom <= b.top
}
