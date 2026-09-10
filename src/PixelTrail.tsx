// Adapted from React Bits PixelTrail by David Haz. See REACT-BITS-LICENSE.md.
/* eslint-disable react/no-unknown-property */
// Three.js textures and shader uniforms are mutable GPU resources, updated inside effects.
/* eslint-disable react/react-compiler */
import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { shaderMaterial, useTrailTexture } from '@react-three/drei';
import * as THREE from 'three';

import './PixelTrail.css';

type PixelTrailProps = {
  gridSize?: number; trailSize?: number; maxAge?: number; interpolate?: number;
  easingFunction?: (x: number) => number; color?: string; className?: string;
  gooeyFilter?: { id: string; strength: number };
};
type SceneProps = Required<Pick<PixelTrailProps, 'gridSize' | 'trailSize' | 'maxAge' | 'interpolate' | 'easingFunction'>> & { pixelColor: string };

const GooeyFilter = ({ id = 'goo-filter', strength = 10 }: { id?: string; strength?: number }) => {
  return (
    <svg className="goo-filter-container" aria-hidden="true" width="0" height="0">
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={strength} result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
};

const DotMaterial = shaderMaterial(
  {
    resolution: new THREE.Vector2(),
    mouseTrail: null,
    gridSize: 100,
    pixelColor: new THREE.Color('#ffffff')
  },
  `
    varying vec2 vUv;
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  `
    uniform vec2 resolution;
    uniform sampler2D mouseTrail;
    uniform float gridSize;
    uniform vec3 pixelColor;

    vec2 coverUv(vec2 uv) {
      vec2 s = resolution.xy / max(resolution.x, resolution.y);
      vec2 newUv = (uv - 0.5) * s + 0.5;
      return clamp(newUv, 0.0, 1.0);
    }

    float sdfCircle(vec2 p, float r) {
        return length(p - 0.5) - r;
    }

    void main() {
      vec2 screenUv = gl_FragCoord.xy / resolution;
      vec2 uv = coverUv(screenUv);

      vec2 gridUv = fract(uv * gridSize);
      vec2 gridUvCenter = (floor(uv * gridSize) + 0.5) / gridSize;

      float trail = texture2D(mouseTrail, gridUvCenter).r;

      gl_FragColor = vec4(pixelColor, trail);
    }
  `
);

const identityEase = (x: number) => x;

function Scene({ gridSize, trailSize, maxAge, interpolate, easingFunction, pixelColor }: SceneProps) {
  const size = useThree(s => s.size);
  const viewport = useThree(s => s.viewport);

  const dotMaterial = useMemo(() => new DotMaterial(), []);
  useEffect(() => () => dotMaterial.dispose(), [dotMaterial]);

  useEffect(() => {
    dotMaterial.uniforms.pixelColor.value.set(pixelColor);
  }, [dotMaterial, pixelColor]);

  const [trail, onMove] = useTrailTexture({
    size: 512,
    radius: trailSize,
    maxAge: maxAge,
    interpolate: interpolate || 0.1,
    ease: easingFunction || identityEase
  });

  useEffect(() => {
    if (!trail) return;
    trail.minFilter = THREE.NearestFilter;
    trail.magFilter = THREE.NearestFilter;
    trail.wrapS = THREE.ClampToEdgeWrapping;
    trail.wrapT = THREE.ClampToEdgeWrapping;
  }, [trail]);

  // Listen passively on the window: the decorative canvas never captures form input.
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const longest = Math.max(size.width, size.height);
      onMove({ uv: {
        x: (event.clientX - size.width / 2) / longest + 0.5,
        y: (size.height / 2 - event.clientY) / longest + 0.5,
      } });
    };
    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [onMove, size.width, size.height]);

  useEffect(() => () => trail.dispose(), [trail]);

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive
        object={dotMaterial}
        attach="material"
        gridSize={gridSize}
        resolution={[size.width * viewport.dpr, size.height * viewport.dpr]}
        mouseTrail={trail}
      />
    </mesh>
  );
}

export default function PixelTrail({
  gridSize = 40,
  trailSize = 0.1,
  maxAge = 250,
  interpolate = 5,
  easingFunction = identityEase,
  gooeyFilter,
  color = '#ffffff',
  className = ''
}: PixelTrailProps) {
  return (
    <>
      {gooeyFilter && <GooeyFilter id={gooeyFilter.id} strength={gooeyFilter.strength} />}
      <Canvas
        dpr={[1, 1.25]}
        gl={{ antialias: false, powerPreference: 'low-power', alpha: true }}
        fallback={null}
        className={`pixel-canvas ${className}`}
        style={gooeyFilter && { filter: `url(#${gooeyFilter.id})` }}
      >
        <Scene
          gridSize={gridSize}
          trailSize={trailSize}
          maxAge={maxAge}
          interpolate={interpolate}
          easingFunction={easingFunction}
          pixelColor={color}
        />
      </Canvas>
    </>
  );
}
