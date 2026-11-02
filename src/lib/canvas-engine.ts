import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { FlyerTemplate } from '../types/database';

export interface CompositePayload {
  flyerImageUrl: string;
  participantImageUrl: string;
  participantName: string;
  template: FlyerTemplate;
}

/**
 * Loads an image with crossOrigin = 'anonymous' and returns a Promise
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source URL is empty.'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without anonymous if local blob/data URL
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        const retryImg = new Image();
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = (e) => reject(new Error('Failed to decode image data.'));
        retryImg.src = src;
        return;
      }
      reject(new Error(`Failed to load image from source: ${src.substring(0, 80)}...`));
    };
    img.src = src;
  });
}

/**
 * Draws an image into target bounding box using 'cover' aspect ratio
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetW / targetH;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;
  let sx = 0;
  let sy = 0;

  if (imgRatio > targetRatio) {
    sWidth = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
}

/**
 * Composites the personalized flyer at native flyer dimensions using normalized coordinates
 */
export async function renderPersonalisedFlyer(payload: CompositePayload): Promise<HTMLCanvasElement> {
  const { flyerImageUrl, participantImageUrl, participantName, template } = payload;

  const [flyerImg, participantImg] = await Promise.all([
    loadImage(flyerImageUrl),
    loadImage(participantImageUrl),
  ]);

  const canvas = document.createElement('canvas');
  const width = flyerImg.naturalWidth || 1080;
  const height = flyerImg.naturalHeight || 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D rendering canvas.');

  // 1. Draw base flyer at original full resolution (pixel-perfect)
  ctx.drawImage(flyerImg, 0, 0, width, height);

  // 2. Compute absolute coordinates from normalized template coordinates [0, 1]
  const photoX = Number(template.photo_x) * width;
  const photoY = Number(template.photo_y) * height;
  const photoW = Number(template.photo_width) * width;
  const photoH = Number(template.photo_height) * height;

  // 3. Render Participant Photo with shape clipping
  ctx.save();
  ctx.beginPath();
  if (template.photo_shape === 'circle') {
    const centerX = photoX + photoW / 2;
    const centerY = photoY + photoH / 2;
    const radius = Math.min(photoW, photoH) / 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  } else {
    // Rounded rectangle or sharp rectangle
    const cornerRadius = template.photo_crop_settings?.borderRadius ?? (Math.min(photoW, photoH) * 0.08);
    ctx.roundRect(photoX, photoY, photoW, photoH, cornerRadius);
  }
  ctx.closePath();
  ctx.clip();

  drawImageCover(ctx, participantImg, photoX, photoY, photoW, photoH);
  ctx.restore();

  // 4. Render Participant Name with auto-scaling to prevent overflowing the designated box
  const nameBoxX = Number(template.name_x) * width;
  const nameBoxY = Number(template.name_y) * height;
  const nameBoxW = Number(template.name_width) * width;
  const nameBoxH = Number(template.name_height) * height;

  // Scale relative to standard 1080px width baseline
  const scale = width / 1080;
  let dynamicFontSize = Math.max(16, Number(template.font_size || 44) * scale);
  const minFontSize = dynamicFontSize * 0.4;

  ctx.save();
  ctx.fillStyle = template.text_color || '#FFFFFF';
  ctx.textAlign = template.text_alignment || 'center';
  ctx.textBaseline = 'middle';

  const fontFamily = template.font_family || 'Plus Jakarta Sans, sans-serif';
  const fontWeight = template.font_weight || '700';

  // Measure text and downscale iteratively if name exceeds target width
  ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  while (ctx.measureText(participantName).width > nameBoxW && dynamicFontSize > minFontSize) {
    dynamicFontSize -= 2;
    ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  }

  // Anchor text coordinate according to alignment
  let targetTextX = nameBoxX + nameBoxW / 2;
  if (template.text_alignment === 'left') targetTextX = nameBoxX;
  if (template.text_alignment === 'right') targetTextX = nameBoxX + nameBoxW;

  const targetTextY = nameBoxY + nameBoxH / 2;

  // Draw clean drop shadow for contrast against complex flyer backgrounds
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2 * scale;

  ctx.fillText(participantName, targetTextX, targetTextY, nameBoxW);
  ctx.restore();

  return canvas;
}

/**
 * Downloads canvas as PNG or JPG file
 */
export function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpg'
) {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1.0 : 0.95;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  const link = document.createElement('a');
  link.download = `${cleanFilename}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads canvas as PDF preserving aspect ratio and print quality
 */
export function downloadCanvasAsPDF(canvas: HTMLCanvasElement, filename: string) {
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation: orientation as any,
    unit: 'px',
    format: [canvas.width, canvas.height],
    hotfixes: ['px_scaling'],
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

  const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  pdf.save(`${cleanFilename}.pdf`);
}

/**
 * Confetti trigger
 */
export function triggerFlyerCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#5145E5', '#16A34A', '#F59E0B', '#3B82F6', '#EC4899'],
  });
}
