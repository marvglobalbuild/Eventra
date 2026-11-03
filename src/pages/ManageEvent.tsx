import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  db, initializeLocalData, exportEventRegistrationsToCSV, exportEventInvitationsToCSV 
} from '../lib/storage-and-db';
import { 
  FlyerEvent, EventRegistration, EventInvitation, RegistrationFormConfig 
} from '../types/database';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Mail, FileText, Layers, Settings, BarChart3, 
  ExternalLink, Copy, Check, Plus, Search, Download, 
  Trash2, AlertCircle, CheckCircle2, XCircle, ArrowLeft,
  Share2, Eye, Shield, Globe, Lock, MessageCircle
} from 'lucide-react';

export const ManageEvent: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, isHost, becomeHost } = useAuth();

  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendees' | 'invitations' | 'form' | 'create' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Attendees State
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState<string>('all');

  // Invitations State
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [isAddInviteOpen, setIsAddInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  // Form Builder State
  const [formConfig, setFormConfig] = useState<RegistrationFormConfig | null>(null);

  // Settings Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editFormat, setEditFormat] = useState<'physical' | 'online' | 'hybrid'>('physical');
  const [editOnlineUrl, setEditOnlineUrl] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [editStatus, setEditStatus] = useState<FlyerEvent['status']>('published');
  const [editCapacity, setEditCapacity] = useState(500);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFlyerLink, setCopiedFlyerLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  useEffect(() => {
    const load = async () => {
      await initializeLocalData();
      if (!eventId) {
        setLoading(false);
        return;
      }

      const ev = db.getEventById(eventId);
      if (ev) {
        setEvent(ev);
        setEditTitle(ev.title || ev.event_name);
        setEditDescription(ev.description || '');
        setEditCategory(ev.category || 'Other');
        setEditDate(ev.event_date || '');
        setEditStartTime(ev.start_time || '');
        setEditEndTime(ev.end_time || '');
        setEditTimezone(ev.timezone || 'UTC');
        setEditVenue(ev.venue || '');
        setEditAddress(ev.address || '');
        setEditCity(ev.city || '');
        setEditCountry(ev.country || '');
        setEditFormat(ev.event_type || 'physical');
        setEditOnlineUrl(ev.online_url || '');
        setEditVisibility(ev.visibility || 'public');
        setEditStatus(ev.status || 'published');
        setEditCapacity(ev.capacity || 500);

        setRegistrations(db.getRegistrations(ev.id));
        setInvitations(db.getInvitations(ev.id));
        setFormConfig(db.getRegistrationFormConfig(ev.id));
      }
      setLoading(false);
    };
    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#6425E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111126]">Host Access Required</h2>
            <p className="text-xs text-[#73738A] leading-relaxed">
              Event management is restricted to authorized event hosts. Activate your host experience to manage events.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await becomeHost();
                }}
                className="w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Activate Host Experience
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <h2 className="text-xl font-bold text-[#111126]">Event Not Found</h2>
            <Link to="/dashboard" className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Real Stats from Database
  const confirmedAttendees = registrations.filter((r) => r.status === 'confirmed').length;
  const pendingRegistrations = registrations.filter((r) => r.status === 'pending').length;
  const acceptedRSVPs = invitations.filter((i) => i.rsvp_response === 'accepted').length;
  const pendingRSVPs = invitations.filter((i) => i.rsvp_response === 'pending' || !i.rsvp_response).length;
  const flyerDownloads = db.getDownloads().filter((d) => d.event_id === event.id).length;
  const analytics = db.getEventAnalytics(event.id);

  // Filter attendees
  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch = 
      (r.first_name || '').toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      (r.last_name || '').toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      (r.registration_reference || '').toLowerCase().includes(attendeeSearch.toLowerCase());
    const matchesStatus = attendeeStatusFilter === 'all' || r.status === attendeeStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyPublicLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/events/${event.slug || event.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyInviteToken = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleExportAttendeesCSV = () => {
    const csv = exportEventRegistrationsToCSV(registrations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.slug || 'event'}-attendees.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvitationsCSV = () => {
    const csv = exportEventInvitationsToCSV(invitations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.slug || 'event'}-invitations.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const token = `${event.slug || 'event'}-${Math.random().toString(36).substring(2, 9)}`;
    const newInv = db.saveInvitation({
      event_id: event.id,
      invited_name: inviteName.trim(),
      invited_email: inviteEmail.trim(),
      invited_phone: invitePhone.trim() || undefined,
      invitation_token: token,
      message: inviteMessage.trim() || undefined,
      status: 'sent',
      rsvp_response: 'pending',
      guest_count: 1,
    });

    setInvitations([newInv, ...invitations]);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteMessage('');
    setIsAddInviteOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = db.saveEvent({
      ...event,
      event_name: editTitle,
      title: editTitle,
      description: editDescription,
      category: editCategory,
      event_date: editDate,
      start_time: editStartTime,
      end_time: editEndTime,
      timezone: editTimezone,
      venue: editVenue,
      address: editAddress,
      city: editCity,
      country: editCountry,
      event_type: editFormat,
      online_url: editOnlineUrl,
      visibility: editVisibility,
      status: editStatus,
      capacity: editCapacity,
      updated_at: new Date().toISOString(),
    });

    setEvent(updated);
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      {/* Top Workspace Header */}
      <div className="bg-white border-b border-[#E9E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="text-xs font-semibold text-[#73738A] hover:text-[#111126] flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>My Events</span>
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-xs font-bold text-[#6425E8] uppercase tracking-wider">
                  Event Workspace
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#111126]">{event.title || event.event_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#73738A]">
                <span className="capitalize font-semibold text-[#111126] bg-[#F8F8FC] px-2.5 py-0.5 rounded-md border border-[#E9E8F0]">
                  Status: {event.status}
                </span>
                <span className="capitalize font-semibold text-[#111126] bg-[#F8F8FC] px-2.5 py-0.5 rounded-md border border-[#E9E8F0] flex items-center gap-1">
                  {event.visibility === 'public' ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                  <span>{event.visibility}</span>
                </span>
                <span>Date: {event.event_date || 'TBA'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="px-3.5 py-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] rounded-xl text-xs font-semibold text-[#111126] flex items-center gap-1.5 transition shadow-2xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Public Link'}</span>
              </button>

              <Link
                to={`/events/${event.slug || event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-[#111126] hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>View Event Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-[#F0F0F5] overflow-x-auto scrollbar-none">
            {[
              { key: 'overview', label: 'Overview & Stats', icon: BarChart3 },
              { key: 'attendees', label: `Attendees (${registrations.length})`, icon: Users },
              { key: 'invitations', label: `Invitations (${invitations.length})`, icon: Mail },
              { key: 'form', label: 'Registration Settings', icon: FileText },
              { key: 'create', label: 'Eventra Create (Flyer)', icon: Layers },
              { key: 'settings', label: 'Event Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`pb-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-[#6425E8] text-[#6425E8]'
                      : 'border-transparent text-[#73738A] hover:text-[#111126]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Real Supabase Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Registrations</span>
                <p className="text-2xl font-extrabold text-[#111126]">{registrations.length}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">{confirmedAttendees} Confirmed</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Capacity</span>
                <p className="text-2xl font-extrabold text-[#111126]">{event.capacity || 500}</p>
                <span className="text-[11px] text-[#73738A] font-semibold">
                  {Math.max(0, (event.capacity || 500) - confirmedAttendees)} Remaining
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Invitations Sent</span>
                <p className="text-2xl font-extrabold text-[#111126]">{invitations.length}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">{acceptedRSVPs} Accepted</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Pending RSVPs</span>
                <p className="text-2xl font-extrabold text-[#111126]">{pendingRSVPs}</p>
                <span className="text-[11px] text-[#73738A]">Awaiting Response</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Flyer Downloads</span>
                <p className="text-2xl font-extrabold text-[#6425E8]">{flyerDownloads}</p>
                <span className="text-[11px] text-[#73738A]">From Eventra Create</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73738A]">Page Views</span>
                <p className="text-2xl font-extrabold text-[#111126]">{analytics.views}</p>
                <span className="text-[11px] text-[#73738A]">Tracked visits</span>
              </div>
            </div>

            {/* Quick Access Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Event Page Banner */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#6425E8]" />
                    <h3 className="text-sm font-bold text-[#111126]">Public Event Website</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </div>
                <p className="text-xs text-[#555567] leading-relaxed">
                  Your standalone event website with programme schedule, FAQs, Google Maps directions, and online registration.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to={`/events/${event.slug || event.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <span>Open Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyPublicLink}
                    className="px-4 py-2 border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              {/* Eventra Create Hub Banner */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#6425E8]" />
                    <h3 className="text-sm font-bold text-[#111126]">Eventra Create Flyer Link</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-xs text-[#555567] leading-relaxed">
                  Self-service personalised flyer generator for your participants. They upload their photo and enter their name.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to={`/e/${event.slug || event.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#111126] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <span>Participant Flyer Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/editor/${event.id}`}
                    className="px-4 py-2 border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <span>Configure Coordinates</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDEES TAB */}
        {activeTab === 'attendees' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xs overflow-hidden animate-fade-in">
            {/* Filter & Export Toolbar */}
            <div className="p-4 sm:p-6 border-b border-[#E9E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-[#73738A] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search attendee name, email, or reference..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <select
                  value={attendeeStatusFilter}
                  onChange={(e) => setAttendeeStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportAttendeesCSV}
                className="px-4 py-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs shrink-0"
              >
                <Download className="w-4 h-4 text-[#6425E8]" />
                <span>Export Attendee CSV</span>
              </button>
            </div>

            {/* Attendees Table */}
            {filteredRegistrations.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#73738A] space-y-2">
                <Users className="w-8 h-8 text-[#73738A] mx-auto opacity-50" />
                <p className="font-bold text-[#111126]">No registered attendees found</p>
                <p>When visitors register through your public page, their records appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8FC] border-b border-[#E9E8F0] text-[#73738A] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Attendee Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F5]">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-[#F8F8FC]/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#6425E8]">
                          {reg.registration_reference}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#111126]">
                          {reg.first_name} {reg.last_name}
                        </td>
                        <td className="py-3 px-4 text-[#555567]">{reg.email}</td>
                        <td className="py-3 px-4 text-[#73738A]">{reg.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            reg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            reg.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#73738A]">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {reg.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                db.updateRegistrationStatus(reg.id, 'confirmed');
                                setRegistrations(db.getRegistrations(event.id));
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                          )}
                          {reg.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Cancel registration for ${reg.first_name}?`)) {
                                  db.updateRegistrationStatus(reg.id, 'cancelled');
                                  setRegistrations(db.getRegistrations(event.id));
                                }
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-semibold transition"
                            >
                              Cancel
                            </button>
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

        {/* INVITATIONS TAB (EVENTRA INVITE) */}
        {activeTab === 'invitations' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111126]">Digital Invitations & RSVP</h3>
                <p className="text-xs text-[#73738A]">
                  Send high-entropy unique invitation tokens to VIP guests and track responses.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportInvitationsCSV}
                  className="px-3.5 py-2 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-4 h-4 text-[#6425E8]" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddInviteOpen(true)}
                  className="px-3.5 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Invited Guest</span>
                </button>
              </div>
            </div>

            {/* Add Guest Modal */}
            {isAddInviteOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#E9E8F0] p-6 space-y-4 animate-scale-up">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#111126]">Create Digital Invitation</h4>
                    <button type="button" onClick={() => setIsAddInviteOpen(false)} className="text-[#73738A] hover:text-[#111126]">
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleCreateInvite} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        Guest Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="e.g. Pastor Emmanuel Bassey"
                        className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="e.g. pastor@example.org"
                        className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                        placeholder="+234..."
                        className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        Personalised Message
                      </label>
                      <textarea
                        rows={2}
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="We are deeply honored to invite you as our special guest..."
                        className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddInviteOpen(false)}
                        className="px-4 py-2 border border-[#E9E8F0] text-xs font-semibold text-[#73738A] rounded-xl hover:bg-[#F8F8FC]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl"
                      >
                        Generate Invitation
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Invitations List Table */}
            <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xs overflow-hidden">
              {invitations.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#73738A] space-y-2">
                  <Mail className="w-8 h-8 text-[#73738A] mx-auto opacity-50" />
                  <p className="font-bold text-[#111126]">No invitations created yet</p>
                  <p>Click "Add Invited Guest" above to generate unique invitation links for your VIPs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F8FC] border-b border-[#E9E8F0] text-[#73738A] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Guest Name</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">RSVP Status</th>
                        <th className="py-3 px-4">Party Size</th>
                        <th className="py-3 px-4">Dietary Notes</th>
                        <th className="py-3 px-4 text-right">Invitation Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F5]">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#F8F8FC]/60 transition">
                          <td className="py-3 px-4 font-semibold text-[#111126]">
                            {inv.invited_name}
                          </td>
                          <td className="py-3 px-4 text-[#73738A]">{inv.invited_email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.rsvp_response === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              inv.rsvp_response === 'declined' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              inv.rsvp_response === 'maybe' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {inv.rsvp_response || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#111126] font-semibold">{inv.guest_count || 1}</td>
                          <td className="py-3 px-4 text-[#73738A]">{inv.dietary_preferences || '—'}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleCopyInviteToken(inv.invitation_token)}
                              className="px-2.5 py-1 border border-[#E9E8F0] rounded-lg text-[11px] font-semibold hover:bg-[#F8F8FC] text-[#111126]"
                            >
                              {copiedToken === inv.invitation_token ? 'Copied!' : 'Copy Link'}
                            </button>
                            <a
                              href={`/invite/${inv.invitation_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-[#F8F8FC] hover:bg-[#EEF0F6] text-[#6425E8] rounded-lg text-[11px] font-semibold"
                            >
                              Open
                            </a>
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

        {/* REGISTRATION FORM BUILDER TAB */}
        {activeTab === 'form' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-6 max-w-3xl animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-[#111126]">Eventra Register — Registration Form Builder</h3>
              <p className="text-xs text-[#73738A]">
                Customize questions asked to attendees when registering for your event.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0] space-y-2">
                <span className="text-xs font-bold text-[#111126]">Standard Form Fields (Included by Default)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#555567]">
                  <span className="p-2 bg-white rounded-lg border border-[#E9E8F0]">First Name (Required)</span>
                  <span className="p-2 bg-white rounded-lg border border-[#E9E8F0]">Last Name (Required)</span>
                  <span className="p-2 bg-white rounded-lg border border-[#E9E8F0]">Email Address (Required)</span>
                  <span className="p-2 bg-white rounded-lg border border-[#E9E8F0]">Phone Number (Optional)</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="space-y-0.5">
                  <p className="font-bold">Instant Attendee Confirmation</p>
                  <p className="text-[11px]">Attendees receive unique reference codes (e.g. EVT-XXXXX) upon form submission.</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* EVENTRA CREATE FLYER TAB */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F0F0F5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8]">
                  Integrated Product Capability
                </span>
                <h3 className="text-lg font-bold text-[#111126]">Eventra Create — Personalised Attendee Flyers</h3>
                <p className="text-xs text-[#73738A] max-w-xl">
                  Allow your attendees to upload their photo and name to generate customized high-resolution flyers in seconds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/editor/${event.id}`}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure Flyer Coordinates</span>
                </Link>
                <Link
                  to={`/e/${event.slug || event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#111126] hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition"
                >
                  <span>Participant Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3 text-xs text-[#555567]">
                <h4 className="font-bold text-sm text-[#111126]">How it works:</h4>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>Organiser uploads the high-resolution event artwork.</li>
                  <li>In the Template Editor, define the photo crop circle and name badge box.</li>
                  <li>Share the public participant link with your audience across WhatsApp & Instagram.</li>
                  <li>Attendees open the link, upload their photo, and download in PNG, JPG, or PDF!</li>
                </ol>
              </div>

              <div className="p-4 bg-[#F8F8FC] rounded-2xl border border-[#E9E8F0] space-y-2 text-center">
                <span className="text-xs font-bold text-[#111126]">Public Sharing URL</span>
                <p className="font-mono text-xs text-[#6425E8] bg-white p-2 rounded-xl border border-[#E9E8F0] truncate select-all">
                  {window.location.origin}/e/{event.slug || event.id}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/e/${event.slug || event.id}`);
                    setCopiedFlyerLink(true);
                    setTimeout(() => setCopiedFlyerLink(false), 2500);
                  }}
                  className="text-xs font-semibold text-[#6425E8] hover:underline cursor-pointer"
                >
                  {copiedFlyerLink ? '✓ Copied participant flyer link!' : 'Click to copy participant flyer link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-[#E9E8F0] p-6 sm:p-8 shadow-2xs space-y-6 max-w-4xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F5]">
              <div>
                <h3 className="text-base font-bold text-[#111126]">Event Details & Settings</h3>
                <p className="text-xs text-[#73738A]">
                  Manage event information, publication status, and visibility.
                </p>
              </div>
              {savedSettingsNotice && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-scale-up">
                  Changes saved successfully!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Event Description
                  </label>
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Event Category
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Attendee Capacity
                  </label>
                  <input
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Start & End Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Start Time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white"
                    />
                    <input
                      type="text"
                      placeholder="End Time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Visibility (Section 3.2)
                  </label>
                  <select
                    value={editVisibility}
                    onChange={(e: any) => setEditVisibility(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white font-semibold"
                  >
                    <option value="public">Public (Appears on Eventra Discover)</option>
                    <option value="unlisted">Unlisted (Accessible by link only)</option>
                    <option value="private">Private (Restricted to authorised organisers & guests)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Publication Status (Section 3.3)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white font-semibold"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Save Event Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
