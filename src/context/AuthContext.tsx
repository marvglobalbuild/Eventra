import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, Organisation } from '../types/database';
import { 
  db, initializeLocalData, getAuthSession, setAuthSession, 
  getStoredAccounts, saveStoredAccount, StoredAccount,
  safeLocalStorageSet, safeLocalStorageGet 
} from '../lib/storage-and-db';
import { getSupabase } from '../lib/supabase';

const LS_USER_KEY = 'eventra_user_profile';
const LS_CURRENT_ORG_KEY = 'eventra_current_org_id';

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  currentOrg: Organisation | null;
  organisations: Organisation[];
  loading: boolean;
  isSupabase: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, fullName: string, orgName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateName: (newName: string) => void;
  switchOrganisation: (orgId: string) => void;
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
      const activeSessionEmail = getAuthSession();

      if (sb) {
        setIsSupabase(true);
        try {
          const { data } = await sb.auth.getSession();
          if (data.session?.user) {
            const userEmail = data.session.user.email || '';
            const { data: prof } = await sb
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .maybeSingle();

            const userProf: Profile = prof || {
              id: data.session.user.id,
              full_name: data.session.user.user_metadata?.full_name || userEmail.split('@')[0],
              email: userEmail,
              role: 'organisation_owner',
              current_org_id: `org_${data.session.user.id}`,
              created_at: new Date().toISOString(),
            };

            setProfile(userProf);
            setAuthSession(userEmail);

            const userOrg: Organisation = {
              id: userProf.current_org_id || `org_${userProf.id}`,
              name: data.session.user.user_metadata?.org_name || `${userProf.full_name}'s Workspace`,
              slug: (userProf.full_name || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              owner_id: userProf.id,
              plan: 'professional',
              created_at: new Date().toISOString(),
            };
            setCurrentOrg(userOrg);
            setOrganisations([userOrg]);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Supabase session lookup non-fatal error:', e);
        }
      } else {
        setIsSupabase(false);
      }

      // Check genuine stored local user accounts
      if (activeSessionEmail) {
        const accounts = getStoredAccounts();
        const found = accounts.find((a) => a.email.toLowerCase() === activeSessionEmail.toLowerCase());

        if (found) {
          const userProf: Profile = {
            id: found.id,
            full_name: found.full_name,
            email: found.email,
            role: 'organisation_owner',
            current_org_id: found.org_id,
            created_at: found.created_at,
          };
          setProfile(userProf);
          safeLocalStorageSet(LS_USER_KEY, JSON.stringify(userProf));

          const allOrgs = db.getOrganisations();
          const userOrg = allOrgs.find((o) => o.id === found.org_id) || {
            id: found.org_id,
            name: found.org_name || `${found.full_name}'s Workspace`,
            slug: found.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            owner_id: found.id,
            plan: 'professional',
            created_at: found.created_at,
          };
          setCurrentOrg(userOrg);
          setOrganisations(allOrgs.length > 0 ? allOrgs : [userOrg]);
        } else {
          // No valid session account found - genuine logged-out state
          setProfile(null);
          setCurrentOrg(null);
          setAuthSession(null);
        }
      } else {
        // No active session - genuine logged-out state (NO dummy user)
        setProfile(null);
        setCurrentOrg(null);
      }

      setLoading(false);
    }

    init();
  }, []);

  const switchOrganisation = (orgId: string) => {
    db.setCurrentOrganisationId(orgId);
    const orgs = db.getOrganisations();
    const found = orgs.find((o) => o.id === orgId) || orgs[0];
    if (found) {
      setCurrentOrg(found);
      if (profile) {
        setProfile({ ...profile, current_org_id: orgId });
      }
    }
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPass 
        });
        if (error) {
          // Fall through to local accounts check if Supabase login fails
          console.warn('Supabase login check:', error.message);
        } else if (data.user) {
          const userEmail = data.user.email || cleanEmail;
          const userProf: Profile = {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || userEmail.split('@')[0],
            email: userEmail,
            role: 'organisation_owner',
            current_org_id: `org_${data.user.id}`,
            created_at: new Date().toISOString(),
          };
          setProfile(userProf);
          setAuthSession(userEmail);
          safeLocalStorageSet(LS_USER_KEY, JSON.stringify(userProf));

          const userOrg: Organisation = {
            id: `org_${data.user.id}`,
            name: data.user.user_metadata?.org_name || `${userProf.full_name}'s Workspace`,
            slug: (userProf.full_name || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            owner_id: data.user.id,
            plan: 'professional',
            created_at: new Date().toISOString(),
          };
          setCurrentOrg(userOrg);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase sign-in catch:', err);
      }
    }

    // Local authentication against registered accounts only
    const accounts = getStoredAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { 
        success: false, 
        error: 'No registered account found for this email. Please click "Create Account" to sign up first.' 
      };
    }

    if (account.password && account.password !== cleanPass) {
      return { 
        success: false, 
        error: 'Incorrect password. Please verify your credentials and try again.' 
      };
    }

    // Credentials match - log in user to their workspace
    setAuthSession(cleanEmail);
    const userProfile: Profile = {
      id: account.id,
      full_name: account.full_name,
      email: account.email,
      role: 'organisation_owner',
      current_org_id: account.org_id,
      created_at: account.created_at,
    };
    setProfile(userProfile);
    safeLocalStorageSet(LS_USER_KEY, JSON.stringify(userProfile));

    const orgs = db.getOrganisations();
    let matchedOrg = orgs.find((o) => o.id === account.org_id);
    if (!matchedOrg) {
      matchedOrg = {
        id: account.org_id,
        name: account.org_name || `${account.full_name}'s Workspace`,
        slug: account.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        owner_id: account.id,
        plan: 'professional',
        created_at: account.created_at,
      };
      db.saveOrganisation(matchedOrg);
    }
    setCurrentOrg(matchedOrg);
    setOrganisations([matchedOrg]);

    return { success: true };
  };

  const signUp = async (
    email: string, 
    pass: string, 
    fullName: string, 
    orgName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const cleanName = fullName.trim();
    const cleanOrg = orgName?.trim() || `${cleanName}'s Workspace`;

    if (!cleanEmail || !cleanPass || !cleanName) {
      return { success: false, error: 'Please provide your full name, email address, and a password.' };
    }
    if (cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // Check if account already exists
    const existingAccounts = getStoredAccounts();
    if (existingAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { 
        success: false, 
        error: 'An account with this email address already exists. Please sign in instead.' 
      };
    }

    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: { data: { full_name: cleanName, org_name: cleanOrg } },
        });
        if (error) {
          console.warn('Supabase remote sign up notice:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase sign up error:', err);
      }
    }

    // Register genuine account
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrgId = `org_${Date.now()}`;

    const newOrganisation: Organisation = {
      id: newOrgId,
      name: cleanOrg,
      slug: cleanOrg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace',
      owner_id: newUserId,
      plan: 'professional',
      created_at: new Date().toISOString(),
    };
    db.saveOrganisation(newOrganisation);

    const newAccount: StoredAccount = {
      id: newUserId,
      email: cleanEmail,
      password: cleanPass,
      full_name: cleanName,
      org_id: newOrgId,
      org_name: cleanOrg,
      created_at: new Date().toISOString(),
    };
    saveStoredAccount(newAccount);

    setAuthSession(cleanEmail);

    const newProfile: Profile = {
      id: newUserId,
      full_name: cleanName,
      email: cleanEmail,
      role: 'organisation_owner',
      current_org_id: newOrgId,
      created_at: new Date().toISOString(),
    };
    safeLocalStorageSet(LS_USER_KEY, JSON.stringify(newProfile));
    safeLocalStorageSet(LS_CURRENT_ORG_KEY, newOrgId);

    setProfile(newProfile);
    setCurrentOrg(newOrganisation);
    setOrganisations([newOrganisation]);

    return { success: true };
  };

  const signOut = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    setAuthSession(null);
    try {
      localStorage.removeItem(LS_USER_KEY);
      localStorage.removeItem(LS_CURRENT_ORG_KEY);
    } catch {}
    setProfile(null);
    setCurrentOrg(null);
  };

  const updateName = (newName: string) => {
    if (!profile) return;
    const updated = db.updateProfile({ full_name: newName });
    if (updated) setProfile(updated);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
