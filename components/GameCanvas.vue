<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRefs, shallowRef } from 'vue';
import * as THREE from 'three';
import { GameState, CircleDefinition, PlayerClick } from '../types';
import { CIRCLE_RADIUS, ANIMATION_DURATION_MS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  sequence: CircleDefinition[];
  playerClicks: PlayerClick[];
  activePlaybackIndex: number | null;
}

const props = defineProps<GameCanvasProps>();
const emit = defineEmits(['playerInteractionStart', 'playerInteractionPitchChange', 'playerInteractionEnd', 'ready']);

const { gameState, sequence, playerClicks, activePlaybackIndex } = toRefs(props);

const mountRef = ref<HTMLDivElement | null>(null);
const rendererRef = shallowRef<THREE.WebGLRenderer | null>(null);
const sceneRef = shallowRef<THREE.Scene | null>(null);
const cameraRef = shallowRef<THREE.OrthographicCamera | null>(null);
const animationsRef = ref<any[]>([]);
const ghostGroupRef = shallowRef<THREE.Group>(new THREE.Group());
const clickMarkerGroupRef = shallowRef<THREE.Group>(new THREE.Group());
const markerMeshes = shallowRef<THREE.Group[]>([]);
const isMouseDownRef = ref(false);
const lastDragPosition = ref({ x: 0, y: 0 });

const toThreeCoords = (x: number, y: number) => {
  if (!mountRef.value) return new THREE.Vector3();
  const { clientWidth: width, clientHeight: height } = mountRef.value;
  return new THREE.Vector3(x - width / 2, -(y - height / 2), 0);
};

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

onMounted(() => {
  const mountNode = mountRef.value;
  if (!mountNode) return;

  const { clientWidth: width, clientHeight: height } = mountNode;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111827');
  sceneRef.value = scene;

  const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
  camera.position.z = 5;
  cameraRef.value = camera;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  rendererRef.value = renderer;
  mountNode.appendChild(renderer.domElement);
  
  emit('ready', { width, height });

  const spacing = 50;
  const size = Math.max(width, height) * 1.5;
  const divisions = Math.ceil(size / spacing);
  const gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
  gridHelper.material.opacity = 0.05;
  gridHelper.material.transparent = true;
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);

  scene.add(ghostGroupRef.value);
  scene.add(clickMarkerGroupRef.value);

  let animationFrameId: number;
  const animate = () => {
    const time = performance.now();

    animationsRef.value = animationsRef.value.filter(anim => {
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
              mesh.material.opacity = Math.sin(progress * Math.PI);
          }
          const scale = progress * 2.0;
          anim.obj.scale.set(scale, scale, 1);
      }
      return true;
    });

    if (rendererRef.value && cameraRef.value) {
      rendererRef.value.render(scene, cameraRef.value);
    }
    animationFrameId = requestAnimationFrame(animate);
  };
  animate();

  const resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0];
    const { width, height } = entry.contentRect;
    emit('ready', { width, height });
    if (rendererRef.value && cameraRef.value) {
      rendererRef.value.setSize(width, height);
      cameraRef.value.left = width / -2;
      cameraRef.value.right = width / 2;
      cameraRef.value.top = height / 2;
      cameraRef.value.bottom = height / -2;
      cameraRef.value.updateProjectionMatrix();
    }
  });

  resizeObserver.observe(mountNode);

  onUnmounted(() => {
    resizeObserver.disconnect();
    cancelAnimationFrame(animationFrameId);
    if (mountNode && rendererRef.value) {
      mountNode.removeChild(rendererRef.value.domElement);
    }
    animationsRef.value.forEach(anim => disposeGroupChildren(anim.obj));
    animationsRef.value = [];
    disposeGroupChildren(ghostGroupRef.value);
    disposeGroupChildren(clickMarkerGroupRef.value);
    if (rendererRef.value) {
      rendererRef.value.dispose();
    }
  });
});

