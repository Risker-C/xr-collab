// File Upload System
// Handles file selection, upload, and display in 3D scene

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('upload-status');
    
    // Get room and user info from app.js
    const currentRoom = window.currentRoom;
    const currentUserId = window.currentUserId;
    const username = document.getElementById('username')?.value || '用户';
    
    if (!currentRoom) {
        statusDiv.textContent = '❌ 请先加入房间';
        statusDiv.style.color = 'red';
        return;
    }
    
    // Validate file
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        statusDiv.textContent = '❌ 文件过大（最大100MB）';
        statusDiv.style.color = 'red';
        return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        statusDiv.textContent = '❌ 不支持的文件格式';
        statusDiv.style.color = 'red';
        return;
    }

    // Show uploading status
    statusDiv.textContent = '⏳ 上传中...';
    statusDiv.style.color = '#4CAF50';

    try {
        // Create FormData with required fields
        const formData = new FormData();
        formData.append('file', file);
        formData.append('roomId', currentRoom);
        formData.append('uploaderId', currentUserId || 'unknown');
        formData.append('uploaderName', username);

        // Upload to backend
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Success
        statusDiv.textContent = `✅ 上传成功: ${file.name}`;
        statusDiv.style.color = '#4CAF50';

        // Display file in 3D scene (backend returns { file: {...}, object: {...} })
        displayFileIn3D(result.file);

        // Clear status after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('File upload error:', error);
        statusDiv.textContent = `❌ 上传失败: ${error.message}`;
        statusDiv.style.color = 'red';
    }
}

function displayFileIn3D(fileData) {
    if (!scene || !camera) {
        console.error('Scene or camera not initialized');
        return;
    }

    // Create a plane to display the image/PDF
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Load texture (fileData.id not fileData.fileId)
    const loader = new THREE.TextureLoader();
    loader.load(
        `/api/files/${fileData.id}`,
        (texture) => {
            // Create material with texture
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            const plane = new THREE.Mesh(geometry, material);
            
            // Position in front of camera
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            
            plane.position.copy(camera.position);
            plane.position.add(cameraDirection.multiplyScalar(3));
            
            // Face the camera
            plane.lookAt(camera.position);
            
            // Add to scene
            plane.userData.interactive = true;
            plane.userData.fileId = fileData.id;
            plane.userData.fileName = fileData.originalName || fileData.id;
            scene.add(plane);

            console.log(`✅ File displayed in 3D: ${fileData.originalName}`);
            
            // Backend already emits file:uploaded and object-created events
            // No need to emit again from frontend
        },
        undefined,
        (error) => {
            console.error('Error loading file texture:', error);
        }
    );
}

// Drag and drop support
function initDragAndDrop() {
    const dropZone = document.getElementById('controls');
    if (!dropZone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                // Create a new FileList-like object
                const event = { target: { files: files, value: '' } };
                handleFileSelect(event);
            }
        }
    }, false);
}

// Initialize on DOM ready
if (typeof window !== 'undefined') {
    window.handleFileSelect = handleFileSelect;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDragAndDrop);
    } else {
        initDragAndDrop();
    }
}
