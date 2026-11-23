import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ExerciseAnimationSvgProps {
  exerciseId: string;
  className?: string;
}

type MuscleZone = 'back' | 'biceps' | 'chest' | 'shoulders' | 'core' | 'legs';

type MotionArchetype =
  | 'pullup'
  | 'pullup_wide'
  | 'pullup_negative'
  | 'muscle_up'
  | 'dead_hang'
  | 'scapular_pulls'
  | 'australian_pullups'
  | 'hanging_knee_raises'
  | 'pushup'
  | 'dips'
  | 'l_sit'
  | 'plank'
  | 'squat'
  | 'barbell_squat'
  | 'bench_press'
  | 'kettlebell_swing'
  | 'bicep_curls'
  | 'jump_rope'
  | 'shadow_boxing'
  | 'run'
  | 'burpee'
  | 'mobility';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function resolveArchetype(id: string): {
  mode: MotionArchetype;
  activeMuscles: MuscleZone[];
  accentHex: string;
} {
  switch (id) {
    case 'dead_hang':
      return { mode: 'dead_hang', activeMuscles: ['back', 'biceps', 'shoulders'], accentHex: '#E5A3BD' };
    case 'spine_decompression':
      return { mode: 'dead_hang', activeMuscles: ['back', 'shoulders'], accentHex: '#A88CE8' };
    case 'scapular_pulls':
      return { mode: 'scapular_pulls', activeMuscles: ['back', 'shoulders'], accentHex: '#E5A3BD' };
    case 'negative_pullups':
      return { mode: 'pullup_negative', activeMuscles: ['back', 'biceps'], accentHex: '#E5A3BD' };
    case 'australian_pullups':
      return { mode: 'australian_pullups', activeMuscles: ['back', 'biceps'], accentHex: '#E5A3BD' };
    case 'wide_pullups':
      return { mode: 'pullup_wide', activeMuscles: ['back', 'shoulders', 'biceps'], accentHex: '#E5A3BD' };
    case 'muscle_up_prog':
      return { mode: 'muscle_up', activeMuscles: ['back', 'chest', 'shoulders', 'biceps'], accentHex: '#E5A3BD' };
    case 'hanging_knee_raises':
      return { mode: 'hanging_knee_raises', activeMuscles: ['core', 'back'], accentHex: '#E5A3BD' };
    case 'strict_pullups':
    case 'chin_ups':
    case 'chest_to_bar':
      return { mode: 'pullup', activeMuscles: ['back', 'biceps'], accentHex: '#E5A3BD' };
    case 'pushups_classic':
    case 'diamond_pushups':
      return { mode: 'pushup', activeMuscles: ['chest', 'shoulders', 'core'], accentHex: '#E5A3BD' };
    case 'parallel_dips':
      return { mode: 'dips', activeMuscles: ['chest', 'shoulders'], accentHex: '#E5A3BD' };
    case 'dip_bar_l_sit':
      return { mode: 'l_sit', activeMuscles: ['core', 'shoulders'], accentHex: '#E5A3BD' };
    case 'plank_hold':
      return { mode: 'plank', activeMuscles: ['core', 'shoulders'], accentHex: '#E5A3BD' };
    case 'pistol_squat_prog':
      return { mode: 'squat', activeMuscles: ['legs', 'core'], accentHex: '#E5A3BD' };
    case 'barbell_squat':
      return { mode: 'barbell_squat', activeMuscles: ['legs', 'core'], accentHex: '#E5A3BD' };
    case 'dumbbell_press':
    case 'barbell_bench_press':
      return { mode: 'bench_press', activeMuscles: ['chest', 'shoulders'], accentHex: '#E5A3BD' };
    case 'kettlebell_swing':
      return { mode: 'kettlebell_swing', activeMuscles: ['legs', 'back', 'core'], accentHex: '#E5A3BD' };
    case 'bicep_curls':
      return { mode: 'bicep_curls', activeMuscles: ['biceps'], accentHex: '#E5A3BD' };
    case 'jump_rope':
      return { mode: 'jump_rope', activeMuscles: ['legs', 'core'], accentHex: '#8AE5C3' };
    case 'shadow_boxing':
      return { mode: 'shadow_boxing', activeMuscles: ['shoulders', 'core'], accentHex: '#8AE5C3' };
    case 'street_run_hiit':
      return { mode: 'run', activeMuscles: ['legs', 'core'], accentHex: '#8AE5C3' };
    case 'burpee_blaster':
      return { mode: 'burpee', activeMuscles: ['legs', 'chest', 'core'], accentHex: '#8AE5C3' };
    case 'shoulder_warmup':
    case 'full_body_mobility':
    default:
      return { mode: 'mobility', activeMuscles: ['shoulders', 'back'], accentHex: '#A88CE8' };
  }
}

