import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Play, RotateCw, Volume2, VolumeX, Pause, ArrowLeft } from 'lucide-react';

interface CyberRacer3DProps {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

export const CyberRacer3D: React.FC<CyberRacer3DProps> = ({ onExit, onRecordScore }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [distance, setDistance] = useState(0);
  const [muted, setMuted] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('gh_cyberracer_high') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Sound Synth Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  // Game loop internal mutable state ref (isolated from React state)
  const gameRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    pmrem: THREE.PMREMGenerator | null;
    playerShip: THREE.Group | null;
    thrusterGlows: THREE.Mesh[];
    obstacles: THREE.Group[];
    pickups: THREE.Group[];
    trackSegments: THREE.Group[];
    tunnelRings: THREE.Group[];
    particles: THREE.Points | null;
    heldKeys: Record<string, boolean>;
    playerX: number;
    playerTargetX: number;
    playerY: number;
    playerRoll: number;
    speed: number;
    maxSpeed: number;
    boostTimer: number;
    distance: number;
    score: number;
    energy: number;
    hitStop: number;
    cameraShake: number;
    running: boolean;
    lastTime: number;
    animId: number;
    muted: boolean;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    pmrem: null,
    playerShip: null,
    thrusterGlows: [],
    obstacles: [],
    pickups: [],
    trackSegments: [],
    tunnelRings: [],
    particles: null,
    heldKeys: {},
    playerX: 0,
    playerTargetX: 0,
    playerY: 0.5,
    playerRoll: 0,
    speed: 0,
    maxSpeed: 85,
    boostTimer: 0,
    distance: 0,
    score: 0,
    energy: 100,
    hitStop: 0,
    cameraShake: 0,
    running: false,
    lastTime: 0,
    animId: 0,
    muted: false,
  });

  // Procedural Web Audio Synth Helpers
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      engineOscRef.current = osc;
      engineGainRef.current = gain;
    } catch (e) {
      console.warn('AudioContext not allowed or supported', e);
    }
  }, []);

  const playSynthChime = useCallback((freq = 587.33) => {
    if (gameRef.current.muted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  const playExplosionSound = useCallback(() => {
    if (gameRef.current.muted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }, []);

  // Update engine frequency and volume
  const updateEngineAudio = useCallback((spd: number, isBoosting: boolean) => {
    if (!audioCtxRef.current || !engineOscRef.current || !engineGainRef.current) return;
    if (gameRef.current.muted) {
      engineGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      return;
    }
    const targetFreq = 50 + (spd / 100) * 160 + (isBoosting ? 80 : 0);
    const targetGain = 0.02 + (spd / 100) * 0.05;
    engineOscRef.current.frequency.setTargetAtTime(targetFreq, audioCtxRef.current.currentTime, 0.05);
    engineGainRef.current.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 0.05);
  }, []);

  // Three.js Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060712);
    scene.fog = new THREE.FogExp2(0x060712, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 7.5);
    camera.lookAt(0, 1.2, 0);

    // 3. Renderer with PBR ACESFilmicToneMapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 5. Lighting: Warm key + Cool fill
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x120328, 1.2);
    scene.add(hemiLight);

    // 6. Build Composite 8-Part Procedural Cyber Racer Hovercraft
    const playerShip = new THREE.Group();

    // Part 1: Main Hull Fuselage
    const hullGeo = new THREE.ConeGeometry(0.7, 3.2, 6);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.2, 0.45, 1);
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c111f,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.castShadow = true;
    playerShip.add(hullMesh);

    // Part 2: Glowing Cockpit Canopy
    const cockpitGeo = new THREE.SphereGeometry(0.42, 16, 16);
    cockpitGeo.scale(0.8, 0.4, 1.4);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.8,
      transmission: 0.7,
      roughness: 0.05,
      metalness: 0.1,
    });
    const cockpitMesh = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpitMesh.position.set(0, 0.25, -0.2);
    playerShip.add(cockpitMesh);

    // Part 3 & 4: Swept Delta Wings (Left & Right)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.8, -0.6);
    wingShape.lineTo(1.6, -1.4);
    wingShape.lineTo(0, -0.9);
    wingShape.closePath();

    const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    wingExtrude.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0x131a30,
      metalness: 0.85,
      roughness: 0.25,
    });
    const leftWing = new THREE.Mesh(wingExtrude, wingMat);
    leftWing.position.set(0.3, 0.05, 0.6);
    leftWing.castShadow = true;
    playerShip.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.set(-1, 1, 1);
    rightWing.position.set(-0.3, 0.05, 0.6);
    playerShip.add(rightWing);

    // Part 5 & 6: Dual Thruster Nacelles
    const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.1, 12);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c16,
      metalness: 0.95,
      roughness: 0.3,
    });
    const leftThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    leftThruster.position.set(0.65, 0.1, 0.9);
    leftThruster.castShadow = true;
    playerShip.add(leftThruster);

    const rightThruster = leftThruster.clone();
    rightThruster.position.set(-0.65, 0.1, 0.9);
    playerShip.add(rightThruster);

    // Part 7: Emissive Thruster Exhaust Jets
    const glowGeo = new THREE.CylinderGeometry(0.14, 0.02, 0.5, 12);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(0.65, 0.1, 1.55);
    playerShip.add(leftGlow);

    const rightGlow = leftGlow.clone();
    rightGlow.position.set(-0.65, 0.1, 1.55);
    playerShip.add(rightGlow);

    // Part 8: Top Aerodynamic Spoiler & Fin
    const finGeo = new THREE.BoxGeometry(0.08, 0.5, 0.8);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.8, roughness: 0.2 });
    const topFin = new THREE.Mesh(finGeo, finMat);
    topFin.position.set(0, 0.45, 0.8);
    topFin.rotation.x = -0.2;
    playerShip.add(topFin);

    // Part 9: Contact Hover Ring Glow (Soft radial ground shadow/glow)
    const hoverRingGeo = new THREE.RingGeometry(0.8, 1.4, 24);
    hoverRingGeo.rotateX(-Math.PI / 2);
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    hoverRing.position.set(0, -0.4, 0.2);
    playerShip.add(hoverRing);

    playerShip.position.set(0, 0.6, 0);
    scene.add(playerShip);

    // 7. Track Ground & Procedural Cyber Road
    const trackWidth = 14;
    const trackSegmentLength = 60;
    const numTrackSegments = 8;
    const trackSegments: THREE.Group[] = [];

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x080914,
      roughness: 0.6,
      metalness: 0.3,
    });

    const railMatCyan = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });

    const railMatPurple = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });

    for (let i = 0; i < numTrackSegments; i++) {
      const segGroup = new THREE.Group();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth, trackSegmentLength), roadMat);
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      segGroup.add(plane);

      // Left and right glowing guard rails
      const railGeo = new THREE.BoxGeometry(0.3, 0.5, trackSegmentLength);
      const leftRail = new THREE.Mesh(railGeo, railMatCyan);
      leftRail.position.set(-trackWidth / 2, 0.25, 0);
      segGroup.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, railMatPurple);
      rightRail.position.set(trackWidth / 2, 0.25, 0);
      segGroup.add(rightRail);

      // Road grid stripes
      const stripeGeo = new THREE.PlaneGeometry(0.3, 4);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 });
      for (let s = -trackSegmentLength / 2 + 5; s < trackSegmentLength / 2; s += 10) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 0.02, s);
        segGroup.add(stripe);
      }

      segGroup.position.set(0, 0, -i * trackSegmentLength);
      scene.add(segGroup);
      trackSegments.push(segGroup);
    }

    // 8. Glowing Tunnel Arches
    const tunnelRings: THREE.Group[] = [];
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.9,
    });

    for (let i = 0; i < 12; i++) {
      const archGroup = new THREE.Group();
      const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
      leftCol.position.set(-trackWidth / 2, 2.5, 0);
      const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
      rightCol.position.set(trackWidth / 2, 2.5, 0);
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 0.4, 0.4, 0.4), archMat);
      topBeam.position.set(0, 5, 0);

      archGroup.add(leftCol, rightCol, topBeam);
      archGroup.position.set(0, 0, -i * 35 - 30);
      scene.add(archGroup);
      tunnelRings.push(archGroup);
    }

    // 9. Particle Dust Speed Field
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      posArray[p] = (Math.random() - 0.5) * 40;
      posArray[p + 1] = Math.random() * 15;
      posArray[p + 2] = -Math.random() * 250;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Store references
    gameRef.current.scene = scene;
    gameRef.current.camera = camera;
    gameRef.current.renderer = renderer;
    gameRef.current.pmrem = pmrem;
    gameRef.current.playerShip = playerShip;
    gameRef.current.thrusterGlows = [leftGlow, rightGlow];
    gameRef.current.trackSegments = trackSegments;
    gameRef.current.tunnelRings = tunnelRings;
    gameRef.current.particles = particles;
    gameRef.current.lastTime = performance.now();

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      gameRef.current.heldKeys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      }
      if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'title') {
        startGame();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      gameRef.current.heldKeys[e.code] = false;
    };

    const onBlur = () => {
      gameRef.current.heldKeys = {};
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Start 60fps Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      animId = requestAnimationFrame(loop);
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05); // Clamped delta time

      const state = gameRef.current;
      if (!state.scene || !state.camera || !state.renderer) return;

      // Handle Title screen idle presentation
      if (gameState === 'title') {
        const time = performance.now() * 0.001;
        if (state.playerShip) {
          state.playerShip.position.y = 0.8 + Math.sin(time * 2) * 0.15;
          state.playerShip.rotation.z = Math.sin(time) * 0.08;
          state.playerShip.rotation.y = Math.sin(time * 0.7) * 0.12;
        }
        // Rotate camera smoothly around vehicle
        state.camera.position.x = Math.sin(time * 0.5) * 4.5;
        state.camera.position.z = 6.5 + Math.cos(time * 0.5) * 1.5;
        state.camera.lookAt(0, 1.0, 0);

        // Slow scroll track
        for (const seg of state.trackSegments) {
          seg.position.z += 10 * dt;
          if (seg.position.z > 60) seg.position.z -= 8 * 60;
        }
        state.renderer.render(state.scene, state.camera);
        return;
      }

      if (gameState !== 'playing') {
        state.renderer.render(state.scene, state.camera);
        return;
      }

      // Handle Hitstop
      if (state.hitStop > 0) {
        state.hitStop -= dt;
        state.renderer.render(state.scene, state.camera);
        return;
      }

      // 1. Process Input
      const left = state.heldKeys['ArrowLeft'] || state.heldKeys['KeyA'];
      const right = state.heldKeys['ArrowRight'] || state.heldKeys['KeyD'];
      const boost = (state.heldKeys['Space'] || state.heldKeys['ArrowUp'] || state.heldKeys['KeyW']) && state.energy > 5;

      const steerSpeed = 16.0;
      if (left) state.playerTargetX -= steerSpeed * dt;
      if (right) state.playerTargetX += steerSpeed * dt;
      state.playerTargetX = THREE.MathUtils.clamp(state.playerTargetX, -5.5, 5.5);

      // Smooth horizontal interpolation
      state.playerX = THREE.MathUtils.lerp(state.playerX, state.playerTargetX, 1 - Math.exp(-14 * dt));

      // Ship Roll Banking
      const targetRoll = (state.playerTargetX - state.playerX) * -0.6;
      state.playerRoll = THREE.MathUtils.lerp(state.playerRoll, targetRoll, 1 - Math.exp(-12 * dt));

      // Boost mechanics
      let currentMax = state.maxSpeed;
      if (boost) {
        currentMax = 135;
        state.energy = Math.max(0, state.energy - dt * 25);
        state.score += Math.floor(dt * 150);
      } else {
        state.energy = Math.min(100, state.energy + dt * 10);
        state.score += Math.floor(dt * 50);
      }

      // Speed acceleration
      state.speed = THREE.MathUtils.lerp(state.speed, currentMax, 1 - Math.exp(-2.5 * dt));
      state.distance += state.speed * dt;

      // Update audio
      updateEngineAudio(state.speed, boost);

      // Thruster scale
      for (const thruster of state.thrusterGlows) {
        const glowScale = (state.speed / 85) * (boost ? 2.2 : 1.0);
        thruster.scale.set(1, glowScale, 1);
        (thruster.material as THREE.MeshBasicMaterial).color.setHex(boost ? 0xa855f7 : 0x00f0ff);
      }

      // Update Player Position
      if (state.playerShip) {
        state.playerShip.position.x = state.playerX;
        state.playerShip.position.y = 0.55 + Math.sin(performance.now() * 0.008) * 0.05;
        state.playerShip.rotation.z = state.playerRoll;
        state.playerShip.rotation.y = state.playerRoll * 0.2;
      }

      // Camera follow with damping & shake
      if (state.camera) {
        const targetCamX = state.playerX * 0.45;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, 1 - Math.exp(-10 * dt));

        if (state.cameraShake > 0) {
          state.camera.position.x += (Math.random() - 0.5) * state.cameraShake;
          state.camera.position.y = 3.2 + (Math.random() - 0.5) * state.cameraShake;
          state.cameraShake = Math.max(0, state.cameraShake - dt * 2.5);
        } else {
          state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 3.2, 0.1);
        }

        state.camera.lookAt(state.playerX * 0.2, 1.2, -15);
      }

      // 2. Move Track Segments
      const speedDist = state.speed * dt;
      for (const seg of state.trackSegments) {
        seg.position.z += speedDist;
        if (seg.position.z > 60) {
          seg.position.z -= 8 * 60;
        }
      }

      // Move Tunnel Arches
      for (const arch of state.tunnelRings) {
        arch.position.z += speedDist;
        if (arch.position.z > 20) {
          arch.position.z -= 12 * 35;
        }
      }

      // Move Particle Dust
      if (state.particles) {
        const pos = state.particles.geometry.attributes.position.array as Float32Array;
        for (let p = 2; p < pos.length; p += 3) {
          pos[p] += speedDist * 1.5;
          if (pos[p] > 20) pos[p] -= 250;
        }
        state.particles.geometry.attributes.position.needsUpdate = true;
      }

      // 3. Spawn & Update Obstacles
      if (Math.random() < 0.04 && state.obstacles.length < 8) {
        const obsGroup = new THREE.Group();
        const obsGeo = new THREE.BoxGeometry(1.6, 2.2, 1.6);
        const obsMat = new THREE.MeshPhysicalMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.8,
          metalness: 0.8,
          roughness: 0.2,
        });
        const obsMesh = new THREE.Mesh(obsGeo, obsMat);
        obsMesh.position.y = 1.1;
        obsMesh.castShadow = true;
        obsGroup.add(obsMesh);

        // Glowing border pylon
        const pylonGeo = new THREE.BoxGeometry(1.8, 0.2, 1.8);
        const pylonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pylonTop = new THREE.Mesh(pylonGeo, pylonMat);
        pylonTop.position.y = 2.2;
        obsGroup.add(pylonTop);

        const lanes = [-4.5, -2.25, 0, 2.25, 4.5];
        obsGroup.position.set(lanes[Math.floor(Math.random() * lanes.length)], 0, -220);
        state.scene.add(obsGroup);
        state.obstacles.push(obsGroup);
      }

      // Move & Collide Obstacles
      for (let o = state.obstacles.length - 1; o >= 0; o--) {
        const obs = state.obstacles[o];
        obs.position.z += speedDist;

        // Collision check
        const dx = Math.abs(obs.position.x - state.playerX);
        const dz = Math.abs(obs.position.z - 0);
        if (dx < 1.4 && dz < 1.8) {
          // Trigger Collision Feedback: Hitstop + Camera Shake + Explosion
          state.hitStop = 0.06;
          state.cameraShake = 0.6;
          state.speed *= 0.35;
          state.energy = Math.max(0, state.energy - 35);
          playExplosionSound();

          // Remove obstacle
          state.scene.remove(obs);
          state.obstacles.splice(o, 1);

          if (state.energy <= 0) {
            handleGameOver();
          }
          continue;
        }

        if (obs.position.z > 20) {
          state.scene.remove(obs);
          state.obstacles.splice(o, 1);
        }
      }

      // 4. Spawn & Update Energy Orbs
      if (Math.random() < 0.045 && state.pickups.length < 6) {
        const orbGroup = new THREE.Group();
        const orbGeo = new THREE.OctahedronGeometry(0.5, 0);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
        const orbMesh = new THREE.Mesh(orbGeo, orbMat);
        orbMesh.position.y = 1.0;

        const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        core.position.y = 1.0;
        orbGroup.add(orbMesh, core);

        const lanes = [-4, -2, 0, 2, 4];
        orbGroup.position.set(lanes[Math.floor(Math.random() * lanes.length)], 0, -200);
        state.scene.add(orbGroup);
        state.pickups.push(orbGroup);
      }

      // Move & Collect Orbs
      for (let p = state.pickups.length - 1; p >= 0; p--) {
        const orb = state.pickups[p];
        orb.position.z += speedDist;
        orb.rotation.y += dt * 4;

        const dx = Math.abs(orb.position.x - state.playerX);
        const dz = Math.abs(orb.position.z - 0);
        if (dx < 1.3 && dz < 1.6) {
          state.energy = Math.min(100, state.energy + 25);
          state.score += 250;
          playSynthChime(659.25);
          state.scene.remove(orb);
          state.pickups.splice(p, 1);
          continue;
        }

        if (orb.position.z > 20) {
          state.scene.remove(orb);
          state.pickups.splice(p, 1);
        }
      }

      // Periodically sync React UI HUD
      setScore(state.score);
      setSpeed(Math.round(state.speed * 2.8)); // Virtual km/h
      setEnergy(Math.round(state.energy));
      setDistance(Math.round(state.distance));

      state.renderer.render(state.scene, state.camera);
    };

    gameRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [gameState, initAudio, playExplosionSound, playSynthChime, updateEngineAudio]);

  const startGame = () => {
    initAudio();
    const state = gameRef.current;
    state.score = 0;
    state.energy = 100;
    state.speed = 45;
    state.distance = 0;
    state.playerX = 0;
    state.playerTargetX = 0;

    // Clear old obstacles & pickups
    if (state.scene) {
      for (const obs of state.obstacles) state.scene.remove(obs);
      for (const pick of state.pickups) state.scene.remove(pick);
    }
    state.obstacles = [];
    state.pickups = [];

    setGameState('playing');
  };

  const handleGameOver = () => {
    setGameState('gameover');
    const finalScore = gameRef.current.score;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('gh_cyberracer_high', finalScore.toString());
      } catch {}
    }
    if (onRecordScore) {
      onRecordScore(finalScore);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameRef.current.muted = next;
    if (engineGainRef.current && audioCtxRef.current) {
      engineGainRef.current.gain.setValueAtTime(next ? 0 : 0.03, audioCtxRef.current.currentTime);
    }
  };

  // Mobile virtual steering handlers
  const handleMobileSteer = (dir: 'left' | 'right' | 'boost') => {
    if (dir === 'left') {
      gameRef.current.playerTargetX = Math.max(-5.5, gameRef.current.playerTargetX - 1.5);
    } else if (dir === 'right') {
      gameRef.current.playerTargetX = Math.min(5.5, gameRef.current.playerTargetX + 1.5);
    } else if (dir === 'boost') {
      gameRef.current.heldKeys['Space'] = true;
      setTimeout(() => {
        gameRef.current.heldKeys['Space'] = false;
      }, 350);
    }
  };

  return (
    <div className="relative w-full h-[650px] md:h-[750px] bg-black rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)]">
      {/* Three.js Canvas Container (Isolated mount point) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Low-Occlusion HUD Overlay (Unobstructed playfield: pointer-events-none on wrapper) */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-4 shadow-lg">
                <div>
                  <div className="text-[10px] font-orbitron uppercase tracking-wider text-cyan-400">Score</div>
                  <div className="text-xl sm:text-2xl font-orbitron font-black text-white tabular-nums tracking-wide">
                    {score.toLocaleString()}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-cyan-500/30" />
                <div>
                  <div className="text-[10px] font-orbitron uppercase tracking-wider text-purple-400">Speed</div>
                  <div className="text-xl sm:text-2xl font-orbitron font-black text-white tabular-nums tracking-wide">
                    {speed} <span className="text-xs font-normal text-slate-400">KM/H</span>
                  </div>
                </div>
              </div>

              {/* Energy Shield Bar */}
              <div className="hidden sm:block bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2.5 min-w-[150px]">
                <div className="flex justify-between items-center text-[10px] font-orbitron uppercase text-slate-300 mb-1">
                  <span>Shield / Boost</span>
                  <span className="text-cyan-400 font-bold">{energy}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-150"
                    style={{ width: `${energy}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label="Toggle mute"
              >
                {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setGameState('paused')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                title="Pause Game"
                aria-label="Pause game"
              >
                <Pause className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom On-Screen Mobile Controls (Visible on mobile/touch) */}
          <div className="pointer-events-auto flex justify-between items-end md:hidden pb-2">
            <div className="flex gap-2">
              <button
                onTouchStart={() => handleMobileSteer('left')}
                onClick={() => handleMobileSteer('left')}
                className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-cyan-500/50 flex items-center justify-center font-orbitron text-cyan-400 font-black text-xl active:scale-95 active:bg-cyan-500/20"
              >
                ◀
              </button>
              <button
                onTouchStart={() => handleMobileSteer('right')}
                onClick={() => handleMobileSteer('right')}
                className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-cyan-500/50 flex items-center justify-center font-orbitron text-cyan-400 font-black text-xl active:scale-95 active:bg-cyan-500/20"
              >
                ▶
              </button>
            </div>
            <button
              onTouchStart={() => handleMobileSteer('boost')}
              onClick={() => handleMobileSteer('boost')}
              className="w-20 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center shadow-lg active:scale-95"
            >
              BOOST
            </button>
          </div>
        </div>
      )}

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 text-center">
          {/* Bespoke inline SVG Title Lockup over negative space */}
          <div className="max-w-xl">
            <svg viewBox="0 0 540 120" className="w-full max-w-md mx-auto drop-shadow-[0_0_25px_rgba(0,240,255,0.7)]">
              <defs>
                <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <text
                x="50%"
                y="65"
                textAnchor="middle"
                fontFamily="Orbitron, system-ui, sans-serif"
                fontWeight="900"
                fontSize="48"
                letterSpacing="6"
                fill="url(#cyberGrad)"
                stroke="#070712"
                strokeWidth="2"
              >
                CYBER RACER
              </text>
              <text
                x="50%"
                y="98"
                textAnchor="middle"
                fontFamily="Rajdhani, system-ui, sans-serif"
                fontWeight="700"
                fontSize="20"
                letterSpacing="12"
                fill="#ffffff"
                opacity="0.9"
              >
                3D HYPERDRIVE • 60 FPS
              </text>
            </svg>

            <p className="mt-3 font-rajdhani text-slate-300 text-sm sm:text-base max-w-md mx-auto">
              Pilot an anti-gravity hovercraft down futuristic cyber circuits. Dodge obstacles, gather energy cores, and ignite boost thrusters.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={startGame}
                className="group px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-slate-950 font-orbitron font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
                Launch Simulation
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="px-6 py-3.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:text-white hover:border-slate-500 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Portal
                </button>
              )}
            </div>

            {/* Flat Control-Hint Line */}
            <div className="mt-8 pt-4 border-t border-slate-800/80 text-xs font-rajdhani uppercase tracking-widest text-slate-400">
              <span className="text-cyan-400 font-bold">A / D · Arrows</span> Steer &nbsp;•&nbsp;{' '}
              <span className="text-purple-400 font-bold">Space</span> Boost &nbsp;•&nbsp;{' '}
              <span className="text-pink-400 font-bold">Esc / P</span> Pause
            </div>
          </div>
        </div>
      )}

      {/* Paused Screen Overlay */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 text-center">
          <h2 className="text-3xl font-orbitron font-black uppercase tracking-wider text-cyan-400 mb-2">
            Simulation Paused
          </h2>
          <p className="text-sm font-rajdhani text-slate-300 mb-6">Take a breath, pilot. Ready to resume the circuit?</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setGameState('playing')}
              className="px-8 py-3 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-colors shadow-lg"
            >
              Resume
            </button>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:text-white transition-colors"
            >
              Restart Circuit
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-lg p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <RotateCw className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-orbitron font-black uppercase tracking-wider text-red-400">
            Hull Integrity Zero
          </h2>
          <p className="text-sm font-rajdhani text-slate-300 mt-1 mb-6">Hovercraft shields depleted after heavy impact.</p>

          <div className="grid grid-cols-2 gap-4 max-w-xs w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6">
            <div>
              <div className="text-[10px] font-orbitron uppercase text-slate-400">Final Score</div>
              <div className="text-2xl font-orbitron font-black text-cyan-400 tabular-nums">
                {score.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-orbitron uppercase text-slate-400">Best Record</div>
              <div className="text-2xl font-orbitron font-black text-purple-400 tabular-nums">
                {highScore.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Try Again
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="px-6 py-3.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:text-white transition-colors"
              >
                Exit to Hub
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
