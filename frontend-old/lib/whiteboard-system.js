import * as THREE from 'three';

const TOOL = {
    BRUSH: 'brush',
    TEXT: 'text',
    ARROW: 'arrow',
    LASER: 'laser',
    ERASER: 'eraser'
};

const CURSOR_TTL_MS = 1200;
const OP_LOG_MAX = 200;

function isInputElement(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function hashColor(seed = '') {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const color = new THREE.Color();
    color.setHSL(hue / 360, 0.8, 0.55);
    return color;
}

class Whiteboard {
    constructor(id, scene, options = {}) {
        this.id = id;
        this.scene = scene;

        this.width = options.width || 1024;
        this.height = options.height || 1024;
        this.worldWidth = options.worldWidth || 4;
        this.worldHeight = options.worldHeight || 2.5;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.worldWidth, this.worldHeight),
            new THREE.MeshStandardMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                roughness: 0.15,
                metalness: 0
            })
        );

        this.mesh.position.set(
            options.position?.x ?? 0,
            options.position?.y ?? 1.8,
            options.position?.z ?? -3
        );
        this.mesh.rotation.set(
            options.rotation?.x ?? 0,
            options.rotation?.y ?? 0,
            options.rotation?.z ?? 0
        );
        this.mesh.scale.set(
            options.scale?.x ?? 1,
            options.scale?.y ?? 1,
            options.scale?.z ?? 1
        );

        this.mesh.userData = {
            type: 'whiteboard',
            whiteboardId: this.id
        };

        this.scene.add(this.mesh);

        this.history = [];
        this.redoStack = [];
        this.applyBackground();
    }

    applyBackground() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.texture.needsUpdate = true;
    }

    setTransform(transform = {}) {
        if (transform.position) {
            this.mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
        }
        if (transform.rotation) {
            this.mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        }
        if (transform.scale) {
            this.mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        }
    }

    drawStroke(action) {
        const points = action.points || [];
        if (points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = Number(action.width || 3);
        this.ctx.strokeStyle = action.color || '#ff0000';

        if (action.tool === TOOL.ERASER) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(255,255,255,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.moveTo(points[0].x * this.width, points[0].y * this.height);
        for (let i = 1; i < points.length; i += 1) {
            this.ctx.lineTo(points[i].x * this.width, points[i].y * this.height);
        }

        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
        this.texture.needsUpdate = true;
    }

    drawText(action) {
        this.ctx.font = `${Number(action.fontSize || 28)}px ${action.fontFamily || 'Arial'}`;
        this.ctx.fillStyle = action.color || '#ff0000';
        this.ctx.fillText(
            action.text || '',
            (action.x || 0) * this.width,
            (action.y || 0) * this.height
        );
        this.texture.needsUpdate = true;
    }

    drawArrow(action) {
        const start = action.start;
        const end = action.end;
        if (!start || !end) return;

        const sx = start.x * this.width;
        const sy = start.y * this.height;
        const ex = end.x * this.width;
        const ey = end.y * this.height;

        const width = Number(action.width || 3);
        const headLen = Math.max(10, width * 3);
        const angle = Math.atan2(ey - sy, ex - sx);

        this.ctx.beginPath();
        this.ctx.lineWidth = width;
        this.ctx.strokeStyle = action.color || '#ff0000';
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(ex, ey);
        this.ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 7), ey - headLen * Math.sin(angle - Math.PI / 7));
        this.ctx.moveTo(ex, ey);
        this.ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 7), ey - headLen * Math.sin(angle + Math.PI / 7));
        this.ctx.stroke();
        this.texture.needsUpdate = true;
    }

    applyAction(action, { record = true, resetRedo = false } = {}) {
        if (!action || !action.type) return;

        switch (action.type) {
            case 'DRAW_STROKE':
                this.drawStroke(action);
                break;
            case 'DRAW_TEXT':
                this.drawText(action);
                break;
            case 'DRAW_ARROW':
                this.drawArrow(action);
                break;
            case 'CLEAR':
                this.applyBackground();
                break;
            default:
                break;
        }

        if (record) {
            this.history.push({ ...action });
            if (resetRedo) this.redoStack = [];
        }
    }

    setHistory(history = [], redoStack = []) {
        this.history = Array.isArray(history) ? [...history] : [];
        this.redoStack = Array.isArray(redoStack) ? [...redoStack] : [];
        this.redraw();
    }

    redraw() {
        this.applyBackground();
        for (const action of this.history) {
            this.applyAction(action, { record: false });
        }
        this.texture.needsUpdate = true;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.texture.dispose();
    }
}

