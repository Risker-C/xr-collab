import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import { WhiteboardSystem } from './lib/whiteboard-system.js';
import { resolveFeatureFlags } from './lib/feature-flags.js';
import { TextureCompressionManager } from './lib/texture-manager.js';
import { PerformanceMonitor } from './lib/performance-monitor.js';
import {
    MaterialRegistry,
    GeometryRegistry,
    CullingOptimizer,
    InstancedDecorManager,
    ShadowCascadeManager
} from './lib/performance-optimizer.js';

const FEATURE_FLAGS = resolveFeatureFlags();

let scene;
let camera;
let renderer;
let socket;
let controls;
let whiteboardSystem;
let textureManager;
let perfMonitor;
let shadowCascadeManager;
let cullingOptimizer;
let instancedDecorManager;

let controller1;
let controller2;
let controllerGrip1;
let controllerGrip2;
const raycaster = new THREE.Raycaster();

const users = new Map();
let currentRoom = null;
let currentUserId = null;

const materialRegistry = new MaterialRegistry();
const geometryRegistry = new GeometryRegistry();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 5.0;

let selectedObject = null;
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();
const dragIntersection = new THREE.Vector3();
let isDragging = false;

const operationHistory = {
    undoStack: [],
    redoStack: [],
    maxSteps: 100,
    undoCount: 0,
    redoCount: 0
};

let world;
const physicsBodies = new Map();

const clock = new THREE.Clock();
let accumulator = 0;
const fixedStep = 1 / 60;
const maxSubSteps = 10;

function resolveBackendUrl() {
    if (window.XR_BACKEND_URL) return window.XR_BACKEND_URL;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    if (window.location.port === '3001') {
        return window.location.origin;
    }

    return 'https://xr-collab-backend.onrender.com';
}

const BACKEND_URL = resolveBackendUrl();

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
}

async function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 120);
    scene.autoUpdate = true;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.getElementById('canvas-container').appendChild(renderer.domElement);

    perfMonitor = new PerformanceMonitor({ enabled: FEATURE_FLAGS.enablePerfHUD });
    cullingOptimizer = new CullingOptimizer(camera);
    instancedDecorManager = new InstancedDecorManager(scene);

    textureManager = new TextureCompressionManager(renderer, {
        useKTX2Textures: FEATURE_FLAGS.useKTX2Textures
    });

    shadowCascadeManager = new ShadowCascadeManager({
        scene,
        camera,
        enabled: FEATURE_FLAGS.useCascadeShadows
    });
    await shadowCascadeManager.init(renderer);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    scene.add(dirLight);

    initPhysics();

    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = materialRegistry.getMaterial({
        color: 0x7cfc00,
        roughness: 0.95,
        metalness: 0.02
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    await textureManager.applyProgressiveTexture(groundMaterial, {
        ktx2: 'assets/textures/ground/grass.ktx2',
        fallback: 'assets/textures/ground/grass-fallback.png'
    }).catch(() => {
        // no-op, fallback to flat color
    });

    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    const gridHelper = new THREE.GridHelper(120, 120, 0x336633, 0x336633);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    if (FEATURE_FLAGS.useInstancedDecor) {
        const instancedDecor = instancedDecorManager.build(180);
        cullingOptimizer.track(instancedDecor);
    }

    controls = new PointerLockControls(camera, document.body);

    renderer.domElement.addEventListener('click', () => {
        if (!renderer.xr.isPresenting) controls.lock();
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);

    initXRControllers();

    document.body.appendChild(VRButton.createButton(renderer));

    whiteboardSystem = new WhiteboardSystem(scene, socket, camera);
    window.whiteboardSystem = whiteboardSystem;

    createVRUI();

    renderer.setAnimationLoop(animate);
}

function initXRControllers() {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);

    const line = new THREE.Line(geometry);
    line.scale.z = 5;
    controller1.add(line.clone());
    controller2.add(line.clone());

    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
}

function createVRUI() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('XR Collab Controls (r160)', 16, 50);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#bbbbbb';
    const instructions = [
        'Trigger: Select / Create',
        'Grip: Delete Object',
        'Joystick: Move',
        '',
        'Performance Features:',
        '• KTX2 texture pipeline',
        '• Draw-call material pooling',
        '• Instanced decorative meshes'
    ];

    let y = 100;
    instructions.forEach((line) => {
        ctx.fillText(line, 22, y);
        y += 34;
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(1.1, 1.1);
    const uiPanel = new THREE.Mesh(geometry, material);
    uiPanel.position.set(0, 1.55, -2.4);
    uiPanel.userData.isUI = true;

    scene.add(uiPanel);
    return uiPanel;
}

function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const intersection = intersections[0];
        controller.userData.selected = intersection.object;

        if (controller.userData.selected.material?.emissive) {
            controller.userData.selected.material.emissive.setHex(0xff0000);
        }
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    if (!controller.userData.selected) return;

    if (controller.userData.selected.material?.emissive) {
        controller.userData.selected.material.emissive.setHex(0x000000);
    }

    controller.userData.selected = undefined;
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    return raycaster.intersectObjects(scene.children, true);
}

function createAvatar(user) {
    const avatar = new THREE.Group();

    const avatarColor = user.color || 0x00ff00;
    const sharedBodyMaterial = materialRegistry.getMaterial({
        color: avatarColor,
        metalness: 0.1,
        roughness: 0.8
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), sharedBodyMaterial.clone());
    head.position.y = 1.6;
    head.castShadow = true;
    avatar.add(head);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8), sharedBodyMaterial.clone());
    body.position.y = 1.0;
    body.castShadow = true;
    avatar.add(body);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0,0,0,0.72)';
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = 'white';
    context.font = '32px Arial';
    context.textAlign = 'center';
    context.fillText(user.username || '用户', 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.y = 2.0;
    sprite.scale.set(0.56, 0.14, 1);
    avatar.add(sprite);

    avatar.userData = { userId: user.id, username: user.username };
    cullingOptimizer.track(avatar);

    return avatar;
}

