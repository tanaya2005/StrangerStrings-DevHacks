// ============================================================
//  components/Worlds/World2.jsx — STUB (Lava Hell)
//  Member 1 implements the full World 2 here.
//  Props: emitMove, emitFinished, emitFell
// ============================================================
import React from "react";

export default function World2({ emitMove, emitFinished, emitFell }) {
    return (
        <>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#2a0a00" />
            </mesh>
            {/* Member 1: Add Player, lava obstacles, final portal here */}
        </>
    );
}
