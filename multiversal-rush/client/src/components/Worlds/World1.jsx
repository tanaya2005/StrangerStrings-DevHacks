// ============================================================
//  components/Worlds/World1.jsx — STUB (Cyberverse)
//  Member 1 implements the full World 1 here.
//  Props: emitMove, emitWorldTransition, emitFell
// ============================================================
import React from "react";

export default function World1({ emitMove, emitWorldTransition, emitFell }) {
    return (
        <>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#0a1a2f" />
            </mesh>
            {/* Member 1: Add Player, obstacles, portal trigger here */}
        </>
    );
}