function animate() {
    perfMonitor.begin();

    const delta = clock.getDelta();

    accumulator += delta;
    let subSteps = 0;
    while (accumulator >= fixedStep && subSteps < maxSubSteps) {
        world.step(fixedStep);
        accumulator -= fixedStep;
        subSteps += 1;
    }

    physicsBodies.forEach((body, mesh) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    });

    if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    }

    if (socket?.connected && currentRoom) {
        const pos = camera.position;
        const rot = camera.rotation;

        socket.emit('update-position', {
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: rot.x, y: rot.y, z: rot.z }
        });
    }

    cullingOptimizer.update();
    shadowCascadeManager.update();
    whiteboardSystem?.update();

    renderer.render(scene, camera);

    perfMonitor.end(renderer);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shadowCascadeManager.updateFrustums();
}

function isInputLikeElement(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function createMaterialFromPreset(preset = 'standard', color = 0x4CAF50) {
    switch (preset) {
        case 'metal':
            return materialRegistry.getMaterial({ color, metalness: 0.95, roughness: 0.2 });
        case 'matte':
            return materialRegistry.getMaterial({ color, metalness: 0.05, roughness: 0.95 });
        case 'wireframe':
            return materialRegistry.getMaterial({ color, wireframe: true, metalness: 0.2, roughness: 0.7 });
        default:
            return materialRegistry.getMaterial({ color, metalness: 0.3, roughness: 0.6 });
    }
}

function getMaterialPresetFromMesh(mesh) {
    if (!mesh?.material) return 'standard';
    if (mesh.material.wireframe) return 'wireframe';
    if ((mesh.material.metalness || 0) > 0.8) return 'metal';
    if ((mesh.material.roughness || 0) > 0.85) return 'matte';
    return 'standard';
}

function captureObjectSnapshot(mesh) {
    if (!mesh) return null;

    return {
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
        color: mesh.material?.color ? mesh.material.color.getHex() : undefined,
        material: {
            preset: getMaterialPresetFromMesh(mesh),
            wireframe: !!mesh.material?.wireframe,
            metalness: mesh.material?.metalness,
            roughness: mesh.material?.roughness
        },
        text: mesh.userData?.text || ''
    };
}

function applyObjectPatch(mesh, updates = {}) {
    if (!mesh || !updates) return;

    if (updates.position) {
        mesh.position.set(updates.position.x, updates.position.y, updates.position.z);
    }
    if (updates.rotation) {
        mesh.rotation.set(updates.rotation.x, updates.rotation.y, updates.rotation.z);
    }
    if (updates.scale) {
        mesh.scale.set(updates.scale.x, updates.scale.y, updates.scale.z);
    }

    if (updates.color !== undefined && updates.color !== null && mesh.material?.color) {
        mesh.material.color.setHex(Number(updates.color));
    }

    if (updates.material) {
        const colorHex = mesh.material?.color ? mesh.material.color.getHex() : (updates.color || 0x4CAF50);
        const preset = updates.material.preset || getMaterialPresetFromMesh(mesh);

        mesh.material = createMaterialFromPreset(preset, colorHex);
    }

    if (updates.text !== undefined) {
        mesh.userData.text = updates.text;
    }

    const body = physicsBodies.get(mesh);
    if (body) {
        body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
        body.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
    }
}

function emitObjectUpdate(objectId, beforePatch = {}, afterPatch = {}, mergeKey = null) {
    if (!socket?.connected || !currentRoom || !objectId) return;

    const keys = Object.keys(afterPatch || {});
    if (!keys.length) return;

    socket.emit('object-update', {
        objectId,
        updates: afterPatch,
        before: beforePatch,
        meta: { mergeKey }
    });
}

function renderOperationHistory(history = {}) {
    Object.assign(operationHistory, history);

    const listEl = document.getElementById('operation-history-list');
    const countEl = document.getElementById('history-count');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) undoBtn.disabled = !operationHistory.undoCount;
    if (redoBtn) redoBtn.disabled = !operationHistory.redoCount;

    if (countEl) {
        countEl.textContent = `${operationHistory.undoCount || 0} / ${operationHistory.maxSteps || 100}`;
    }

    if (!listEl) return;

    const entries = [
        ...(operationHistory.undoStack || []).map((item) => ({ ...item, state: 'done' })),
        ...(operationHistory.redoStack || []).map((item) => ({ ...item, state: 'undone' }))
    ].slice(0, 40);

    if (!entries.length) {
        listEl.innerHTML = '<li class="undone">暂无可视化历史</li>';
        return;
    }

    listEl.innerHTML = entries.map((entry) => {
        const timestamp = new Date(entry.timestamp || Date.now()).toLocaleTimeString();
        const objectPart = entry.objectId ? ` #${entry.objectId}` : '';
        return `<li class="${entry.state}">${entry.label || entry.type}${objectPart}<br><small>${timestamp}</small></li>`;
    }).join('');
}

