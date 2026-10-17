/**
 * Camera: pan (CSS px offset of world origin on screen) and zoom (px/cell).
 * Zoom anchors at the cursor: worldX = (screenX - panX) / zoom.
 */

export interface Camera {
  panX: number;
  panY: number;
  zoom: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 64;
export const DEFAULT_ZOOM = 6;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Zoom keeping the world point under (sx, sy) fixed. Mutates cam. */
export function zoomAt(cam: Camera, sx: number, sy: number, zoom: number): void {
  const nz = clampZoom(zoom);
  cam.panX = sx - ((sx - cam.panX) / cam.zoom) * nz;
  cam.panY = sy - ((sy - cam.panY) / cam.zoom) * nz;
  cam.zoom = nz;
}

export function panBy(cam: Camera, dx: number, dy: number): void {
  cam.panX += dx;
  cam.panY += dy;
}

export function screenToWorldX(cam: Camera, sx: number): number {
  return Math.floor((sx - cam.panX) / cam.zoom);
}

export function screenToWorldY(cam: Camera, sy: number): number {
  return Math.floor((sy - cam.panY) / cam.zoom);
}

export function worldToScreenX(cam: Camera, wx: number): number {
  return wx * cam.zoom + cam.panX;
}

export function worldToScreenY(cam: Camera, wy: number): number {
  return wy * cam.zoom + cam.panY;
}

export function centerOn(cam: Camera, wx: number, wy: number, cssW: number, cssH: number): void {
  cam.panX = cssW / 2 - wx * cam.zoom;
  cam.panY = cssH / 2 - wy * cam.zoom;
}

/**
 * Fit a world rect (inclusive cell bounds) into the view with padding.
 * Empty rects (min > max) fall back to a default box around the origin.
 */
export function fitRect(
  cam: Camera,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  cssW: number,
  cssH: number,
  pad = 48,
): void {
  if (minX > maxX || minY > maxY) {
    minX = -32;
    minY = -32;
    maxX = 32;
    maxY = 32;
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const z = clampZoom(Math.min((cssW - 2 * pad) / w, (cssH - 2 * pad) / h));
  cam.zoom = z;
  centerOn(cam, (minX + maxX) / 2 + 0.5, (minY + maxY) / 2 + 0.5, cssW, cssH);
}
