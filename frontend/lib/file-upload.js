// File Upload System
// Handles file selection, upload, and display in 3D scene

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('upload-status');
    
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
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Upload to backend
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Success
        statusDiv.textContent = `✅ 上传成功: ${file.name}`;
        statusDiv.style.color = '#4CAF50';

        // Display file in 3D scene
        displayFileIn3D(result);

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
    
    // Load texture
    const loader = new THREE.TextureLoader();
    loader.load(
        `/api/files/${fileData.fileId}`,
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
            plane.userData.fileId = fileData.fileId;
            plane.userData.fileName = fileData.fileName;
            scene.add(plane);

            console.log(`✅ File displayed in 3D: ${fileData.fileName}`);
            
            // Notify via socket if connected
            if (socket && socket.connected) {
                socket.emit('file-uploaded', {
                    fileId: fileData.fileId,
                    fileName: fileData.fileName,
                    position: plane.position,
                    rotation: plane.rotation
                });
            }
        },
        undefined,
        (error) => {
            console.error('Error loading file texture:', error);
        }
    );
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.handleFileSelect = handleFileSelect;
}
