import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EventraLogo } from './EventraLogo';
import { 
  Compass, Calendar, PlusCircle, Bookmark, LogIn, 
  LogOut, User, Menu, X, ChevronDown, Layers
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E8F0] safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group focus:outline-none">
              <EventraLogo variant="with-tagline" size="md" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/discover"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  isActive('/discover')
                    ? 'text-[#6425E8] bg-[#6425E8]/10'
                    : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Discover</span>
              </Link>

              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                      isActive('/dashboard') && !location.pathname.startsWith('/dashboard/crm')
                        ? 'text-[#6425E8] bg-[#6425E8]/10'
                        : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Events</span>
                  </Link>

                  <Link
                    to="/saved-events"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                      isActive('/saved-events') || isActive('/my-registrations')
                        ? 'text-[#6425E8] bg-[#6425E8]/10'
                        : 'text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Saved & Registrations</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/create-event"
              className="px-4 py-2 bg-[#6425E8] hover:bg-[#4214B8] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F8F8FC] border border-transparent hover:border-[#E9E8F0] transition focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6425E8] to-[#9638F5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                    {(profile?.full_name || user.email || 'U').charAt(0)}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#73738A]" />
                </button>

                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E9E8F0] py-2 z-50 animate-scale-up"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-[#F0F0F5]">
                      <p className="text-xs font-bold text-[#111126] truncate">{profile?.full_name || 'Eventra User'}</p>
                      <p className="text-[11px] text-[#73738A] truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                    >
                      <Calendar className="w-4 h-4 text-[#6425E8]" />
                      <span>Organiser Dashboard</span>
                    </Link>

                    <Link
                      to="/saved-events"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                    >
                      <Bookmark className="w-4 h-4 text-[#6425E8]" />
                      <span>Attendee Portal</span>
                    </Link>

                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="px-4 py-2 text-xs text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] flex items-center gap-2.5 transition"
                    >
                      <Layers className="w-4 h-4 text-[#6425E8]" />
                      <span>Platform Telemetry / CRM</span>
                    </Link>

                    <div className="border-t border-[#F0F0F5] mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          signOut();
                          navigate('/login');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
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
                  className="px-3 py-2 text-xs font-semibold text-[#555567] hover:text-[#111126] hover:bg-[#F8F8FC] rounded-xl transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#111126] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-2xs transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/discover"
              className="p-2 text-[#555567] hover:text-[#111126] rounded-xl hover:bg-[#F8F8FC]"
              title="Discover"
            >
              <Compass className="w-5 h-5 text-[#6425E8]" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#555567] hover:text-[#111126] rounded-xl hover:bg-[#F8F8FC] focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E9E8F0] bg-white px-4 py-4 space-y-3 animate-fade-in shadow-lg">
          <Link
            to="/discover"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111126] hover:bg-[#F8F8FC]"
          >
            <Compass className="w-4 h-4 text-[#6425E8]" />
            <span>Discover Events</span>
          </Link>

          <Link
            to="/create-event"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#6425E8]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111126] hover:bg-[#F8F8FC]"
              >
                <Calendar className="w-4 h-4 text-[#6425E8]" />
                <span>My Events & Dashboard</span>
              </Link>

              <Link
                to="/saved-events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111126] hover:bg-[#F8F8FC]"
              >
                <Bookmark className="w-4 h-4 text-[#6425E8]" />
                <span>Saved & Registrations</span>
              </Link>

              <div className="pt-2 border-t border-[#F0F0F5] flex items-center justify-between">
                <span className="text-xs text-[#73738A] truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                    navigate('/login');
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-[#F0F0F5] grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-xs font-semibold text-[#111126] border border-[#E9E8F0] rounded-xl hover:bg-[#F8F8FC]"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-xs font-semibold text-white bg-[#111126] rounded-xl"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
