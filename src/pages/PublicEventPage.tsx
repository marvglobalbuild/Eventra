import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { FlyerEvent } from '../types/database';
import { Navbar } from '../components/Navbar';
import { RegistrationModal } from '../components/RegistrationModal';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Clock, MapPin, Globe, Share2, Sparkles, 
  Users, CheckCircle2, ChevronDown, ChevronUp, Copy, 
  Check, ExternalLink, ShieldAlert, ArrowRight, MessageCircle, 
  Mail, Bookmark, AlertCircle
} from 'lucide-react';

export const PublicEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPrivateDenied, setIsPrivateDenied] = useState(false);

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Social Share Sheet State
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      await initializeLocalData();
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const ev = db.getEventBySlug(slug) || db.getEventById(slug);
      if (!ev) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check visibility & authorization: private events require organizer authentication
      if (ev.visibility === 'private') {
        const isOwner = user && (user.id === ev.user_id || (user as any).org_id === ev.org_id);
        if (!isOwner) {
          setIsPrivateDenied(true);
          setLoading(false);
          return;
        }
      }

      setEvent(ev);

      // Record page view analytics
      db.recordEventAction(ev.id, 'view');

      if (user) {
        setIsSaved(db.isEventSaved(user.id, ev.id));
      }

      setLoading(false);
    };
    load();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#6425E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPrivateDenied) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111126]">Private Event</h2>
            <p className="text-xs text-[#73738A]">
              This event is private and restricted to authorized organizers and invited guests.
            </p>
            <div className="pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
              >
                Explore Public Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111126]">Event Not Found</h2>
            <p className="text-xs text-[#73738A]">
              The event link you followed may be expired or unpublished.
            </p>
            <div className="pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
              >
                Back to Discover
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cover = event.cover_image_url || event.original_flyer_path || '/assets/aistudio/IMG_2529_74b7441a.jpeg';
  const registrations = db.getRegistrations(event.id);
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;
  const capacity = event.capacity || 500;
  const percentFull = Math.min(100, Math.round((confirmedCount / capacity) * 100));

  const pageUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    db.recordEventAction(event.id, 'share', { channel: 'copy_link' });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join me at ${event.title || event.event_name}! Check out full details and register here: ${pageUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    db.recordEventAction(event.id, 'share', { channel: 'whatsapp' });
  };

  const handleToggleSave = () => {
    if (!user) {
      alert('Please sign in or create an account to bookmark events.');
      return;
    }
    const saved = db.toggleSaveEvent(user.id, event.id);
    setIsSaved(saved);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Top Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-[#E9E8F0] shadow-md mb-8">
          <div className="h-64 sm:h-96 w-full relative">
            <img
              src={cover}
              alt={event.title || event.event_name}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>

          {/* Overlay Content */}
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 text-white space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6425E8] text-white">
                {event.category || 'Event'}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold capitalize bg-white/20 text-white backdrop-blur-xs">
                {event.event_type || 'In-Person'}
              </span>
              {event.visibility === 'unlisted' && (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/80 text-white">
                  Direct Link Only (Unlisted)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              {event.title || event.event_name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#9638F5]" />
                <span className="font-semibold">{event.event_date || 'Date TBA'}</span>
              </div>
              {event.start_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#9638F5]" />
                  <span>{event.start_time} - {event.end_time || 'Finish'} ({event.timezone || 'UTC'})</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#9638F5]" />
                <span>{event.event_type === 'online' ? 'Online Virtual Event' : `${event.venue || event.city}, ${event.country || ''}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Event Narrative & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description Section */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-4">
              <h2 className="text-lg font-bold text-[#111126]">About this Event</h2>
              <div className="text-sm text-[#555567] leading-relaxed whitespace-pre-line space-y-3">
                {event.description || 'Join us for this memorable experience. Full details and schedule will be provided by the organiser.'}
              </div>
            </div>

            {/* Schedule Section if available */}
            {event.schedule && event.schedule.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-5">
                <h2 className="text-lg font-bold text-[#111126] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#6425E8]" />
                  <span>Event Programme & Schedule</span>
                </h2>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#E9E8F0]">
                  {event.schedule.map((item, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-[#6425E8] ring-4 ring-[#6425E8]/20" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[#6425E8] uppercase tracking-wider">{item.time}</span>
                        <h4 className="text-sm font-bold text-[#111126]">{item.title}</h4>
                        {item.description && <p className="text-xs text-[#73738A]">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Venue & Location Map Box */}
            {event.event_type !== 'online' && (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-4">
                <h2 className="text-lg font-bold text-[#111126] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#6425E8]" />
                  <span>Venue & Location</span>
                </h2>

                <div className="space-y-1 text-sm text-[#555567]">
                  <p className="font-bold text-[#111126]">{event.venue || 'Venue Address'}</p>
                  <p>{event.address}</p>
                  <p>{event.city}, {event.country}</p>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue || ''} ${event.address || ''} ${event.city || ''} ${event.country || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6425E8] hover:underline pt-1"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* FAQs Accordion if available */}
            {event.faqs && event.faqs.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-4">
                <h2 className="text-lg font-bold text-[#111126]">Frequently Asked Questions</h2>
                <div className="divide-y divide-[#F0F0F5]">
                  {event.faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="py-3">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#111126] hover:text-[#6425E8] transition focus:outline-none"
                        >
                          <span>{faq.question}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-[#73738A]" /> : <ChevronDown className="w-4 h-4 text-[#73738A]" />}
                        </button>
                        {isOpen && (
                          <p className="text-xs text-[#73738A] mt-2 leading-relaxed animate-fade-in">
                            {faq.answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Organiser Profile Card */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Organised By</span>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#111126]">{event.organiser_name || 'Event Organiser'}</h3>
                  {event.organiser_email && <p className="text-xs text-[#73738A]">{event.organiser_email}</p>}
                </div>
                {event.event_website && (
                  <a
                    href={event.event_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl border border-[#E9E8F0] hover:border-[#6425E8] text-xs font-semibold text-[#111126] flex items-center gap-1.5 transition"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#6425E8]" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Registration & Action Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-md sticky top-24 space-y-5">
              {/* Registration Status & Price */}
              <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F5]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">Admission</span>
                  <p className="text-2xl font-extrabold text-[#111126]">Free Admission</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSave}
                  title={isSaved ? 'Remove from saved' : 'Save event'}
                  className="p-2 rounded-xl border border-[#E9E8F0] hover:bg-[#F8F8FC] transition"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#6425E8] text-[#6425E8]' : 'text-[#73738A]'}`} />
                </button>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#73738A] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                    <span>Registered Attendees</span>
                  </span>
                  <span className="font-bold text-[#111126]">{confirmedCount} / {capacity}</span>
                </div>
                <div className="w-full bg-[#E9E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6425E8] rounded-full transition-all duration-500"
                    style={{ width: `${percentFull}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#73738A]">
                  {capacity - confirmedCount > 0 ? `${capacity - confirmedCount} spots remaining` : 'Capacity reached'}
                </span>
              </div>

              {/* Register Action Button */}
              <div>
                <button
                  type="button"
                  disabled={event.registration_status === 'closed' || (capacity - confirmedCount <= 0)}
                  onClick={() => {
                    db.recordEventAction(event.id, 'register_click');
                    setIsRegisterOpen(true);
                  }}
                  className="w-full py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{event.registration_status === 'closed' ? 'Registration Closed' : 'Register Now (Free)'}</span>
                </button>
              </div>

              {/* Eventra Create Flyer Feature Callout */}
              <div className="p-4 bg-gradient-to-tr from-[#6425E8]/10 via-[#9638F5]/5 to-transparent border border-[#6425E8]/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#6425E8]">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Official Personalised Attendee Flyer</span>
                </div>
                <p className="text-[11px] text-[#555567] leading-relaxed">
                  Generate your custom branded attendance flyer with your name and photo to share on WhatsApp and Instagram!
                </p>
                <Link
                  to={`/e/${event.slug || event.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6425E8] hover:underline pt-1"
                >
                  <span>Create My Flyer Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Social Share Sheet */}
              <div className="pt-2 border-t border-[#F0F0F5] space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#73738A] block">
                  Share this Event
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2 px-3 border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-xs font-semibold text-[#111126] flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Modal */}
      <RegistrationModal
        event={event}
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={() => {
          // Refresh event stats
          setEvent({ ...event });
        }}
      />
    </div>
  );
};
