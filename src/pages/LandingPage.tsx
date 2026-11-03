import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Download, 
  Share2, ShieldCheck, CheckCircle2, Check, Zap, Layers,
  Compass, Ticket, Send, Users, ChevronRight, QrCode, Image as ImageIcon,
  Menu, X, Sparkles
} from 'lucide-react';

import { Navbar } from '../components/Navbar';
import { EventraLogo, EventraLogoSymbol } from '../components/EventraLogo';
import { useAuth } from '../context/AuthContext';
import { PLATFORM_MODULES } from '../lib/modules';
import { ModulePreviewModal } from '../components/ModulePreviewModal';
import { FeatureModule } from '../types/database';
import { db } from '../lib/storage-and-db';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    db.recordVisit('/');
  }, []);
  
  // Modal state for platform vision preview
  const [selectedModule, setSelectedModule] = useState<FeatureModule | null>(null);

  const openModulePreview = (moduleKey: string) => {
    const mod = PLATFORM_MODULES.find((m) => m.module_key === moduleKey);
    if (mod) setSelectedModule(mod);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] text-[#111126] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Unified Eventra Top Header / Navbar */}
      <Navbar />

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

        {/* Primary User Journey CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 animate-fade-in-up delay-250">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="interactive-btn group relative overflow-hidden w-full sm:w-auto px-7 py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-[#6425E8]/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/create-event"
                className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-[#111126] hover:bg-black text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-[#9638F5]" />
                <span>Create an Event</span>
              </Link>
              <Link
                to="/discover"
                className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E9E8F0] hover:border-[#6425E8]/50 text-[#111126] font-semibold text-sm rounded-xl hover:bg-[#F8F8FC] transition shadow-xs flex items-center justify-center space-x-2"
              >
                <Compass className="w-4 h-4 text-[#6425E8]" />
                <span>Discover Events</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register?type=host"
                className="interactive-btn group relative overflow-hidden w-full sm:w-auto px-7 py-3.5 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-[#6425E8]/25 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Register as a Host</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/discover"
                className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-[#111126] hover:bg-black text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center space-x-2"
              >
                <Compass className="w-4 h-4 text-purple-300" />
                <span>Discover Events</span>
              </Link>
              <Link
                to="/register?type=attendee"
                className="interactive-btn w-full sm:w-auto px-6 py-3.5 bg-white border border-[#E9E8F0] hover:border-[#6425E8]/50 text-[#111126] font-semibold text-sm rounded-xl hover:bg-[#F8F8FC] transition shadow-xs flex items-center justify-center space-x-2 group"
              >
                <Users className="w-4 h-4 text-[#6425E8]" />
                <span>Join as Attendee</span>
              </Link>
            </>
          )}
        </div>

        {/* SPOTLIGHT MODULE: EVENTRA CREATE — THE HOST & PARTICIPANT WORKFLOW */}
        <section id="eventra-create" className="mt-20 bg-white border border-[#E9E8F0] rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto text-left relative overflow-hidden animate-fade-in-up delay-300">
          {/* Subtle Top Glow Accent */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#6425E8] to-transparent opacity-80" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-[#E9E8F0]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6425E8] bg-[#6425E8]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6425E8] animate-pulse" />
                  Core Flagship Engine
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Host & Participant Workflow
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111126] mt-1">
                Eventra Create — How Flyer Campaigns Work
              </h2>
              <p className="text-sm text-[#525266] mt-1 max-w-2xl">
                Hosts configure flyer coordinates once and get an instant participation link. Participants open the link to upload their photo and generate personalised flyers directly.
              </p>
            </div>

            <Link
              to="/register?type=host"
              className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-xs transition self-start sm:self-auto shrink-0 flex items-center gap-1.5"
            >
              <span>Start as Host</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Step Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-[#F8F8FC] border border-[#E9E8F0] flex flex-col justify-between space-y-4 hover:border-[#6425E8]/40 hover:bg-white hover:shadow-sm transition-all group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-[#6425E8]/10 text-[#6425E8] font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#555567] bg-white px-2 py-0.5 rounded border border-[#E9E8F0]">
                    Host Setup
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#111126] group-hover:text-[#6425E8] transition-colors">
                  1. Register & Create Event
                </h3>
                <p className="text-xs text-[#525266] leading-relaxed">
                  Sign up as a Host, enter your event title, date, venue, and upload the official master flyer artwork.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E9E8F0] space-y-2">
                <div className="h-2 w-16 bg-[#6425E8]/20 rounded-full" />
                <div className="h-1.5 w-full bg-[#E9E8F0] rounded-full" />
                <div className="h-1.5 w-3/4 bg-[#E9E8F0] rounded-full" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-[#F8F8FC] border border-[#E9E8F0] flex flex-col justify-between space-y-4 hover:border-[#6425E8]/40 hover:bg-white hover:shadow-sm transition-all group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-[#6425E8]/10 text-[#6425E8] font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#555567] bg-white px-2 py-0.5 rounded border border-[#E9E8F0]">
                    Canvas Studio
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#111126] group-hover:text-[#6425E8] transition-colors">
                  2. Position Coordinates
                </h3>
                <p className="text-xs text-[#525266] leading-relaxed">
                  In Eventra Create, visually place the photo crop frame (Circle or Square) and style the participant typography.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E9E8F0] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#6425E8] bg-[#6425E8]/5 flex items-center justify-center text-[10px] font-bold text-[#6425E8]">
                  Photo Slot
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-[#F8F8FC] border border-[#E9E8F0] flex flex-col justify-between space-y-4 hover:border-[#6425E8]/40 hover:bg-white hover:shadow-sm transition-all group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-[#6425E8]/10 text-[#6425E8] font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Instant Link
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#111126] group-hover:text-[#6425E8] transition-colors">
                  3. Share Participant Link
                </h3>
                <p className="text-xs text-[#525266] leading-relaxed">
                  Eventra generates your unique link (<code className="text-[#6425E8] font-mono">/e/slug</code>). Send it to your attendees via WhatsApp, email, or social media.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-[#E9E8F0] flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] text-[#6425E8] truncate">
                  eventra.io/e/your-event
                </span>
                <span className="text-[10px] font-bold text-white bg-[#6425E8] px-2 py-0.5 rounded-md">
                  Copy
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-[#F8F8FC] border border-[#E9E8F0] flex flex-col justify-between space-y-4 hover:border-[#6425E8]/40 hover:bg-white hover:shadow-sm transition-all group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    04
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    300 DPI Export
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#111126] group-hover:text-[#6425E8] transition-colors">
                  4. Participants Download
                </h3>
                <p className="text-xs text-[#525266] leading-relaxed">
                  Participants open the link, upload their photo with automatic smart face framing, and download pristine flyers in seconds.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60 flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Account Needed</span>
              </div>
            </div>
          </div>

          {/* Bottom Host Banner Callout */}
          <div className="mt-8 p-5 bg-gradient-to-r from-[#6425E8]/10 via-[#8B5CF6]/10 to-transparent rounded-2xl border border-[#6425E8]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-sm text-[#111126]">
                Ready to empower your participants?
              </h4>
              <p className="text-xs text-[#525266]">
                Register as a host, upload your flyer artwork, and get your dedicated participant link in under 2 minutes.
              </p>
            </div>
            <Link
              to="/register?type=host"
              className="interactive-btn px-5 py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-xs transition whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Create Your Flyer Link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
