import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

export class TextureCompressionManager {
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.textureLoader = new THREE.TextureLoader();
        this.cache = new Map();
        this.ktx2Loader = null;
        this.ktx2Ready = false;

        this.options = {
            transcoderPath: options.transcoderPath || 'https://unpkg.com/three@0.160.1/examples/jsm/libs/basis/',
            anisotropy: options.anisotropy || 8,
            useKTX2Textures: options.useKTX2Textures !== false
        };

        if (this.options.useKTX2Textures) {
            this.ktx2Loader = new KTX2Loader();
            this.ktx2Loader.setTranscoderPath(this.options.transcoderPath);
            this.ktx2Loader.detectSupport(this.renderer);
            this.ktx2Ready = true;
        }
    }

    async loadTexture(path, textureType = 'fallback') {
        const cacheKey = `${textureType}:${path}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const loader = textureType === 'ktx2' && this.ktx2Loader ? this.ktx2Loader : this.textureLoader;

        const texture = await new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, reject);
        });

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = this.options.anisotropy;
        texture.needsUpdate = true;

        this.cache.set(cacheKey, texture);
        return texture;
    }

    /**
     * Progressive loading strategy:
     * 1) quickly show fallback jpg/png
     * 2) async swap to ktx2 when transcoding completes
     */
    async loadProgressiveTexture(asset = {}, onUpdate = () => {}) {
        const { fallback, ktx2 } = asset;
        let fallbackTexture = null;

        if (fallback) {
            try {
                fallbackTexture = await this.loadTexture(fallback, 'fallback');
                onUpdate(fallbackTexture, { stage: 'fallback', source: fallback });
            } catch (error) {
                console.warn('[TextureCompressionManager] fallback load failed:', fallback, error.message);
            }
        }

        if (ktx2 && this.ktx2Ready) {
            try {
                const compressedTexture = await this.loadTexture(ktx2, 'ktx2');
                onUpdate(compressedTexture, { stage: 'compressed', source: ktx2 });
                return compressedTexture;
            } catch (error) {
                console.warn('[TextureCompressionManager] ktx2 load failed, using fallback:', ktx2, error.message);
            }
        }

        return fallbackTexture;
    }

    async applyProgressiveTexture(material, asset = {}) {
        return this.loadProgressiveTexture(asset, (texture) => {
            material.map = texture;
            material.needsUpdate = true;
        });
    }

    dispose() {
        if (this.ktx2Loader) {
            this.ktx2Loader.dispose();
        }
        this.cache.forEach((texture) => texture.dispose?.());
        this.cache.clear();
    }
}
