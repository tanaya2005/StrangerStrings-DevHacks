// ============================================================
//  components/Player/Player.jsx
//  Tanaya: WASD + jump + gravity + camera follow
//  Atharva: AABB platform collision, honeycomb tiles, portal detection
//  Varun: emitMove / emitFell multiplayer hooks
// ============================================================
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
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

const Player = React.forwardRef(({
    emitMove,
    emitFell,
    emitWorldTransition,
    world = 1,
    startPosition = [0, BASE_Y, 0],
    tiles = [],
    onTileTouch = null,
    portals = [],
    onPortalTouch = null,
    onLavaTouch = null,      // Honeycomb: called when player hits lava floor
}, ref) => {
    const playerRef = useRef();
    const keys = useKeyboard();
    const { camera } = useThree();

    // ---- Load chosen avatar from Zustand store ----
    const avatarPath = useStore((s) => s.avatar);
    const { scene } = useGLTF(avatarPath);

    // Optimize model for FPS
    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });
    }, [scene]);

    const velocityY = useRef(0);
    const velocityXZ = useRef(new THREE.Vector3(0, 0, 0));
    const isGrounded = useRef(true);
    const onIce = useRef(false);

    const direction = useRef(new THREE.Vector3());
    const targetCameraPos = useRef(new THREE.Vector3());
    const cameraOffset = useRef(new THREE.Vector3(0, 4, 8));
    const lastEmitRef = useRef(0);
    const controlMultiplier = useRef(1);

    React.useImperativeHandle(ref, () => ({
        mesh: playerRef.current,
        get position() { return playerRef.current?.position; },
        set controlMultiplier(v) { controlMultiplier.current = v; }
    }));

    useFrame((_, delta) => {
        if (!playerRef.current) return;
        const pos = playerRef.current.position;

        const multiplier = controlMultiplier.current;
        controlMultiplier.current = 1; // Reset every frame

        // ---- 1. Movement ----
        direction.current.set(0, 0, 0);
        if (keys.current.w || keys.current.arrowup) direction.current.z -= 1;
        if (keys.current.s || keys.current.arrowdown) direction.current.z += 1;
        if (keys.current.a || keys.current.arrowleft) direction.current.x -= 1;
        if (keys.current.d || keys.current.arrowright) direction.current.x += 1;

        if (direction.current.lengthSq() > 0) {
            direction.current.normalize();
            // Apply control multiplier (e.g., -1 for reverse controls)
            direction.current.multiplyScalar(multiplier);
        }

        // ---- 2. Crouch ----
        const isCrouching = keys.current.shift;
        const currentSpeed = isCrouching ? CROUCH_SPEED : MOVE_SPEED;

        // ---- Ice Physics Mechanics ----
        const damping = onIce.current ? 0.985 : 0.85; // High damping on snow, low on ice
        const accel = onIce.current ? 4.0 : 15.0;     // Slower response on ice (slippery)

        // Momentum Calculation
        const targetVelX = direction.current.x * (currentSpeed * multiplier);
        const targetVelZ = direction.current.z * (currentSpeed * multiplier);

        velocityXZ.current.x = THREE.MathUtils.lerp(velocityXZ.current.x, targetVelX, accel * delta);
        velocityXZ.current.z = THREE.MathUtils.lerp(velocityXZ.current.z, targetVelZ, accel * delta);

        // Slow down when no input
        if (direction.current.lengthSq() === 0) {
            velocityXZ.current.multiplyScalar(damping);
        }

        // Apply scale transition
        const targetScaleY = isCrouching ? 0.6 : 1.2;
        playerRef.current.scale.y = THREE.MathUtils.lerp(playerRef.current.scale.y, targetScaleY, 15 * delta);

        // Apply Horizontal movement
        pos.x += velocityXZ.current.x * delta;
        pos.z += velocityXZ.current.z * delta;

        // ---- Character Rotation ----
        // Rotates the model to vividly face the direction of its movement vector
        if (direction.current.lengthSq() > 0) {
            const targetAngle = Math.atan2(direction.current.x, direction.current.z);
            const targetRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
            playerRef.current.quaternion.slerp(targetRotation, 15 * delta);
        }

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
        let onIceThisFrame = false;

        // Player size is normalized relative to scale 1.2
        const playerSize = { x: 1.2, y: 1.2 * (targetScaleY / 1.2), z: 1.2 };
        const playerMin = { x: pos.x - playerSize.x / 2, y: nextY - playerSize.y / 2, z: pos.z - playerSize.z / 2 };
        const playerMax = { x: pos.x + playerSize.x / 2, y: nextY + playerSize.y / 2, z: pos.z + playerSize.z / 2 };

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

                    if (plat.isSlippery) onIceThisFrame = true;

                    if (plat.type === 'moving' && plat.velocity) {
                        pos.x += plat.velocity.x * delta;
                        pos.y += plat.velocity.y * delta;
                        pos.z += plat.velocity.z * delta;
                    }
                    break;
                }
            }
        }

        onIce.current = onIceThisFrame;

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
        if (pos.y < -18 && tiles && tiles.length > 0) {
            // Honeycomb lava zone → eliminated, not respawn
            onLavaTouch?.();
        } else if (pos.y < FALL_LIMIT) {
            // Standard fall reset (other worlds)
            pos.set(...startPosition);
            velocityY.current = 0;
            velocityXZ.current.set(0, 0, 0); // Clear momentum on fall
            isGrounded.current = true;
            onIce.current = false;
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
        <group ref={playerRef} position={startPosition} scale={[1.2, 1.2, 1.2]}>
            {/* Human Model */}
            <primitive object={scene} />

            {/* Invisible Collider for AABB */}
            <mesh visible={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial />
            </mesh>
        </group>
    );
});

export default Player;
