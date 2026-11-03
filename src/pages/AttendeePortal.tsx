import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { FlyerEvent, EventRegistration, SavedEvent } from '../types/database';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  Bookmark, Ticket, Heart, Calendar, MapPin, 
  Trash2, ExternalLink, Sparkles, ArrowRight, Check
} from 'lucide-react';

const ALL_INTEREST_CATEGORIES = [
  'Religion and Faith',
  'Technology',
  'Business',
  'Music',
  'Workshops',
  'Conferences',
  'Education',
  'Networking',
  'Community',
  'Health and Wellness',
  'Sports',
  'Lifestyle',
  'Weddings and Celebrations',
];

export const AttendeePortal: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'saved' | 'registrations' | 'interests'>(
    location.pathname.includes('/my-registrations') ? 'registrations' : 'saved'
  );

  const [savedEvents, setSavedEvents] = useState<FlyerEvent[]>([]);
  const [registrations, setRegistrations] = useState<{ reg: EventRegistration; event: FlyerEvent | null }[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedInterestsNotice, setSavedInterestsNotice] = useState(false);

  useEffect(() => {
    const load = async () => {
      await initializeLocalData();
      if (user) {
        // Saved Events
        const savedRecords = db.getSavedEvents(user.id);
        const allEvents = db.getEvents();
        const evMap = new Map<string, FlyerEvent>();
        allEvents.forEach((e) => evMap.set(e.id, e));

        const matchedSaved: FlyerEvent[] = [];
        savedRecords.forEach((s) => {
          const ev = evMap.get(s.event_id);
          if (ev) matchedSaved.push(ev);
        });
        setSavedEvents(matchedSaved);

        // Registrations by User Email
        const userRegs = db.getRegistrationsByEmail(user.email || '');
        const mappedRegs = userRegs.map((reg) => ({
          reg,
          event: evMap.get(reg.event_id) || null,
        }));
        setRegistrations(mappedRegs);

        // Interests
        const userCats = db.getUserInterests(user.id);
        setSelectedInterests(userCats);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleRemoveSaved = (eventId: string) => {
    if (!user) return;
    db.toggleSaveEvent(user.id, eventId);
    setSavedEvents(savedEvents.filter((e) => e.id !== eventId));
  };

  const handleToggleInterest = (category: string) => {
    if (!user) return;
    const exists = selectedInterests.includes(category);
    let updated: string[];
    if (exists) {
      updated = selectedInterests.filter((c) => c !== category);
    } else {
      updated = [...selectedInterests, category];
    }
    setSelectedInterests(updated);
    db.saveUserInterests(user.id, updated);
    setSavedInterestsNotice(true);
    setTimeout(() => setSavedInterestsNotice(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111126]">Sign in to Attendee Portal</h2>
            <p className="text-xs text-[#73738A]">
              Log in or create a free account to view your bookmarked events, track your event registrations, and customize recommendations.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link to="/login" className="px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl">
                Log In
              </Link>
              <Link to="/register" className="px-4 py-2 border border-[#E9E8F0] text-xs font-semibold rounded-xl hover:bg-[#F8F8FC]">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8]">
            Attendee Experience
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111126]">My Saved Events & Registrations</h1>
          <p className="text-xs text-[#73738A]">
            Access your registrations, bookmarks, and discovery preferences in one place.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#E9E8F0] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'saved'
                ? 'bg-[#6425E8] text-white shadow-2xs'
                : 'bg-white text-[#555567] border border-[#E9E8F0] hover:text-[#111126]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Events ({savedEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'registrations'
                ? 'bg-[#6425E8] text-white shadow-2xs'
                : 'bg-white text-[#555567] border border-[#E9E8F0] hover:text-[#111126]'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>My Registrations ({registrations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'interests'
                ? 'bg-[#6425E8] text-white shadow-2xs'
                : 'bg-white text-[#555567] border border-[#E9E8F0] hover:text-[#111126]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>My Category Interests ({selectedInterests.length})</span>
          </button>
        </div>

        {/* SAVED EVENTS TAB */}
        {activeTab === 'saved' && (
          <div className="space-y-4 animate-fade-in">
            {savedEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-12 text-center max-w-md mx-auto space-y-3">
                <Bookmark className="w-8 h-8 text-[#73738A] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[#111126]">No saved events yet</h3>
                <p className="text-xs text-[#73738A]">
                  Click the bookmark icon on any event card in Eventra Discover to save it here.
                </p>
                <div className="pt-2">
                  <Link
                    to="/discover"
                    className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
                  >
                    Explore Discover
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedEvents.map((ev) => (
                  <div key={ev.id} className="bg-white rounded-2xl border border-[#E9E8F0] overflow-hidden flex flex-col justify-between shadow-2xs">
                    <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                      <img
                        src={ev.cover_image_url || ev.original_flyer_path || '/assets/aistudio/IMG_2529_74b7441a.jpeg'}
                        alt={ev.title || ev.event_name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(ev.id)}
                        title="Remove from saved"
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-white/90 text-rose-600 hover:bg-white shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-2">
                      <span className="text-[10px] font-bold text-[#6425E8] uppercase">{ev.category || 'Event'}</span>
                      <h3 className="text-sm font-bold text-[#111126] line-clamp-1">{ev.title || ev.event_name}</h3>
                      <p className="text-xs text-[#73738A]">{ev.event_date || 'Date TBA'}</p>
                      <div className="pt-2 border-t border-[#F0F0F5] flex items-center justify-between">
                        <Link
                          to={`/events/${ev.slug || ev.id}`}
                          className="text-xs font-bold text-[#6425E8] hover:underline"
                        >
                          View Event Page &rarr;
                        </Link>
                        <Link
                          to={`/e/${ev.slug || ev.id}`}
                          className="text-xs font-semibold text-[#111126] hover:text-[#6425E8]"
                        >
                          Flyer &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REGISTRATIONS TAB */}
        {activeTab === 'registrations' && (
          <div className="space-y-4 animate-fade-in">
            {registrations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-12 text-center max-w-md mx-auto space-y-3">
                <Ticket className="w-8 h-8 text-[#73738A] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[#111126]">No event registrations found</h3>
                <p className="text-xs text-[#73738A]">
                  When you register for public events, your confirmation reference codes appear here.
                </p>
                <div className="pt-2">
                  <Link
                    to="/discover"
                    className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
                  >
                    Discover Events to Attend
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map(({ reg, event: ev }) => (
                  <div key={reg.id} className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#6425E8] bg-[#6425E8]/10 px-2.5 py-0.5 rounded-md">
                          {reg.registration_reference}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {reg.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#111126]">
                        {ev ? ev.title || ev.event_name : 'Event Registration'}
                      </h3>
                      {ev && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#73738A]">
                          <span>{ev.event_date || 'Date TBA'}</span>
                          <span>·</span>
                          <span>{ev.event_type === 'online' ? 'Online' : `${ev.city || 'Venue'}, ${ev.country || ''}`}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev && (
                        <>
                          <Link
                            to={`/events/${ev.slug || ev.id}`}
                            className="px-3.5 py-2 border border-[#E9E8F0] hover:bg-[#F8F8FC] text-xs font-semibold text-[#111126] rounded-xl transition"
                          >
                            Event Page
                          </Link>
                          <Link
                            to={`/e/${ev.slug || ev.id}`}
                            className="px-3.5 py-2 bg-gradient-to-r from-[#6425E8] to-[#9638F5] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>My Attendee Flyer</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INTERESTS TAB */}
        {activeTab === 'interests' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-6 max-w-3xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111126]">Personalise Your Event Discovery</h3>
                <p className="text-xs text-[#73738A]">
                  Select the categories that interest you to tailor your Eventra Discover feed.
                </p>
              </div>
              {savedInterestsNotice && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 animate-scale-up">
                  <Check className="w-3.5 h-3.5" />
                  <span>Preferences saved</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_INTEREST_CATEGORIES.map((cat) => {
                const isSelected = selectedInterests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleInterest(cat)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'border-[#6425E8] bg-[#6425E8]/10 text-[#6425E8] ring-1 ring-[#6425E8]'
                        : 'border-[#E9E8F0] bg-[#F8F8FC] text-[#555567] hover:bg-white hover:border-[#6425E8]'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#6425E8]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
