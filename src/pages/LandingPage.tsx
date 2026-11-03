import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, Upload, MousePointerClick, Download, 
  Share2, ShieldCheck, CheckCircle2, Check, Zap, Layers, RefreshCw, Eye,
  Compass, Ticket, QrCode, Image as ImageIcon, Send, Users, ChevronRight,
  Building2, Menu, X, Play, Sparkles
} from 'lucide-react';

import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { useAuth } from '../context/AuthContext';
import { PLATFORM_MODULES } from '../lib/modules';
import { ModulePreviewModal } from '../components/ModulePreviewModal';
import { FeatureModule } from '../types/database';
import { db } from '../lib/storage-and-db';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<'original' | 'upload' | 'completed'>('completed');

  useEffect(() => {
    db.recordVisit('/');
  }, []);
  
  // Interactive live demo states
  const [demoName, setDemoName] = useState('Elena Rostova');
  const [demoAvatar, setDemoAvatar] = useState<'elena' | 'marcus' | 'sarah'>('elena');
  const [demoRole, setDemoRole] = useState('Confirmed Speaker');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Modal state for platform vision preview
  const [selectedModule, setSelectedModule] = useState<FeatureModule | null>(null);

  const avatarPresets = {
    elena: {
      initials: 'ER',
      name: 'Elena Rostova',
      gradient: 'from-[#6425E8] to-[#9638F5]',
      border: 'border-purple-300',
    },
    marcus: {
      initials: 'MC',
      name: 'Marcus Chen',
      gradient: 'from-[#0284C7] to-[#38BDF8]',
      border: 'border-sky-300',
    },
    sarah: {
      initials: 'ST',
      name: 'Sarah Taylor',
      gradient: 'from-[#D946EF] to-[#F43F5E]',
      border: 'border-pink-300',
    },
  };

  const handleGenerateDemo = () => {
    setDemoStep('completed');
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#6425E8', '#9638F5', '#38BDF8', '#10B981'],
      });
    } catch {}
  };

  const handleDownloadDemo = () => {
    setDownloadSuccess(true);
    try {
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.65 },
        colors: ['#6425E8', '#10B981', '#F59E0B', '#EC4899'],
      });
    } catch {}
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const openModulePreview = (moduleKey: string) => {
    const mod = PLATFORM_MODULES.find((m) => m.module_key === moduleKey);
    if (mod) setSelectedModule(mod);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Top Bar: Full-width sticky header with entrance animation and glass blur */}
      <header className="sticky top-0 z-40 w-full bg-[#F8F8FC]/90 backdrop-blur-md border-b border-[#E9E8F0]/80 animate-fade-in-down">
        <div className="h-20 max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Zone 1: Wordmark */}
          <Link to="/" className="whitespace-nowrap shrink-0 hover:opacity-90 transition">
            <EventraLogo variant="with-tagline" size="md" />
          </Link>

          {/* Zone 2: Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#5A5A72]">
            <Link to="/discover" className="text-[#6425E8] hover:text-[#4214B8] font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#6425E8]" />
              <span>Discover Events</span>
            </Link>
            <a href="#eventra-create" className="hover:text-[#6425E8] transition-colors whitespace-nowrap shrink-0">
              Eventra Create
            </a>
            <a href="#roadmap" className="hover:text-[#6425E8] transition-colors whitespace-nowrap shrink-0">
              Platform Modules
            </a>
            <a href="#how-it-works" className="hover:text-[#6425E8] transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <Link
                to="/dashboard"
                className="interactive-btn px-4 py-2 text-sm font-semibold text-white bg-[#6425E8] hover:bg-[#4214B8] rounded-xl shadow-xs transition whitespace-nowrap shrink-0 flex items-center space-x-1.5"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="hidden sm:inline text-sm font-semibold text-[#5A5A72] hover:text-[#111126] transition whitespace-nowrap px-2 py-1"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="interactive-btn px-4 py-2 text-sm font-semibold text-white bg-[#6425E8] hover:bg-[#4214B8] rounded-xl shadow-xs transition whitespace-nowrap shrink-0"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#5A5A72] hover:text-[#111126] hover:bg-white rounded-xl border border-[#E9E8F0] transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E9E8F0] px-6 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/discover"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-[#6425E8] py-2 flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-[#6425E8]" />
              <span>Discover Events Marketplace</span>
            </Link>
            <a
              href="#eventra-create"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#5A5A72] hover:text-[#6425E8] py-2"
            >
              Eventra Create (Flyer Studio)
            </a>
            <a
              href="#roadmap"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#5A5A72] hover:text-[#6425E8] py-2"
            >
              Platform Vision
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#5A5A72] hover:text-[#6425E8] py-2"
            >
              How It Works
            </a>
            {!user && (
              <div className="pt-2 border-t border-[#E9E8F0] flex items-center justify-between">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-[#5A5A72] hover:text-[#111126]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 bg-[#6425E8] text-white text-sm font-semibold rounded-xl"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section with Ambient Lighting & Staggered Entrance Animations */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-18 lg:pt-20 pb-20 sm:pb-24 text-center relative">
        {/* Ambient Gradient Glow Mesh */}
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-[620px] h-[340px] bg-gradient-to-tr from-[#6425E8]/12 via-[#8B5CF6]/8 to-[#EC4899]/6 blur-3xl -z-10 rounded-full animate-fade-in" />

        {/* Floating System Badges - Lively micro-motion and comfortable header clearance */}
        <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-white/95 backdrop-blur-md border border-[#E9E8F0] hover:border-[#6425E8]/40 hover:shadow-md rounded-2xl shadow-xs text-sm font-semibold text-[#111126] absolute top-10 lg:top-12 left-4 xl:-left-6 transition-all duration-300 animate-float-slow group cursor-default animate-fade-in delay-200">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="group-hover:text-[#6425E8] transition-colors">Self-Service Participant Engine</span>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-white/95 backdrop-blur-md border border-[#E9E8F0] hover:border-[#6425E8]/40 hover:shadow-md rounded-2xl shadow-xs text-sm font-semibold text-[#111126] absolute top-16 lg:top-20 right-4 xl:-right-6 transition-all duration-300 animate-float-delayed group cursor-default animate-fade-in delay-250">
          <Zap className="w-4 h-4 text-[#6425E8]" />
          <span className="group-hover:text-[#6425E8] transition-colors">High-Resolution Canvas Export</span>
        </div>

        {/* Brand Kicker with Pulse Dot - Entrance animation */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6425E8]/10 text-[#6425E8] border border-[#6425E8]/20 text-sm font-bold mb-5 hover:bg-[#6425E8]/15 hover:scale-[1.02] transition-all cursor-default shadow-xs animate-fade-in-up delay-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6425E8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6425E8]"></span>
          </span>
          <span className="tracking-wide">Events. Elevated.</span>
        </div>

        {/* Headline with Refined Proportions, Gradient Styling & Staggered Entrance */}
        <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-[#111126] leading-[1.18] max-w-3xl mx-auto animate-fade-in-up delay-150" style={{ textWrap: 'balance' }}>
          Everything your event needs.<br className="hidden sm:inline" />{' '}
          <span className="relative inline-block mt-1 sm:mt-0">
            <span className="bg-gradient-to-r from-[#6425E8] via-[#823BF8] to-[#C026D3] bg-clip-text text-transparent drop-shadow-xs">
              All in one place.
            </span>
            <span className="absolute left-0 -bottom-1 w-full h-[3px] bg-gradient-to-r from-[#6425E8] via-[#823BF8] to-transparent rounded-full opacity-60" />
          </span>
        </h1>

        {/* Subtitle - Readable text size with entrance animation */}
        <p className="mt-5 text-base sm:text-lg text-[#525266] max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200" style={{ textWrap: 'balance' }}>
          Create, promote, and elevate your events with a smarter self-service platform designed for organizers and participants who love clean, instant flyers.
        </p>

        {/* Interactive CTAs with entrance animation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 animate-fade-in-up delay-250">
          <Link
            to="/discover"
            className="interactive-btn group relative overflow-hidden w-full sm:w-auto px-7 py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-[#6425E8]/25 transition-all flex items-center justify-center space-x-2"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Events</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/create-event"
            className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-[#111126] hover:bg-black text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center space-x-2"
          >
            <span>Create an Event</span>
          </Link>
          <Link
            to="/e/worship-expression-40"
            className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E9E8F0] hover:border-[#6425E8]/50 text-[#111126] font-semibold text-sm rounded-xl hover:bg-[#F8F8FC] transition shadow-xs flex items-center justify-center space-x-2 group"
          >
            <Sparkles className="w-4 h-4 text-[#6425E8]" />
            <span>Generate Live Attendee Flyer</span>
          </Link>
        </div>

        {/* SPOTLIGHT MODULE: EVENTRA CREATE (Interactive Demo Engine) */}
        <section id="eventra-create" className="mt-20 bg-white border border-[#E9E8F0] rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto text-left relative overflow-hidden animate-fade-in-up delay-300">
          {/* Subtle Top Glow Accent */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#6425E8] to-transparent opacity-80" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-[#E9E8F0]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6425E8] animate-pulse" />
                  Core Module
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Live & Operational
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111126] mt-1">
                Eventra Create — Personalised Event Flyers
              </h2>
              <p className="text-sm text-[#525266] mt-1">
                Upload your flyer artwork once. Participants personalize with their own photo and name in seconds.
              </p>
            </div>

            {/* Interactive demo tabs with smooth state transitions */}
            <div className="flex items-center gap-1 p-1 bg-[#F1F3F9] rounded-xl self-start sm:self-auto border border-[#E9E8F0]">
              <button
                onClick={() => setDemoStep('original')}
                className={`interactive-btn px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  demoStep === 'original' 
                    ? 'bg-white text-[#111126] shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#5A5A72] hover:text-[#111126]'
                }`}
              >
                1. Base Template
              </button>
              <button
                onClick={() => setDemoStep('upload')}
                className={`interactive-btn px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  demoStep === 'upload' 
                    ? 'bg-white text-[#111126] shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#5A5A72] hover:text-[#111126]'
                }`}
              >
                2. Attendee Input
              </button>
              <button
                onClick={handleGenerateDemo}
                className={`interactive-btn px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  demoStep === 'completed' 
                    ? 'bg-[#6425E8] text-white shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#5A5A72] hover:text-[#111126]'
                }`}
              >
                3. Final Result
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Step 1: Base Flyer */}
            <div 
              onClick={() => setDemoStep('original')}
              className={`interactive-card p-5 rounded-2xl border cursor-pointer transition-all ${
                demoStep === 'original' 
                  ? 'border-[#6425E8] ring-2 ring-[#6425E8]/20 bg-[#6425E8]/5 shadow-md -translate-y-1' 
                  : 'border-[#E9E8F0] bg-[#F8F8FC] opacity-90 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#525266] uppercase tracking-wider">1. Original Artwork</span>
                <span className="text-xs font-semibold text-[#525266] bg-white px-2 py-0.5 rounded border border-[#E9E8F0]">Untouched</span>
              </div>
              <div className="aspect-[3/4] bg-[#111126] rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden shadow-inner group">
                <div className="text-xs font-bold tracking-widest text-[#9638F5] text-center">NEXT HORIZON 2026</div>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#9638F5] bg-white/10 self-center flex items-center justify-center text-xs font-bold text-[#B366FF] animate-pulse">
                  Photo Slot
                </div>
                <div className="w-3/4 mx-auto border border-dashed border-[#9638F5]/40 py-1 text-center text-xs text-white/70 rounded">
                  [Participant Name]
                </div>
                <div className="text-[10px] text-center text-slate-400">SAN FRANCISCO · VIRTUAL</div>
              </div>
              <p className="text-sm text-[#525266] mt-3 leading-relaxed">
                The original design remains untouched except for designated coordinates.
              </p>
            </div>

            {/* Step 2: Interactive Participant Form */}
            <div 
              onClick={() => setDemoStep('upload')}
              className={`interactive-card p-5 rounded-2xl border cursor-pointer transition-all ${
                demoStep === 'upload' 
                  ? 'border-[#6425E8] ring-2 ring-[#6425E8]/20 bg-[#6425E8]/5 shadow-md -translate-y-1' 
                  : 'border-[#E9E8F0] bg-[#F8F8FC] opacity-90 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#525266] uppercase tracking-wider">2. Participant Form</span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">Interactive</span>
              </div>
              <div className="aspect-[3/4] bg-white rounded-xl p-4 flex flex-col justify-between border border-[#E9E8F0] shadow-sm">
                <div>
                  <span className="text-xs font-bold text-[#525266] uppercase block tracking-wider">Type Attendee Name</span>
                  <input
                    type="text"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 bg-[#F8F8FC] border border-[#CBD5E1] rounded-lg text-sm font-semibold text-[#111126] mt-1.5 focus:outline-none focus:border-[#6425E8]"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#525266] uppercase block mb-1.5 tracking-wider">Select Attendee Avatar</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['elena', 'marcus', 'sarah'] as const).map((key) => {
                      const av = avatarPresets[key];
                      const active = demoAvatar === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDemoAvatar(key);
                            if (demoName === avatarPresets.elena.name || demoName === avatarPresets.marcus.name || demoName === avatarPresets.sarah.name) {
                              setDemoName(av.name);
                            }
                          }}
                          className={`p-1.5 rounded-xl border text-center transition ${
                            active
                              ? 'border-[#6425E8] bg-[#6425E8]/10 ring-2 ring-[#6425E8]/40 shadow-xs'
                              : 'border-[#E9E8F0] hover:bg-[#F8F8FC]'
                          }`}
                        >
                          <div className={`w-8 h-8 mx-auto rounded-full bg-gradient-to-tr ${av.gradient} flex items-center justify-center text-white font-bold text-xs`}>
                            {av.initials}
                          </div>
                          <span className="text-xs font-semibold text-[#111126] block truncate mt-1">
                            {av.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateDemo();
                    }}
                    className="interactive-btn w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-center rounded-xl text-sm font-semibold shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Generate My Flyer</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-[#525266] mt-3 leading-relaxed">
                Zero app installs required. Type a name to test live composition.
              </p>
            </div>

            {/* Step 3: High-Res Composite Flyer */}
            <div 
              onClick={handleGenerateDemo}
              className={`interactive-card p-5 rounded-2xl border cursor-pointer transition-all ${
                demoStep === 'completed' 
                  ? 'border-[#6425E8] ring-2 ring-[#6425E8]/20 bg-[#6425E8]/5 shadow-md -translate-y-1' 
                  : 'border-[#E9E8F0] bg-[#F8F8FC] opacity-90 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#6425E8] uppercase flex items-center gap-1 tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  3. Personalised Flyer
                </span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Native 300 DPI
                </span>
              </div>
              <div className="aspect-[3/4] bg-[#111126] rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden shadow-md group">
                <div className="text-xs font-bold tracking-widest text-[#9638F5] text-center">NEXT HORIZON 2026</div>
                <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${avatarPresets[demoAvatar].gradient} border-2 border-white/80 self-center flex items-center justify-center text-white font-bold text-sm shadow-lg ring-4 ring-[#9638F5]/30 group-hover:scale-105 transition-transform`}>
                  {avatarPresets[demoAvatar].initials}
                </div>
                <div className="text-center font-bold text-sm tracking-wide text-white drop-shadow truncate px-2">
                  {demoName || 'Elena Rostova'}
                </div>
                <div className="text-xs text-center text-slate-300 uppercase tracking-wider">{demoRole}</div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadDemo();
                  }}
                  className="interactive-btn px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg transition flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadSuccess ? 'Downloaded! 🎉' : 'Download Sample'}</span>
                </button>
                <span className="text-xs font-bold text-[#6425E8] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FORWARD-LOOKING PLATFORM ROADMAP (Interactive Preview Cards) */}
        <section id="roadmap" className="mt-28 text-left animate-fade-in-up delay-400">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6425E8]">The Eventra Vision</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111126] mt-1">
              One Unified Operating System for Modern Events
            </h2>
            <p className="text-sm sm:text-base text-[#525266] mt-2 leading-relaxed">
              Eventra is engineered from the ground up to unify event creation, attendee communications, check-in, ticketing, and live engagement under one platform. Click any module to preview its roadmap brief.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                key: 'eventra_create',
                icon: Layers,
                status: 'LIVE',
                statusClass: 'text-emerald-700 bg-emerald-100',
                title: 'Eventra Create',
                desc: 'Personalized flyer campaigns with automated normalized photo positioning and typographic fitting.',
              },
              {
                key: 'invitations',
                icon: Send,
                status: 'ROADMAP',
                statusClass: 'text-[#5A5A72] bg-[#E9E8F0]',
                title: 'Digital Invitations & RSVP',
                desc: 'Smart mobile invitations with dynamic RSVP confirmation, calendar hooks, and email notifications.',
              },
              {
                key: 'registrations',
                icon: Ticket,
                status: 'ROADMAP',
                statusClass: 'text-[#5A5A72] bg-[#E9E8F0]',
                title: 'Registrations & Passes',
                desc: 'Custom checkout pipeline, tiered VIP passes, and secure payment processing for organizations.',
              },
              {
                key: 'guest_checkin',
                icon: QrCode,
                status: 'ROADMAP',
                statusClass: 'text-[#5A5A72] bg-[#E9E8F0]',
                title: 'Guest Check-In',
                desc: 'Mobile QR code scanner for front-door staff with real-time arrival sync and attendance velocity.',
              },
              {
                key: 'photo_gallery',
                icon: ImageIcon,
                status: 'ROADMAP',
                statusClass: 'text-[#5A5A72] bg-[#E9E8F0]',
                title: 'Event Photo Galleries',
                desc: 'Live participant photo uploads, curated media walls, and instant post-event download albums.',
              },
              {
                key: 'org_workspace',
                icon: Users,
                status: 'LIVE',
                statusClass: 'text-emerald-700 bg-emerald-100',
                title: 'Multi-Tenant Workspaces',
                desc: 'Team collaboration with role-based permissions (Owners, Event Managers, Team Members).',
              },
            ].map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.key}
                  onClick={() => openModulePreview(card.key)}
                  className="interactive-card bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs hover:border-[#6425E8]/40 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${card.statusClass}`}>
                        {card.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#111126] group-hover:text-[#6425E8] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-[#525266] mt-2 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E9E8F0]/80 flex items-center justify-between text-xs font-bold text-[#6425E8]">
                    <span>Preview Module</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="mt-28 text-left animate-fade-in-up delay-500">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6425E8]">Execution</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111126] mt-1">
              How Eventra Delivers In Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs interactive-card">
              <span className="text-sm font-bold text-[#6425E8] font-mono">01.</span>
              <h3 className="text-base font-bold text-[#111126] mt-2">Upload Artwork</h3>
              <p className="text-sm text-[#525266] mt-2 leading-relaxed">
                Supply your existing event flyer design. No re-designing required.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs interactive-card">
              <span className="text-sm font-bold text-[#6425E8] font-mono">02.</span>
              <h3 className="text-base font-bold text-[#111126] mt-2">Map Areas</h3>
              <p className="text-sm text-[#525266] mt-2 leading-relaxed">
                Drag to set photo circular or rectangular boundaries and name typography.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs interactive-card">
              <span className="text-sm font-bold text-[#6425E8] font-mono">03.</span>
              <h3 className="text-base font-bold text-[#111126] mt-2">Distribute Link</h3>
              <p className="text-sm text-[#525266] mt-2 leading-relaxed">
                Publish and share a clean branded URL with participants on social media or WhatsApp.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-xs interactive-card">
              <span className="text-sm font-bold text-[#6425E8] font-mono">04.</span>
              <h3 className="text-sm font-bold text-[#111126] mt-2">Instant Downloads</h3>
              <p className="text-sm text-[#525266] mt-2 leading-relaxed">
                Attendees receive high-res PNG, JPG, and PDF versions of their custom poster.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E9E8F0] bg-white py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#525266]">
          <EventraLogo variant="with-tagline" size="sm" />

          <div className="flex items-center gap-6">
            <a href="#eventra-create" className="hover:text-[#6425E8] transition font-medium">
              Eventra Create
            </a>
            <a href="#how-it-works" className="hover:text-[#6425E8] transition font-medium">
              How It Works
            </a>
            <Link to="/login" className="hover:text-[#6425E8] transition font-medium">
              Organiser Sign In
            </Link>
          </div>

          <p>&copy; {new Date().getFullYear()} Eventra Technologies. All rights reserved.</p>
        </div>
      </footer>

      {/* Interactive Platform Vision Preview Modal */}
      <ModulePreviewModal
        module={selectedModule}
        onClose={() => setSelectedModule(null)}
      />
    </div>
  );
};
