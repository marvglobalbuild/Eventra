import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { uploadFlyerFile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { storeFileInIDB } from '../lib/storage-and-db';
import { Navbar } from '../components/Navbar';
import { 
  Upload, ArrowLeft, Loader2, AlertCircle, FileImage, 
  Calendar, MapPin, Tag, ArrowRight, Sparkles, Globe, Lock, Shield
} from 'lucide-react';

const CATEGORIES = [
  'Business',
  'Conferences',
  'Workshops',
  'Education',
  'Technology',
  'Religion and Faith',
  'Church Events',
  'Music',
  'Entertainment',
  'Networking',
  'Community',
  'Charity',
  'Health and Wellness',
  'Sports',
  'Lifestyle',
  'Weddings and Celebrations',
  'Other',
];

export const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrg, profile } = useAuth();

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [format, setFormat] = useState<'physical' | 'online' | 'hybrid'>('physical');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [visibility, setEditVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [capacity, setCapacity] = useState(500);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
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
      setFilePreview(URL.createObjectURL(f));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please provide an event title.');
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
      } else {
        // Default clean artwork template based on category
        const type = category === 'Music' ? 'music' : category.includes('Faith') || category.includes('Church') ? 'gala' : 'tech';
        flyerDataUrl = createSampleFlyerDataUrl(type);
        flyerPath = `event-flyers/default-${type}-${Date.now()}.jpg`;
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
        description: description,
        slug: slug,
        original_flyer_path: flyerPath,
        original_flyer_data_url: flyerDataUrl,
        cover_image_url: flyerPath,
        category: category,
        event_type: format,
        online_url: onlineUrl,
        venue: venue,
        address: address,
        city: city || (format === 'online' ? 'Online' : 'Global'),
        country: country || (format === 'online' ? 'Online' : 'Global'),
        event_date: eventDate || 'Upcoming',
        start_time: startTime || '9:00 AM',
        end_time: endTime || '5:00 PM',
        timezone: timezone,
        visibility: visibility,
        status: 'published',
        registration_status: 'open',
        capacity: capacity,
        organiser_name: profile?.full_name || currentOrg?.name || 'Event Organiser',
        organiser_email: user?.email || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Default flyer template coordinates so Eventra Create works out of the box
      db.saveTemplate({
        id: `tmpl_${evId}`,
        event_id: evId,
        photo_x: 0.35,
        photo_y: 0.30,
        photo_width: 0.30,
        photo_height: 0.30,
        photo_shape: 'circle',
        name_x: 0.20,
        name_y: 0.65,
        name_width: 0.60,
        name_height: 0.06,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 42,
        font_weight: '800',
        text_color: '#111126',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Navigate straight to the dedicated Event Workspace
      navigate(`/events/manage/${evId}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73738A] hover:text-[#111126]">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-[#E9E8F0] shadow-sm p-6 sm:p-10 space-y-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8]">
              Eventra Manage
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111126] mt-1">Create New Event</h1>
            <p className="text-xs text-[#73738A] mt-1">
              Configure your event details, set visibility, enable online registration, and prepare attendee flyers.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic Event Details */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111126] pb-2 border-b border-[#F0F0F5]">
                1. Basic Information
              </h2>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Next Horizon AI Summit 2026"
                  className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-sm font-semibold text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                  Event Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the schedule, key ministers/speakers, registration highlights, and what attendees can expect..."
                  className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e: any) => setFormat(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  >
                    <option value="physical">In-Person (Physical Venue)</option>
                    <option value="online">Online (Virtual Stream / Meeting)</option>
                    <option value="hybrid">Hybrid (Physical & Virtual)</option>
                  </select>
                </div>
              </div>

              {(format === 'online' || format === 'hybrid') && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Online Meeting / Live Stream URL
                  </label>
                  <input
                    type="url"
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... or https://youtube.com/live/..."
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Date, Time & Location */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111126] pb-2 border-b border-[#F0F0F5]">
                2. Date, Time & Location
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g. November 15, 2026"
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 5:00 PM"
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. WAT (UTC+1)"
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {format !== 'online' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                      Venue Name
                    </label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Landmark Centre or Church Auditorium"
                      className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address..."
                      className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lagos, Uyo, London"
                      className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Nigeria, United Kingdom"
                      className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Visibility & Capacity */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111126] pb-2 border-b border-[#F0F0F5]">
                3. Visibility & Capacity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Visibility State (Section 3.2)
                  </label>
                  <select
                    value={visibility}
                    onChange={(e: any) => setEditVisibility(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  >
                    <option value="public">Public (Appears on Eventra Discover)</option>
                    <option value="unlisted">Unlisted (Accessible by link only)</option>
                    <option value="private">Private (Restricted to invited attendees)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1.5">
                    Attendee Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-4 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Flyer / Artwork Upload */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111126] pb-2 border-b border-[#F0F0F5]">
                4. Flyer & Cover Image
              </h2>

              <div className="border-2 border-dashed border-[#E9E8F0] hover:border-[#6425E8] rounded-2xl p-6 text-center cursor-pointer bg-[#F8F8FC] transition relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {filePreview ? (
                  <div className="space-y-2">
                    <img
                      src={filePreview}
                      alt="Flyer Preview"
                      className="max-h-48 rounded-xl mx-auto object-contain border border-[#E9E8F0] shadow-sm"
                    />
                    <p className="text-xs font-bold text-[#6425E8]">Click to choose a different flyer image</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-[#111126]">Upload High-Resolution Event Artwork</p>
                    <p className="text-[11px] text-[#73738A]">PNG, JPG, or WebP. If left blank, a branded template is generated.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#F0F0F5] flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Event...</span>
                  </>
                ) : (
                  <>
                    <span>Create & Launch Event Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
