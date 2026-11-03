import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { resolveFlyerSource, uploadParticipantPhoto, getSupabase } from '../lib/supabase';
import { FlyerEvent, FlyerTemplate, Participant } from '../types/database';
import { 
  renderPersonalisedFlyer, 
  downloadCanvasAsImage, 
  downloadCanvasAsPDF,
  triggerFlyerCelebration,
  isLightColor 
} from '../lib/canvas-engine';
import { 
  detectFaceInImage, 
  computeOptimalFaceFraming, 
  clampPanOffset 
} from '../lib/face-detection';
import { createSamplePortraitDataUrl, createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { EventraLogo } from '../components/EventraLogo';
import { Navbar } from '../components/Navbar';
import { 
  Camera, Upload, Download, FileImage, FileText, CheckCircle2, 
  RefreshCw, Loader2, AlertCircle, ArrowLeft, Shield, Calendar, 
  ZoomIn, ZoomOut, Plus, Minus, RotateCcw, Move, User, Sparkles
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
  const [autoFramedBadge, setAutoFramedBadge] = useState<string | null>(null);

  // Photo Framing & Zoom Controls (Fluid 2D Panning left/right/up/down)
  const [zoom, setZoom] = useState<number>(1.2);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Layout & Exact Pixel Dimensions Tracking
  const flyerImgRef = useRef<HTMLImageElement>(null);
  const photoSlotRef = useRef<HTMLDivElement>(null);
  const [flyerRenderDim, setFlyerRenderDim] = useState<{ width: number; height: number }>({ width: 360, height: 450 });
  const [photoNaturalDim, setPhotoNaturalDim] = useState<{ width: number; height: number }>({ width: 1000, height: 1000 });
  const [slotDim, setSlotDim] = useState<{ width: number; height: number }>({ width: 140, height: 140 });

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

  // Measure and update the flyer image's rendered dimensions on screen
  const updateFlyerDimensions = useCallback(() => {
    if (!flyerImgRef.current) return;
    const rect = flyerImgRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setFlyerRenderDim({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateFlyerDimensions);
    return () => window.removeEventListener('resize', updateFlyerDimensions);
  }, [updateFlyerDimensions]);

  // Track rendered slot dimensions on screen
  useEffect(() => {
    if (!photoSlotRef.current) return;
    const updateSlotDim = () => {
      if (photoSlotRef.current) {
        const rect = photoSlotRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSlotDim({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSlotDim();
    const ro = new ResizeObserver(updateSlotDim);
    ro.observe(photoSlotRef.current);
    return () => ro.disconnect();
  }, [photoPreviewUrl, flyerRenderDim, template]);

  // Pointer event handlers with capture for smooth drag left, right, up, down on mouse & mobile touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: panOffset.x,
      origPanY: panOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPhoto) return;
    const sW = slotDim.width || 140;
    const sH = slotDim.height || 140;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    // Direct, highly responsive movement left and right
    const newPanX = dragStartRef.current.origPanX + dx / sW;
    const newPanY = dragStartRef.current.origPanY + dy / sH;

    // Generous movement bounds so user can pan freely across the slot
    const clamped = clampPanOffset(
      newPanX,
      newPanY,
      zoom,
      photoNaturalDim.width,
      photoNaturalDim.height,
      sW,
      sH
    );

    setPanOffset(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDraggingPhoto(false);
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1.0, Math.min(2.8, Number(newZoom.toFixed(2))));
    setZoom(clampedZoom);
  };

  useEffect(() => {
    fetchEvent();
    if (slug) {
      db.recordVisit(window.location.pathname, slug);
    }
  }, [slug]);

  const fetchEvent = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      await initializeLocalData();
    } catch (err) {
      console.warn('initializeLocalData notice:', err);
    }

    const allEvents = db.getEvents();
    setAvailableEvents(allEvents.filter((e) => e.status !== 'archived'));

    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const cleanSlug = decodeURIComponent(slug).replace(/\/+$/, '').trim().toLowerCase();
    let ev = db.getEventBySlug(cleanSlug);

    if (!ev) {
      ev = allEvents.find((e) => {
        const s = e.slug.toLowerCase();
        return (
          s === cleanSlug ||
          s.replace(/-/g, '') === cleanSlug.replace(/-/g, '') ||
          s.includes(cleanSlug) ||
          cleanSlug.includes(s) ||
          e.id === cleanSlug
        );
      }) || null;
    }

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
          console.warn('Supabase remote query notice:', err);
        }
      }
    }

    if (!ev || ev.status === 'archived') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setEvent(ev);

    // Fetch template
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
          console.warn('Supabase template query notice:', err);
        }
      }
    }

    if (!tmpl) {
      tmpl = {
        id: `tmpl_${ev.id}`,
        event_id: ev.id,
        photo_x: 0.31,
        photo_y: 0.344,
        photo_width: 0.38,
        photo_height: 0.38,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1.0 },
        name_x: 0.28,
        name_y: 0.718,
        name_width: 0.44,
        name_height: 0.048,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '800',
        text_color: '#111126',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveTemplate(tmpl);
    }
    setTemplate(tmpl);

    // Resolve flyer image source
    let resolved = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);
    if (!resolved || resolved === '') {
      resolved = createSampleFlyerDataUrl('gala');
    }
    setFlyerSrc(resolved);
    setLoading(false);
  };

  /**
   * Processes the participant's photograph and triggers automatic face detection
   */
  const processImageFile = async (file: File) => {
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

    // Automatic Face Detection & Framing
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const nw = img.naturalWidth || 1000;
      const nh = img.naturalHeight || 1000;
      setPhotoNaturalDim({ width: nw, height: nh });

      const sW = slotDim.width || 140;
      const sH = slotDim.height || 140;

      const face = await detectFaceInImage(img);
      const framing = computeOptimalFaceFraming(nw, nh, sW, sH, face);

      setZoom(framing.zoom);
      setPanOffset(framing.panOffset);

      if (framing.faceDetected) {
        setAutoFramedBadge('Face detected & centered! Drag to move left or right');
      } else {
        setAutoFramedBadge('Photo centered! Drag to move left or right');
      }

      setTimeout(() => setAutoFramedBadge(null), 4000);
    };
    img.src = objectUrl;
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

  const handleUseSamplePortrait = async () => {
    const sample = createSamplePortraitDataUrl();
    setPhotoPreviewUrl(sample);
    setPhotoFile(null);
    setErrorMessage(null);

    const img = new Image();
    img.onload = async () => {
      const nw = img.naturalWidth || 600;
      const nh = img.naturalHeight || 600;
      setPhotoNaturalDim({ width: nw, height: nh });

      const sW = slotDim.width || 140;
      const sH = slotDim.height || 140;
      const face = await detectFaceInImage(img);
      const framing = computeOptimalFaceFraming(nw, nh, sW, sH, face);
      setZoom(framing.zoom);
      setPanOffset(framing.panOffset);
    };
    img.src = sample;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!photoPreviewUrl) {
      setErrorMessage('Please upload your photograph.');
      return;
    }
    if (!event || !template || !flyerSrc) return;

    setGenerating(true);
    setErrorMessage(null);
    setGenerationStep('Processing photograph...');
    setGenerationProgress(25);

    try {
      await new Promise((r) => setTimeout(r, 100));

      let photoPath = 'sample-portrait';
      if (photoFile) {
        setGenerationStep('Optimizing photo clarity...');
        setGenerationProgress(50);
        const uploadRes = await uploadParticipantPhoto(photoFile, event.id);
        photoPath = uploadRes.path;
      }

      setGenerationStep('Aligning coordinates...');
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

      setGenerationStep('Rendering ultra high-res print flyer...');
      setGenerationProgress(90);

      // Render 100% pixel-perfect flyer with exact same coordinates & user offsets
      const canvas = await renderPersonalisedFlyer({
        flyerImageUrl: flyerSrc,
        participantImageUrl: photoPreviewUrl,
        participantName: fullName.trim(),
        template: template,
        cropSettings: {
          zoom,
          offsetX: panOffset.x,
          offsetY: panOffset.y,
          textColor: template.text_color || '#111126',
        },
      });

      setGenerationProgress(100);
      await new Promise((r) => setTimeout(r, 120));

      setGeneratedCanvas(canvas);
      setResultImageUrl(canvas.toDataURL('image/jpeg', 0.95));
      triggerFlyerCelebration();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error generating your personalised flyer. Please try again.');
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
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-[#6425E8] animate-spin mb-3" />
          <p className="text-xs font-semibold text-[#73738A]">Loading Event Flyer...</p>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
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
      </div>
    );
  }

  const resolvedTextColor = template?.text_color || '#111126';

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8] overflow-x-hidden w-full">
      {/* Top Application Bar */}
      <Navbar />

      <main className="flex-1 py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center justify-start sm:justify-center w-full">

      {/* Main Card Container: Edge-to-edge on mobile with ZERO border gaps */}
      <div className="w-full max-w-lg bg-white sm:rounded-2xl border-0 sm:border border-[#E9E8F0] sm:shadow-sm flex flex-col relative overflow-hidden min-h-screen sm:min-h-0">
        {/* Event Header Banner */}
        <div className="p-4 sm:p-6 border-b border-[#E9E8F0] text-center bg-white relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-3 py-1 rounded-full">
            Attendee Flyer Creator
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111126] mt-2 leading-snug">{event.event_name}</h1>
          <p className="text-xs text-[#73738A] mt-1">
            Add your name and photograph to generate your custom flyer.
          </p>
        </div>

        {/* Form OR Result View */}
        {!resultImageUrl ? (
          <form onSubmit={handleGenerate} className="p-3 sm:p-6 space-y-4 sm:space-y-5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-scale-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Full Name Input */}
            <div className="px-1 sm:px-0">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#6425E8]" />
                <span>Your Full Name</span>
              </label>
              <input
                type="text"
                required
                disabled={generating}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Amah"
                className="w-full px-4 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-sm font-semibold text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition shadow-2xs"
              />
            </div>

            {/* Step 2: Photograph Upload & Seamless Automated Face Framing */}
            <div className="px-1 sm:px-0">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#6425E8]" />
                  <span>Your Photograph</span>
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
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-[#6425E8] bg-[#6425E8]/10 scale-[1.01]'
                      : 'border-[#E9E8F0] hover:border-[#6425E8] bg-[#F8F8FC] hover:bg-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 flex items-center justify-center text-[#6425E8] mb-2.5">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-[#111126]">
                    {isDraggingOver ? 'Drop photograph to upload' : 'Click or tap to upload photo'}
                  </span>
                  <span className="text-[11px] text-[#73738A] mt-1 text-center">
                    System automatically detects your face & frames it perfectly
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Photo Action & Status Bar */}
                  <div className="flex items-center justify-between px-0.5">
                    {autoFramedBadge ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-scale-up truncate">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{autoFramedBadge}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span>Drag photo left/right · Zoom to fill</span>
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-[#6425E8] hover:underline shrink-0 ml-2"
                    >
                      Change photo
                    </button>
                  </div>

                  {/* 100% Edge-to-Edge Full-Bleed Flyer Live Preview Box */}
                  <div className="w-full flex items-center justify-center bg-slate-950/5 p-0 sm:p-2 sm:rounded-2xl sm:border border-[#E9E8F0] overflow-hidden">
                    <div className="relative inline-block w-full max-w-full overflow-hidden sm:rounded-xl shadow-md sm:shadow-lg border-0 sm:border border-[#E9E8F0] select-none touch-none bg-slate-900">
                      {/* Base Flyer Image: stretches edge-to-edge full width without border space */}
                      <img
                        ref={flyerImgRef}
                        src={flyerSrc}
                        alt="Event Flyer"
                        onLoad={updateFlyerDimensions}
                        className="w-full h-auto block select-none pointer-events-none mx-auto"
                      />

                      {/* Overlaid Photo Slot positioned with 1:1 mathematical match to Template & Canvas */}
                      {template && (
                        <div
                          ref={photoSlotRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{
                            position: 'absolute',
                            left: `${template.photo_x * 100}%`,
                            top: `${template.photo_y * 100}%`,
                            width: `${template.photo_width * 100}%`,
                            aspectRatio: template.photo_shape === 'circle' ? '1 / 1' : undefined,
                            height: template.photo_shape === 'circle' ? undefined : `${template.photo_height * 100}%`,
                            borderRadius: template.photo_shape === 'circle' ? '9999px' : '10px',
                            overflow: 'hidden',
                          }}
                          className="cursor-grab active:cursor-grabbing z-10 touch-none shadow-sm ring-1 ring-white/20"
                          title="Drag directly on your photo to move left, right, up, down"
                        >
                          {(() => {
                            const sW = slotDim.width || 140;
                            const sH = slotDim.height || 140;
                            const naturalW = photoNaturalDim.width || 1000;
                            const naturalH = photoNaturalDim.height || 1000;

                            const baseScale = Math.max(sW / naturalW, sH / naturalH);
                            const effectiveZoom = Math.max(1.0, zoom);
                            const renderW = naturalW * baseScale * effectiveZoom;
                            const renderH = naturalH * baseScale * effectiveZoom;

                            const defaultLeft = (sW - renderW) / 2;
                            const defaultTop = (sH - renderH) / 2;

                            // Direct fluid horizontal & vertical positioning
                            const imgLeft = defaultLeft + panOffset.x * sW;
                            const imgTop = defaultTop + panOffset.y * sH;

                            return (
                              <img
                                src={photoPreviewUrl}
                                alt="Framed Portrait"
                                draggable={false}
                                style={{
                                  position: 'absolute',
                                  width: `${renderW}px`,
                                  height: `${renderH}px`,
                                  left: `${imgLeft}px`,
                                  top: `${imgTop}px`,
                                  maxWidth: 'none',
                                  maxHeight: 'none',
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                }}
                              />
                            );
                          })()}
                        </div>
                      )}

                      {/* Participant Name Preview aligned in designated name box */}
                      {template && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${template.name_x * 100}%`,
                            top: `${template.name_y * 100}%`,
                            width: `${template.name_width * 100}%`,
                            height: `${template.name_height * 100}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                              template.text_alignment === 'left'
                                ? 'flex-start'
                                : template.text_alignment === 'right'
                                ? 'flex-end'
                                : 'center',
                          }}
                          className="pointer-events-none select-none z-10 px-1 sm:px-2"
                        >
                          <span
                            style={{
                              fontFamily: template.font_family || 'Plus Jakarta Sans, sans-serif',
                              fontWeight: (template.font_weight as any) || '800',
                              fontSize: `${Math.max(12, Math.min(22, (template.font_size || 42) * (flyerRenderDim.width / 1080)))}px`,
                              color: resolvedTextColor,
                              lineHeight: 1.15,
                            }}
                            className={`truncate font-bold text-center w-full ${
                              isLightColor(resolvedTextColor)
                                ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]'
                                : 'drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]'
                            }`}
                          >
                            {fullName.trim() || 'Your Name Here'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Zoom Slider & Horizontal Panning Controls */}
                  <div className="bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 text-xs font-bold text-[#111126] shrink-0">
                      <ZoomIn className="w-3.5 h-3.5 text-[#6425E8]" />
                      <span className="hidden sm:inline">Zoom to Fill</span>
                      <span className="sm:hidden text-[11px]">Zoom</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                      <button
                        type="button"
                        onClick={() => handleZoomChange(zoom - 0.15)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] hover:bg-[#EEF0F6] active:scale-95 transition"
                        title="Zoom Out"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="range"
                        min="1.0"
                        max="2.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="flex-1 accent-[#6425E8] h-2 bg-[#E9E8F0] rounded-lg cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => handleZoomChange(zoom + 0.15)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] hover:bg-[#EEF0F6] active:scale-95 transition"
                        title="Zoom In"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (photoPreviewUrl) {
                          const img = new Image();
                          img.onload = async () => {
                            const nw = img.naturalWidth || 1000;
                            const nh = img.naturalHeight || 1000;
                            const sW = slotDim.width || 140;
                            const sH = slotDim.height || 140;
                            const face = await detectFaceInImage(img);
                            const framing = computeOptimalFaceFraming(nw, nh, sW, sH, face);
                            setZoom(framing.zoom);
                            setPanOffset(framing.panOffset);
                          };
                          img.src = photoPreviewUrl;
                        }
                      }}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-[#E9E8F0] hover:border-[#6425E8] text-[#73738A] hover:text-[#111126] flex items-center gap-1 transition shadow-2xs shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-[#6425E8]" />
                      <span>Re-center</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Progress Bar when Generating */}
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
            <div className="px-1 sm:px-0">
              <button
                type="submit"
                disabled={generating}
                className="interactive-btn w-full py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-2 animate-pulse-glow"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Ultra High-Res Flyer...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Generate My Official Flyer</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pb-4 sm:pb-0">
              <span className="text-[11px] text-[#73738A]">
                Instant high-resolution download · Ready in seconds
              </span>
            </div>
          </form>
        ) : (
          /* Result Screen: Full width edge-to-edge flyer preview on mobile with zero border space */
          <div className="py-3 px-0 sm:p-6 space-y-4 sm:space-y-5 animate-scale-up w-full">
            <div className="text-center px-4 sm:px-0">
              <div className="inline-flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-3 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Your Personalised Flyer is Ready!</span>
              </div>
            </div>

            {/* Generated Flyer Preview: 100% full width on mobile screen with ZERO border gaps */}
            <div className="w-full sm:max-w-md mx-auto overflow-hidden sm:rounded-xl shadow-md sm:shadow-xl border-0 sm:border border-[#E9E8F0] bg-black/5 relative group p-0">
              <img
                src={resultImageUrl}
                alt="Personalised Flyer"
                className="w-full h-auto block"
              />
            </div>

            {/* Download Options */}
            <div className="px-4 sm:px-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] text-center mb-2.5">
                Download Format
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="interactive-btn py-2.5 px-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'png' ? 'Downloaded!' : 'PNG (Hi-Res)'}</span>
                </button>

                <button
                  onClick={() => handleDownload('jpg')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition shadow-2xs"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'jpg' ? 'Downloaded!' : 'JPG'}</span>
                </button>

                <button
                  onClick={() => handleDownload('pdf')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition shadow-2xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>{downloadingFormat === 'pdf' ? 'Downloaded!' : 'PDF'}</span>
                </button>
              </div>
            </div>

            {/* Generate Another Option */}
            <div className="pt-2 sm:pt-3 border-t border-[#E9E8F0] text-center pb-4 sm:pb-0">
              <button
                onClick={handleReset}
                className="interactive-btn text-xs font-medium text-[#73738A] hover:text-[#111126] inline-flex items-center space-x-1.5 py-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Personalise Another Flyer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clean Footer */}
      <div className="my-4 text-center text-[11px] text-[#73738A] flex items-center space-x-2 shrink-0">
        <span>Powered by Eventra Create</span>
        <span>·</span>
        <span className="text-[#6425E8] font-semibold">Events. Elevated.</span>
      </div>
    </div>
  );
};