function requestUndo() {
    if (!socket?.connected || !currentRoom) return;
    socket.emit('operation:undo');
}

function requestRedo() {
    if (!socket?.connected || !currentRoom) return;
    socket.emit('operation:redo');
}

function applyColorToSelected() {
    if (!selectedObject) {
        alert('请先选择一个物体');
        return;
    }

    const objectId = selectedObject.userData?.objectId;
    if (!objectId) return;

    const before = captureObjectSnapshot(selectedObject);
    const nextColor = getSelectedColor();

    if (selectedObject.material?.color) {
        selectedObject.material.color.setHex(nextColor);
    }

    emitObjectUpdate(
        objectId,
        { color: before.color },
        { color: nextColor },
        `appearance:${objectId}`
    );
}

function applyMaterialToSelected() {
    if (!selectedObject) {
        alert('请先选择一个物体');
        return;
    }

    const objectId = selectedObject.userData?.objectId;
    if (!objectId) return;

    const presetEl = document.getElementById('materialPreset');
    const preset = presetEl?.value || 'standard';

    const before = captureObjectSnapshot(selectedObject);
    const colorHex = selectedObject.material?.color ? selectedObject.material.color.getHex() : getSelectedColor();
    selectedObject.material = createMaterialFromPreset(preset, colorHex);

    emitObjectUpdate(
        objectId,
        { material: before.material },
        { material: { preset } },
        `appearance:${objectId}`
    );
}

function rotateSelectedObject(deltaY = 0) {
    if (!selectedObject) return;

    const objectId = selectedObject.userData?.objectId;
    if (!objectId) return;

    const before = captureObjectSnapshot(selectedObject);
    selectedObject.rotation.y += deltaY;

    emitObjectUpdate(
        objectId,
        { rotation: before.rotation },
        { rotation: { x: selectedObject.rotation.x, y: selectedObject.rotation.y, z: selectedObject.rotation.z } },
        `transform:${objectId}`
    );
}

function scaleSelectedObject(scaleFactor = 1) {
    if (!selectedObject) return;

    const objectId = selectedObject.userData?.objectId;
    if (!objectId) return;

    const before = captureObjectSnapshot(selectedObject);
    const minScale = 0.2;
    const maxScale = 3.0;

    selectedObject.scale.set(
        THREE.MathUtils.clamp(selectedObject.scale.x * scaleFactor, minScale, maxScale),
        THREE.MathUtils.clamp(selectedObject.scale.y * scaleFactor, minScale, maxScale),
        THREE.MathUtils.clamp(selectedObject.scale.z * scaleFactor, minScale, maxScale)
    );

    emitObjectUpdate(
        objectId,
        { scale: before.scale },
        { scale: { x: selectedObject.scale.x, y: selectedObject.scale.y, z: selectedObject.scale.z } },
        `transform:${objectId}`
    );
}

function onKeyDown(event) {
    if (isInputLikeElement(event.target)) return;

    const useMeta = event.ctrlKey || event.metaKey;
    if (useMeta && event.code === 'KeyZ') {
        event.preventDefault();
        if (event.shiftKey) requestRedo();
        else requestUndo();
        return;
    }

    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Digit1': createCube(); break;
        case 'Digit2': createSphere(); break;
        case 'Digit3': createCylinder(); break;
        case 'Digit4': createTorus(); break;
        case 'Digit5': createPyramid(); break;
        case 'KeyQ': rotateSelectedObject(-Math.PI / 12); break;
        case 'KeyR': rotateSelectedObject(Math.PI / 12); break;
        case 'Equal':
        case 'NumpadAdd': scaleSelectedObject(1.1); break;
        case 'Minus':
        case 'NumpadSubtract': scaleSelectedObject(0.9); break;
        case 'Delete':
            if (event.shiftKey) deleteAll();
            else deleteSelected();
            break;
        case 'KeyH': toggleHelp(); break;
        default:
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
        default:
            break;
    }
}

