import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { EventraLogo } from '../components/EventraLogo';
import { 
  Camera, Upload, Download, FileImage, FileText, CheckCircle2, 
  RefreshCw, Loader2, AlertCircle, ArrowLeft, Shield, Calendar, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Minus, RotateCcw, Move, 
  Check, Maximize2, Sliders, SlidersHorizontal, ChevronDown, 
  ChevronUp, User, Type, Palette
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

  // Photo Framing & Zoom Controls (normalized WYSIWYG)
  const [zoom, setZoom] = useState<number>(1.0);
  const [frameScale, setFrameScale] = useState<number>(1.35); // Default to 1.35x to seamlessly cover circular cutouts
  const [frameOffsetX, setFrameOffsetX] = useState<number>(0);
  const [frameOffsetY, setFrameOffsetY] = useState<number>(0);
  const [nameOffsetY, setNameOffsetY] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#111126'); // Default to high-contrast dark text
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [showAdvancedNudge, setShowAdvancedNudge] = useState(false);

  // Layout & Exact Pixel Dimensions Tracking
  const flyerImgRef = useRef<HTMLImageElement>(null);
  const photoSlotRef = useRef<HTMLDivElement>(null);
  const [flyerAspect, setFlyerAspect] = useState<number>(0.8); // width / height
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
      setFlyerAspect(rect.width / rect.height);
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
        if (rect.width > 0) {
          setSlotDim({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSlotDim();
    const ro = new ResizeObserver(updateSlotDim);
    ro.observe(photoSlotRef.current);
    return () => ro.disconnect();
  }, [photoPreviewUrl, frameScale, frameOffsetX, frameOffsetY, flyerRenderDim]);

  // Track natural dimensions of attendee photograph and apply smart face centering
  useEffect(() => {
    if (!photoPreviewUrl) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1000;
      const h = img.naturalHeight || 1000;
      setPhotoNaturalDim({ width: w, height: h });

      // Smart face framing: If vertical portrait (phone camera 3:4 or 9:16),
      // the face is in the top 30%. Defaulting offsetY to +0.12 frames the face naturally
      // rather than cutting off the head and showing only chest/suit.
      if (h > w * 1.15) {
        setPanOffset((prev) => (prev.y === 0 ? { x: 0, y: 0.12 } : prev));
      }
    };
    img.src = photoPreviewUrl;
  }, [photoPreviewUrl]);

  // Pointer event handlers with capture for silky-smooth drag on mouse and mobile touch
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
    setPanOffset({
      x: Math.max(-1.5, Math.min(1.5, Number((dragStartRef.current.origPanX + dx / sW).toFixed(4)))),
      y: Math.max(-1.5, Math.min(1.5, Number((dragStartRef.current.origPanY + dy / sH).toFixed(4)))),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDraggingPhoto(false);
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
      console.warn('initializeLocalData non-fatal error:', err);
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
        return s === cleanSlug || s.includes(cleanSlug) || cleanSlug.includes(s) || e.id === cleanSlug;
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
          console.warn('Supabase remote template query error:', err);
        }
      }
    }

    if (!tmpl) {
      tmpl = {
        id: `tmpl_${ev.id}`,
        event_id: ev.id,
        photo_x: 0.31,
        photo_y: 0.32,
        photo_width: 0.38,
        photo_height: 0.38,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1, frameScale: 1.35 },
        name_x: 0.15,
        name_y: 0.725,
        name_width: 0.70,
        name_height: 0.055,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '700',
        text_color: '#111126',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveTemplate(tmpl);
    }
    setTemplate(tmpl);

    // Set initial text color from template
    if (tmpl.text_color) {
      setSelectedTextColor(tmpl.text_color);
    }

    // Default frameScale: If circle, use 1.35x to comfortably cover cutout white rings
    if (tmpl.photo_crop_settings?.frameScale) {
      setFrameScale(tmpl.photo_crop_settings.frameScale);
    } else if (tmpl.photo_shape === 'circle') {
      setFrameScale(1.35);
    }

    // Resolve flyer source
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
    setPanOffset({ x: 0, y: 0.05 });
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
    setGenerationStep('Framing portrait photograph...');
    setGenerationProgress(25);

    try {
      await new Promise((r) => setTimeout(r, 180));

      let photoPath = 'sample-portrait';
      if (photoFile) {
        setGenerationStep('Processing high-resolution photo...');
        setGenerationProgress(50);
        const uploadRes = await uploadParticipantPhoto(photoFile, event.id);
        photoPath = uploadRes.path;
      }

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

      setGenerationStep('Rendering ultra high-res print flyer...');
      setGenerationProgress(90);

      // Render 100% pixel-perfect canvas
      const canvas = await renderPersonalisedFlyer({
        flyerImageUrl: flyerSrc,
        participantImageUrl: photoPreviewUrl,
        participantName: fullName.trim(),
        template: template,
        cropSettings: {
          zoom,
          offsetX: panOffset.x,
          offsetY: panOffset.y,
          frameScale,
          frameOffsetX,
          frameOffsetY,
          nameOffsetY,
          textColor: selectedTextColor,
        },
      });

      setGenerationProgress(100);
      await new Promise((r) => setTimeout(r, 200));

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
    setZoom(1.0);
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

  // Pre-calculate exact centered frame position for the live preview
  const baseCenterX = template ? Number(template.photo_x) + Number(template.photo_width) / 2 : 0.5;
  const baseCenterY = template ? Number(template.photo_y) + Number(template.photo_height) / 2 : 0.5;
  const currentPhotoW = template ? Number(template.photo_width) * frameScale : 0.38;
  const currentPhotoH = template ? Number(template.photo_height) * frameScale : 0.38;

  // In circle mode: width is diameter in fraction of width. Radius fraction of height is (currentPhotoW / 2) * flyerAspect.
  const photoSlotLeft = template?.photo_shape === 'circle'
    ? (baseCenterX + frameOffsetX - currentPhotoW / 2) * 100
    : (baseCenterX + frameOffsetX - currentPhotoW / 2) * 100;

  const photoSlotTop = template?.photo_shape === 'circle'
    ? (baseCenterY + frameOffsetY - (currentPhotoW / 2) * flyerAspect) * 100
    : (baseCenterY + frameOffsetY - currentPhotoH / 2) * 100;

  return (
    <div className="min-h-screen bg-[#F8F8FC] py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <EventraLogo variant="with-tagline" size="md" />
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E9E8F0] shadow-sm overflow-hidden flex flex-col relative">
        {/* Event Header Banner */}
        <div className="p-5 sm:p-6 border-b border-[#E9E8F0] text-center bg-white relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-3 py-1 rounded-full">
            Attendee Flyer Creator
          </span>
          <h1 className="text-xl font-bold text-[#111126] mt-2.5 leading-snug">{event.event_name}</h1>
          <p className="text-xs text-[#73738A] mt-1">
            Personalise and download your official event attendance flyer.
          </p>
        </div>

        {/* Form OR Result View */}
        {!resultImageUrl ? (
          <form onSubmit={handleGenerate} className="p-5 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-scale-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field 1: Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#6425E8]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                disabled={generating}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Marvelous Ndukwe"
                className="w-full px-4 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-sm font-semibold text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            {/* Field 2: Photograph Upload & Interactive Framing */}
            <div>
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
                  <span className="text-[11px] text-[#73738A] mt-1">Supports high-res JPG, PNG, or WebP</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Change Photo Link */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-[#111126] uppercase tracking-wider flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-[#6425E8]" />
                      <span>Interactive Flyer Preview</span>
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

                  {/* 100% WYSIWYG Flyer Preview Box (Exact-Fit Wrapper: Zero Pillarbox / Zero Drift) */}
                  <div className="w-full flex items-center justify-center bg-slate-950/5 rounded-2xl p-2 sm:p-3 border border-[#E9E8F0]">
                    <div
                      className="relative inline-block max-w-full overflow-hidden rounded-xl shadow-lg border border-[#E9E8F0] select-none touch-none bg-slate-900"
                    >
                      {/* The Base Flyer Image */}
                      <img
                        ref={flyerImgRef}
                        src={flyerSrc}
                        alt="Event Flyer"
                        onLoad={updateFlyerDimensions}
                        className="block max-h-[440px] w-auto max-w-full h-auto mx-auto select-none pointer-events-none"
                      />

                      {/* Overlaid Interactive Photo Frame positioned with 1:1 Parity */}
                      {template && (
                        <div
                          ref={photoSlotRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{
                            position: 'absolute',
                            left: `${photoSlotLeft}%`,
                            top: `${photoSlotTop}%`,
                            width: `${currentPhotoW * 100}%`,
                            aspectRatio: template.photo_shape === 'circle' ? '1 / 1' : undefined,
                            height: template.photo_shape === 'circle' ? undefined : `${currentPhotoH * 100}%`,
                            borderRadius: template.photo_shape === 'circle' ? '9999px' : '10px',
                            overflow: 'hidden',
                          }}
                          className="ring-2 ring-[#6425E8] ring-offset-2 ring-offset-black/40 shadow-2xl cursor-grab active:cursor-grabbing z-10 touch-none"
                          title="Drag directly on your photo to frame face and head"
                        >
                          {(() => {
                            const naturalW = photoNaturalDim.width || 1000;
                            const naturalH = photoNaturalDim.height || 1000;
                            const sW = slotDim.width || 140;
                            const sH = slotDim.height || 140;
                            const baseScale = Math.max(sW / naturalW, sH / naturalH);
                            const renderW = naturalW * baseScale * zoom;
                            const renderH = naturalH * baseScale * zoom;
                            const imgLeft = (sW - renderW) / 2 + panOffset.x * sW;
                            const imgTop = (sH - renderH) / 2 + panOffset.y * sH;
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

                      {/* Participant Name Preview aligned vertically and horizontally */}
                      {template && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${template.name_x * 100}%`,
                            top: `${(template.name_y + nameOffsetY) * 100}%`,
                            width: `${template.name_width * 100}%`,
                            height: `${template.name_height * 100}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: template.text_alignment === 'left' ? 'flex-start' : template.text_alignment === 'right' ? 'flex-end' : 'center',
                            color: selectedTextColor || template.text_color || '#111126',
                            fontFamily: template.font_family,
                            fontWeight: template.font_weight as any,
                          }}
                          className="pointer-events-none select-none z-10 px-2"
                        >
                          <span
                            style={{
                              fontSize: `${Math.max(11, Math.min(22, (template.font_size || 42) * (flyerRenderDim.width / 1080)))}px`,
                              lineHeight: 1.2,
                            }}
                            className={`truncate font-bold text-center w-full ${
                              (selectedTextColor || template.text_color || '#111126').toUpperCase() === '#FFFFFF'
                                ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]'
                                : 'drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]'
                            }`}
                          >
                            {fullName.trim() || 'Your Name Here'}
                          </span>
                        </div>
                      )}

                      {/* Subtle floating instruction badge */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#111126]/85 backdrop-blur-md text-white text-[10px] font-medium px-3 py-1 rounded-full pointer-events-none shadow flex items-center gap-1.5 z-20 whitespace-nowrap">
                        <Move className="w-3 h-3 text-[#9638F5]" />
                        <span>Drag photo directly to frame face · Zoom to fit</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean, Executive Adjustment Controls Bar */}
                  <div className="bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl p-3.5 space-y-3.5">
                    {/* Control 1: Zoom & Face Framing */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#111126] flex items-center gap-1.5">
                          <ZoomIn className="w-3.5 h-3.5 text-[#6425E8]" />
                          <span>Photo Zoom & Framing</span>
                        </span>
                        <span className="font-mono font-bold text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-md text-[11px]">
                          {Math.round(zoom * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setZoom((prev) => Math.max(1.0, Number((prev - 0.15).toFixed(2))))}
                          className="w-8 h-8 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] hover:bg-[#EEF0F6] active:scale-95 transition shadow-2xs"
                          title="Zoom Out"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="range"
                          min="1.0"
                          max="2.8"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="flex-1 accent-[#6425E8] h-2 bg-[#E9E8F0] rounded-lg cursor-pointer"
                        />

                        <button
                          type="button"
                          onClick={() => setZoom((prev) => Math.min(2.8, Number((prev + 0.15).toFixed(2))))}
                          className="w-8 h-8 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] hover:bg-[#EEF0F6] active:scale-95 transition shadow-2xs"
                          title="Zoom In"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Framing Presets */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setZoom(1.35);
                              setPanOffset({ x: 0, y: 0.14 });
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E9E8F0] hover:border-[#6425E8] text-[#111126] transition shadow-2xs"
                          >
                            Face Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setZoom(1.15);
                              setPanOffset({ x: 0, y: 0.08 });
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E9E8F0] hover:border-[#6425E8] text-[#111126] transition shadow-2xs"
                          >
                            Upper Body
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setZoom(1.0);
                              setPanOffset({ x: 0, y: 0 });
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E9E8F0] hover:border-[#6425E8] text-[#111126] transition shadow-2xs"
                          >
                            Fit All
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setZoom(1.2);
                            setPanOffset({ x: 0, y: 0.08 });
                          }}
                          className="text-[10px] font-semibold text-[#73738A] hover:text-[#111126] flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    {/* Control 2: Circle Fit (Fill White Space) & Text Color Presets */}
                    <div className="pt-2 border-t border-[#E9E8F0] grid grid-cols-2 gap-2.5">
                      {/* Circle Size Presets */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5 flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-[#6425E8]" />
                          <span>Circle Coverage</span>
                        </span>
                        <div className="flex gap-1">
                          {[
                            { label: 'Fill Cutout', val: 1.35 },
                            { label: 'Standard', val: 1.0 },
                            { label: 'Wide', val: 1.5 },
                          ].map((c) => (
                            <button
                              key={c.val}
                              type="button"
                              onClick={() => setFrameScale(c.val)}
                              className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition ${
                                Math.abs(frameScale - c.val) < 0.05
                                  ? 'bg-[#6425E8] text-white shadow-2xs'
                                  : 'bg-white border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Contrast Selector */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5 flex items-center gap-1">
                          <Palette className="w-3 h-3 text-[#6425E8]" />
                          <span>Name Text Color</span>
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedTextColor('#111126')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                              selectedTextColor === '#111126'
                                ? 'bg-[#111126] text-white shadow-2xs'
                                : 'bg-white border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#111126] border border-white" />
                            <span>Dark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTextColor('#FFFFFF')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                              selectedTextColor === '#FFFFFF'
                                ? 'bg-[#6425E8] text-white shadow-2xs'
                                : 'bg-white border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white border border-gray-300" />
                            <span>Light</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Advanced Fine-Tuning Drawer */}
                    <div className="pt-2 border-t border-[#E9E8F0]">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedNudge(!showAdvancedNudge)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-[#73738A] hover:text-[#111126] py-0.5 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-[#6425E8]" />
                          <span>Fine-tune alignment & position nudge</span>
                        </span>
                        {showAdvancedNudge ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showAdvancedNudge && (
                        <div className="mt-3 pt-3 border-t border-[#E9E8F0]/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="grid grid-cols-2 gap-3 text-[11px]">
                            {/* Photo Slot Vertical Nudge */}
                            <div>
                              <div className="flex justify-between text-[#73738A] font-semibold mb-1">
                                <span>Photo Slot (Y)</span>
                                <span className="font-mono text-[#111126]">
                                  {frameOffsetY > 0 ? `+${Math.round(frameOffsetY * 100)}%` : `${Math.round(frameOffsetY * 100)}%`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFrameOffsetY((prev) => Math.max(-0.12, Number((prev - 0.01).toFixed(3))))}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] font-bold text-xs"
                                >
                                  ↑
                                </button>
                                <input
                                  type="range"
                                  min="-0.10"
                                  max="0.10"
                                  step="0.005"
                                  value={frameOffsetY}
                                  onChange={(e) => setFrameOffsetY(parseFloat(e.target.value))}
                                  className="flex-1 accent-[#6425E8] h-1.5 bg-[#E9E8F0] rounded-lg cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFrameOffsetY((prev) => Math.min(0.12, Number((prev + 0.01).toFixed(3))))}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] font-bold text-xs"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>

                            {/* Name Badge Vertical Position */}
                            <div>
                              <div className="flex justify-between text-[#73738A] font-semibold mb-1">
                                <span>Name Position (Y)</span>
                                <span className="font-mono text-[#111126]">
                                  {nameOffsetY > 0 ? `+${Math.round(nameOffsetY * 100)}%` : `${Math.round(nameOffsetY * 100)}%`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setNameOffsetY((prev) => Math.max(-0.05, Number((prev - 0.01).toFixed(3))))}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] font-bold text-xs"
                                >
                                  ↑
                                </button>
                                <input
                                  type="range"
                                  min="-0.05"
                                  max="0.10"
                                  step="0.005"
                                  value={nameOffsetY}
                                  onChange={(e) => setNameOffsetY(parseFloat(e.target.value))}
                                  className="flex-1 accent-[#6425E8] h-1.5 bg-[#E9E8F0] rounded-lg cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNameOffsetY((prev) => Math.min(0.12, Number((prev + 0.01).toFixed(3))))}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E9E8F0] flex items-center justify-center text-[#73738A] hover:text-[#111126] font-bold text-xs"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
            <button
              type="submit"
              disabled={generating}
              className="interactive-btn w-full py-3 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2 animate-pulse-glow"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Ultra High-Res Flyer...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate My Official Flyer</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[11px] text-[#73738A]">
                No account required · Instant high-resolution print download
              </span>
            </div>
          </form>
        ) : (
          /* Result Screen */
          <div className="p-5 sm:p-6 space-y-5 animate-scale-up">
            <div className="text-center">
              <div className="inline-flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-3 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Your Official Flyer is Ready!</span>
              </div>

              {/* Generated Flyer Preview */}
              <div className="rounded-xl overflow-hidden shadow-xl border border-[#E9E8F0] bg-black/5 relative group max-w-sm mx-auto">
                <img
                  src={resultImageUrl}
                  alt="Personalised Flyer"
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Download Options */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] text-center mb-2.5">
                Select Download Format
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="interactive-btn py-2.5 px-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 shadow-sm transition"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'png' ? 'Downloaded!' : 'PNG (Ultra HD)'}</span>
                </button>

                <button
                  onClick={() => handleDownload('jpg')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition"
                >
                  <FileImage className="w-4 h-4" />
                  <span>{downloadingFormat === 'jpg' ? 'Downloaded!' : 'JPG Format'}</span>
                </button>

                <button
                  onClick={() => handleDownload('pdf')}
                  className="interactive-btn py-2.5 px-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>{downloadingFormat === 'pdf' ? 'Downloaded!' : 'PDF Document'}</span>
                </button>
              </div>
            </div>

            {/* Generate Another Option */}
            <div className="pt-3 border-t border-[#E9E8F0] text-center">
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
      <div className="mt-6 text-center text-[11px] text-[#73738A] flex items-center space-x-2">
        <span>Powered by Eventra Create</span>
        <span>·</span>
        <span className="text-[#6425E8] font-semibold">Events. Elevated.</span>
      </div>
    </div>
  );
};
