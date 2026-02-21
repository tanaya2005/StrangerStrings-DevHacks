// client/src/utils/collision.js
export function checkAABB(min1, max1, min2, max2) {
    return (
        min1.x <= max2.x && max1.x >= min2.x &&
        min1.y <= max2.y && max1.y >= min2.y &&
        min1.z <= max2.z && max1.z >= min2.z
    );
}

// Determines if player lands on platform. Returns Y snap value.
export function resolveCollisionY(playerMin, playerMax, platformMin, platformMax, velocityY) {
    // Landing on top of platform
    if (velocityY <= 0 && playerMin.y <= platformMax.y && playerMin.y >= platformMax.y - 1.0) {
        return platformMax.y;
    }
    // Bumping head on ceiling
    if (velocityY > 0 && playerMax.y >= platformMin.y && playerMax.y <= platformMin.y + 0.5) {
        return platformMin.y;
    }
    return null;
}
