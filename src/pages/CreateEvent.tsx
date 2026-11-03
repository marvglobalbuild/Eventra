import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { uploadFlyerFile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { storeFileInIDB } from '../lib/storage-and-db';
import { EventraLogo } from '../components/EventraLogo';
import { 
  Upload, ArrowLeft, Loader2, AlertCircle, FileImage, Layers,
  Calendar, MapPin, Tag, ArrowRight
} from 'lucide-react';

export const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrg } = useAuth();

  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('Technology & Business');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameTextColor, setNameTextColor] = useState('#FFFFFF');
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
      setFilePreview(URL.createObjectURL(f));
      setError(null);
    }
  };

  const handleCreateWithPreset = async (type: 'tech' | 'gala' | 'music', name: string) => {
    setLoading(true);
    try {
      const dataUrl = createSampleFlyerDataUrl(type);
      const storageKey = `event-flyers/preset-${type}-${Date.now()}.jpg`;
      await storeFileInIDB(storageKey, dataUrl);

      const evId = `ev_${Date.now()}`;
      const slug = generateSlug(name);

      const newEvent = db.saveEvent({
        id: evId,
        user_id: user?.id || '',
        org_id: currentOrg?.id || user?.id || '',
        event_name: name,
        slug: slug,
        original_flyer_path: storageKey,
        original_flyer_data_url: dataUrl,
        category: type === 'tech' ? 'Technology & AI' : type === 'gala' ? 'Gala & Worship' : 'Arts & Music',
        venue: type === 'tech' ? 'Moscone Center, SF' : type === 'gala' ? 'Grand Symphony Hall' : 'Open Air Arena',
        event_date: 'Fall 2026',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Template defaults
      if (type === 'tech') {
        db.saveTemplate({
          id: `tmpl_${Date.now()}`,
          event_id: evId,
          photo_x: 0.35,
          photo_y: 0.27,
          photo_width: 0.30,
          photo_height: 0.30,
          photo_shape: 'circle',
          name_x: 0.15,
          name_y: 0.60,
          name_width: 0.70,
          name_height: 0.08,
          font_family: 'Plus Jakarta Sans, sans-serif',
          font_size: 42,
          font_weight: '700',
          text_color: '#FFFFFF',
          text_alignment: 'center',
          max_lines: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (type === 'gala') {
        db.saveTemplate({
          id: `tmpl_${Date.now()}`,
          event_id: evId,
          photo_x: 0.31,
          photo_y: 0.32,
          photo_width: 0.38,
          photo_height: 0.38,
          photo_shape: 'circle',
          name_x: 0.15,
          name_y: 0.725,
          name_width: 0.70,
          name_height: 0.055,
          font_family: 'Playfair Display, serif',
          font_size: 46,
          font_weight: '700',
          text_color: '#FACC15',
          text_alignment: 'center',
          max_lines: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        db.saveTemplate({
          id: `tmpl_${Date.now()}`,
          event_id: evId,
          photo_x: 0.35,
          photo_y: 0.29,
          photo_width: 0.30,
          photo_height: 0.30,
          photo_shape: 'rectangle',
          name_x: 0.15,
          name_y: 0.61,
          name_width: 0.70,
          name_height: 0.08,
          font_family: 'Plus Jakarta Sans, sans-serif',
          font_size: 44,
          font_weight: '800',
          text_color: '#FFFFFF',
          text_alignment: 'center',
          max_lines: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      navigate(`/editor/${newEvent.id}`);
    } catch (e: any) {
      setError(e.message || 'Error creating event');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please provide an event name.');
      return;
    }
    if (!file) {
      setError('Please upload an event flyer design.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uploadRes = await uploadFlyerFile(file, user?.id || 'anon');
      const slug = generateSlug(eventName);
      const evId = `ev_${Date.now()}`;

      const newEvent = db.saveEvent({
        id: evId,
        user_id: user?.id || '',
        org_id: currentOrg?.id || user?.id || '',
        event_name: eventName.trim(),
        slug: slug,
        original_flyer_path: uploadRes.path,
        original_flyer_data_url: uploadRes.dataUrl,
        category,
        venue: venue || 'Main Event Venue',
        event_date: eventDate || 'Upcoming',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Default Template
      db.saveTemplate({
        id: `tmpl_${Date.now()}`,
        event_id: evId,
        photo_x: 0.31,
        photo_y: 0.32,
        photo_width: 0.38,
        photo_height: 0.38,
        photo_shape: 'circle',
        name_x: 0.15,
        name_y: 0.725,
        name_width: 0.70,
        name_height: 0.055,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '700',
        text_color: nameTextColor,
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      navigate(`/editor/${newEvent.id}`);
    } catch (err: any) {
      setError(err.message || 'Error uploading flyer.');
      setLoading(false);
    }
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError('Only PNG, JPG, and WebP flyers are supported.');
        return;
      }
      setFile(f);
      setFilePreview(URL.createObjectURL(f));
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] py-10 px-4 flex flex-col items-center font-sans">
      <div className="w-full max-w-xl animate-slide-up-fade">
        <button
          onClick={() => navigate('/dashboard')}
          className="interactive-btn inline-flex items-center space-x-2 text-xs font-semibold text-[#73738A] hover:text-[#111126] mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Eventra Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E9E8F0] p-5 sm:p-8 shadow-sm">
          <div className="mb-6 pb-6 border-b border-[#E9E8F0] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#6425E8] uppercase tracking-wider bg-[#6425E8]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6425E8] animate-pulse" />
                  Eventra Create
                </span>
                <span className="text-[11px] text-[#73738A]">· {currentOrg?.name}</span>
              </div>
              <h1 className="text-xl font-bold text-[#111126]">Create New Event</h1>
              <p className="text-xs text-[#73738A] mt-1 leading-relaxed">
                Provide your event details and flyer design. You will then position the personalized photo and name areas.
              </p>
            </div>
            <div className="hidden sm:block">
              <EventraLogo variant="symbol" size="lg" />
            </div>
          </div>

          {error && (
            <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-scale-up">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                Event Name
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. World Technology Leadership Summit 2026"
                className="w-full px-4 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                  Event Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs font-medium"
                >
                  <option value="Technology & Business">Technology & Business</option>
                  <option value="Conference & Summit">Conference & Summit</option>
                  <option value="Gala & Awards Dinner">Gala & Awards Dinner</option>
                  <option value="Worship & Faith Gathering">Worship & Faith Gathering</option>
                  <option value="Creative & Design Festival">Creative & Design Festival</option>
                  <option value="Community & Networking">Community & Networking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                  Venue / Location
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Grand Ballroom or Virtual"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                Flyer Image Asset (PNG, JPG, or WebP)
              </label>
              <input
                type="file"
                id="flyer-file-upload"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {!filePreview ? (
                <label
                  htmlFor="flyer-file-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-[#6425E8] bg-[#6425E8]/10 scale-[1.01]'
                      : 'border-[#E9E8F0] hover:border-[#6425E8] bg-[#F8F8FC] hover:bg-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 flex items-center justify-center text-[#6425E8] mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-[#111126]">
                    {isDraggingOver ? 'Drop flyer artwork here' : 'Click or drag flyer artwork to upload'}
                  </span>
                  <span className="text-[11px] text-[#73738A] mt-1">PNG, JPG, WebP up to 25MB</span>
                </label>
              ) : (
                <div className="border border-[#E9E8F0] rounded-2xl p-3 flex items-center space-x-4 bg-[#F8F8FC] animate-scale-up">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-16 h-20 object-cover rounded-xl border border-[#CBD5E1]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111126] truncate">{file?.name}</p>
                    <label
                      htmlFor="flyer-file-upload"
                      className="text-xs text-[#6425E8] hover:underline cursor-pointer block mt-1 font-semibold"
                    >
                      Choose another file
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Name Text Color Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                  Participant Name Color
                </label>
                <span className="text-xs font-mono font-bold text-[#111126]">{nameTextColor}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'White Text', hex: '#FFFFFF', desc: 'Dark flyers' },
                  { label: 'Dark Navy', hex: '#111126', desc: 'Light/White banners' },
                  { label: 'Gold Text', hex: '#F59E0B', desc: 'Luxury / Worship' },
                  { label: 'Eventra Purple', hex: '#6425E8', desc: 'Brand accent' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNameTextColor(c.hex)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      nameTextColor === c.hex
                        ? 'border-[#6425E8] bg-[#6425E8]/10 ring-2 ring-[#6425E8]/30 shadow-xs'
                        : 'border-[#E9E8F0] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0 shadow-2xs" style={{ backgroundColor: c.hex }} />
                      <span className="text-[11px] font-bold text-[#111126] truncate">{c.label}</span>
                    </div>
                    <span className="text-[10px] text-[#73738A] block truncate">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="interactive-btn w-full py-3 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center space-x-2 animate-pulse-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Editor...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Continue to Eventra Create Positioning</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Start Presets */}
          <div className="mt-8 pt-8 border-t border-[#E9E8F0]">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-3">
              Or Start Instantly with a Pro Event Template
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleCreateWithPreset('tech', 'AI Developer Forum 2026')}
                className="interactive-card p-3.5 bg-[#F8F8FC] hover:bg-white border border-[#E9E8F0] hover:border-[#6425E8] rounded-xl text-left transition flex flex-col justify-between group"
              >
                <div>
                  <span className="text-xs font-bold text-[#111126] block">Tech Summit</span>
                  <span className="text-[11px] text-[#73738A] mt-0.5 block">Modern indigo gradient</span>
                </div>
                <span className="text-[10px] font-bold text-[#6425E8] mt-3 group-hover:translate-x-0.5 transition-transform">
                  Select Template →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateWithPreset('gala', 'Worship & Faith Night')}
                className="interactive-card p-3.5 bg-[#F8F8FC] hover:bg-white border border-[#E9E8F0] hover:border-[#6425E8] rounded-xl text-left transition flex flex-col justify-between group"
              >
                <div>
                  <span className="text-xs font-bold text-[#111126] block">Gala Evening</span>
                  <span className="text-[11px] text-[#73738A] mt-0.5 block">Gold & royal purple</span>
                </div>
                <span className="text-[10px] font-bold text-[#6425E8] mt-3 group-hover:translate-x-0.5 transition-transform">
                  Select Template →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateWithPreset('music', 'Pulse Music Festival')}
                className="interactive-card p-3.5 bg-[#F8F8FC] hover:bg-white border border-[#E9E8F0] hover:border-[#6425E8] rounded-xl text-left transition flex flex-col justify-between group"
              >
                <div>
                  <span className="text-xs font-bold text-[#111126] block">Creative Fest</span>
                  <span className="text-[11px] text-[#73738A] mt-0.5 block">Emerald & charcoal</span>
                </div>
                <span className="text-[10px] font-bold text-[#6425E8] mt-3 group-hover:translate-x-0.5 transition-transform">
                  Select Template →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
