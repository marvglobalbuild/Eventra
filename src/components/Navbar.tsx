import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EventraLogo } from './EventraLogo';
import { 
  Compass, Calendar, PlusCircle, Bookmark, LogIn, 
  LogOut, User, Menu, X, ChevronDown, Layers, Sparkles,
  Ticket, Mail, Users, Settings, AlertCircle, ArrowRight
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, isHost, activeView, switchView, becomeHost, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Become Host Modal State
  const [showHostModal, setShowHostModal] = useState(false);
  const [orgBrandName, setOrgBrandName] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleActivateHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeError(null);

    const res = await becomeHost(orgBrandName.trim() || undefined);
    if (!res.success) {
      setUpgradeError(res.error || 'Failed to activate Host experience.');
      setUpgrading(false);
    } else {
      setUpgrading(false);
      setShowHostModal(false);
      navigate('/dashboard');
    }
  };

  const isHostMode = isHost && activeView === 'host';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E8F0] safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 group focus:outline-none">
                <EventraLogo variant="with-tagline" size="md" />
              </Link>

              {/* Role pill indicator when logged in */}
              {user && (
                <span className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isHostMode ? 'bg-[#111126] text-white' : 'bg-[#6425E8]/10 text-[#6425E8]'
                }`}>
                  {isHostMode ? <Calendar className="w-3 h-3 text-[#9638F5]" /> : <Compass className="w-3 h-3 text-[#6425E8]" />}
                  <span>{isHostMode ? 'Host Experience' : 'Attendee Experience'}</span>
                </span>
              )}

              {/* Desktop Navigation Links — Strictly Role Aware */}
              <nav className="hidden md:flex items-center gap-1">
                {/* When NOT signed in */}
                {!user && (
                  <>
                    <Link
                      to="/discover"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive('/discover')
                          ? 'text-[#6425E8] bg-[#6425E8]/10'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Discover Events</span>
                    </Link>

                    <a
                      href="/#eventra-create"
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] transition"
                    >
                      Eventra Create
                    </a>

                    <a
                      href="/#how-it-works"
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] transition"
                    >
                      How It Works
                    </a>

                    <a
                      href="/#roadmap"
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] transition"
                    >
                      Platform Modules
                    </a>
                  </>
                )}

                {/* When Signed in as HOST */}
                {user && isHostMode && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        location.pathname === '/dashboard'
                          ? 'text-[#6425E8] bg-[#6425E8]/10 font-bold'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>My Flyers</span>
                    </Link>

                    <Link
                      to="/create-event"
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        location.pathname === '/create-event'
                          ? 'text-[#6425E8] bg-[#6425E8]/10 font-bold'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-[#6425E8]" />
                      <span>Create Flyer Link</span>
                    </Link>

                    <Link
                      to="/discover"
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive('/discover')
                          ? 'text-[#6425E8] bg-[#6425E8]/10 font-bold'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Discover Events</span>
                    </Link>
                  </>
                )}

                {/* When Signed in as ATTENDEE */}
                {user && !isHostMode && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        location.pathname === '/dashboard' && !location.search.includes('tab=')
                          ? 'text-[#6425E8] bg-[#6425E8]/10'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Overview</span>
                    </Link>

                    <Link
                      to="/discover"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive('/discover')
                          ? 'text-[#6425E8] bg-[#6425E8]/10'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <span>Discover Events</span>
                    </Link>

                    <Link
                      to="/my-registrations"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive('/my-registrations')
                          ? 'text-[#6425E8] bg-[#6425E8]/10'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Ticket className="w-4 h-4" />
                      <span>My Registrations</span>
                    </Link>

                    <Link
                      to="/saved-events"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive('/saved-events')
                          ? 'text-[#6425E8] bg-[#6425E8]/10'
                          : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Saved Events</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Right Header Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* If Host: Create Event CTA */}
              {user && isHostMode && (
                <Link
                  to="/create-event"
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#521dc4] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Flyer Link</span>
                </Link>
              )}

              {/* If Attendee: Become a Host or Switch CTA */}
              {user && !isHostMode && (
                <>
                  {!isHost ? (
                    <button
                      type="button"
                      onClick={() => setShowHostModal(true)}
                      className="px-3.5 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Become a Host</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        switchView('host');
                        navigate('/dashboard');
                      }}
                      className="px-3.5 py-2 bg-[#111126] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#9638F5]" />
                      <span>Switch to Host</span>
                    </button>
                  )}
                </>
              )}

              {/* Authenticated User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F8F8FC] border border-transparent hover:border-[#E9E8F0] transition focus:outline-none cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                      {(profile?.full_name || user.email || 'U').charAt(0)}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#73738A]" />
                  </button>

                  {userDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E9E8F0] py-2 z-50 animate-scale-up"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      {/* User Header */}
                      <div className="px-4 py-2.5 border-b border-[#F0F0F5]">
                        <p className="text-xs font-bold text-[#111126] truncate">{profile?.full_name || 'Eventra User'}</p>
                        <p className="text-[11px] text-[#73738A] truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHostMode ? 'bg-[#111126] text-white' : 'bg-[#6425E8]/10 text-[#6425E8]'
                          }`}>
                            {isHostMode ? 'Host Mode' : 'Attendee Mode'}
                          </span>
                        </div>
                      </div>

                      {/* Navigation Actions */}
                      <div className="py-1">
                        {isHostMode ? (
                          <>
                            <Link
                              to="/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                            >
                              <Calendar className="w-4 h-4 text-[#6425E8]" />
                              <span>Host Dashboard</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                switchView('attendee');
                                navigate('/dashboard');
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <Compass className="w-4 h-4 text-[#6425E8]" />
                              <span>Switch to Attendee View</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                            >
                              <Compass className="w-4 h-4 text-[#6425E8]" />
                              <span>Attendee Dashboard</span>
                            </Link>

                            {isHost ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setUserDropdownOpen(false);
                                  switchView('host');
                                  navigate('/dashboard');
                                }}
                                className="w-full text-left px-4 py-2 text-xs text-[#111126] font-bold hover:bg-[#F8F8FC] flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <Calendar className="w-4 h-4 text-[#6425E8]" />
                                <span>Switch to Host Dashboard</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setUserDropdownOpen(false);
                                  setShowHostModal(true);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-[#6425E8] hover:bg-[#6425E8]/5 flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Become a Host</span>
                              </button>
                            )}
                          </>
                        )}

                        <Link
                          to="/dashboard?tab=settings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                        >
                          <Settings className="w-4 h-4 text-[#73738A]" />
                          <span>Account Settings</span>
                        </Link>

                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                        >
                          <Layers className="w-4 h-4 text-[#73738A]" />
                          <span>Platform CRM Hub</span>
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-[#F0F0F5] mt-1 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setUserDropdownOpen(false);
                            await signOut();
                            navigate('/login');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl transition"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-bold shadow-2xs transition"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#73738A] hover:text-[#111126] rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E9E8F0] px-4 py-3 space-y-2">
            {user ? (
              <>
                <div className="p-3 bg-[#F8F8FC] rounded-xl mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#111126]">{profile?.full_name || 'Eventra User'}</p>
                    <p className="text-[11px] text-[#73738A]">{user.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isHostMode ? 'bg-[#111126] text-white' : 'bg-[#6425E8]/10 text-[#6425E8]'
                  }`}>
                    {isHostMode ? 'Host' : 'Attendee'}
                  </span>
                </div>

                {isHostMode ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      My Flyers
                    </Link>
                    <Link
                      to="/create-event"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-bold text-[#6425E8] hover:bg-[#6425E8]/5"
                    >
                      + Create Flyer Link
                    </Link>
                    <Link
                      to="/discover"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      Discover Events
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        switchView('attendee');
                        navigate('/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#555567] hover:bg-[#F8F8FC]"
                    >
                      Switch to Attendee View
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      Attendee Overview
                    </Link>
                    <Link
                      to="/discover"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      Discover Events
                    </Link>
                    <Link
                      to="/my-registrations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      My Registrations
                    </Link>
                    <Link
                      to="/saved-events"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC]"
                    >
                      Saved Events
                    </Link>
                    {!isHost ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowHostModal(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#6425E8] hover:bg-[#6425E8]/5"
                      >
                        Become a Host
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          switchView('host');
                          navigate('/dashboard');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#111126] hover:bg-[#F8F8FC]"
                      >
                        Switch to Host Experience
                      </button>
                    )}
                  </>
                )}

                <div className="pt-2 border-t border-[#F0F0F5]">
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await signOut();
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1.5 pt-1">
                <Link
                  to="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-[#111126] hover:bg-[#F8F8FC] rounded-xl"
                >
                  Discover Events
                </Link>
                <a
                  href="/#eventra-create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl"
                >
                  Eventra Create
                </a>
                <a
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl"
                >
                  How It Works
                </a>
                <a
                  href="/#roadmap"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl"
                >
                  Platform Modules
                </a>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F0F0F5]">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center text-xs font-semibold border border-[#E9E8F0] rounded-xl text-[#111126] hover:bg-[#F8F8FC]"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center text-xs font-bold bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl shadow-xs"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}
                    Sign Up
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Become a Host Modal */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-[#E9E8F0] p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6425E8]/10 text-[#6425E8] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#111126]">Become an Event Host</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHostModal(false)}
                className="text-[#73738A] hover:text-[#111126] text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#73738A] leading-relaxed">
              Activate Host mode on your account to create events, customize attendee participation flyers with Eventra Create, and send VIP invitations. All your saved events and registrations stay safe!
            </p>

            {upgradeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{upgradeError}</span>
              </div>
            )}

            <form onSubmit={handleActivateHost} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                  Organisation or Brand Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pilgrims Ministries or My Events"
                  value={orgBrandName}
                  onChange={(e) => setOrgBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:border-[#6425E8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="px-4 py-2 border border-[#E9E8F0] text-xs font-semibold rounded-xl text-[#73738A] hover:bg-[#F8F8FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upgrading}
                  className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{upgrading ? 'Activating...' : 'Activate Host Experience'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
