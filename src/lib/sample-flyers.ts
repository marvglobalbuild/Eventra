/**
 * High-resolution canvas-generated base flyer templates.
 * Provides realistic, beautiful base posters for immediate testing and production fallback.
 */

export function createSampleFlyerDataUrl(type: 'tech' | 'gala' | 'music'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d')!;

  if (type === 'tech') {
    // 1. Tech Summit Background: Deep Slate Indigo Gradient with Modern Grid
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(0.4, '#1E1B4B');
    grad.addColorStop(1, '#090D16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Tech Geometric Patterns
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 60; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1350);
      ctx.stroke();
    }
    for (let y = 60; y < 1350; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // Glowing accents
    const glow = ctx.createRadialGradient(540, 480, 50, 540, 480, 360);
    glow.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
    glow.addColorStop(1, 'rgba(79, 70, 229, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 200, 1080, 600);

    // Header Badges & Typography
    ctx.fillStyle = '#6366F1';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('GLOBAL DEVELOPER & AI SUMMIT', 540, 140);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('NEXT HORIZON 2026', 540, 220);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('NOVEMBER 14-16 · SAN FRANCISCO & VIRTUAL', 540, 275);

    // Designated Photo Placeholder Frame
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 530, 160, 0, Math.PI * 2);
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#1E293B';
    ctx.fill();

    // Subtle inner placeholder guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();

    // Keynote Badge
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.roundRect(420, 710, 240, 42, 21);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('CONFIRMED SPEAKER', 540, 738);

    // Bottom Details Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, 960, 800, 240, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Join 5,000+ Founders, Engineers & Visionaries', 540, 1030);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Keynotes · Workshops · Networking · Hackathons', 540, 1080);

    ctx.fillStyle = '#818CF8';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('WWW.NEXTHORIZON2026.IO', 540, 1140);
  } else if (type === 'gala') {
    // 2. Worship Expression / Gala Evening
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    grad.addColorStop(0, '#180E29');
    grad.addColorStop(0.5, '#2D124D');
    grad.addColorStop(1, '#0F081B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Golden Accent Frame
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 980, 1250);

    ctx.fillStyle = '#EAB308';
    ctx.font = '600 22px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '8px';
    ctx.fillText('AN EVENING OF PRAISE & ADORATION', 540, 150);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 72px "Playfair Display", serif';
    ctx.fillText('WORSHIP EXPRESSION', 540, 240);

    ctx.fillStyle = '#D8B4FE';
    ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('LIVE WORSHIP & ORCHESTRA · DECEMBER 2026', 540, 300);

    // Photo Area Circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 560, 175, 0, Math.PI * 2);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#26163F';
    ctx.fill();
    ctx.restore();

    // Delegate Tag
    ctx.fillStyle = '#FACC15';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('HONORED ATTENDEE', 540, 770);

    // Event Info
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 26px "Playfair Display", serif';
    ctx.fillText('Main Auditorium · Grand Symphony Hall', 540, 1040);

    ctx.fillStyle = '#C084FC';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Red Carpet 6:00 PM · Worship Commences 7:00 PM', 540, 1090);
  } else {
    // 3. Creative Music Festival / Design Conf
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.fillStyle = '#10B981';
    ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '5px';
    ctx.fillText('GLOBAL CREATIVE FESTIVAL', 540, 150);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 76px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PULSE LIVE 2026', 540, 240);

    // Photo Area Rectangular
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(380, 390, 320, 320, 24);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#1E293B';
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('FESTIVAL PASS HOLDER', 540, 750);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('3 Stages · 40 Artists · Interactive Art Lab', 540, 1060);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

// Sample Portrait Data URL generator for instant preview & testing
export function createSamplePortraitDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  // Smooth warm portrait background
  const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
  bgGrad.addColorStop(0, '#38BDF8');
  bgGrad.addColorStop(1, '#4F46E5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 600, 600);

  // Stylized head & shoulders avatar
  // Torso
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(300, 580, 220, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.fillStyle = '#FBCFE8';
  ctx.fillRect(260, 340, 80, 100);

  // Head
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(300, 280, 110, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(300, 250, 120, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(260, 275, 12, 0, Math.PI * 2);
  ctx.arc(340, 275, 12, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(300, 305, 36, 0.2, Math.PI - 0.2);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
