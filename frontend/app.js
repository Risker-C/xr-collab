// WebXR Real-time Collaboration Platform - Enhanced Frontend
// Avatar System + XR Interaction + Worker Integration

let scene, camera, renderer, socket;
let users = new Map();
let currentRoom = null;
let controller1, controller2;
let raycaster = new THREE.Raycaster();
let controls; // PointerLockControls

// 键盘控制
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const moveSpeed = 5.0;

// 鼠标拖拽物体
let selectedObject = null;
let mouse = new THREE.Vector2();
let dragPlane = new THREE.Plane();
let offset = new THREE.Vector3();
let intersection = new THREE.Vector3();
let isDragging = false;

// 物理引擎
let world;
let physicsBodies = new Map(); // mesh -> body

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

    // 初始化物理世界
    initPhysics();

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7cfc00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.userData.isGround = true;
    scene.add(ground);

    // 地面物理体
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    const gridHelper = new THREE.GridHelper(50, 50);
    scene.add(gridHelper);

    // XR Controllers
    initXRControllers();

    // PointerLockControls
    controls = new THREE.PointerLockControls(camera, document.body);
    
    // 点击画布锁定鼠标
    renderer.domElement.addEventListener('click', () => {
        if (!renderer.xr.isPresenting) {
            controls.lock();
        }
    });

    // 键盘控制
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // 鼠标拖拽
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

// 初始化物理世界
function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
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

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
    }
}

function animate() {
    const delta = 0.016; // ~60fps
    
    // 更新物理世界
    world.step(delta);
    
    // 同步物理体到渲染网格
    physicsBodies.forEach((body, mesh) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    });
    
    // WASD 移动控制
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

// 键盘事件处理
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Digit1':
            createCube();
            break;
        case 'Digit2':
            createSphere();
            break;
        case 'Digit3':
            createCylinder();
            break;
        case 'Digit4':
            createTorus();
            break;
        case 'Digit5':
            createPyramid();
            break;
        case 'Delete':
            if (event.shiftKey) {
                deleteAll();
            } else {
                deleteSelected();
            }
            break;
        case 'KeyH':
            toggleHelp();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
    }
}

// 鼠标拖拽事件处理
function onMouseDown(event) {
    if (controls.isLocked) return; // 如果鼠标被锁定，不处理拖拽
    
    event.preventDefault();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // 检测可拖拽的物体（排除地面和网格）
    const draggableObjects = scene.children.filter(obj => 
        obj.userData.objectId || (obj.type === 'Mesh' && obj.geometry.type !== 'PlaneGeometry')
    );
    
    const intersects = raycaster.intersectObjects(draggableObjects, true);
    
    if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        
        // 高亮选中的物体
        if (selectedObject.material.emissive) {
            selectedObject.material.emissive.setHex(0xffff00);
        }
        
        // 创建拖拽平面
        const normal = new THREE.Vector3(0, 0, 1);
        normal.applyQuaternion(camera.quaternion);
        dragPlane.setFromNormalAndCoplanarPoint(normal, selectedObject.position);
        
        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
            offset.copy(intersection).sub(selectedObject.position);
        }
        
        isDragging = true;
        renderer.domElement.style.cursor = 'move';
    }
}

