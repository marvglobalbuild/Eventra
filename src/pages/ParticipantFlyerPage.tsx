import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { resolveFlyerSource, uploadParticipantPhoto, getSupabase } from '../lib/supabase';
import { FlyerEvent, FlyerTemplate, Participant } from '../types/database';
import { 
  renderPersonalisedFlyer, 
  downloadCanvasAsImage, 
  downloadCanvasAsPDF,
  triggerFlyerCelebration 
} from '../lib/canvas-engine';
import { createSamplePortraitDataUrl, createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { 
  Camera, Upload, Download, FileImage, FileText, CheckCircle2, 
  RefreshCw, Loader2, AlertCircle, Sparkles, ArrowLeft, Shield, Calendar, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Minus, RotateCcw, Move, Check, Maximize2
} from 'lucide-react';

export const ParticipantFlyerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [template, setTemplate] = useState<FlyerTemplate | null>(null);
  const [flyerSrc, setFlyerSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<FlyerEvent[]>([]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Photo Framing & Zoom Controls
  const [zoom, setZoom] = useState<number>(1.25);
  const [frameScale, setFrameScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number }>({
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
  });

  // Output Result State
  const [generatedCanvas, setGeneratedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: panOffset.x,
      origPanY: panOffset.y,
    };
  };

  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPhoto) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPanOffset({
      x: Math.max(-120, Math.min(120, dragStartRef.current.origPanX + dx)),
      y: Math.max(-120, Math.min(120, dragStartRef.current.origPanY + dy)),
    });
  };

  const handlePhotoMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  const handlePhotoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      origPanX: panOffset.x,
      origPanY: panOffset.y,
    };
  };

  const handlePhotoTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingPhoto || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.startX;
    const dy = e.touches[0].clientY - dragStartRef.current.startY;
    setPanOffset({
      x: Math.max(-120, Math.min(120, dragStartRef.current.origPanX + dx)),
      y: Math.max(-120, Math.min(120, dragStartRef.current.origPanY + dy)),
    });
  };

  const handlePhotoTouchEnd = () => {
    setIsDraggingPhoto(false);
  };

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      // 1. Ensure initial local data / seed database is loaded on first visit
      await initializeLocalData();
    } catch (err) {
      console.warn('initializeLocalData non-fatal error:', err);
    }

    const allEvents = db.getEvents();
    setAvailableEvents(allEvents.filter((e) => e.status !== 'archived'));

    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // 2. Normalize slug (remove trailing slashes, decode URI, trim)
    const cleanSlug = decodeURIComponent(slug).replace(/\/+$/, '').trim().toLowerCase();

    // 3. Search local storage first
    let ev = db.getEventBySlug(cleanSlug);

    // 4. If not exact match, search by partial slug or ID
    if (!ev) {
      ev = allEvents.find((e) => {
        const s = e.slug.toLowerCase();
        return s === cleanSlug || s.includes(cleanSlug) || cleanSlug.includes(s) || e.id === cleanSlug;
      }) || null;
    }

    // 5. If still not found, query Supabase database
    if (!ev) {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('events')
            .select('*')
            .ilike('slug', `%${cleanSlug}%`)
            .maybeSingle();

          if (data && !error) {
            ev = data as FlyerEvent;
            db.saveEvent(ev);
          }
        } catch (err) {
          console.warn('Supabase remote event query failed:', err);
        }
      }
    }

    if (!ev || ev.status === 'archived') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setEvent(ev);

    // 6. Find or fetch template
    let tmpl = db.getTemplateByEventId(ev.id);
    if (!tmpl) {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data } = await sb
            .from('flyer_templates')
            .select('*')
            .eq('event_id', ev.id)
            .maybeSingle();
          if (data) {
            tmpl = data as FlyerTemplate;
            db.saveTemplate(tmpl);
          }
        } catch (err) {
          console.warn('Supabase remote template query error:', err);
        }
      }
    }

    // Fallback template guarantee so flyer customization never crashes
    if (!tmpl) {
      tmpl = {
        id: `tmpl_${ev.id}`,
        event_id: ev.id,
        photo_x: 0.28,
        photo_y: 0.26,
        photo_width: 0.44,
        photo_height: 0.44,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1, frameScale: 1.0 },
        name_x: 0.15,
        name_y: 0.62,
        name_width: 0.70,
        name_height: 0.08,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '700',
        text_color: '#FFFFFF',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveTemplate(tmpl);
    }
    setTemplate(tmpl);

    // Auto-detect if template has small circle width on flyer with large cutout, setting smart fill default
    if (tmpl.photo_shape === 'circle' && tmpl.photo_width <= 0.32) {
      setFrameScale(tmpl.photo_crop_settings?.frameScale ?? 1.45);
    } else if (tmpl.photo_crop_settings?.frameScale) {
      setFrameScale(tmpl.photo_crop_settings.frameScale);
    }

    // 7. Resolve flyer image source
    let resolved = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);
    if (!resolved || resolved === '') {
      resolved = createSampleFlyerDataUrl('tech');
    }
    setFlyerSrc(resolved);
    setLoading(false);
  };

  const processImageFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('Image size must be smaller than 20MB.');
      return;
    }

    setErrorMessage(null);
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleUseSamplePortrait = () => {
    const sample = createSamplePortraitDataUrl();
    setPhotoPreviewUrl(sample);
    setPhotoFile(null);
    setErrorMessage(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!photoPreviewUrl) {
      setErrorMessage('Please upload your portrait photograph.');
      return;
    }
    if (!event || !template || !flyerSrc) return;

    setGenerating(true);
    setErrorMessage(null);
    setGenerationStep('Analyzing photograph & framing portrait...');
    setGenerationProgress(25);

    try {
      await new Promise((r) => setTimeout(r, 200));
      // 1. Upload participant photo or store locally
      let photoPath = 'sample-portrait';
      if (photoFile) {
        setGenerationStep('Normalizing image resolution...');
        setGenerationProgress(50);
        const uploadRes = await uploadParticipantPhoto(photoFile, event.id);
        photoPath = uploadRes.path;
      }

      // 2. Record participant
      setGenerationStep('Aligning template coordinates...');
      setGenerationProgress(75);
      const newParticipant: Participant = {
        id: `part_${Date.now()}`,
        event_id: event.id,
        full_name: fullName.trim(),
        photo_path: photoPath,
        created_at: new Date().toISOString(),
      };
      db.addParticipant(newParticipant);
      setParticipantId(newParticipant.id);

      // 3. Composite flyer using client Canvas Engine at native flyer resolution
      setGenerationStep('Compositing ultra high-res print flyer...');
      setGenerationProgress(90);

      // Compute normalized offset coordinates based on preview frame radius (80px radius = 160px width)
      const normalizedOffsetX = Number((panOffset.x / 80).toFixed(3));
      const normalizedOffsetY = Number((panOffset.y / 80).toFixed(3));

      const canvas = await renderPersonalisedFlyer({
        flyerImageUrl: flyerSrc,
        participantImageUrl: photoPreviewUrl,
        participantName: fullName.trim(),
        template: template,
        cropSettings: {
          zoom,
          offsetX: normalizedOffsetX,
          offsetY: normalizedOffsetY,
          frameScale,
        },
      });

      setGenerationProgress(100);
      await new Promise((r) => setTimeout(r, 250));

      setGeneratedCanvas(canvas);
      setResultImageUrl(canvas.toDataURL('image/jpeg', 0.95));
      triggerFlyerCelebration();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error generating your personalized flyer. Please try again.');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep('');
    }
  };

  const handleDownload = (format: 'png' | 'jpg' | 'pdf') => {
    if (!generatedCanvas || !event) return;

    setDownloadingFormat(format);
    const baseName = `${fullName.trim().replace(/\s+/g, '-')}-${event.event_name.replace(/\s+/g, '-')}-Flyer`;

    if (format === 'pdf') {
      downloadCanvasAsPDF(generatedCanvas, baseName);
    } else {
      downloadCanvasAsImage(generatedCanvas, baseName, format);
    }

    // Record download
    db.recordDownload({
      id: `dl_${Date.now()}`,
      participant_id: participantId,
      event_id: event.id,
      format: format,
      downloaded_at: new Date().toISOString(),
    });

    setTimeout(() => {
      setDownloadingFormat(null);
    }, 1500);
  };

  const handleReset = () => {
    setResultImageUrl(null);
    setGeneratedCanvas(null);
    setFullName('');
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setErrorMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#6425E8] animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#73738A]">Loading Event Flyer...</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
        <div className="mb-6">
          <EventraLogo variant="with-tagline" size="md" />
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#111126]">Event Link Not Found</h2>
          <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
            We couldn't locate an event matching <code className="bg-[#F1F3F9] px-1.5 py-0.5 rounded text-[#111126] font-mono">/e/{slug}</code>. The link may have changed or the organiser may have updated the event address.
          </p>

          {availableEvents.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#E9E8F0] text-left">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-3">
                Active Events You Can Personalise
              </span>
              <div className="space-y-2.5">
                {availableEvents.slice(0, 3).map((av) => (
                  <button
                    key={av.id}
                    onClick={() => navigate(`/e/${av.slug}`)}
                    className="interactive-card w-full p-3 bg-[#F8F8FC] hover:bg-white border border-[#E9E8F0] hover:border-[#6425E8] rounded-xl text-left transition flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-[#111126] truncate">{av.event_name}</p>
                      <p className="text-[10px] text-[#73738A] truncate">{av.venue || 'Virtual & In-Person'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#6425E8] shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Open Flyer →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E9E8F0] flex flex-col sm:flex-row items-center gap-2">
            <Link
              to="/"
              className="interactive-btn w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Go to Eventra Homepage
            </Link>
            <Link
              to="/dashboard"
              className="interactive-btn w-full py-2.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-semibold rounded-xl transition"
            >
              Organiser Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8FC] py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <EventraLogo variant="with-tagline" size="md" />
      </div>

      {/* Mobile-first, focused card container */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E9E8F0] shadow-sm overflow-hidden flex flex-col relative">
        {/* Event Header Banner */}
        <div className="p-6 border-b border-[#E9E8F0] text-center bg-white relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-3 py-1 rounded-full">
            Personalised Event Flyer
          </span>
          <h1 className="text-lg font-bold text-[#111126] mt-2.5 leading-tight">{event.event_name}</h1>
          <p className="text-xs text-[#73738A] mt-1">
            Add your name and photograph to generate your custom flyer.
          </p>
        </div>

        {/* Form OR Result View */}
        {!resultImageUrl ? (
          <form onSubmit={handleGenerate} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-scale-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field 1: Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                disabled={generating}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-sm text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            {/* Field 2: Photograph with Drag & Drop */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                  Upload Your Photograph
                </label>
                <button
                  type="button"
                  disabled={generating}
                  onClick={handleUseSamplePortrait}
                  className="text-[11px] font-semibold text-[#6425E8] hover:underline"
                >
                  Use sample portrait
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                disabled={generating}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {!photoPreviewUrl ? (
                <div
                  onClick={() => !generating && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-[#6425E8] bg-[#6425E8]/10 scale-[1.02]'
                      : 'border-[#E9E8F0] hover:border-[#6425E8] bg-[#F8F8FC] hover:bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6425E8]/10 flex items-center justify-center text-[#6425E8] mb-2">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#111126]">
                    {isDraggingOver ? 'Drop photo to upload' : 'Click, tap, or drag photo here'}
                  </span>
                  <span className="text-[11px] text-[#73738A] mt-0.5">JPG, PNG, or WebP up to 20MB</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E9E8F0] p-4 bg-[#F8F8FC] space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#111126] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#6425E8]" />
                      <span>Adjust & Zoom Photo</span>
                    </span>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-[#6425E8] hover:underline"
                    >
                      Change photo
                    </button>
                  </div>

                  {/* Interactive Framing Viewport matching flyer slot */}
                  <div
                    className="relative w-full h-60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl overflow-hidden flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing border border-slate-800 shadow-inner"
                    onMouseDown={handlePhotoMouseDown}
                    onMouseMove={handlePhotoMouseMove}
                    onMouseUp={handlePhotoMouseUp}
                    onMouseLeave={handlePhotoMouseUp}
                    onTouchStart={handlePhotoTouchStart}
                    onTouchMove={handlePhotoTouchMove}
                    onTouchEnd={handlePhotoTouchEnd}
                  >
                    {/* Dimmed backdrop blur */}
                    <img
                      src={photoPreviewUrl}
                      alt="Backdrop"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md pointer-events-none"
                    />

                    {/* Circular or Rectangular Cutout Frame */}
                    <div
                      className={`relative overflow-hidden ring-4 ring-white shadow-2xl transition-all ${
                        template?.photo_shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                      }`}
                      style={{
                        width: `${Math.round(176 * Math.min(1.28, Math.max(0.85, frameScale))) }px`,
                        height: `${Math.round(176 * Math.min(1.28, Math.max(0.85, frameScale))) }px`,
                      }}
                    >
                      <img
                        src={photoPreviewUrl}
                        alt="Framed Portrait"
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none"
                        style={{
                          transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>

                    {/* Drag Helper Tip Badge */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#111126]/85 backdrop-blur-md text-white text-[10px] font-medium px-3 py-1 rounded-full pointer-events-none shadow flex items-center gap-1.5">
                      <Move className="w-3 h-3 text-[#9638F5]" />
                      <span>Drag to center face · Zoom to fill circle</span>
                    </div>
                  </div>

                  {/* Zoom Slider and Controls */}
                  <div className="space-y-2 pt-1 bg-white p-3 rounded-xl border border-[#E9E8F0]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#111126] flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span>Face Zoom</span>
                      </span>
                      <span className="font-mono font-bold text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-md">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setZoom((prev) => Math.max(1.0, Number((prev - 0.15).toFixed(2))))}
                        className="w-8 h-8 rounded-lg bg-[#F8F8FC] border border-[#E9E8F0] flex items-center justify-center text-[#73788A] hover:text-[#111126] hover:bg-[#EEF0F6] font-bold text-sm shadow-2xs active:scale-95 transition"
                        title="Zoom Out"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-[#6425E8] h-2 bg-[#E9E8F0] rounded-lg cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => setZoom((prev) => Math.min(3.0, Number((prev + 0.15).toFixed(2))))}
                        className="w-8 h-8 rounded-lg bg-[#F8F8FC] border border-[#E9E8F0] flex items-center justify-center text-[#73788A] hover:text-[#111126] hover:bg-[#EEF0F6] font-bold text-sm shadow-2xs active:scale-95 transition"
                        title="Zoom In"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Presets & Reset */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1.5">
                        {[
                          { label: 'Fit (1x)', val: 1.0 },
                          { label: 'Portrait (1.3x)', val: 1.3 },
                          { label: 'Close-Up (1.8x)', val: 1.8 },
                        ].map((p) => (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => setZoom(p.val)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                              Math.abs(zoom - p.val) < 0.05
                                ? 'bg-[#6425E8] text-white'
                                : 'bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1.25);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className="text-[10px] font-semibold text-[#73788A] hover:text-[#111126] flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Center</span>
                      </button>
                    </div>
                  </div>

                  {/* Frame Size / Fill White Space Controls */}
                  <div className="space-y-2 pt-2 bg-white p-3 rounded-xl border border-[#E9E8F0]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#111126] flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span>Photo Circle Size (Fill White Space)</span>
                      </span>
                      <span className="font-mono font-bold text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-md text-[11px]">
                        {Math.round(frameScale * 100)}% ({frameScale >= 1.3 ? 'Filling Cutout' : 'Standard'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFrameScale((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))))}
                        className="w-8 h-8 rounded-lg bg-[#F8F8FC] border border-[#E9E8F0] flex items-center justify-center text-[#73788A] hover:text-[#111126] hover:bg-[#EEF0F6] font-bold text-sm shadow-2xs active:scale-95 transition"
                        title="Shrink Circle Size"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="range"
                        min="0.8"
                        max="2.2"
                        step="0.05"
                        value={frameScale}
                        onChange={(e) => setFrameScale(parseFloat(e.target.value))}
                        className="flex-1 accent-[#6425E8] h-2 bg-[#E9E8F0] rounded-lg cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => setFrameScale((prev) => Math.min(2.2, Number((prev + 0.1).toFixed(2))))}
                        className="w-8 h-8 rounded-lg bg-[#F8F8FC] border border-[#E9E8F0] flex items-center justify-center text-[#73788A] hover:text-[#111126] hover:bg-[#EEF0F6] font-bold text-sm shadow-2xs active:scale-95 transition"
                        title="Expand Circle to Fill Space"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Presets for Filling White Space */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Normal (1x)', val: 1.0 },
                          { label: 'Fill Cutout (1.35x)', val: 1.35 },
                          { label: 'Full White Space (1.45x)', val: 1.45 },
                          { label: 'Extra Large (1.7x)', val: 1.7 },
                        ].map((p) => (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => setFrameScale(p.val)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                              Math.abs(frameScale - p.val) < 0.04
                                ? 'bg-[#6425E8] text-white shadow-xs'
                                : 'bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setFrameScale(1.0)}
                        className="text-[10px] font-semibold text-[#73788A] hover:text-[#111126] flex items-center gap-1"
                        title="Reset circle size"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Generation Progress Indicator */}
            {generating && (
              <div className="p-4 bg-[#F8F8FC] border border-[#6425E8]/30 rounded-xl space-y-2 animate-slide-up-fade">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#111126] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-[#6425E8] animate-spin" />
                    {generationStep}
                  </span>
                  <span className="font-mono font-bold text-[#6425E8]">{generationProgress}%</span>
                </div>
                <div className="w-full bg-[#E9E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6425E8] to-[#9638F5] transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={generating}
              className="interactive-btn w-full py-3 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2 animate-pulse-glow"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing High-Res Flyer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Flyer</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[11px] text-[#73738A]">
                No account required · Generates instantly
              </span>
            </div>
          </form>
        ) : (
          /* Result Screen */
          <div className="p-6 space-y-5 animate-scale-up">
            <div className="text-center">
              <div className="inline-flex items-center space-x-1.5 text-emerald-600 text-xs font-bold mb-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Your Personalised Flyer is Ready!</span>
              </div>

              {/* Flyer Display with subtle frame hover */}
              <div className="rounded-xl overflow-hidden shadow-lg border border-[#E9E8F0] bg-black/5 relative group">
                <img
                  src={resultImageUrl}
                  alt="Personalised Flyer"
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Download Options */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] text-center mb-2">
                Download Format
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="interactive-btn py-2.5 px-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'png' ? 'Saved!' : 'PNG (Hi-Res)'}</span>
                </button>

                <button
                  onClick={() => handleDownload('jpg')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'jpg' ? 'Saved!' : 'JPG'}</span>
                </button>

                <button
                  onClick={() => handleDownload('pdf')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>{downloadingFormat === 'pdf' ? 'Saved!' : 'PDF Document'}</span>
                </button>
              </div>
            </div>

            {/* Generate Another Option */}
            <div className="pt-2 border-t border-[#E9E8F0] text-center">
              <button
                onClick={handleReset}
                className="interactive-btn text-xs font-medium text-[#73738A] hover:text-[#111126] inline-flex items-center space-x-1.5 py-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Create Another Flyer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clean footer */}
      <div className="mt-6 text-center text-[11px] text-[#73738A] flex items-center space-x-2">
        <span>Powered by Eventra Create</span>
        <span>·</span>
        <span className="text-[#6425E8] font-semibold">Events. Elevated.</span>
      </div>
    </div>
  );
};
