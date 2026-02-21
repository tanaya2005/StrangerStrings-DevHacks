// ============================================================
//  utils/collision.js — AABB collision helpers
//  Used by Member 1's obstacle/player code.
//  Member 2 puts it here so it's in the utils folder.
// ============================================================

/**
 * Axis-Aligned Bounding Box collision check.
 * @param {{x,y,z}} posA  - center of object A
 * @param {{w,h,d}} sizeA - half-extents of object A (width, height, depth)
 * @param {{x,y,z}} posB  - center of object B
 * @param {{w,h,d}} sizeB - half-extents of object B
 * @returns {boolean} true if the two boxes overlap
 */
export function aabbCollision(posA, sizeA, posB, sizeB) {
    return (
        Math.abs(posA.x - posB.x) < sizeA.w + sizeB.w &&
        Math.abs(posA.y - posB.y) < sizeA.h + sizeB.h &&
        Math.abs(posA.z - posB.z) < sizeA.d + sizeB.d
    );
}

/**
 * Check if a point is inside an AABB.
 * @param {{x,y,z}} point
 * @param {{x,y,z}} boxCenter
 * @param {{w,h,d}} boxHalfSize
 * @returns {boolean}
 */
export function pointInBox(point, boxCenter, boxHalfSize) {
    return (
        Math.abs(point.x - boxCenter.x) <= boxHalfSize.w &&
        Math.abs(point.y - boxCenter.y) <= boxHalfSize.h &&
        Math.abs(point.z - boxCenter.z) <= boxHalfSize.d
    );
}

/**
 * Resolve collision by pushing posA outside posB.
 * Returns corrected position for A.
 * @param {{x,y,z}} posA
 * @param {{w,h,d}} sizeA
 * @param {{x,y,z}} posB
 * @param {{w,h,d}} sizeB
 * @returns {{x,y,z}} corrected position
 */
export function resolveCollision(posA, sizeA, posB, sizeB) {
    const overlapX = sizeA.w + sizeB.w - Math.abs(posA.x - posB.x);
    const overlapY = sizeA.h + sizeB.h - Math.abs(posA.y - posB.y);
    const overlapZ = sizeA.d + sizeB.d - Math.abs(posA.z - posB.z);

    // Push out along the smallest overlap axis
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
