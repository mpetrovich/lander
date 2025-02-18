export function realToCanvasX(canvasWidth, x) {
    return x
}

export function realToCanvasY(canvasHeight, y) {
    return canvasHeight - y
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}

export function random(min, max) {
    return min + (max - min) * Math.random()
}

export function randomIndex(length, min = 0, max = length - 1) {
    return clamp(0, Math.floor(random(min, max)), Math.max(0, length - 1))
}

export function randomWithBias(min, max, bias = 2) {
    return min + (max - min) * Math.pow(Math.random(), bias)
}

export function round(value, precision) {
    return Math.round(value * 10 ** precision) / 10 ** precision
}

export function degToRad(degrees) {
    return (degrees * Math.PI) / 180
}
