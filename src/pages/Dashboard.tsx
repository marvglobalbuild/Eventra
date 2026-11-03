import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { resolveFlyerSource } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { createSampleFlyerDataUrl } from '../lib/sample-flyers';
import { storeFileInIDB } from '../lib/storage-and-db';
import { useAuth } from '../context/AuthContext';
import { FlyerEvent, OrganisationMember, Participant, FlyerDownload } from '../types/database';
import { SupabaseModal } from '../components/SupabaseModal';
import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { 
  Plus, Calendar, Users, Download, ExternalLink, Settings, 
  LogOut, Copy, Check, Search, Trash2, Edit3, 
  Layers, BarChart3, Building2, UserPlus,
  Compass, LayoutGrid, List, CheckCircle2, ChevronRight, Menu, X,
  Share2, Shield, RefreshCw, Clock, Globe, ArrowUpRight
} from 'lucide-react';

interface EventWithMetrics extends FlyerEvent {
  participantCount: number;
  downloadCount: number;
  resolvedFlyerUrl?: string;
}

type DashboardTab = 'overview' | 'events' | 'participants' | 'analytics' | 'team' | 'settings';
type ViewMode = 'grid' | 'table';
type StatusFilter = 'all' | 'published' | 'draft';

export const Dashboard: React.FC = () => {
  const { user, profile, currentOrg, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [events, setEvents] = useState<EventWithMetrics[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [downloads, setDownloads] = useState<FlyerDownload[]>([]);
  const [teamMembers, setTeamMembers] = useState<OrganisationMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  // New member modal form state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'event_manager' | 'member'>('event_manager');

  // Org settings form state
  const [orgName, setOrgName] = useState(currentOrg?.name || 'My Events Workspace');
  const [orgSavedNotice, setOrgSavedNotice] = useState(false);

  useEffect(() => {
    // Record workspace visit telemetry
    db.recordVisit('/dashboard');
    // Purge any legacy dummy mock data automatically on first load
    db.purgeDummyData();
    loadDashboardData();
  }, [currentOrg, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const allEvents = db.getEvents();
    // Strictly scope events to the authenticated user or their active organisation
    const userEvents = allEvents.filter((ev) => {
      if (!user) return false;
      return ev.user_id === user.id || (currentOrg && ev.org_id === currentOrg.id);
    });

    const allParticipants = db.getParticipants();
    const userParticipants = allParticipants.filter((p) =>
      userEvents.some((e) => e.id === p.event_id)
    );

    const allDownloads = db.getDownloads();
    const userDownloads = allDownloads.filter((d) =>
      userEvents.some((e) => e.id === d.event_id)
    );

    const members = db.getOrgMembers(currentOrg?.id);

    const enriched = await Promise.all(
      userEvents.map(async (ev) => {
        const pCount = userParticipants.filter((p) => p.event_id === ev.id).length;
        const dCount = userDownloads.filter((d) => d.event_id === ev.id).length;
        const resolvedUrl = await resolveFlyerSource(ev.original_flyer_path, ev.original_flyer_data_url);

        return {
          ...ev,
          participantCount: pCount,
          downloadCount: dCount,
          resolvedFlyerUrl: resolvedUrl,
        };
      })
    );

    setEvents(enriched);
    setParticipants(userParticipants);
    setDownloads(userDownloads);
    setTeamMembers(members);
    setLoading(false);
  };

  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'published').length;
  const draftEvents = events.filter((e) => e.status === 'draft').length;
  const totalParticipants = participants.length;
  const totalDownloads = downloads.length;
  const conversionRate = totalParticipants > 0 ? Math.round((totalDownloads / totalParticipants) * 100) : 100;

  const filteredEvents = events.filter((ev) => {
    const matchesSearch = ev.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ev.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && ev.status === statusFilter;
  });

  const handleCopyLink = (slug: string, id: string) => {
    const origin = window.location.origin;
    const url = `${origin}/e/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    try {
      confetti({
        particleCount: 30,
        spread: 55,
        origin: { y: 0.65 },
        colors: ['#6425E8', '#10B981', '#38BDF8'],
      });
    } catch {}
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = (ev: EventWithMetrics) => {
    const nextStatus = ev.status === 'published' ? 'draft' : 'published';
    db.saveEvent({ ...ev, status: nextStatus, updated_at: new Date().toISOString() });
    if (nextStatus === 'published') {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#6425E8', '#F59E0B'],
        });
      } catch {}
    }
    loadDashboardData();
  };

  const handleQuickStartSampleEvent = async () => {
    setLoading(true);
    try {
      const flyerDataUrl = createSampleFlyerDataUrl('tech');
      const evId = `ev_${Date.now()}`;
      const slug = `next-horizon-2026-${Math.random().toString(36).substring(2, 6)}`;
      const storageKey = `flyers/${evId}.png`;
      await storeFileInIDB(storageKey, flyerDataUrl);

      db.saveEvent({
        id: evId,
        user_id: user?.id || 'usr_local',
        org_id: currentOrg?.id || 'org_local',
        event_name: 'Next Horizon Tech Summit 2026',
        slug: slug,
        original_flyer_path: storageKey,
        original_flyer_data_url: '',
        category: 'Technology & Business',
        venue: 'Moscone Center, San Francisco & Virtual',
        event_date: 'November 14-16, 2026',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      db.saveTemplate({
        id: `tmpl_${evId}`,
        event_id: evId,
        photo_x: 0.35,
        photo_y: 0.28,
        photo_width: 0.30,
        photo_height: 0.30,
        photo_shape: 'circle',
        name_x: 0.15,
        name_y: 0.60,
        name_width: 0.70,
        name_height: 0.08,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 44,
        font_weight: '700',
        text_color: '#FFFFFF',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      db.addParticipant({
        id: `part_${Date.now()}_1`,
        event_id: evId,
        full_name: 'Elena Rostova',
        photo_path: null,
        created_at: new Date().toISOString(),
      });
      db.addParticipant({
        id: `part_${Date.now()}_2`,
        event_id: evId,
        full_name: 'Marcus Chen',
        photo_path: null,
        created_at: new Date().toISOString(),
      });

      db.recordDownload({
        id: `dl_${Date.now()}_1`,
        event_id: evId,
        participant_id: `part_${Date.now()}_1`,
        format: 'png',
        downloaded_at: new Date().toISOString(),
      });

      try {
        confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#6425E8', '#9638F5', '#10B981', '#38BDF8'],
        });
      } catch {}
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to create sample event:', err);
      setLoading(false);
    }
  };

  const handleDeleteEvent = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the event "${name}"? This cannot be undone.`)) {
      db.deleteEvent(id);
      loadDashboardData();
    }
  };

  const handlePurgeAllDummyData = () => {
    const result = db.purgeDummyData();
    setPurgeNotice(`Workspace cleaned: ${result.removedEvents} test events and ${result.removedParticipants} test participants removed.`);
    loadDashboardData();
    setTimeout(() => setPurgeNotice(null), 4000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    db.addOrgMember({
      org_id: currentOrg?.id || 'org_live_01',
      user_id: `usr_${Date.now()}`,
      full_name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setShowAddMemberModal(false);
    loadDashboardData();
  };

  const handleSaveOrgSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    db.saveOrganisation({ ...currentOrg, name: orgName });
    setOrgSavedNotice(true);
    setTimeout(() => setOrgSavedNotice(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* SaaS Top Header */}
      <header className="h-16 bg-white border-b border-[#E9E8F0] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between animate-fade-in-down">
        <div className="flex items-center space-x-3 sm:space-x-6">
          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-lg transition"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo & Wordmark */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 transition"
          >
            <EventraLogoSymbol size={28} />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-sm text-[#111126]">EVENTRA</span>
              <span className="text-[9px] uppercase tracking-wider text-[#73738A] font-medium hidden sm:inline">Events. Elevated.</span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#E9E8F0] hidden sm:block" />

          {/* Workspace Pill & System Status */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#111126] truncate max-w-[180px]">
              {currentOrg?.name || 'Workspace'}
            </span>
            <span className="text-[#73738A] text-xs">·</span>
            <div className="flex items-center space-x-1.5 text-[11px] text-[#73738A] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live System</span>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'events'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Campaigns ({totalEvents})
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'participants'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Attendees ({totalParticipants})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'analytics'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'team'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'settings'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <button
            onClick={() => navigate('/create-event')}
            className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Event</span>
            <span className="sm:hidden">New</span>
          </button>

          {/* User Profile Avatar & Sign Out */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#E9E8F0]">
            <div 
              title={profile?.email || 'User'}
              className="w-8 h-8 rounded-full bg-[#6425E8]/10 text-[#6425E8] border border-[#6425E8]/20 flex items-center justify-center font-bold text-xs"
            >
              {(profile?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-[#73738A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#111126]/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col justify-between">
            <div>
              <div className="h-16 px-6 flex items-center justify-between border-b border-[#E9E8F0]">
                <div className="flex items-center space-x-2.5">
                  <EventraLogoSymbol size={26} />
                  <span className="font-extrabold text-sm text-[#111126]">EVENTRA</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#73738A] hover:text-[#111126] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-[#E9E8F0] bg-[#F8F8FC]">
                <p className="text-xs font-bold text-[#111126] truncate">{currentOrg?.name || 'Workspace'}</p>
                <p className="text-[10px] text-[#73738A] truncate">{profile?.email || 'User'}</p>
              </div>

              <div className="p-4 space-y-1">
                <button
                  onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'overview' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'events' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Campaigns ({totalEvents})</span>
                </button>
                <button
                  onClick={() => { setActiveTab('participants'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'participants' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Attendees ({totalParticipants})</span>
                </button>
                <button
                  onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'analytics' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => { setActiveTab('team'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'team' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Team</span>
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl ${
                    activeTab === 'settings' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-[#E9E8F0]">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
        {/* Purge Notification Banner if triggered */}
        {purgeNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{purgeNotice}</span>
            </div>
            <button onClick={() => setPurgeNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111126]">
                  Control Center
                </h1>
                <p className="text-sm text-[#525266] mt-1">
                  Manage flyer campaigns, monitor participant registrations, and distribute live generation links.
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleQuickStartSampleEvent}
                  className="interactive-btn px-3.5 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:border-[#6425E8]/40 text-sm font-semibold text-[#6425E8] rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                  title="Create a live sample campaign with 1 click"
                >
                  <Layers className="w-3.5 h-3.5 text-[#6425E8]" />
                  <span>Sample Event</span>
                </button>
                <button
                  onClick={handlePurgeAllDummyData}
                  title="Purge legacy dummy mock data"
                  className="px-3.5 py-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-sm font-semibold text-[#525266] hover:text-[#111126] rounded-xl transition flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Clean State</span>
                </button>
                <button
                  onClick={() => navigate('/create-event')}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Flyer Campaign</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Cards (Zero-pill discipline, unboxed, subtle separators) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('events')}
                className="interactive-card bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs hover:border-[#6425E8]/40 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#525266] uppercase tracking-wider block group-hover:text-[#6425E8] transition-colors">
                    Campaigns
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#73738A] group-hover:text-[#6425E8] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {totalEvents}
                  </span>
                  <span className="text-sm text-[#525266]">total events</span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#E9E8F0]/70 flex items-center text-xs text-[#525266]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  <span>{publishedEvents} published live</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('participants')}
                className="interactive-card bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs hover:border-[#6425E8]/40 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#525266] uppercase tracking-wider block group-hover:text-[#6425E8] transition-colors">
                    Flyers Generated
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#73738A] group-hover:text-[#6425E8] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-extrabold text-[#6425E8] font-mono tabular-nums">
                    {totalParticipants}
                  </span>
                  <span className="text-sm text-[#525266]">participants</span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#E9E8F0]/70 flex items-center text-xs text-[#525266]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
                  <span>Personalized attendee posters</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('analytics')}
                className="interactive-card bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#525266] uppercase tracking-wider block group-hover:text-emerald-600 transition-colors">
                    Total Downloads
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#73738A] group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-600 font-mono tabular-nums">
                    {totalDownloads}
                  </span>
                  <span className="text-sm text-[#525266]">files exported</span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#E9E8F0]/70 flex items-center text-xs text-[#525266]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  <span>PNG · JPG · PDF exports</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('analytics')}
                className="interactive-card bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs hover:border-[#6425E8]/40 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#525266] uppercase tracking-wider block group-hover:text-[#6425E8] transition-colors">
                    Conversion Rate
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#73738A] group-hover:text-[#6425E8] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {conversionRate}%
                  </span>
                  <span className="text-sm text-[#525266]">download efficiency</span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#E9E8F0]/70 flex items-center text-xs text-[#525266]">
                  <span className="text-emerald-600 font-semibold">Self-service delivery</span>
                </div>
              </div>
            </div>

            {/* Active Campaigns Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#111126]">Flyer Campaigns</h2>
                  <p className="text-sm text-[#525266] mt-0.5">Active self-service flyer portals created in your workspace.</p>
                </div>
                {totalEvents > 0 && (
                  <button
                    onClick={() => setActiveTab('events')}
                    className="text-xs font-semibold text-[#6425E8] hover:text-[#501bc5] flex items-center space-x-1"
                  >
                    <span>View all ({totalEvents})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {totalEvents === 0 ? (
                /* High-fidelity Empty State for brand new or cleaned workspaces */
                <div className="bg-white border border-[#E9E8F0] rounded-2xl p-10 sm:p-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-[#111126]">No event campaigns yet</h3>
                  <p className="text-sm text-[#525266] max-w-md mx-auto mt-2 leading-relaxed">
                    Your platform is live and clean. Upload your original event poster design, place the designated circular or rectangular photo box and name frame, and share your unique participant link.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => navigate('/create-event')}
                      className="interactive-btn w-full sm:w-auto px-5 py-2.5 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Your Event Flyer</span>
                    </button>
                    <button
                      onClick={handleQuickStartSampleEvent}
                      className="interactive-btn w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#F8F8FC] border border-[#CBD5E1] text-[#111126] text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 group"
                    >
                      <Layers className="w-4 h-4 text-[#6425E8]" />
                      <span>Load Sample Campaign</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {events.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-xs hover:border-[#6425E8]/40 transition group flex flex-col"
                    >
                      {/* Flyer Thumbnail */}
                      <div className="h-48 bg-[#F8F8FC] relative overflow-hidden flex items-center justify-center">
                        {ev.resolvedFlyerUrl ? (
                          <img
                            src={ev.resolvedFlyerUrl}
                            alt={ev.event_name}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[#73738A]">
                            <Calendar className="w-8 h-8 opacity-40 mb-1" />
                            <span className="text-[11px]">Flyer artwork</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(ev);
                            }}
                            title="Click to toggle status (Published / Draft)"
                            className="text-[11px] font-semibold text-[#111126] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1.5 hover:ring-2 hover:ring-[#6425E8]/30 transition active:scale-95 cursor-pointer"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className="capitalize">{ev.status}</span>
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-[#111126] line-clamp-1">{ev.event_name}</h3>
                          <p className="text-xs text-[#73738A] mt-1">
                            {ev.venue ? `${ev.venue} · ` : ''}{new Date(ev.created_at).toLocaleDateString()}
                          </p>

                          {/* Metrics row */}
                          <div className="mt-3.5 pt-3 border-t border-[#E9E8F0] flex items-center justify-between text-xs text-[#73738A]">
                            <span className="flex items-center space-x-1.5">
                              <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                              <strong className="text-[#111126] font-mono">{ev.participantCount}</strong>
                              <span>attendees</span>
                            </span>
                            <span className="flex items-center space-x-1.5">
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <strong className="text-[#111126] font-mono">{ev.downloadCount}</strong>
                              <span>downloads</span>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-[#E9E8F0] flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/editor/${ev.id}`)}
                            className="flex-1 py-2 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#111126] text-sm font-semibold rounded-xl border border-[#E9E8F0] transition flex items-center justify-center space-x-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#6425E8]" />
                            <span>Edit Frames</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(ev.slug, ev.id)}
                            title="Copy participant link"
                            className="p-2 bg-white hover:bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#111126] rounded-xl transition"
                          >
                            {copiedId === ev.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <a
                            href={`/e/${ev.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open participant link"
                            className="p-2 bg-white hover:bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#6425E8] rounded-xl transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Participant Feed */}
            <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111126]">Live Attendee Activity</h3>
                  <p className="text-sm text-[#525266] mt-0.5">Participants who have generated and downloaded personalized posters.</p>
                </div>
                {participants.length > 0 && (
                  <button
                    onClick={() => setActiveTab('participants')}
                    className="text-xs font-semibold text-[#6425E8] hover:underline"
                  >
                    View all attendees
                  </button>
                )}
              </div>

              {participants.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#E9E8F0] rounded-xl bg-[#F8F8FC]/50">
                  <Users className="w-8 h-8 mx-auto text-[#73738A]/40 mb-2" />
                  <p className="text-xs font-medium text-[#111126]">Awaiting first attendee</p>
                  <p className="text-[11px] text-[#73738A] max-w-sm mx-auto mt-1">
                    When people open your event link, input their names, and upload their photos, their generated flyers will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E9E8F0]">
                  {participants.slice(0, 5).map((part) => {
                    const event = events.find((e) => e.id === part.event_id);
                    return (
                      <div key={part.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#6425E8]/10 text-[#6425E8] font-bold text-xs flex items-center justify-center">
                            {part.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#111126]">{part.full_name}</p>
                            <p className="text-[11px] text-[#73738A]">
                              Generated for <strong>{event?.event_name || 'Event Flyer'}</strong>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-[#73738A]">
                          <span className="text-[11px] font-mono">
                            {new Date(part.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {event && (
                            <a
                              href={`/e/${event.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#6425E8] hover:underline text-[11px] font-semibold"
                            >
                              Event Link →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CAMPAIGNS (FULL EVENTS LIST WITH GRID & TABLE VIEW) */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Event Campaigns ({totalEvents})
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Manage flyer coordinate templates, sharing URLs, and attendee downloads.
                </p>
              </div>

              <button
                onClick={() => navigate('/create-event')}
                className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Flyer Campaign</span>
              </button>
            </div>

            {/* Filter and Control Toolbar */}
            <div className="bg-white border border-[#E9E8F0] rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6425E8] transition"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex items-center space-x-1 border-l border-[#E9E8F0] pl-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      statusFilter === 'all' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    All ({totalEvents})
                  </button>
                  <button
                    onClick={() => setStatusFilter('published')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      statusFilter === 'published' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    Published ({publishedEvents})
                  </button>
                  <button
                    onClick={() => setStatusFilter('draft')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      statusFilter === 'draft' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    Drafts ({draftEvents})
                  </button>
                </div>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center space-x-1 self-end md:self-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  className={`p-1.5 rounded-lg border transition ${
                    viewMode === 'grid'
                      ? 'bg-[#6425E8]/10 text-[#6425E8] border-[#6425E8]/20'
                      : 'bg-white text-[#73738A] border-[#E9E8F0] hover:bg-[#F8F8FC]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  title="Table view"
                  className={`p-1.5 rounded-lg border transition ${
                    viewMode === 'table'
                      ? 'bg-[#6425E8]/10 text-[#6425E8] border-[#6425E8]/20'
                      : 'bg-white text-[#73738A] border-[#E9E8F0] hover:bg-[#F8F8FC]'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-white border border-[#E9E8F0] rounded-2xl p-12 text-center">
                <Calendar className="w-10 h-10 mx-auto text-[#73738A]/40 mb-3" />
                <h3 className="font-bold text-sm text-[#111126]">No campaigns found</h3>
                <p className="text-xs text-[#73738A] mt-1 max-w-sm mx-auto">
                  {searchQuery ? 'Try clearing your search query.' : 'Upload an event flyer design to get started.'}
                </p>
                <button
                  onClick={() => navigate('/create-event')}
                  className="mt-4 px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Create Event
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-xs hover:border-[#6425E8]/40 transition group flex flex-col"
                  >
                    <div className="h-48 bg-[#F8F8FC] relative overflow-hidden flex items-center justify-center">
                      {ev.resolvedFlyerUrl ? (
                        <img
                          src={ev.resolvedFlyerUrl}
                          alt={ev.event_name}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      ) : (
                        <Calendar className="w-8 h-8 opacity-30 text-[#73738A]" />
                      )}
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(ev);
                          }}
                          title="Click to toggle status (Published / Draft)"
                          className="text-[11px] font-semibold text-[#111126] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1.5 hover:ring-2 hover:ring-[#6425E8]/30 transition active:scale-95 cursor-pointer"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className="capitalize">{ev.status}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-[#111126] line-clamp-1">{ev.event_name}</h3>
                        <p className="text-xs text-[#73738A] mt-1">
                          {ev.venue ? `${ev.venue} · ` : ''}{new Date(ev.created_at).toLocaleDateString()}
                        </p>

                        <div className="mt-3 pt-3 border-t border-[#E9E8F0] flex items-center justify-between text-xs text-[#73738A]">
                          <span className="flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                            <strong className="text-[#111126] font-mono">{ev.participantCount}</strong>
                            <span>attendees</span>
                          </span>
                          <span className="flex items-center space-x-1.5">
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <strong className="text-[#111126] font-mono">{ev.downloadCount}</strong>
                            <span>downloads</span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E9E8F0] flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/editor/${ev.id}`)}
                          className="flex-1 py-2 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#111126] text-sm font-semibold rounded-xl border border-[#E9E8F0] transition flex items-center justify-center space-x-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#6425E8]" />
                          <span>Configure</span>
                        </button>

                        <button
                          onClick={() => handleCopyLink(ev.slug, ev.id)}
                          title="Copy link"
                          className="p-2 bg-white hover:bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#111126] rounded-xl transition"
                        >
                          {copiedId === ev.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <a
                          href={`/e/${ev.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View attendee page"
                          className="p-2 bg-white hover:bg-[#F8F8FC] border border-[#E9E8F0] text-[#73738A] hover:text-[#6425E8] rounded-xl transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleDeleteEvent(ev.id, ev.event_name)}
                          title="Delete campaign"
                          className="p-2 hover:bg-rose-50 text-[#73738A] hover:text-rose-600 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* TABLE VIEW (Dense SaaS table) */
              <div className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                        <th className="px-6 py-3.5">Campaign Name</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Sharing URL</th>
                        <th className="px-6 py-3.5">Attendees</th>
                        <th className="px-6 py-3.5">Downloads</th>
                        <th className="px-6 py-3.5">Created</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E8F0]">
                      {filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-[#F8F8FC]/60 transition">
                          <td className="px-6 py-4 font-bold text-[#111126]">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-[#F8F8FC] border border-[#E9E8F0] overflow-hidden shrink-0 flex items-center justify-center">
                                {ev.resolvedFlyerUrl ? (
                                  <img src={ev.resolvedFlyerUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Calendar className="w-4 h-4 text-[#73738A]" />
                                )}
                              </div>
                              <span className="truncate max-w-[200px]">{ev.event_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center space-x-1.5 text-xs text-[#111126]">
                              <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="capitalize">{ev.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleCopyLink(ev.slug, ev.id)}
                              className="font-mono text-[11px] text-[#6425E8] hover:underline flex items-center space-x-1"
                            >
                              <span>/e/{ev.slug}</span>
                              {copiedId === ev.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 opacity-60" />}
                            </button>
                          </td>
                          <td className="px-6 py-4 font-mono tabular-nums">{ev.participantCount}</td>
                          <td className="px-6 py-4 font-mono tabular-nums">{ev.downloadCount}</td>
                          <td className="px-6 py-4 text-[#73738A] font-mono tabular-nums">
                            {new Date(ev.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => navigate(`/editor/${ev.id}`)}
                                className="px-2.5 py-1 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#111126] font-semibold rounded-lg border border-[#E9E8F0]"
                              >
                                Edit
                              </button>
                              <a
                                href={`/e/${ev.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-[#73738A] hover:text-[#6425E8]"
                                title="Open link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteEvent(ev.id, ev.event_name)}
                                className="p-1 text-[#73738A] hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATTENDEES DIRECTORY */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                Attendee Directory ({totalParticipants})
              </h1>
              <p className="text-xs text-[#73738A] mt-1">
                Real-time record of participants who have customized and downloaded event flyers.
              </p>
            </div>

            {participants.length === 0 ? (
              <div className="bg-white border border-[#E9E8F0] rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 mx-auto text-[#73738A]/40 mb-3" />
                <h3 className="font-bold text-sm text-[#111126]">No attendee generations yet</h3>
                <p className="text-xs text-[#73738A] mt-1 max-w-sm mx-auto">
                  When participants generate customized flyers through your public links, their names and records appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                      <th className="px-6 py-3.5">Participant Name</th>
                      <th className="px-6 py-3.5">Event Campaign</th>
                      <th className="px-6 py-3.5">Time Generated</th>
                      <th className="px-6 py-3.5 text-right">Sharing Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {participants.map((p) => {
                      const ev = events.find((e) => e.id === p.event_id);
                      return (
                        <tr key={p.id} className="hover:bg-[#F8F8FC]/60 transition">
                          <td className="px-6 py-3.5 font-bold text-[#111126]">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                                {p.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span>{p.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-[#111126] font-medium">
                            {ev?.event_name || 'Event Flyer'}
                          </td>
                          <td className="px-6 py-3.5 text-[#73738A] font-mono tabular-nums">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {ev && (
                              <a
                                href={`/e/${ev.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#6425E8] hover:underline font-mono text-[11px]"
                              >
                                /e/{ev.slug} →
                              </a>
                            )}
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

        {/* TAB 4: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                Operational Analytics
              </h1>
              <p className="text-xs text-[#73738A] mt-1">
                Participant engagement metrics and export format distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs">
                <span className="text-[11px] font-semibold text-[#73738A] uppercase tracking-wider">
                  Avg. Participants Per Event
                </span>
                <p className="text-2xl font-bold mt-1 text-[#111126] font-mono tabular-nums">
                  {totalEvents > 0 ? (totalParticipants / totalEvents).toFixed(1) : '0.0'}
                </p>
                <p className="text-[11px] text-[#73738A] mt-1">Self-service generated flyers</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs">
                <span className="text-[11px] font-semibold text-[#73738A] uppercase tracking-wider">
                  Download Conversion
                </span>
                <p className="text-2xl font-bold mt-1 text-[#6425E8] font-mono tabular-nums">
                  {conversionRate}%
                </p>
                <p className="text-[11px] text-[#73738A] mt-1">Attendees who saved their flyer</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs">
                <span className="text-[11px] font-semibold text-[#73738A] uppercase tracking-wider">
                  Supported Export Formats
                </span>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#6425E8]/10 text-[#6425E8] rounded-lg">PNG</span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">JPG</span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg">PDF</span>
                </div>
                <p className="text-[11px] text-[#73738A] mt-2">High-res canvas export engine</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TEAM & ROLES */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Team & Permissions
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Manage collaborators under <strong>{currentOrg?.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-xs">
              <div className="divide-y divide-[#E9E8F0]">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-5 flex items-center justify-between hover:bg-[#F8F8FC]/50 transition">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-9 h-9 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111126]">{member.full_name}</p>
                        <p className="text-[11px] text-[#73738A]">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-[#73738A] font-semibold uppercase tracking-wider">
                        {member.role.replace('_', ' ')}
                      </span>

                      {member.role !== 'owner' && (
                        <button
                          onClick={() => {
                            db.removeOrgMember(member.id);
                            loadDashboardData();
                          }}
                          className="p-1.5 hover:bg-rose-50 text-[#73738A] hover:text-rose-600 rounded-lg transition"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                Workspace Settings
              </h1>
              <p className="text-xs text-[#73738A] mt-1">
                Manage organization identity, storage, and clean live database state.
              </p>
            </div>

            <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-xs space-y-5">
              <form onSubmit={handleSaveOrgSettings} className="space-y-4">
                {orgSavedNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Workspace updated successfully.</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:outline-none focus:border-[#6425E8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Plan
                  </label>
                  <div className="p-3 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#111126]">Eventra Pro</p>
                      <p className="text-[11px] text-[#73738A]">Unlimited flyer campaigns, canvas processing & exports</p>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold">Active</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#6425E8] hover:bg-[#501bc5] text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Cloud Database Connection */}
            <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#111126] uppercase tracking-wider">Cloud Database & Storage</h4>
                  <p className="text-[11px] text-[#73738A] mt-0.5">High-speed event ledger and participant asset storage.</p>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected</span>
                </span>
              </div>

              <div className="p-3 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider block">Production Host</span>
                  <span className="font-mono text-[#111126] text-[11px]">qshjupnpxibbvilxgwix.supabase.co</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDbModal(true)}
                  className="px-3 py-1.5 border border-[#E9E8F0] hover:bg-white text-xs font-semibold rounded-lg text-[#6425E8] transition"
                >
                  Connection Details
                </button>
              </div>
            </div>

            {/* Danger Zone: Purge Dummy Data */}
            <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wider">Data Sanitation</h4>
              <p className="text-xs text-[#73738A]">
                Remove any cached test/demo events or sample participants to ensure your live workspace is 100% clean.
              </p>
              <button
                onClick={handlePurgeAllDummyData}
                className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Test & Demo Data</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Invite Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-[#111126]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-sm text-[#111126] mb-1">Invite Team Member</h3>
            <p className="text-xs text-[#73738A] mb-4">Add a team member to collaborate on event flyer campaigns.</p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#73738A] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Smith"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#73738A] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jordan@company.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#73738A] mb-1">Role & Permissions</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs font-medium"
                >
                  <option value="event_manager">Event Manager (Can create & publish events)</option>
                  <option value="admin">Organisation Administrator (Full access)</option>
                  <option value="member">Team Member (View & download access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#73738A] hover:text-[#111126]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase Config Modal */}
      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </div>
  );
};
