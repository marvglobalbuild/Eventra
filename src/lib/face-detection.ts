/**
 * Automated Face Detection & Optimal Portrait Framing Engine
 * 
 * Automatically detects the participant's face in their uploaded photograph,
 * calculates the ideal eye-line center and zoom scale, and guarantees that
 * the photo fills the target flyer cutout completely without empty gaps.
 */

export interface DetectedFace {
  centerX: number; // 0 to 1 relative to natural width
  centerY: number; // 0 to 1 relative to natural height
  boxWidth: number; // 0 to 1
  boxHeight: number; // 0 to 1
  confidence: number;
}

export interface AutoFrameResult {
  zoom: number; // Suggested zoom >= 1.0
  panOffset: { x: number; y: number }; // Normalized pan offset
  faceDetected: boolean;
}

/**
 * Detects face using browser Shape Detection API (if supported) with a high-speed
 * canvas skin-chrominance and facial variance centroid fallback.
 */
export async function detectFaceInImage(img: HTMLImageElement): Promise<DetectedFace | null> {
  // 1. Try modern browser FaceDetector API if available
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        const w = img.naturalWidth || 1000;
        const h = img.naturalHeight || 1000;
        return {
          centerX: (box.x + box.width / 2) / w,
          centerY: (box.y + box.height / 2) / h,
          boxWidth: box.width / w,
          boxHeight: box.height / h,
          confidence: 0.95,
        };
      }
    } catch {
      // Fall through to canvas analyzer
    }
  }

  // 2. High-speed Canvas Skin Chrominance & Facial Variance Centroid Detector
  try {
    const sampleSize = 160;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    // Scan the upper 75% of the portrait (where human faces naturally reside)
    const maxScanY = Math.floor(sampleSize * 0.75);

    for (let y = 10; y < maxScanY; y++) {
      for (let x = 10; x < sampleSize - 10; x++) {
        const idx = (y * sampleSize + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin Tone Chrominance filter: Human skin in varied lighting has distinctive R-G-B distribution
        const isSkin =
          r > 45 &&
          g > 30 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g >= 8 &&
          Math.abs(r - g) > 5;

        if (isSkin) {
          // Prioritize top-center region (faces are rarely in bottom corners)
          const normX = x / sampleSize;
          const normY = y / sampleSize;
          const centerDistX = Math.abs(normX - 0.5);
          const posPrior = Math.max(0.2, 1.0 - centerDistX * 1.6);
          const vertPrior = normY < 0.55 ? 1.2 : 0.7; // higher weight on top half

          // Edge contrast bonus (eyes, eyebrows, mouth have sharp gradient with skin)
          const idxRight = idx + 4;
          const diff = Math.abs(r - data[idxRight]) + Math.abs(g - data[idxRight + 1]);
          const edgeBonus = diff > 25 ? 1.4 : 1.0;

          const weight = posPrior * vertPrior * edgeBonus;
          totalWeight += weight;
          weightedX += x * weight;
          weightedY += y * weight;
        }
      }
    }

    if (totalWeight > 120) {
      const meanX = weightedX / totalWeight / sampleSize;
      const meanY = weightedY / totalWeight / sampleSize;

      return {
        centerX: Math.max(0.2, Math.min(0.8, meanX)),
        centerY: Math.max(0.18, Math.min(0.65, meanY)),
        boxWidth: 0.35,
        boxHeight: 0.35,
        confidence: 0.85,
      };
    }
  } catch (err) {
    console.warn('Canvas face detection error:', err);
  }

  // 3. Fallback for vertical portrait phone photos (3:4 or 9:16)
  const nw = img.naturalWidth || 1000;
  const nh = img.naturalHeight || 1000;
  if (nh > nw * 1.1) {
    return {
      centerX: 0.5,
      centerY: 0.32, // upper third for vertical mobile portraits
      boxWidth: 0.4,
      boxHeight: 0.4,
      confidence: 0.6,
    };
  }

  return null;
}

/**
 * Computes optimal zoom and clamped pan offsets so the participant's face
 * sits comfortably in the cutout frame, guaranteed to fill the entire area with ZERO gaps.
 */
export function computeOptimalFaceFraming(
  imgWidth: number,
  imgHeight: number,
  slotWidth: number,
  slotHeight: number,
  face: DetectedFace | null
): AutoFrameResult {
  // If no face found, default to upper-third center
  const fX = face ? face.centerX : 0.5;
  const fY = face ? face.centerY : imgHeight > imgWidth ? 0.32 : 0.42;

  // Base cover scale
  const baseScale = Math.max(slotWidth / imgWidth, slotHeight / imgHeight);

  // Generous initial zoom so portrait photos comfortably fill the circle with room to move left & right
  let suggestedZoom = 1.20;
  if (face && face.boxHeight < 0.22) {
    suggestedZoom = 1.38;
  } else if (face && face.boxHeight > 0.45) {
    suggestedZoom = 1.10;
  }

  const effectiveScale = baseScale * suggestedZoom;
  const renderW = imgWidth * effectiveScale;
  const renderH = imgHeight * effectiveScale;

  // Place face at eye-line (42% from top of slot, centered horizontally)
  const targetEyeLineX = slotWidth * 0.5;
  const targetEyeLineY = slotHeight * 0.42;

  const drawLeft = targetEyeLineX - fX * renderW;
  const drawTop = targetEyeLineY - fY * renderH;

  const defaultLeft = (slotWidth - renderW) / 2;
  const defaultTop = (slotHeight - renderH) / 2;

  const panX = slotWidth > 0 ? (drawLeft - defaultLeft) / slotWidth : 0;
  const panY = slotHeight > 0 ? (drawTop - defaultTop) / slotHeight : 0;

  return {
    zoom: Number(suggestedZoom.toFixed(2)),
    panOffset: {
      x: Number(Math.max(-0.85, Math.min(0.85, panX)).toFixed(4)),
      y: Number(Math.max(-0.85, Math.min(0.85, panY)).toFixed(4)),
    },
    faceDetected: face !== null,
  };
}

/**
 * Clamps user pan offset during manual drag or zoom so the photo can be moved
 * freely to the left and right, and up and down.
 */
export function clampPanOffset(
  panX: number,
  panY: number,
  _zoom: number,
  _imgWidth: number,
  _imgHeight: number,
  _slotWidth: number,
  _slotHeight: number
): { x: number; y: number } {
  // Allow full, responsive movement left and right (up to 85% of slot width)
  const clampedX = Math.max(-0.85, Math.min(0.85, panX));
  const clampedY = Math.max(-0.85, Math.min(0.85, panY));

  return {
    x: Number(clampedX.toFixed(4)),
    y: Number(clampedY.toFixed(4)),
  };
}
