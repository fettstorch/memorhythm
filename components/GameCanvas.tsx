import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GameState, CircleDefinition, PlayerClick } from '../types';
import { CIRCLE_RADIUS, ANIMATION_DURATION_MS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  sequence: CircleDefinition[];
  playerClicks: PlayerClick[];
  activePlaybackIndex: number | null;
  onPlayerInteractionStart: (click: PlayerClick) => void;
  onPlayerInteractionMove: (details: { x: number; y: number }) => void;
  onPlayerInteractionEnd: () => void;
  width: number;
  height: number;
}

interface ThreeAnimation {
  id: number;
  obj: THREE.Group;
  startTime: number;
  duration: number;
  isInitial: boolean;
}

const disposeGroupChildren = (group: THREE.Group) => {
    while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);

        if (child instanceof THREE.Group) {
            disposeGroupChildren(child);
        } else if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    }
};

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  sequence,
  playerClicks,
  activePlaybackIndex,
  onPlayerInteractionStart,
  onPlayerInteractionMove,
  onPlayerInteractionEnd,
  width,
  height,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationsRef = useRef<ThreeAnimation[]>([]);
  const ghostGroupRef = useRef<THREE.Group>(new THREE.Group());
  const clickMarkerGroupRef = useRef<THREE.Group>(new THREE.Group());
  const isMouseDownRef = useRef(false);

  const toThreeCoords = (x: number, y: number) => {
    return new THREE.Vector3(x - width / 2, -(y - height / 2), 0);
  };

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || !width || !height) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111827');
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountNode.appendChild(renderer.domElement);
    
    const spacing = 50;
    const size = Math.max(width, height) * 1.5;
    const divisions = Math.ceil(size / spacing);
    const gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
    gridHelper.material.opacity = 0.05;
    gridHelper.material.transparent = true;
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    scene.add(ghostGroupRef.current);
    scene.add(clickMarkerGroupRef.current);

    let animationFrameId: number;
    const animate = () => {
      const time = performance.now();

      animationsRef.current = animationsRef.current.filter(anim => {
        const elapsedTime = time - anim.startTime;
        const isDone = elapsedTime >= anim.duration;

        if (isDone) {
            disposeGroupChildren(anim.obj);
            scene.remove(anim.obj);
            return false;
        }

        const progress = elapsedTime / anim.duration;

        if (anim.isInitial) {
            const opacity = 1 - progress;
            (anim.obj.children[0] as THREE.Mesh<any, THREE.MeshBasicMaterial>).material.opacity = opacity;
            const ring = anim.obj.children[1] as THREE.Mesh<any, THREE.MeshBasicMaterial>;
            ring.material.opacity = opacity;
            const scale = 1 + progress * 0.5;
            ring.scale.set(scale, scale, 1);
        } else { // Player click 'wave' animation
            const mesh = anim.obj.children[0] as THREE.Mesh<any, THREE.MeshBasicMaterial>;
            if (mesh) {
                // Use a sine wave for opacity to fade in and out gracefully.
                mesh.material.opacity = Math.sin(progress * Math.PI);
            }
            
            // Expand the ring outwards from the center.
            const scale = progress * 2.0;
            anim.obj.scale.set(scale, scale, 1);
        }
        return true;
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountNode && rendererRef.current) {
        mountNode.removeChild(rendererRef.current.domElement);
      }
      animationsRef.current.forEach(anim => disposeGroupChildren(anim.obj));
      animationsRef.current = [];
      disposeGroupChildren(ghostGroupRef.current);
      disposeGroupChildren(clickMarkerGroupRef.current);
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (gameState === GameState.Playback && activePlaybackIndex !== null) {
      const activeCircle = sequence[activePlaybackIndex];
      const scene = sceneRef.current;
      if (activeCircle && scene) {
        const group = new THREE.Group();
        group.position.copy(toThreeCoords(activeCircle.x, activeCircle.y));

        const circleGeom = new THREE.CircleGeometry(CIRCLE_RADIUS, 32);
        const circleMat = new THREE.MeshBasicMaterial({ color: activeCircle.color, transparent: true });
        const circleMesh = new THREE.Mesh(circleGeom, circleMat);

        const ringGeom = new THREE.RingGeometry(CIRCLE_RADIUS, CIRCLE_RADIUS + 4, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: activeCircle.color, transparent: true });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);

        group.add(circleMesh);
        group.add(ringMesh);
        scene.add(group);

        animationsRef.current.push({
          id: Date.now(),
          obj: group,
          startTime: performance.now(),
          duration: ANIMATION_DURATION_MS,
          isInitial: true,
        });
      }
    }
  }, [gameState, activePlaybackIndex, sequence, width, height]);

  useEffect(() => {
    // This effect now only triggers the 'wave' on the initial click, not on drag updates.
    // It's keyed to playerClicks.length to ensure it only runs when a *new* click is added.
    if (playerClicks.length > 0) {
        const lastClick = playerClicks[playerClicks.length - 1];
        const correspondingCircle = sequence[playerClicks.length - 1];
        const scene = sceneRef.current;
        if (scene) {
            const group = new THREE.Group();
            group.position.copy(toThreeCoords(lastClick.x, lastClick.y));
            
            const ringGeom = new THREE.RingGeometry(CIRCLE_RADIUS, CIRCLE_RADIUS + 2, 64);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: correspondingCircle?.color || '#ffffff', 
                transparent: true,
                opacity: 0, 
            });
            const ringMesh = new THREE.Mesh(ringGeom, ringMat);
            group.add(ringMesh);
            scene.add(group);

            animationsRef.current.push({
                id: Date.now(),
                obj: group,
                startTime: performance.now(),
                duration: 600,
                isInitial: false,
            });
        }
    }
  }, [playerClicks.length, sequence, width, height]);

  useEffect(() => {
    const ghostGroup = ghostGroupRef.current;
    const markerGroup = clickMarkerGroupRef.current;
    
    disposeGroupChildren(ghostGroup);
    disposeGroupChildren(markerGroup);

    const shouldShow = gameState === GameState.PlayerTurn || gameState === GameState.Scoring || gameState === GameState.Calculating;
    if (shouldShow) {
      const ghostsToShow = (gameState === GameState.Scoring || gameState === GameState.Calculating)
            ? sequence
            : sequence.slice(0, playerClicks.length);
            
      ghostsToShow.forEach(circle => {
        const geom = new THREE.CircleGeometry(CIRCLE_RADIUS, 32);
        const mat = new THREE.MeshBasicMaterial({ color: circle.color, transparent: true, opacity: 0.5 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(toThreeCoords(circle.x, circle.y));
        ghostGroup.add(mesh);
      });

      playerClicks.forEach((click, index) => {
        const targetCircle = sequence[index];
        if (!targetCircle) return;
        
        const marker = new THREE.Group();
        // The marker's position is now dynamically updated on drag via this effect.
        marker.position.copy(toThreeCoords(click.x, click.y));

        const borderGeom = new THREE.CircleGeometry(CIRCLE_RADIUS / 3 + 2, 32);
        const borderMat = new THREE.MeshBasicMaterial({ color: 'rgba(255, 255, 255, 0.9)' });
        const borderMesh = new THREE.Mesh(borderGeom, borderMat);
        borderMesh.position.z = -0.1;

        const innerGeom = new THREE.CircleGeometry(CIRCLE_RADIUS / 3, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: targetCircle.color });
        const innerMesh = new THREE.Mesh(innerGeom, innerMat);

        marker.add(innerMesh);
        marker.add(borderMesh);
        markerGroup.add(marker);
      });
    }
  }, [gameState, sequence, playerClicks, width, height]);
  
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== GameState.PlayerTurn || !mountRef.current) return;
    isMouseDownRef.current = true;
    const rect = mountRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onPlayerInteractionStart({ x, y, time: performance.now() });
  };

  const handleMouseUpAndLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        onPlayerInteractionEnd();
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onPlayerInteractionMove({ x, y });
  };

  return (
    <div
      ref={mountRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUpAndLeave}
      onMouseLeave={handleMouseUpAndLeave}
      onMouseMove={handleMouseMove}
      className="rounded-lg shadow-lg cursor-pointer"
      style={{ width, height }}
    />
  );
};

export default GameCanvas;