import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { FlyerEvent } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { 
  Search, MapPin, Calendar, Clock, Sparkles, Filter, 
  ArrowRight, Bookmark, Globe, Users, ChevronRight, Tag
} from 'lucide-react';

const CATEGORIES = [
  'All',
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
];

export const DiscoverEvents: React.FC = () => {
  const { user } = useAuth();

  const [events, setEvents] = useState<FlyerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'physical' | 'online' | 'hybrid'>('all');
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      await initializeLocalData();
      const allPublic = db.getPublicEvents();
      setEvents(allPublic);

      if (user) {
        const saved = db.getSavedEvents(user.id);
        setSavedEventIds(new Set(saved.map((s) => s.event_id)));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Extract unique locations from actual events
  const countries = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.country && e.country !== 'Online') set.add(e.country);
    });
    return ['All Countries', ...Array.from(set)];
  }, [events]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (selectedCountry === 'All Countries' || e.country === selectedCountry) {
        if (e.city && e.city !== 'Online') set.add(e.city);
      }
    });
    return ['All Cities', ...Array.from(set)];
  }, [events, selectedCountry]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return db.getDiscoverEvents({
      search: searchQuery,
      category: selectedCategory,
      city: selectedCity,
      country: selectedCountry,
      eventType: selectedFormat,
    });
  }, [searchQuery, selectedCategory, selectedCity, selectedCountry, selectedFormat, events]);

  const handleToggleSave = (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please sign in or create an account to save events to your attendee portal.');
      return;
    }
    const isNowSaved = db.toggleSaveEvent(user.id, eventId);
    setSavedEventIds((prev) => {
      const next = new Set(prev);
      if (isNowSaved) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  };

  // Section collections
  const featuredEvents = useMemo(() => events.filter((e) => e.is_featured), [events]);
  const onlineEvents = useMemo(() => events.filter((e) => e.event_type === 'online' || e.event_type === 'hybrid'), [events]);

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-[#F8F8FC] border-b border-[#E9E8F0] pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#6425E8] bg-[#6425E8]/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Eventra Discover Marketplace</span>
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111126] tracking-tight leading-tight">
            Discover events worth experiencing.
          </h1>

          <p className="text-sm sm:text-base text-[#555567] max-w-2xl mx-auto">
            Find exciting events, connect with vibrant communities, and discover what’s happening around you and online.
          </p>

          {/* Search & Location Bar */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-[#E9E8F0] flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center px-3 gap-2">
                <Search className="w-4 h-4 text-[#73738A] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, categories or locations…"
                  className="w-full py-2 bg-transparent text-xs sm:text-sm font-semibold text-[#111126] placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              <div className="h-px sm:h-8 bg-[#E9E8F0] w-full sm:w-px my-auto" />

              {/* Location Selectors */}
              <div className="flex items-center gap-1.5 px-2">
                <MapPin className="w-4 h-4 text-[#6425E8] shrink-0" />
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedCity('All Cities');
                  }}
                  className="bg-transparent text-xs font-semibold text-[#111126] focus:outline-none cursor-pointer py-2"
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#111126] focus:outline-none cursor-pointer py-2 max-w-[120px]"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Format Filter */}
              <select
                value={selectedFormat}
                onChange={(e: any) => setSelectedFormat(e.target.value)}
                className="bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#111126] focus:outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="physical">In-Person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Category Navigation Pills */}
          <div className="pt-4 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[#6425E8] text-white shadow-2xs'
                    : 'bg-white text-[#555567] border border-[#E9E8F0] hover:border-[#6425E8] hover:text-[#111126]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-12">
        {/* If Active Filter Applied: show Filter Results */}
        {(searchQuery || selectedCategory !== 'All' || selectedCountry !== 'All Countries' || selectedCity !== 'All Cities' || selectedFormat !== 'all') ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#111126]">
                  Search & Filter Results ({filteredEvents.length})
                </h2>
                <p className="text-xs text-[#73738A]">
                  Matching your criteria across active public events
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCountry('All Countries');
                  setSelectedCity('All Cities');
                  setSelectedFormat('all');
                }}
                className="text-xs font-semibold text-[#6425E8] hover:underline"
              >
                Reset filters
              </button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E9E8F0] p-12 text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#111126]">No events found</h3>
                <p className="text-xs text-[#73738A]">
                  Try adjusting your search terms, removing filters, or browsing other categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isSaved={savedEventIds.has(ev.id)}
                    onToggleSave={(e) => handleToggleSave(ev.id, e)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Default Discovery Feed */
          <>
            {/* Featured Events */}
            {featuredEvents.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#111126] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6425E8]" />
                      <span>Featured Events</span>
                    </h2>
                    <p className="text-xs text-[#73738A]">Curated standout experiences you shouldn’t miss</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      isSaved={savedEventIds.has(ev.id)}
                      onToggleSave={(e) => handleToggleSave(ev.id, e)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming & All Public Events */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111126]">
                    Upcoming Events ({events.length})
                  </h2>
                  <p className="text-xs text-[#73738A]">Explore upcoming gatherings, summits, and experiences</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isSaved={savedEventIds.has(ev.id)}
                    onToggleSave={(e) => handleToggleSave(ev.id, e)}
                  />
                ))}
              </div>
            </section>

            {/* Online Events Showcase */}
            {onlineEvents.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#111126] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#6425E8]" />
                      <span>Online & Virtual Masterclasses</span>
                    </h2>
                    <p className="text-xs text-[#73738A]">Join from anywhere in the world</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {onlineEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      isSaved={savedEventIds.has(ev.id)}
                      onToggleSave={(e) => handleToggleSave(ev.id, e)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Reusable Professional Event Card Component
interface EventCardProps {
  event: FlyerEvent;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isSaved, onToggleSave }) => {
  const cover = event.cover_image_url || event.original_flyer_path || '/assets/aistudio/IMG_2529_74b7441a.jpeg';

  return (
    <div className="bg-white rounded-2xl border border-[#E9E8F0] overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col group relative">
      {/* Cover Image Container */}
      <Link to={`/events/${event.slug || event.id}`} className="block relative aspect-16/10 overflow-hidden bg-slate-100">
        <img
          src={cover}
          alt={event.title || event.event_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Category Badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
          {event.category || 'Event'}
        </span>

        {/* Format Pill */}
        <span className="absolute top-3 right-12 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-white/90 text-[#111126] backdrop-blur-xs">
          {event.event_type || 'In-Person'}
        </span>

        {/* Bookmark Action */}
        <button
          type="button"
          onClick={onToggleSave}
          title={isSaved ? 'Remove bookmark' : 'Save event'}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-white/90 hover:bg-white text-[#111126] shadow-2xs transition"
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#6425E8] text-[#6425E8]' : 'text-[#73738A]'}`} />
        </button>
      </Link>

      {/* Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6425E8]">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{event.event_date || 'Date TBA'}</span>
            {event.start_time && (
              <>
                <span className="text-gray-300">·</span>
                <Clock className="w-3.5 h-3.5 shrink-0 ml-1" />
                <span>{event.start_time}</span>
              </>
            )}
          </div>

          <Link to={`/events/${event.slug || event.id}`} className="block group-hover:text-[#6425E8] transition">
            <h3 className="text-sm sm:text-base font-bold text-[#111126] line-clamp-2 leading-snug">
              {event.title || event.event_name}
            </h3>
          </Link>

          <p className="text-xs text-[#73738A] line-clamp-2 leading-relaxed">
            {event.description || 'Join us for this premier event. Click to view full details, agenda, and reserve your place.'}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-[#F0F0F5] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-[#73738A] truncate max-w-[65%]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#73738A]" />
            <span className="truncate">
              {event.event_type === 'online' ? 'Online' : `${event.city || 'Venue'}, ${event.country || ''}`}
            </span>
          </div>

          <Link
            to={`/events/${event.slug || event.id}`}
            className="inline-flex items-center gap-1 font-bold text-[#6425E8] hover:text-[#4214B8] transition"
          >
            <span>View Event</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
