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

// ============================================================
// Below are helpers added by archit2 for Cryo Void
// ============================================================

export function aabbCollision(posA, sizeA, posB, sizeB) {
    return (
        Math.abs(posA.x - posB.x) < sizeA.w + sizeB.w &&
        Math.abs(posA.y - posB.y) < sizeA.h + sizeB.h &&
        Math.abs(posA.z - posB.z) < sizeA.d + sizeB.d
    );
}

export function pointInBox(point, boxCenter, boxHalfSize) {
    return (
        Math.abs(point.x - boxCenter.x) <= boxHalfSize.w &&
        Math.abs(point.y - boxCenter.y) <= boxHalfSize.h &&
        Math.abs(point.z - boxCenter.z) <= boxHalfSize.d
    );
}

export function resolveCollision(posA, sizeA, posB, sizeB) {
    const overlapX = sizeA.w + sizeB.w - Math.abs(posA.x - posB.x);
    const overlapY = sizeA.h + sizeB.h - Math.abs(posA.y - posB.y);
    const overlapZ = sizeA.d + sizeB.d - Math.abs(posA.z - posB.z);

    const corrected = { ...posA };

    if (overlapX < overlapY && overlapX < overlapZ) {
        corrected.x += overlapX * Math.sign(posA.x - posB.x);
    } else if (overlapY < overlapX && overlapY < overlapZ) {
        corrected.y += overlapY * Math.sign(posA.y - posB.y);
    } else {
        corrected.z += overlapZ * Math.sign(posA.z - posB.z);
    }

    return corrected;
}
