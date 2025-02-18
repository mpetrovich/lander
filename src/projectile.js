export default class Projectile {
    constructor({ x, y, size, speed, angle, source, color, gravity = 0 }) {
        this.x = x
        this.y = y
        this.size = size
        this.speed = speed
        this.angle = angle
        this.velocityX = this.speed * Math.cos(this.angle)
        this.velocityY = this.speed * Math.sin(this.angle)
        this.source = source
        this.color = color
        this.gravity = gravity
    }

    accelerate(seconds) {
        this.velocityY -= this.gravity * seconds
    }

    move(seconds) {
        this.x += this.velocityX * seconds
        this.y += this.velocityY * seconds
        this.accelerate(seconds)
    }

    getHitbox() {
        return {
            left: this.x - this.size / 2,
            top: this.y + this.size / 2,
            right: this.x + this.size / 2,
            bottom: this.y - this.size / 2,
        }
    }

    draw(canvas) {
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.translate(this.x, canvas.height - this.y)
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(0, 0, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
}
