// ============================================================
//  components/Player/Player.jsx
//  Base: Tanaya (Task 1) — WASD + jump + gravity + camera follow
//  Integration: Varun (Task 2) — emitMove / emitFell / emitWorldTransition
// ============================================================
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/store';
import { checkAABB, resolveCollisionY } from '../../utils/collision';

const MOVE_SPEED = 10;
const CROUCH_SPEED = 5;
const JUMP_POWER = 15;
const GRAVITY = -30;
const BASE_Y = 1;   // ground level y
const FALL_LIMIT = -10; // fall off world below this y

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
 */
export default function Player({
    emitMove,
    emitFell,
    emitWorldTransition,
    world = 1,
    startPosition = [0, BASE_Y, 0],
}) {
    const playerRef = useRef();
    const keys = useKeyboard();
    const { camera } = useThree();

    // Physics refs (Tanaya)
    const velocityY = useRef(0);
    const isGrounded = useRef(true);

    // Reusable vectors — avoid GC pressure during game loop
    const direction = useRef(new THREE.Vector3());
    const targetCameraPos = useRef(new THREE.Vector3());
    const cameraOffset = useRef(new THREE.Vector3(0, 4, 8));

    // Multiplayer emit throttle (Varun)
    const lastEmitRef = useRef(0);

    useFrame((_, delta) => {
        if (!playerRef.current) return;
        const pos = playerRef.current.position;

        // ---- 1. Movement ----
        direction.current.set(0, 0, 0);
        if (keys.current.w || keys.current.arrowup) direction.current.z -= 1;
        if (keys.current.s || keys.current.arrowdown) direction.current.z += 1;
        if (keys.current.a || keys.current.arrowleft) direction.current.x -= 1;
        if (keys.current.d || keys.current.arrowright) direction.current.x += 1;
        if (direction.current.lengthSq() > 0) direction.current.normalize();

        // ---- 2. Crouch ----
        const isCrouching = keys.current.shift;
        const currentSpeed = isCrouching ? CROUCH_SPEED : MOVE_SPEED;
        const targetScaleY = isCrouching ? 0.5 : 1.0;
        playerRef.current.scale.y = THREE.MathUtils.lerp(playerRef.current.scale.y, targetScaleY, 15 * delta);

        pos.addScaledVector(direction.current, currentSpeed * delta);

        // ---- 3. Jump & gravity ----
        if (keys.current[' '] && isGrounded.current && !isCrouching) {
            velocityY.current = JUMP_POWER;
            isGrounded.current = false;
        }

        velocityY.current += GRAVITY * delta;
        const nextY = pos.y + velocityY.current * delta;

        // ---- 4. Platform Collision (AABB) ----
        let hitPlatform = false;
        let snapY = null;

        const playerSize = { x: 1, y: 1 * targetScaleY, z: 1 };
        const playerMin = { x: pos.x - playerSize.x / 2, y: nextY - playerSize.y / 2, z: pos.z - playerSize.z / 2 };
        const playerMax = { x: pos.x + playerSize.x / 2, y: nextY + playerSize.y / 2, z: pos.z + playerSize.z / 2 };

        const platforms = useStore.getState().platforms;

        for (const pid in platforms) {
            const plat = platforms[pid];
            const pMin = { x: plat.position.x - plat.size[0] / 2, y: plat.position.y - plat.size[1] / 2, z: plat.position.z - plat.size[2] / 2 };
            const pMax = { x: plat.position.x + plat.size[0] / 2, y: plat.position.y + plat.size[1] / 2, z: plat.position.z + plat.size[2] / 2 };

            if (checkAABB(playerMin, playerMax, pMin, pMax)) {
                // We have an intersection, check Y resolution
                const resolveY = resolveCollisionY(playerMin, playerMax, pMin, pMax, velocityY.current);
                if (resolveY !== null) {
                    hitPlatform = true;
                    // Snap the player center upwards
                    snapY = resolveY + playerSize.y / 2;

                    // Moving platforms pull player along
                    if (plat.type === 'moving' && plat.velocity) {
                        pos.x += plat.velocity.x * delta;
                        pos.y += plat.velocity.y * delta;
                        pos.z += plat.velocity.z * delta;
                    }
                    break;
                }
            }
        }

        if (hitPlatform && snapY !== null) {
            pos.y = snapY;
            velocityY.current = 0;
            isGrounded.current = true;
        } else {
            pos.y = nextY;
            isGrounded.current = false;
        }

        // ---- Fall detection (Varun) ----
        if (pos.y < FALL_LIMIT) {
            pos.set(...startPosition);
            velocityY.current = 0;
            isGrounded.current = true;
            emitFell?.();
        }

        // ---- 4. Camera follow (Tanaya) ----
        targetCameraPos.current.copy(pos).add(cameraOffset.current);
        camera.position.lerp(targetCameraPos.current, 5.0 * delta);
        camera.lookAt(pos);

        // ---- 5. Emit position to multiplayer (Varun, throttled 50ms) ----
        const now = Date.now();
        if (now - lastEmitRef.current > 50) {
            lastEmitRef.current = now;
            emitMove?.({
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: { y: playerRef.current.rotation.y },
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
}
