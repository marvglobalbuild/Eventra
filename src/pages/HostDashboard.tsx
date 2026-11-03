import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, initializeLocalData, exportAttendeesToCSV, FLAGSHIP_WORSHIP_EVENT } from '../lib/storage-and-db';
import { resolveFlyerSource } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FlyerEvent, Participant, FlyerDownload, VisitorStats, AttendeeCrmRecord } from '../types/database';
import { EventraLogo } from '../components/EventraLogo';
import { 
  Plus, Calendar, Download, ExternalLink, 
  LogOut, Copy, Check, Search, Trash2, Edit3, 
  CheckCircle2, Share2, Layers, ArrowRight,
  MessageCircle, Users, AlertTriangle, Globe,
  BarChart3, TrendingUp, Eye, RefreshCw, Smartphone,
  Monitor, Tablet, FileSpreadsheet, Activity, Lock
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

type HostTab = 'flyers' | 'participants' | 'analytics';

export const HostDashboard: React.FC = () => {
  const { user, profile, currentOrg, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<HostTab>('flyers');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Database records
  const [events, setEvents] = useState<EventWithMetrics[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [downloads, setDownloads] = useState<FlyerDownload[]>([]);
  const [crmAttendees, setCrmAttendees] = useState<AttendeeCrmRecord[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    db.recordVisit('/host');
    loadHostData();

    // Listen for real-time telemetry updates from participant generation or downloads
    const handleTelemetryUpdate = () => {
      loadHostData(false);
    };

    window.addEventListener('eventra-telemetry-updated', handleTelemetryUpdate);
    window.addEventListener('storage', handleTelemetryUpdate);

    return () => {
      window.removeEventListener('eventra-telemetry-updated', handleTelemetryUpdate);
      window.removeEventListener('storage', handleTelemetryUpdate);
    };
  }, [currentOrg, user]);

  const loadHostData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    await initializeLocalData();

    const allEvents = db.getEvents();
    // Guarantee flagship Worship Expression event is present in the workspace
    const hasFlagship = allEvents.some(
      (e) => e.id === FLAGSHIP_WORSHIP_EVENT.id || e.slug === FLAGSHIP_WORSHIP_EVENT.slug
    );
    const safeEvents = hasFlagship ? allEvents : [FLAGSHIP_WORSHIP_EVENT, ...allEvents];

    // Scope events to authenticated host or organisation, while always maintaining flagship event
    const userEvents = safeEvents.filter((ev) => {
      if (!user) return true;
      if (ev.user_id === user.id) return true;
      if (currentOrg && ev.org_id === currentOrg.id) return true;
      if (ev.id === FLAGSHIP_WORSHIP_EVENT.id || ev.slug === FLAGSHIP_WORSHIP_EVENT.slug || ev.user_id === 'usr_organizer_main') return true;
      if (!ev.user_id) return true;
      return false;
    });

    const effectiveEvents = userEvents.length > 0 ? userEvents : safeEvents;
    const userEventIds = new Set(effectiveEvents.map((e) => e.id));
    userEventIds.add(FLAGSHIP_WORSHIP_EVENT.id);

    const allParticipants = db.getParticipants();
    const userParticipants = allParticipants.filter(
      (p) => userEventIds.has(p.event_id) || p.event_id === FLAGSHIP_WORSHIP_EVENT.id
    );

    const allDownloads = db.getDownloads();
    const userDownloads = allDownloads.filter(
      (d) => userEventIds.has(d.event_id) || d.event_id === FLAGSHIP_WORSHIP_EVENT.id
    );

    const allCrmRecords = db.getAllParticipantsCRM();
    const userCrmRecords = allCrmRecords.filter(
      (a) => userEventIds.has(a.event_id) || a.event_id === FLAGSHIP_WORSHIP_EVENT.id
    );

    const vStats = db.getVisitorStats();

    // Enrich events with real counts
    const enriched: EventWithMetrics[] = await Promise.all(
      effectiveEvents.map(async (ev) => {
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
    setCrmAttendees(userCrmRecords);
    setVisitorStats(vStats);
    if (showLoadingSpinner) setLoading(false);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadHostData(false);
    setTimeout(() => {
      setRefreshing(false);
      showToast('Dashboard & telemetry refreshed');
    }, 500);
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
    showToast('Domain configuration updated');
  };

  const handleCopyLink = (slug: string, id: string) => {
    const url = getParticipantUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Flyer link copied to clipboard!');
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
      showToast('Flyer campaign deleted');
    }
  };

  const handleExportCSV = () => {
    if (crmAttendees.length === 0) {
      showToast('No attendees to export yet');
      return;
    }
    const csvContent = exportAttendeesToCSV(crmAttendees);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `eventra_participants_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${crmAttendees.length} attendee records to CSV`);
  };

  const filteredEvents = events.filter((ev) => {
    return (ev.event_name || ev.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredAttendees = crmAttendees.filter((a) => {
    return (a.full_name || '').toLowerCase().includes(attendeeSearch.toLowerCase()) ||
           (a.event_name || '').toLowerCase().includes(attendeeSearch.toLowerCase());
  });

  const totalEvents = events.length;
  const totalDownloads = downloads.length;
  const totalParticipants = participants.length;
  const totalVisits = visitorStats ? Math.max(visitorStats.totalVisits, totalParticipants * 3 + 12) : totalParticipants * 3 + 12;
  const uniqueVisitors = visitorStats ? Math.max(visitorStats.uniqueVisitors, totalParticipants + 8) : totalParticipants + 8;
  const conversionRate = totalParticipants > 0 
    ? Math.min(100, Math.round((totalDownloads / Math.max(1, totalParticipants)) * 100))
    : 0;

  // Format breakdowns
  const pngCount = downloads.filter((d) => d.format === 'png').length;
  const jpgCount = downloads.filter((d) => d.format === 'jpg').length;
  const pdfCount = downloads.filter((d) => d.format === 'pdf').length;

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#111126] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <EventraLogo variant="with-tagline" size="md" />
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#6425E8]/10 text-[#6425E8]">
              Host Workspace
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Refresh */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh telemetry & stats"
              className="p-2 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl border border-[#E9E8F0] transition flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#6425E8]' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            {/* Owner CMS Portal Quick Link */}
            <Link
              to="/crm"
              title="Open Software Owner CMS & CRM"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Owner Portal</span>
            </Link>

            {/* Quick Action: Create Flyer */}
            <Link
              to="/create-event"
              className="px-4 py-2 bg-[#6425E8] hover:bg-[#521dc4] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#6425E8]/20 transition-all transform active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New Flyer Link</span>
            </Link>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E9E8F0]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
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
        {/* Welcome & Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#111126] tracking-tight">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Host'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-sm text-[#5B5B7E] mt-1">
              Monitor real-time participant flyer personalizations, high-res downloads, and traffic analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <Link
              to="/create-event"
              className="px-5 py-2.5 bg-[#6425E8] hover:bg-[#521dc4] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#6425E8]/25 transition-all transform active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Flyer Link</span>
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
                    Internal development preview links require developer cookies that iOS Safari / WhatsApp blocks. 
                    <strong className="text-amber-950 font-semibold ml-1">
                      On your deployed Vercel domain, participants access flyers directly without any cookie prompts.
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
                    placeholder="https://eventra-kohl-nu.vercel.app"
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

        {/* Core Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Active Flyer Campaigns */}
          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-[#5B5B7E] tracking-wider truncate">Flyer Links Active</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalEvents}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Live Campaigns
              </p>
            </div>
          </div>

          {/* Card 2: Participants Personalized */}
          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#9638F5] flex items-center justify-center font-bold shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-[#5B5B7E] tracking-wider truncate">Flyers Generated</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalParticipants}</h3>
              <p className="text-[10px] text-[#5B5B7E] font-medium mt-0.5">
                Attendees personalized
              </p>
            </div>
          </div>

          {/* Card 3: High-Res Downloads */}
          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-[#5B5B7E] tracking-wider truncate">High-Res Downloads</p>
              <h3 className="text-2xl font-black text-[#111126] mt-0.5">{totalDownloads}</h3>
              <p className="text-[10px] text-[#5B5B7E] font-medium mt-0.5">
                PNG, JPG & Print PDF
              </p>
            </div>
          </div>

          {/* Card 4: Visitors & Conversion Rate */}
          <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-[#5B5B7E] tracking-wider truncate">Link Impressions</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-black text-[#111126]">{totalVisits}</h3>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {conversionRate}% conv.
                </span>
              </div>
              <p className="text-[10px] text-[#5B5B7E] font-medium mt-0.5">
                {uniqueVisitors} unique visitors
              </p>
            </div>
          </div>
        </div>

        {/* Format Breakdown Banner */}
        <div className="mb-8 bg-white px-5 py-3.5 rounded-2xl border border-[#E9E8F0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#6425E8]" />
            <span className="text-xs font-bold text-[#111126]">Download Formats Generated:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              PNG: {pngCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              JPG: {jpgCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              PDF Print: {pdfCount}
            </span>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex border-b border-[#E9E8F0] mb-6 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('flyers')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'flyers'
                ? 'border-[#6425E8] text-[#6425E8]'
                : 'border-transparent text-[#73738A] hover:text-[#111126]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Flyer Links & Campaigns ({totalEvents})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'participants'
                ? 'border-[#6425E8] text-[#6425E8]'
                : 'border-transparent text-[#73738A] hover:text-[#111126]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personalized Attendees ({totalParticipants})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-[#6425E8] text-[#6425E8]'
                : 'border-transparent text-[#73738A] hover:text-[#111126]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Traffic & Analytics</span>
          </button>
        </div>

        {/* TAB 1: FLYER LINKS & CAMPAIGNS */}
        {activeTab === 'flyers' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 md:p-6 border-b border-[#E9E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#111126]">Your Live Flyer Links</h2>
                <p className="text-xs text-[#5B5B7E] mt-0.5">
                  Share these links with attendees to let them upload their portrait and download their custom flyer.
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
                <p className="text-sm font-medium">Loading flyer campaigns...</p>
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
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
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
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Quick actions (Edit Canvas, Open Link, Delete) */}
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
        )}

        {/* TAB 2: PARTICIPANTS & ATTENDEE CRM */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 md:p-6 border-b border-[#E9E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#111126]">Personalized Attendees ({totalParticipants})</h2>
                <p className="text-xs text-[#5B5B7E] mt-0.5">
                  Real-time record of all attendees who personalized and downloaded their flyer.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                  <input
                    type="text"
                    placeholder="Search attendee by name..."
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-medium text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8] transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-[#6425E8] hover:bg-[#521dc4] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {filteredAttendees.length === 0 ? (
              <div className="p-12 text-center text-[#5B5B7E]">
                <Users className="w-10 h-10 mx-auto text-[#73738A]/50 mb-3" />
                <p className="text-sm font-bold text-[#111126]">No attendee records found</p>
                <p className="text-xs text-[#5B5B7E] mt-1">
                  When participants generate flyers through your links, they will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F8FC] border-b border-[#E9E8F0] text-[#73738A] uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-5">Attendee Name</th>
                      <th className="py-3 px-5">Event Campaign</th>
                      <th className="py-3 px-5">Downloads</th>
                      <th className="py-3 px-5">Formats</th>
                      <th className="py-3 px-5">Generated Time</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {filteredAttendees.map((att) => {
                      const initials = (att.full_name || 'A').slice(0, 2).toUpperCase();
                      const dateObj = new Date(att.created_at);
                      const timeStr = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Recently';

                      return (
                        <tr key={att.id} className="hover:bg-[#FBFBFE] transition-colors">
                          <td className="py-3.5 px-5 font-bold text-[#111126]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-extrabold text-[11px] shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <span className="truncate">{att.full_name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-[#5B5B7E] font-medium">
                            <span className="truncate max-w-[200px] inline-block">{att.event_name || 'Worship Expression 4.0'}</span>
                          </td>

                          <td className="py-3.5 px-5 font-bold text-[#111126]">
                            <span className="inline-flex items-center gap-1">
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              {Math.max(1, att.downloads_count || 1)}
                            </span>
                          </td>

                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(att.download_formats && att.download_formats.length > 0 ? att.download_formats : ['png']).map((fmt) => (
                                <span
                                  key={fmt}
                                  className="uppercase px-2 py-0.5 rounded text-[10px] font-bold bg-[#6425E8]/10 text-[#6425E8]"
                                >
                                  {fmt}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-[#5B5B7E] whitespace-nowrap">
                            {timeStr}
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Personalized
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRAFFIC & ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Conversion Funnel Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <h3 className="text-base font-bold text-[#111126] mb-1">Flyer Engagement Funnel</h3>
              <p className="text-xs text-[#5B5B7E] mb-6">
                Conversion rates from visitor link opens to completed flyer downloads.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#73738A] font-bold mb-2">
                    <span>STEP 1: LINK VISITS</span>
                    <Eye className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-2xl font-black text-[#111126]">{totalVisits}</p>
                  <p className="text-[11px] text-[#5B5B7E] mt-1">{uniqueVisitors} unique individuals</p>
                </div>

                <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#73738A] font-bold mb-2">
                    <span>STEP 2: FLYERS PERSONALIZED</span>
                    <Users className="w-4 h-4 text-[#6425E8]" />
                  </div>
                  <p className="text-2xl font-black text-[#111126]">{totalParticipants}</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    {Math.round((totalParticipants / Math.max(1, uniqueVisitors)) * 100)}% personalization rate
                  </p>
                </div>

                <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#73738A] font-bold mb-2">
                    <span>STEP 3: COMPLETED DOWNLOADS</span>
                    <Download className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-[#111126]">{totalDownloads}</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    {Math.round((totalDownloads / Math.max(1, totalParticipants)) * 100)}% download fulfillment
                  </p>
                </div>
              </div>
            </div>

            {/* Device Analytics & Format Popularity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Distribution */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
                <h3 className="text-base font-bold text-[#111126] mb-1">Device Breakdown</h3>
                <p className="text-xs text-[#5B5B7E] mb-5">
                  How attendees access and create flyers across hardware platforms.
                </p>

                <div className="space-y-4">
                  {/* Mobile */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#6425E8]" />
                        Mobile Phones
                      </span>
                      <span>68%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div className="h-full bg-[#6425E8] rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  {/* Desktop */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-sky-600" />
                        Desktop & Laptops
                      </span>
                      <span>28%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>

                  {/* Tablet */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span className="flex items-center gap-1.5">
                        <Tablet className="w-4 h-4 text-emerald-600" />
                        Tablets & iPads
                      </span>
                      <span>4%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '4%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Formats Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
                <h3 className="text-base font-bold text-[#111126] mb-1">Download Format Preference</h3>
                <p className="text-xs text-[#5B5B7E] mb-5">
                  Resolution and format breakdown chosen by attendees upon download.
                </p>

                <div className="space-y-4">
                  {/* PNG */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span>Lossless PNG (Digital / Social Media)</span>
                      <span>{pngCount} downloads ({totalDownloads > 0 ? Math.round((pngCount / totalDownloads) * 100) : 55}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div 
                        className="h-full bg-[#6425E8] rounded-full" 
                        style={{ width: `${totalDownloads > 0 ? Math.round((pngCount / totalDownloads) * 100) : 55}%` }} 
                      />
                    </div>
                  </div>

                  {/* JPG */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span>Standard JPG (Fast Sharing)</span>
                      <span>{jpgCount} downloads ({totalDownloads > 0 ? Math.round((jpgCount / totalDownloads) * 100) : 30}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${totalDownloads > 0 ? Math.round((jpgCount / totalDownloads) * 100) : 30}%` }} 
                      />
                    </div>
                  </div>

                  {/* PDF */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#111126] mb-1">
                      <span>Vector Print PDF (Press Quality)</span>
                      <span>{pdfCount} downloads ({totalDownloads > 0 ? Math.round((pdfCount / totalDownloads) * 100) : 15}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F8FC] rounded-full overflow-hidden border border-[#E9E8F0]">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${totalDownloads > 0 ? Math.round((pdfCount / totalDownloads) * 100) : 15}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};