function onMouseDown(event) {
    if (controls.isLocked) return;

    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const draggableObjects = scene.children.filter((obj) => obj.userData.objectId || (obj.type === 'Mesh' && obj.geometry.type !== 'PlaneGeometry'));
    const intersects = raycaster.intersectObjects(draggableObjects, true);

    if (intersects.length === 0) return;

    selectedObject = intersects[0].object;

    if (selectedObject.material?.emissive) {
        selectedObject.material.emissive.setHex(0xffff00);
    }

    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyQuaternion(camera.quaternion);
    dragPlane.setFromNormalAndCoplanarPoint(normal, selectedObject.position);

    if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
        dragOffset.copy(dragIntersection).sub(selectedObject.position);
    }

    isDragging = true;
    renderer.domElement.style.cursor = 'move';
}

function onMouseMove(event) {
    if (!isDragging || !selectedObject) return;

    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
        selectedObject.position.copy(dragIntersection.sub(dragOffset));

        const body = physicsBodies.get(selectedObject);
        if (body) {
            body.position.copy(selectedObject.position);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        }

        if (socket?.connected && selectedObject.userData.objectId) {
            socket.emit('object-move', {
                objectId: selectedObject.userData.objectId,
                position: {
                    x: selectedObject.position.x,
                    y: selectedObject.position.y,
                    z: selectedObject.position.z
                }
            });
        }
    }
}

function onMouseUp(event) {
    if (selectedObject?.material?.emissive) {
        selectedObject.material.emissive.setHex(0x000000);
    }

    if (selectedObject && event.shiftKey) {
        const body = physicsBodies.get(selectedObject);
        if (body) {
            const throwDirection = new THREE.Vector3();
            camera.getWorldDirection(throwDirection);

            body.velocity.set(
                throwDirection.x * 10,
                throwDirection.y * 10 + 5,
                throwDirection.z * 10
            );
        }
    }

    selectedObject = null;
    isDragging = false;
    renderer.domElement.style.cursor = 'auto';
}

function initSocket() {
    socket = io(BACKEND_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        updateStatus('Connected', true);
        socket.emit('room:list');
        refreshRoomList();
    });

    socket.on('disconnect', () => {
        updateStatus('Disconnected', false);
    });

    socket.on('room-list', (rooms) => {
        renderPublicRoomList(rooms);
    });

    socket.on('room-error', (payload = {}) => {
        showJoinError(payload.message || '房间操作失败');
    });

    socket.on('room:joined', (payload = {}) => {
        const joinedRoom = payload.room || {};
        currentRoom = joinedRoom.id || null;

        clearSceneObjects();
        clearRemoteUsers();
        whiteboardSystem?.resetAllBoards();
        loadRoomObjects(payload.objects || []);

        whiteboardSystem?.setRoomContext({
            roomId: joinedRoom.id,
            userId: socket.id,
            ownerId: joinedRoom.ownerId,
            role: payload.role || 'member'
        });

        if (payload.whiteboards) {
            payload.whiteboards.forEach((wbData) => {
                const board = whiteboardSystem.createWhiteboard(wbData.id || wbData.whiteboardId, wbData, false);
                board.setHistory(wbData.history || [], wbData.redoStack || []);
            });
            whiteboardSystem.renderWhiteboardList();
        }

        const roomUsers = payload.users || [];
        syncRoomUsers(roomUsers);
        updateUsersList(roomUsers);
        whiteboardSystem?.setRoomContext({
            roomId: joinedRoom.id,
            userId: currentUserId,
            ownerId: joinedRoom.ownerId,
            role: payload.role || 'member'
        });

        showInRoomUI(joinedRoom);
        updateRoomInfo(joinedRoom);
        showJoinError('');

        if (currentRoom) {
            const url = new URL(window.location.href);
            url.searchParams.set('room', currentRoom);
            window.history.replaceState({}, '', url);
        }

        if (Array.isArray(payload.history)) {
            renderChatHistory(payload.history);
        }
    });

    socket.on('room-users', (roomUsers = []) => {
        syncRoomUsers(roomUsers);
        updateUsersList(roomUsers);
    });

    socket.on('room-objects', (objects = []) => {
        loadRoomObjects(objects);
    });

    socket.on('user-joined', (user) => {
        if (user && user.socketId !== socket.id) {
            addRemoteUser(user);
        }
    });

    socket.on('user-moved', (data) => {
        updateRemoteUser(data);
    });

    socket.on('user-left', (userId) => {
        removeRemoteUser(userId);
    });

    socket.on('object-created', (data) => {
        createObject(data);
    });

    socket.on('object-updated', (data = {}) => {
        const objectToPatch = scene.children.find((obj) => obj.userData.objectId === data.objectId);
        if (objectToPatch) {
            applyObjectPatch(objectToPatch, data.updates || {});
        }
    });

    socket.on('object-deleted', (data) => {
        const objectToRemove = scene.children.find((obj) => obj.userData.objectId === data.objectId);
        if (objectToRemove) {
            const body = physicsBodies.get(objectToRemove);
            if (body) {
                world.removeBody(body);
                physicsBodies.delete(objectToRemove);
            }
            cullingOptimizer.untrack(objectToRemove);
            scene.remove(objectToRemove);
        }
    });

    socket.on('object-deleted-all', () => {
        clearSceneObjects();
    });

    socket.on('objects-restored', (payload = {}) => {
        clearSceneObjects();
        loadRoomObjects(payload.objects || []);
    });

    socket.on('object-moved', (data) => {
        const objectToMove = scene.children.find((obj) => obj.userData.objectId === data.objectId);
        if (objectToMove) {
            objectToMove.position.set(data.position.x, data.position.y, data.position.z);

            const body = physicsBodies.get(objectToMove);
            if (body) {
                body.position.set(data.position.x, data.position.y, data.position.z);
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
        }
    });

    socket.on('operation:history', (history) => {
        renderOperationHistory(history);
    });

    socket.on('chat:history', (history = []) => {
        renderChatHistory(history);
    });

    socket.on('chat:message', (message) => {
        appendChatMessage(message);
    });

    socket.on('compute-result', (result) => {
        displayWorkerResult(result);
    });
}

