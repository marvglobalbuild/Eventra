import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Sparkles, Upload, MousePointerClick, Download, 
  Share2, ShieldCheck, CheckCircle2, Check, Zap, Layers, RefreshCw, Eye,
  Compass, Ticket, QrCode, Image as ImageIcon, Send, Users, ChevronRight,
  Building2, Menu, X
} from 'lucide-react';

import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { useAuth } from '../context/AuthContext';
import { PLATFORM_MODULES } from '../lib/modules';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<'original' | 'upload' | 'completed'>('completed');

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Top Bar Contract: 3 Zones (Wordmark, Nav Links, 1 Primary Action) */}
      <header className="h-20 max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-[#E9E8F0]/80 sticky top-0 bg-[#F8F8FC]/90 backdrop-blur-md z-30">
        {/* Zone 1: Wordmark */}
        <Link to="/" className="whitespace-nowrap shrink-0">
          <EventraLogo variant="with-tagline" size="md" />
        </Link>

        {/* Zone 2: 3 Single-line Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#73738A]">
          <a href="#eventra-create" className="hover:text-[#111126] transition-colors whitespace-nowrap shrink-0">
            Eventra Create
          </a>
          <a href="#roadmap" className="hover:text-[#111126] transition-colors whitespace-nowrap shrink-0">
            Platform Vision
          </a>
          <a href="#how-it-works" className="hover:text-[#111126] transition-colors whitespace-nowrap shrink-0">
            How It Works
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <Link
              to="/dashboard"
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-[#6425E8] hover:bg-[#4214B8] rounded-xl shadow-sm transition whitespace-nowrap shrink-0"
            >
              Go to Workspace
            </Link>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="hidden sm:inline text-xs font-semibold text-[#73738A] hover:text-[#111126] transition whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-[#6425E8] hover:bg-[#4214B8] rounded-xl shadow-sm transition whitespace-nowrap shrink-0"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Hamburger Button for Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#73738A] hover:text-[#111126] hover:bg-white rounded-xl border border-[#E9E8F0] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E9E8F0] px-6 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150 z-20">
          <a
            href="#eventra-create"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-[#73738A] hover:text-[#6425E8] py-2"
          >
            Eventra Create (Flyer Studio)
          </a>
          <a
            href="#roadmap"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-[#73738A] hover:text-[#6425E8] py-2"
          >
            Platform Vision
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-[#73738A] hover:text-[#6425E8] py-2"
          >
            How It Works
          </a>
          {!user && (
            <div className="pt-2 border-t border-[#E9E8F0] flex items-center justify-between">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-[#73738A] hover:text-[#111126]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}


      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 sm:pb-24 text-center relative">
        {/* Live System Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E9E8F0] rounded-xl shadow-xs text-xs font-semibold text-[#111126] absolute -top-2 left-6 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Self-Service Participant Engine</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E9E8F0] rounded-xl shadow-xs text-xs font-semibold text-[#111126] absolute top-8 right-6 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-[#6425E8]" />
          <span>High-Resolution Canvas Export</span>
        </div>

        {/* Brand Kicker */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6425E8]/10 text-[#6425E8] text-xs font-bold mb-6 hover:bg-[#6425E8]/15 transition cursor-default shadow-xs">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Events. Elevated.</span>
        </div>

        {/* Headline with Staggered Visual Rhythm */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111126] leading-[1.12]" style={{ textWrap: 'balance' }}>
          Everything your event needs.<br />
          <span className="text-[#6425E8] inline-block hover:scale-[1.01] transition-transform duration-300">
            All in one place.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#73738A] max-w-2xl mx-auto leading-relaxed" style={{ textWrap: 'balance' }}>
          Create, promote, manage and elevate your events with a smarter event platform designed for organisers and the people who attend them.
        </p>

        {/* CTAs with tactile micro-interactions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            to="/register"
            className="interactive-btn group relative overflow-hidden w-full sm:w-auto px-7 py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E9E8F0] text-[#111126] font-semibold text-xs rounded-xl hover:bg-[#F8F8FC] hover:border-[#CBD5E1] transition shadow-sm flex items-center justify-center space-x-1.5"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#73738A]" />
          </Link>
        </div>

        {/* SPOTLIGHT MODULE: EVENTRA CREATE (Interactive Demo Engine) */}
        <section id="eventra-create" className="mt-20 bg-white border border-[#E9E8F0] rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto text-left relative overflow-hidden">
          {/* Subtle Top Glow Accent */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#6425E8] to-transparent opacity-80" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-[#E9E8F0]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6425E8] animate-pulse" />
                  Core Module
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Live & Operational
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111126] mt-1">
                Eventra Create — Personalised Event Flyers
              </h2>
              <p className="text-xs text-[#73738A] mt-0.5">
                Upload your flyer artwork once. Participants personalize with their own photo and name in seconds.
              </p>
            </div>

            {/* Interactive demo tabs with smooth state transitions */}
            <div className="flex items-center gap-1 p-1 bg-[#F1F3F9] rounded-xl self-start sm:self-auto border border-[#E9E8F0]">
              <button
                onClick={() => setDemoStep('original')}
                className={`interactive-btn px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  demoStep === 'original' 
                    ? 'bg-white text-[#111126] shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#73738A] hover:text-[#111126]'
                }`}
              >
                1. Base Template
              </button>
              <button
                onClick={() => setDemoStep('upload')}
                className={`interactive-btn px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  demoStep === 'upload' 
                    ? 'bg-white text-[#111126] shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#73738A] hover:text-[#111126]'
                }`}
              >
                2. Attendee Input
              </button>
              <button
                onClick={() => setDemoStep('completed')}
                className={`interactive-btn px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  demoStep === 'completed' 
                    ? 'bg-[#6425E8] text-white shadow-sm font-bold scale-[1.02]' 
                    : 'text-[#73738A] hover:text-[#111126]'
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
                <span className="text-[11px] font-bold text-[#73738A] uppercase">1. Original Artwork</span>
                <span className="text-[10px] text-[#73738A] bg-white px-2 py-0.5 rounded border border-[#E9E8F0]">Untouched</span>
              </div>
              <div className="aspect-[3/4] bg-[#111126] rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden shadow-inner group">
                <div className="text-[10px] font-bold tracking-widest text-[#9638F5] text-center">NEXT HORIZON 2026</div>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#9638F5] bg-white/10 self-center flex items-center justify-center text-[10px] font-bold text-[#B366FF] animate-pulse">
                  Photo Slot
                </div>
                <div className="w-3/4 mx-auto border border-dashed border-[#9638F5]/40 py-1 text-center text-[10px] text-white/60 rounded">
                  [Participant Name]
                </div>
                <div className="text-[9px] text-center text-slate-400">SAN FRANCISCO · VIRTUAL</div>
              </div>
              <p className="text-xs text-[#73738A] mt-3">
                The original design remains untouched except for designated coordinates.
              </p>
            </div>

            {/* Step 2: Participant Form */}
            <div 
              onClick={() => setDemoStep('upload')}
              className={`interactive-card p-5 rounded-2xl border cursor-pointer transition-all ${
                demoStep === 'upload' 
                  ? 'border-[#6425E8] ring-2 ring-[#6425E8]/20 bg-[#6425E8]/5 shadow-md -translate-y-1' 
                  : 'border-[#E9E8F0] bg-[#F8F8FC] opacity-90 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#73738A] uppercase">2. Participant Form</span>
                <span className="text-[10px] text-[#73738A] bg-white px-2 py-0.5 rounded border border-[#E9E8F0]">Zero Login</span>
              </div>
              <div className="aspect-[3/4] bg-white rounded-xl p-4 flex flex-col justify-center space-y-3 border border-[#E9E8F0] shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-[#73738A] uppercase block">Full Name</span>
                  <div className="px-2.5 py-1.5 bg-[#F8F8FC] border border-[#CBD5E1] rounded text-xs font-semibold text-[#111126] mt-1 flex items-center justify-between">
                    <span>Elena Rostova</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#73738A] uppercase block">Portrait Photo</span>
                  <div className="mt-1 flex items-center space-x-2 p-2 bg-[#F8F8FC] border border-[#CBD5E1] rounded">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6425E8] to-[#9638F5] flex items-center justify-center text-white font-bold text-xs ring-2 ring-purple-300">
                      ER
                    </div>
                    <span className="text-xs text-[#111126] truncate">elena-speaker.jpg</span>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="w-full py-2 bg-[#6425E8] text-white text-center rounded text-xs font-semibold shadow-xs hover:bg-[#4214B8] transition">
                    Generate My Flyer
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#73738A] mt-3">
                Mobile-first experience optimized for instant WhatsApp & social distribution.
              </p>
            </div>

            {/* Step 3: High-Res Composite */}
            <div 
              onClick={() => setDemoStep('completed')}
              className={`interactive-card p-5 rounded-2xl border cursor-pointer transition-all ${
                demoStep === 'completed' 
                  ? 'border-[#6425E8] ring-2 ring-[#6425E8]/20 bg-[#6425E8]/5 shadow-md -translate-y-1' 
                  : 'border-[#E9E8F0] bg-[#F8F8FC] opacity-90 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#6425E8] uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  3. Personalised Flyer
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Native 300 DPI
                </span>
              </div>
              <div className="aspect-[3/4] bg-[#111126] rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden shadow-md group">
                <div className="text-[10px] font-bold tracking-widest text-[#9638F5] text-center">NEXT HORIZON 2026</div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#6425E8] to-[#9638F5] border-2 border-white/80 self-center flex items-center justify-center text-white font-bold text-sm shadow-lg ring-4 ring-[#9638F5]/30 group-hover:scale-105 transition-transform">
                  ER
                </div>
                <div className="text-center font-bold text-xs tracking-wide text-white drop-shadow">
                  Elena Rostova
                </div>
                <div className="text-[9px] text-center text-slate-400">CONFIRMED SPEAKER</div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">PNG</span>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">JPG</span>
                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">PDF</span>
                </div>
                <span className="text-[10px] font-bold text-[#6425E8] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FORWARD-LOOKING PLATFORM ROADMAP */}
        <section id="roadmap" className="mt-28 text-left">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6425E8]">The Eventra Vision</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111126] mt-1">
              One Unified Operating System for Modern Events
            </h2>
            <p className="text-xs text-[#73738A] mt-2">
              Eventra is engineered from the ground up to unify event creation, attendee communications, check-in, ticketing, and live engagement under one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Layers className="w-5 h-5 text-[#6425E8]" />
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">LIVE</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Eventra Create</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Personalized flyer campaigns with automated normalized photo positioning and typographic fitting.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Send className="w-5 h-5 text-[#73738A]" />
                <span className="text-[10px] font-semibold text-[#73738A] bg-[#E9E8F0] px-2 py-0.5 rounded">ROADMAP</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Digital Invitations & RSVP</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Smart mobile invitations with dynamic RSVP confirmation, calendar hooks, and email notifications.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Ticket className="w-5 h-5 text-[#73738A]" />
                <span className="text-[10px] font-semibold text-[#73738A] bg-[#E9E8F0] px-2 py-0.5 rounded">ROADMAP</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Registrations & Passes</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Custom checkout pipeline, tiered VIP passes, and secure payment processing for organizations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <QrCode className="w-5 h-5 text-[#73738A]" />
                <span className="text-[10px] font-semibold text-[#73738A] bg-[#E9E8F0] px-2 py-0.5 rounded">ROADMAP</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Guest Check-In</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Mobile QR code scanner for front-door staff with real-time arrival sync and attendance velocity.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ImageIcon className="w-5 h-5 text-[#73738A]" />
                <span className="text-[10px] font-semibold text-[#73738A] bg-[#E9E8F0] px-2 py-0.5 rounded">ROADMAP</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Event Photo Galleries</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Live participant photo uploads, curated media walls, and instant post-event download albums.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-[#6425E8]" />
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">LIVE</span>
              </div>
              <h3 className="font-bold text-sm text-[#111126]">Multi-Tenant Organisation Workspaces</h3>
              <p className="text-xs text-[#73738A] mt-1.5 leading-relaxed">
                Team collaboration with role-based permissions (Owners, Event Managers, Team Members).
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="mt-28 text-left">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6425E8]">Execution</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111126] mt-1">
              How Eventra Delivers In Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <span className="text-xs font-bold text-[#6425E8] font-mono">01.</span>
              <h3 className="text-sm font-bold text-[#111126] mt-2">Upload Artwork</h3>
              <p className="text-xs text-[#73788A] mt-1.5 leading-relaxed">
                Supply your existing event flyer design. No re-designing required.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <span className="text-xs font-bold text-[#6425E8] font-mono">02.</span>
              <h3 className="text-sm font-bold text-[#111126] mt-2">Map Areas</h3>
              <p className="text-xs text-[#73788A] mt-1.5 leading-relaxed">
                Drag to set photo circular or rectangular boundaries and name typography.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <span className="text-xs font-bold text-[#6425E8] font-mono">03.</span>
              <h3 className="text-sm font-bold text-[#111126] mt-2">Distribute Link</h3>
              <p className="text-xs text-[#73788A] mt-1.5 leading-relaxed">
                Publish and share a clean branded URL with participants on social media or WhatsApp.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E8F0] shadow-sm">
              <span className="text-xs font-bold text-[#6425E8] font-mono">04.</span>
              <h3 className="text-sm font-bold text-[#111126] mt-2">Instant Downloads</h3>
              <p className="text-xs text-[#73788A] mt-1.5 leading-relaxed">
                Attendees receive high-res PNG, JPG, and PDF versions of their custom poster.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E9E8F0] bg-white py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#73788A]">
          <EventraLogo variant="with-tagline" size="sm" />

          <div className="flex items-center gap-6">
            <a href="#eventra-create" className="hover:text-[#111126] transition">
              Eventra Create
            </a>
            <a href="#how-it-works" className="hover:text-[#111126] transition">
              How It Works
            </a>
            <Link to="/login" className="hover:text-[#111126] transition">
              Organiser Sign In
            </Link>
          </div>

          <p>&copy; {new Date().getFullYear()} Eventra Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

