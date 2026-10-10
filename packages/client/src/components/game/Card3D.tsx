'use client';

import { useRef, useState, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface Card3DProps {
  suit: string;
  rank: string;
  faceDown?: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  animateFrom?: [number, number, number];
  scale?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  copas: '\u2665',
  espadas: '\u2660',
  ouros: '\u2666',
  paus: '\u2663',
};

const SUIT_COLORS: Record<string, string> = {
  copas: '#ef4444',
  espadas: '#1f2937',
  ouros: '#ef4444',
  paus: '#1f2937',
};

function isManilha(rank: string, suit: string): boolean {
  return (
    (rank === '4' && suit === 'paus') ||
    (rank === '7' && suit === 'copas') ||
    (rank === 'A' && suit === 'espadas') ||
    (rank === '7' && suit === 'ouros')
  );
}

// AnimatedGroup for react-spring
const AnimatedGroup = animated.group as any;

export default function Card3D({
  suit,
  rank,
  faceDown = false,
  position,
  rotation = [0, 0, 0],
  onClick,
  disabled = false,
  highlighted = false,
  animateFrom,
  scale = 1,
}: Card3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Animation spring
  const { pos, rot, scl } = useSpring({
    pos: position,
    rot: faceDown ? [rotation[0], Math.PI, rotation[2]] : rotation,
    scl: hovered && !disabled ? scale * 1.1 : scale,
    from: animateFrom
      ? { pos: animateFrom, rot: [0, Math.PI, 0], scl: 0.5 }
      : undefined,
    config: { mass: 1, tension: 200, friction: 20 },
  });

  const cardWidth = 0.7;
  const cardHeight = 1.0;
  const cardDepth = 0.02;

  const manilha = isManilha(rank, suit);
  const suitColor = SUIT_COLORS[suit] || '#1f2937';

  return (
    <AnimatedGroup
      ref={meshRef}
      position={pos}
      rotation={rot}
      scale={scl}
      onClick={!disabled ? onClick : undefined}
      onPointerOver={() => !disabled && setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Card body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cardWidth, cardHeight, cardDepth]} />
        <meshStandardMaterial color={faceDown ? '#1e3a5f' : '#ffffff'} />
      </mesh>

      {/* Front face - card content */}
      {!faceDown && (
        <group position={[0, 0, cardDepth / 2 + 0.001]}>
          {/* Rank text */}
          <Text
            position={[-cardWidth / 2 + 0.12, cardHeight / 2 - 0.12, 0]}
            fontSize={0.15}
            color={suitColor}
            font={undefined}
            anchorX="center"
            anchorY="middle"
          >
            {rank}
          </Text>

          {/* Center suit symbol */}
          <Text
            position={[0, 0, 0]}
            fontSize={0.35}
            color={suitColor}
            font={undefined}
            anchorX="center"
            anchorY="middle"
          >
            {SUIT_SYMBOLS[suit]}
          </Text>

          {/* Small suit under rank */}
          <Text
            position={[-cardWidth / 2 + 0.12, cardHeight / 2 - 0.28, 0]}
            fontSize={0.1}
            color={suitColor}
            font={undefined}
            anchorX="center"
            anchorY="middle"
          >
            {SUIT_SYMBOLS[suit]}
          </Text>

          {/* Manilha indicator */}
          {manilha && (
            <mesh position={[cardWidth / 2 - 0.08, cardHeight / 2 - 0.08, 0]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color="#eab308" />
            </mesh>
          )}

          {/* Highlight border */}
          {highlighted && (
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[cardWidth + 0.04, cardHeight + 0.04]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
            </mesh>
          )}
        </group>
      )}

      {/* Back face - pattern */}
      {faceDown && (
        <group position={[0, 0, cardDepth / 2 + 0.001]} rotation={[0, Math.PI, 0]}>
          {/* Border */}
          <mesh>
            <planeGeometry args={[cardWidth - 0.06, cardHeight - 0.06]} />
            <meshBasicMaterial color="#2563eb" />
          </mesh>
          {/* Inner pattern */}
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[cardWidth - 0.12, cardHeight - 0.12]} />
            <meshBasicMaterial color="#1e40af" />
          </mesh>
          {/* T for Truco */}
          <Text
            position={[0, 0, 0.002]}
            fontSize={0.3}
            color="#3b82f680"
            font={undefined}
            anchorX="center"
            anchorY="middle"
          >
            T
          </Text>
        </group>
      )}

      {/* Card shadow */}
      <mesh position={[0.02, -0.02, -cardDepth]} receiveShadow>
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </AnimatedGroup>
  );
}
