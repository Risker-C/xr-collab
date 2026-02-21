import * as THREE from 'three';

export class MaterialRegistry {
    constructor() {
        this.cache = new Map();
    }

    _makeKey(def = {}) {
        return JSON.stringify({
            type: def.type || 'standard',
            color: def.color,
            wireframe: !!def.wireframe,
            metalness: Number(def.metalness || 0),
            roughness: Number(def.roughness ?? 1),
            map: def.map?.uuid || null
        });
    }

    getMaterial(def = {}) {
        const key = this._makeKey(def);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const material = new THREE.MeshStandardMaterial({
            color: def.color ?? 0xffffff,
            wireframe: !!def.wireframe,
            metalness: Number(def.metalness || 0),
            roughness: Number(def.roughness ?? 1),
            map: def.map || null
        });

        this.cache.set(key, material);
        return material;
    }

    dispose() {
        this.cache.forEach((material) => material.dispose?.());
        this.cache.clear();
    }
}

export class GeometryRegistry {
    constructor() {
        this.cache = new Map();
    }

    get(type = 'cube') {
        if (this.cache.has(type)) {
            return this.cache.get(type);
        }

        let geometry;
        switch (type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.25, 16, 16);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(0.3, 0.5, 4);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                break;
        }

        this.cache.set(type, geometry);
        return geometry;
    }

    dispose() {
        this.cache.forEach((geometry) => geometry.dispose?.());
        this.cache.clear();
    }
}

export class CullingOptimizer {
    constructor(camera) {
        this.camera = camera;
        this.distanceLimit = 120;
        this.tracked = new Set();
    }

    track(object) {
        if (!object) return;
        object.frustumCulled = true;
        this.tracked.add(object);
    }

    untrack(object) {
        this.tracked.delete(object);
    }

    update() {
        const cameraPos = this.camera.position;
        this.tracked.forEach((object) => {
            if (!object || !object.parent) {
                this.tracked.delete(object);
                return;
            }

            const dist = cameraPos.distanceTo(object.position);
            object.visible = dist <= this.distanceLimit;
        });
    }
}

export class InstancedDecorManager {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
    }

    build(count = 120) {
        if (this.mesh) return this.mesh;

        const geometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        const material = new THREE.MeshStandardMaterial({ color: 0x66aa44, roughness: 0.9, metalness: 0.05 });
        const instanced = new THREE.InstancedMesh(geometry, material, count);

        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i += 1) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 18 + Math.random() * 10;

            dummy.position.set(Math.cos(angle) * radius, 0.1 + Math.random() * 0.2, Math.sin(angle) * radius);
            dummy.rotation.y = Math.random() * Math.PI;
            const scale = 0.6 + Math.random() * 1.2;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }

        instanced.castShadow = false;
        instanced.receiveShadow = true;
        instanced.instanceMatrix.needsUpdate = true;

        this.mesh = instanced;
        this.scene.add(instanced);
        return instanced;
    }
}

export class ShadowCascadeManager {
    constructor({ scene, camera, lightDirection = new THREE.Vector3(-1, -1, -1), enabled = true }) {
        this.scene = scene;
        this.camera = camera;
        this.enabled = enabled;
        this.lightDirection = lightDirection;
        this.csm = null;
    }

    async init(renderer) {
        if (!this.enabled) return;

        try {
            const module = await import('three/addons/csm/CSM.js');
            const { CSM } = module;

            this.csm = new CSM({
                maxFar: 150,
                cascades: 3,
                mode: 'practical',
                parent: this.scene,
                shadowMapSize: 1024,
                lightDirection: this.lightDirection,
                camera: this.camera
            });

            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        } catch (error) {
            console.warn('[ShadowCascadeManager] CSM unavailable, fallback to regular shadows', error.message);
        }
    }

    update() {
        this.csm?.update();
    }

    updateFrustums() {
        this.csm?.updateFrustums();
    }

    dispose() {
        this.csm?.dispose?.();
    }
}
