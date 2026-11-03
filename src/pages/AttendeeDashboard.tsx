import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { FlyerEvent, EventRegistration, SavedEvent } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EventraLogo } from '../components/EventraLogo';
import { 
  Compass, Bookmark, Ticket, Calendar, MapPin, ArrowRight, Check, Search, Heart, 
  Settings, LogOut, ChevronRight, User, Shield, 
  Clock, ExternalLink, PlusCircle, CheckCircle2,
  Building2, Layers, AlertCircle, X, Menu
} from 'lucide-react';

const CATEGORIES = [
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
];

type AttendeeTab = 'overview' | 'discover' | 'registrations' | 'saved' | 'upcoming' | 'settings';

export const AttendeeDashboard: React.FC = () => {
  const { user, profile, isHost, becomeHost, switchView, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AttendeeTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [savedEvents, setSavedEvents] = useState<FlyerEvent[]>([]);
  const [registrations, setRegistrations] = useState<{ reg: EventRegistration; event: FlyerEvent | null }[]>([]);
  const [publicEvents, setPublicEvents] = useState<FlyerEvent[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Become Host Modal State
  const [showHostModal, setShowHostModal] = useState(false);
  const [orgBrandName, setOrgBrandName] = useState('');
  const [upgradingHost, setUpgradingHost] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  // Settings State
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  useEffect(() => {
    db.recordVisit('/attendee');
    loadAttendeeData();
  }, [user]);

  const loadAttendeeData = async () => {
    setLoading(true);
    await initializeLocalData();

    if (user) {
      const allEvents = db.getEvents();
      const evMap = new Map<string, FlyerEvent>();
      allEvents.forEach((e) => evMap.set(e.id, e));

      // Saved events
      const savedRecords = db.getSavedEvents(user.id);
      const matchedSaved: FlyerEvent[] = [];
      savedRecords.forEach((s) => {
        const ev = evMap.get(s.event_id);
        if (ev) matchedSaved.push(ev);
      });
      setSavedEvents(matchedSaved);

      // Registrations by user email
      const userRegs = db.getRegistrationsByEmail(user.email || '');
      const mappedRegs = userRegs.map((reg) => ({
        reg,
        event: evMap.get(reg.event_id) || null,
      }));
      setRegistrations(mappedRegs);

      // Interests
      const cats = db.getUserInterests(user.id);
      setUserInterests(cats);

      // Public discoverable events
      const pub = db.getPublicEvents();
      setPublicEvents(pub);
      setEditName(profile?.full_name || user.email?.split('@')[0] || '');
    }
    setLoading(false);
  };

  const handleToggleSave = (eventId: string) => {
    if (!user) return;
    db.toggleSaveEvent(user.id, eventId);
    loadAttendeeData();
  };

  const handleToggleInterest = (category: string) => {
    if (!user) return;
    const exists = userInterests.includes(category);
    const updated = exists 
      ? userInterests.filter((c) => c !== category)
      : [...userInterests, category];
    setUserInterests(updated);
    db.saveUserInterests(user.id, updated);
  };

  const handleActivateHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradingHost(true);
    setUpgradeError(null);

    const res = await becomeHost(orgBrandName.trim() || undefined);
    if (!res.success) {
      setUpgradeError(res.error || 'Failed to activate Host experience. Please try again.');
      setUpgradingHost(false);
    } else {
      setUpgradingHost(false);
      setShowHostModal(false);
      navigate('/dashboard');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    db.updateProfile({ full_name: editName.trim() });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 2500);
  };

  // Recommended events: matches user's preferred categories, or featured public events
  const recommendedEvents = publicEvents.filter((ev) => {
    if (userInterests.length > 0 && ev.category) {
      return userInterests.includes(ev.category);
    }
    return ev.is_featured || true;
  }).slice(0, 4);

  // Upcoming events
  const upcomingEvents = publicEvents.filter((ev) => {
    if (selectedCategory !== 'All' && ev.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (ev.event_name || ev.title || '').toLowerCase().includes(q);
      const matchCity = (ev.city || '').toLowerCase().includes(q);
      const matchVenue = (ev.venue || '').toLowerCase().includes(q);
      return matchName || matchCity || matchVenue;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <EventraLogo variant="with-tagline" size="md" />
            </Link>
            
            {/* Attendee Experience Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#6425E8]/10 text-[#6425E8] rounded-full text-[11px] font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>Attendee Experience</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Become a Host CTA */}
            {!isHost ? (
              <button
                type="button"
                onClick={() => setShowHostModal(true)}
                className="px-3.5 py-1.5 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Become a Host</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  switchView('host');
                  navigate('/dashboard');
                }}
                className="px-3.5 py-1.5 bg-[#111126] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[#9638F5]" />
                <span>Switch to Host Dashboard</span>
              </button>
            )}

            {/* User Avatar & Menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E9E8F0]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {(profile?.full_name || user?.email || 'A').charAt(0)}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
                title="Sign out"
                className="p-1.5 text-[#73738A] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#73738A] hover:text-[#111126] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E9E8F0] p-3 shadow-2xs">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'discover'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Discover Events</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('registrations')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'registrations'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-4 h-4" />
                  <span>My Registrations</span>
                </div>
                {registrations.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'registrations' ? 'bg-white/20 text-white' : 'bg-[#6425E8]/10 text-[#6425E8]'
                  }`}>
                    {registrations.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4" />
                  <span>Saved Events</span>
                </div>
                {savedEvents.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-[#6425E8]/10 text-[#6425E8]'
                  }`}>
                    {savedEvents.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Upcoming Events</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Account Settings</span>
              </button>
            </nav>
          </div>

          {/* Become a Host Card */}
          {!isHost && (
            <div className="bg-gradient-to-br from-[#4214B8] to-[#6425E8] rounded-2xl p-4 text-white shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold">Hosting an Event?</p>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Upgrade to an Event Host to publish events, generate participant flyers & track RSVPs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHostModal(true)}
                className="w-full py-2 bg-white hover:bg-[#F8F8FC] text-[#6425E8] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Become a Host
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border border-[#E9E8F0] rounded-2xl p-3 mb-4 shadow-sm space-y-1">
            <button
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'overview' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => { setActiveTab('discover'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'discover' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Discover Events</span>
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'registrations' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>My Registrations ({registrations.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('saved'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'saved' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Events ({savedEvents.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('upcoming'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'upcoming' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Upcoming Events</span>
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-[#6425E8] text-white' : 'text-[#555567]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Account Settings</span>
            </button>
          </div>
        )}

        {/* Content View */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Box */}
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8]">
                      Welcome Back
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6425E8]/10 text-[#6425E8]">
                      Attendee Portal
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#111126] tracking-tight">
                    Hello, {profile?.full_name || 'Attendee'}
                  </h1>
                  <p className="text-xs text-[#73738A]">
                    Track your registrations, saved favorites, and discover upcoming community events.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs transition cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Explore Events</span>
                  </button>
                </div>
              </div>

              {/* Statistics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-[#E9E8F0] p-5 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">
                      My Registrations
                    </span>
                    <p className="text-2xl font-extrabold text-[#111126]">
                      {registrations.length}
                    </p>
                    <span className="text-[11px] text-[#73738A]">Confirmed event passes</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E9E8F0] p-5 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">
                      Saved Events
                    </span>
                    <p className="text-2xl font-extrabold text-[#111126]">
                      {savedEvents.length}
                    </p>
                    <span className="text-[11px] text-[#73738A]">Bookmarked for later</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6425E8] flex items-center justify-center">
                    <Bookmark className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E9E8F0] p-5 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">
                      Selected Interests
                    </span>
                    <p className="text-2xl font-extrabold text-[#111126]">
                      {userInterests.length}
                    </p>
                    <span className="text-[11px] text-[#73738A]">Tailored topics</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Recommended Events Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111126]">Recommended For You</h3>
                    <p className="text-xs text-[#73738A]">Curated based on your interests and trending community gatherings.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="text-xs font-bold text-[#6425E8] hover:underline flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {recommendedEvents.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E9E8F0] p-8 text-center text-xs text-[#73738A]">
                    No events currently available in your area. Check back soon!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendedEvents.map((ev) => {
                      const isSaved = savedEvents.some((s) => s.id === ev.id);
                      return (
                        <div
                          key={ev.id}
                          className="bg-white rounded-2xl border border-[#E9E8F0] p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6425E8]/10 text-[#6425E8]">
                                {ev.category || 'General'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleSave(ev.id)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  isSaved
                                    ? 'bg-[#6425E8] text-white border-[#6425E8]'
                                    : 'border-[#E9E8F0] text-[#73738A] hover:bg-[#F8F8FC]'
                                }`}
                                title={isSaved ? 'Remove from saved' : 'Save event'}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <Link
                              to={`/events/${ev.slug || ev.id}`}
                              className="font-bold text-sm text-[#111126] hover:text-[#6425E8] transition line-clamp-1"
                            >
                              {ev.event_name || ev.title}
                            </Link>

                            <p className="text-xs text-[#555567] line-clamp-2 leading-relaxed">
                              {ev.description || 'Join us for an inspiring gathering and exceptional experience.'}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#F0F0F5] flex items-center justify-between text-[11px] text-[#73738A]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#6425E8]" />
                              <span>{ev.event_date || 'Upcoming'}</span>
                            </div>
                            <Link
                              to={`/events/${ev.slug || ev.id}`}
                              className="text-xs font-bold text-[#6425E8] hover:underline flex items-center gap-1"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Registrations Snippet */}
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111126]">My Registrations</h3>
                    <p className="text-xs text-[#73738A]">Your confirmed attendee passes and access references.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('registrations')}
                    className="text-xs font-bold text-[#6425E8] hover:underline"
                  >
                    View All ({registrations.length})
                  </button>
                </div>

                {registrations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#73738A] space-y-2 border border-dashed border-[#E9E8F0] rounded-xl">
                    <Ticket className="w-8 h-8 text-[#73738A] mx-auto opacity-40" />
                    <p className="font-bold text-[#111126]">No registered events yet</p>
                    <p>Discover exciting conferences, summits, and workshops to register.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('discover')}
                      className="mt-2 inline-flex px-3.5 py-1.5 bg-[#6425E8] text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Browse Events
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F0F5]">
                    {registrations.slice(0, 3).map(({ reg, event: ev }) => (
                      <div key={reg.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#6425E8]">
                              {reg.registration_reference}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              {reg.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-[#111126]">
                            {ev?.event_name || ev?.title || 'Registered Event'}
                          </p>
                          <p className="text-xs text-[#73738A]">
                            {ev?.venue || 'Venue to be confirmed'} • {ev?.event_date || 'Upcoming'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {ev && (
                            <Link
                              to={`/events/${ev.slug || ev.id}`}
                              className="px-3 py-1.5 border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-lg text-xs font-semibold text-[#111126] transition"
                            >
                              Event Info
                            </Link>
                          )}
                          {ev && (
                            <Link
                              to={`/e/${ev.slug || ev.id}`}
                              className="px-3 py-1.5 bg-[#6425E8]/10 hover:bg-[#6425E8]/20 text-[#6425E8] rounded-lg text-xs font-semibold transition"
                            >
                              Get Flyer
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Topics / Categories Selector */}
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111126]">Topics of Interest</h3>
                    <p className="text-xs text-[#73738A]">Select categories you care about to personalize your event recommendations.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORIES.map((cat) => {
                    const isSelected = userInterests.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleInterest(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#6425E8] text-white shadow-2xs'
                            : 'bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#555567] border border-[#E9E8F0]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DISCOVER EVENTS */}
          {activeTab === 'discover' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-[#111126]">Discover Events</h2>
                  <p className="text-xs text-[#73738A]">Explore upcoming faith, technology, business, and creative gatherings.</p>
                </div>

                {/* Search Bar & Category Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search events by title, venue, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8]"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Events Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((ev) => {
                  const isSaved = savedEvents.some((s) => s.id === ev.id);
                  return (
                    <div
                      key={ev.id}
                      className="bg-white rounded-2xl border border-[#E9E8F0] p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6425E8]/10 text-[#6425E8]">
                            {ev.category || 'General'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSave(ev.id)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isSaved ? 'bg-[#6425E8] text-white border-[#6425E8]' : 'border-[#E9E8F0] text-[#73738A] hover:bg-[#F8F8FC]'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <Link
                            to={`/events/${ev.slug || ev.id}`}
                            className="font-bold text-sm text-[#111126] hover:text-[#6425E8] transition line-clamp-1"
                          >
                            {ev.event_name || ev.title}
                          </Link>
                          <p className="text-xs text-[#73738A] mt-1 line-clamp-2">
                            {ev.description || 'Experience exceptional networking, insightful speakers and community.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F0F0F5] space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#73738A]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#6425E8]" />
                            <span>{ev.event_date || 'Upcoming'}</span>
                          </div>
                          <span>{ev.city || 'Online'}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            to={`/events/${ev.slug || ev.id}`}
                            className="flex-1 py-1.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl text-center transition"
                          >
                            View & Register
                          </Link>
                          <Link
                            to={`/e/${ev.slug || ev.id}`}
                            className="px-3 py-1.5 border border-[#E9E8F0] hover:bg-[#F8F8FC] text-xs font-semibold text-[#111126] rounded-xl transition"
                          >
                            Flyer
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: MY REGISTRATIONS */}
          {activeTab === 'registrations' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#111126]">My Registrations</h2>
                  <p className="text-xs text-[#73738A]">Confirmed tickets and event admissions associated with {user?.email}.</p>
                </div>
              </div>

              {registrations.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#73738A] space-y-3 border border-dashed border-[#E9E8F0] rounded-xl">
                  <Ticket className="w-10 h-10 text-[#73738A] mx-auto opacity-30" />
                  <p className="font-bold text-sm text-[#111126]">No registrations found</p>
                  <p>When you register for events on Eventra, your registration passes and codes appear here.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Discover Events to Attend
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F8FC] border-b border-[#E9E8F0] text-[#73738A] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Event</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Venue</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F5]">
                      {registrations.map(({ reg, event: ev }) => (
                        <tr key={reg.id} className="hover:bg-[#F8F8FC]/50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#6425E8]">
                            {reg.registration_reference}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#111126]">
                            {ev?.event_name || ev?.title || 'Registered Event'}
                          </td>
                          <td className="py-3.5 px-4 text-[#73738A]">
                            {ev?.event_date || 'Upcoming'}
                          </td>
                          <td className="py-3.5 px-4 text-[#73738A]">
                            {ev?.venue || 'Venue on record'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              {reg.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {ev && (
                              <Link
                                to={`/events/${ev.slug || ev.id}`}
                                className="px-2.5 py-1 text-xs font-semibold text-[#6425E8] hover:underline"
                              >
                                View
                              </Link>
                            )}
                            {ev && (
                              <Link
                                to={`/e/${ev.slug || ev.id}`}
                                className="px-2.5 py-1 bg-[#6425E8]/10 text-[#6425E8] rounded-lg text-xs font-semibold hover:bg-[#6425E8]/20 transition"
                              >
                                Personalize Flyer
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: SAVED EVENTS */}
          {activeTab === 'saved' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-[#111126]">Saved Events</h2>
                <p className="text-xs text-[#73738A]">Bookmarks and events you have saved for future reference.</p>
              </div>

              {savedEvents.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#73738A] space-y-3 border border-dashed border-[#E9E8F0] rounded-xl">
                  <Bookmark className="w-10 h-10 text-[#73738A] mx-auto opacity-30" />
                  <p className="font-bold text-sm text-[#111126]">No saved events yet</p>
                  <p>Bookmark events while exploring to keep track of interesting opportunities.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Browse Events
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-[#E9E8F0] flex flex-col justify-between bg-white hover:border-[#6425E8]/40 transition space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-full">
                            {ev.category || 'Event'}
                          </span>
                          <h4 className="font-bold text-sm text-[#111126] mt-2 line-clamp-1">{ev.event_name || ev.title}</h4>
                          <p className="text-xs text-[#73738A] mt-1 line-clamp-2">{ev.description || 'Details available on event page.'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSave(ev.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Remove from saved"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <div className="pt-3 border-t border-[#F0F0F5] flex items-center justify-between text-xs">
                        <span className="text-[#73738A]">{ev.event_date || 'Upcoming'}</span>
                        <Link
                          to={`/events/${ev.slug || ev.id}`}
                          className="font-bold text-[#6425E8] hover:underline"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: UPCOMING EVENTS */}
          {activeTab === 'upcoming' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-[#111126]">Upcoming Calendar</h2>
                <p className="text-xs text-[#73738A]">All scheduled community and registered events in chronological order.</p>
              </div>

              <div className="space-y-3">
                {publicEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-[#E9E8F0] hover:border-[#6425E8]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex flex-col items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#111126]">{ev.event_name || ev.title}</h4>
                        <p className="text-xs text-[#73738A]">
                          {ev.event_date || 'Date TBA'} • {ev.venue || 'Venue TBA'}, {ev.city || ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/events/${ev.slug || ev.id}`}
                        className="px-3 py-1.5 bg-[#6425E8] text-white rounded-xl text-xs font-semibold hover:bg-[#4214B8] transition"
                      >
                        Register
                      </Link>
                      <Link
                        to={`/e/${ev.slug || ev.id}`}
                        className="px-3 py-1.5 border border-[#E9E8F0] text-xs font-semibold text-[#111126] rounded-xl hover:bg-[#F8F8FC] transition"
                      >
                        Flyer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 shadow-2xs space-y-6 max-w-xl animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#111126]">Account Settings</h2>
                  <p className="text-xs text-[#73738A]">Manage your profile and account preferences.</p>
                </div>
                {savedSettingsNotice && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Saved!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:border-[#6425E8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#73738A] cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[#73738A] mt-1">Managed via your Eventra credentials.</p>
                </div>

                <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0] space-y-2">
                  <span className="text-xs font-bold text-[#111126]">Account Status</span>
                  <p className="text-xs text-[#73738A]">
                    You are currently using Eventra as an <strong>Attendee</strong>. You can activate Host features at any time.
                  </p>
                  {!isHost && (
                    <button
                      type="button"
                      onClick={() => setShowHostModal(true)}
                      className="mt-1 px-3 py-1.5 bg-[#6425E8] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Upgrade to Host
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#111126] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Save Profile
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Become a Host Modal */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#E9E8F0] p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#111126]">Become an Event Host</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHostModal(false)}
                className="text-[#73738A] hover:text-[#111126] text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#73738A] leading-relaxed">
              Activate Host mode on your existing account. You will unlock event creation, Eventra Create personalised flyers, digital VIP invitations, and registration management. All your saved events and attendee passes remain completely safe!
            </p>

            {upgradeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{upgradeError}</span>
              </div>
            )}

            <form onSubmit={handleActivateHost} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                  Organisation or Brand Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pilgrims Pentecostal Ministries or My Events"
                  value={orgBrandName}
                  onChange={(e) => setOrgBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:border-[#6425E8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="px-4 py-2 border border-[#E9E8F0] text-xs font-semibold rounded-xl text-[#73738A] hover:bg-[#F8F8FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upgradingHost}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{upgradingHost ? 'Activating...' : 'Activate Host Experience'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
