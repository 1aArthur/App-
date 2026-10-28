import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Lane, Obstacle, Coin, PowerUpItem, ActivePowerUps } from '../types/game';

// Lane positions along the X axis
export const LANE_WIDTH = 3.2;
export const LANE_COORDS: Record<Lane, number> = {
  [-1]: -LANE_WIDTH,
  [0]: 0,
  [1]: LANE_WIDTH,
};

// Module-scope reusable math objects for Zero Garbage Collection in loop
const _vec3_player = new THREE.Vector3();
const _vec3_temp = new THREE.Vector3();
const _box_player = new THREE.Box3();
const _box_obs = new THREE.Box3();

export class ThreeRunnerScene {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();
  private isSoftwareGl: boolean = false;
  private animationFrameId: number = 0;

  // Scene elements
  private playerGroup!: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerHead!: THREE.Mesh;
  private playerLegL!: THREE.Mesh;
  private playerLegR!: THREE.Mesh;
  private hoverboardMesh!: THREE.Group;
  private tracksGroup!: THREE.Group;
  private obstaclesGroup!: THREE.Group;
  private coinsGroup!: THREE.Group;
  private powerUpsGroup!: THREE.Group;
  private environmentGroup!: THREE.Group;
  private speedLinesGroup!: THREE.Points;

  // Materials & Geometries cache for reusability
  private coinGeometry!: THREE.CylinderGeometry;
  private coinMaterial!: THREE.MeshStandardMaterial;
  private trainBodyMaterial!: THREE.MeshStandardMaterial;
  private graffitiMaterial!: THREE.MeshBasicMaterial;

  // Game internal state
  private currentLane: Lane = 0;
  private targetX: number = 0;
  private currentX: number = 0;
  private playerY: number = 0;
  private playerVY: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private runAnimTime: number = 0;
  private speed: number = 28; // Forward track speed units/sec
  private trackDistance: number = 0;

  // Active game entities lists
  private obstacles: Obstacle[] = [];
  private obstacleMeshes: Map<number, THREE.Object3D> = new Map();
  private coins: Coin[] = [];
  private coinMeshes: Map<number, THREE.Object3D> = new Map();
  private powerUps: PowerUpItem[] = [];
  private powerUpMeshes: Map<number, THREE.Object3D> = new Map();

  // Callbacks
  private onCoinCollect?: (coinId: number) => void;
  private onPowerUpCollect?: (type: string) => void;
  private onCrash?: (obstacleType: string) => void;

  private activePowerUps: ActivePowerUps = {
    hoverboardRemaining: 0,
    magnetRemaining: 0,
    multiplierRemaining: 0,
  };

  private nextEntityId: number = 1;
  private nextSpawnZ: number = -40;

  constructor(container: HTMLElement) {
    this.container = container;
    this.detectSoftwareGl();
    this.initScene();
    this.initPlayer();
    this.initTracks();
    this.initSpeedLines();
    this.setupResizeHandler();
  }

