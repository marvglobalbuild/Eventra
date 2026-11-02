import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, Organisation } from '../types/database';
import { db, initializeLocalData, getCustomSupabaseConfig } from '../lib/storage-and-db';
import { getSupabase } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  currentOrg: Organisation | null;
  organisations: Organisation[];
  loading: boolean;
  isSupabase: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateName: (newName: string) => void;
  switchOrganisation: (orgId: string) => void;
  quickDemoLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  currentOrg: null,
  organisations: [],
  loading: true,
  isSupabase: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  updateName: () => {},
  switchOrganisation: () => {},
  quickDemoLogin: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organisation | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupabase, setIsSupabase] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeLocalData();
      const sb = getSupabase();

      const orgs = db.getOrganisations();
      setOrganisations(orgs);
      const activeOrg = db.getCurrentOrganisation();
      setCurrentOrg(activeOrg);

      if (sb) {
        setIsSupabase(true);
        try {
          const { data } = await sb.auth.getSession();
          if (data.session?.user) {
            const { data: prof } = await sb
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .maybeSingle();

            if (prof) {
              setProfile(prof);
            } else {
              setProfile({
                id: data.session.user.id,
                full_name: data.session.user.user_metadata?.full_name || 'Eventra Organiser',
                email: data.session.user.email || '',
                role: 'organisation_owner',
                current_org_id: activeOrg.id,
                created_at: new Date().toISOString(),
              });
            }
          } else {
            const localUser = db.getCurrentProfile();
            setProfile(localUser);
          }
        } catch (e) {
          console.warn('Supabase auth check error:', e);
          const localUser = db.getCurrentProfile();
          setProfile(localUser);
        }
      } else {
        setIsSupabase(false);
        const localUser = db.getCurrentProfile();
        setProfile(localUser);
      }
      setLoading(false);
    }

    init();
  }, []);

  const switchOrganisation = (orgId: string) => {
    db.setCurrentOrganisationId(orgId);
    const orgs = db.getOrganisations();
    const found = orgs.find((o) => o.id === orgId) || orgs[0];
    setCurrentOrg(found);
    if (profile) {
      setProfile({ ...profile, current_org_id: orgId });
    }
  };

  const signIn = async (email: string, pass: string) => {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          const prof: Profile = {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            email: data.user.email || email,
            role: 'organisation_owner',
            current_org_id: currentOrg?.id || 'org_elevate_01',
            created_at: new Date().toISOString(),
          };
          setProfile(prof);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local authentication
    const updated = db.updateProfile({ 
      email, 
      full_name: email.split('@')[0],
      role: 'organisation_owner',
    });
    setProfile(updated);
    return { success: true };
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: fullName } },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          const prof: Profile = {
            id: data.user.id,
            full_name: fullName,
            email: data.user.email || email,
            role: 'organisation_owner',
            current_org_id: currentOrg?.id || 'org_elevate_01',
            created_at: new Date().toISOString(),
          };
          setProfile(prof);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const newProfile = db.updateProfile({
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      full_name: fullName,
      email,
      role: 'organisation_owner',
      current_org_id: currentOrg?.id || 'org_elevate_01',
      created_at: new Date().toISOString(),
    });
    setProfile(newProfile);
    return { success: true };
  };

  const signOut = async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    setProfile(null);
  };

  const updateName = (newName: string) => {
    const updated = db.updateProfile({ full_name: newName });
    setProfile(updated);
  };

  const quickDemoLogin = () => {
    const def = db.getCurrentProfile();
    setProfile(def);
    const org = db.getCurrentOrganisation();
    setCurrentOrg(org);
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        profile,
        currentOrg,
        organisations,
        loading,
        isSupabase,
        signIn,
        signUp,
        signOut,
        updateName,
        switchOrganisation,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
