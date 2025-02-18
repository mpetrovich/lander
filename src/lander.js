import { realToCanvasX, realToCanvasY, clamp, degToRad } from './utils.js'

const DEBUG = false

export default class Lander {
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
        minX = -Infinity,
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
        this.x = x
        this.y = y
        this.mass = mass
        this.fuel = fuel
        this.initialFuel = fuel
        this.thrustAccelX = thrustAccelX
        this.thrustAccelY = thrustAccelY
        this.maxLandingSpeed = maxLandingSpeed
        this.width = width
        this.height = height
        this.offsetY = offsetY
        this.minX = minX
        this.maxX = maxX
        this.minY = minY
        this.maxY = maxY
        this.velocityX = velocityX
        this.velocityY = velocityY
        this.minVelocityX = minVelocityX
        this.maxVelocityX = maxVelocityX
        this.minVelocityY = minVelocityY
        this.maxVelocityY = maxVelocityY
        this.gravity = gravity
        this.images = images
        this.speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
    }

    move(seconds, terrain, landingPads, landingPadWidth) {
        const mass = this.mass + (this.fuel / this.initialFuel) * this.mass
        this.accelerate(0, -mass * this.gravity * seconds)

        const terrainHeight = terrain[Math.round(this.x)] + this.height / 2
        if (this.y > terrainHeight) {
            this.x = clamp(this.x + this.velocityX, this.minX, this.maxX)
            this.y = clamp(this.y + this.velocityY, this.minY, this.maxY)
        } else {
            const landerX = this.x
            const landerWidth = this.width
            if (
                this.speed <= this.maxLandingSpeed &&
                landingPads.some(
                    ([padX, height]) => padX <= landerX && landerX + landerWidth / 2 <= padX + landingPadWidth
                )
            ) {
                this.landed = true
            } else {
                this.crashed = true
            }
            this.y = terrainHeight
            this.thrust(0, 0)
        }
    }

    thrustUp() {
        this.thrust(0, this.thrustAccelY)
    }

    thrustLeft() {
        this.thrust(-this.thrustAccelX, 0)
    }

    thrustRight() {
        this.thrust(this.thrustAccelX, 0)
    }

    thrust(dx, dy) {
        this.fuel = clamp(this.fuel - Math.abs(dx) - Math.abs(dy), 0, Infinity)
        if (this.fuel > 0) {
            this.accelerate(dx, dy)
            this.thrustX = dx
            this.thrustY = dy
        } else {
            this.thrustX = 0
            this.thrustY = 0
        }
    }

    accelerate(dx, dy) {
        this.velocityX = clamp(this.velocityX + dx, this.minVelocityX, this.maxVelocityX)
        this.velocityY = clamp(this.velocityY + dy, this.minVelocityY, this.maxVelocityY)
        this.speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
    }

    getHitbox() {
        return {
            left: this.x - this.width / 2,
            top: this.y + this.height / 2,
            right: this.x + this.width / 2,
            bottom: this.y - this.height / 2,
        }
    }

    draw(canvas) {
        const ctx = canvas.getContext('2d')
        const midX = realToCanvasX(canvas.width, this.x)
        const midY = realToCanvasY(canvas.height, this.y)
        const left = midX - this.width / 2
        const top = midY - this.height / 2

        ctx.save()

        // Hitbox (debug)
        if (DEBUG) {
            ctx.strokeStyle = 'white'
            const hitbox = this.getHitbox()
            ctx.strokeRect(
                realToCanvasX(canvas.width, hitbox.left),
                realToCanvasY(canvas.height, hitbox.top),
                hitbox.right - hitbox.left,
                Math.abs(hitbox.top - hitbox.bottom)
            )
        }

        const rotateAngle = this.thrustX * 100
        ctx.translate(midX, midY)
        ctx.rotate(degToRad(rotateAngle))

        // Thrust up
        if (this.thrustY > 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)'
            ctx.beginPath()
            ctx.arc(-this.width / 4, this.height * 0.57, this.width / 5, 0, Math.PI * 2)
            ctx.arc(this.width / 4, this.height * 0.57, this.width / 5, 0, Math.PI * 2)
            ctx.fill()
        }

        // Thrust left
        if (this.thrustX < 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)'
            ctx.beginPath()
            ctx.arc(this.width / 4, this.height * 0.57, this.width / 5, 0, Math.PI * 2)
            ctx.fill()
        }

        // Thrust right
        if (this.thrustX > 0) {
            ctx.fillStyle = 'hsl(50 100% 50%)'
            ctx.beginPath()
            ctx.arc(-this.width / 4, this.height * 0.57, this.width / 5, 0, Math.PI * 2)
            ctx.fill()
        }

        // Sprite
        const img = this.images[this.crashed ? 'crashed' : this.landed ? 'landed' : 'flying']
        const imgX = -this.width / 2
        const imgY = -this.height / 2 + this.offsetY
        const imgWidth = this.width
        const imgHeight = this.height
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)

        ctx.restore()

        // Fuel
        if (!this.crashed && !this.landed) {
            const fuelRatio = this.fuel / this.initialFuel
            ctx.fillStyle = `hsl(210 100% 50%)`
            ctx.fillRect(left, top - 5, this.width * fuelRatio, 5)
        }
    }
}
