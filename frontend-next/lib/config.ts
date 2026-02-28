export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://xr-collab-backend.onrender.com'

export const FEATURES = {
  VR_MODE: true,
  SCAN_MODE: true,
  ML_SHARP: true,
  KIRI_ENGINE: true,
  ZHITIANXIA_AI: true
} as const

export const ROUTES = {
  HOME: '/',
  VR_ROOM: '/vr',
  SCAN: '/scan',
  ABOUT: '/about'
} as const