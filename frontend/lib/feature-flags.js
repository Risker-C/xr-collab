const DEFAULT_FLAGS = {
    useKTX2Textures: true,
    useInstancedDecor: true,
    useCascadeShadows: true,
    enablePerfHUD: true,
    grayReleaseBucket: 100
};

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
}

function parseNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function readLocalFlags() {
    try {
        const raw = localStorage.getItem('xr:featureFlags');
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function readQueryFlags() {
    const params = new URLSearchParams(window.location.search);
    return {
        useKTX2Textures: params.has('ff_ktx2') ? parseBoolean(params.get('ff_ktx2'), DEFAULT_FLAGS.useKTX2Textures) : undefined,
        useInstancedDecor: params.has('ff_instancing') ? parseBoolean(params.get('ff_instancing'), DEFAULT_FLAGS.useInstancedDecor) : undefined,
        useCascadeShadows: params.has('ff_csm') ? parseBoolean(params.get('ff_csm'), DEFAULT_FLAGS.useCascadeShadows) : undefined,
        enablePerfHUD: params.has('ff_perf_hud') ? parseBoolean(params.get('ff_perf_hud'), DEFAULT_FLAGS.enablePerfHUD) : undefined,
        grayReleaseBucket: params.has('ff_bucket') ? parseNumber(params.get('ff_bucket'), DEFAULT_FLAGS.grayReleaseBucket) : undefined
    };
}

export function resolveFeatureFlags() {
    const envFlags = typeof window !== 'undefined' ? (window.XR_FEATURE_FLAGS || {}) : {};
    const localFlags = typeof window !== 'undefined' ? readLocalFlags() : {};
    const queryFlags = typeof window !== 'undefined' ? readQueryFlags() : {};

    return {
        ...DEFAULT_FLAGS,
        ...envFlags,
        ...localFlags,
        ...Object.fromEntries(Object.entries(queryFlags).filter(([, value]) => value !== undefined))
    };
}

export { DEFAULT_FLAGS };
