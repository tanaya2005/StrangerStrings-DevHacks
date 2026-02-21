// ============================================================
//  components/Player/Player.jsx
//  Base: Tanaya (Task 1) — WASD + jump + gravity + camera follow
//  Integration: Varun (Task 2) — emitMove / emitFell / emitWorldTransition
// ============================================================
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { aabbCollision } from '../../utils/collision';

const MOVE_SPEED = 10;
const CROUCH_SPEED = 5;
const JUMP_POWER = 12;
const GRAVITY = -30;
const FALL_LIMIT = -15;

// ---- Keyboard hook (Tanaya's — no re-renders) ----
function useKeyboard() {
    const keyMap = useRef({
        w: false, a: false, s: false, d: false,
        arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
        ' ': false, shift: false,
    });

    useEffect(() => {
        const handler = (e) => {
            const key = e.key.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(keyMap.current, key)) {
                if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                    e.preventDefault();
                }
                keyMap.current[key] = e.type === 'keydown';
            }
        };
        document.addEventListener('keydown', handler, { passive: false });
        document.addEventListener('keyup', handler);
        return () => {
            document.removeEventListener('keydown', handler);
            document.removeEventListener('keyup', handler);
        };
    }, []);

    return keyMap;
}

/**
 * Props (provided by World1 / World2 via Game.jsx):
 *   emitMove({ position, rotation, world }) — broadcast position every frame
 *   emitFell()                              — called when player falls off
 *   emitWorldTransition(newWorld)           — called on portal trigger
 *   world {number}                          — current world (1 or 2)
 *   startPosition {[x,y,z]}                — spawn point
 *   platforms {Array} - [{ pos, size, isSlippery }] for ground collision
 */
