import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { resolveFlyerSource } from '../lib/supabase';
import { FlyerEvent, FlyerTemplate } from '../types/database';
import { renderPersonalisedFlyer, triggerFlyerCelebration } from '../lib/canvas-engine';
import { createSamplePortraitDataUrl } from '../lib/sample-flyers';
import { EventraLogo } from '../components/EventraLogo';
import { 
  ArrowLeft, Check, Copy, Eye, Layout, Type, Image as ImageIcon, 
  ExternalLink, Sparkles, Loader2, Move, RotateCcw, Sliders, CheckCircle2,
  AlignCenterHorizontal, AlignCenterVertical, Crosshair, ZoomIn, ZoomOut
} from 'lucide-react';

export const TemplateEditor: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [template, setTemplate] = useState<FlyerTemplate | null>(null);
  const [flyerSrc, setFlyerSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeArea, setActiveArea] = useState<'photo' | 'name'>('photo');
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCanvasUrl, setPreviewCanvasUrl] = useState<string | null>(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [mobileView, setMobileView] = useState<'canvas' | 'controls' | 'preview'>('canvas');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Dragging state
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingTarget, setDraggingTarget] = useState<'photo' | 'name' | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  useEffect(() => {
    loadEventAndTemplate();
  }, [eventId]);

  const loadEventAndTemplate = async () => {
    if (!eventId) return;
    setLoading(true);

    const ev = db.getEventById(eventId);
    if (!ev) {
      navigate('/dashboard');
      return;
    }
    setEvent(ev);

    const resolved = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);
    setFlyerSrc(resolved);

    let tmpl = db.getTemplateByEventId(eventId);
    if (!tmpl) {
      tmpl = {
        id: `tmpl_${Date.now()}`,
        event_id: eventId,
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
    setLoading(false);
  };

  const handleUpdateTemplate = (field: keyof FlyerTemplate, value: any) => {
    if (!template) return;
    const updated = { ...template, [field]: value };
    setTemplate(updated);
  };

  // Quick Smart Alignment helpers
  const handleCenterHorizontal = (target: 'photo' | 'name') => {
    if (!template) return;
    if (target === 'photo') {
      const centeredX = Number(((1 - template.photo_width) / 2).toFixed(4));
      handleUpdateTemplate('photo_x', centeredX);
    } else {
      const centeredX = Number(((1 - template.name_width) / 2).toFixed(4));
      handleUpdateTemplate('name_x', centeredX);
    }
  };

  const handleCenterVertical = (target: 'photo' | 'name') => {
    if (!template) return;
    if (target === 'photo') {
      const centeredY = Number(((1 - template.photo_height) / 2).toFixed(4));
      handleUpdateTemplate('photo_y', centeredY);
    } else {
      const centeredY = Number(((1 - template.name_height) / 2).toFixed(4));
      handleUpdateTemplate('name_y', centeredY);
    }
  };

  const handleAlignNameToPhoto = () => {
    if (!template) return;
    // Align name horizontally centered with photo and place right below photo
    const newNameY = Math.min(0.90, Number((template.photo_y + template.photo_height + 0.03).toFixed(4)));
    const newNameX = Number(((1 - template.name_width) / 2).toFixed(4));
    setTemplate({
      ...template,
      name_x: newNameX,
      name_y: newNameY,
    });
  };

  // Dragging logic on flyer canvas (mouse + mobile touch support)
  const handleMouseDown = (e: React.MouseEvent, target: 'photo' | 'name') => {
    e.stopPropagation();
    setActiveArea(target);
    setDraggingTarget(target);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: target === 'photo' ? template!.photo_x : template!.name_x,
      origY: target === 'photo' ? template!.photo_y : template!.name_y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent, target: 'photo' | 'name') => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    setActiveArea(target);
    setDraggingTarget(target);
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      origX: target === 'photo' ? template!.photo_x : template!.name_x,
      origY: target === 'photo' ? template!.photo_y : template!.name_y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTarget || !template || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - dragStartRef.current.startX) / rect.width;
      const deltaY = (e.clientY - dragStartRef.current.startY) / rect.height;

      if (draggingTarget === 'photo') {
        const newX = Math.max(0, Math.min(1 - template.photo_width, dragStartRef.current.origX + deltaX));
        const newY = Math.max(0, Math.min(1 - template.photo_height, dragStartRef.current.origY + deltaY));
        setTemplate((prev) => (prev ? { ...prev, photo_x: Number(newX.toFixed(4)), photo_y: Number(newY.toFixed(4)) } : null));
      } else {
        const newX = Math.max(0, Math.min(1 - template.name_width, dragStartRef.current.origX + deltaX));
        const newY = Math.max(0, Math.min(1 - template.name_height, dragStartRef.current.origY + deltaY));
        setTemplate((prev) => (prev ? { ...prev, name_x: Number(newX.toFixed(4)), name_y: Number(newY.toFixed(4)) } : null));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingTarget || !template || !containerRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (touch.clientX - dragStartRef.current.startX) / rect.width;
      const deltaY = (touch.clientY - dragStartRef.current.startY) / rect.height;

      if (draggingTarget === 'photo') {
        const newX = Math.max(0, Math.min(1 - template.photo_width, dragStartRef.current.origX + deltaX));
        const newY = Math.max(0, Math.min(1 - template.photo_height, dragStartRef.current.origY + deltaY));
        setTemplate((prev) => (prev ? { ...prev, photo_x: Number(newX.toFixed(4)), photo_y: Number(newY.toFixed(4)) } : null));
      } else {
        const newX = Math.max(0, Math.min(1 - template.name_width, dragStartRef.current.origX + deltaX));
        const newY = Math.max(0, Math.min(1 - template.name_height, dragStartRef.current.origY + deltaY));
        setTemplate((prev) => (prev ? { ...prev, name_x: Number(newX.toFixed(4)), name_y: Number(newY.toFixed(4)) } : null));
      }
    };

    const handleDragEnd = () => {
      if (draggingTarget) {
        setDraggingTarget(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [draggingTarget, template]);


  // Live Composite Preview Generator
  const handleTogglePreview = async () => {
    if (!previewMode) {
      if (!template || !flyerSrc) return;
      setRenderingPreview(true);
      try {
        const samplePortrait = createSamplePortraitDataUrl();
        const canvas = await renderPersonalisedFlyer({
          flyerImageUrl: flyerSrc,
          participantImageUrl: samplePortrait,
          participantName: 'Sarah Jenkins',
          template: template,
        });
        setPreviewCanvasUrl(canvas.toDataURL('image/jpeg', 0.95));
        setPreviewMode(true);
      } catch (err) {
        console.error('Preview error:', err);
        alert('Could not render preview: ' + err);
      } finally {
        setRenderingPreview(false);
      }
    } else {
      setPreviewMode(false);
    }
  };

  const handleSave = () => {
    if (!template || !event) return;
    setSaving(true);
    db.saveTemplate(template);
    setTimeout(() => {
      setSaving(false);
    }, 400);
  };

  const handlePublish = () => {
    if (!template || !event) return;
    setPublishing(true);
    db.saveTemplate(template);
    const updated = db.saveEvent({ ...event, status: 'published' });
    setEvent(updated);
    setTimeout(() => {
      setPublishing(false);
      setShowShareModal(true);
      triggerFlyerCelebration();
    }, 450);
  };

  const getPublicUrl = () => {
    if (!event) return '';
    return `${window.location.origin}/e/${event.slug}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !event || !template) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6425E8] animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#73738A]">Loading Eventra Create Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-16 px-3 sm:px-6 bg-white border-b border-[#E9E8F0] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 sm:p-2 hover:bg-[#F8F8FC] rounded-xl text-[#73738A] hover:text-[#111126] transition shrink-0 interactive-btn"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="shrink-0">
            <EventraLogo variant="create-module" size="sm" />
          </div>

          <div className="h-4 w-px bg-[#E9E8F0] hidden sm:block shrink-0" />

          <div className="hidden sm:block min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-xs text-[#111126] truncate max-w-[140px] md:max-w-xs">{event.event_name}</h1>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  event.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {event.status}
              </span>
            </div>
          </div>
        </div>

        {/* Center Mode Switch on Desktop */}
        <div className="hidden lg:flex items-center p-1 bg-[#F1F3F9] rounded-xl border border-[#E9E8F0]">
          <button
            onClick={() => setPreviewMode(false)}
            className={`interactive-btn px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              !previewMode ? 'bg-white text-[#111126] shadow-sm font-bold' : 'text-[#73738A] hover:text-[#111126]'
            }`}
          >
            Visual Layout
          </button>
          <button
            onClick={handleTogglePreview}
            disabled={renderingPreview}
            className={`interactive-btn px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 ${
              previewMode ? 'bg-[#6425E8] text-white shadow-sm font-bold' : 'text-[#73738A] hover:text-[#111126]'
            }`}
          >
            {renderingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Sample Participant Preview</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="interactive-btn px-2.5 sm:px-4 py-2 border border-[#E9E8F0] bg-white hover:bg-[#F8F8FC] text-xs font-semibold rounded-xl transition"
          >
            {saving ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="interactive-btn px-3 sm:px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-1.5 animate-pulse-glow"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">Publish & Share</span>
            <span className="sm:hidden">Publish</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Central Visual Canvas Area */}
        <div className={`flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-center overflow-auto bg-[#ECECF3] relative ${
          mobileView === 'controls' && !previewMode ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Floating Canvas Quick Controls Bar (Desktop & Tablet) */}
          {!previewMode && (
            <div className="mb-3 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-[#CBD5E1] shadow-md flex items-center gap-1.5 text-xs z-10 animate-slide-up-fade">
              <span className="text-[10px] font-bold text-[#73738A] uppercase px-1">Quick Align:</span>
              <button
                type="button"
                onClick={() => handleCenterHorizontal(activeArea)}
                className="interactive-btn px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[#F1F3F9] text-[#111126] flex items-center gap-1"
                title="Center horizontally"
              >
                <AlignCenterHorizontal className="w-3.5 h-3.5 text-[#6425E8]" />
                <span className="hidden sm:inline">Center X</span>
              </button>
              <button
                type="button"
                onClick={() => handleCenterVertical(activeArea)}
                className="interactive-btn px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[#F1F3F9] text-[#111126] flex items-center gap-1"
                title="Center vertically"
              >
                <AlignCenterVertical className="w-3.5 h-3.5 text-[#6425E8]" />
                <span className="hidden sm:inline">Center Y</span>
              </button>
              <div className="w-px h-4 bg-[#E2E8F0] mx-0.5" />
              <button
                type="button"
                onClick={handleAlignNameToPhoto}
                className="interactive-btn px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[#F1F3F9] text-[#111126] flex items-center gap-1"
                title="Snap name below photo"
              >
                <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Snap Name Below</span>
              </button>
            </div>
          )}

          {previewMode && previewCanvasUrl ? (
            <div className="relative shadow-2xl rounded-xl overflow-hidden bg-white max-h-[75vh] lg:max-h-[80vh] aspect-auto border border-[#CBD5E1] animate-scale-up">
              <img
                src={previewCanvasUrl}
                alt="Composited Preview"
                className="max-h-[75vh] lg:max-h-[80vh] w-auto block"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#111126]/90 backdrop-blur text-white text-xs px-4 py-1.5 rounded-full flex items-center space-x-2 whitespace-nowrap shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulated Output at Full 300 DPI Resolution</span>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative shadow-2xl rounded-xl overflow-hidden bg-white max-h-[75vh] lg:max-h-[80vh] aspect-auto border border-[#CBD5E1] touch-none select-none"
            >
              <img
                src={flyerSrc}
                alt="Base Event Flyer"
                className="max-h-[75vh] lg:max-h-[80vh] w-auto block pointer-events-none select-none"
              />

              {/* Dynamic Interactive Alignment Crosshair Guidelines when Dragging */}
              {draggingTarget === 'photo' && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-[#6425E8] pointer-events-none z-10"
                    style={{ left: `${(template.photo_x + template.photo_width / 2) * 100}%` }}
                  />
                  <div
                    className="absolute left-0 right-0 h-px border-t border-dashed border-[#6425E8] pointer-events-none z-10"
                    style={{ top: `${(template.photo_y + template.photo_height / 2) * 100}%` }}
                  />
                </>
              )}

              {draggingTarget === 'name' && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-amber-500 pointer-events-none z-10"
                    style={{ left: `${(template.name_x + template.name_width / 2) * 100}%` }}
                  />
                  <div
                    className="absolute left-0 right-0 h-px border-t border-dashed border-amber-500 pointer-events-none z-10"
                    style={{ top: `${(template.name_y + template.name_height / 2) * 100}%` }}
                  />
                </>
              )}

              {/* Photo Area Draggable Box */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'photo')}
                onTouchStart={(e) => handleTouchStart(e, 'photo')}
                style={{
                  left: `${template.photo_x * 100}%`,
                  top: `${template.photo_y * 100}%`,
                  width: `${template.photo_width * 100}%`,
                  height: `${template.photo_height * 100}%`,
                  borderRadius: template.photo_shape === 'circle' ? '9999px' : '8px',
                }}
                className={`absolute border-2 cursor-grab active:cursor-grabbing flex items-center justify-center transition-all touch-none select-none ${
                  activeArea === 'photo'
                    ? 'border-[#6425E8] bg-[#6425E8]/20 ring-4 ring-[#6425E8]/30 shadow-lg'
                    : 'border-dashed border-emerald-500 bg-emerald-500/15 hover:border-emerald-600'
                }`}
              >
                {/* Live Floating Coordinate Badge */}
                {draggingTarget === 'photo' && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#111126] text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-20">
                    X: {Math.round(template.photo_x * 100)}% · Y: {Math.round(template.photo_y * 100)}%
                  </div>
                )}

                {/* Corner Anchor Rings for Visual Polish */}
                {activeArea === 'photo' && template.photo_shape !== 'circle' && (
                  <>
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#6425E8] rounded-full shadow" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#6425E8] rounded-full shadow" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#6425E8] rounded-full shadow" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#6425E8] rounded-full shadow" />
                  </>
                )}

                <div className="text-center p-2 pointer-events-none flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center mb-1 text-[#6425E8]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded shadow text-[#111126] whitespace-nowrap">
                    Photo Slot ({template.photo_shape})
                  </span>
                </div>
              </div>

              {/* Name Area Draggable Box */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'name')}
                onTouchStart={(e) => handleTouchStart(e, 'name')}
                style={{
                  left: `${template.name_x * 100}%`,
                  top: `${template.name_y * 100}%`,
                  width: `${template.name_width * 100}%`,
                  height: `${template.name_height * 100}%`,
                }}
                className={`absolute border-2 cursor-grab active:cursor-grabbing flex items-center justify-center transition-all touch-none select-none ${
                  activeArea === 'name'
                    ? 'border-[#6425E8] bg-[#6425E8]/20 ring-4 ring-[#6425E8]/30 shadow-lg'
                    : 'border-dashed border-amber-500 bg-amber-500/15 hover:border-amber-600'
                }`}
              >
                {/* Live Floating Coordinate Badge */}
                {draggingTarget === 'name' && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#111126] text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-20">
                    X: {Math.round(template.name_x * 100)}% · Y: {Math.round(template.name_y * 100)}%
                  </div>
                )}

                <span
                  style={{
                    color: template.text_color,
                    fontFamily: template.font_family,
                    fontWeight: template.font_weight as any,
                    textAlign: template.text_alignment as any,
                  }}
                  className="w-full px-2 truncate text-sm font-bold pointer-events-none drop-shadow"
                >
                  Participant Full Name
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Controls */}
        <aside className={`w-full lg:w-88 bg-white border-l border-[#E9E8F0] p-4 sm:p-6 overflow-y-auto flex-col justify-between ${
          mobileView === 'controls' && !previewMode ? 'flex flex-1' : 'hidden lg:flex'
        }`}>
          <div>
            <div className="flex border-b border-[#E9E8F0] mb-6">
              <button
                onClick={() => {
                  setPreviewMode(false);
                  setActiveArea('photo');
                }}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition ${
                  activeArea === 'photo' && !previewMode
                    ? 'border-[#6425E8] text-[#6425E8]'
                    : 'border-transparent text-[#73738A]'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo Placement</span>
              </button>

              <button
                onClick={() => {
                  setPreviewMode(false);
                  setActiveArea('name');
                }}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition ${
                  activeArea === 'name' && !previewMode
                    ? 'border-[#6425E8] text-[#6425E8]'
                    : 'border-transparent text-[#73738A]'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Name Styling</span>
              </button>
            </div>

            {activeArea === 'photo' ? (
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    Crop Shape
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => handleUpdateTemplate('photo_shape', 'circle')}
                      className={`py-2 text-xs font-semibold rounded-xl border text-center transition ${
                        template.photo_shape === 'circle'
                          ? 'border-[#6425E8] bg-[#6425E8]/10 text-[#6425E8]'
                          : 'border-[#E9E8F0] text-[#73738A] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      Circular Avatar
                    </button>
                    <button
                      onClick={() => handleUpdateTemplate('photo_shape', 'rectangle')}
                      className={`py-2 text-xs font-semibold rounded-xl border text-center transition ${
                        template.photo_shape === 'rectangle'
                          ? 'border-[#6425E8] bg-[#6425E8]/10 text-[#6425E8]'
                          : 'border-[#E9E8F0] text-[#73738A] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      Rectangle
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    <span>Horizontal Position (X)</span>
                    <span className="font-mono text-[#111126]">{Math.round(template.photo_x * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.01"
                    value={template.photo_x}
                    onChange={(e) => handleUpdateTemplate('photo_x', parseFloat(e.target.value))}
                    className="w-full mt-2 accent-[#6425E8]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-[#111126]">{Math.round(template.photo_y * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.01"
                    value={template.photo_y}
                    onChange={(e) => handleUpdateTemplate('photo_y', parseFloat(e.target.value))}
                    className="w-full mt-2 accent-[#6425E8]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    <span>Photo Diameter / Width</span>
                    <span className="font-mono font-bold text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded text-[11px]">
                      {Math.round(template.photo_width * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.85"
                    step="0.005"
                    value={template.photo_width}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdateTemplate('photo_width', val);
                      handleUpdateTemplate('photo_height', val);
                    }}
                    className="w-full mt-2 accent-[#6425E8]"
                  />

                  {/* Quick Cutout Size Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {[
                      { label: 'Small (30%)', val: 0.30 },
                      { label: 'Medium (38%)', val: 0.38 },
                      { label: 'Fill Cutout (46%)', val: 0.46 },
                      { label: 'Large (54%)', val: 0.54 },
                      { label: 'Hero (62%)', val: 0.62 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => {
                          const oldW = template.photo_width;
                          const oldH = template.photo_height;
                          const centerX = template.photo_x + oldW / 2;
                          const centerY = template.photo_y + oldH / 2;
                          const newX = Math.max(0, Math.min(1 - p.val, Number((centerX - p.val / 2).toFixed(4))));
                          const newY = Math.max(0, Math.min(1 - p.val, Number((centerY - p.val / 2).toFixed(4))));
                          setTemplate({
                            ...template,
                            photo_width: p.val,
                            photo_height: p.val,
                            photo_x: newX,
                            photo_y: newY,
                          });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                          Math.abs(template.photo_width - p.val) < 0.03
                            ? 'bg-[#6425E8] text-white shadow-2xs'
                            : 'bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#111126]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#73738A] bg-[#F8F8FC] p-3 rounded-xl border border-[#E9E8F0]">
                  💡 <strong>Precision Tip:</strong> Drag the photo placement box directly on the flyer image to reposition it effortlessly.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    Font Family
                  </label>
                  <select
                    value={template.font_family}
                    onChange={(e) => handleUpdateTemplate('font_family', e.target.value)}
                    className="w-full mt-1.5 p-2 bg-white border border-[#E9E8F0] rounded-xl text-xs font-medium"
                  >
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans (Modern Clean)</option>
                    <option value="Inter, sans-serif">Inter (Standard Neutral)</option>
                    <option value="Playfair Display, serif">Playfair Display (Luxury & Gala)</option>
                    <option value="Space Grotesk, sans-serif">Space Grotesk (Tech Geometric)</option>
                  </select>
                </div>

                {/* Host Name Text Color Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                      Name Text Color
                    </label>
                    <span className="text-xs font-mono font-bold text-[#111126]">{template.text_color}</span>
                  </div>

                  {/* 10 One-Click Color Presets */}
                  <div className="grid grid-cols-5 gap-2 mb-2.5">
                    {[
                      { name: 'White (Dark Flyers)', hex: '#FFFFFF', border: true },
                      { name: 'Dark Charcoal', hex: '#111126' },
                      { name: 'Jet Black', hex: '#000000' },
                      { name: 'Bright Gold', hex: '#F59E0B' },
                      { name: 'Luxury Amber', hex: '#D97706' },
                      { name: 'Eventra Purple', hex: '#6425E8' },
                      { name: 'Crimson Red', hex: '#DC2626' },
                      { name: 'Burgundy Wine', hex: '#831843' },
                      { name: 'Emerald', hex: '#047857' },
                      { name: 'Royal Navy', hex: '#1E3A8A' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleUpdateTemplate('text_color', c.hex)}
                        title={c.name}
                        className={`h-7 rounded-lg transition-transform flex items-center justify-center relative ${
                          template.text_color.toLowerCase() === c.hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-[#6425E8] shadow-sm'
                            : 'hover:scale-105 opacity-90 hover:opacity-100'
                        } ${c.border ? 'border border-[#CBD5E1]' : ''}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {template.text_color.toLowerCase() === c.hex.toLowerCase() && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              c.hex === '#FFFFFF' ? 'bg-[#111126]' : 'bg-white'
                            }`}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Hex Color Picker */}
                  <div className="flex items-center space-x-2 bg-[#F8F8FC] p-2 rounded-xl border border-[#E9E8F0]">
                    <input
                      type="color"
                      value={template.text_color}
                      onChange={(e) => handleUpdateTemplate('text_color', e.target.value)}
                      className="w-7 h-7 rounded border border-[#E9E8F0] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={template.text_color}
                      onChange={(e) => handleUpdateTemplate('text_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 bg-white border border-[#E9E8F0] rounded-lg px-2.5 py-1 text-xs font-mono text-[#111126] uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                      Font Weight
                    </label>
                    <select
                      value={template.font_weight}
                      onChange={(e) => handleUpdateTemplate('font_weight', e.target.value)}
                      className="w-full mt-1.5 p-2 bg-white border border-[#E9E8F0] rounded-xl text-xs font-medium"
                    >
                      <option value="500">Medium (500)</option>
                      <option value="600">Semibold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra Bold (800)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-1 mt-1.5">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleUpdateTemplate('text_alignment', align)}
                          className={`py-2 text-[11px] font-bold capitalize rounded-xl border transition ${
                            template.text_alignment === align
                              ? 'border-[#6425E8] bg-[#6425E8]/10 text-[#6425E8]'
                              : 'border-[#E9E8F0] text-[#73738A]'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name Box Width & Height Bounds */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                      <span>Name Area Width</span>
                      <span className="font-mono text-[#111126]">{Math.round(template.name_width * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.95"
                      step="0.01"
                      value={template.name_width}
                      onChange={(e) => handleUpdateTemplate('name_width', parseFloat(e.target.value))}
                      className="w-full mt-1.5 accent-[#6425E8]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                      <span>Name Area Height</span>
                      <span className="font-mono text-[#111126]">{Math.round(template.name_height * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.16"
                      step="0.005"
                      value={template.name_height}
                      onChange={(e) => handleUpdateTemplate('name_height', parseFloat(e.target.value))}
                      className="w-full mt-1.5 accent-[#6425E8]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-[#111126]">{Math.round(template.name_y * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.95"
                    step="0.01"
                    value={template.name_y}
                    onChange={(e) => handleUpdateTemplate('name_y', parseFloat(e.target.value))}
                    className="w-full mt-2 accent-[#6425E8]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                    <span>Max Font Size</span>
                    <span className="font-mono text-[#111126]">{template.font_size}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="2"
                    value={template.font_size}
                    onChange={(e) => handleUpdateTemplate('font_size', parseInt(e.target.value))}
                    className="w-full mt-2 accent-[#6425E8]"
                  />
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] flex items-start gap-2">
                  <span className="shrink-0 font-bold">✨ Auto-Fit:</span>
                  <span>Long participant names automatically scale down so they fit perfectly within this box and never overflow.</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Live Preview Trigger */}
          <div className="pt-6 border-t border-[#E9E8F0]">
            <button
              onClick={handleTogglePreview}
              className="w-full py-2.5 px-3 bg-[#F8F8FC] hover:bg-[#EEF0F6] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] flex items-center justify-center space-x-2 transition"
            >
              <Eye className="w-4 h-4 text-[#6425E8]" />
              <span>{previewMode ? 'Return to Layout Editor' : 'Simulate Participant Output'}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Floating Viewport Dock (< lg) */}
      <div className="lg:hidden bg-white border-t border-[#E9E8F0] p-2 flex items-center gap-2 sticky bottom-0 z-30 shadow-lg">
        <button
          onClick={() => { setMobileView('canvas'); setPreviewMode(false); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
            mobileView === 'canvas' && !previewMode ? 'bg-[#6425E8] text-white shadow-sm' : 'text-[#73738A] bg-[#F8F8FC] hover:bg-[#EEF0F6]'
          }`}
        >
          <Move className="w-4 h-4" />
          <span>Canvas</span>
        </button>
        <button
          onClick={() => { setMobileView('controls'); setPreviewMode(false); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
            mobileView === 'controls' && !previewMode ? 'bg-[#6425E8] text-white shadow-sm' : 'text-[#73738A] bg-[#F8F8FC] hover:bg-[#EEF0F6]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Slot Settings</span>
        </button>
        <button
          onClick={async () => {
            setMobileView('preview');
            await handleTogglePreview();
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
            previewMode ? 'bg-[#6425E8] text-white shadow-sm' : 'text-[#73738A] bg-[#F8F8FC] hover:bg-[#EEF0F6]'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>


      {/* Share & Publish Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-[#111126]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 border border-[#E9E8F0]">
            <div className="w-12 h-12 bg-[#6425E8]/10 rounded-2xl flex items-center justify-center text-[#6425E8] mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#111126]">Eventra Create Campaign Live!</h3>
            <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
              Your participants can now open this link on their phone or desktop, upload their portrait, and instantly download their personalised flyer without an account.
            </p>

            <div className="mt-5 p-3.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl">
              <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider block mb-1">
                Unique Participant Sharing Link
              </span>
              <div className="flex items-center space-x-2">
                <input
                  readOnly
                  value={getPublicUrl()}
                  className="bg-transparent text-xs text-[#111126] flex-1 outline-none font-mono truncate font-semibold"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-lg transition flex items-center space-x-1 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <a
                href={getPublicUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-[#E9E8F0] text-xs font-semibold rounded-xl flex items-center space-x-1 hover:bg-[#F8F8FC] transition"
              >
                <span>Test Participant Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-[#111126] text-white text-xs font-semibold rounded-xl hover:bg-black transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
