'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import Card3D from './Card3D';

interface CardData {
  suit: string;
  rank: string;
  id: string;
}

interface PlayedCardData {
  playerId: string;
  card: CardData;
  position: number;
}

interface PlayerData {
  id: string;
  name: string;
  team: number;
  position: number;
  hand: CardData[];
  isBot: boolean;
}

interface Table3DProps {
  myPlayer: PlayerData;
  players: PlayerData[];
  cardsPlayed: PlayedCardData[];
  isMyTurn: boolean;
  canPlay: boolean;
  onPlayCard: (index: number) => void;
  sessionId: string;
}

// Player positions around the table (x, z coordinates)
// 0=South (bottom/player), 1=West (left), 2=North (top), 3=East (right)
const PLAYER_POSITIONS: Record<number, { hand: [number, number, number]; played: [number, number, number]; rotation: [number, number, number] }> = {
  0: { hand: [0, 0.1, 3.5], played: [0, 0.15, 1.2], rotation: [0, 0, 0] },
  1: { hand: [-3.5, 0.1, 0], played: [-1.2, 0.15, 0], rotation: [0, Math.PI / 2, 0] },
  2: { hand: [0, 0.1, -3.5], played: [0, 0.15, -1.2], rotation: [0, Math.PI, 0] },
  3: { hand: [3.5, 0.1, 0], played: [1.2, 0.15, 0], rotation: [0, -Math.PI / 2, 0] },
};

function TableSurface() {
  return (
    <group>
      {/* Felt surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[4.5, 64]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Table rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[4.3, 4.8, 64]} />
        <meshStandardMaterial color="#5c2a0a" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Center circle marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.8, 1.85, 64]} />
        <meshBasicMaterial color="#2d7a3f" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Scene({
  myPlayer,
  players,
  cardsPlayed,
  isMyTurn,
  canPlay,
  onPlayCard,
  sessionId,
}: Table3DProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#fff5e0" />

      {/* Table */}
      <TableSurface />

      {/* Contact shadows */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />

      {/* Player hands */}
      {players.map((player) => {
        const posConfig = PLAYER_POSITIONS[player.position];
        const isMe = player.id === sessionId;

        if (isMe) {
          // Show player's cards face up, spread in a fan
          return player.hand.map((card, i) => {
            const spread = (i - 1) * 0.85;
            const pos: [number, number, number] = [
              posConfig.hand[0] + spread,
              posConfig.hand[1] + i * 0.01,
              posConfig.hand[2],
            ];

            return (
              <Card3D
                key={card.id}
                suit={card.suit}
                rank={card.rank}
                position={pos}
                rotation={[-Math.PI / 6, 0, (i - 1) * 0.05]}
                onClick={() => onPlayCard(i)}
                disabled={!isMyTurn || !canPlay}
                highlighted={isMyTurn && canPlay}
                scale={1.0}
              />
            );
          });
        } else {
          // Show other players' cards face down
          const cardCount = player.hand.length || (3 - cardsPlayed.filter(c => c.position === player.position).length);
          return Array.from({ length: Math.max(0, cardCount) }).map((_, i) => {
            const spread = (i - 1) * 0.4;
            let pos: [number, number, number];

            if (player.position === 1) {
              pos = [posConfig.hand[0], posConfig.hand[1] + i * 0.01, posConfig.hand[2] + spread];
            } else if (player.position === 3) {
              pos = [posConfig.hand[0], posConfig.hand[1] + i * 0.01, posConfig.hand[2] + spread];
            } else {
              pos = [posConfig.hand[0] + spread, posConfig.hand[1] + i * 0.01, posConfig.hand[2]];
            }

            return (
              <Card3D
                key={`${player.id}-${i}`}
                suit="paus"
                rank="A"
                faceDown
                position={pos}
                rotation={posConfig.rotation}
                scale={0.8}
              />
            );
          });
        }
      })}

      {/* Played cards in center */}
      {cardsPlayed.map((pc) => {
        const posConfig = PLAYER_POSITIONS[pc.position];
        return (
          <Card3D
            key={`played-${pc.card.id}`}
            suit={pc.card.suit}
            rank={pc.card.rank}
            position={posConfig.played}
            rotation={[-Math.PI / 2, 0, (Math.random() - 0.5) * 0.3]}
            animateFrom={posConfig.hand}
            scale={0.9}
          />
        );
      })}

      {/* Camera controls - limited */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Table3D(props: Table3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [0, 7, 5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
