import { 
  Profile, FlyerEvent, FlyerTemplate, Participant, FlyerDownload, 
  Organisation, OrganisationMember, SiteVisit, VisitorStats,
  AttendeeCrmRecord, UserCrmRecord, PlatformOverviewMetrics, DailyVisitorTrend,
  EventRegistration, RegistrationFormConfig, EventInvitation, SavedEvent,
  UserInterest, EventPageAnalytic, UserRole 
} from '../types/database';
import { createSampleFlyerDataUrl } from './sample-flyers';

// In-memory fallback and fast cache for files and storage values
const memoryFileStore = new Map<string, string>();
const memoryKvStore = new Map<string, string>();

// IndexedDB database name and stores for reliable large image storage (100MB-GBs capacity)
const IDB_NAME = 'eventra_storage_db';
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores large file/image data in IndexedDB with memory cache fallback.
 * Crucially avoids blowing through the browser's 5MB localStorage quota.
 */
export async function storeFileInIDB(key: string, dataUrl: string): Promise<void> {
  // Always update fast in-memory cache
  memoryFileStore.set(key, dataUrl);

  try {
    const db = await openIDB();
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(dataUrl, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Eventra Storage] IndexedDB storage fallback to memory cache:', err);
    // Never write huge binary/base64 files to localStorage as it causes QuotaExceededError
  }
}

/**
 * Retrieves file/image data from memory cache or IndexedDB
 */
export async function getFileFromIDB(key: string): Promise<string | null> {
  if (memoryFileStore.has(key)) {
    return memoryFileStore.get(key)!;
  }

  try {
    const db = await openIDB();
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const res = req.result || null;
        if (res) memoryFileStore.set(key, res);
        resolve(res);
      };
      req.onerror = () => {
        const fallback = safeLocalStorageGet(`file_${key}`);
        resolve(fallback);
      };
    });
  } catch {
    return safeLocalStorageGet(`file_${key}`);
  }
}

// Storage Keys
const LS_USER_KEY = 'eventra_user_profile';
const LS_ORGS_KEY = 'eventra_organisations_list';
const LS_ORG_MEMBERS_KEY = 'eventra_org_members_list';
const LS_CURRENT_ORG_KEY = 'eventra_current_org_id';
const LS_EVENTS_KEY = 'eventra_events_list';
const LS_TEMPLATES_KEY = 'eventra_templates_list';
const LS_PARTICIPANTS_KEY = 'eventra_participants_list';
const LS_DOWNLOADS_KEY = 'eventra_downloads_list';
const LS_SUPABASE_CONFIG = 'eventra_supabase_config';
const LS_AUTH_SESSION = 'eventra_auth_session';
const LS_ACCOUNTS_KEY = 'eventra_registered_accounts';
const LS_VISITS_KEY = 'eventra_site_visits_log';
const LS_VISITOR_ID_KEY = 'eventra_anonymous_visitor_id';

// Stage 1 Storage Keys
const LS_REGISTRATIONS_KEY = 'eventra_registrations_list';
const LS_INVITATIONS_KEY = 'eventra_invitations_list';
const LS_FORM_CONFIGS_KEY = 'eventra_form_configs_list';
const LS_SAVED_EVENTS_KEY = 'eventra_saved_events_list';
const LS_USER_INTERESTS_KEY = 'eventra_user_interests_list';
const LS_EVENT_ANALYTICS_KEY = 'eventra_event_analytics_list';

export interface StoredAccount {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  org_id: string;
  org_name: string;
  role?: UserRole;
  account_type?: 'host' | 'attendee';
  is_host?: boolean;
  active_view?: 'host' | 'attendee';
  created_at: string;
}

export function getStoredAccounts(): StoredAccount[] {
  const raw = safeLocalStorageGet(LS_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const accounts: StoredAccount[] = JSON.parse(raw);
    // Strip any legacy dummy accounts
    const realAccounts = accounts.filter(
      (a) => a.email !== 'alex.morgan@eventra.io' && 
             a.email !== 'organizer@eventra.io' && 
             !a.id.startsWith('usr_demo')
    );
    if (realAccounts.length !== accounts.length) {
      safeLocalStorageSet(LS_ACCOUNTS_KEY, JSON.stringify(realAccounts));
    }
    return realAccounts;
  } catch {
    return [];
  }
}

export function saveStoredAccount(account: StoredAccount): void {
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  safeLocalStorageSet(LS_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getAuthSession(): string | null {
  return safeLocalStorageGet(LS_AUTH_SESSION);
}

export function setAuthSession(email: string | null): void {
  if (email) {
    safeLocalStorageSet(LS_AUTH_SESSION, email.toLowerCase().trim());
  } else {
    try {
      localStorage.removeItem(LS_AUTH_SESSION);
    } catch {}
    memoryKvStore.delete(LS_AUTH_SESSION);
  }
}

/**
 * Detect client device classification
 */
function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|android|iphone|ipod|blackberry|iemobile|kindle|opera m(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Retrieves or generates an anonymous, persistent UUID for visitor tracking
 */
export function getOrCreateVisitorId(): string {
  let vid = safeLocalStorageGet(LS_VISITOR_ID_KEY);
  if (!vid) {
    vid = 'vis_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    safeLocalStorageSet(LS_VISITOR_ID_KEY, vid);
  }
  return vid;
}

/**
 * Safe localStorage setter that intercepts QuotaExceededError and performs
 * automatic cleanup of legacy oversized entries, so the application never crashes.
 */
export function safeLocalStorageSet(key: string, value: string): void {
  memoryKvStore.set(key, value);

  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`[Eventra Storage] Quota warning while setting "${key}". Triggering auto-cleanup...`, err);

    // Emergency storage cleanup to reclaim quota
    try {
      // 1. Purge legacy file_* keys accidentally saved in localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('file_') || k.startsWith('temp_') || k.startsWith('cache_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // 2. Strip any bulky data URLs embedded inside eventra_events_list
      const rawEvents = localStorage.getItem(LS_EVENTS_KEY);
      if (rawEvents) {
        try {
          const events: FlyerEvent[] = JSON.parse(rawEvents);
          let cleaned = false;
          for (const ev of events) {
            if (ev.original_flyer_data_url && ev.original_flyer_data_url.length > 300) {
              ev.original_flyer_data_url = '';
              cleaned = true;
            }
          }
          if (cleaned) {
            localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
          }
        } catch {}
      }

      // 3. Trim download history to latest 50 items
      const rawDownloads = localStorage.getItem(LS_DOWNLOADS_KEY);
      if (rawDownloads) {
        try {
          const dl: FlyerDownload[] = JSON.parse(rawDownloads);
          if (dl.length > 50) {
            localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(dl.slice(0, 50)));
          }
        } catch {}
      }

      // Retry setItem
      localStorage.setItem(key, value);
    } catch (retryError) {
      console.error('[Eventra Storage] Storage still constrained; relying on session memory.', retryError);
      // Data remains intact in memoryKvStore for seamless in-session operation
    }
  }
}

