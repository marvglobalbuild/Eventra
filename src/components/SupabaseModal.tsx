import React, { useState } from 'react';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { getCustomSupabaseConfig, saveCustomSupabaseConfig } from '../lib/storage-and-db';
import { Check, Copy, Database, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { EventraLogoSymbol } from './EventraLogo';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getCustomSupabaseConfig();
  const [config, setConfig] = useState({
    url: currentConfig.url || 'https://qshjupnpxibbvilxgwix.supabase.co/',
    anonKey: currentConfig.anonKey || '',
  });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;


  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseConfig(config);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111126]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E9E8F0] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E9E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111126]">Eventra Supabase Infrastructure</h3>
              <p className="text-xs text-[#73738A]">Multi-Tenant PostgreSQL schema, Row-Level Security, & Cloud Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#73738A] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E9E8F0] px-6 bg-[#F8F8FC]">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 text-xs font-semibold border-b-2 mr-6 transition ${
              activeTab === 'credentials'
                ? 'border-[#6425E8] text-[#6425E8]'
                : 'border-transparent text-[#73738A] hover:text-[#111126]'
            }`}
          >
            Connection Settings
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sql'
                ? 'border-[#6425E8] text-[#6425E8]'
                : 'border-transparent text-[#73738A] hover:text-[#111126]'
            }`}
          >
            SQL Migration Script
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'credentials' ? (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="p-3.5 bg-[#6425E8]/5 border border-[#6425E8]/20 rounded-xl text-[#111126] leading-relaxed">
                <div className="flex items-center space-x-1.5 font-bold text-[#6425E8] mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dual-Engine Architecture Active</span>
                </div>
                Eventra is currently active with high-speed IndexedDB caching and in-browser Canvas compositing.
                To connect directly to your hosted Supabase PostgreSQL project, paste your project credentials below.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourproject.supabase.co"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs font-mono focus:outline-none focus:border-[#6425E8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.anonKey}
                  onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-white border border-[#E9E8F0] rounded-xl text-xs font-mono focus:outline-none focus:border-[#6425E8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6425E8] hover:underline inline-flex items-center space-x-1 font-semibold"
                >
                  <span>Open Supabase Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white font-semibold rounded-xl transition"
                >
                  {savedNotice ? 'Saved! Reloading...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[#73738A]">
                  Run this SQL in your Supabase SQL Editor to provision all tables, foreign keys, RLS policies, and storage buckets.
                </p>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-lg flex items-center space-x-1 text-xs font-semibold transition shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied SQL' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#111126] text-purple-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-80 leading-relaxed border border-[#E9E8F0]">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