function onMouseMove(event) {
    if (!isDragging || !selectedObject) return;
    
    event.preventDefault();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
        selectedObject.position.copy(intersection.sub(offset));
        
        // 同步物理体位置
        const body = physicsBodies.get(selectedObject);
        if (body) {
            body.position.copy(selectedObject.position);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        }
        
        // 广播物体位置更新
        if (socket && socket.connected && selectedObject.userData.objectId) {
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
    if (selectedObject) {
        if (selectedObject.material.emissive) {
            selectedObject.material.emissive.setHex(0x000000);
        }
        
        // 投掷功能：根据鼠标移动速度施加力
        if (event.shiftKey) {
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
    }
    
    selectedObject = null;
    isDragging = false;
    renderer.domElement.style.cursor = 'auto';
}

// Socket.IO connection
function initSocket() {
    socket = io('https://xr-collab-backend.onrender.com', {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

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

    socket.on('object-deleted', (data) => {
        const objectToRemove = scene.children.find(obj => 
            obj.userData.objectId === data.objectId
        );
        if (objectToRemove) {
            const body = physicsBodies.get(objectToRemove);
            if (body) {
                world.removeBody(body);
                physicsBodies.delete(objectToRemove);
            }
            scene.remove(objectToRemove);
        }
    });

    socket.on('object-deleted-all', () => {
        const objectsToRemove = scene.children.filter(obj => 
            obj.userData.objectId && obj.type === 'Mesh'
        );
        objectsToRemove.forEach(obj => {
            const body = physicsBodies.get(obj);
            if (body) {
                world.removeBody(body);
                physicsBodies.delete(obj);
            }
            scene.remove(obj);
        });
    });

    socket.on('object-moved', (data) => {
        const objectToMove = scene.children.find(obj => 
            obj.userData.objectId === data.objectId
        );
        if (objectToMove) {
            objectToMove.position.set(
                data.position.x,
                data.position.y,
                data.position.z
            );
        }
    });

    socket.on('compute-result', (result) => {
        console.log('Worker result:', result);
        displayWorkerResult(result);
    });
}

function joinRoom() {
    const username = document.getElementById('username').value || '用户';
    const roomId = document.getElementById('roomId').value || '大厅';
    
    currentRoom = roomId;
    
    // 直接加入房间，不需要认证
    socket.emit('join-room', { roomId, username });
    
    document.getElementById('join-panel').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('help-toggle').style.display = 'block';
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
    let geometry, material, mesh, shape;
    
    switch(data.type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(0.25, 16, 16);
            shape = new CANNON.Sphere(0.25);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
            shape = new CANNON.Cylinder(0.2, 0.2, 0.5, 16);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
            shape = new CANNON.Sphere(0.3); // 近似
            break;
        case 'pyramid':
            geometry = new THREE.ConeGeometry(0.3, 0.5, 4);
            shape = new CANNON.Cylinder(0.3, 0.01, 0.5, 4);
            break;
        default:
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
    }
    
    material = new THREE.MeshStandardMaterial({ 
        color: data.color || 0xff0000 
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.position.x, data.position.y, data.position.z);
    mesh.userData = { objectId: data.id || Date.now(), type: data.type };
    scene.add(mesh);
    
    // 创建物理体
    const body = new CANNON.Body({
        mass: 1,
        shape: shape,
        position: new CANNON.Vec3(data.position.x, data.position.y, data.position.z)
    });
    world.addBody(body);
    physicsBodies.set(mesh, body);
    
    return mesh;
}

// 获取当前选择的颜色
function getSelectedColor() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        return parseInt(colorPicker.value.replace('#', '0x'));
    }
    return 0x4CAF50;
}

// 通用创建物体函数
function createObjectOfType(type) {
    console.log(`创建${type}按钮被点击`);
    if (!socket || !socket.connected) {
        alert('未连接到服务器，请稍候重试');
        return;
    }
    if (!camera) {
        alert('场景未初始化');
        return;
    }
    const pos = camera.position;
    const objectData = {
        type: type,
        position: { x: pos.x, y: pos.y - 1, z: pos.z - 2 },
        color: getSelectedColor(),
        id: Date.now() + Math.random()
    };
    console.log(`发送创建${type}事件`, pos);
    
    // 立即在本地渲染
    createObject(objectData);
    
    // 广播给其他用户
    socket.emit('object-create', objectData);
}

function createCube() {
    createObjectOfType('cube');
}

function createSphere() {
    createObjectOfType('sphere');
}

function createCylinder() {
    createObjectOfType('cylinder');
}

function createTorus() {
    createObjectOfType('torus');
}

function createPyramid() {
    createObjectOfType('pyramid');
}

// 删除选中的物体
function deleteSelected() {
    if (!selectedObject) {
        alert('请先选择一个物体');
        return;
    }
    
    const objectId = selectedObject.userData.objectId;
    
    // 移除物理体
    const body = physicsBodies.get(selectedObject);
    if (body) {
        world.removeBody(body);
        physicsBodies.delete(selectedObject);
    }
    
    scene.remove(selectedObject);
    
    // 广播删除事件
    if (socket && socket.connected && objectId) {
        socket.emit('object-delete', { objectId });
    }
    
    selectedObject = null;
    console.log('已删除选中物体');
}

// 清空所有物体
function deleteAll() {
    if (!confirm('确定要删除所有物体吗？')) {
        return;
    }
    
    const objectsToRemove = scene.children.filter(obj => 
        obj.userData.objectId && obj.type === 'Mesh'
    );
    
    objectsToRemove.forEach(obj => {
        const body = physicsBodies.get(obj);
        if (body) {
            world.removeBody(body);
            physicsBodies.delete(obj);
        }
        scene.remove(obj);
    });
    
    // 广播清空事件
    if (socket && socket.connected) {
        socket.emit('object-delete-all');
    }
    
    selectedObject = null;
    console.log('已清空所有物体');
}

// 切换帮助面板
function toggleHelp() {
    const helpPanel = document.getElementById('help-panel');
    if (helpPanel.style.display === 'none' || !helpPanel.style.display) {
        helpPanel.style.display = 'block';
        helpPanel.classList.add('fade-in');
    } else {
        helpPanel.style.display = 'none';
    }
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
        resultDiv.innerHTML = `<strong>✅ 计算结果：</strong><pre>${result.result.stdout || JSON.stringify(result.result, null, 2)}</pre>`;
    } else {
        resultDiv.innerHTML = `<strong>❌ 计算错误：</strong> ${result.error || '未知错误'}`;
    }
    resultDiv.style.display = 'block';
    setTimeout(() => resultDiv.style.display = 'none', 8000);
}

function updateStatus(message, connected) {
    const statusEl = document.getElementById('status');
    const messages = {
        'Connected': '已连接',
        'Disconnected': '未连接',
        'Computing geometry...': '正在计算几何...',
        'Computing collision...': '正在检测碰撞...'
    };
    statusEl.textContent = messages[message] || message;
    statusEl.className = connected ? 'connected' : 'disconnected';
}

function updateUsersList(roomUsers) {
    const listEl = document.getElementById('users-list');
    if (roomUsers) {
        listEl.innerHTML = roomUsers.map(u => 
            `<li>${u.username} ${u.id === socket.id ? '(你)' : ''}</li>`
        ).join('');
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initScene();
    initSocket();
});

// 暴露函数到全局作用域供HTML调用
window.joinRoom = joinRoom;
window.createCube = createCube;
window.createSphere = createSphere;
window.createCylinder = createCylinder;
window.createTorus = createTorus;
window.createPyramid = createPyramid;
window.deleteSelected = deleteSelected;
window.deleteAll = deleteAll;
window.toggleHelp = toggleHelp;
window.submitWorkerTask = submitWorkerTask;
