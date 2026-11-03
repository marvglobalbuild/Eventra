import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { uploadFlyerFile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { storeFileInIDB } from '../lib/storage-and-db';
import { Navbar } from '../components/Navbar';
import { 
  Upload, ArrowLeft, Loader2, AlertCircle, 
  ArrowRight, Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react';

export const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrg, profile, isHost, becomeHost } = useAuth();

  const [eventName, setEventName] = useState('');
  const [organizerName, setOrganizerName] = useState(
    profile?.full_name || currentOrg?.name || 'Event Host'
  );
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (text: string) => {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 7)
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError('Only PNG, JPG, and WebP flyers are supported.');
        return;
      }
      setFile(f);
      setSelectedSample(null);
      setFilePreview(URL.createObjectURL(f));
      setError(null);
    }
  };

  const handleSelectSample = (type: 'tech' | 'gala' | 'music') => {
    setSelectedSample(type);
    setFile(null);
    const dataUrl = createSampleFlyerDataUrl(type);
    setFilePreview(dataUrl);
    if (!eventName) {
      if (type === 'tech') setEventName('Tech & Innovation Summit');
      if (type === 'gala') setEventName('Annual Worship Celebration');
      if (type === 'music') setEventName('Pulse Live Festival');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please provide an event or flyer title.');
      return;
    }

    if (!file && !selectedSample && !filePreview) {
      setError('Please upload your flyer image or select a sample design.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let flyerPath = '';
      let flyerDataUrl = '';

      if (file) {
        const uploadResult = await uploadFlyerFile(file, user?.id || 'anon');
        flyerPath = uploadResult.path;
        flyerDataUrl = uploadResult.dataUrl;
      } else if (selectedSample) {
        flyerDataUrl = createSampleFlyerDataUrl(selectedSample as any);
        flyerPath = `event-flyers/sample-${selectedSample}-${Date.now()}.jpg`;
        await storeFileInIDB(flyerPath, flyerDataUrl);
      } else if (filePreview) {
        flyerDataUrl = filePreview;
        flyerPath = `event-flyers/custom-${Date.now()}.jpg`;
        await storeFileInIDB(flyerPath, flyerDataUrl);
      }

      const evId = `ev_${Date.now()}`;
      const slug = generateSlug(eventName);

      const newEvent = db.saveEvent({
        id: evId,
        user_id: user?.id || '',
        org_id: currentOrg?.id || user?.id || '',
        event_name: eventName,
        title: eventName,
        description: `Official participation flyer for ${eventName}`,
        slug: slug,
        original_flyer_path: flyerPath,
        original_flyer_data_url: flyerDataUrl,
        category: 'Event',
        status: 'draft',
        event_date: new Date().toISOString().split('T')[0],
        organiser_name: organizerName,
        venue: organizerName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Default template positioning
      db.saveTemplate({
        id: `tmpl_${Date.now()}`,
        event_id: evId,
        photo_x: 0.31,
        photo_y: 0.32,
        photo_width: 0.38,
        photo_height: 0.38,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1, frameScale: 1.0 },
        name_x: 0.15,
        name_y: 0.725,
        name_width: 0.70,
        name_height: 0.055,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '700',
        text_color: '#FFFFFF',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // If user isn't marked as host yet, activate host capability smoothly
      if (!isHost) {
        becomeHost();
      }

      // Seamless redirect directly to canvas coordinate positioning
      navigate(`/editor/${newEvent.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize flyer. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 md:py-12">
        {/* Navigation & Header */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-[#5B5B7E] hover:text-[#111126] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#6425E8]/10 text-[#6425E8]">
                Step 1 of 2
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#111126] mt-2 tracking-tight">
                Create Flyer Link
              </h1>
              <p className="text-[#5B5B7E] text-sm mt-1">
                Upload your flyer artwork, name your event, and configure participant coordinates.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Clean, Fast Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E9E8F0] shadow-sm p-6 md:p-8 space-y-6">
          
          {/* Event Title */}
          <div>
            <label className="block text-sm font-bold text-[#111126] mb-2">
              Event or Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Annual Leaders Conference 2026"
              className="w-full px-4 py-3 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6425E8] focus:bg-white text-[#111126] font-medium transition-all"
              required
            />
          </div>

          {/* Flyer Artwork Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#111126]">
                Flyer Artwork <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-[#5B5B7E]">PNG, JPG or WebP (up to 10MB)</span>
            </div>

            {filePreview ? (
              <div className="relative rounded-2xl border border-[#E9E8F0] bg-[#111126]/5 p-4 flex flex-col items-center">
                <div className="max-h-80 w-auto rounded-xl overflow-hidden shadow-md border border-white">
                  <img
                    src={filePreview}
                    alt="Uploaded flyer preview"
                    className="max-h-80 w-auto object-contain mx-auto"
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label
                    htmlFor="flyer-upload-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E9E8F0] rounded-lg text-xs font-bold text-[#111126] hover:bg-[#F8F8FC] shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#6425E8]" />
                    Change Flyer Image
                  </label>
                  <input
                    id="flyer-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Flyer Ready
                  </span>
                </div>
              </div>
            ) : (
              <label
                htmlFor="flyer-upload-dropzone"
                className="group relative flex flex-col items-center justify-center border-2 border-dashed border-[#D2D1E0] hover:border-[#6425E8] bg-[#F8F8FC] hover:bg-[#6425E8]/5 rounded-2xl p-8 cursor-pointer transition-all"
              >
                <input
                  id="flyer-upload-dropzone"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#E9E8F0] group-hover:scale-105 flex items-center justify-center text-[#6425E8] shadow-sm mb-3 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#111126]">
                  Click to upload flyer or drag & drop
                </p>
                <p className="text-xs text-[#5B5B7E] mt-1">
                  High-resolution square or portrait flyer (recommended: 1080×1080 or 1080×1350)
                </p>
              </label>
            )}

            {/* Quick Sample Fly Options if testing */}
            {!filePreview && (
              <div className="mt-3 pt-3 border-t border-[#E9E8F0]/60">
                <span className="text-xs text-[#5B5B7E] font-medium mr-2">Or test with starter design:</span>
                <div className="inline-flex flex-wrap gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectSample('tech')}
                    className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-[#6425E8]/10 hover:text-[#6425E8] border border-[#E9E8F0] rounded-lg text-[#5B5B7E] transition-colors"
                  >
                    Tech Summit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSample('gala')}
                    className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-[#6425E8]/10 hover:text-[#6425E8] border border-[#E9E8F0] rounded-lg text-[#5B5B7E] transition-colors"
                  >
                    Worship & Faith
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSample('music')}
                    className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-[#6425E8]/10 hover:text-[#6425E8] border border-[#E9E8F0] rounded-lg text-[#5B5B7E] transition-colors"
                  >
                    Live Music
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Organizer / Host Name */}
          <div>
            <label className="block text-sm font-bold text-[#111126] mb-2">
              Organizer / Host Name <span className="text-xs font-normal text-[#5B5B7E]">(Optional)</span>
            </label>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="e.g. Acme Community"
              className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6425E8] focus:bg-white text-[#111126] font-medium text-sm transition-all"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-[#6425E8] hover:bg-[#521dc4] text-white font-bold rounded-xl shadow-lg shadow-[#6425E8]/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing Flyer Canvas...</span>
                </>
              ) : (
                <>
                  <span>Continue to Position Photo & Name</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-[#5B5B7E] mt-3">
              Next step: Position where participant photo and name will appear on the flyer.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
};