function showJoinError(message) {
    const errorEl = document.getElementById('join-error');
    if (!errorEl) return;

    errorEl.textContent = message || '';
    errorEl.style.display = message ? 'block' : 'none';
}

function showInRoomUI() {
    document.getElementById('join-panel').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('help-toggle').style.display = 'block';

    const roomInfo = document.getElementById('room-info');
    if (roomInfo) roomInfo.style.display = 'flex';
}

function updateRoomInfo(room = {}) {
    const infoEl = document.getElementById('room-info-text');
    if (!infoEl || !room.id) return;

    const roomName = room.name ? `${room.name} · ` : '';
    infoEl.textContent = `房间：${roomName}${room.id}`;
}

function clearSceneObjects() {
    const objectsToRemove = scene.children.filter((obj) => obj.userData && obj.userData.objectId && obj.type === 'Mesh');

    objectsToRemove.forEach((obj) => {
        const body = physicsBodies.get(obj);
        if (body) {
            world.removeBody(body);
            physicsBodies.delete(obj);
        }

        cullingOptimizer.untrack(obj);
        scene.remove(obj);
    });

    selectedObject = null;
}

function clearRemoteUsers() {
    users.forEach((avatar) => {
        cullingOptimizer.untrack(avatar);
        scene.remove(avatar);
    });
    users.clear();
}

function syncRoomUsers(roomUsers = []) {
    const remoteUserMap = new Map();

    roomUsers.forEach((roomUser) => {
        const userId = roomUser.id || roomUser.userId;
        if (!userId) return;

        if (roomUser.socketId === socket.id) {
            currentUserId = userId;
            return;
        }

        remoteUserMap.set(userId, { ...roomUser, id: userId });
    });

    Array.from(users.keys()).forEach((userId) => {
        if (!remoteUserMap.has(userId)) removeRemoteUser(userId);
    });

    remoteUserMap.forEach((roomUser, userId) => {
        if (!users.has(userId)) {
            addRemoteUser(roomUser);
        } else {
            updateRemoteUser({
                userId,
                position: roomUser.position,
                rotation: roomUser.rotation || { x: 0, y: 0, z: 0 }
            });
        }
    });
}

function loadRoomObjects(objects = []) {
    objects.forEach((objectData) => {
        createObject(objectData);
    });
}

