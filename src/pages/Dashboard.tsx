import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/storage-and-db';
import { resolveFlyerSource } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FlyerEvent, OrganisationMember } from '../types/database';
import { PLATFORM_MODULES } from '../lib/modules';
import { SupabaseModal } from '../components/SupabaseModal';
import { ModulePreviewModal } from '../components/ModulePreviewModal';
import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { 
  Plus, Calendar, Users, Download, ExternalLink, Settings, 
  LogOut, Copy, Check, Search, Sparkles, Database, Trash2, Edit3, 
  ArrowRight, ShieldCheck, Layers, BarChart3, Building2, UserPlus,
  Compass, Ticket, QrCode, Image as ImageIcon, Send, SlidersHorizontal,
  Clock, CheckCircle2, ChevronDown, Activity, ChevronRight, Menu, X
} from 'lucide-react';


interface EventWithMetrics extends FlyerEvent {
  participantCount: number;
  downloadCount: number;
  resolvedFlyerUrl?: string;
}

type DashboardTab = 'overview' | 'events' | 'analytics' | 'team' | 'settings';

export const Dashboard: React.FC = () => {
  const { user, profile, currentOrg, organisations, switchOrganisation, signOut, isSupabase } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [events, setEvents] = useState<EventWithMetrics[]>([]);
  const [teamMembers, setTeamMembers] = useState<OrganisationMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const [previewModule, setPreviewModule] = useState<any>(null);

  // New member modal form state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'event_manager' | 'member'>('event_manager');

  // Org settings form state
  const [orgName, setOrgName] = useState(currentOrg?.name || 'Elevate Experience Group');
  const [orgSavedNotice, setOrgSavedNotice] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [currentOrg]);

  const loadDashboardData = async () => {
    setLoading(true);
    const allEvents = db.getEvents();
    const allParticipants = db.getParticipants();
    const allDownloads = db.getDownloads();
    const members = db.getOrgMembers(currentOrg?.id);

    const enriched = await Promise.all(
      allEvents.map(async (ev) => {
        const pCount = allParticipants.filter((p) => p.event_id === ev.id).length;
        const dCount = allDownloads.filter((d) => d.event_id === ev.id).length;
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
    setTeamMembers(members);
    setLoading(false);
  };

  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'published').length;
  const totalParticipants = events.reduce((acc, curr) => acc + curr.participantCount, 0);
  const totalDownloads = events.reduce((acc, curr) => acc + curr.downloadCount, 0);

  const filteredEvents = events.filter((ev) =>
    ev.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/e/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteEvent = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      db.deleteEvent(id);
      loadDashboardData();
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    db.addOrgMember({
      org_id: currentOrg?.id || 'org_elevate_01',
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
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-[#E9E8F0] flex flex-col justify-between hidden md:flex shrink-0">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo & Brand Zone */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-[#E9E8F0] shrink-0">
            <EventraLogo variant="with-tagline" size="md" />
          </div>

          {/* Organisation Card / Switcher */}
          <div className="p-4 border-b border-[#E9E8F0]">
            <div className="p-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111126] truncate">{currentOrg?.name || 'My Organisation'}</p>
                  <p className="text-[10px] text-[#73738A] uppercase tracking-wider font-semibold">Pro Workspace</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6 flex-1">
            {/* WORKSPACE */}
            <div>
              <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                Workspace
              </span>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'overview'
                      ? 'bg-[#6425E8]/10 text-[#6425E8]'
                      : 'text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126]'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('events')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'events'
                      ? 'bg-[#6425E8]/10 text-[#6425E8]'
                      : 'text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126]'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>My Events</span>
                </button>

                <button
                  onClick={() => navigate('/create-event')}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126] rounded-xl transition"
                >
                  <Plus className="w-4 h-4 text-[#6425E8]" />
                  <span>Create Event</span>
                </button>
              </div>
            </div>

            {/* EVENT TOOLS */}
            <div>
              <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                Event Tools
              </span>
              <div className="mt-2 space-y-1">
                {/* Eventra Create - Highlighted Core Feature */}
                <button
                  onClick={() => setActiveTab('events')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#6425E8] bg-[#6425E8]/5 border border-[#6425E8]/20 rounded-xl"
                >
                  <div className="flex items-center space-x-2.5">
                    <Layers className="w-4 h-4 text-[#6425E8]" />
                    <span>Eventra Create</span>
                  </div>
                  <span className="text-[9px] bg-[#6425E8] text-white px-1.5 py-0.5 rounded font-mono">LIVE</span>
                </button>

                {/* Coming soon modules with informative preview modal */}
                <button
                  onClick={() => setPreviewModule(PLATFORM_MODULES.find((m) => m.module_key === 'invitations'))}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126] rounded-xl transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Send className="w-4 h-4 opacity-70" />
                    <span>Invitations</span>
                  </div>
                  <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                </button>

                <button
                  onClick={() => setPreviewModule(PLATFORM_MODULES.find((m) => m.module_key === 'registrations'))}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126] rounded-xl transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Ticket className="w-4 h-4 opacity-70" />
                    <span>Registrations</span>
                  </div>
                  <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                </button>

                <button
                  onClick={() => setPreviewModule(PLATFORM_MODULES.find((m) => m.module_key === 'check_in'))}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126] rounded-xl transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <QrCode className="w-4 h-4 opacity-70" />
                    <span>Check-in</span>
                  </div>
                  <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                </button>

                <button
                  onClick={() => setPreviewModule(PLATFORM_MODULES.find((m) => m.module_key === 'media_gallery'))}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126] rounded-xl transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <ImageIcon className="w-4 h-4 opacity-70" />
                    <span>Media Gallery</span>
                  </div>
                  <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                </button>
              </div>
            </div>

            {/* MANAGEMENT */}
            <div>
              <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                Management
              </span>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'analytics'
                      ? 'bg-[#6425E8]/10 text-[#6425E8]'
                      : 'text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'team'
                      ? 'bg-[#6425E8]/10 text-[#6425E8]'
                      : 'text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Team & Roles</span>
                </button>
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                Account
              </span>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'settings'
                      ? 'bg-[#6425E8]/10 text-[#6425E8]'
                      : 'text-[#73738A] hover:bg-[#F8F8FC] hover:text-[#111126]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Organisation Settings</span>
                </button>
              </div>
            </div>
          </nav>


          {/* User Profile Footer */}
          <div className="p-4 border-t border-[#E9E8F0]">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111126] truncate">{profile?.full_name || 'Alex Morgan'}</p>
                <p className="text-[11px] text-[#73738A] truncate">{profile?.email || 'alex.morgan@eventra.io'}</p>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 hover:bg-rose-50 text-[#73738A] hover:text-rose-600 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#111126]/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)} 
          />
          {/* Drawer container */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E9E8F0] shrink-0">
              <EventraLogo variant="with-tagline" size="sm" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-lg transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Organisation Card */}
            <div className="p-4 border-b border-[#E9E8F0] bg-[#F8F8FC] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111126] truncate">{currentOrg?.name || 'My Organisation'}</p>
                  <p className="text-[10px] text-[#73738A] uppercase tracking-wider font-semibold">Pro Workspace</p>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                  Workspace
                </span>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      activeTab === 'overview' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Overview</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      activeTab === 'events' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Events</span>
                  </button>
                  <button
                    onClick={() => { navigate('/create-event'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-[#73738A] hover:bg-[#F8F8FC] rounded-xl transition"
                  >
                    <Plus className="w-4 h-4 text-[#6425E8]" />
                    <span>Create Event</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                  Event Tools
                </span>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#6425E8] bg-[#6425E8]/5 border border-[#6425E8]/20 rounded-xl"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Layers className="w-4 h-4 text-[#6425E8]" />
                      <span>Eventra Create</span>
                    </div>
                    <span className="text-[9px] bg-[#6425E8] text-white px-1.5 py-0.5 rounded font-mono">LIVE</span>
                  </button>
                  <button
                    onClick={() => { setPreviewModule(PLATFORM_MODULES.find(m => m.module_key === 'invitations')); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] rounded-xl transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Send className="w-4 h-4 opacity-70" />
                      <span>Invitations</span>
                    </div>
                    <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                  </button>
                  <button
                    onClick={() => { setPreviewModule(PLATFORM_MODULES.find(m => m.module_key === 'registrations')); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#73738A] hover:bg-[#F8F8FC] rounded-xl transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Ticket className="w-4 h-4 opacity-70" />
                      <span>Registrations</span>
                    </div>
                    <span className="text-[9px] text-[#73738A] bg-[#E9E8F0] px-1.5 py-0.5 rounded">Soon</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider px-2">
                  Management
                </span>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      activeTab === 'analytics' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('team'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      activeTab === 'team' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Team & Roles</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      activeTab === 'settings' ? 'bg-[#6425E8]/10 text-[#6425E8]' : 'text-[#73738A] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Organisation Settings</span>
                  </button>
                </div>
              </div>
            </div>


            {/* Drawer User Footer */}
            <div className="p-4 border-t border-[#E9E8F0] shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111126] truncate">{profile?.full_name || 'Alex Morgan'}</p>
                  <p className="text-[11px] text-[#73738A] truncate">{profile?.email || 'alex.morgan@eventra.io'}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="p-1.5 hover:bg-rose-50 text-[#73738A] hover:text-rose-600 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 lg:px-10 bg-white border-b border-[#E9E8F0] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl transition"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="md:hidden flex items-center space-x-2 shrink-0">
              <EventraLogoSymbol size={24} />
              <span className="font-extrabold text-xs tracking-wider text-[#111126]">EVENTRA</span>
            </div>

            <div className="hidden md:block">
              <h2 className="font-bold text-sm text-[#111126] capitalize">
                {activeTab === 'overview' && 'Platform Overview'}
                {activeTab === 'events' && 'Event Portfolio & Campaigns'}
                {activeTab === 'analytics' && 'Operational Analytics & Reports'}
                {activeTab === 'team' && 'Team & Role-Based Permissions'}
                {activeTab === 'settings' && 'Organisation Settings'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={() => navigate('/create-event')}
              className="px-3.5 sm:px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </header>



        {/* Content Views */}
        <div className="p-6 lg:p-10 max-w-6xl w-full mx-auto space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Eventra Hero Banner */}
              <div className="bg-gradient-to-r from-[#111126] via-[#1E0A52] to-[#4214B8] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full inline-block">
                      {currentOrg?.name || 'Elevate Experience Group'}
                    </span>
                    <span className="text-white/60 text-xs">·</span>
                    <span className="text-xs text-[#9638F5] font-semibold">Events. Elevated.</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Welcome to your Eventra Workspace
                  </h1>
                  <p className="text-xs text-white/80 mt-1.5 max-w-xl leading-relaxed">
                    Personalised flyer generation is live in <strong>Eventra Create</strong>. Manage your events, distribute unique sharing links, and track participant reach.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => navigate('/create-event')}
                    className="px-5 py-2.5 bg-white text-[#6425E8] hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Event</span>
                  </button>
                </div>
              </div>

              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="interactive-card bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-sm cursor-default">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#73738A] uppercase tracking-wider block truncate">Total Events</span>
                  <p className="text-xl sm:text-2xl font-extrabold mt-1 text-[#111126] font-mono tabular-nums">{totalEvents}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#73738A] mt-0.5 truncate">{publishedEvents} published live</p>
                </div>

                <div className="interactive-card bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-sm cursor-default">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#73738A] uppercase tracking-wider block truncate">Active Campaigns</span>
                  <p className="text-xl sm:text-2xl font-extrabold mt-1 text-[#6425E8] font-mono tabular-nums">{publishedEvents}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#73738A] mt-0.5 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready for attendees
                  </p>
                </div>

                <div className="interactive-card bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-sm cursor-default">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#73738A] uppercase tracking-wider block truncate">Participants</span>
                  <p className="text-xl sm:text-2xl font-extrabold mt-1 text-[#111126] font-mono tabular-nums">{totalParticipants}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#73738A] mt-0.5 truncate">Custom flyers made</p>
                </div>

                <div className="interactive-card bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-sm cursor-default">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#73738A] uppercase tracking-wider block truncate">Flyer Exports</span>
                  <p className="text-xl sm:text-2xl font-extrabold mt-1 text-[#16A34A] font-mono tabular-nums">{totalDownloads}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#73738A] mt-0.5 truncate">PNG, JPG, PDF</p>
                </div>
              </div>

              {/* Eventra Create Feature Spotlight Card */}
              <div className="interactive-card bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6425E8] via-[#9638F5] to-emerald-500" />
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#111126]">Eventra Create</h3>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                        Operational
                      </span>
                    </div>
                    <p className="text-xs text-[#73738A] mt-1 max-w-xl leading-relaxed">
                      Upload your base event flyer, place custom circular or rectangular participant photo cutouts, style the participant name typography, and let your attendees generate their personalised posters in seconds.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setActiveTab('events')}
                    className="interactive-btn px-4 py-2 border border-[#E9E8F0] hover:bg-[#F8F8FC] text-xs font-semibold rounded-xl text-[#111126] transition shadow-xs"
                  >
                    View Flyer Events
                  </button>
                  <button
                    onClick={() => navigate('/create-event')}
                    className="interactive-btn px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition"
                  >
                    Launch Create
                  </button>
                </div>
              </div>

              {/* Recent Events List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#111126]">Recent Events</h3>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="text-xs font-semibold text-[#6425E8] hover:underline flex items-center gap-1"
                  >
                    <span>View all events</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="interactive-card bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-sm flex flex-col group"
                    >
                      <div className="h-44 bg-[#F8F8FC] relative overflow-hidden flex items-center justify-center">
                        {ev.resolvedFlyerUrl ? (
                          <img
                            src={ev.resolvedFlyerUrl}
                            alt={ev.event_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <Calendar className="w-10 h-10 text-gray-300" />
                        )}
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-sm ${
                              ev.status === 'published'
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-amber-500/90 text-white'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#111126] truncate">{ev.event_name}</h4>
                          <p className="text-[11px] text-[#73738A] mt-0.5">
                            {ev.venue || 'Virtual & In-Person'} · {new Date(ev.created_at).toLocaleDateString()}
                          </p>

                          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-[#E9E8F0] text-xs text-[#73738A]">
                            <span className="flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                              <span className="font-mono tabular-nums font-semibold text-[#111126]">{ev.participantCount}</span>
                              <span>attendees</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                              <span className="font-mono tabular-nums font-semibold text-[#111126]">{ev.downloadCount}</span>
                              <span>downloads</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-[#E9E8F0]">
                          <button
                            onClick={() => navigate(`/editor/${ev.id}`)}
                            className="interactive-btn flex-1 py-1.5 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#111126] text-xs font-semibold rounded-xl border border-[#E9E8F0] transition flex items-center justify-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Coordinates</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(ev.slug, ev.id)}
                            className="interactive-btn p-1.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-[#73738A] hover:text-[#111126] transition"
                            title="Copy participant link"
                          >
                            {copiedId === ev.id ? <Check className="w-4 h-4 text-emerald-600 animate-scale-up" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <a
                            href={`/e/${ev.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="interactive-btn p-1.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-[#73738A] hover:text-[#6425E8] transition"
                            title="Open participant page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVENTS (PORTFOLIO) */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#111126]">Event Portfolio</h3>
                  <p className="text-xs text-[#73738A] mt-0.5">
                    Configure and publish personalized flyer templates for all your events.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                    />
                  </div>
                  <button
                    onClick={() => navigate('/create-event')}
                    className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Event</span>
                  </button>
                </div>

              </div>

              {filteredEvents.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E9E8F0] rounded-2xl p-12 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-[#73738A]/40 mb-3" />
                  <h4 className="font-bold text-sm text-[#111126]">No Events Found</h4>
                  <p className="text-xs text-[#73738A] mt-1 max-w-sm mx-auto">
                    Upload an event flyer design to start generating personalized templates for participants.
                  </p>
                  <button
                    onClick={() => navigate('/create-event')}
                    className="mt-4 px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition group"
                    >
                      <div className="h-48 bg-[#F8F8FC] relative overflow-hidden flex items-center justify-center">
                        {ev.resolvedFlyerUrl ? (
                          <img
                            src={ev.resolvedFlyerUrl}
                            alt={ev.event_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <Calendar className="w-10 h-10 text-gray-300" />
                        )}
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md ${
                              ev.status === 'published'
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-amber-500/90 text-white'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#111126] truncate">{ev.event_name}</h4>
                          <p className="text-[11px] text-[#73738A] mt-0.5">
                            Created {new Date(ev.created_at).toLocaleDateString()}
                          </p>

                          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-[#E9E8F0] text-xs text-[#73738A]">
                            <span className="flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-[#6425E8]" />
                              <span className="font-mono tabular-nums font-semibold text-[#111126]">{ev.participantCount}</span>
                              <span>attendees</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                              <span className="font-mono tabular-nums font-semibold text-[#111126]">{ev.downloadCount}</span>
                              <span>downloads</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-[#E9E8F0]">
                          <button
                            onClick={() => navigate(`/editor/${ev.id}`)}
                            className="flex-1 py-2 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#111126] text-xs font-semibold rounded-xl border border-[#E9E8F0] transition flex items-center justify-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Configure</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(ev.slug, ev.id)}
                            className="p-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-[#73738A] hover:text-[#111126] transition"
                            title="Copy participant link"
                          >
                            {copiedId === ev.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <a
                            href={`/e/${ev.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-[#73738A] hover:text-[#6425E8] transition"
                            title="Open participant page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleDeleteEvent(ev.id, ev.event_name)}
                            className="p-2 hover:bg-rose-50 rounded-xl text-[#73738A] hover:text-rose-600 transition"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-base text-[#111126]">Operational Analytics</h3>
                <p className="text-xs text-[#73788A] mt-0.5">
                  Detailed participant generation performance across all active Eventra Create campaigns.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm">
                  <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">Average Participants/Event</span>
                  <p className="text-2xl font-bold mt-1 text-[#111126] font-mono tabular-nums">
                    {totalEvents > 0 ? (totalParticipants / totalEvents).toFixed(1) : 0}
                  </p>
                  <p className="text-[11px] text-[#73738A] mt-1">Attendees per campaign</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm">
                  <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">Download Conversion Rate</span>
                  <p className="text-2xl font-bold mt-1 text-[#6425E8] font-mono tabular-nums">
                    {totalParticipants > 0 ? `${Math.round((totalDownloads / totalParticipants) * 100)}%` : '100%'}
                  </p>
                  <p className="text-[11px] text-[#73738A] mt-1">Generated flyers exported</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-sm">
                  <span className="text-[11px] font-bold text-[#73738A] uppercase tracking-wider">Format Distribution</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-[#6425E8]/10 text-[#6425E8] rounded-lg">PNG (52%)</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">JPG (31%)</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 rounded-lg">PDF (17%)</span>
                  </div>
                </div>
              </div>

              {/* Event Performance Breakdown Table */}
              <div className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#E9E8F0] bg-[#F8F8FC]">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#73738A]">
                    Event Performance Ledger
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-white font-semibold">
                        <th className="px-6 py-3">Event Name</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Participants</th>
                        <th className="px-6 py-3">Downloads</th>
                        <th className="px-6 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E8F0]">
                      {events.map((e) => (
                        <tr key={e.id} className="hover:bg-[#F8F8FC] transition">
                          <td className="px-6 py-3.5 font-bold text-[#111126]">{e.event_name}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              e.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-mono tabular-nums">{e.participantCount}</td>
                          <td className="px-6 py-3.5 font-mono tabular-nums">{e.downloadCount}</td>
                          <td className="px-6 py-3.5 text-[#73738A] font-mono tabular-nums">
                            {new Date(e.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEAM & ORGANISATION */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#111126]">Team & Role-Based Permissions</h3>
                  <p className="text-xs text-[#73738A] mt-0.5">
                    Manage team members under <strong>{currentOrg?.name}</strong> and assign role capabilities.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              </div>

              <div className="bg-white border border-[#E9E8F0] rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-[#E9E8F0]">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="p-5 flex items-center justify-between hover:bg-[#F8F8FC] transition">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                          {member.full_name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#111126]">{member.full_name}</p>
                          <p className="text-[11px] text-[#73738A]">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-[#4214B8]'
                            : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
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

          {/* TAB 5: ORGANISATION SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-bold text-base text-[#111126]">Organisation Profile & Branding</h3>
                <p className="text-xs text-[#73738A] mt-0.5">
                  Update your organization identity, timezones, and account defaults.
                </p>
              </div>

              <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-sm">
                <form onSubmit={handleSaveOrgSettings} className="space-y-4">
                  {orgSavedNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Organisation details saved successfully.</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                      Organisation Name
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
                      Workspace Identifier / Slug
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentOrg?.slug || 'elevate-group'}
                      className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-mono text-[#73738A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                      Primary Subscription Plan
                    </label>
                    <div className="p-3 bg-[#6425E8]/5 border border-[#6425E8]/20 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#6425E8] uppercase tracking-wider">Eventra Professional</span>
                        <p className="text-[11px] text-[#73738A] mt-0.5">Includes unlimited flyer campaigns & high-res exports</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">Active</span>
                    </div>
                  </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-xs rounded-xl shadow-sm transition"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>

                {/* Cloud Database & Storage (Production status) */}
                <div className="bg-white border border-[#E9E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#111126] uppercase tracking-wider">Cloud Database & Storage</h4>
                      <p className="text-[11px] text-[#73738A] mt-0.5">High-speed event ledger and participant asset storage.</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live & Connected</span>
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-[#73738A] uppercase tracking-wider block">Production Host</span>
                      <span className="font-mono text-[#111126] text-[11px] truncate block">qshjupnpxibbvilxgwix.supabase.co</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDbModal(true)}
                      className="px-3 py-1.5 border border-[#E9E8F0] hover:bg-white text-xs font-semibold rounded-lg text-[#6425E8] transition shrink-0"
                    >
                      Connection Details
                    </button>
                  </div>
                </div>
              </div>
            )}

        </div>
      </main>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-[#111126]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-sm text-[#111126] mb-1">Invite Organisation Member</h3>
            <p className="text-xs text-[#73738A] mb-4">Add a team member to collaborate on event campaigns.</p>

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
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl"
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

      {/* Future Module Preview Roadmap Modal */}
      <ModulePreviewModal module={previewModule} onClose={() => setPreviewModule(null)} />
    </div>
  );
};