/**
 * Safe localStorage getter that falls back to memory if localStorage is restricted
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {}
  return memoryKvStore.get(key) || null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getCustomSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  const stored = safeLocalStorageGet(LS_SUPABASE_CONFIG);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        url: parsed.url || 'https://qshjupnpxibbvilxgwix.supabase.co/',
        anonKey: parsed.anonKey || '',
      };
    } catch {
      // ignore
    }
  }
  return { 
    url: envUrl || 'https://qshjupnpxibbvilxgwix.supabase.co/', 
    anonKey: envKey || '' 
  };
}

export function saveCustomSupabaseConfig(cfg: SupabaseConfig) {
  safeLocalStorageSet(LS_SUPABASE_CONFIG, JSON.stringify(cfg));
}

// Clean storage initialization without any dummy user or mock data
export const LS_CLEAN_WIPE_KEY = 'eventra_clean_wipe_v6';

export const FLAGSHIP_WORSHIP_EVENT: FlyerEvent = {
  id: 'ev_worship_expression_40',
  user_id: 'usr_organizer_main',
  org_id: 'org_main',
  event_name: 'Worship Expression 4.0',
  slug: 'worship-expression-40',
  original_flyer_path: '/assets/aistudio/IMG_2529_74b7441a.jpeg',
  original_flyer_data_url: '',
  category: 'Gala & Worship',
  venue: '177 Aka Road, Opp. IBB IL, Uyo, Akwa Ibom State',
  event_date: '15th Nov 2026 · 5:00 PM Prompt',
  status: 'published',
  visibility: 'public',
  description: 'Theme: When Our Hearts Speak. An evening of deep spiritual worship and orchestra.',
  capacity: 2500,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-03T11:00:00.000Z',
};

export const FLAGSHIP_WORSHIP_TEMPLATE: FlyerTemplate = {
  id: 'tmpl_ev_worship_expression_40',
  event_id: 'ev_worship_expression_40',
  photo_x: 0.31,
  photo_y: 0.344,
  photo_width: 0.38,
  photo_height: 0.38,
  photo_shape: 'circle',
  photo_crop_settings: { zoom: 1.0 },
  name_x: 0.28,
  name_y: 0.718,
  name_width: 0.44,
  name_height: 0.048,
  font_family: 'Plus Jakarta Sans, sans-serif',
  font_size: 44,
  font_weight: '800',
  text_color: '#111126',
  text_alignment: 'center',
  max_lines: 1,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-03T11:00:00.000Z',
};

export async function clearAllSystemData(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('file_') || k.startsWith('eventra_') || k.startsWith('temp_'))) {
          if (k !== LS_CLEAN_WIPE_KEY && k !== LS_SUPABASE_CONFIG) {
            localStorage.removeItem(k);
          }
        }
      }
    }
  } catch {}
  memoryFileStore.clear();
  memoryKvStore.clear();

  // Initialize with flagship live event so participant links work seamlessly on all devices
  safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify([FLAGSHIP_WORSHIP_EVENT]));
  safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify([FLAGSHIP_WORSHIP_TEMPLATE]));
  safeLocalStorageSet(LS_REGISTRATIONS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_INVITATIONS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_PARTICIPANTS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_DOWNLOADS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_SAVED_EVENTS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_USER_INTERESTS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_EVENT_ANALYTICS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_FORM_CONFIGS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_ACCOUNTS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_VISITS_KEY, JSON.stringify([]));
  safeLocalStorageSet(LS_CLEAN_WIPE_KEY, 'true');
}

export async function initializeLocalData(): Promise<void> {
  const existingEventsRaw = safeLocalStorageGet(LS_EVENTS_KEY);
  let eventsList: FlyerEvent[] = existingEventsRaw ? JSON.parse(existingEventsRaw) : [];

  // Guarantee flagship live event is seeded for mobile and fresh visitors
  const hasWorship = eventsList.some(
    (e) => e.slug === 'worship-expression-40' || e.slug === 'worship-experience-40' || e.id === 'ev_worship_expression_40'
  );
  if (!hasWorship) {
    eventsList.unshift(FLAGSHIP_WORSHIP_EVENT);
    safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify(eventsList));
  }

  const existingTmplsRaw = safeLocalStorageGet(LS_TEMPLATES_KEY);
  let tmplsList: FlyerTemplate[] = existingTmplsRaw ? JSON.parse(existingTmplsRaw) : [];
  const hasWorshipTmpl = tmplsList.some((t) => t.event_id === FLAGSHIP_WORSHIP_EVENT.id);
  if (!hasWorshipTmpl) {
    tmplsList.unshift(FLAGSHIP_WORSHIP_TEMPLATE);
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(tmplsList));
  }

  if (!safeLocalStorageGet(LS_REGISTRATIONS_KEY)) safeLocalStorageSet(LS_REGISTRATIONS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_INVITATIONS_KEY)) safeLocalStorageSet(LS_INVITATIONS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_PARTICIPANTS_KEY)) safeLocalStorageSet(LS_PARTICIPANTS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_DOWNLOADS_KEY)) safeLocalStorageSet(LS_DOWNLOADS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_SAVED_EVENTS_KEY)) safeLocalStorageSet(LS_SAVED_EVENTS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_USER_INTERESTS_KEY)) safeLocalStorageSet(LS_USER_INTERESTS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_EVENT_ANALYTICS_KEY)) safeLocalStorageSet(LS_EVENT_ANALYTICS_KEY, JSON.stringify([]));
  if (!safeLocalStorageGet(LS_FORM_CONFIGS_KEY)) safeLocalStorageSet(LS_FORM_CONFIGS_KEY, JSON.stringify([]));
}

// Database helper operations
export const db = {
  getCurrentProfile(): Profile | null {
    const raw = safeLocalStorageGet(LS_USER_KEY);
    if (!raw) return null;
    try {
      const parsed: Profile = JSON.parse(raw);
      if (parsed.email === 'alex.morgan@eventra.io' || parsed.email === 'organizer@eventra.io' || parsed.id?.startsWith('usr_demo') || parsed.id === 'usr_organizer_01') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  updateProfile(updates: Partial<Profile>): Profile | null {
    const current = this.getCurrentProfile();
    if (!current) return null;
    const updated = { ...current, ...updates };
    safeLocalStorageSet(LS_USER_KEY, JSON.stringify(updated));

    // Sync to stored accounts
    const accounts = getStoredAccounts();
    const accIdx = accounts.findIndex((a) => a.id === updated.id || a.email.toLowerCase() === updated.email.toLowerCase());
    if (accIdx >= 0) {
      accounts[accIdx] = {
        ...accounts[accIdx],
        full_name: updated.full_name || accounts[accIdx].full_name,
        account_type: updated.account_type || accounts[accIdx].account_type,
        is_host: updated.is_host !== undefined ? updated.is_host : accounts[accIdx].is_host,
        active_view: updated.active_view || accounts[accIdx].active_view,
      };
      safeLocalStorageSet(LS_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
    return updated;
  },

  upgradeUserToHost(orgName?: string): { profile: Profile; organisation: Organisation } | null {
    const current = this.getCurrentProfile();
    if (!current) return null;

    const orgs = this.getOrganisations();
    let userOrg = orgs.find((o) => o.owner_id === current.id || o.id === current.current_org_id);

    if (!userOrg) {
      const brandName = orgName?.trim() || `${current.full_name || 'My'}'s Events`;
      const newOrgId = `org_${Date.now()}`;
      userOrg = {
        id: newOrgId,
        name: brandName,
        slug: brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace',
        owner_id: current.id,
        plan: 'professional',
        created_at: new Date().toISOString(),
      };
      this.saveOrganisation(userOrg);
    }

    const updatedProfile: Profile = {
      ...current,
      role: 'organisation_owner',
      is_host: true,
      active_view: 'host',
      current_org_id: userOrg.id,
    };
    this.updateProfile(updatedProfile);

    return { profile: updatedProfile, organisation: userOrg };
  },

  switchUserActiveView(activeView: 'host' | 'attendee'): Profile | null {
    return this.updateProfile({ active_view: activeView });
  },

  getOrganisations(): Organisation[] {
    const raw = safeLocalStorageGet(LS_ORGS_KEY);
    if (!raw) return [];
    try {
      const orgs: Organisation[] = JSON.parse(raw);
      return orgs.filter((o) => o.id !== 'org_elevate_01' && o.owner_id !== 'usr_demo_482b5ca0');
    } catch {
      return [];
    }
  },

  getCurrentOrganisation(): Organisation | null {
    const orgs = this.getOrganisations();
    const currentId = safeLocalStorageGet(LS_CURRENT_ORG_KEY);
    if (currentId) {
      const found = orgs.find((o) => o.id === currentId);
      if (found) return found;
    }
    return orgs.length > 0 ? orgs[0] : null;
  },

  saveOrganisation(org: Organisation): Organisation {
    const orgs = this.getOrganisations();
    const idx = orgs.findIndex((o) => o.id === org.id);
    if (idx >= 0) {
      orgs[idx] = org;
    } else {
      orgs.push(org);
    }
    safeLocalStorageSet(LS_ORGS_KEY, JSON.stringify(orgs));
    safeLocalStorageSet(LS_CURRENT_ORG_KEY, org.id);
    return org;
  },

  setCurrentOrganisationId(orgId: string): void {
    safeLocalStorageSet(LS_CURRENT_ORG_KEY, orgId);
    this.updateProfile({ current_org_id: orgId });
  },

  getOrgMembers(orgId?: string): OrganisationMember[] {
    const raw = safeLocalStorageGet(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const targetOrgId = orgId || this.getCurrentOrganisation()?.id;
    if (!targetOrgId) return [];
    return list.filter((m) => m.org_id === targetOrgId);
  },

  addOrgMember(member: Omit<OrganisationMember, 'id' | 'joined_at'>): OrganisationMember {
    const raw = safeLocalStorageGet(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const newMember: OrganisationMember = {
      ...member,
      id: `mem_${Date.now()}`,
      joined_at: new Date().toISOString(),
    };
    list.push(newMember);
    safeLocalStorageSet(LS_ORG_MEMBERS_KEY, JSON.stringify(list));
    return newMember;
  },

  removeOrgMember(memberId: string): void {
    const raw = safeLocalStorageGet(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((m) => m.id !== memberId);
    safeLocalStorageSet(LS_ORG_MEMBERS_KEY, JSON.stringify(filtered));
  },

  getEvents(): FlyerEvent[] {
    const raw = safeLocalStorageGet(LS_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getEventById(id: string): FlyerEvent | null {
    const events = this.getEvents();
    return events.find((e) => e.id === id) || null;
  },

  getEventBySlug(slug: string): FlyerEvent | null {
    const events = this.getEvents();
    const clean = slug.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const found = events.find((e) => {
      const s = e.slug.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return s === clean || e.slug.toLowerCase() === slug.toLowerCase() || e.id === slug;
    });
    if (found) return found;

    // Guaranteed resolution for flagship Worship Expression 4.0
    if (clean.includes('worship') || clean.includes('expression')) {
      return FLAGSHIP_WORSHIP_EVENT;
    }
    return null;
  },

  /**
   * Saves an event while safely offloading heavy image data to IndexedDB
   * so localStorage never exceeds its 5MB quota limit.
   */
  saveEvent(event: FlyerEvent): FlyerEvent {
    // If the event has image data, persist it to IndexedDB
    if (event.original_flyer_data_url && event.original_flyer_path) {
      storeFileInIDB(event.original_flyer_path, event.original_flyer_data_url).catch((err) => {
        console.warn('IDB background save notice:', err);
      });
    }

    const events = this.getEvents();
    const idx = events.findIndex((e) => e.id === event.id);

    // Save a lightweight version into localStorage (strips out multi-megabyte base64 dataUrl)
    const lightweightEvent: FlyerEvent = {
      ...event,
      original_flyer_data_url: '', // Safely empty in localStorage; full image is in IDB/Supabase
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      events[idx] = lightweightEvent;
    } else {
      events.unshift(lightweightEvent);
    }

    safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify(events));
    return event;
  },

  deleteEvent(id: string): void {
    const events = this.getEvents().filter((e) => e.id !== id);
    safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify(events));
  },

  getTemplates(): FlyerTemplate[] {
    const raw = safeLocalStorageGet(LS_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getTemplateByEventId(eventId: string): FlyerTemplate | null {
    const tmpls = this.getTemplates();
    const found = tmpls.find((t) => t.event_id === eventId);
    if (found) return found;

    if (eventId === FLAGSHIP_WORSHIP_EVENT.id || eventId.includes('worship')) {
      return FLAGSHIP_WORSHIP_TEMPLATE;
    }
    return null;
  },

  saveTemplate(template: FlyerTemplate): FlyerTemplate {
    const tmpls = this.getTemplates();
    const idx = tmpls.findIndex((t) => t.event_id === template.event_id);
    if (idx >= 0) {
      tmpls[idx] = { ...template, updated_at: new Date().toISOString() };
    } else {
      tmpls.push(template);
    }
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(tmpls));
    return template;
  },

  getParticipants(eventId?: string): Participant[] {
    const raw = safeLocalStorageGet(LS_PARTICIPANTS_KEY);
    const list: Participant[] = raw ? JSON.parse(raw) : [];
    if (eventId) return list.filter((p) => p.event_id === eventId);
    return list;
  },

  addParticipant(participant: Participant): Participant {
    const list = this.getParticipants();
    list.unshift(participant);
    safeLocalStorageSet(LS_PARTICIPANTS_KEY, JSON.stringify(list.slice(0, 500))); // Retain up to 500 records
    return participant;
  },

  getDownloads(eventId?: string): FlyerDownload[] {
    const raw = safeLocalStorageGet(LS_DOWNLOADS_KEY);
    const list: FlyerDownload[] = raw ? JSON.parse(raw) : [];
    if (eventId) return list.filter((d) => d.event_id === eventId);
    return list;
  },

  recordDownload(download: FlyerDownload): FlyerDownload {
    const list = this.getDownloads();
    list.push(download);
    safeLocalStorageSet(LS_DOWNLOADS_KEY, JSON.stringify(list.slice(-500))); // Retain up to 500 downloads
    return download;
  },

  // ----------------------------------------------------
  // VISITOR LOGGING & REAL-TIME TELEMETRY
  // ----------------------------------------------------
  recordVisit(path: string, eventSlug?: string): SiteVisit {
    const visitorId = getOrCreateVisitorId();
    const raw = safeLocalStorageGet(LS_VISITS_KEY);
    const visits: SiteVisit[] = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const visit: SiteVisit = {
      id: `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      visitor_id: visitorId,
      path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      event_slug: eventSlug,
      referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
      device_type: detectDeviceType(),
      browser: typeof navigator !== 'undefined'
        ? navigator.userAgent.includes('Edg')
          ? 'Edge'
          : navigator.userAgent.includes('Chrome')
          ? 'Chrome'
          : navigator.userAgent.includes('Firefox')
          ? 'Firefox'
          : navigator.userAgent.includes('Safari')
          ? 'Safari'
          : 'Browser'
        : 'Browser',
      timestamp: now.toISOString(),
    };

    // Prepend and cap at latest 1,000 site visits to preserve storage
    visits.unshift(visit);
    safeLocalStorageSet(LS_VISITS_KEY, JSON.stringify(visits.slice(0, 1000)));

    return visit;
  },

  getVisitorStats(): VisitorStats {
    const raw = safeLocalStorageGet(LS_VISITS_KEY);
    const visits: SiteVisit[] = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const uniqueAll = new Set<string>();
    const uniqueToday = new Set<string>();
    const uniqueWeek = new Set<string>();

    let visitsToday = 0;
    let visitsThisWeek = 0;
    const visitsByPath: Record<string, number> = {};
    const visitsByEventSlug: Record<string, number> = {};
    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };

    // Initialize 7-day trend buckets
    const trendMap = new Map<string, { date: string; label: string; visits: number; uniques: Set<string> }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      trendMap.set(dateKey, { date: dateKey, label: dayLabel, visits: 0, uniques: new Set<string>() });
    }

    for (const v of visits) {
      uniqueAll.add(v.visitor_id);
      const vDate = v.timestamp ? v.timestamp.slice(0, 10) : '';
      const vTime = new Date(v.timestamp || 0);

      if (vDate === todayStr) {
        visitsToday++;
        uniqueToday.add(v.visitor_id);
      }
      if (vTime >= oneWeekAgo) {
        visitsThisWeek++;
        uniqueWeek.add(v.visitor_id);
      }

      // Path distribution
      const p = v.path || '/';
      visitsByPath[p] = (visitsByPath[p] || 0) + 1;

      // Event slug distribution
      if (v.event_slug) {
        visitsByEventSlug[v.event_slug] = (visitsByEventSlug[v.event_slug] || 0) + 1;
      }

      // Device breakdown
      if (v.device_type === 'mobile') deviceBreakdown.mobile++;
      else if (v.device_type === 'tablet') deviceBreakdown.tablet++;
      else deviceBreakdown.desktop++;

      // 7-day trend aggregation
      if (trendMap.has(vDate)) {
        const item = trendMap.get(vDate)!;
        item.visits++;
        item.uniques.add(v.visitor_id);
      }
    }

    const dailyTrends: DailyVisitorTrend[] = Array.from(trendMap.values()).map((item) => ({
      date: item.date,
      label: item.label,
      visits: item.visits,
      uniques: item.uniques.size,
    }));

    // Overall conversion rate
    const totalDownloads = this.getDownloads().length;
    const uniqueCount = uniqueAll.size;
    const conversionRate = uniqueCount > 0 
      ? Math.min(100, Math.round((totalDownloads / uniqueCount) * 100))
      : 0;

    return {
      totalVisits: visits.length,
      uniqueVisitors: uniqueAll.size,
      visitsToday,
      uniqueToday: uniqueToday.size,
      visitsThisWeek,
      uniqueThisWeek: uniqueWeek.size,
      conversionRate,
      visitsByPath,
      visitsByEventSlug,
      dailyTrends,
      recentVisits: visits.slice(0, 50),
      deviceBreakdown,
    };
  },

  // ----------------------------------------------------
  // CRM ATTENDEE & USER DIRECTORY METHODS
  // ----------------------------------------------------
  getAllParticipantsCRM(): AttendeeCrmRecord[] {
    const participants = this.getParticipants();
    const events = this.getEvents();
    const downloads = this.getDownloads();

    const eventMap = new Map<string, FlyerEvent>();
    events.forEach((e) => eventMap.set(e.id, e));

    const dlMap = new Map<string, FlyerDownload[]>();
    downloads.forEach((d) => {
      if (d.participant_id) {
        const arr = dlMap.get(d.participant_id) || [];
        arr.push(d);
        dlMap.set(d.participant_id, arr);
      }
    });

    return participants.map((p) => {
      const ev = eventMap.get(p.event_id);
      const pDls = dlMap.get(p.id) || [];
      const formats = Array.from(new Set(pDls.map((d) => d.format)));
      const latestDl = [...pDls].sort(
        (a, b) => new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime()
      )[0];

      return {
        ...p,
        event_name: ev ? ev.event_name : 'Unknown Event',
        event_slug: ev ? ev.slug : '',
        event_status: ev ? ev.status : 'draft',
        downloads_count: pDls.length,
        download_formats: formats,
        last_download_at: latestDl?.downloaded_at,
      };
    });
  },

  getAllUsersCRM(): UserCrmRecord[] {
    const accounts = getStoredAccounts();
    const events = this.getEvents();
    const participants = this.getParticipants();
    const downloads = this.getDownloads();

    const currentProf = this.getCurrentProfile();
    const currentOrg = this.getCurrentOrganisation();

    const userMap = new Map<string, UserCrmRecord>();

    accounts.forEach((acc) => {
      const userEvents = events.filter((e) => e.user_id === acc.id || (acc.org_id && e.org_id === acc.org_id));
      const userEventIds = new Set(userEvents.map((e) => e.id));
      const userParts = participants.filter((p) => userEventIds.has(p.event_id));
      const userDls = downloads.filter((d) => userEventIds.has(d.event_id));

      userMap.set(acc.email.toLowerCase(), {
        id: acc.id,
        email: acc.email,
        full_name: acc.full_name,
        org_id: acc.org_id,
        org_name: acc.org_name,
        created_at: acc.created_at,
        events_count: userEvents.length,
        total_attendees: userParts.length,
        total_downloads: userDls.length,
      });
    });

    // Include current session profile if not already captured
    if (currentProf && currentProf.email && !userMap.has(currentProf.email.toLowerCase())) {
      const userEvents = events.filter(
        (e) => e.user_id === currentProf.id || (currentOrg && e.org_id === currentOrg.id)
      );
      const userEventIds = new Set(userEvents.map((e) => e.id));
      const userParts = participants.filter((p) => userEventIds.has(p.event_id));
      const userDls = downloads.filter((d) => userEventIds.has(d.event_id));

      userMap.set(currentProf.email.toLowerCase(), {
        id: currentProf.id,
        email: currentProf.email,
        full_name: currentProf.full_name || 'Software Owner',
        org_id: currentProf.current_org_id || currentOrg?.id || 'org_main',
        org_name: currentOrg?.name || 'Primary Workspace',
        created_at: currentProf.created_at || new Date().toISOString(),
        events_count: userEvents.length,
        total_attendees: userParts.length,
        total_downloads: userDls.length,
      });
    }

    return Array.from(userMap.values());
  },

  getPlatformOverviewMetrics(): PlatformOverviewMetrics {
    const stats = this.getVisitorStats();
    const events = this.getEvents();
    const attendees = this.getParticipants();
    const downloads = this.getDownloads();
    const users = this.getAllUsersCRM();

    const published = events.filter((e) => e.status === 'published').length;
    const convRate = stats.uniqueVisitors > 0 
      ? Math.min(100, Math.round((downloads.length / stats.uniqueVisitors) * 100))
      : attendees.length > 0 
        ? Math.min(100, Math.round((downloads.length / attendees.length) * 100))
        : 0;

    return {
      totalUniqueVisitors: stats.uniqueVisitors,
      totalVisits: stats.totalVisits,
      visitorsToday: stats.uniqueToday,
      totalOrganizers: Math.max(users.length, 1),
      totalEvents: events.length,
      publishedEvents: published,
      totalAttendees: attendees.length,
      totalDownloads: downloads.length,
      conversionRate: convRate,
    };
  },

  clearVisitorLogs(): void {
    safeLocalStorageSet(LS_VISITS_KEY, JSON.stringify([]));
  },

  seedDemoVisits(): void {
    // Left empty: visitor logging is now strictly live and real
    safeLocalStorageSet(LS_VISITS_KEY, JSON.stringify([]));
  },

  purgeDummyData(): { removedEvents: number; removedParticipants: number } {
    const events = this.getEvents();
    const realEvents = events.filter(
      (e) => e.id !== 'ev_tech_001' && 
             e.id !== 'ev_gala_002' && 
             e.id !== 'ev_tech_summit_2026' &&
             e.id !== 'ev_lagos_creative_2026' &&
             e.id !== 'ev_london_leadership_2026' &&
             e.id !== 'ev_online_distributed_systems' &&
             !e.id.startsWith('ev_demo_')
    );
    const removedEvents = events.length - realEvents.length;
    safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify(realEvents));

    const parts = this.getParticipants();
    const realParts = parts.filter(
      (p) => p.id !== 'part_001' && p.id !== 'part_002' && p.id !== 'part_003' && !p.id.startsWith('part_demo_')
    );
    const removedParts = parts.length - realParts.length;
    safeLocalStorageSet(LS_PARTICIPANTS_KEY, JSON.stringify(realParts));

    const dls = this.getDownloads();
    const realDls = dls.filter(
      (d) => d.id !== 'dl_001' && d.id !== 'dl_002' && d.id !== 'dl_003' && d.id !== 'dl_004'
    );
    safeLocalStorageSet(LS_DOWNLOADS_KEY, JSON.stringify(realDls));

    return { removedEvents, removedParticipants: removedParts };
  },

  // ----------------------------------------------------
  // STAGE 1: EVENTRA MANAGE, DISCOVER, REGISTER, INVITE
  // ----------------------------------------------------
  getPublicEvents(): FlyerEvent[] {
    const events = this.getEvents();
    return events.filter((e) => e.status === 'published' && (e.visibility === 'public' || !e.visibility));
  },

  getDiscoverEvents(options?: {
    search?: string;
    category?: string;
    city?: string;
    country?: string;
    eventType?: string;
    timeframe?: string;
  }): FlyerEvent[] {
    let events = this.getPublicEvents();

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      events = events.filter((e) =>
        (e.title || e.event_name || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q) ||
        (e.country || '').toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.organiser_name || '').toLowerCase().includes(q)
      );
    }

    if (options?.category && options.category !== 'All') {
      events = events.filter((e) => (e.category || '').toLowerCase() === options.category!.toLowerCase());
    }

    if (options?.city && options.city !== 'All Cities') {
      events = events.filter((e) => (e.city || '').toLowerCase() === options.city!.toLowerCase());
    }

    if (options?.country && options.country !== 'All Countries') {
      events = events.filter((e) => (e.country || '').toLowerCase() === options.country!.toLowerCase());
    }

    if (options?.eventType && options.eventType !== 'all') {
      events = events.filter((e) => e.event_type === options.eventType);
    }

    return events;
  },

  // REGISTRATIONS (EVENTRA REGISTER)
  getRegistrations(eventId?: string): EventRegistration[] {
    const raw = safeLocalStorageGet(LS_REGISTRATIONS_KEY);
    if (!raw) return [];
    try {
      const all: EventRegistration[] = JSON.parse(raw);
      if (eventId) {
        return all.filter((r) => r.event_id === eventId);
      }
      return all;
    } catch {
      return [];
    }
  },

  getRegistrationsByEmail(email: string): EventRegistration[] {
    const raw = safeLocalStorageGet(LS_REGISTRATIONS_KEY);
    if (!raw || !email) return [];
    try {
      const all: EventRegistration[] = JSON.parse(raw);
      return all.filter((r) => r.email.toLowerCase() === email.toLowerCase());
    } catch {
      return [];
    }
  },

  getRegistrationById(id: string): EventRegistration | null {
    const all = this.getRegistrations();
    return all.find((r) => r.id === id) || null;
  },

  saveRegistration(data: Omit<EventRegistration, 'id' | 'registration_reference' | 'created_at' | 'updated_at'> & { id?: string; registration_reference?: string }): EventRegistration {
    const all = this.getRegistrations();
    const event = this.getEventById(data.event_id);

    // Capacity enforcement
    if (event && event.capacity && event.capacity > 0) {
      const existingConfirmed = all.filter((r) => r.event_id === data.event_id && r.status === 'confirmed').length;
      if (existingConfirmed >= event.capacity) {
        throw new Error('This event has reached maximum attendee capacity.');
      }
    }

    const newId = data.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = event?.slug ? event.slug.substring(0, 3).toUpperCase() : 'EVT';
    const reference = data.registration_reference || `${prefix}-${randomSuffix}`;

    const record: EventRegistration = {
      id: newId,
      event_id: data.event_id,
      attendee_user_id: data.attendee_user_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      registration_reference: reference,
      status: data.status || 'confirmed',
      custom_answers: data.custom_answers || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existingIndex = all.findIndex((r) => r.id === newId);
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...record, updated_at: new Date().toISOString() };
    } else {
      all.unshift(record);
    }

    safeLocalStorageSet(LS_REGISTRATIONS_KEY, JSON.stringify(all));
    this.recordEventAction(data.event_id, 'register_submit', { reference });
    return record;
  },

  updateRegistrationStatus(id: string, status: EventRegistration['status']): boolean {
    const all = this.getRegistrations();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    all[idx].status = status;
    all[idx].updated_at = new Date().toISOString();
    safeLocalStorageSet(LS_REGISTRATIONS_KEY, JSON.stringify(all));
    return true;
  },

  // REGISTRATION FORM CONFIG
  getRegistrationFormConfig(eventId: string): RegistrationFormConfig | null {
    const raw = safeLocalStorageGet(LS_FORM_CONFIGS_KEY);
    if (!raw) return null;
    try {
      const all: RegistrationFormConfig[] = JSON.parse(raw);
      return all.find((c) => c.event_id === eventId) || null;
    } catch {
      return null;
    }
  },

  saveRegistrationFormConfig(config: RegistrationFormConfig): RegistrationFormConfig {
    const raw = safeLocalStorageGet(LS_FORM_CONFIGS_KEY);
    const all: RegistrationFormConfig[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((c) => c.event_id === config.event_id);
    const updated = { ...config, updated_at: new Date().toISOString() };
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }
    safeLocalStorageSet(LS_FORM_CONFIGS_KEY, JSON.stringify(all));
    return updated;
  },

  // INVITATIONS (EVENTRA INVITE)
  getInvitations(eventId?: string): EventInvitation[] {
    const raw = safeLocalStorageGet(LS_INVITATIONS_KEY);
    if (!raw) return [];
    try {
      const all: EventInvitation[] = JSON.parse(raw);
      if (eventId) {
        return all.filter((i) => i.event_id === eventId);
      }
      return all;
    } catch {
      return [];
    }
  },

  getInvitationByToken(token: string): EventInvitation | null {
    const all = this.getInvitations();
    return all.find((i) => i.invitation_token === token) || null;
  },

  saveInvitation(data: Omit<EventInvitation, 'id' | 'created_at' | 'updated_at'> & { id?: string }): EventInvitation {
    const all = this.getInvitations();
    const token = data.invitation_token || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newId = data.id || `inv_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: EventInvitation = {
      id: newId,
      event_id: data.event_id,
      invited_name: data.invited_name,
      invited_email: data.invited_email,
      invited_phone: data.invited_phone,
      invitation_token: token,
      message: data.message,
      status: data.status || 'sent',
      rsvp_response: data.rsvp_response || 'pending',
      guest_count: data.guest_count || 1,
      dietary_preferences: data.dietary_preferences,
      rsvp_deadline: data.rsvp_deadline,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const existingIndex = all.findIndex((i) => i.id === newId || i.invitation_token === token);
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...record, updated_at: new Date().toISOString() };
    } else {
      all.unshift(record);
    }
    safeLocalStorageSet(LS_INVITATIONS_KEY, JSON.stringify(all));
    return record;
  },

  updateInvitationRSVP(
    token: string,
    rsvp: 'accepted' | 'declined' | 'maybe',
    guestCount?: number,
    dietaryPreferences?: string
  ): boolean {
    const all = this.getInvitations();
    const idx = all.findIndex((i) => i.invitation_token === token);
    if (idx === -1) return false;
    all[idx].rsvp_response = rsvp;
    all[idx].status = rsvp === 'accepted' ? 'accepted' : rsvp === 'declined' ? 'declined' : 'maybe';
    if (guestCount !== undefined) all[idx].guest_count = guestCount;
    if (dietaryPreferences !== undefined) all[idx].dietary_preferences = dietaryPreferences;
    all[idx].updated_at = new Date().toISOString();
    safeLocalStorageSet(LS_INVITATIONS_KEY, JSON.stringify(all));

    this.recordEventAction(all[idx].event_id, rsvp === 'accepted' ? 'rsvp_accept' : 'rsvp_decline', { token });
    return true;
  },

  // SAVED EVENTS (ATTENDEE PORTAL)
  getSavedEvents(userId: string): SavedEvent[] {
    const raw = safeLocalStorageGet(LS_SAVED_EVENTS_KEY);
    if (!raw) return [];
    try {
      const all: SavedEvent[] = JSON.parse(raw);
      return all.filter((s) => s.user_id === userId);
    } catch {
      return [];
    }
  },

  isEventSaved(userId: string, eventId: string): boolean {
    if (!userId || !eventId) return false;
    const all = this.getSavedEvents(userId);
    return all.some((s) => s.event_id === eventId);
  },

  toggleSaveEvent(userId: string, eventId: string): boolean {
    if (!userId || !eventId) return false;
    const raw = safeLocalStorageGet(LS_SAVED_EVENTS_KEY);
    let all: SavedEvent[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((s) => s.user_id === userId && s.event_id === eventId);
    let isSaved = false;
    if (idx >= 0) {
      all.splice(idx, 1);
      isSaved = false;
    } else {
      all.push({
        id: `save_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        event_id: eventId,
        created_at: new Date().toISOString(),
      });
      isSaved = true;
      this.recordEventAction(eventId, 'event_save');
    }
    safeLocalStorageSet(LS_SAVED_EVENTS_KEY, JSON.stringify(all));
    return isSaved;
  },

  // USER INTERESTS
  getUserInterests(userId: string): string[] {
    const raw = safeLocalStorageGet(LS_USER_INTERESTS_KEY);
    if (!raw) return [];
    try {
      const all: UserInterest[] = JSON.parse(raw);
      return all.filter((ui) => ui.user_id === userId).map((ui) => ui.category);
    } catch {
      return [];
    }
  },

  saveUserInterests(userId: string, categories: string[]): void {
    const raw = safeLocalStorageGet(LS_USER_INTERESTS_KEY);
    let all: UserInterest[] = raw ? JSON.parse(raw) : [];
    all = all.filter((ui) => ui.user_id !== userId);
    categories.forEach((cat) => {
      all.push({
        id: `ui_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        category: cat,
        created_at: new Date().toISOString(),
      });
    });
    safeLocalStorageSet(LS_USER_INTERESTS_KEY, JSON.stringify(all));
  },

  // EVENT PAGE ANALYTICS
  recordEventAction(eventId: string, action_type: EventPageAnalytic['action_type'], metadata?: Record<string, any>): void {
    try {
      const raw = safeLocalStorageGet(LS_EVENT_ANALYTICS_KEY);
      const all: EventPageAnalytic[] = raw ? JSON.parse(raw) : [];
      const visitorId = getOrCreateVisitorId();
      all.push({
        id: `epa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        event_id: eventId,
        visitor_id: visitorId,
        action_type,
        metadata,
        timestamp: new Date().toISOString(),
      });
      const trimmed = all.slice(-1000);
      safeLocalStorageSet(LS_EVENT_ANALYTICS_KEY, JSON.stringify(trimmed));
    } catch {}
  },

  getEventAnalytics(eventId: string): { views: number; registerClicks: number; rsvpResponses: number } {
    try {
      const raw = safeLocalStorageGet(LS_EVENT_ANALYTICS_KEY);
      if (!raw) return { views: 0, registerClicks: 0, rsvpResponses: 0 };
      const all: EventPageAnalytic[] = JSON.parse(raw);
      const evItems = all.filter((a) => a.event_id === eventId);
      const views = evItems.filter((a) => a.action_type === 'view').length;
      const registerClicks = evItems.filter((a) => a.action_type === 'register_click' || a.action_type === 'register_submit').length;
      const rsvpResponses = evItems.filter((a) => a.action_type === 'rsvp_accept' || a.action_type === 'rsvp_decline').length;
      return { views, registerClicks, rsvpResponses };
    } catch {
      return { views: 0, registerClicks: 0, rsvpResponses: 0 };
    }
  },

  clearWorkspaceEvents(): void {
    safeLocalStorageSet(LS_EVENTS_KEY, JSON.stringify([]));
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify([]));
    safeLocalStorageSet(LS_PARTICIPANTS_KEY, JSON.stringify([]));
    safeLocalStorageSet(LS_DOWNLOADS_KEY, JSON.stringify([]));
  },
};

/**
 * Utility to generate downloadable CSV string for CRM attendee export
 */
export function exportAttendeesToCSV(attendees: AttendeeCrmRecord[]): string {
  const headers = ['Attendee Name', 'Event Name', 'Event Slug', 'Status', 'Has Photo', 'Downloads', 'Formats', 'Created At', 'Last Downloaded At'];
  const rows = attendees.map((a) => [
    `"${(a.full_name || '').replace(/"/g, '""')}"`,
    `"${(a.event_name || '').replace(/"/g, '""')}"`,
    `"${(a.event_slug || '').replace(/"/g, '""')}"`,
    `"${a.event_status}"`,
    a.photo_path ? 'Yes' : 'No',
    a.downloads_count,
    `"${a.download_formats.join(', ')}"`,
    `"${a.created_at}"`,
    `"${a.last_download_at || ''}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Utility to export Event Registrations (Eventra Register) to CSV
 */
export function exportEventRegistrationsToCSV(registrations: EventRegistration[]): string {
  const headers = ['Reference', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Registered Date'];
  const rows = registrations.map((r) => [
    `"${r.registration_reference}"`,
    `"${(r.first_name || '').replace(/"/g, '""')}"`,
    `"${(r.last_name || '').replace(/"/g, '""')}"`,
    `"${(r.email || '').replace(/"/g, '""')}"`,
    `"${(r.phone || '').replace(/"/g, '""')}"`,
    `"${r.status}"`,
    `"${r.created_at}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Utility to export Event Invitations (Eventra Invite) to CSV
 */
export function exportEventInvitationsToCSV(invitations: EventInvitation[]): string {
  const headers = ['Invited Name', 'Email', 'Phone', 'Token Link', 'RSVP Status', 'Guest Count', 'Dietary Notes', 'Created At'];
  const rows = invitations.map((i) => [
    `"${(i.invited_name || '').replace(/"/g, '""')}"`,
    `"${(i.invited_email || '').replace(/"/g, '""')}"`,
    `"${(i.invited_phone || '').replace(/"/g, '""')}"`,
    `"/invite/${i.invitation_token}"`,
    `"${i.rsvp_response}"`,
    i.guest_count || 1,
    `"${(i.dietary_preferences || '').replace(/"/g, '""')}"`,
    `"${i.created_at}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