async function refreshRoomList() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/rooms`);
        if (!response.ok) return;

        const rooms = await response.json();
        renderPublicRoomList(rooms);
    } catch (error) {
        console.warn('Failed to load room list:', error.message);
    }
}

function renderPublicRoomList(rooms = []) {
    const listEl = document.getElementById('public-room-list');
    if (!listEl) return;

    if (!Array.isArray(rooms) || rooms.length === 0) {
        listEl.innerHTML = '<li class="empty-room">暂无公开房间</li>';
        return;
    }

    listEl.innerHTML = rooms.map((room) => `
        <li>
            <div class="room-meta">
                <strong>${room.name || room.id}</strong>
                <span>ID: ${room.id} · ${room.userCount || 0}/${room.maxUsers || 50}</span>
                <span>${room.hasPassword ? '🔒 需密码' : '🌐 公开'}</span>
            </div>
            <button onclick="joinPublicRoom('${room.id}', ${Boolean(room.hasPassword)})">加入</button>
        </li>
    `).join('');
}

async function createRoom() {
    const username = (document.getElementById('username').value || '用户').trim();
    const roomName = (document.getElementById('createRoomName').value || '').trim();
    const password = (document.getElementById('createRoomPassword').value || '').trim();
    const isPublic = document.getElementById('createRoomPublic').checked;

    if (!username) {
        showJoinError('请先输入昵称');
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: roomName || `${username} 的房间`,
                password,
                isPublic
            })
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '创建房间失败');

        document.getElementById('roomId').value = payload.id;
        document.getElementById('joinRoomPassword').value = password;
        await refreshRoomList();
        joinRoom(payload.id, password);
    } catch (error) {
        showJoinError(error.message || '创建房间失败');
    }
}

function joinPublicRoom(roomId, needPassword = false) {
    if (!roomId) return;

    document.getElementById('roomId').value = roomId;

    if (needPassword) {
        const password = window.prompt('该房间需要密码，请输入：', '');
        if (password === null) return;
        document.getElementById('joinRoomPassword').value = password;
        joinRoom(roomId, password);
        return;
    }

    joinRoom(roomId, '');
}

function joinRoom(predefinedRoomId = null, predefinedPassword = null) {
    if (!socket?.connected) {
        showJoinError('尚未连接服务器，请稍后重试');
        return;
    }

    const username = (document.getElementById('username').value || '用户').trim();
    const roomId = (predefinedRoomId || document.getElementById('roomId').value || '').trim().toUpperCase();
    const password = predefinedPassword !== null
        ? predefinedPassword
        : (document.getElementById('joinRoomPassword').value || '');

    if (!username) {
        showJoinError('请先输入昵称');
        return;
    }

    if (!roomId) {
        showJoinError('请输入房间ID');
        return;
    }

    showJoinError('');
    socket.emit('user:set-name', { username });
    socket.emit('join-room', { roomId, username, password });
}

async function copyRoomInvite() {
    if (!currentRoom) {
        showJoinError('尚未加入房间');
        return;
    }

    const inviteLink = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoom)}`;
    const inviteText = `加入我的XR房间\n房间ID: ${currentRoom}\n邀请链接: ${inviteLink}`;

    try {
        await navigator.clipboard.writeText(inviteText);
        alert('房间邀请信息已复制');
    } catch {
        window.prompt('复制失败，请手动复制：', inviteText);
    }
}

function addRemoteUser(user) {
    if (users.has(user.id)) return;

    const avatar = createAvatar(user);
    avatar.position.set(user.position.x, user.position.y, user.position.z);
    scene.add(avatar);
    users.set(user.id, avatar);
}

function updateRemoteUser(data) {
    const avatar = users.get(data.userId);
    if (!avatar) return;

    avatar.position.set(data.position.x, data.position.y, data.position.z);
    avatar.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
}

function removeRemoteUser(userId) {
    const avatar = users.get(userId);
    if (avatar) {
        cullingOptimizer.untrack(avatar);
        scene.remove(avatar);
        users.delete(userId);
    }
}

function createObject(data = {}) {
    const objectId = data.id || data.objectId || `${Date.now()}_${Math.random()}`;
    const position = data.position || { x: 0, y: 1, z: 0 };

    const existingObject = scene.children.find((obj) => obj.userData.objectId === objectId);
    if (existingObject) return existingObject;

    const type = data.type || 'cube';
    const geometry = geometryRegistry.get(type);

    let shape;
    switch (type) {
        case 'cube':
            shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
            break;
        case 'sphere':
            shape = new CANNON.Sphere(0.25);
            break;
        case 'cylinder':
            shape = new CANNON.Cylinder(0.2, 0.2, 0.5, 16);
            break;
        case 'torus':
            shape = new CANNON.Sphere(0.3);
            break;
        case 'pyramid':
            shape = new CANNON.Cylinder(0.3, 0.01, 0.5, 4);
            break;
        default:
            shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
            break;
    }

    const materialPreset = data.material?.preset || 'standard';
    const material = createMaterialFromPreset(materialPreset, data.color || 0xff0000);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { objectId, type };

    scene.add(mesh);
    cullingOptimizer.track(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape,
        position: new CANNON.Vec3(position.x, position.y, position.z)
    });

    world.addBody(body);
    physicsBodies.set(mesh, body);

    return mesh;
}

