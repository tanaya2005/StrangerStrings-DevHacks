// ============================================================
//  components/Worlds/Honeycomb.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import Player from '../Player/Player';

// Step 1: HexTile Component
function HexTile({ position, status }) {
    if (status === 'dropped') return null;

    let color = '#00ffff'; // cyan
    if (status === 'touched') color = '#ff4500'; // red/orange

    return (
        <mesh position={position} rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[1, 1, 0.5, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
    );
}

// Step 2, 3 & 4: Honeycomb Component
export default function Honeycomb({ emitMove, emitWorldTransition, emitFell }) {
    const [tiles, setTiles] = useState([]);

    useEffect(() => {
        const generatedTiles = [];
        const rows = 10;
        const cols = 10;
        const radius = 1;

        /**
         * Hexagon offset math for an interlocking honeycomb (pointy-topped hex grid).
         * For a hexagon of radius R rotated to be pointy-topped (flat sides on X axis):
         * - The horizontal distance (X) between centers of consecutive hexes in a row is sqrt(3) * R.
         * - The vertical distance (Z) between centers of consecutive rows is 1.5 * R.
         */
        const xOffset = Math.sqrt(3) * radius;
        const zOffset = 1.5 * radius;

        const layers = [10, 5, 0];

        layers.forEach((yLevel, levelIdx) => {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    /**
                     * To make the grid interlock seamlessly, every odd row is staggered 
                     * exactly by half of the horizontal distance (xOffset / 2) on the X-axis.
                     */
                    const x = c * xOffset + (r % 2 !== 0 ? xOffset / 2 : 0);
                    const z = r * zOffset;

                    generatedTiles.push({
                        id: `hex-${levelIdx}-${r}-${c}`,
                        x: x - (cols * xOffset) / 2, // Centering logic
                        y: yLevel,
                        z: z - (rows * zOffset) / 2,
                        status: 'idle'
                    });
                }
            }
        });

        setTiles(generatedTiles);
    }, []);

    // Step 3: Central state management for tile drops
    const handleTileTouch = (id) => {
        setTiles((prev) => {
            const newTiles = [...prev];
            const tileIndex = newTiles.findIndex(t => t.id === id);

            // If already touched/dropped, do nothing
            if (tileIndex === -1 || newTiles[tileIndex].status !== 'idle') {
                return prev;
            }

            // Update to touched so we can show the warning color visually
            newTiles[tileIndex] = { ...newTiles[tileIndex], status: 'touched' };

            /**
             * State-driven timeout logic:
             * Once a tile is stepped on ('touched'), it triggers a timer.
             * After exactly 800ms, the state is updated to 'dropped'.
             * Because React re-renders based on state, the HexTile component will receive 
             * the 'dropped' status and unmount (return null).
             * Additionally, the Player's AABB collision logic only checks for 'idle' 
             * or 'touched' tiles, meaning 'dropped' tiles will no longer be solid.
             * Using central state management allows easy broadcasting of events for multiplayer sync.
             */
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

            {/* Grid of Hexagon Tiles */}
            {tiles.map((t) => (
                <HexTile key={t.id} position={[t.x, t.y, t.z]} status={t.status} />
            ))}

            {/* Player Component with reference to tiles and touch callback */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={emitWorldTransition}
                world={3}
                startPosition={[0, 5, 0]}
                tiles={tiles}
                onTileTouch={handleTileTouch}
            />

            {/* Step 4: Lethal Lava Hell Floor */}
            <mesh position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="red" emissive="orange" />
            </mesh>
        </>
    );
}
