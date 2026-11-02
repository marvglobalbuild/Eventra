import React, { useState } from 'react';
import { FeatureModule } from '../types/database';
import { X, Sparkles, Check, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { EventraLogoSymbol } from './EventraLogo';

interface ModulePreviewModalProps {
  module: FeatureModule | null;
  onClose: () => void;
}

export const ModulePreviewModal: React.FC<ModulePreviewModalProps> = ({ module, onClose }) => {
  const [requestedAccess, setRequestedAccess] = useState(false);

  if (!module) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#111126]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header with Brand Gradient accent */}
        <div className="p-6 bg-[#F8F8FC] border-b border-[#E9E8F0] relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-[#73738A] hover:text-[#111126] hover:bg-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-[#E9E8F0] flex items-center justify-center">
              <EventraLogoSymbol size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#6425E8] uppercase tracking-wider bg-[#6425E8]/10 px-2 py-0.5 rounded-full">
                  Roadmap Module
                </span>
                <span className="text-[10px] font-semibold text-[#73738A] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Scheduled Release
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#111126] mt-1">{module.name}</h3>
            </div>
          </div>
          <p className="text-xs text-[#73738A] leading-relaxed">
            {module.tagline}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-[#111126]">
          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#73738A] mb-1.5">
              Module Capability Brief
            </h4>
            <p className="text-[#73738A] leading-relaxed text-xs">
              {module.description}
            </p>
          </div>

          <div className="p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F0] space-y-2">
            <h5 className="font-bold text-[11px] text-[#111126] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6425E8]" />
              <span>Eventra Modular Platform Architecture</span>
            </h5>
            <p className="text-[11px] text-[#73738A] leading-relaxed">
              This module is currently in active staging. Eventra is architected to keep all event attendees, credentials, and assets unified under your organization account.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setRequestedAccess(true)}
              disabled={requestedAccess}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${
                requestedAccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[#6425E8] hover:bg-[#4214B8] text-white shadow-sm'
              }`}
            >
              {requestedAccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Early Access Notification Requested</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Notify My Organisation On Availability</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#73738A] hover:text-[#111126]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