function getSelectedColor() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        return parseInt(colorPicker.value.replace('#', '0x'), 16);
    }

    return 0x4CAF50;
}

function createObjectOfType(type) {
    if (!socket?.connected) {
        alert('未连接到服务器，请稍候重试');
        return;
    }

    if (!currentRoom) {
        alert('请先加入房间');
        return;
    }

    if (!camera) {
        alert('场景未初始化');
        return;
    }

    const pos = camera.position;
    const objectData = {
        type,
        position: { x: pos.x, y: pos.y - 1, z: pos.z - 2 },
        color: getSelectedColor(),
        id: Date.now() + Math.random(),
        material: { preset: 'standard' }
    };

    createObject(objectData);
    socket.emit('object-create', objectData);
}

function createCube() { createObjectOfType('cube'); }
function createSphere() { createObjectOfType('sphere'); }
function createCylinder() { createObjectOfType('cylinder'); }
function createTorus() { createObjectOfType('torus'); }
function createPyramid() { createObjectOfType('pyramid'); }

function deleteSelected() {
    if (!selectedObject) {
        alert('请先选择一个物体');
        return;
    }

    const objectId = selectedObject.userData.objectId;

    const body = physicsBodies.get(selectedObject);
    if (body) {
        world.removeBody(body);
        physicsBodies.delete(selectedObject);
    }

    cullingOptimizer.untrack(selectedObject);
    scene.remove(selectedObject);

    if (socket?.connected && objectId) {
        socket.emit('object-delete', { objectId });
    }

    selectedObject = null;
}

function deleteAll() {
    if (!confirm('确定要删除所有物体吗？')) return;

    const objectsToRemove = scene.children.filter((obj) => obj.userData.objectId && obj.type === 'Mesh');

    objectsToRemove.forEach((obj) => {
        const body = physicsBodies.get(obj);
        if (body) {
            world.removeBody(body);
            physicsBodies.delete(obj);
        }

        cullingOptimizer.untrack(obj);
        scene.remove(obj);
    });

    if (socket?.connected) {
        socket.emit('object-delete-all');
    }

    selectedObject = null;
}

function toggleHelp() {
    const helpPanel = document.getElementById('help-panel');
    if (!helpPanel.style.display || helpPanel.style.display === 'none') {
        helpPanel.style.display = 'block';
        helpPanel.classList.add('fade-in');
    } else {
        helpPanel.style.display = 'none';
    }
}

function submitWorkerTask(taskType) {
    const tasks = {
        geometry: {
            type: 'code',
            payload: {
                language: 'python',
                code: `
import math
radius = 5.0
volume = (4/3) * math.pi * radius**3
surface = 4 * math.pi * radius**2
print(f"Radius: {radius}")
print(f"Volume: {volume:.2f}")
print(f"Surface: {surface:.2f}")
`
            }
        },
        collision: {
            type: 'code',
            payload: {
                language: 'python',
                code: `
def check_collision(box1, box2):
    return (box1['min_x'] <= box2['max_x'] and box1['max_x'] >= box2['min_x'] and
            box1['min_y'] <= box2['max_y'] and box1['max_y'] >= box2['min_y'] and
            box1['min_z'] <= box2['max_z'] and box1['max_z'] >= box2['min_z'])

box1 = {'min_x': 0, 'max_x': 2, 'min_y': 0, 'max_y': 2, 'min_z': 0, 'max_z': 2}
box2 = {'min_x': 1, 'max_x': 3, 'min_y': 1, 'max_y': 3, 'min_z': 1, 'max_z': 3}
result = check_collision(box1, box2)
print(f"Collision detected: {result}")
`
            }
        }
    };

    const task = tasks[taskType];
    if (task) {
        socket.emit('compute-task', task);
        updateStatus(`Computing ${taskType}...`, true);
    }
}

function displayWorkerResult(result) {
    const resultDiv = document.getElementById('worker-result');
    if (!resultDiv) return;

    if (result.status === 'completed' && result.result) {
        resultDiv.innerHTML = `<strong>✅ 计算结果：</strong><pre>${result.result.stdout || JSON.stringify(result.result, null, 2)}</pre>`;
    } else {
        resultDiv.innerHTML = `<strong>❌ 计算错误：</strong> ${result.error || '未知错误'}`;
    }

    resultDiv.style.display = 'block';
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 8000);
}

function updateStatus(message, connected) {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;

    const messages = {
        Connected: '已连接',
        Disconnected: '未连接',
        'Computing geometry...': '正在计算几何...',
        'Computing collision...': '正在检测碰撞...'
    };

    statusEl.textContent = messages[message] || message;
    statusEl.className = connected ? 'connected' : 'disconnected';
}

