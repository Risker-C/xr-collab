// Fullscreen Mode Implementation
// Provides immersive fullscreen experience with auto-hiding controls

let isFullscreen = false;
let fullscreenHideTimer = null;

function toggleFullscreen() {
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
        // Enter fullscreen
        enterFullscreen();
    } else {
        // Exit fullscreen
        exitFullscreen();
    }
}

function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Handle fullscreen change events
function onFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || 
                     document.webkitFullscreenElement || 
                     document.mozFullScreenElement || 
                     document.msFullscreenElement);
    
    const body = document.body;
    const fullscreenBtn = document.getElementById('fullscreen-toggle');
    
    if (isFullscreen) {
        body.classList.add('fullscreen-mode');
        fullscreenBtn.textContent = '⛶'; // Exit fullscreen icon
        fullscreenBtn.title = '退出全屏 (ESC)';
        
        // Auto-hide controls in fullscreen
        setupAutoHideControls();
    } else {
        body.classList.remove('fullscreen-mode');
        fullscreenBtn.textContent = '⛶'; // Enter fullscreen icon
        fullscreenBtn.title = '全屏模式 (F11)';
        
        // Clear auto-hide
        clearTimeout(fullscreenHideTimer);
        showControls();
    }
}

// Auto-hide controls after 3 seconds of inactivity
function setupAutoHideControls() {
    clearTimeout(fullscreenHideTimer);
    
    fullscreenHideTimer = setTimeout(() => {
        if (isFullscreen) {
            hideControls();
        }
    }, 3000);
}

function hideControls() {
    const controls = document.getElementById('controls');
    const chatPanel = document.getElementById('chat-panel');
    const statusBar = document.getElementById('status');
    const roomInfo = document.getElementById('room-info');
    
    if (controls) controls.style.opacity = '0.2';
    if (chatPanel && !chatPanel.classList.contains('open')) chatPanel.style.opacity = '0.2';
    if (statusBar) statusBar.style.opacity = '0.3';
    if (roomInfo) roomInfo.style.opacity = '0.3';
}

function showControls() {
    const controls = document.getElementById('controls');
    const chatPanel = document.getElementById('chat-panel');
    const statusBar = document.getElementById('status');
    const roomInfo = document.getElementById('room-info');
    
    if (controls) controls.style.opacity = '1';
    if (chatPanel) chatPanel.style.opacity = '1';
    if (statusBar) statusBar.style.opacity = '1';
    if (roomInfo) roomInfo.style.opacity = '1';
}

// Mouse movement in fullscreen resets hide timer
function onMouseMoveInFullscreen() {
    if (isFullscreen) {
        showControls();
        setupAutoHideControls();
    }
}

// Keyboard shortcut: F11
function onKeyDownFullscreen(event) {
    if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
    }
}

// Initialize fullscreen listeners
function initFullscreenMode() {
    // Fullscreen change listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    
    // Mouse movement listener
    document.addEventListener('mousemove', onMouseMoveInFullscreen);
    
    // Keyboard shortcut
    document.addEventListener('keydown', onKeyDownFullscreen);
    
    console.log('✅ Fullscreen mode initialized');
}

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.toggleFullscreen = toggleFullscreen;
    window.initFullscreenMode = initFullscreenMode;
}
