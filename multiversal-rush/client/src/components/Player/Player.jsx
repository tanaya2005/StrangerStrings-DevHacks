// ============================================================
//  components/Player/Player.jsx
//  Tanaya: WASD + jump + gravity + camera follow
//  Atharva: AABB platform collision, honeycomb tiles, portal detection
//  Varun: emitMove / emitFell multiplayer hooks
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
const BASE_Y = 1;
const FALL_LIMIT = -25; // increased for honeycomb lava check

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

export default function Player({
    emitMove,
    emitFell,
    emitWorldTransition,
    world = 1,
    startPosition = [0, BASE_Y, 0],
    tiles = [],
    onTileTouch = null,
    portals = [],
    onPortalTouch = null,
}) {
    const playerRef = useRef();
    const keys = useKeyboard();
    const { camera } = useThree();

    const velocityY = useRef(0);
    const isGrounded = useRef(true);

    const direction = useRef(new THREE.Vector3());
    const targetCameraPos = useRef(new THREE.Vector3());
    const cameraOffset = useRef(new THREE.Vector3(0, 4, 8));
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

        // ---- 4. Platform collision (AABB) ----
        let hitPlatform = false;
        let snapY = null;

        const playerSize = { x: 1, y: 1 * targetScaleY, z: 1 };
        const playerMin = { x: pos.x - 0.5, y: nextY - playerSize.y / 2, z: pos.z - 0.5 };
        const playerMax = { x: pos.x + 0.5, y: nextY + playerSize.y / 2, z: pos.z + 0.5 };

        const platforms = useStore.getState().platforms;

        for (const pid in platforms) {
            const plat = platforms[pid];
            const pMin = {
                x: plat.position.x - plat.size[0] / 2,
                y: plat.position.y - plat.size[1] / 2,
                z: plat.position.z - plat.size[2] / 2
            };
            const pMax = {
                x: plat.position.x + plat.size[0] / 2,
                y: plat.position.y + plat.size[1] / 2,
                z: plat.position.z + plat.size[2] / 2
            };

            if (checkAABB(playerMin, playerMax, pMin, pMax)) {
                const resolveY = resolveCollisionY(playerMin, playerMax, pMin, pMax, velocityY.current);
                if (resolveY !== null) {
                    hitPlatform = true;
                    snapY = resolveY + playerSize.y / 2;
                    if (plat.type === 'moving' && plat.velocity) {
                        pos.x += plat.velocity.x * delta;
                        pos.y += plat.velocity.y * delta;
                        pos.z += plat.velocity.z * delta;
                    }
                    break;
                }
            }
        }

        // ---- 4.1 Honeycomb tile collision ----
        if (!hitPlatform && tiles && tiles.length > 0) {
            const hexWidth = 1.732;
            const hexDepth = 2;
            const hexHeight = 0.5;

            for (let i = 0; i < tiles.length; i++) {
                const t = tiles[i];
                if (t.status === 'idle' || t.status === 'touched') {
                    const pMin = { x: t.x - hexWidth / 2, y: t.y - hexHeight / 2, z: t.z - hexDepth / 2 };
                    const pMax = { x: t.x + hexWidth / 2, y: t.y + hexHeight / 2, z: t.z + hexDepth / 2 };

                    if (checkAABB(playerMin, playerMax, pMin, pMax)) {
                        const resolveY = resolveCollisionY(playerMin, playerMax, pMin, pMax, velocityY.current);
                        if (resolveY !== null) {
                            hitPlatform = true;
                            snapY = resolveY + playerSize.y / 2;
                            if (t.status === 'idle' && onTileTouch) onTileTouch(t.id);
                            break;
                        }
                    }
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

        // ---- 4.2 Portal collision ----
        if (portals && portals.length > 0) {
            for (let i = 0; i < portals.length; i++) {
                if (checkAABB(playerMin, playerMax, portals[i].min, portals[i].max)) {
                    if (onPortalTouch) onPortalTouch(portals[i].id);
                }
            }
        }

        // ---- Fall detection ----
        if (pos.y < -19.5 && tiles && tiles.length > 0) {
            // Honeycomb lava reset
            pos.set(...startPosition);
            velocityY.current = 0;
            isGrounded.current = true;
        } else if (pos.y < FALL_LIMIT) {
            pos.set(...startPosition);
            velocityY.current = 0;
            isGrounded.current = true;
            emitFell?.();
        }

        // ---- Camera follow ----
        targetCameraPos.current.copy(pos).add(cameraOffset.current);
        camera.position.lerp(targetCameraPos.current, 5.0 * delta);
        camera.lookAt(pos);

        // ---- Emit to multiplayer (throttled 50ms) ----
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