function updateUsersList(roomUsers) {
    const listEl = document.getElementById('users-list');
    if (!listEl) return;

    if (roomUsers) {
        const self = roomUsers.find((u) => (u.socketId && socket && u.socketId === socket.id) || ((u.id || u.userId) === currentUserId));
        if (self?.role) {
            whiteboardSystem?.setRoomContext({ role: self.role, userId: self.id || self.userId });
        }

        listEl.innerHTML = roomUsers.map((u) => {
            const userId = u.id || u.userId;
            const isSelf = (u.socketId && socket && u.socketId === socket.id) || (currentUserId && userId === currentUserId);
            const role = u.role === 'host' ? '👑' : '';
            return `<li>${role}${u.username} ${isSelf ? '(你)' : ''}</li>`;
        }).join('');
    }
}

function appendChatMessage(message = {}) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const line = document.createElement('div');
    line.className = message.type === 'system' ? 'chat-system' : 'chat-user';

    if (message.type === 'system') {
        line.textContent = `系统：${message.text || ''}`;
    } else {
        line.textContent = `${message.username || '用户'}：${message.text || ''}`;
    }

    chatMessages.appendChild(line);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatHistory(history = []) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = '';
    history.forEach((msg) => appendChatMessage(msg));
}

function initChatUI() {
    const chatPanel = document.getElementById('chat-panel');
    const chatOpenBtn = document.getElementById('chat-open-btn');
    const chatToggle = document.getElementById('chat-toggle');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    if (!chatPanel || !chatOpenBtn || !chatToggle || !chatInput || !chatSend) return;

    chatPanel.style.display = 'none';

    chatOpenBtn.addEventListener('click', () => {
        chatPanel.style.display = 'block';
        chatOpenBtn.style.display = 'none';
    });

    chatToggle.addEventListener('click', () => {
        chatPanel.style.display = 'none';
        chatOpenBtn.style.display = 'block';
    });

    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text || !socket || !currentRoom) return;

        socket.emit('chat:send', { text });
        chatInput.value = '';
    };

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') sendMessage();
    });

    document.querySelectorAll('.emoji-btn').forEach((button) => {
        button.addEventListener('click', () => {
            chatInput.value += button.dataset.emoji || '';
            chatInput.focus();
        });
    });
}

function initRoomPrefillFromUrl() {
    const roomId = new URLSearchParams(window.location.search).get('room');
    if (!roomId) return;

    const roomIdInput = document.getElementById('roomId');
    if (roomIdInput) roomIdInput.value = roomId.toUpperCase();
}

function createWhiteboardNearCamera() {
    whiteboardSystem?.createWhiteboardNearCamera();
}

function selectWhiteboard(id) {
    whiteboardSystem?.selectWhiteboard(id);
}

function deleteActiveWhiteboard() {
    whiteboardSystem?.deleteActiveWhiteboard();
}

function moveActiveWhiteboard(dx, dy, dz) {
    whiteboardSystem?.moveActiveBoard(dx, dy, dz);
}

function rotateActiveWhiteboard(deltaY) {
    whiteboardSystem?.rotateActiveBoard(deltaY);
}

function scaleActiveWhiteboard(delta) {
    whiteboardSystem?.scaleActiveBoard(delta);
}

function setWhiteboardFontSize(value) {
    whiteboardSystem?.setFontSize(value);
}

window.addEventListener('DOMContentLoaded', async () => {
    initSocket();
    await initScene();

    if (whiteboardSystem && socket) {
        whiteboardSystem.setSocket(socket);
    }

    initChatUI();
    initRoomPrefillFromUrl();
    
    // Initialize fullscreen mode
    if (typeof initFullscreenMode === 'function') {
        initFullscreenMode();
    }
    refreshRoomList();
});

window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.refreshRoomList = refreshRoomList;
window.joinPublicRoom = joinPublicRoom;
window.copyRoomInvite = copyRoomInvite;
window.createCube = createCube;
window.createSphere = createSphere;
window.createCylinder = createCylinder;
window.createTorus = createTorus;
window.createPyramid = createPyramid;
window.deleteSelected = deleteSelected;
window.deleteAll = deleteAll;
window.toggleHelp = toggleHelp;
window.submitWorkerTask = submitWorkerTask;
window.requestUndo = requestUndo;
window.requestRedo = requestRedo;
window.applyColorToSelected = applyColorToSelected;
window.applyMaterialToSelected = applyMaterialToSelected;
window.createWhiteboardNearCamera = createWhiteboardNearCamera;
window.selectWhiteboard = selectWhiteboard;
window.deleteActiveWhiteboard = deleteActiveWhiteboard;
window.moveActiveWhiteboard = moveActiveWhiteboard;
window.rotateActiveWhiteboard = rotateActiveWhiteboard;
window.scaleActiveWhiteboard = scaleActiveWhiteboard;
window.setWhiteboardFontSize = setWhiteboardFontSize;
