// WebXR Real-time Collaboration Platform
// Frontend Application

let scene, camera, renderer, socket;
let users = new Map();
let currentRoom = null;

// Initialize Three.js scene
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    // Renderer
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

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50);
    scene.add(gridHelper);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    renderer.setAnimationLoop(animate);
}

function animate() {
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Socket.IO connection
function initSocket() {
    socket = io('http://localhost:3001');

    socket.on('connect', () => {
        updateStatus('Connected', true);
    });

    socket.on('disconnect', () => {
        updateStatus('Disconnected', false);
    });

    socket.on('room-users', (roomUsers) => {
        updateUsersList(roomUsers);
    });

    socket.on('user-joined', (user) => {
        console.log('User joined:', user.username);
        addRemoteUser(user);
        updateUsersList();
    });

    socket.on('user-moved', (data) => {
        updateRemoteUser(data);
    });

    socket.on('user-left', (userId) => {
        removeRemoteUser(userId);
        updateUsersList();
    });

    socket.on('object-created', (data) => {
        createObject(data);
    });
}

function joinRoom() {
    const username = document.getElementById('username').value || 'User';
    const roomId = document.getElementById('roomId').value || 'lobby';
    
    currentRoom = roomId;
    socket.emit('join-room', { roomId, username });
    updateStatus(`Joined room: ${roomId}`, true);
}

function addRemoteUser(user) {
    const geometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const avatar = new THREE.Mesh(geometry, material);
    avatar.position.set(user.position.x, user.position.y, user.position.z);
    scene.add(avatar);
    users.set(user.id, { mesh: avatar, username: user.username });
}

function updateRemoteUser(data) {
    const user = users.get(data.id);
    if (user && user.mesh) {
        user.mesh.position.set(data.position.x, data.position.y, data.position.z);
    }
}

function removeRemoteUser(userId) {
    const user = users.get(userId);
    if (user && user.mesh) {
        scene.remove(user.mesh);
        users.delete(userId);
    }
}

function addCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
    scene.add(cube);

    if (socket && socket.connected) {
        socket.emit('object-create', {
            type: 'cube',
            position: cube.position,
            color: cube.material.color.getHex()
        });
    }
}

function createObject(data) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: data.color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(data.position.x, data.position.y, data.position.z);
    scene.add(cube);
}

function enterVR() {
    if (renderer.xr.isPresenting) {
        alert('Already in VR mode');
    } else {
        alert('VR mode requires HTTPS and a compatible device');
    }
}

function updateStatus(message, connected) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = `● ${message}`;
    statusEl.className = connected ? 'status-connected' : 'status-disconnected';
}

function updateUsersList() {
    const listEl = document.getElementById('users-list');
    listEl.innerHTML = '<strong>Users in room:</strong>';
    users.forEach((user, id) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.textContent = `👤 ${user.username}`;
        listEl.appendChild(userItem);
    });
}

// Initialize on load
window.addEventListener('load', () => {
    initScene();
    initSocket();
});
