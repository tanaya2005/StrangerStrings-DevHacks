// ============================================================
//  components/Player/Player.jsx — STUB
//  Member 1 implements the full 3D player here.
//  It receives emitMove/emitWorldTransition/emitFell as props
//  from Game.jsx (via World1/World2).
// ============================================================
import React from "react";

/**
 * Props (passed from World1/World2 by Game.jsx):
 *   emitMove({ position, rotation, world }) — call every frame
 *   emitFell()                              — call on fall
 *   emitWorldTransition(newWorld)           — call on portal
 */
export default function Player({ emitMove, emitFell, emitWorldTransition }) {
    // Member 1: implement WASD + jump + gravity here using useFrame
    return (
        <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00ffe0" emissive="#00ffe0" emissiveIntensity={0.2} />
        </mesh>
    );
}
