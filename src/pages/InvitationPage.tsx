import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, initializeLocalData } from '../lib/storage-and-db';
import { EventInvitation, FlyerEvent } from '../types/database';
import { Navbar } from '../components/Navbar';
import { 
  Calendar, Clock, MapPin, CheckCircle2, XCircle, 
  HelpCircle, Sparkles, ArrowRight, ShieldCheck, Mail, Users
} from 'lucide-react';

export const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [invitation, setInvitation] = useState<EventInvitation | null>(null);
  const [event, setEvent] = useState<FlyerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [dietary, setDietary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondedStatus, setRespondedStatus] = useState<'accepted' | 'declined' | 'maybe' | null>(null);

  useEffect(() => {
    const load = async () => {
      await initializeLocalData();
      if (!token) {
        setLoading(false);
        return;
      }

      const inv = db.getInvitationByToken(token);
      if (inv) {
        setInvitation(inv);
        setGuestCount(inv.guest_count || 1);
        setDietary(inv.dietary_preferences || '');
        if (inv.rsvp_response && inv.rsvp_response !== 'pending') {
          setRespondedStatus(inv.rsvp_response);
        }

        const ev = db.getEventById(inv.event_id);
        if (ev) setEvent(ev);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#6425E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invitation || !event) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-[#E9E8F0] shadow-sm text-center space-y-4">
            <h2 className="text-xl font-bold text-[#111126]">Invitation Not Found</h2>
            <p className="text-xs text-[#73738A]">
              This digital invitation link may be invalid or expired.
            </p>
            <Link
              to="/discover"
              className="inline-flex px-4 py-2 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
            >
              Browse Public Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleRSVP = (response: 'accepted' | 'declined' | 'maybe') => {
    if (!token) return;
    setSubmitting(true);
    db.updateInvitationRSVP(token, response, guestCount, dietary);
    setRespondedStatus(response);
    setSubmitting(false);
  };

  const cover = event.cover_image_url || event.original_flyer_path || '/assets/aistudio/IMG_2529_74b7441a.jpeg';

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 w-full flex-1">
        <div className="bg-white rounded-3xl border border-[#E9E8F0] shadow-xl overflow-hidden">
          {/* Banner */}
          <div className="relative h-48 sm:h-64 bg-slate-900">
            <img
              src={cover}
              alt={event.title || event.event_name}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6425E8] text-white">
                Official Digital Invitation
              </span>
            </div>
          </div>

          {/* Invitation Greeting & Details */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 border-b border-[#F0F0F5] pb-5">
              <span className="text-xs font-bold text-[#6425E8]">Special Guest Invitation</span>
              <h1 className="text-2xl font-extrabold text-[#111126]">
                Hello, {invitation.invited_name}
              </h1>
              <p className="text-sm text-[#555567]">
                You have been cordially invited by <span className="font-semibold text-[#111126]">{event.organiser_name || 'the event organiser'}</span> to attend:
              </p>
              <h2 className="text-lg font-bold text-[#6425E8] pt-1">
                {event.title || event.event_name}
              </h2>
            </div>

            {/* Organiser's Personal Note */}
            {invitation.message && (
              <div className="p-4 bg-[#F8F8FC] border-l-4 border-[#6425E8] rounded-r-2xl text-xs text-[#555567] leading-relaxed italic">
                "{invitation.message}"
              </div>
            )}

            {/* Event Timing & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#F8F8FC] rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-[#555567]">
                <Calendar className="w-4 h-4 text-[#6425E8] shrink-0" />
                <span>{event.event_date || 'Date TBA'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#555567]">
                <Clock className="w-4 h-4 text-[#6425E8] shrink-0" />
                <span>{event.start_time || '5:00 PM'} ({event.timezone || 'UTC'})</span>
              </div>
              <div className="flex items-center gap-2 text-[#555567] sm:col-span-2">
                <MapPin className="w-4 h-4 text-[#6425E8] shrink-0" />
                <span>{event.event_type === 'online' ? 'Online Virtual Event' : `${event.venue || event.address || ''}, ${event.city || ''}`}</span>
              </div>
            </div>

            {/* RSVP Response Actions */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#73738A] block">
                Will you be attending?
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRSVP('accepted')}
                  className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                    respondedStatus === 'accepted'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Attending</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRSVP('maybe')}
                  className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                    respondedStatus === 'maybe'
                      ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Maybe</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRSVP('declined')}
                  className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                    respondedStatus === 'declined'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span>Can't Make It</span>
                </button>
              </div>

              {/* Guest Count & Dietary Notes if Attending */}
              {respondedStatus === 'accepted' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-900">Total Party Size (including you)</span>
                    <select
                      value={guestCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10);
                        setGuestCount(count);
                        handleRSVP('accepted');
                      }}
                      className="px-3 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 focus:outline-none"
                    >
                      <option value="1">1 Person</option>
                      <option value="2">2 People (+1 Guest)</option>
                      <option value="3">3 People (+2 Guests)</option>
                      <option value="4">4 People</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                      Dietary Preferences or Special Requests
                    </label>
                    <input
                      type="text"
                      value={dietary}
                      onChange={(e) => setDietary(e.target.value)}
                      onBlur={() => handleRSVP('accepted')}
                      placeholder="e.g. Vegetarian, Wheelchair access, None"
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Next Step / Flyer Callout */}
              {respondedStatus === 'accepted' && (
                <div className="pt-2 animate-scale-up space-y-2">
                  <Link
                    to={`/e/${event.slug || event.id}`}
                    className="w-full py-3 bg-gradient-to-r from-[#6425E8] to-[#9638F5] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create Your Official Attendee Flyer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <p className="text-[11px] text-center text-[#73738A]">
                    Add your photo & name to generate your personalised flyer for WhatsApp and social media.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
