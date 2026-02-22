// ============================================================
//  components/Worlds/Honeycomb.jsx — Honeycomb Fall World
//  Atharva: hex grid that drops tiles on contact
//  Varun: fall below lava = ELIMINATED (not respawn)
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import Player from '../Player/Player';

function HexTile({ position, status }) {
    if (status === 'dropped') return null;

    let color = '#00ffff'; // cyan idle
    if (status === 'touched') color = '#ff4500'; // orange-red warning

    return (
        <mesh position={position} rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[1, 1, 0.5, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
    );
}

export default function Honeycomb({ emitMove, emitWorldTransition, emitFell, emitEliminated, emitAchievement, hidePlayer = false }) {
    const [tiles, setTiles] = useState([]);
    const [eliminated, setEliminated] = useState(false);
    const eliminatedRef = useRef(false);  // prevent double-fire

    useEffect(() => {
        const generatedTiles = [];
        const rows = 10;
        const cols = 10;
        const radius = 1;

        const xOffset = Math.sqrt(3) * radius;
        const zOffset = 1.5 * radius;

        const layers = [10, 5, 0];

        layers.forEach((yLevel, levelIdx) => {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * xOffset + (r % 2 !== 0 ? xOffset / 2 : 0);
                    const z = r * zOffset;

                    generatedTiles.push({
                        id: `hex-${levelIdx}-${r}-${c}`,
                        x: x - (cols * xOffset) / 2,
                        y: yLevel,
                        z: z - (rows * zOffset) / 2,
                        status: 'idle'
                    });
                }
            }
        });

        setTiles(generatedTiles);
    }, []);

    const handleTileTouch = (id) => {
        if (hidePlayer) return; // Spectators don't trigger tile drops
        setTiles((prev) => {
            const newTiles = [...prev];
            const tileIndex = newTiles.findIndex(t => t.id === id);

            if (tileIndex === -1 || newTiles[tileIndex].status !== 'idle') {
                return prev;
            }

            newTiles[tileIndex] = { ...newTiles[tileIndex], status: 'touched' };

            setTimeout(() => {
                setTiles((currTiles) => {
                    const current = [...currTiles];
                    const idx = current.findIndex(t => t.id === id);
                    if (idx !== -1) {
                        current[idx] = { ...current[idx], status: 'dropped' };
                    }
                    return current;
                });
            }, 800);

            return newTiles;
        });
    };

    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

            {tiles.map((t) => (
                <HexTile key={t.id} position={[t.x, t.y, t.z]} status={t.status} />
            ))}

            {/* Stop rendering player once eliminated */}
            {!eliminated && !hidePlayer && (
                <Player
                    emitMove={emitMove}
                    emitFell={emitFell}
                    emitWorldTransition={emitWorldTransition}
                    emitAchievement={emitAchievement}
                    world={3}
                    startPosition={[0, 12, 0]}
                    tiles={tiles}
                    onTileTouch={handleTileTouch}
                    onLavaTouch={() => {
                        if (eliminatedRef.current) return;
                        eliminatedRef.current = true;
                        setEliminated(true);
                        emitEliminated?.();
                    }}
                />
            )}

            {/* Lava floor */}
            <mesh position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="red" emissive="orange" emissiveIntensity={0.6} />
            </mesh>
        </>
    );
}
