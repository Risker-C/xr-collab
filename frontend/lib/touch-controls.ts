export type TouchStartData = {
  startX: number
  startY: number
  startTime: number
}

export class TouchControls {
  private touches = new Map<number, TouchStartData>()

  handleTouchStart(e: TouchEvent) {
    for (const touch of Array.from(e.touches)) {
      this.touches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      })
    }
  }

  handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const start = this.touches.get(touch.identifier)
      if (start) {
        const deltaX = touch.clientX - start.startX
        const deltaY = touch.clientY - start.startY
        this.rotateCamera(deltaX * 0.01, deltaY * 0.01)
      }
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = [e.touches[0], e.touches[1]]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      this.zoom(distance)
    }
  }

  handleTouchEnd(e: TouchEvent) {
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.delete(touch.identifier)
    }
  }

  // Placeholder methods to be wired into the camera controller
  protected rotateCamera(_deltaX: number, _deltaY: number) {}

  protected zoom(_distance: number) {}
}
