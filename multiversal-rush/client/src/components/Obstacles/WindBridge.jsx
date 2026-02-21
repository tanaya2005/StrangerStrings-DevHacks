import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import socket from '../../socket/socket';
import Platform from './Platform';

/**
 * WindBridge Obstacle
 * A bridge obstacle with a staggered platform layout.
 */
export default function WindBridge({ position }) {
    const [bx, by, bz] = position; // [0, 1, -190]

    return (
        <group>
            {/* World 1 "Cyberpunk" Layout - Glacier Aesthetics (No Glitches) */}
            {/* All positions are now absolute world coordinates to fix collision detection */}

            {/* Entrance Row: Staggered Pair (Z: -16 relative) */}
            <Platform position={[bx - 3.5, by, bz - 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
            <Platform position={[bx + 3.5, by, bz - 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* Row 2: Central Platform (Z: -8 relative) - Elevated Jump */}
            <Platform position={[bx, by + 0.6, bz - 8]} scale={[6.5, 0.5, 4]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Row 3: Wide Gap Pair (Z: 0 relative) - Cyberpunk Staggered Feel */}
            <Platform position={[bx - 4.5, by + 1.2, bz]} scale={[3.5, 1, 3.5]} type="static" color="#ffffff" isSlippery={true} />
            <Platform position={[bx + 4.5, by + 1.2, bz]} scale={[3.5, 1, 3.5]} type="static" color="#ffffff" isSlippery={true} />

            {/* Row 4: Far Central Tile (Z: 8 relative) - Descent */}
            <Platform position={[bx, by + 0.6, bz + 8]} scale={[6.5, 0.5, 4]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Exit Row: Final Pair (Z: 16 relative) */}
            <Platform position={[bx - 3.5, by, bz + 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
            <Platform position={[bx + 3.5, by, bz + 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
        </group>
    );
}