export class WhiteboardSystem {
    constructor(scene, socket, camera) {
        this.scene = scene;
        this.socket = socket;
        this.camera = camera;

        this.whiteboards = new Map();
        this.activeWhiteboardId = null;

        this.currentTool = TOOL.BRUSH;
        this.brushColor = '#ff0000';
        this.brushWidth = 4;
        this.fontSize = 30;

        this.role = 'member';
        this.ownerId = null;
        this.userId = null;
        this.roomId = null;

        this.currentStroke = null;
        this.arrowStart = null;
        this.isDrawing = false;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.currentLock = null;

        this.localLaser = null;
        this.remoteCursorMeshes = new Map();

        this.operationLog = [];

        this._socketListenersBound = false;

        this.bindDomEvents();
        this.bindSocketEvents();
    }

    setSocket(socket) {
        this.socket = socket;
        this._socketListenersBound = false;
        this.bindSocketEvents();
    }

    setRoomContext({ roomId, userId, ownerId, role } = {}) {
        this.roomId = roomId || this.roomId;
        this.userId = userId || this.userId;
        this.ownerId = ownerId || this.ownerId;
        this.role = role || this.role;
        this.renderPermissionBadge();
    }

    canManageBoards() {
        return this.role === 'host';
    }

    bindDomEvents() {
        window.addEventListener('mousedown', (event) => this.handlePointerDown(event));
        window.addEventListener('mousemove', (event) => this.handlePointerMove(event));
        window.addEventListener('mouseup', (event) => this.handlePointerUp(event));
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    bindSocketEvents() {
        if (!this.socket || this._socketListenersBound) return;
        this._socketListenersBound = true;

        this.socket.on('whiteboard:list', (boards = []) => {
            boards.forEach((data) => {
                if (!data?.id && !data?.whiteboardId) return;
                const id = data.id || data.whiteboardId;
                const board = this.createWhiteboard(id, data, false);
                board.setHistory(data.history || [], data.redoStack || []);
            });
            if (!this.activeWhiteboardId && this.whiteboards.size > 0) {
                this.selectWhiteboard(this.whiteboards.keys().next().value);
            }
            this.renderWhiteboardList();
        });

        this.socket.on('whiteboard:permission', (payload = {}) => {
            this.setRoomContext(payload);
        });

        this.socket.on('whiteboard:create', (data = {}) => {
            const id = data.id || data.whiteboardId;
            const board = this.createWhiteboard(id, data, false);
            board.setHistory(data.history || [], data.redoStack || []);
            this.selectWhiteboard(id);
            this.pushOperation('CREATE_WHITEBOARD', id, data.userId);
        });

        this.socket.on('whiteboard:delete', (data = {}) => {
            const id = data.whiteboardId;
            if (!id) return;
            this.removeWhiteboardLocal(id);
            this.pushOperation('DELETE_WHITEBOARD', id, data.userId);
        });

        this.socket.on('whiteboard:transform', (data = {}) => {
            const board = this.whiteboards.get(data.whiteboardId);
            if (!board) return;
            board.setTransform(data);
            this.pushOperation('TRANSFORM_WHITEBOARD', data.whiteboardId, data.updatedBy);
        });

        this.socket.on('whiteboard:draw', (action = {}) => {
            const board = this.whiteboards.get(action.whiteboardId);
            if (!board) return;
            board.applyAction(action, { record: true, resetRedo: true });
            this.pushOperation(action.type, action.whiteboardId, action.userId);
        });

        this.socket.on('whiteboard:history', (payload = {}) => {
            const board = this.whiteboards.get(payload.whiteboardId);
            if (!board) return;
            board.setHistory(payload.history || [], payload.redoStack || []);
            this.pushOperation('SYNC_HISTORY', payload.whiteboardId, payload.userId);
        });

        this.socket.on('whiteboard:cursor', (payload = {}) => {
            this.updateRemoteCursor(payload);
        });

        this.socket.on('whiteboard:lock', (payload = {}) => {
            if (payload.whiteboardId !== this.activeWhiteboardId) return;
            if (payload.locked) {
                this.currentLock = {
                    whiteboardId: payload.whiteboardId,
                    userId: payload.userId,
                    expiresAt: payload.expiresAt
                };
            } else if (this.currentLock?.whiteboardId === payload.whiteboardId) {
                this.currentLock = null;
            }
            this.renderPermissionBadge();
        });

        this.socket.on('whiteboard:lock-denied', (payload = {}) => {
            const notice = document.getElementById('whiteboard-lock-notice');
            if (!notice) return;
            const owner = payload.lock?.username || '其他成员';
            notice.textContent = `白板正在由 ${owner} 编辑，请稍后再试`;
            setTimeout(() => {
                if (notice.textContent.includes(owner)) notice.textContent = '';
            }, 1800);
        });

        this.socket.on('whiteboard:error', (payload = {}) => {
            const notice = document.getElementById('whiteboard-lock-notice');
            if (notice) {
                notice.textContent = payload.message || '白板操作失败';
                setTimeout(() => {
                    if (notice.textContent === (payload.message || '白板操作失败')) notice.textContent = '';
                }, 2000);
            }
        });
    }

    emitWithAck(event, payload = {}, timeoutMs = 1200) {
        if (!this.socket) return Promise.resolve({ ok: false, reason: 'socket-unavailable' });

        return new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => {
                if (done) return;
                done = true;
                resolve({ ok: false, reason: 'timeout' });
            }, timeoutMs);

            this.socket.emit(event, payload, (response = {}) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(response);
            });
        });
    }

    buildBoardId() {
        return `wb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    createWhiteboardNearCamera() {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可创建白板');
            return null;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const position = this.camera.position.clone().add(forward.multiplyScalar(3));
        position.y = Math.max(1.2, this.camera.position.y);

        const id = this.buildBoardId();
        const payload = {
            id,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: { x: 0, y: this.camera.rotation.y, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            width: 1024,
            height: 1024,
            worldWidth: 4,
            worldHeight: 2.5
        };

        const board = this.createWhiteboard(id, payload, true);
        this.selectWhiteboard(id);
        this.pushOperation('CREATE_WHITEBOARD', id, this.userId);
        return board;
    }

    createWhiteboard(id, options = {}, broadcast = false) {
        if (!id) return null;
        if (this.whiteboards.has(id)) return this.whiteboards.get(id);

        const board = new Whiteboard(id, this.scene, options);
        this.whiteboards.set(id, board);

        if (!this.activeWhiteboardId) this.activeWhiteboardId = id;

        if (broadcast && this.socket?.connected) {
            this.socket.emit('whiteboard:create', {
                id,
                position: { ...board.mesh.position },
                rotation: {
                    x: board.mesh.rotation.x,
                    y: board.mesh.rotation.y,
                    z: board.mesh.rotation.z
                },
                scale: { ...board.mesh.scale },
                width: board.width,
                height: board.height,
                worldWidth: board.worldWidth,
                worldHeight: board.worldHeight
            });
        }

        this.renderWhiteboardList();
        return board;
    }

    removeWhiteboardLocal(id) {
        const board = this.whiteboards.get(id);
        if (!board) return;

        board.destroy();
        this.whiteboards.delete(id);

        if (this.activeWhiteboardId === id) {
            this.activeWhiteboardId = this.whiteboards.size ? this.whiteboards.keys().next().value : null;
        }

        this.renderWhiteboardList();
    }

    deleteActiveWhiteboard() {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可删除白板');
            return;
        }

        const id = this.activeWhiteboardId;
        if (!id) return;

        this.removeWhiteboardLocal(id);
        if (this.socket?.connected) {
            this.socket.emit('whiteboard:delete', { whiteboardId: id });
        }
        this.pushOperation('DELETE_WHITEBOARD', id, this.userId);
    }

    selectWhiteboard(id) {
        if (!id || !this.whiteboards.has(id)) return;
        this.activeWhiteboardId = id;

        this.whiteboards.forEach((board, boardId) => {
            board.mesh.material.emissive = new THREE.Color(boardId === id ? 0x333333 : 0x000000);
        });

        this.renderWhiteboardList();
    }

    getActiveBoard() {
        if (!this.activeWhiteboardId) return null;
        return this.whiteboards.get(this.activeWhiteboardId) || null;
    }

    moveActiveBoard(dx = 0, dy = 0, dz = 0) {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可移动白板');
            return;
        }

        const board = this.getActiveBoard();
        if (!board) return;

        board.mesh.position.x += dx;
        board.mesh.position.y += dy;
        board.mesh.position.z += dz;

        this.emitActiveTransform();
    }

    rotateActiveBoard(dy = 0) {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可旋转白板');
            return;
        }

        const board = this.getActiveBoard();
        if (!board) return;

        board.mesh.rotation.y += dy;
        this.emitActiveTransform();
    }

    scaleActiveBoard(scaleDelta = 0) {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可缩放白板');
            return;
        }

        const board = this.getActiveBoard();
        if (!board) return;

        const factor = Math.max(0.4, Math.min(2.5, board.mesh.scale.x + scaleDelta));
        board.mesh.scale.setScalar(factor);
        this.emitActiveTransform();
    }

    emitActiveTransform() {
        const board = this.getActiveBoard();
        if (!board || !this.socket?.connected) return;

        this.socket.emit('whiteboard:transform', {
            whiteboardId: board.id,
            position: { x: board.mesh.position.x, y: board.mesh.position.y, z: board.mesh.position.z },
            rotation: { x: board.mesh.rotation.x, y: board.mesh.rotation.y, z: board.mesh.rotation.z },
            scale: { x: board.mesh.scale.x, y: board.mesh.scale.y, z: board.mesh.scale.z }
        });

        this.pushOperation('TRANSFORM_WHITEBOARD', board.id, this.userId);
    }

    resetAllBoards() {
        this.whiteboards.forEach((board) => board.destroy());
        this.whiteboards.clear();
        this.activeWhiteboardId = null;
        this.currentStroke = null;
        this.arrowStart = null;
        this.isDrawing = false;
        this.currentLock = null;
        this.operationLog = [];
        this.renderWhiteboardList();
        this.renderOperationLog();
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    setBrushColor(color) {
        this.brushColor = color;
    }

    setBrushWidth(width) {
        this.brushWidth = Math.max(1, Math.min(24, Number(width) || this.brushWidth));
    }

    setFontSize(fontSize) {
        this.fontSize = Math.max(12, Math.min(96, Number(fontSize) || this.fontSize));
    }

    clearActive() {
        if (!this.canManageBoards()) {
            this.pushNotice('仅主持人可清空白板');
            return;
        }

        const board = this.getActiveBoard();
        if (!board) return;

        const action = {
            type: 'CLEAR',
            whiteboardId: board.id,
            userId: this.userId,
            timestamp: Date.now()
        };

        board.applyAction(action, { record: true, resetRedo: true });
        this.socket?.emit('whiteboard:clear', { whiteboardId: board.id });
        this.pushOperation('CLEAR', board.id, this.userId);
    }

    undo() {
        const board = this.getActiveBoard();
        if (!board) return;
        this.socket?.emit('whiteboard:undo', { whiteboardId: board.id });
    }

    redo() {
        const board = this.getActiveBoard();
        if (!board) return;
        this.socket?.emit('whiteboard:redo', { whiteboardId: board.id });
    }

    getWhiteboardIntersection(event) {
        if (!this.whiteboards.size) return null;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = Array.from(this.whiteboards.values()).map((board) => board.mesh);
        const intersects = this.raycaster.intersectObjects(meshes, false);

        return intersects.length ? intersects[0] : null;
    }

    async acquireBoardLock(whiteboardId) {
        const result = await this.emitWithAck('whiteboard:lock', {
            whiteboardId,
            ttlMs: 5000
        });

        if (result.ok) {
            this.currentLock = {
                whiteboardId,
                userId: this.userId,
                expiresAt: result.lock?.expiresAt || Date.now() + 5000
            };
            return true;
        }

        return false;
    }

    releaseBoardLock(whiteboardId) {
        if (!whiteboardId || !this.socket?.connected) return;
        this.socket.emit('whiteboard:unlock', { whiteboardId });
        if (this.currentLock?.whiteboardId === whiteboardId) {
            this.currentLock = null;
        }
    }

    async handlePointerDown(event) {
        if (event.button !== 0) return;
        if (isInputElement(event.target)) return;

        const hit = this.getWhiteboardIntersection(event);
        if (!hit) return;

        const boardId = hit.object.userData.whiteboardId;
        const board = this.whiteboards.get(boardId);
        if (!board) return;

        this.selectWhiteboard(boardId);

        if (this.currentTool === TOOL.LASER) return;

        const lockAcquired = await this.acquireBoardLock(boardId);
        if (!lockAcquired) return;

        const uv = hit.uv;
        const point = { x: uv.x, y: 1 - uv.y };

        this.isDrawing = true;

        if (this.currentTool === TOOL.BRUSH || this.currentTool === TOOL.ERASER) {
            this.currentStroke = {
                type: 'DRAW_STROKE',
                whiteboardId: boardId,
                tool: this.currentTool,
                points: [point],
                color: this.brushColor,
                width: this.brushWidth,
                timestamp: Date.now(),
                userId: this.userId
            };
        } else if (this.currentTool === TOOL.ARROW) {
            this.arrowStart = point;
        } else if (this.currentTool === TOOL.TEXT) {
            const text = window.prompt('输入文本内容');
            if (text) {
                const action = {
                    type: 'DRAW_TEXT',
                    whiteboardId: boardId,
                    x: point.x,
                    y: point.y,
                    text,
                    color: this.brushColor,
                    fontSize: this.fontSize,
                    timestamp: Date.now(),
                    userId: this.userId
                };
                board.applyAction(action, { record: true, resetRedo: true });
                this.socket?.emit('whiteboard:draw', action);
                this.pushOperation('DRAW_TEXT', boardId, this.userId);
            }
            this.isDrawing = false;
            this.releaseBoardLock(boardId);
        }
    }

    handlePointerMove(event) {
        const hit = this.getWhiteboardIntersection(event);
        if (!hit) {
            this.hideLocalLaser();
            return;
        }

        const boardId = hit.object.userData.whiteboardId;
        const board = this.whiteboards.get(boardId);
        if (!board) return;

        const uv = hit.uv;
        const point = { x: uv.x, y: 1 - uv.y };

        this.socket?.emit('whiteboard:cursor', {
            whiteboardId: boardId,
            x: point.x,
            y: point.y,
            tool: this.currentTool,
            timestamp: Date.now()
        });

        if (this.currentTool === TOOL.LASER) {
            this.showLocalLaser(board, point);
        }

        if (!this.isDrawing || boardId !== this.activeWhiteboardId) return;

        if ((this.currentTool === TOOL.BRUSH || this.currentTool === TOOL.ERASER) && this.currentStroke) {
            const points = this.currentStroke.points;
            points.push(point);
            const previewAction = {
                ...this.currentStroke,
                points: [points[points.length - 2], points[points.length - 1]]
            };
            board.applyAction(previewAction, { record: false });
        }
    }

    handlePointerUp(event) {
        if (!this.isDrawing && this.currentTool !== TOOL.LASER) return;

        const board = this.getActiveBoard();
        if (!board) return;

        const boardId = board.id;

        if ((this.currentTool === TOOL.BRUSH || this.currentTool === TOOL.ERASER) && this.currentStroke) {
            if (this.currentStroke.points.length > 1) {
                const action = { ...this.currentStroke, timestamp: Date.now(), userId: this.userId };
                board.applyAction(action, { record: true, resetRedo: true });
                this.socket?.emit('whiteboard:draw', action);
                this.pushOperation('DRAW_STROKE', boardId, this.userId);
            }
            this.currentStroke = null;
        }

        if (this.currentTool === TOOL.ARROW && this.arrowStart) {
            const hit = this.getWhiteboardIntersection(event);
            if (hit && hit.object.userData.whiteboardId === boardId) {
                const end = { x: hit.uv.x, y: 1 - hit.uv.y };
                const action = {
                    type: 'DRAW_ARROW',
                    whiteboardId: boardId,
                    start: this.arrowStart,
                    end,
                    color: this.brushColor,
                    width: this.brushWidth,
                    timestamp: Date.now(),
                    userId: this.userId
                };
                board.applyAction(action, { record: true, resetRedo: true });
                this.socket?.emit('whiteboard:draw', action);
                this.pushOperation('DRAW_ARROW', boardId, this.userId);
            }
            this.arrowStart = null;
        }

        this.isDrawing = false;
        this.releaseBoardLock(boardId);
    }

    handleKeyDown(event) {
        if (isInputElement(event.target)) return;

        if (event.code === 'KeyB') this.setTool(TOOL.BRUSH);
        if (event.code === 'KeyT') this.setTool(TOOL.TEXT);
        if (event.code === 'KeyE') this.setTool(TOOL.ERASER);

        const isCmd = event.ctrlKey || event.metaKey;
        if (isCmd && event.code === 'KeyZ') {
            event.preventDefault();
            if (event.shiftKey) this.redo();
            else this.undo();
        }
    }

    showLocalLaser(board, point) {
        if (!this.localLaser) {
            this.localLaser = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            this.scene.add(this.localLaser);
        }

        const pos = new THREE.Vector3(
            (point.x - 0.5) * board.worldWidth,
            (0.5 - point.y) * board.worldHeight,
            0.03
        );
        board.mesh.updateMatrixWorld(true);
        pos.applyMatrix4(board.mesh.matrixWorld);

        this.localLaser.visible = true;
        this.localLaser.position.copy(pos);
    }

    hideLocalLaser() {
        if (this.localLaser) this.localLaser.visible = false;
    }

    updateRemoteCursor(payload = {}) {
        const board = this.whiteboards.get(payload.whiteboardId);
        if (!board || !payload.userId || payload.userId === this.userId) return;

        const key = `${payload.whiteboardId}:${payload.userId}`;
        let mesh = this.remoteCursorMeshes.get(key);

        if (!mesh) {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.024, 8, 8),
                new THREE.MeshBasicMaterial({ color: hashColor(payload.userId) })
            );
            mesh.userData = {
                userId: payload.userId,
                whiteboardId: payload.whiteboardId,
                lastSeen: Date.now(),
                tool: payload.tool
            };
            this.scene.add(mesh);
            this.remoteCursorMeshes.set(key, mesh);
        }

        mesh.userData.lastSeen = Date.now();
        mesh.userData.tool = payload.tool;

        const zOffset = payload.tool === TOOL.LASER ? 0.04 : 0.025;
        const pos = new THREE.Vector3(
            (payload.x - 0.5) * board.worldWidth,
            (0.5 - payload.y) * board.worldHeight,
            zOffset
        );

        board.mesh.updateMatrixWorld(true);
        pos.applyMatrix4(board.mesh.matrixWorld);

        mesh.position.copy(pos);
        mesh.visible = true;

        if (payload.tool === TOOL.LASER) {
            mesh.scale.setScalar(1.4);
        } else {
            mesh.scale.setScalar(1.0);
        }
    }

    update() {
        const now = Date.now();
        this.remoteCursorMeshes.forEach((mesh, key) => {
            const age = now - (mesh.userData.lastSeen || 0);
            if (age > CURSOR_TTL_MS) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                this.remoteCursorMeshes.delete(key);
            }
        });
    }

    pushOperation(type, whiteboardId, userId) {
        const item = {
            type,
            whiteboardId,
            userId: userId || null,
            timestamp: Date.now()
        };
        this.operationLog.unshift(item);
        if (this.operationLog.length > OP_LOG_MAX) {
            this.operationLog.length = OP_LOG_MAX;
        }
        this.renderOperationLog();
    }

    renderOperationLog() {
        const list = document.getElementById('whiteboard-history-list');
        const count = document.getElementById('whiteboard-history-count');

        if (count) count.textContent = `${this.operationLog.length}`;
        if (!list) return;

        if (!this.operationLog.length) {
            list.innerHTML = '<li class="empty-room">暂无白板操作</li>';
            return;
        }

        list.innerHTML = this.operationLog.slice(0, 30).map((item) => {
            const time = new Date(item.timestamp).toLocaleTimeString();
            return `<li><strong>${item.type}</strong> · ${item.whiteboardId}<br><small>${time}</small></li>`;
        }).join('');
    }

    renderWhiteboardList() {
        const list = document.getElementById('whiteboard-list');
        if (!list) return;

        if (!this.whiteboards.size) {
            list.innerHTML = '<li class="empty-room">暂无白板</li>';
            return;
        }

        // Clear and rebuild whiteboard list safely
        list.innerHTML = '';
        Array.from(this.whiteboards.keys()).forEach(id => {
            const active = id === this.activeWhiteboardId ? 'active-board' : '';
            
            const li = document.createElement('li');
            li.className = active;
            
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = id;
            button.dataset.whiteboardId = id;
            button.addEventListener('click', () => {
                if (typeof window.selectWhiteboard === 'function') {
                    window.selectWhiteboard(id);
                }
            });
            
            li.appendChild(button);
            list.appendChild(li);
        });

        this.renderPermissionBadge();
    }

    renderPermissionBadge() {
        const el = document.getElementById('whiteboard-role');
        if (el) {
            el.textContent = this.role === 'host' ? '主持人' : '成员';
            el.className = this.role === 'host' ? 'role-host' : 'role-member';
        }

        const lock = document.getElementById('whiteboard-lock-notice');
        if (lock && this.currentLock && this.currentLock.userId !== this.userId) {
            lock.textContent = '白板被其他成员锁定';
        }
    }

    pushNotice(text) {
        const notice = document.getElementById('whiteboard-lock-notice');
        if (!notice) return;
        notice.textContent = text;
        setTimeout(() => {
            if (notice.textContent === text) notice.textContent = '';
        }, 1800);
    }
}
