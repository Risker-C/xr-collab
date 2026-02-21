// Interactive Feedback System
// Provides visual and audio feedback for user interactions

class InteractiveFeedback {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        this.selectedObject = null;
        
        this.init();
    }

    init() {
        // Add mouse move listener for hover effects
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Add click listener for selection feedback
        document.addEventListener('click', (e) => this.onClick(e));
        
        console.log('✅ Interactive feedback system initialized');
    }

    onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get intersected objects
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Filter out non-interactive objects
        const interactiveObjects = intersects.filter(i => 
            i.object.userData.interactive !== false &&
            !i.object.userData.isGround &&
            !i.object.userData.isUI
        );

        if (interactiveObjects.length > 0) {
            const newHovered = interactiveObjects[0].object;
            
            if (this.hoveredObject !== newHovered) {
                // Remove highlight from previous object
                if (this.hoveredObject) {
                    this.removeHighlight(this.hoveredObject);
                }
                
                // Add highlight to new object
                this.hoveredObject = newHovered;
                this.addHighlight(this.hoveredObject);
                
                // Change cursor
                document.body.style.cursor = 'pointer';
            }
        } else {
            // No object hovered
            if (this.hoveredObject) {
                this.removeHighlight(this.hoveredObject);
                this.hoveredObject = null;
            }
            document.body.style.cursor = 'default';
        }
    }

    onClick(event) {
        if (this.hoveredObject) {
            this.selectObject(this.hoveredObject);
            this.showFeedback('Object selected', 'success');
        }
    }

    addHighlight(object) {
        if (!object || !object.material) return;
        
        // Store original emissive
        if (!object.userData.originalEmissive) {
            object.userData.originalEmissive = object.material.emissive ? 
                object.material.emissive.clone() : new THREE.Color(0x000000);
        }
        
        // Add glow effect
        if (object.material.emissive) {
            object.material.emissive.setHex(0x444444);
        }
    }

    removeHighlight(object) {
        if (!object || !object.material) return;
        
        // Restore original emissive (unless selected)
        if (object !== this.selectedObject && object.userData.originalEmissive) {
            if (object.material.emissive) {
                object.material.emissive.copy(object.userData.originalEmissive);
            }
        }
    }

    selectObject(object) {
        // Remove selection from previous object
        if (this.selectedObject && this.selectedObject !== object) {
            this.deselectObject(this.selectedObject);
        }
        
        this.selectedObject = object;
        
        // Add selection highlight (stronger than hover)
        if (object.material && object.material.emissive) {
            object.material.emissive.setHex(0xff6600);
        }
    }

    deselectObject(object) {
        if (!object || !object.material) return;
        
        // Restore original emissive
        if (object.userData.originalEmissive && object.material.emissive) {
            object.material.emissive.copy(object.userData.originalEmissive);
        }
    }

    showFeedback(message, type = 'info') {
        // Create feedback toast
        const toast = document.createElement('div');
        toast.className = `feedback-toast feedback-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.showFeedback(message, 'error');
    }

    showSuccess(message) {
        this.showFeedback(message, 'success');
    }

    destroy() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('click', this.onClick);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractiveFeedback;
}