watch(activePlaybackIndex, (newIndex) => {
  if (gameState.value === GameState.Playback && newIndex !== null) {
    const activeCircle = sequence.value[newIndex];
    const scene = sceneRef.value;
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

      animationsRef.value.push({
        id: Date.now(),
        obj: group,
        startTime: performance.now(),
        duration: ANIMATION_DURATION_MS,
        isInitial: true,
      });
    }
  }
});

watch(() => playerClicks.value.length, (newLength) => {
    if (playerClicks.value.length > 0 && newLength > markerMeshes.value.length) {
        const lastClick = playerClicks.value[playerClicks.value.length - 1];
        const correspondingCircle = sequence.value[playerClicks.value.length - 1];
        const scene = sceneRef.value;
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

            animationsRef.value.push({
                id: Date.now(),
                obj: group,
                startTime: performance.now(),
                duration: 600,
                isInitial: false,
            });
        }
    }
});

watch([gameState, () => playerClicks.value.length], () => {
  disposeGroupChildren(ghostGroupRef.value);
  const shouldShow = gameState.value === GameState.PlayerTurn || gameState.value === GameState.Scoring || gameState.value === GameState.Calculating;
  if (shouldShow) {
    const ghostsToShow = (gameState.value === GameState.Scoring || gameState.value === GameState.Calculating)
          ? sequence.value
          : sequence.value.slice(0, playerClicks.value.length);
          
    ghostsToShow.forEach(circle => {
      const geom = new THREE.CircleGeometry(CIRCLE_RADIUS, 32);
      const mat = new THREE.MeshBasicMaterial({ color: circle.color, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(toThreeCoords(circle.x, circle.y));
      ghostGroupRef.value.add(mesh);
    });
  }
});

watch(() => playerClicks.value.length, (newLength, oldLength) => {
    if (newLength > oldLength) {
        for (let i = oldLength; i < newLength; i++) {
            const click = playerClicks.value[i];
            const targetCircle = sequence.value[i];
            if (!targetCircle) continue;
            
            const marker = new THREE.Group();
            marker.position.copy(toThreeCoords(click.x, click.y));

            const borderGeom = new THREE.CircleGeometry(CIRCLE_RADIUS / 3 + 2, 32);
            const borderMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            const borderMesh = new THREE.Mesh(borderGeom, borderMat);
            borderMesh.position.z = -0.1;

            const innerGeom = new THREE.CircleGeometry(CIRCLE_RADIUS / 3, 32);
            const innerMat = new THREE.MeshBasicMaterial({ color: targetCircle.color });
            const innerMesh = new THREE.Mesh(innerGeom, innerMat);

            marker.add(innerMesh);
            marker.add(borderMesh);
            clickMarkerGroupRef.value.add(marker);
            markerMeshes.value.push(marker);
        }
    } else if (newLength < oldLength) {
        markerMeshes.value.forEach(mesh => clickMarkerGroupRef.value.remove(mesh));
        markerMeshes.value = [];
        disposeGroupChildren(clickMarkerGroupRef.value);
    }
});

const handleMouseDown = (event: MouseEvent) => {
  if (gameState.value !== GameState.PlayerTurn || !mountRef.value) return;
  isMouseDownRef.value = true;
  const rect = mountRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  lastDragPosition.value = { x, y };
  emit('playerInteractionStart', { x, y, time: performance.now() });
};

const handleMouseUpAndLeave = () => {
  if (isMouseDownRef.value) {
      isMouseDownRef.value = false;
      emit('playerInteractionEnd', lastDragPosition.value);
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isMouseDownRef.value || !mountRef.value) return;
  const rect = mountRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  lastDragPosition.value = { x, y };

  if (markerMeshes.value.length > 0) {
      const lastMarker = markerMeshes.value[markerMeshes.value.length - 1];
      lastMarker.position.copy(toThreeCoords(x, y));
  }

  emit('playerInteractionPitchChange', { y });
};
</script>

<template>
  <div
    ref="mountRef"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUpAndLeave"
    @mouseleave="handleMouseUpAndLeave"
    @mousemove="handleMouseMove"
    class="rounded-lg shadow-lg cursor-pointer w-full h-full"
  />
</template> 