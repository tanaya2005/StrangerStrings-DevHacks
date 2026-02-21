// client/src/utils/collision.js
export function checkAABB(min1, max1, min2, max2) {
    return (
        min1.x <= max2.x && max1.x >= min2.x &&
        min1.y <= max2.y && max1.y >= min2.y &&
        min1.z <= max2.z && max1.z >= min2.z
    );
}

// Determines if player lands on platform. Resolves player's Y snap value.
export function resolveCollisionY(playerMin, playerMax, platformMin, platformMax, velocityY) {
    // A lenient threshold lets player snap to platform even if slightly penetrating
    if (velocityY <= 0 && playerMin.y <= platformMax.y && playerMin.y >= platformMax.y - 1.0) { // A bit more leeway for high fall speed
        // We stand ON the platform
        return platformMax.y;
    }

    // Bump head on ceiling (jumping up)
    if (velocityY > 0 && playerMax.y >= platformMin.y && playerMax.y <= platformMin.y + 0.5) {
        return platformMin.y;
    }

    return null;
}