/**
 * Прозрачный голографический материал силуэта с мягкой градиентной обводкой (Fresnel)
 */
function createFresnelSilhouetteMaterial(
  rimColorTopHex: string,
  rimColorBottomHex: string,
  fillOpacity = 0.08
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uRimTop: { value: new THREE.Color(rimColorTopHex) },
      uRimBottom: { value: new THREE.Color(rimColorBottomHex) },
      uFillOpacity: { value: fillOpacity },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying float vLocalY;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        vLocalY = clamp((position.y + 0.5) * 1.1, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uRimTop;
      uniform vec3 uRimBottom;
      uniform float uFillOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying float vLocalY;
      void main() {
        float ndotv = clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0);
        float rim = pow(1.0 - ndotv, 2.15);
        vec3 gradColor = mix(uRimBottom, uRimTop, vLocalY);
        float alpha = clamp(uFillOpacity + rim * 0.88, 0.0, 0.94);
        gl_FragColor = vec4(gradColor * (0.45 + rim * 0.95), alpha);
      }
    `,
  });
}

/**
 * Материал подсвеченных анатомических мышц внутри прозрачного силуэта
 */
function createMuscleMaterial(
  colorHex: string,
  isActive: boolean
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: isActive ? 0.82 : 0.2 },
      uPulse: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPulse;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float ndotv = clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0);
        float coreGlow = pow(ndotv, 0.75) * 0.55 + pow(1.0 - ndotv, 1.8) * 0.65;
        float alpha = clamp(coreGlow * uIntensity * uPulse, 0.0, 0.88);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

interface HumanRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  leftHandAnchor: THREE.Group;
  rightHandAnchor: THREE.Group;
  activeMuscleMaterials: THREE.ShaderMaterial[];
}

function createLatheLimb(
  profile: [number, number][],
  mat: THREE.Material,
  scaleX = 1,
  scaleZ = 1
): THREE.Mesh {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.scale(scaleX, 1, scaleZ);
  return new THREE.Mesh(geo, mat);
}

function buildHumanSilhouette(
  accentHex: string,
  activeMuscles: MuscleZone[]
): HumanRig {
  const isFemale = false;
  const root = new THREE.Group();

  const shellMat = createFresnelSilhouetteMaterial('#F2F4F8', accentHex, 0.07);
  const activeSet = new Set<MuscleZone>(activeMuscles);

  const muscleMats: Record<MuscleZone, THREE.ShaderMaterial> = {
    back: createMuscleMaterial(accentHex, activeSet.has('back')),
    biceps: createMuscleMaterial(accentHex, activeSet.has('biceps')),
    chest: createMuscleMaterial(accentHex, activeSet.has('chest')),
    shoulders: createMuscleMaterial(accentHex, activeSet.has('shoulders')),
    core: createMuscleMaterial(accentHex, activeSet.has('core')),
    legs: createMuscleMaterial(accentHex, activeSet.has('legs')),
  };

  const activeMuscleMaterials = activeMuscles.map((z) => muscleMats[z]);

  const addMuscle = (
    parent: THREE.Object3D,
    zone: MuscleZone,
    pos: [number, number, number],
    scale: [number, number, number],
    rot: [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 14), muscleMats[zone]);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(mesh);
  };

  // Pelvis & sculpted hips
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  root.add(pelvis);

  const hipWidth = isFemale ? 1.14 : 0.98;
  const pelvisShell = createLatheLimb(
    [
      [0.01, -0.1],
      [0.125, -0.07],
      [0.145, 0.0],
      [0.125, 0.08],
      [0.01, 0.1],
    ],
    shellMat,
    hipWidth,
    0.72
  );
  pelvis.add(pelvisShell);

  // Sculpted glutes (subtle athletic curve)
  [-1, 1].forEach((s) => {
    addMuscle(
      pelvis,
      'legs',
      [s * (isFemale ? 0.085 : 0.075), -0.02, -0.065],
      [isFemale ? 0.072 : 0.062, 0.078, isFemale ? 0.07 : 0.056]
    );
  });

  // Torso (organic sculpted lathe profile — V-taper for male, hourglass athletic for female)
  const torso = new THREE.Group();
  torso.position.set(0, 0.06, 0);
  pelvis.add(torso);

  const torsoProfile: [number, number][] = isFemale
    ? [
        [0.01, -0.01],
        [0.115, 0.02],
        [0.102, 0.14], // tapered waist
        [0.125, 0.27],
        [0.148, 0.38], // upper chest
        [0.132, 0.46],
        [0.055, 0.50],
        [0.01, 0.51],
      ]
    : [
        [0.01, -0.01],
        [0.126, 0.02],
        [0.13, 0.15],
        [0.158, 0.30], // lats / ribcage
        [0.178, 0.41], // broad athletic shoulders
        [0.152, 0.47],
        [0.065, 0.51],
        [0.01, 0.52],
      ];

  const torsoShell = createLatheLimb(torsoProfile, shellMat, isFemale ? 1.04 : 1.15, 0.68);
  torso.add(torsoShell);

  // Internal anatomical muscles inside torso:
  // 1. Pectorals (chest)
  [-1, 1].forEach((s) => {
    addMuscle(
      torso,
      'chest',
      [s * (isFemale ? 0.068 : 0.082), 0.34, isFemale ? 0.082 : 0.075],
      [isFemale ? 0.062 : 0.078, isFemale ? 0.055 : 0.06, isFemale ? 0.052 : 0.042]
    );
  });
  // 2. Lats & Upper Back (back)
  [-1, 1].forEach((s) => {
    addMuscle(
      torso,
      'back',
      [s * (isFemale ? 0.085 : 0.108), 0.31, -0.065],
      [isFemale ? 0.065 : 0.082, 0.135, 0.046],
      [0, 0, s * -0.18]
    );
  });
  // 3. Abdominals / Core (4-pack sculpted segments)
  [0.1, 0.18, 0.25].forEach((yPos) => {
    [-1, 1].forEach((s) => {
      addMuscle(torso, 'core', [s * 0.036, yPos, 0.074], [0.032, 0.034, 0.024]);
    });
  });

  // Neck & sculpted human head
  const head = new THREE.Group();
  head.position.set(0, 0.51, 0);
  torso.add(head);

  const neckShell = createLatheLimb(
    [
      [0.052, -0.02],
      [0.044, 0.04],
      [0.046, 0.09],
    ],
    shellMat,
    isFemale ? 0.88 : 1.0,
    0.95
  );
  head.add(neckShell);

  const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.102, 22, 22), shellMat);
  headShell.position.set(0, 0.165, 0.012);
  headShell.scale.set(0.86, 1.12, 0.96);
  head.add(headShell);

  // Subtle ponytail contour for female silhouette so gender toggle reads unmistakably from side profile!
  if (isFemale) {
    const ponytail = createLatheLimb(
      [
        [0.02, 0.0],
        [0.042, -0.06],
        [0.032, -0.15],
        [0.008, -0.23],
      ],
      shellMat
    );
    ponytail.position.set(0, 0.17, -0.1);
    ponytail.rotation.x = 0.28;
    head.add(ponytail);
  }

  // Arms (smooth organic tapering — deltoid -> bicep/tricep -> forearm -> hand)
  const shoulderX = isFemale ? 0.185 : 0.228;
  const armScale = isFemale ? 0.84 : 1.02;

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 0.43, 0);
    torso.add(shoulder);

    // Sculpted deltoid cap
    const deltShell = new THREE.Mesh(new THREE.SphereGeometry(0.064 * armScale, 16, 16), shellMat);
    deltShell.scale.set(1.0, 1.12, 0.98);
    shoulder.add(deltShell);
    addMuscle(shoulder, 'shoulders', [side * 0.01, 0.005, 0], [0.052 * armScale, 0.062 * armScale, 0.052 * armScale]);

    // Upper arm shell
    const upperArm = createLatheLimb(
      [
        [0.038 * armScale, -0.28],
        [0.048 * armScale, -0.16],
        [0.054 * armScale, -0.06],
        [0.048 * armScale, 0.0],
      ],
      shellMat
    );
    shoulder.add(upperArm);

    // Bicep & Tricep internal muscle volumes
    addMuscle(shoulder, 'biceps', [0, -0.14, 0.022 * armScale], [0.034 * armScale, 0.088, 0.036 * armScale]);
    addMuscle(shoulder, 'biceps', [0, -0.13, -0.02 * armScale], [0.032 * armScale, 0.082, 0.03 * armScale]);

    // Forearm
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    const forearm = createLatheLimb(
      [
        [0.026 * armScale, -0.25],
        [0.036 * armScale, -0.12],
        [0.041 * armScale, -0.03],
        [0.036 * armScale, 0.01],
      ],
      shellMat
    );
    elbow.add(forearm);

    const handAnchor = new THREE.Group();
    handAnchor.position.set(0, -0.26, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035 * armScale, 12, 12), shellMat);
    hand.scale.set(0.85, 1.25, 0.6);
    handAnchor.add(hand);
    elbow.add(handAnchor);

    return { shoulder, elbow, handAnchor };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Legs (smooth organic quads/hamstrings -> calves -> foot)
  const legX = isFemale ? 0.105 : 0.102;
  const thighScale = isFemale ? 0.98 : 1.02;

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * legX, -0.04, 0);
    pelvis.add(hip);

    const thigh = createLatheLimb(
      [
        [0.052 * thighScale, -0.42],
        [0.068 * thighScale, -0.24],
        [0.082 * thighScale, -0.08],
        [0.074 * thighScale, 0.02],
      ],
      shellMat,
      0.96,
      1.04
    );
    hip.add(thigh);

    // Quad & Hamstring internal muscles
    addMuscle(hip, 'legs', [0, -0.21, 0.026], [0.05 * thighScale, 0.145, 0.048]);
    addMuscle(hip, 'legs', [0, -0.22, -0.025], [0.046 * thighScale, 0.135, 0.042]);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    const shin = createLatheLimb(
      [
        [0.032, -0.41],
        [0.042, -0.28],
        [0.056, -0.14], // sculpted calf
        [0.048, -0.02],
        [0.046, 0.01],
      ],
      shellMat
    );
    knee.add(shin);

    // Calf internal muscle
    addMuscle(knee, 'legs', [0, -0.15, -0.022], [0.036, 0.095, 0.034]);

    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.11, 6, 12), shellMat);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.42, 0.05);
    knee.add(foot);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    pelvis,
    torso,
    head,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    leftHandAnchor: leftArm.handAnchor,
    rightHandAnchor: rightArm.handAnchor,
    activeMuscleMaterials,
  };
}

function resetRig(rig: HumanRig) {
  rig.pelvis.position.set(0, 0.94, 0);
  rig.pelvis.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftShoulder.rotation.set(0, 0, 0);
  rig.rightShoulder.rotation.set(0, 0, 0);
  rig.leftElbow.rotation.set(0, 0, 0);
  rig.rightElbow.rotation.set(0, 0, 0);
  rig.leftHip.rotation.set(0, 0, 0);
  rig.rightHip.rotation.set(0, 0, 0);
  rig.leftKnee.rotation.set(0, 0, 0);
  rig.rightKnee.rotation.set(0, 0, 0);
}

export const ExerciseAnimationSvg: React.FC<ExerciseAnimationSvgProps> = ({
  exerciseId,
  className = 'w-full h-48',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { mode, activeMuscles, accentHex } = resolveArchetype(exerciseId);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111215);

    const width = Math.max(160, container.clientWidth);
    const height = Math.max(120, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);

    // Side-profile dominant view (~74 degrees from front)
    let orbitYaw = 1.29;
    let isDragging = false;
    let lastX = 0;

    const isBarMode =
      mode === 'pullup' ||
      mode === 'pullup_wide' ||
      mode === 'pullup_negative' ||
      mode === 'muscle_up' ||
      mode === 'dead_hang' ||
      mode === 'scapular_pulls' ||
      mode === 'hanging_knee_raises';

    const isFloorMode = mode === 'pushup' || mode === 'plank' || mode === 'bench_press';
    const targetY = isBarMode ? 1.38 : isFloorMode ? 0.52 : 1.0;
    const camDist = isBarMode ? 3.5 : isFloorMode ? 3.0 : 3.2;
    const camHeight = isBarMode ? 1.52 : isFloorMode ? 0.88 : 1.22;

    const updateCamera = () => {
      camera.position.set(
        Math.sin(orbitYaw) * camDist,
        camHeight,
        Math.cos(orbitYaw) * camDist
      );
      camera.lookAt(0, targetY, 0);
    };
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle studio lighting for equipment & floor
    const hemi = new THREE.HemisphereLight(0xf3f4f6, 0x1a1b20, 1.0);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(3, 5, 2.5);
    scene.add(dirLight);

    // Subtle dark floor grid
    const grid = new THREE.GridHelper(4.0, 14, 0x262830, 0x1b1c22);
    grid.position.y = 0.004;
    scene.add(grid);

    // Build translucent Fresnel human silhouette + visible internal muscles
    const rig = buildHumanSilhouette(accentHex, activeMuscles);
    scene.add(rig.root);

    // Minimal 3D Equipment
    const equipMat = new THREE.MeshStandardMaterial({
      color: 0x2e3038,
      roughness: 0.45,
      metalness: 0.55,
    });
    const accentEquipMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentHex),
      roughness: 0.35,
      metalness: 0.45,
    });

    let dynamicWeight: THREE.Group | null = null;

    if (isBarMode) {
      const barY = 2.22;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.35, 16),
        accentEquipMat
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, barY, 0);
      scene.add(bar);

      [-0.65, 0.65].forEach((x) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, barY, 12), equipMat);
        post.position.set(x, barY / 2, 0);
        scene.add(post);
      });
    } else if (mode === 'australian_pullups') {
      const barY = 1.05;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.25, 16),
        accentEquipMat
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, barY, 0.15);
      scene.add(bar);

      [-0.6, 0.6].forEach((x) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, barY, 12), equipMat);
        post.position.set(x, barY / 2, 0.15);
        scene.add(post);
      });
    } else if (mode === 'dips' || mode === 'l_sit') {
      [-0.26, 0.26].forEach((x) => {
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1.15, 14),
          accentEquipMat
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.set(x, 1.12, 0);
        scene.add(rail);

        [-0.5, 0.5].forEach((z) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.12, 12), equipMat);
          leg.position.set(x, 0.56, z);
          scene.add(leg);
        });
      });
    } else if (mode === 'bench_press') {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 1.25), equipMat);
      pad.position.set(0, 0.44, 0.08);
      scene.add(pad);
      [-0.4, 0.5].forEach((z) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.06), equipMat);
        leg.position.set(0, 0.21, z);
        scene.add(leg);
      });

      const barGroup = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 12), equipMat);
      rod.rotation.z = Math.PI / 2;
      barGroup.add(rod);
      [-0.52, 0.52].forEach((x) => {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.036, 18),
          accentEquipMat
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.x = x;
        barGroup.add(plate);
      });
      scene.add(barGroup);
      dynamicWeight = barGroup;
    } else if (mode === 'barbell_squat') {
      const barGroup = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 12), equipMat);
      rod.rotation.z = Math.PI / 2;
      barGroup.add(rod);
      [-0.58, 0.58].forEach((x) => {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.036, 18),
          accentEquipMat
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.x = x;
        barGroup.add(plate);
      });
      barGroup.position.set(0, 0.47, -0.07);
      rig.torso.add(barGroup);
    } else if (mode === 'kettlebell_swing') {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), accentEquipMat);
      ball.position.y = -0.1;
      rig.rightHandAnchor.add(ball);
    } else if (mode === 'bicep_curls') {
      [rig.leftHandAnchor, rig.rightHandAnchor].forEach((anchor) => {
        const db = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12),
          accentEquipMat
        );
        db.rotation.z = Math.PI / 2;
        anchor.add(db);
      });
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      orbitYaw -= dx * 0.01;
      updateCamera();
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(160, container.clientWidth);
      const h = Math.max(120, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let animId = 0;
    const startTime = performance.now();

    const animate = (nowMs: number) => {
      animId = window.requestAnimationFrame(animate);
      const t = (nowMs - startTime) * 0.001;
      const wave = (speed = 2.4) => (1 - Math.cos(t * speed)) * 0.5;

      // Subtle living pulse on active working muscles
      const musclePulse = 0.82 + 0.36 * wave(2.4);
      for (const m of rig.activeMuscleMaterials) {
        m.uniforms.uPulse.value = musclePulse;
      }

      resetRig(rig);

      switch (mode) {
        case 'pullup':
        case 'pullup_wide':
        case 'pullup_negative':
        case 'muscle_up': {
          let p = wave(2.2);
          let jumpKneeTuck = 0;

          if (mode === 'pullup_negative') {
            // Плавный 4-фазный цикл без рывков и телепортаций:
            // 0.00-0.18: плавный запрыг вверх
            // 0.18-0.28: фиксация подбородка над турником
            // 0.28-0.88: медленное плавное опускание (4 сек)
            // 0.88-1.00: короткая пауза внизу
            const cycle = (t / 4.8) % 1;
            if (cycle < 0.18) {
              p = smoothstep(0.0, 0.18, cycle);
              jumpKneeTuck = Math.sin((cycle / 0.18) * Math.PI) * 0.55;
            } else if (cycle < 0.28) {
              p = 1;
            } else if (cycle < 0.88) {
              p = 1 - smoothstep(0.28, 0.88, cycle);
            } else {
              p = 0;
            }
          }

          const lift = mode === 'muscle_up' ? 0.62 : 0.44;
          const wideSpread = mode === 'pullup_wide' ? 0.34 : 0.12;

          rig.pelvis.position.set(0, 1.14 + p * lift, 0);
          rig.torso.rotation.x = -0.05 - p * 0.12;
          rig.leftShoulder.rotation.set(-Math.PI + p * 1.18, 0, -wideSpread - p * 0.3);
          rig.rightShoulder.rotation.set(-Math.PI + p * 1.18, 0, wideSpread + p * 0.3);
          rig.leftElbow.rotation.x = -p * 2.02;
          rig.rightElbow.rotation.x = -p * 2.02;
          rig.leftHip.rotation.x = -0.12 - p * 0.1 - jumpKneeTuck * 0.65;
          rig.rightHip.rotation.x = -0.12 - p * 0.1 - jumpKneeTuck * 0.65;
          rig.leftKnee.rotation.x = 0.38 + jumpKneeTuck;
          rig.rightKnee.rotation.x = 0.38 + jumpKneeTuck;
          break;
        }

        case 'dead_hang': {
          const b = wave(1.6);
          rig.pelvis.position.set(0, 1.14 - b * 0.03, 0);
          rig.leftShoulder.rotation.set(-Math.PI, 0, -0.09);
          rig.rightShoulder.rotation.set(-Math.PI, 0, 0.09);
          rig.leftKnee.rotation.x = 0.22;
          rig.rightKnee.rotation.x = 0.22;
          break;
        }

        case 'scapular_pulls': {
          const p = wave(2.5);
          rig.pelvis.position.set(0, 1.14 + p * 0.12, 0);
          rig.torso.rotation.x = -p * 0.12;
          rig.leftShoulder.rotation.set(-Math.PI + p * 0.18, 0, -0.1);
          rig.rightShoulder.rotation.set(-Math.PI + p * 0.18, 0, 0.1);
          rig.leftKnee.rotation.x = 0.22;
          rig.rightKnee.rotation.x = 0.22;
          break;
        }

        case 'hanging_knee_raises': {
          const p = wave(2.4);
          rig.pelvis.position.set(0, 1.14, 0);
          rig.leftShoulder.rotation.set(-Math.PI, 0, -0.09);
          rig.rightShoulder.rotation.set(-Math.PI, 0, 0.09);
          rig.torso.rotation.x = p * 0.12;
          rig.leftHip.rotation.x = -0.1 - p * 1.72;
          rig.rightHip.rotation.x = -0.1 - p * 1.72;
          rig.leftKnee.rotation.x = 0.2 + p * 1.32;
          rig.rightKnee.rotation.x = 0.2 + p * 1.32;
          break;
        }

        case 'australian_pullups': {
          const p = wave(2.4);
          rig.pelvis.position.set(0, 0.45 + p * 0.18, -0.12);
          rig.pelvis.rotation.x = -1.12;
          rig.leftShoulder.rotation.set(-1.55 + p * 1.08, 0, -0.14);
          rig.rightShoulder.rotation.set(-1.55 + p * 1.08, 0, 0.14);
          rig.leftElbow.rotation.x = -p * 1.65;
          rig.rightElbow.rotation.x = -p * 1.65;
          break;
        }

        case 'pushup': {
          const p = wave(2.5);
          rig.pelvis.position.set(0, 0.36 - p * 0.18, -0.05);
          rig.pelvis.rotation.x = 1.34 + p * 0.18;
          rig.head.rotation.x = -0.45;
          rig.leftShoulder.rotation.set(-1.35 + p * 0.72, 0, -0.2 - p * 0.35);
          rig.rightShoulder.rotation.set(-1.35 + p * 0.72, 0, 0.2 + p * 0.35);
          rig.leftElbow.rotation.x = -p * 1.55;
          rig.rightElbow.rotation.x = -p * 1.55;
          break;
        }

        case 'plank': {
          const b = wave(1.8);
          rig.pelvis.position.set(0, 0.28 + b * 0.018, -0.05);
          rig.pelvis.rotation.x = 1.48;
          rig.head.rotation.x = -0.35;
          rig.leftShoulder.rotation.set(-1.45, 0, -0.08);
          rig.rightShoulder.rotation.set(-1.45, 0, 0.08);
          rig.leftElbow.rotation.x = -1.45;
          rig.rightElbow.rotation.x = -1.45;
          break;
        }

        case 'dips': {
          const p = wave(2.4);
          rig.pelvis.position.set(0, 1.06 - p * 0.26, 0);
          rig.torso.rotation.x = 0.14 + p * 0.16;
          rig.leftShoulder.rotation.set(p * 0.85, 0, -0.14 - p * 0.14);
          rig.rightShoulder.rotation.set(p * 0.85, 0, 0.14 + p * 0.14);
          rig.leftElbow.rotation.x = -0.15 - p * 1.55;
          rig.rightElbow.rotation.x = -0.15 - p * 1.55;
          rig.leftKnee.rotation.x = 0.65;
          rig.rightKnee.rotation.x = 0.65;
          break;
        }

        case 'l_sit': {
          const b = wave(1.8);
          rig.pelvis.position.set(0, 1.04 + b * 0.02, 0);
          rig.leftShoulder.rotation.set(0.05, 0, -0.12);
          rig.rightShoulder.rotation.set(0.05, 0, 0.12);
          rig.leftHip.rotation.x = -1.52;
          rig.rightHip.rotation.x = -1.52;
          break;
        }

        case 'squat':
        case 'barbell_squat': {
          const p = wave(2.3);
          rig.pelvis.position.set(0, 0.94 - p * 0.36, -p * 0.16);
          rig.torso.rotation.x = p * 0.42;
          rig.leftHip.rotation.x = -p * 1.52;
          rig.rightHip.rotation.x = -p * 1.52;
          rig.leftKnee.rotation.x = p * 1.62;
          rig.rightKnee.rotation.x = p * 1.62;
          if (mode === 'barbell_squat') {
            rig.leftShoulder.rotation.set(-0.6, 0, -0.85);
            rig.rightShoulder.rotation.set(-0.6, 0, 0.85);
            rig.leftElbow.rotation.x = -1.7;
            rig.rightElbow.rotation.x = -1.7;
          } else {
            rig.leftShoulder.rotation.x = -p * 1.35;
            rig.rightShoulder.rotation.x = -p * 1.35;
          }
          break;
        }

        case 'bench_press': {
          const p = wave(2.5);
          rig.pelvis.position.set(0, 0.56, 0.15);
          rig.pelvis.rotation.x = -Math.PI / 2;
          rig.leftHip.rotation.x = 0.45;
          rig.rightHip.rotation.x = 0.45;
          rig.leftKnee.rotation.x = 1.25;
          rig.rightKnee.rotation.x = 1.25;
          rig.leftShoulder.rotation.set(-1.5 + (1 - p) * 0.55, 0, -0.35 - (1 - p) * 0.45);
          rig.rightShoulder.rotation.set(-1.5 + (1 - p) * 0.55, 0, 0.35 + (1 - p) * 0.45);
          rig.leftElbow.rotation.x = -(1 - p) * 1.45;
          rig.rightElbow.rotation.x = -(1 - p) * 1.45;
          if (dynamicWeight) {
            dynamicWeight.position.set(0, 0.82 + p * 0.36, -0.22);
          }
          break;
        }

        case 'kettlebell_swing': {
          const p = wave(3.2);
          rig.pelvis.position.set(0, 0.92 - (1 - p) * 0.14, -(1 - p) * 0.12);
          rig.torso.rotation.x = (1 - p) * 0.68;
          rig.leftHip.rotation.x = -(1 - p) * 0.65;
          rig.rightHip.rotation.x = -(1 - p) * 0.65;
          rig.leftKnee.rotation.x = (1 - p) * 0.55;
          rig.rightKnee.rotation.x = (1 - p) * 0.55;
          rig.leftShoulder.rotation.x = 0.3 - p * 1.75;
          rig.rightShoulder.rotation.x = 0.3 - p * 1.75;
          break;
        }

        case 'bicep_curls': {
          const p = wave(2.4);
          rig.leftShoulder.rotation.x = 0.08;
          rig.rightShoulder.rotation.x = 0.08;
          rig.leftElbow.rotation.x = -0.25 - p * 1.95;
          rig.rightElbow.rotation.x = -0.25 - p * 1.95;
          break;
        }

        case 'jump_rope': {
          const hop = Math.abs(Math.sin(t * 6.5));
          rig.pelvis.position.y = 0.94 + hop * 0.16;
          rig.leftShoulder.rotation.set(0.25, 0, -0.25);
          rig.rightShoulder.rotation.set(0.25, 0, 0.25);
          rig.leftElbow.rotation.x = -1.05;
          rig.rightElbow.rotation.x = -1.05;
          rig.leftKnee.rotation.x = (1 - hop) * 0.25;
          rig.rightKnee.rotation.x = (1 - hop) * 0.25;
          break;
        }

        case 'shadow_boxing': {
          const s = Math.sin(t * 5.2);
          const lPunch = Math.max(0, s);
          const rPunch = Math.max(0, -s);
          rig.torso.rotation.y = (rPunch - lPunch) * 0.38;
          rig.leftShoulder.rotation.set(-0.85 - lPunch * 0.65, 0, -0.15);
          rig.rightShoulder.rotation.set(-0.85 - rPunch * 0.65, 0, 0.15);
          rig.leftElbow.rotation.x = -1.65 + lPunch * 1.45;
          rig.rightElbow.rotation.x = -1.65 + rPunch * 1.45;
          rig.leftHip.rotation.x = -0.2;
          rig.rightHip.rotation.x = 0.18;
          rig.leftKnee.rotation.x = 0.25;
          rig.rightKnee.rotation.x = 0.25;
          break;
        }

        case 'run': {
          const s = Math.sin(t * 7.5);
          rig.pelvis.position.y = 0.94 + Math.abs(Math.cos(t * 7.5)) * 0.08;
          rig.torso.rotation.x = 0.16;
          rig.leftHip.rotation.x = s * 0.82;
          rig.rightHip.rotation.x = -s * 0.82;
          rig.leftKnee.rotation.x = Math.max(0.15, -s * 1.15 + 0.55);
          rig.rightKnee.rotation.x = Math.max(0.15, s * 1.15 + 0.55);
          rig.leftShoulder.rotation.x = -s * 0.75;
          rig.rightShoulder.rotation.x = s * 0.75;
          rig.leftElbow.rotation.x = -1.25;
          rig.rightElbow.rotation.x = -1.25;
          break;
        }

        case 'burpee': {
          const p = wave(2.6);
          rig.pelvis.position.y = 0.94 - p * 0.45 + (1 - p) * 0.12;
          rig.torso.rotation.x = p * 0.65;
          rig.leftHip.rotation.x = -p * 1.45;
          rig.rightHip.rotation.x = -p * 1.45;
          rig.leftKnee.rotation.x = p * 1.55;
          rig.rightKnee.rotation.x = p * 1.55;
          rig.leftShoulder.rotation.x = -Math.PI + p * 2.4;
          rig.rightShoulder.rotation.x = -Math.PI + p * 2.4;
          break;
        }

        case 'mobility':
        default: {
          const p = wave(1.9);
          rig.torso.rotation.x = -0.05 + Math.sin(t * 1.9) * 0.12;
          rig.leftShoulder.rotation.set(-p * Math.PI * 0.92, 0, -0.25 - p * 0.2);
          rig.rightShoulder.rotation.set(-p * Math.PI * 0.92, 0, 0.25 + p * 0.2);
          break;
        }
      }

      renderer.render(scene, camera);
    };

    animId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [exerciseId]);

  return (
    <div
      className={`relative rounded-[18px] bg-[#111215] border border-white/[0.06] overflow-hidden select-none ${className}`}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