export default React.forwardRef(function Player({
    emitMove,
    emitFell,
    emitWorldTransition,
    world = 1,
    startPosition = [0, 1, 0],
    platforms = [],
}, ref) {
    const speedMultiplier = useRef(1.0);
    const playerRef = useRef();

    // Sync external ref if provided
    React.useImperativeHandle(ref, () => ({
        mesh: playerRef.current,
        get velocityXZ() { return velocityXZ.current; },
        get position() { return playerRef.current?.position; },
        get speedMultiplier() { return speedMultiplier.current; },
        set speedMultiplier(v) { speedMultiplier.current = v; }
    }));

    const keys = useKeyboard();
    const { camera } = useThree();

    // Physics refs
    const velocityY = useRef(0);
    const velocityXZ = useRef(new THREE.Vector3());
    const isGrounded = useRef(false);
    const currentOnIce = useRef(false);

    // Reusable vectors — avoid GC pressure during game loop
    const direction = useRef(new THREE.Vector3());
    const targetCameraPos = useRef(new THREE.Vector3());
    const cameraOffset = useRef(new THREE.Vector3(0, 4, 8));

    // Multiplayer emit throttle (Varun)
    const lastEmitRef = useRef(0);

    useFrame((_, delta) => {
        if (!playerRef.current) return;

        // Reset multiplier every frame — external zones MUST set it every frame
        const currentMultiplier = speedMultiplier.current;
        speedMultiplier.current = 1.0;

        const pos = playerRef.current.position;

        // ---- 1. Movement & Momentum ----
        direction.current.set(0, 0, 0);
        if (keys.current.w || keys.current.arrowup) direction.current.z -= 1;
        if (keys.current.s || keys.current.arrowdown) direction.current.z += 1;
        if (keys.current.a || keys.current.arrowleft) direction.current.x -= 1;
        if (keys.current.d || keys.current.arrowright) direction.current.x += 1;
        if (direction.current.lengthSq() > 0) direction.current.normalize();

        const isCrouching = keys.current.shift;
        const baseSpeed = isCrouching ? CROUCH_SPEED : MOVE_SPEED;
        const speed = baseSpeed * currentMultiplier;

        // Apply slippery physics
        const damping = currentOnIce.current ? 0.98 : 0.85; // Less damping on ice = slippery
        const accel = currentOnIce.current ? 5.0 : 15.0; // Slower acceleration on ice

        // Lerp horizontal velocity
        const targetVelX = direction.current.x * speed;
        const targetVelZ = direction.current.z * speed;
        velocityXZ.current.x = THREE.MathUtils.lerp(velocityXZ.current.x, targetVelX, accel * delta);
        velocityXZ.current.z = THREE.MathUtils.lerp(velocityXZ.current.z, targetVelZ, accel * delta);

        // Damping when no keys pressed
        if (direction.current.lengthSq() === 0) {
            velocityXZ.current.multiplyScalar(damping);
        }

        pos.x += velocityXZ.current.x * delta;
        pos.z += velocityXZ.current.z * delta;

        // ---- 2. Crouch Scale ----
        const targetScaleY = isCrouching ? 0.5 : 1.0;
        playerRef.current.scale.y = THREE.MathUtils.lerp(playerRef.current.scale.y, targetScaleY, 10 * delta);

        // ---- 3. Gravity & Jumping ----
        if (keys.current[' '] && isGrounded.current && !isCrouching) {
            velocityY.current = JUMP_POWER;
            isGrounded.current = false;
        }
        velocityY.current += GRAVITY * delta;
        pos.y += velocityY.current * delta;

        // ---- 4. Collision Detection (AABB) ----
        let groundedThisFrame = false;
        let onIceThisFrame = false;

        // Player AABB (0.5 half-extents for size 1)
        const pSize = { w: 0.5, h: 0.5, d: 0.5 };

        platforms.forEach((plat) => {
            const platSize = { w: plat.size[0] / 2, h: plat.size[1] / 2, d: plat.size[2] / 2 };
            const platPos = { x: plat.pos[0], y: plat.pos[1], z: plat.pos[2] };

            // For tilted slides, we use a simplified height calculation
            if (plat.isSlide && plat.rot) {
                const zDist = Math.abs(pos.z - platPos.z);
                const xDist = Math.abs(pos.x - platPos.x);

                if (zDist < platSize.d && xDist < platSize.w) {
                    // Calculate Y based on Z position and rotation (assuming X-axis rotation)
                    // y = y_center + (z - z_center) * tan(angle)
                    // Note: -Math.sin for downward tilt toward -Z
                    const angle = plat.rot[0];
                    const localZ = pos.z - platPos.z;
                    const targetY = platPos.y - Math.tan(angle) * localZ + platSize.h;

                    if (velocityY.current <= 0 && pos.y >= targetY - 0.5) {
                        pos.y = targetY + pSize.h;
                        velocityY.current = 0;
                        groundedThisFrame = true;
                        onIceThisFrame = true;

                        // "No artificial speed boost" — just gravity + momentum
                        // But we help physics by adding a small "pull" to simulate gravity on a slope
                        velocityXZ.current.z -= Math.sin(angle) * 15 * delta;
                    }
                }
            } else if (aabbCollision({ x: pos.x, y: pos.y, z: pos.z }, pSize, platPos, platSize)) {
                // Regular AABB check
                if (velocityY.current <= 0 && pos.y >= platPos.y + platSize.h - 0.2) {
                    pos.y = platPos.y + platSize.h + pSize.h;
                    velocityY.current = 0;
                    groundedThisFrame = true;
                    if (plat.isSlippery) onIceThisFrame = true;
                }
            }
        });

        isGrounded.current = groundedThisFrame;
        currentOnIce.current = onIceThisFrame;

        // Fall limit
        if (pos.y < FALL_LIMIT) {
            pos.set(...startPosition);
            velocityY.current = 0;
            velocityXZ.current.set(0, 0, 0);
            isGrounded.current = false;
            emitFell?.();
        }

        // ---- 5. Camera & Emit ----
        targetCameraPos.current.copy(pos).add(cameraOffset.current);
        camera.position.lerp(targetCameraPos.current, 5.0 * delta);
        camera.lookAt(pos);

        const now = Date.now();
        if (now - lastEmitRef.current > 50) {
            lastEmitRef.current = now;

            const position = { x: pos.x, y: pos.y, z: pos.z };
            const rotation = { y: playerRef.current.rotation.y };

            // Update local store so obstacles can see us
            useStore.getState().setMyPosition(position);
            useStore.getState().setMyRotation(rotation);

            emitMove?.({
                position,
                rotation,
                world,
            });
        }
    });

    return (
        <mesh ref={playerRef} position={startPosition} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.15} />
        </mesh>
    );
});
