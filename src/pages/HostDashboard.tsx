import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { resolveFlyerSource } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FlyerEvent, Participant, FlyerDownload } from '../types/database';
import { EventraLogo } from '../components/EventraLogo';
import { 
  Plus, Calendar, Download, ExternalLink, 
  LogOut, Copy, Check, Search, Trash2, Edit3, 
  Sparkles, CheckCircle2, Share2, Layers, ArrowRight,
  MessageCircle, Users, AlertTriangle, Globe
} from 'lucide-react';
import { 
  getParticipantFlyerUrl, 
  isCloudRunPreview, 
  getCustomPublicDomain, 
  setCustomPublicDomain 
} from '../lib/domain-config';

interface EventWithMetrics extends FlyerEvent {
  participantCount: number;
  downloadCount: number;
  resolvedFlyerUrl?: string;
}

export const HostDashboard: React.FC = () => {
  const { user, profile, currentOrg, signOut } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Database records
  const [events, setEvents] = useState<EventWithMetrics[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [downloads, setDownloads] = useState<FlyerDownload[]>([]);

  useEffect(() => {
    db.recordVisit('/host');
    loadHostData();
  }, [currentOrg, user]);

  const loadHostData = async () => {
    setLoading(true);
    await initializeLocalData();

    if (!user) {
      setLoading(false);
      return;
    }

    const allEvents = db.getEvents();
    // Scope events to authenticated host or organisation
    const userEvents = allEvents.filter((ev) => {
      return ev.user_id === user.id || (currentOrg && ev.org_id === currentOrg.id);
    });
    const userEventIds = new Set(userEvents.map((e) => e.id));

    const allParticipants = db.getParticipants();
    const userParticipants = allParticipants.filter((p) => userEventIds.has(p.event_id));

    const allDownloads = db.getDownloads();
    const userDownloads = allDownloads.filter((d) => userEventIds.has(d.event_id));

    // Enrich events with real counts
    const enriched: EventWithMetrics[] = await Promise.all(
      userEvents.map(async (ev) => {
        const pCount = userParticipants.filter((p) => p.event_id === ev.id).length;
        const dCount = userDownloads.filter((d) => d.event_id === ev.id).length;
        const resolved = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);

        return {
          ...ev,
          participantCount: pCount,
          downloadCount: dCount,
          resolvedFlyerUrl: resolved,
        };
      })
    );

    setEvents(enriched);
    setParticipants(userParticipants);
    setDownloads(userDownloads);
    setLoading(false);
  };

  const [customDomain, setCustomDomain] = useState<string>(getCustomPublicDomain());
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const [domainInput, setDomainInput] = useState(getCustomPublicDomain());

  const getParticipantUrl = (slug: string) => {
    return getParticipantFlyerUrl(slug);
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomPublicDomain(domainInput);
    setCustomDomain(getCustomPublicDomain());
    setShowDomainConfig(false);
  };

  const handleCopyLink = (slug: string, id: string) => {
    const url = getParticipantUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (ev: EventWithMetrics) => {
    const url = getParticipantUrl(ev.slug);
    const message = encodeURIComponent(
      `🎉 Upload your photo and get your official personalized flyer for *${ev.event_name || ev.title}* here: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      db.deleteEvent(eventId);
      loadHostData();
    }
  };

  const filteredEvents = events.filter((ev) => {
    return (ev.event_name || ev.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalEvents = events.length;
  const totalDownloads = downloads.length;
  const totalParticipants = participants.length;

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <EventraLogo variant="with-tagline" size="md" />
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#6425E8]/10 text-[#6425E8]">
              Host Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action: Create Flyer */}
            <Link
              to="/create-event"
              className="px-4 py-2 bg-[#6425E8] hover:bg-[#521dc4] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#6425E8]/20 transition-all transform active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Flyer Link</span>
            </Link>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#E9E8F0]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {(profile?.full_name || user?.email || 'H').charAt(0)}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
                title="Sign out"
                className="p-2 text-[#73738A] hover:text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Welcome & Primary Metrics */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#111126] tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Host'}
            </h1>
            <p className="text-sm text-[#5B5B7E] mt-1">
              Create participation flyer links and share them with your attendees to generate their flyers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/create-event"
              className="px-5 py-3 bg-[#6425E8] hover:bg-[#521dc4] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-[#6425E8]/25 transition-all transform active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>New Flyer Link</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Cloud Run Preview Notice & Production Domain Config */}
        {isCloudRunPreview() && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    Testing on WhatsApp or Mobile Safari?
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-md">
                      Dev Preview Active
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Internal development preview links (<code className="text-[11px] bg-amber-100/80 px-1 py-0.2 rounded font-mono">.run.app</code>) require developer cookies that iOS Safari / WhatsApp blocks. 
                    <strong className="text-amber-950 font-semibold ml-1">
                      Once deployed to Vercel (or your custom domain), participants access flyers directly without any cookie prompts.
                    </strong>
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {!showDomainConfig ? (
                  <button
                    type="button"
                    onClick={() => setShowDomainConfig(true)}
                    className="px-3.5 py-1.5 bg-white border border-amber-300 hover:border-amber-400 text-amber-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#6425E8]" />
                    <span>{customDomain ? `Domain: ${customDomain}` : 'Set Vercel Domain'}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {showDomainConfig && (
              <form onSubmit={handleSaveDomain} className="mt-3 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Your Deployed Vercel / Production Domain
                  </label>
                  <input
                    type="text"
                    placeholder="https://eventra.vercel.app"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl outline-none font-mono text-[#111126] focus:ring-2 focus:ring-[#6425E8]"
                  />
                </div>
                <div className="flex items-center gap-1.5 self-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#6425E8] hover:bg-[#521dc4] text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    Save Domain
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDomainInput('');
                      setCustomPublicDomain('');
                      setCustomDomain('');
                      setShowDomainConfig(false);
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl hover:bg-amber-100 transition"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDomainConfig(false)}
                    className="px-2.5 py-1.5 text-xs text-amber-800 hover:text-black transition"
                  >
                    Close
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#5B5B7E] tracking-wider">Flyer Links Created</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalEvents}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#9638F5] flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#5B5B7E] tracking-wider">Participants Personalized</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalParticipants}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#5B5B7E] tracking-wider">High-Res Downloads</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalDownloads}</h3>
            </div>
          </div>
        </div>

        {/* Flyer Campaigns Section */}
        <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-[#E9E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111126]">Your Flyer Links</h2>
              <p className="text-xs text-[#5B5B7E] mt-0.5">
                Send these links to participants so they can upload their photo and download their personalized flyer.
              </p>
            </div>

            {/* Search */}
            {events.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                <input
                  type="text"
                  placeholder="Search flyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-medium text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8] transition-all"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#5B5B7E] flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-[#6425E8] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Loading your flyers...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 md:p-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#111126]">
                {searchQuery ? 'No flyers match your search' : 'No flyer links yet'}
              </h3>
              <p className="text-xs text-[#5B5B7E] mt-1.5 leading-relaxed">
                {searchQuery
                  ? 'Try searching for a different keyword or clear the search field.'
                  : 'Upload your flyer graphic and set where participant photos will appear. It takes less than 30 seconds!'}
              </p>
              {!searchQuery && (
                <Link
                  to="/create-event"
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#6425E8] hover:bg-[#521dc4] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Flyer Link</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E9E8F0]">
              {filteredEvents.map((ev) => {
                const participantUrl = getParticipantUrl(ev.slug);
                const isCopied = copiedId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className="p-5 md:p-6 hover:bg-[#FBFBFE] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Left: Flyer thumbnail + info */}
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden bg-[#111126]/5 border border-[#E9E8F0] shrink-0 shadow-sm flex items-center justify-center">
                        {ev.resolvedFlyerUrl ? (
                          <img
                            src={ev.resolvedFlyerUrl}
                            alt={ev.event_name || ev.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Layers className="w-8 h-8 text-[#73738A]" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#111126] truncate">
                            {ev.event_name || ev.title}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Live Link
                          </span>
                        </div>

                        <p className="text-xs text-[#5B5B7E]">
                          Created on {new Date(ev.created_at).toLocaleDateString()}
                        </p>

                        {/* Real-time participant flyer stats */}
                        <div className="flex items-center gap-4 pt-1">
                          <span className="text-xs text-[#5B5B7E] flex items-center gap-1 font-medium">
                            <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                            <strong className="text-[#111126]">{ev.participantCount}</strong> flyers personalized
                          </span>
                          <span className="text-xs text-[#5B5B7E] flex items-center gap-1 font-medium">
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <strong className="text-[#111126]">{ev.downloadCount}</strong> downloads
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Participant Sharing Link with 1-click Copy */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:max-w-md w-full">
                      <div className="flex items-center flex-1 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl px-3 py-2 text-xs font-mono text-[#5B5B7E] overflow-hidden">
                        <span className="truncate">{participantUrl}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(ev.slug, ev.id)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#6425E8] hover:bg-[#521dc4] text-white'
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(ev)}
                          title="Share to WhatsApp"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Right: Quick actions (Edit Coordinates, Open Link, Delete) */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E9E8F0]/60 w-full lg:w-auto justify-end">
                      <Link
                        to={`/editor/${ev.id}`}
                        className="px-3 py-1.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span>Edit Canvas</span>
                      </Link>

                      <a
                        href={participantUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#5B5B7E]" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.event_name || ev.title || 'this flyer')}
                        title="Delete flyer link"
                        className="p-2 text-[#73738A] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
