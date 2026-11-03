import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlyerEvent, EventRegistration, RegistrationFormConfig } from '../types/database';
import { db } from '../lib/storage-and-db';
import { useAuth } from '../context/AuthContext';
import { 
  X, CheckCircle2, Calendar, Sparkles, AlertCircle, 
  Loader2, Download, ArrowRight, ShieldCheck, Ticket
} from 'lucide-react';

interface RegistrationModalProps {
  event: FlyerEvent;
  formConfig?: RegistrationFormConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (reg: EventRegistration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  event,
  formConfig,
  isOpen,
  onClose,
  onRegistered,
}) => {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRecord, setConfirmedRecord] = useState<EventRegistration | null>(null);

  if (!isOpen) return null;

  // Capacity calculations
  const existingRegistrations = db.getRegistrations(event.id);
  const confirmedCount = existingRegistrations.filter((r) => r.status === 'confirmed').length;
  const isAtCapacity = event.capacity ? confirmedCount >= event.capacity : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please provide your first name, last name, and valid email.');
      return;
    }

    if (isAtCapacity) {
      setError('Sorry, this event has reached maximum capacity.');
      return;
    }

    setLoading(true);
    try {
      const reg = db.saveRegistration({
        event_id: event.id,
        attendee_user_id: user?.id || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        custom_answers: customAnswers,
        status: formConfig?.approval_required ? 'pending' : 'confirmed',
      });

      setConfirmedRecord(reg);
      if (onRegistered) onRegistered(reg);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCalendarFile = () => {
    const title = event.title || event.event_name;
    const startStr = (event.event_date || '20261115').replace(/[^0-9]/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Eventra//Event Registration//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, ' ')}`,
      `LOCATION:${event.venue || ''}, ${event.city || ''}, ${event.country || ''}`,
      `DTSTART:${startStr ? `${startStr}T090000Z` : '20261115T160000Z'}`,
      `DTEND:${startStr ? `${startStr}T120000Z` : '20261115T200000Z'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.slug || 'event'}-invite.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E9E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E9E8F0] flex items-center justify-between bg-[#F8F8FC]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6425E8]">
              {confirmedRecord ? 'Registration Complete' : 'Event Registration'}
            </span>
            <h3 className="text-base font-bold text-[#111126] line-clamp-1">{event.title || event.event_name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#73738A] hover:text-[#111126] hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!confirmedRecord ? (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {isAtCapacity ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center space-y-1">
                  <p className="font-bold text-sm">Event is currently at maximum capacity</p>
                  <p>Check back later or contact the organiser for waitlist inquiries.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Marvelous"
                        className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Ndukwe"
                        className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. you@example.com"
                      className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#73738A] mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                      className="w-full px-3.5 py-2.5 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs font-semibold text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                    />
                  </div>

                  {/* Custom Form Fields if configured */}
                  {formConfig && formConfig.fields && formConfig.fields.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-[#F0F0F5]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#73738A]">
                        Additional Questions
                      </span>
                      {formConfig.fields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-xs font-medium text-[#111126] mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              rows={2}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8]"
                            />
                          ) : field.type === 'select' && field.options ? (
                            <select
                              required={field.required}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8]"
                            >
                              <option value="">Select an option</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              required={field.required}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              className="w-full px-3.5 py-2 bg-[#F8F8FC] border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Privacy note */}
                  <div className="flex items-start gap-2 pt-1 text-[11px] text-[#73738A]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>No account required. Your details are secured and shared solely with the verified event organiser.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isAtCapacity}
                    className="w-full py-3 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Registration...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          ) : (
            /* Confirmation Screen */
            <div className="text-center space-y-5 animate-scale-up py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-[#111126]">You're Registered!</h4>
                <p className="text-xs text-[#73738A] mt-1 max-w-sm mx-auto">
                  Your attendance has been confirmed for {event.title || event.event_name}.
                </p>
              </div>

              {/* Reference Card */}
              <div className="p-4 bg-[#F8F8FC] border border-[#E9E8F0] rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E9E8F0]">
                  <span className="text-[#73738A]">Registration Reference</span>
                  <span className="font-mono font-bold text-[#6425E8] bg-[#6425E8]/10 px-2 py-0.5 rounded-md">
                    {confirmedRecord.registration_reference}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#73738A]">Attendee</span>
                  <span className="font-semibold text-[#111126]">{confirmedRecord.first_name} {confirmedRecord.last_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#73738A]">Email</span>
                  <span className="font-semibold text-[#111126]">{confirmedRecord.email}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                {/* Eventra Create CTA: Direct link to personalize attendee flyer */}
                <Link
                  to={`/e/${event.slug}`}
                  onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-[#6425E8] to-[#9638F5] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Personalise Your Official Attendee Flyer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={downloadCalendarFile}
                  className="w-full py-2.5 bg-white border border-[#E9E8F0] hover:bg-[#F8F8FC] text-[#111126] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Calendar className="w-4 h-4 text-[#6425E8]" />
                  <span>Add Event to Calendar (.ics)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
