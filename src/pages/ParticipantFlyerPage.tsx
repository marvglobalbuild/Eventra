import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { resolveFlyerSource, uploadParticipantPhoto } from '../lib/supabase';
import { FlyerEvent, FlyerTemplate, Participant } from '../types/database';
import { 
  renderPersonalisedFlyer, 
  downloadCanvasAsImage, 
  downloadCanvasAsPDF,
  triggerFlyerCelebration 
} from '../lib/canvas-engine';
import { createSamplePortraitDataUrl } from '../lib/sample-flyers';
import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { 
  Camera, Upload, Download, FileImage, FileText, CheckCircle2, 
  RefreshCw, Loader2, AlertCircle, Sparkles, ArrowLeft, Shield
} from 'lucide-react';

export const ParticipantFlyerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [template, setTemplate] = useState<FlyerTemplate | null>(null);
  const [flyerSrc, setFlyerSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  // Output Result State
  const [generatedCanvas, setGeneratedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    const ev = db.getEventBySlug(slug);
    if (!ev || ev.status === 'archived') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setEvent(ev);
    const resolved = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);
    setFlyerSrc(resolved);

    const tmpl = db.getTemplateByEventId(ev.id);
    if (!tmpl) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setTemplate(tmpl);
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
      const canvas = await renderPersonalisedFlyer({
        flyerImageUrl: flyerSrc,
        participantImageUrl: photoPreviewUrl,
        participantName: fullName.trim(),
        template: template,
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
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#111126]">Event Not Found</h2>
        <p className="text-xs text-[#73738A] mt-1.5 max-w-sm">
          This event flyer link might be inactive or removed by the organiser.
        </p>
        <Link
          to="/"
          className="mt-6 px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl hover:bg-[#4214B8] transition interactive-btn"
        >
          Go to Eventra Homepage
        </Link>
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
                <div className="rounded-xl border border-[#E9E8F0] p-3 flex items-center space-x-3.5 bg-[#F8F8FC] animate-scale-up">
                  <img
                    src={photoPreviewUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border border-[#CBD5E1] shadow-inner"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111126] truncate">
                      {photoFile?.name || 'Selected Portrait Photo'}
                    </p>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-[#6425E8] hover:underline mt-0.5"
                    >
                      Change photo
                    </button>
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