  private detectSoftwareGl() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
        this.isSoftwareGl = true;
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = false;
    }
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);

    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 300);
    // Camera behind and slightly above player
    this.camera.position.set(0, 4.2, 7.5);
    this.camera.lookAt(0, 1.8, -12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Procedural Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback ambient
    }

    // Studio Lighting Rig
    const ambientLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.9);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(10, 20, 15);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.camera.left = -15;
      keyLight.shadow.camera.right = 15;
      keyLight.shadow.camera.top = 20;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    // Groups
    this.tracksGroup = new THREE.Group();
    this.obstaclesGroup = new THREE.Group();
    this.coinsGroup = new THREE.Group();
    this.powerUpsGroup = new THREE.Group();
    this.environmentGroup = new THREE.Group();

    this.scene.add(this.tracksGroup);
    this.scene.add(this.obstaclesGroup);
    this.scene.add(this.coinsGroup);
    this.scene.add(this.powerUpsGroup);
    this.scene.add(this.environmentGroup);

    // Initialize Shared Procedural Materials
    this.initSharedMaterials();
  }

  private initSharedMaterials() {
    this.coinGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16);
    this.coinGeometry.rotateX(Math.PI / 2);

    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.92,
      roughness: 0.22,
      emissive: 0xd97706,
      emissiveIntensity: 0.2,
    });

    this.trainBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.75,
      roughness: 0.35,
    });

    // Procedural graffiti canvas texture
    const graffitiCanvas = document.createElement('canvas');
    graffitiCanvas.width = 512;
    graffitiCanvas.height = 128;
    const gctx = graffitiCanvas.getContext('2d');
    if (gctx) {
      gctx.fillStyle = '#1e293b';
      gctx.fillRect(0, 0, 512, 128);

      // Colorful street tag
      gctx.font = 'bold 44px sans-serif';
      gctx.fillStyle = '#ef4444';
      gctx.fillText('VELOCITY', 20, 60);

      gctx.font = 'bold 32px monospace';
      gctx.fillStyle = '#06b6d4';
      gctx.fillText('8000Hz', 280, 56);

      gctx.strokeStyle = '#f59e0b';
      gctx.lineWidth = 4;
      gctx.beginPath();
      gctx.moveTo(15, 78);
      gctx.lineTo(490, 78);
      gctx.stroke();

      gctx.font = 'italic 20px sans-serif';
      gctx.fillStyle = '#a855f7';
      gctx.fillText('RAPID TRIGGER // LOW-LATENCY', 25, 110);
    }
    const graffitiTexture = new THREE.CanvasTexture(graffitiCanvas);
    graffitiTexture.colorSpace = THREE.SRGBColorSpace;
    this.graffitiMaterial = new THREE.MeshBasicMaterial({
      map: graffitiTexture,
      transparent: true,
    });
  }

  // 3D Procedural Runner Character (3-12 parts)
  private initPlayer() {
    this.playerGroup = new THREE.Group();

    // 1. Torso / Urban Hoodie
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.1, 0.55);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // vibrant metro blue
      roughness: 0.5,
      metalness: 0.1,
    });
    this.playerBody = new THREE.Mesh(bodyGeo, bodyMat);
    this.playerBody.position.y = 1.25;
    this.playerBody.castShadow = !this.isSoftwareGl;
    this.playerGroup.add(this.playerBody);

    // 2. Head with Cap
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfbcfe8, // skin tone
      roughness: 0.7,
    });
    this.playerHead = new THREE.Mesh(headGeo, headMat);
    this.playerHead.position.set(0, 2.05, 0);
    this.playerHead.castShadow = !this.isSoftwareGl;

    // Cap Visor
    const visorGeo = new THREE.BoxGeometry(0.52, 0.15, 0.35);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const capVisor = new THREE.Mesh(visorGeo, capMat);
    capVisor.position.set(0, 0.15, -0.28);
    this.playerHead.add(capVisor);
    this.playerGroup.add(this.playerHead);

    // 3. Legs & Sneakers
    const legGeo = new THREE.BoxGeometry(0.28, 0.8, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    this.playerLegL = new THREE.Mesh(legGeo, legMat);
    this.playerLegL.position.set(-0.25, 0.4, 0);
    this.playerLegL.castShadow = !this.isSoftwareGl;

    this.playerLegR = new THREE.Mesh(legGeo, legMat);
    this.playerLegR.position.set(0.25, 0.4, 0);
    this.playerLegR.castShadow = !this.isSoftwareGl;

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.32, 0.22, 0.48);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, -0.35, 0.08);
    this.playerLegL.add(shoeL);

    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, -0.35, 0.08);
    this.playerLegR.add(shoeR);

    this.playerGroup.add(this.playerLegL);
    this.playerGroup.add(this.playerLegR);

    // 4. Hoverboard (mounted when powerup active)
    this.hoverboardMesh = new THREE.Group();
    const boardGeo = new THREE.BoxGeometry(1.2, 0.1, 2.2);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    this.hoverboardMesh.add(board);

    // Neon underglow strip
    const neonGeo = new THREE.BoxGeometry(1.0, 0.05, 2.0);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.y = -0.06;
    this.hoverboardMesh.add(neon);

    this.hoverboardMesh.position.set(0, -0.1, 0);
    this.hoverboardMesh.visible = false;
    this.playerGroup.add(this.hoverboardMesh);

    // Contact Grounding Shadow Disc
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.playerGroup.add(shadow);

    this.scene.add(this.playerGroup);
  }

  // Metro Railway Tracks
  private initTracks() {
    // Bed ballast
    const groundGeo = new THREE.PlaneGeometry(24, 400);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = !this.isSoftwareGl;
    this.tracksGroup.add(ground);

    // 3 pairs of steel rails
    const railGeo = new THREE.BoxGeometry(0.12, 0.18, 400);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.18,
    });

    [-1, 0, 1].forEach((laneIndex) => {
      const centerX = laneIndex * LANE_WIDTH;
      // Left rail of track
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(centerX - 0.9, 0.1, 0);
      railL.receiveShadow = !this.isSoftwareGl;
      this.tracksGroup.add(railL);

      // Right rail of track
      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(centerX + 0.9, 0.1, 0);
      railR.receiveShadow = !this.isSoftwareGl;
      this.tracksGroup.add(railR);
    });

    // Wooden sleepers / crossties (instanced or repeating along Z)
    const tieGeo = new THREE.BoxGeometry(2.4, 0.1, 0.45);
    const tieMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.8,
    });
    const tieCount = 160;
    const instancedTies = new THREE.InstancedMesh(tieGeo, tieMat, tieCount * 3);
    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < tieCount; i++) {
      const z = -200 + i * 2.5;
      [-1, 0, 1].forEach((laneIndex) => {
        dummy.position.set(laneIndex * LANE_WIDTH, 0.05, z);
        dummy.updateMatrix();
        instancedTies.setMatrixAt(idx++, dummy.matrix);
      });
    }
    instancedTies.instanceMatrix.needsUpdate = true;
    instancedTies.receiveShadow = !this.isSoftwareGl;
    this.tracksGroup.add(instancedTies);

    // Metro Tunnel / Canyon Walls with Graffiti
    const wallGeo = new THREE.BoxGeometry(1.2, 12, 400);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.85,
    });

    const wallLeft = new THREE.Mesh(wallGeo, wallMat);
    wallLeft.position.set(-8.5, 6, 0);
    this.tracksGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(wallGeo, wallMat);
    wallRight.position.set(8.5, 6, 0);
    this.tracksGroup.add(wallRight);

    // Gantry signal overhead arches
    for (let z = -20; z > -360; z -= 45) {
      this.createGantry(z);
    }
  }

  private createGantry(z: number) {
    const gantry = new THREE.Group();
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.4,
    });

    // Horizontal truss
    const hBeam = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 0.5), beamMat);
    hBeam.position.set(0, 7.5, 0);
    gantry.add(hBeam);

    // Pillars
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.5, 0.5), beamMat);
    pL.position.set(-8.2, 3.75, 0);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.5, 0.5), beamMat);
    pR.position.set(8.2, 3.75, 0);
    gantry.add(pL);
    gantry.add(pR);

    // Signal lights for each track
    [-1, 0, 1].forEach((lane) => {
      const signalBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      signalBox.position.set(lane * LANE_WIDTH, 7.0, 0);

      const lampGreen = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      lampGreen.position.set(0, 0.15, 0.18);
      signalBox.add(lampGreen);

      gantry.add(signalBox);
    });

    gantry.position.z = z;
    this.environmentGroup.add(gantry);
  }

  // Speed lines particle effect for high velocity feedback
  private initSpeedLines() {
    const lineCount = 120;
    const positions = new Float32Array(lineCount * 3);
    for (let i = 0; i < lineCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 8 + 0.5;
      positions[i * 3 + 2] = -Math.random() * 80;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
    });

    this.speedLinesGroup = new THREE.Points(geo, mat);
    this.scene.add(this.speedLinesGroup);
  }

  // Create 3D Metro Train Model (Composite 3-12 parts)
  private createTrainMesh(isMoving: boolean): THREE.Group {
    const train = new THREE.Group();

    // 1. Main Train Body
    const bodyGeo = new THREE.BoxGeometry(2.4, 3.2, 16);
    const body = new THREE.Mesh(bodyGeo, this.trainBodyMaterial);
    body.position.y = 1.9;
    body.castShadow = !this.isSoftwareGl;
    body.receiveShadow = !this.isSoftwareGl;
    train.add(body);

    // 2. Metro Blue / Red Accent Stripe
    const stripeGeo = new THREE.BoxGeometry(2.45, 0.45, 16.02);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: isMoving ? 0xef4444 : 0x0284c7,
      roughness: 0.3,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 1.8;
    train.add(stripe);

    // 3. Cabin Windshield
    const windshieldGeo = new THREE.BoxGeometry(2.2, 1.1, 0.2);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.1,
      metalness: 0.9,
    });
    const frontWindshield = new THREE.Mesh(windshieldGeo, glassMat);
    frontWindshield.position.set(0, 2.5, 8.01);
    train.add(frontWindshield);

    // 4. Twin Headlights with Emissive Glow
    const lightGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xfef08a,
      emissiveIntensity: 1.5,
    });
    const lightL = new THREE.Mesh(lightGeo, lightMat);
    lightL.position.set(-0.75, 1.0, 8.02);
    const lightR = new THREE.Mesh(lightGeo, lightMat);
    lightR.position.set(0.75, 1.0, 8.02);
    train.add(lightL);
    train.add(lightR);

    // 5. Graffiti side plane
    const grafGeo = new THREE.PlaneGeometry(8, 2);
    grafGeo.rotateY(Math.PI / 2);
    const graf = new THREE.Mesh(grafGeo, this.graffitiMaterial);
    graf.position.set(1.22, 2.0, 0);
    train.add(graf);

    // 6. Rooftop Air Conditioning unit
    const acGeo = new THREE.BoxGeometry(1.6, 0.4, 6);
    const ac = new THREE.Mesh(acGeo, this.trainBodyMaterial);
    ac.position.set(0, 3.65, 0);
    train.add(ac);

    return train;
  }

  // Create Low Barrier (Jump over)
  private createLowBarrierMesh(): THREE.Group {
    const group = new THREE.Group();
    // Metal Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.4,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 0.3), frameMat);
    bar.position.y = 1.0;
    group.add(bar);

    // Striped warning sign
    const signGeo = new THREE.BoxGeometry(2.4, 0.6, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 0.65;
    group.add(sign);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.18, 1.2, 0.5);
    const legL = new THREE.Mesh(legGeo, frameMat);
    legL.position.set(-1.15, 0.6, 0);
    const legR = new THREE.Mesh(legGeo, frameMat);
    legR.position.set(1.15, 0.6, 0);
    group.add(legL);
    group.add(legR);

    return group;
  }

  // Create High Barrier (Slide under)
  private createHighBarrierMesh(): THREE.Group {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.4,
    });

    // High beam
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.4), frameMat);
    topBar.position.y = 2.4;
    group.add(topBar);

    // Warning stripes decal plate
    const warningPlate = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 })
    );
    warningPlate.position.y = 2.4;
    group.add(warningPlate);

    // Tall side pillars
    const legGeo = new THREE.BoxGeometry(0.25, 2.7, 0.4);
    const legL = new THREE.Mesh(legGeo, frameMat);
    legL.position.set(-1.2, 1.35, 0);
    const legR = new THREE.Mesh(legGeo, frameMat);
    legR.position.set(1.2, 1.35, 0);
    group.add(legL);
    group.add(legR);

    return group;
  }

  // Create PowerUp Item 3D Mesh
  private createPowerUpMesh(type: string): THREE.Group {
    const group = new THREE.Group();

    if (type === 'hoverboard') {
      const bGeo = new THREE.BoxGeometry(0.8, 0.12, 1.4);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.5,
        metalness: 0.8,
      });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.y = 0.5;
      group.add(b);
    } else if (type === 'magnet') {
      const mGeo = new THREE.TorusGeometry(0.4, 0.12, 8, 16, Math.PI);
      const mMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.3,
        metalness: 0.7,
      });
      const m = new THREE.Mesh(mGeo, mMat);
      m.position.y = 0.6;
      m.rotation.z = Math.PI;
      group.add(m);
    } else {
      // 2X multiplier
      const badgeGeo = new THREE.OctahedronGeometry(0.5);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xc084fc,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.y = 0.6;
      group.add(badge);
    }

    // Floating animation anchor
    return group;
  }

  // Dynamic Spawner: Generates tracks, trains, barriers, and coin runs
  private spawnUpcomingEntities() {
    while (this.nextSpawnZ > -320) {
      const spawnZ = this.nextSpawnZ;
      const roll = Math.random();

      // Pick random lane
      const availableLanes: Lane[] = [-1, 0, 1];
      const blockedLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

      if (roll < 0.35) {
        // Spawn Train (static or moving)
        const isMoving = Math.random() > 0.45;
        const obstacle: Obstacle = {
          id: this.nextEntityId++,
          type: isMoving ? 'train_moving' : 'train_static',
          lane: blockedLane,
          z: spawnZ,
          speedZ: isMoving ? 14 : 0,
          width: 2.2,
          height: 3.2,
          depth: 15,
          passed: false,
        };
        this.obstacles.push(obstacle);

        const mesh = this.createTrainMesh(isMoving);
        mesh.position.set(LANE_COORDS[blockedLane], 0, spawnZ);
        this.obstaclesGroup.add(mesh);
        this.obstacleMeshes.set(obstacle.id, mesh);

        // Spawn coins on top of the train!
        for (let cz = spawnZ - 6; cz <= spawnZ + 6; cz += 2) {
          this.spawnCoin(blockedLane, cz, 3.8);
        }
      } else if (roll < 0.65) {
        // Spawn Low Barrier (Must jump)
        const obstacle: Obstacle = {
          id: this.nextEntityId++,
          type: 'barrier_low',
          lane: blockedLane,
          z: spawnZ,
          speedZ: 0,
          width: 2.3,
          height: 1.1,
          depth: 0.5,
          passed: false,
        };
        this.obstacles.push(obstacle);

        const mesh = this.createLowBarrierMesh();
        mesh.position.set(LANE_COORDS[blockedLane], 0, spawnZ);
        this.obstaclesGroup.add(mesh);
        this.obstacleMeshes.set(obstacle.id, mesh);

        // Arc of coins over the low barrier
        this.spawnCoin(blockedLane, spawnZ - 2, 1.2);
        this.spawnCoin(blockedLane, spawnZ, 2.4);
        this.spawnCoin(blockedLane, spawnZ + 2, 1.2);
      } else if (roll < 0.85) {
        // Spawn High Barrier (Must slide)
        const obstacle: Obstacle = {
          id: this.nextEntityId++,
          type: 'barrier_high',
          lane: blockedLane,
          z: spawnZ,
          speedZ: 0,
          width: 2.4,
          height: 2.2,
          depth: 0.5,
          passed: false,
        };
        this.obstacles.push(obstacle);

        const mesh = this.createHighBarrierMesh();
        mesh.position.set(LANE_COORDS[blockedLane], 0, spawnZ);
        this.obstaclesGroup.add(mesh);
        this.obstacleMeshes.set(obstacle.id, mesh);

        // Low sliding coins under high barrier
        this.spawnCoin(blockedLane, spawnZ, 0.4);
      }

      // Occasional power-up item in a free lane
      const otherLanes = availableLanes.filter((l) => l !== blockedLane);
      const freeLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];

      if (Math.random() < 0.18) {
        const pTypes: Array<'hoverboard' | 'magnet' | 'multiplier2x'> = ['hoverboard', 'magnet', 'multiplier2x'];
        const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
        this.spawnPowerUp(freeLane, spawnZ + 8, pType);
      } else {
        // Sequence of coins in the free lane
        for (let i = 0; i < 5; i++) {
          this.spawnCoin(freeLane, spawnZ + i * 2.2, 0.9);
        }
      }

      this.nextSpawnZ -= 28;
    }
  }

  private spawnCoin(lane: Lane, z: number, y: number) {
    const coin: Coin = {
      id: this.nextEntityId++,
      lane,
      z,
      y,
      collected: false,
    };
    this.coins.push(coin);

    const mesh = new THREE.Mesh(this.coinGeometry, this.coinMaterial);
    mesh.position.set(LANE_COORDS[lane], y, z);
    this.coinsGroup.add(mesh);
    this.coinMeshes.set(coin.id, mesh);
  }

  private spawnPowerUp(lane: Lane, z: number, type: 'hoverboard' | 'magnet' | 'multiplier2x') {
    const item: PowerUpItem = {
      id: this.nextEntityId++,
      type,
      lane,
      z,
      y: 1.1,
      collected: false,
    };
    this.powerUps.push(item);

    const mesh = this.createPowerUpMesh(type);
    mesh.position.set(LANE_COORDS[lane], 1.1, z);
    this.powerUpsGroup.add(mesh);
    this.powerUpMeshes.set(item.id, mesh);
  }

  // Immediate Input Actions (Sub-millisecond processing)
  public shiftLane(direction: 'left' | 'right') {
    if (direction === 'left' && this.currentLane > -1) {
      this.currentLane = (this.currentLane - 1) as Lane;
    } else if (direction === 'right' && this.currentLane < 1) {
      this.currentLane = (this.currentLane + 1) as Lane;
    }
    this.targetX = LANE_COORDS[this.currentLane];
  }

  public jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.playerVY = 14.5; // upward impulse
      if (this.isSliding) {
        this.isSliding = false;
        this.slideTimer = 0;
      }
    }
  }

  public slide() {
    this.isSliding = true;
    this.slideTimer = 0.65; // duration in seconds
    if (this.isJumping) {
      // Fast fall down
      this.playerVY = -18;
    }
  }

  // Update loop
  public update(delta: number, isPlaying: boolean): { distance: number; speed: number } {
    if (!isPlaying) {
      this.renderer.render(this.scene, this.camera);
      return { distance: this.trackDistance, speed: this.speed };
    }

    // Clamp delta to prevent jump glithes during tab switch
    const dt = Math.min(delta, 0.05);

    // Increase difficulty gradually
    this.speed = Math.min(54, 28 + Math.sqrt(this.trackDistance) * 0.45);
    const moveZ = this.speed * dt;
    this.trackDistance += moveZ;

    // 1. Instant Lane Transition with Spring Damping
    const switchSpeed = 24; // High responsiveness for 8000Hz keyboard
    this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * switchSpeed);

    // 2. Vertical Jump & Gravity Physics
    if (this.isJumping) {
      this.playerY += this.playerVY * dt;
      this.playerVY -= 38 * dt; // gravity

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVY = 0;
        this.isJumping = false;
      }
    }

    // 3. Sliding Physics & Hitbox
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 4. Update Player Mesh Transforms & Kinematics
    this.playerGroup.position.x = this.currentX;
    this.playerGroup.position.y = this.playerY;

    // Lean into turns for satisfying physical weight
    const laneDeltaX = this.targetX - this.currentX;
    this.playerGroup.rotation.z = -laneDeltaX * 0.12;

    // Running animation leg swing
    if (!this.isJumping && !this.isSliding) {
      this.runAnimTime += dt * (this.speed * 0.6);
      const legAngle = Math.sin(this.runAnimTime) * 0.6;
      this.playerLegL.rotation.x = legAngle;
      this.playerLegR.rotation.x = -legAngle;
      this.playerBody.position.y = 1.25 + Math.abs(Math.sin(this.runAnimTime * 2)) * 0.08;
    } else if (this.isSliding) {
      this.playerBody.position.y = 0.55;
      this.playerHead.position.y = 0.95;
      this.playerLegL.rotation.x = -Math.PI / 2.5;
      this.playerLegR.rotation.x = -Math.PI / 2.5;
    } else {
      // Jump pose
      this.playerLegL.rotation.x = 0.3;
      this.playerLegR.rotation.x = 0.3;
    }

    // Hoverboard visibility and rotation
    if (this.activePowerUps.hoverboardRemaining > 0) {
      this.hoverboardMesh.visible = true;
      this.hoverboardMesh.rotation.y += dt * 3;
    } else {
      this.hoverboardMesh.visible = false;
    }

    // 5. Decrement PowerUps timers
    if (this.activePowerUps.hoverboardRemaining > 0) {
      this.activePowerUps.hoverboardRemaining = Math.max(0, this.activePowerUps.hoverboardRemaining - dt);
    }
    if (this.activePowerUps.magnetRemaining > 0) {
      this.activePowerUps.magnetRemaining = Math.max(0, this.activePowerUps.magnetRemaining - dt);
    }
    if (this.activePowerUps.multiplierRemaining > 0) {
      this.activePowerUps.multiplierRemaining = Math.max(0, this.activePowerUps.multiplierRemaining - dt);
    }

    // 6. Camera Follow with gentle damping
    this.camera.position.x += (this.currentX * 0.6 - this.camera.position.x) * dt * 10;
    this.camera.position.y = 4.0 + (this.playerY > 1 ? (this.playerY - 1) * 0.5 : 0);

    // 7. Update Track Sleepers & Environment Illusion
    this.tracksGroup.position.z = (this.tracksGroup.position.z + moveZ) % 2.5;

    // 8. Move Obstacles & Check Collisions
    _vec3_player.set(this.currentX, this.playerY + 0.8, 0);
    const playerRadius = this.isSliding ? 0.35 : 0.6;
    const playerHeight = this.isSliding ? 0.9 : 2.1;

    _box_player.min.set(_vec3_player.x - 0.5, this.playerY, -0.6);
    _box_player.max.set(_vec3_player.x + 0.5, this.playerY + playerHeight, 0.6);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z += (moveZ + obs.speedZ * dt);

      const mesh = this.obstacleMeshes.get(obs.id);
      if (mesh) {
        mesh.position.z = obs.z;
      }

      // Check collision
      if (Math.abs(obs.z) < 12 && !obs.passed) {
        const obsX = LANE_COORDS[obs.lane];
        _box_obs.min.set(obsX - obs.width / 2, 0, obs.z - obs.depth / 2);
        _box_obs.max.set(obsX + obs.width / 2, obs.height, obs.z + obs.depth / 2);

        if (_box_player.intersectsBox(_box_obs)) {
          if (this.activePowerUps.hoverboardRemaining > 0) {
            // Shield absorbed collision!
            this.activePowerUps.hoverboardRemaining = 0;
            obs.passed = true;
            if (this.onPowerUpCollect) this.onPowerUpCollect('shield_break');
          } else {
            if (this.onCrash) this.onCrash(obs.type);
          }
        }
      }

      // Recycle obstacle if passed camera
      if (obs.z > 25) {
        obs.passed = true;
        if (mesh) {
          this.obstaclesGroup.remove(mesh);
          this.obstacleMeshes.delete(obs.id);
        }
        this.obstacles.splice(i, 1);
      }
    }

    // 9. Move Coins & Check Magnet or Direct Collection
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.z += moveZ;

      const mesh = this.coinMeshes.get(coin.id);
      if (mesh) {
        mesh.position.z = coin.z;
        mesh.rotation.y += dt * 4.5;

        // Magnet attraction
        if (this.activePowerUps.magnetRemaining > 0 && Math.abs(coin.z) < 18) {
          coin.y += (this.playerY + 1.0 - coin.y) * dt * 8;
          const targetCoinX = this.currentX;
          mesh.position.x += (targetCoinX - mesh.position.x) * dt * 10;
        }

        // Collection check
        const distZ = Math.abs(coin.z);
        const distX = Math.abs(mesh.position.x - this.currentX);
        const distY = Math.abs(coin.y - (this.playerY + 1.0));

        if (distZ < 1.4 && distX < 1.1 && distY < 1.5 && !coin.collected) {
          coin.collected = true;
          this.coinsGroup.remove(mesh);
          this.coinMeshes.delete(coin.id);
          this.coins.splice(i, 1);
          if (this.onCoinCollect) this.onCoinCollect(coin.id);
          continue;
        }
      }

      if (coin.z > 20) {
        if (mesh) {
          this.coinsGroup.remove(mesh);
          this.coinMeshes.delete(coin.id);
        }
        this.coins.splice(i, 1);
      }
    }

    // 10. Move Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.z += moveZ;

      const mesh = this.powerUpMeshes.get(p.id);
      if (mesh) {
        mesh.position.z = p.z;
        mesh.rotation.y += dt * 3;

        const distZ = Math.abs(p.z);
        const distX = Math.abs(LANE_COORDS[p.lane] - this.currentX);
        if (distZ < 1.5 && distX < 1.1 && !p.collected) {
          p.collected = true;
          this.activatePowerUp(p.type);
          this.powerUpsGroup.remove(mesh);
          this.powerUpMeshes.delete(p.id);
          this.powerUps.splice(i, 1);
          if (this.onPowerUpCollect) this.onPowerUpCollect(p.type);
          continue;
        }
      }

      if (p.z > 20) {
        if (mesh) {
          this.powerUpsGroup.remove(mesh);
          this.powerUpMeshes.delete(p.id);
        }
        this.powerUps.splice(i, 1);
      }
    }

    // 11. Animate Speed lines
    const pos = this.speedLinesGroup.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let z = pos.getZ(i);
      z += this.speed * 1.5 * dt;
      if (z > 5) z = -80 - Math.random() * 20;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;

    // 12. Spawn Next Wave
    this.spawnUpcomingEntities();

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    return { distance: this.trackDistance, speed: this.speed };
  }

  private activatePowerUp(type: string) {
    if (type === 'hoverboard') {
      this.activePowerUps.hoverboardRemaining = 15; // 15 seconds shield
    } else if (type === 'magnet') {
      this.activePowerUps.magnetRemaining = 12;
    } else if (type === 'multiplier2x') {
      this.activePowerUps.multiplierRemaining = 15;
    }
  }

  public getActivePowerUps(): ActivePowerUps {
    return { ...this.activePowerUps };
  }

  public setCallbacks(cbs: {
    onCoinCollect?: (coinId: number) => void;
    onPowerUpCollect?: (type: string) => void;
    onCrash?: (obstacleType: string) => void;
  }) {
    this.onCoinCollect = cbs.onCoinCollect;
    this.onPowerUpCollect = cbs.onPowerUpCollect;
    this.onCrash = cbs.onCrash;
  }

  public reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.currentX = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.speed = 28;
    this.trackDistance = 0;
    this.nextSpawnZ = -40;

    this.activePowerUps = {
      hoverboardRemaining: 0,
      magnetRemaining: 0,
      multiplierRemaining: 0,
    };

    // Clear meshes
    this.obstacleMeshes.forEach((mesh) => this.obstaclesGroup.remove(mesh));
    this.obstacleMeshes.clear();
    this.obstacles = [];

    this.coinMeshes.forEach((mesh) => this.coinsGroup.remove(mesh));
    this.coinMeshes.clear();
    this.coins = [];

    this.powerUpMeshes.forEach((mesh) => this.powerUpsGroup.remove(mesh));
    this.powerUpMeshes.clear();
    this.powerUps = [];

    this.spawnUpcomingEntities();
  }

  private setupResizeHandler() {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationFrameId);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
  }
}
