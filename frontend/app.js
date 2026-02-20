// WebXR Real-time Collaboration Platform - Enhanced Frontend
// Avatar System + XR Interaction + Worker Integration

let scene, camera, renderer, socket;
let users = new Map();
let currentRoom = null;
let controller1, controller2;
let raycaster = new THREE.Raycaster();

// Initialize Three.js scene
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7cfc00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(50, 50);
    scene.add(gridHelper);

    // XR Controllers
    initXRControllers();

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

// XR Controller Setup
function initXRControllers() {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    // Controller models
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry);
    line.scale.z = 5;
    controller1.add(line.clone());
    controller2.add(line.clone());
}

function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);
    if (intersections.length > 0) {
        const intersection = intersections[0];
        controller.userData.selected = intersection.object;
        controller.userData.selected.material.emissive.setHex(0xff0000);
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    if (controller.userData.selected) {
        controller.userData.selected.material.emissive.setHex(0x000000);
        controller.userData.selected = undefined;
    }
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(scene.children, true);
}

// Avatar System
function createAvatar(user) {
    const avatar = new THREE.Group();
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: user.color || 0x00ff00 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    avatar.add(head);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: user.color || 0x00ff00 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    avatar.add(body);
    
    // Name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0,0,0,0.7)';
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = 'white';
    context.font = '32px Arial';
    context.textAlign = 'center';
    context.fillText(user.username, 128, 42);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.y = 2.0;
    sprite.scale.set(0.5, 0.125, 1);
    avatar.add(sprite);
    
    avatar.userData = { userId: user.id, username: user.username };
    return avatar;
}

function animate() {
    // Update local user position
    if (socket && socket.connected && currentRoom) {
        const pos = camera.position;
        const rot = camera.rotation;
        socket.emit('update-position', {
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: rot.x, y: rot.y, z: rot.z }
        });
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Socket.IO connection
function initSocket() {
    socket = io('https://xr-collab-backend.onrender.com');

    socket.on('connect', () => {
        updateStatus('Connected', true);
    });

    socket.on('disconnect', () => {
        updateStatus('Disconnected', false);
    });

    socket.on('room-users', (roomUsers) => {
        roomUsers.forEach(user => {
            if (user.id !== socket.id && !users.has(user.id)) {
                addRemoteUser(user);
            }
        });
        updateUsersList(roomUsers);
    });

    socket.on('user-joined', (user) => {
        console.log('User joined:', user.username);
        addRemoteUser(user);
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

    socket.on('compute-result', (result) => {
        console.log('Worker result:', result);
        displayWorkerResult(result);
    });
}

function joinRoom() {
    const username = document.getElementById('username').value || 'User';
    const roomId = document.getElementById('roomId').value || 'lobby';
    
    currentRoom = roomId;
    socket.emit('join-room', { roomId, username });
    
    document.getElementById('join-panel').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
}

function addRemoteUser(user) {
    if (users.has(user.id)) return;
    
    const avatar = createAvatar(user);
    avatar.position.set(
        user.position.x,
        user.position.y,
        user.position.z
    );
    scene.add(avatar);
    users.set(user.id, avatar);
}

function updateRemoteUser(data) {
    const avatar = users.get(data.userId);
    if (avatar) {
        avatar.position.set(
            data.position.x,
            data.position.y,
            data.position.z
        );
        avatar.rotation.set(
            data.rotation.x,
            data.rotation.y,
            data.rotation.z
        );
    }
}

function removeRemoteUser(userId) {
    const avatar = users.get(userId);
    if (avatar) {
        scene.remove(avatar);
        users.delete(userId);
    }
}

function createObject(data) {
    let geometry, material, mesh;
    
    switch(data.type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(0.25, 16, 16);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
            break;
        default:
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }
    
    material = new THREE.MeshStandardMaterial({ 
        color: data.color || 0xff0000 
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.position.x, data.position.y, data.position.z);
    mesh.userData = { objectId: data.id, type: data.type };
    scene.add(mesh);
}

function createCube() {
    const pos = camera.position;
    socket.emit('object-create', {
        type: 'cube',
        position: { x: pos.x, y: pos.y - 1, z: pos.z - 2 },
        color: 0xff0000
    });
}

function createSphere() {
    const pos = camera.position;
    socket.emit('object-create', {
        type: 'sphere',
        position: { x: pos.x, y: pos.y - 1, z: pos.z - 2 },
        color: 0x00ff00
    });
}

// Worker Integration
function submitWorkerTask(taskType) {
    const tasks = {
        geometry: {
            type: 'code',
            payload: {
                language: 'python',
                code: `
import math
# Calculate sphere volume and surface area
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
# Simple AABB collision detection
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
    if (result.status === 'completed' && result.result) {
        resultDiv.innerHTML = `<strong>Worker Result:</strong><pre>${result.result.stdout || JSON.stringify(result.result)}</pre>`;
    } else {
        resultDiv.innerHTML = `<strong>Worker Error:</strong> ${result.error || 'Unknown error'}`;
    }
    resultDiv.style.display = 'block';
    setTimeout(() => resultDiv.style.display = 'none', 5000);
}

function updateStatus(message, connected) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = connected ? 'connected' : 'disconnected';
}

function updateUsersList(roomUsers) {
    const listEl = document.getElementById('users-list');
    if (roomUsers) {
        listEl.innerHTML = roomUsers.map(u => 
            `<li>${u.username} ${u.id === socket.id ? '(you)' : ''}</li>`
        ).join('');
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initScene();
    initSocket();
});
