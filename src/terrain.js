import { clamp, randomIndex, random } from './utils.js'

export default class Terrain {
    static generate({
        width,
        heightRange,
        minHeight,
        maxHeight,
        stepWidth,
        jaggedness,
        hilliness,
        landingPadCount = 0,
        landingPadWidth,
        landingPadEvery = width,
        turretCount = 0,
        turretWidth,
        turretEvery = width,
    }) {
        const vertices = generateTerrainPath({
            width,
            heightRange,
            minHeight,
            maxHeight,
            stepWidth,
            jaggedness,
            hilliness,
        })
        const landingPads =
            landingPadCount > 0
                ? generateTerrainObjects({
                      vertices,
                      count: landingPadCount,
                      width: Math.ceil(landingPadWidth / stepWidth) + 1,
                      minDistance: Math.floor(landingPadEvery / stepWidth / 3),
                  })
                : []
        const turrets =
            turretCount > 0
                ? generateTerrainObjects({
                      vertices,
                      count: turretCount,
                      width: Math.ceil(turretWidth / stepWidth) + 1,
                      minDistance: Math.floor(turretEvery / stepWidth),
                  })
                : []
        const terrain = rasterizeTerrainPath(width, vertices)
        return [terrain, landingPads, turrets]
    }
}

function generateTerrainPath({ width, heightRange, minHeight, maxHeight, stepWidth, jaggedness, hilliness }) {
    const vertices = []
    for (
        let x = 0, lastHeight = random(heightRange[0], heightRange[1]), slopeBias = 0, lastSlopeBias = 0, lastSlope = 0;
        x <= width;
        x += stepWidth
    ) {
        lastSlopeBias = slopeBias
        slopeBias = random(-1, 1) + lastSlopeBias * hilliness
        let height = Math.floor(lastHeight + slopeBias * jaggedness)
        height = clamp(height, minHeight, maxHeight)
        vertices.push([x, height])
        lastHeight = height
    }
    return vertices
}

function generateTerrainObjects({
    vertices,
    count, // Number of objects
    width, // Width of each object, in number of vertices
    bufferWidth = 2, // Number of vertices to leave free before and after objects
    minDistance = 0, // Minimum distance from the left edge of the terrain, in number of vertices
    maxDistance = Infinity, // Maximum distance from the left edge of the terrain, in number of vertices
}) {
    const objects = []
    const availableIndices = Array.from(vertices.keys()).slice(
        minDistance,
        Math.min(maxDistance - bufferWidth, vertices.length - width - bufferWidth)
    )
    for (let n = 0; n < count; n++) {
        const minAvailabilityIndex = bufferWidth
        const maxAvailabilityIndex = availableIndices.length - width - bufferWidth - 1
        const selectedAvailabilityIndex = randomIndex(
            availableIndices.length,
            minAvailabilityIndex,
            maxAvailabilityIndex
        )
        const vertexIndex = availableIndices[selectedAvailabilityIndex]
        const startVertex = vertices[vertexIndex]
        for (let s = 0; s < width; s++) {
            vertices[vertexIndex + s][1] = startVertex[1]
        }
        availableIndices.splice(
            Math.max(0, selectedAvailabilityIndex - width - bufferWidth),
            width * 2 + bufferWidth * 3
        )
        objects.push(startVertex)
    }
    return objects
}

function rasterizeTerrainPath(width, vertices) {
    const terrain = Array.from({ length: width }, () => 0)
    let startVertex = vertices.shift()
    let endVertex = vertices.shift()
    for (let x = 0; x <= width; x++) {
        const slope = (endVertex[1] - startVertex[1]) / (endVertex[0] - startVertex[0])
        const height = startVertex[1] + slope * (x - startVertex[0])
        terrain[x] = height
        if (x === endVertex[0]) {
            startVertex = endVertex
            endVertex = vertices.shift()
        }
        if (endVertex === undefined) {
            break
        }
    }
    return terrain
}
