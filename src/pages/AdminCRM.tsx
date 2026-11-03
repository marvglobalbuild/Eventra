import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, exportAttendeesToCSV, saveStoredAccount, setAuthSession } from '../lib/storage-and-db';
import { useAuth } from '../context/AuthContext';
import { EventraLogoSymbol } from '../components/EventraLogo';
import { 
  AttendeeCrmRecord, UserCrmRecord, VisitorStats, 
  PlatformOverviewMetrics, FlyerEvent, SiteVisit 
} from '../types/database';
import confetti from 'canvas-confetti';
import { 
  Activity, Users, Eye, Download, Calendar, Layers, Shield, 
  Sparkles, BarChart3, TrendingUp, Search, Filter, RefreshCw, 
  ArrowUpRight, ArrowLeft, Globe, Smartphone, Monitor, Tablet, 
  CheckCircle2, Clock, Database, FileSpreadsheet, ExternalLink, 
  ChevronRight, Copy, Check, Trash2, UserCheck, ShieldAlert,
  SlidersHorizontal, CheckCircle, PieChart, HardDrive
} from 'lucide-react';

type AdminTab = 'overview' | 'visitors' | 'crm' | 'organizers' | 'campaigns' | 'system';

export const AdminCRM: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [attendees, setAttendees] = useState<AttendeeCrmRecord[]>([]);
  const [organizers, setOrganizers] = useState<UserCrmRecord[]>([]);
  const [events, setEvents] = useState<FlyerEvent[]>([]);

  // Search & Filter States
  const [crmSearch, setCrmSearch] = useState('');
  const [crmEventFilter, setCrmEventFilter] = useState('all');
  const [organizerSearch, setOrganizerSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickOwnerLogin = () => {
    saveStoredAccount({
      id: 'usr_owner_marv',
      email: 'marvglobalbuild@eventra.io',
      full_name: 'Marvelous Ndukwe (Owner)',
      org_id: 'org_owner_marv',
      org_name: 'Eventra Global Workspace',
      created_at: new Date().toISOString(),
    });
    setAuthSession('marvglobalbuild@eventra.io');
    window.location.href = '/dashboard';
  };

  useEffect(() => {
    // Record visit to admin page
    db.recordVisit('/admin');
    loadAllData();
  }, []);

  const loadAllData = () => {
    setLoading(true);
    try {
      const pMetrics = db.getPlatformOverviewMetrics();
      const vStats = db.getVisitorStats();
      const allAttendees = db.getAllParticipantsCRM();
      const allUsers = db.getAllUsersCRM();
      const allEvents = db.getEvents();

      setMetrics(pMetrics);
      setVisitorStats(vStats);
      setAttendees(allAttendees);
      setOrganizers(allUsers);
      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading admin CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
    setTimeout(() => {
      setRefreshing(false);
      showToast('Dashboard & telemetry refreshed');
    }, 600);
  };

  const handleExportCSV = () => {
    if (attendees.length === 0) {
      showToast('No attendee records to export');
      return;
    }
    const csvContent = exportAttendeesToCSV(attendees);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `eventra_attendees_crm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${attendees.length} attendee records to CSV`);
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#6425E8', '#10B981', '#38BDF8'],
      });
    } catch {}
  };

  const handleExportJSON = () => {
    const backup = {
      exported_at: new Date().toISOString(),
      platform: 'Eventra',
      metrics,
      visitorStats,
      organizers,
      attendees,
      events,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `eventra_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Platform JSON export generated');
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    showToast(`Copied public link: ${url}`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleSeedVisits = () => {
    db.seedDemoVisits();
    loadAllData();
    showToast('Simulated 48 demo visitor sessions for telemetry review');
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#6425E8', '#9638F5', '#10B981'],
      });
    } catch {}
  };

  const handleClearVisits = () => {
    if (window.confirm('Clear all recorded visitor telemetry? This resets visitor counts to zero.')) {
      db.clearVisitorLogs();
      loadAllData();
      showToast('Visitor logs cleared');
    }
  };

  // Filtered Attendees for CRM Tab
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchesSearch = 
        a.full_name.toLowerCase().includes(crmSearch.toLowerCase()) ||
        a.event_name.toLowerCase().includes(crmSearch.toLowerCase()) ||
        a.event_slug.toLowerCase().includes(crmSearch.toLowerCase());
      
      const matchesEvent = crmEventFilter === 'all' || a.event_id === crmEventFilter || a.event_slug === crmEventFilter;
      return matchesSearch && matchesEvent;
    });
  }, [attendees, crmSearch, crmEventFilter]);

  // Filtered Organizers for Users Tab
  const filteredOrganizers = useMemo(() => {
    return organizers.filter((org) => {
      return (
        org.full_name.toLowerCase().includes(organizerSearch.toLowerCase()) ||
        org.email.toLowerCase().includes(organizerSearch.toLowerCase()) ||
        org.org_name.toLowerCase().includes(organizerSearch.toLowerCase())
      );
    });
  }, [organizers, organizerSearch]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return events.filter((ev) => {
      return (
        ev.event_name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        ev.slug.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        (ev.venue && ev.venue.toLowerCase().includes(campaignSearch.toLowerCase()))
      );
    });
  }, [events, campaignSearch]);

  // Maximum value for SVG daily trend chart
  const maxTrendVisits = useMemo(() => {
    if (!visitorStats || visitorStats.dailyTrends.length === 0) return 10;
    const maxVal = Math.max(...visitorStats.dailyTrends.map((d) => d.visits));
    return maxVal > 0 ? maxVal : 10;
  }, [visitorStats]);

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111126] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-medium animate-fade-in-up">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Owner CMS Header */}
      <header className="h-16 bg-white border-b border-[#E9E8F0] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link 
            to={user ? "/dashboard" : "/"}
            className="p-2 -ml-2 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-lg transition flex items-center"
            title={user ? "Return to Workspace Dashboard" : "Return to Eventra Home"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center space-x-2.5">
            <EventraLogoSymbol size={28} />
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-sm text-[#111126]">EVENTRA</span>
                <span className="px-2 py-0.5 bg-[#6425E8]/10 text-[#6425E8] rounded-md text-[10px] font-bold uppercase tracking-wider">
                  Owner CMS & CRM
                </span>
              </div>
              <span className="text-[10px] text-[#73738A] font-medium hidden sm:inline">
                Software Platform Telemetry & Audience Management
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#E9E8F0] hidden md:block" />

          {/* Live Telemetry Pulse */}
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Active</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#6425E8]' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#111126] bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Workspace Dashboard
            </Link>
          ) : (
            <button
              onClick={handleQuickOwnerLogin}
              className="px-3.5 py-1.5 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enter Workspace as Owner</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <div className="bg-white border-b border-[#E9E8F0] px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 sm:space-x-2 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'visitors'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Traffic & Telemetry</span>
            <span className="px-1.5 py-0.2 bg-[#F8F8FC] text-[#73738A] text-[10px] rounded-full">
              {visitorStats?.totalVisits || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'crm'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Attendee CRM Directory</span>
            <span className="px-1.5 py-0.2 bg-[#F8F8FC] text-[#73738A] text-[10px] rounded-full">
              {attendees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('organizers')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'organizers'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Users & Organizers</span>
            <span className="px-1.5 py-0.2 bg-[#F8F8FC] text-[#73738A] text-[10px] rounded-full">
              {organizers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'campaigns'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Campaigns CMS</span>
            <span className="px-1.5 py-0.2 bg-[#F8F8FC] text-[#73738A] text-[10px] rounded-full">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'system'
                ? 'bg-[#6425E8]/10 text-[#6425E8]'
                : 'text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Health & Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Owner Access Status Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-sky-50 to-indigo-50 border border-[#6425E8]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#6425E8] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#111126]">Platform Owner Active: marvglobalbuild</span>
                <span className="px-2 py-0.5 bg-[#6425E8]/10 text-[#6425E8] rounded-md text-[10px] font-bold uppercase tracking-wider">
                  Full Root Access
                </span>
              </div>
              <p className="text-[11px] text-[#73738A]">
                Direct telemetry & monitoring active. You can review all real-time visitors, registered accounts, and attendee CRM records without sign-in barriers.
              </p>
            </div>
          </div>
          {!user ? (
            <button
              onClick={handleQuickOwnerLogin}
              className="px-3.5 py-1.5 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Log In to Workspace</span>
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-bold rounded-xl transition shadow-2xs flex items-center space-x-1.5 self-start sm:self-auto whitespace-nowrap"
            >
              <span>Go to Workspace Dashboard →</span>
            </Link>
          )}
        </div>
        
        {/* ========================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#111126]">
                  Software Platform Intelligence
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  High-level monitoring of visitors, accounts, campaigns, and audience conversion.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSeedVisits}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6425E8] bg-[#6425E8]/10 hover:bg-[#6425E8]/20 rounded-xl transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Traffic Data</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-semibold text-[#111126] bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl transition shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 6 Core KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {/* Card 1: Unique Visitors */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden group">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Unique Visitors</span>
                  <Users className="w-4 h-4 text-[#6425E8]" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalUniqueVisitors || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-emerald-600 font-semibold">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{visitorStats?.uniqueToday || 0} today</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Page Views */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Impressions</span>
                  <Eye className="w-4 h-4 text-sky-500" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalVisits || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#73738A] font-medium">
                    <span>{visitorStats?.visitsToday || 0} page views today</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Registered Organizers */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Organizers / Users</span>
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalOrganizers || 1}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#73738A] font-medium">
                    <span>Active accounts</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Campaigns / Events */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Campaigns</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalEvents || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-emerald-600 font-semibold">
                    <span>{metrics?.publishedEvents || 0} published</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Attendees Generated */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Attendee Flyers</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalAttendees || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#73738A] font-medium">
                    <span>Customized self-service</span>
                  </div>
                </div>
              </div>

              {/* Card 6: Downloads & Conversion */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E8F0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[#73738A]">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Downloads / Conv.</span>
                  <Download className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#111126] font-mono tabular-nums">
                    {metrics?.totalDownloads || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-1 text-[11px] text-emerald-600 font-bold">
                    <span>{metrics?.conversionRate || 0}% overall conversion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Chart & Funnel Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Trend Preview */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#111126]">7-Day Visitor Velocity</h2>
                    <p className="text-[11px] text-[#73738A]">Daily impressions vs unique visitors across landing page and flyer links</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('visitors')}
                    className="text-xs text-[#6425E8] font-bold hover:underline flex items-center space-x-1"
                  >
                    <span>Deep Telemetry</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* SVG Responsive Bar Graph */}
                <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-[#E9E8F0]">
                  {visitorStats?.dailyTrends.map((trend) => {
                    const heightPercentVisits = Math.max(8, Math.round((trend.visits / maxTrendVisits) * 100));
                    const heightPercentUniques = Math.max(5, Math.round((trend.uniques / maxTrendVisits) * 100));
                    return (
                      <div key={trend.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-[#111126] text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-md">
                          {trend.label}: {trend.visits} visits ({trend.uniques} unique)
                        </div>

                        {/* Bars container */}
                        <div className="w-full flex items-end justify-center gap-1 h-32">
                          {/* Visits Bar */}
                          <div
                            style={{ height: `${heightPercentVisits}%` }}
                            className="w-1/2 max-w-[16px] bg-[#6425E8] rounded-t-sm transition-all duration-300 group-hover:bg-[#501bc5]"
                          />
                          {/* Uniques Bar */}
                          <div
                            style={{ height: `${heightPercentUniques}%` }}
                            className="w-1/2 max-w-[16px] bg-[#38BDF8] rounded-t-sm transition-all duration-300 group-hover:bg-[#0284C7]"
                          />
                        </div>
                        <span className="text-[10px] text-[#73738A] font-medium truncate max-w-[45px]">
                          {trend.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-[#73738A]">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-[#6425E8] rounded-xs" />
                      <span>Total Impressions</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-[#38BDF8] rounded-xs" />
                      <span>Unique Visitors</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono">
                    Updated real-time
                  </span>
                </div>
              </div>

              {/* Conversion Funnel Card */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#111126]">Audience Acquisition Funnel</h2>
                  <p className="text-[11px] text-[#73738A]">End-to-end participant conversion pipeline</p>

                  <div className="space-y-4 mt-5">
                    {/* Step 1: Visitors */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#111126]">1. Unique Visitors</span>
                        <span className="font-mono font-bold text-[#6425E8]">{metrics?.totalUniqueVisitors || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-[#F8F8FC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6425E8] w-full" />
                      </div>
                    </div>

                    {/* Step 2: Flyers Generated */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#111126]">2. Flyers Customized</span>
                        <span className="font-mono font-bold text-amber-600">{metrics?.totalAttendees || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-[#F8F8FC] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ 
                            width: `${metrics?.totalUniqueVisitors ? Math.min(100, Math.round(((metrics?.totalAttendees || 0) / metrics.totalUniqueVisitors) * 100)) : 0}%` 
                          }} 
                        />
                      </div>
                    </div>

                    {/* Step 3: Downloads Saved */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#111126]">3. Flyers Downloaded</span>
                        <span className="font-mono font-bold text-emerald-600">{metrics?.totalDownloads || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-[#F8F8FC] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${metrics?.conversionRate || 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0] text-center">
                  <span className="text-[11px] font-semibold text-[#73738A] block">Overall Platform Efficiency</span>
                  <span className="text-xl font-extrabold text-[#6425E8] font-mono">
                    {metrics?.conversionRate || 0}%
                  </span>
                  <p className="text-[10px] text-[#73738A] mt-0.5">Visitors who successfully downloaded their customized flyer</p>
                </div>
              </div>
            </div>

            {/* Recent CRM Attendee Activity Preview */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#E9E8F0] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#111126]">Latest Attendee Generations</h2>
                  <p className="text-[11px] text-[#73738A]">Recent participants who framed and saved event flyers</p>
                </div>
                <button
                  onClick={() => setActiveTab('crm')}
                  className="text-xs text-[#6425E8] font-bold hover:underline flex items-center space-x-1"
                >
                  <span>View All {attendees.length} Attendees</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {attendees.length === 0 ? (
                <div className="p-8 text-center text-[#73738A] text-xs">
                  No attendees have generated flyers yet. Once people visit your public links (e.g. <code>/e/worship-expression-40</code>), they will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                        <th className="px-6 py-3">Attendee Name</th>
                        <th className="px-6 py-3">Event Campaign</th>
                        <th className="px-6 py-3">Photo Uploaded</th>
                        <th className="px-6 py-3">Downloads</th>
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E8F0]">
                      {attendees.slice(0, 5).map((a) => (
                        <tr key={a.id} className="hover:bg-[#F8F8FC]/60 transition">
                          <td className="px-6 py-3.5 font-bold text-[#111126]">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                                {a.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span>{a.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-[#111126] font-medium">
                            {a.event_name}
                          </td>
                          <td className="px-6 py-3.5">
                            {a.photo_path ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                                Attached
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md">
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-[#111126]">
                            {a.downloads_count} ({a.download_formats.join(', ') || 'saved'})
                          </td>
                          <td className="px-6 py-3.5 text-[#73738A] font-mono text-[11px]">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {a.event_slug && (
                              <a
                                href={`/e/${a.event_slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#6425E8] hover:underline font-mono text-[11px]"
                              >
                                /e/{a.event_slug} →
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TRAFFIC & VISITOR TELEMETRY */}
        {/* ========================================================= */}
        {activeTab === 'visitors' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Visitor Traffic & Telemetry Log
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Tracks unique visits, path distribution, devices, and real-time impression requests.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSeedVisits}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6425E8] bg-[#6425E8]/10 hover:bg-[#6425E8]/20 rounded-xl transition"
                >
                  Generate Test Visits
                </button>
                <button
                  onClick={handleClearVisits}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Logs</span>
                </button>
              </div>
            </div>

            {/* Device and Path Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Device Distribution Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#73738A]">Device Classification</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-1.5 text-[#111126]">
                        <Smartphone className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span>Mobile</span>
                      </div>
                      <span className="font-mono font-bold text-[#111126]">
                        {visitorStats?.deviceBreakdown.mobile || 0}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F8F8FC] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#6425E8]" 
                        style={{ 
                          width: `${(visitorStats?.totalVisits || 0) > 0 ? Math.round(((visitorStats?.deviceBreakdown.mobile || 0) / (visitorStats?.totalVisits || 1)) * 100) : 0}%` 
                        }} 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-1.5 text-[#111126]">
                        <Monitor className="w-3.5 h-3.5 text-sky-500" />
                        <span>Desktop</span>
                      </div>
                      <span className="font-mono font-bold text-[#111126]">
                        {visitorStats?.deviceBreakdown.desktop || 0}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F8F8FC] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sky-500" 
                        style={{ 
                          width: `${(visitorStats?.totalVisits || 0) > 0 ? Math.round(((visitorStats?.deviceBreakdown.desktop || 0) / (visitorStats?.totalVisits || 1)) * 100) : 0}%` 
                        }} 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-1.5 text-[#111126]">
                        <Tablet className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tablet</span>
                      </div>
                      <span className="font-mono font-bold text-[#111126]">
                        {visitorStats?.deviceBreakdown.tablet || 0}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F8F8FC] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ 
                          width: `${(visitorStats?.totalVisits || 0) > 0 ? Math.round(((visitorStats?.deviceBreakdown.tablet || 0) / (visitorStats?.totalVisits || 1)) * 100) : 0}%` 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Visited Routes */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#73738A]">Top Visited Routes</h3>
                <div className="divide-y divide-[#E9E8F0]">
                  {Object.entries(visitorStats?.visitsByPath || {}).map(([path, count]) => (
                    <div key={path} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-3.5 h-3.5 text-[#6425E8]" />
                        <span className="font-mono text-[#111126] font-medium">{path}</span>
                      </div>
                      <span className="font-mono font-bold px-2 py-0.5 bg-[#F8F8FC] rounded-md text-[#111126]">
                        {count} views
                      </span>
                    </div>
                  ))}
                  {Object.keys(visitorStats?.visitsByPath || {}).length === 0 && (
                    <p className="text-xs text-[#73738A] py-4">No visits recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Live Real-time Stream */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#E9E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#73738A]">Live Visitor Stream</h3>
                  <p className="text-[11px] text-[#73738A]">Latest incoming impressions recorded by the platform</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-[#6425E8]/10 text-[#6425E8] rounded-lg">
                  {visitorStats?.recentVisits.length || 0} recent requests
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Visitor ID</th>
                      <th className="px-6 py-3">Route / Path</th>
                      <th className="px-6 py-3">Device</th>
                      <th className="px-6 py-3">Browser</th>
                      <th className="px-6 py-3">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {(visitorStats?.recentVisits || []).map((v) => (
                      <tr key={v.id} className="hover:bg-[#F8F8FC]/60 transition">
                        <td className="px-6 py-3 text-[#73738A] font-mono tabular-nums">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-3 font-mono text-[#6425E8]">
                          {v.visitor_id.substring(0, 14)}...
                        </td>
                        <td className="px-6 py-3 font-mono font-medium text-[#111126]">
                          {v.path}
                        </td>
                        <td className="px-6 py-3">
                          <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-semibold text-gray-700">
                            {v.device_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[#73738A]">
                          {v.browser || 'Browser'}
                        </td>
                        <td className="px-6 py-3 text-[#73738A] font-mono text-[11px] truncate max-w-[140px]">
                          {v.referrer ? new URL(v.referrer).hostname : 'Direct'}
                        </td>
                      </tr>
                    ))}
                    {(visitorStats?.recentVisits || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[#73738A]">
                          No telemetry recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ATTENDEE CRM DIRECTORY */}
        {/* ========================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Global Attendee CRM ({attendees.length})
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Complete directory of participants across all campaigns with exportable contact records.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV Directory</span>
                </button>
              </div>
            </div>

            {/* Search and Event Filters */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-xs flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                <input
                  type="text"
                  placeholder="Search attendee by name, event title, or slug..."
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-hidden focus:border-[#6425E8]"
                />
              </div>

              <div className="w-full sm:w-64">
                <select
                  value={crmEventFilter}
                  onChange={(e) => setCrmEventFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-hidden focus:border-[#6425E8]"
                >
                  <option value="all">All Event Campaigns</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.event_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendee CRM Table */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                      <th className="px-6 py-3.5">Attendee Name</th>
                      <th className="px-6 py-3.5">Campaign Event</th>
                      <th className="px-6 py-3.5">Photo Status</th>
                      <th className="px-6 py-3.5">Downloads Count</th>
                      <th className="px-6 py-3.5">Export Formats</th>
                      <th className="px-6 py-3.5">Created Date</th>
                      <th className="px-6 py-3.5 text-right">Event Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {filteredAttendees.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F8F8FC]/60 transition">
                        <td className="px-6 py-3.5 font-bold text-[#111126]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                              {a.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span>{a.full_name}</span>
                              <span className="block text-[10px] text-[#73738A] font-normal font-mono">
                                ID: {a.id.slice(-8)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-medium text-[#111126]">
                          {a.event_name}
                        </td>
                        <td className="px-6 py-3.5">
                          {a.photo_path ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                              Photo Attached
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md">
                              No Photo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-[#111126]">
                          {a.downloads_count}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center space-x-1">
                            {a.download_formats.map((fmt) => (
                              <span key={fmt} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] uppercase font-bold font-mono">
                                {fmt}
                              </span>
                            ))}
                            {a.download_formats.length === 0 && (
                              <span className="text-[#73738A] text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-[#73738A] font-mono text-[11px]">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {a.event_slug && (
                            <a
                              href={`/e/${a.event_slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#6425E8] hover:underline font-mono text-[11px]"
                            >
                              /e/{a.event_slug} →
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredAttendees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#73738A]">
                          No attendees match your search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: ORGANIZERS & USER ACCOUNTS */}
        {/* ========================================================= */}
        {activeTab === 'organizers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Registered Organizers & Accounts ({organizers.length})
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Directory of software users, their workspaces, and campaign throughput.
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-xs">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                <input
                  type="text"
                  placeholder="Search user accounts by name, email, or organisation..."
                  value={organizerSearch}
                  onChange={(e) => setOrganizerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-hidden focus:border-[#6425E8]"
                />
              </div>
            </div>

            {/* Organizers Table */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                      <th className="px-6 py-3.5">Organizer</th>
                      <th className="px-6 py-3.5">Email Address</th>
                      <th className="px-6 py-3.5">Workspace Organisation</th>
                      <th className="px-6 py-3.5">Campaigns Created</th>
                      <th className="px-6 py-3.5">Attendees Acquired</th>
                      <th className="px-6 py-3.5">Downloads</th>
                      <th className="px-6 py-3.5">Member Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {filteredOrganizers.map((org) => (
                      <tr key={org.id} className="hover:bg-[#F8F8FC]/60 transition">
                        <td className="px-6 py-3.5 font-bold text-[#111126]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center font-bold text-xs">
                              {org.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span>{org.full_name}</span>
                              {org.email.includes('marv') && (
                                <span className="ml-1.5 px-1.5 py-0.2 bg-[#6425E8]/10 text-[#6425E8] rounded text-[9px] font-bold uppercase">
                                  Owner
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[#73738A]">
                          {org.email}
                        </td>
                        <td className="px-6 py-3.5 text-[#111126] font-medium">
                          {org.org_name}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-[#111126]">
                          {org.events_count}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-amber-600">
                          {org.total_attendees}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-emerald-600">
                          {org.total_downloads}
                        </td>
                        <td className="px-6 py-3.5 text-[#73738A] font-mono text-[11px]">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filteredOrganizers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-[#73738A]">
                          No organizers match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CAMPAIGNS CMS */}
        {/* ========================================================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                  Platform Campaigns CMS ({events.length})
                </h1>
                <p className="text-xs text-[#73738A] mt-1">
                  Manage all active, published, and draft event flyer campaigns hosted on Eventra.
                </p>
              </div>

              <Link
                to="/create-event"
                className="px-4 py-2 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                + Create New Campaign
              </Link>
            </div>

            {/* Search Input */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-xs">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#73738A]" />
                <input
                  type="text"
                  placeholder="Search campaigns by name, venue, or slug..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-hidden focus:border-[#6425E8]"
                />
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E8F0] text-[#73738A] bg-[#F8F8FC] font-semibold">
                      <th className="px-6 py-3.5">Campaign Name</th>
                      <th className="px-6 py-3.5">Public URL Slug</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Venue / Date</th>
                      <th className="px-6 py-3.5">Created Date</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E8F0]">
                    {filteredCampaigns.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#F8F8FC]/60 transition">
                        <td className="px-6 py-3.5 font-bold text-[#111126]">
                          {ev.event_name}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[#6425E8]">
                          /e/{ev.slug}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            ev.status === 'published' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[#73738A]">
                          {ev.venue || 'Virtual / Online'}
                        </td>
                        <td className="px-6 py-3.5 text-[#73738A] font-mono text-[11px]">
                          {new Date(ev.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleCopyLink(ev.slug)}
                              className="p-1.5 hover:bg-[#F8F8FC] text-[#73738A] hover:text-[#111126] rounded-lg transition"
                              title="Copy public link"
                            >
                              {copiedSlug === ev.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <a
                              href={`/e/${ev.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-[#6425E8]/10 text-[#6425E8] hover:bg-[#6425E8]/20 rounded-lg font-bold text-[11px] transition inline-flex items-center space-x-1"
                            >
                              <span>Launch</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                            <Link
                              to={`/editor/${ev.id}`}
                              className="px-2.5 py-1 bg-white border border-[#E9E8F0] text-[#111126] hover:bg-[#F8F8FC] rounded-lg font-semibold text-[11px] transition"
                            >
                              Edit Template
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-[#73738A]">
                          No campaigns found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: HEALTH & DIAGNOSTICS */}
        {/* ========================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111126]">
                System Architecture & Storage Diagnostics
              </h1>
              <p className="text-xs text-[#73738A] mt-1">
                Overview of storage engines, telemetry buffer capacity, and database synchronization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Storage Diagnostic Card */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#6425E8]/10 text-[#6425E8] rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111126]">Hybrid Storage Engine</h3>
                    <p className="text-xs text-[#73738A]">IndexedDB Large Image Vault + Persistent Local/Cloud Store</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#E9E8F0]">
                    <span className="text-[#73738A]">Events In Database</span>
                    <span className="font-mono font-bold text-[#111126]">{events.length} records</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#E9E8F0]">
                    <span className="text-[#73738A]">Attendee CRM Records</span>
                    <span className="font-mono font-bold text-[#111126]">{attendees.length} records</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#E9E8F0]">
                    <span className="text-[#73738A]">Visitor Logs Buffered</span>
                    <span className="font-mono font-bold text-[#111126]">{visitorStats?.totalVisits || 0} events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-[#73738A]">IndexedDB Image Storage</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md text-[10px]">
                      Operational (Zero Quota Warnings)
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Actions Card */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111126]">Platform Backups & Actions</h3>
                    <p className="text-xs text-[#73738A]">Snapshot exports and telemetry management tools</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center justify-between p-3 bg-[#F8F8FC] hover:bg-[#6425E8]/10 text-xs font-semibold text-[#111126] rounded-xl transition border border-[#E9E8F0]"
                  >
                    <span>Download Full Platform State (JSON)</span>
                    <Download className="w-4 h-4 text-[#6425E8]" />
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-between p-3 bg-[#F8F8FC] hover:bg-[#6425E8]/10 text-xs font-semibold text-[#111126] rounded-xl transition border border-[#E9E8F0]"
                  >
                    <span>Download Attendee CRM Directory (CSV)</span>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </button>

                  <button
                    onClick={handleClearVisits}
                    className="w-full flex items-center justify-between p-3 bg-rose-50/60 hover:bg-rose-100 text-xs font-semibold text-rose-700 rounded-xl transition border border-rose-200/50"
                  >
                    <span>Reset Telemetry & Visitor History</span>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

