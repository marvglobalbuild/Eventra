import { 
  Profile, FlyerEvent, FlyerTemplate, Participant, FlyerDownload, 
  Organisation, OrganisationMember 
} from '../types/database';
import { createSampleFlyerDataUrl } from './sample-flyers';

// IndexedDB database name and stores for reliable large image storage
const IDB_NAME = 'eventra_storage_db';
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

export async function storeFileInIDB(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(dataUrl, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB storage failed, falling back to memory/local', err);
    try {
      localStorage.setItem(`file_${key}`, dataUrl);
    } catch {
      // Ignore if quota exceeded
    }
  }
}

export async function getFileFromIDB(key: string): Promise<string | null> {
  try {
    const db = await openIDB();
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(localStorage.getItem(`file_${key}`));
    });
  } catch {
    return localStorage.getItem(`file_${key}`);
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

  const stored = localStorage.getItem(LS_SUPABASE_CONFIG);
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
  localStorage.setItem(LS_SUPABASE_CONFIG, JSON.stringify(cfg));
}

// Seed initial realistic data if clean state
export async function initializeLocalData(): Promise<void> {
  // 1. Initial User
  if (!localStorage.getItem(LS_USER_KEY)) {
    const defaultProfile: Profile = {
      id: 'usr_demo_482b5ca0',
      full_name: 'Alex Morgan',
      email: 'alex.morgan@eventra.io',
      role: 'organisation_owner',
      current_org_id: 'org_elevate_01',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    localStorage.setItem(LS_USER_KEY, JSON.stringify(defaultProfile));
  }

  // 2. Initial Organisation
  if (!localStorage.getItem(LS_ORGS_KEY)) {
    const defaultOrg: Organisation = {
      id: 'org_elevate_01',
      name: 'Elevate Experience Group',
      slug: 'elevate-group',
      owner_id: 'usr_demo_482b5ca0',
      plan: 'professional',
      settings: {
        default_timezone: 'America/New_York (EST)',
        brand_color: '#6425E8',
      },
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    localStorage.setItem(LS_ORGS_KEY, JSON.stringify([defaultOrg]));
    localStorage.setItem(LS_CURRENT_ORG_KEY, 'org_elevate_01');
  }

  // 3. Initial Organisation Members
  if (!localStorage.getItem(LS_ORG_MEMBERS_KEY)) {
    const members: OrganisationMember[] = [
      {
        id: 'mem_01',
        org_id: 'org_elevate_01',
        user_id: 'usr_demo_482b5ca0',
        full_name: 'Alex Morgan',
        email: 'alex.morgan@eventra.io',
        role: 'owner',
        joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: 'mem_02',
        org_id: 'org_elevate_01',
        user_id: 'usr_diana_02',
        full_name: 'Diana Hayes',
        email: 'diana.h@eventra.io',
        role: 'event_manager',
        joined_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      },
      {
        id: 'mem_03',
        org_id: 'org_elevate_01',
        user_id: 'usr_marcus_03',
        full_name: 'Marcus Vance',
        email: 'marcus.v@eventra.io',
        role: 'member',
        joined_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem(LS_ORG_MEMBERS_KEY, JSON.stringify(members));
  }

  // 4. Initial Events
  if (!localStorage.getItem(LS_EVENTS_KEY)) {
    const techFlyerData = createSampleFlyerDataUrl('tech');
    const galaFlyerData = createSampleFlyerDataUrl('gala');

    const techFileKey = 'event-flyers/tech-summit-2026.jpg';
    const galaFileKey = 'event-flyers/worship-expression-2026.jpg';

    await storeFileInIDB(techFileKey, techFlyerData);
    await storeFileInIDB(galaFileKey, galaFlyerData);

    const initialEvents: FlyerEvent[] = [
      {
        id: 'ev_tech_001',
        user_id: 'usr_demo_482b5ca0',
        org_id: 'org_elevate_01',
        event_name: 'Next Horizon AI Summit 2026',
        slug: 'next-horizon-2026',
        original_flyer_path: techFileKey,
        original_flyer_data_url: techFlyerData,
        status: 'published',
        category: 'Technology & AI',
        venue: 'Moscone Center, San Francisco',
        event_date: 'November 14-16, 2026',
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'ev_gala_002',
        user_id: 'usr_demo_482b5ca0',
        org_id: 'org_elevate_01',
        event_name: 'Worship Expression Gala',
        slug: 'worship-expression-gala',
        original_flyer_path: galaFileKey,
        original_flyer_data_url: galaFlyerData,
        status: 'published',
        category: 'Arts & Gala',
        venue: 'Grand Symphony Hall',
        event_date: 'December 20, 2026',
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ];

    const initialTemplates: FlyerTemplate[] = [
      {
        id: 'tmpl_tech_001',
        event_id: 'ev_tech_001',
        photo_x: 0.35,
        photo_y: 0.27,
        photo_width: 0.30,
        photo_height: 0.30,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1 },
        name_x: 0.15,
        name_y: 0.60,
        name_width: 0.70,
        name_height: 0.08,
        font_family: 'Plus Jakarta Sans, sans-serif',
        font_size: 42,
        font_weight: '700',
        text_color: '#FFFFFF',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tmpl_gala_002',
        event_id: 'ev_gala_002',
        photo_x: 0.34,
        photo_y: 0.28,
        photo_width: 0.32,
        photo_height: 0.32,
        photo_shape: 'circle',
        photo_crop_settings: { zoom: 1 },
        name_x: 0.15,
        name_y: 0.62,
        name_width: 0.70,
        name_height: 0.08,
        font_family: 'Playfair Display, serif',
        font_size: 46,
        font_weight: '700',
        text_color: '#FACC15',
        text_alignment: 'center',
        max_lines: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const initialParticipants: Participant[] = [
      {
        id: 'part_001',
        event_id: 'ev_tech_001',
        full_name: 'Elena Rostova',
        photo_path: 'sample-portrait',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'part_002',
        event_id: 'ev_tech_001',
        full_name: 'Marcus Vance',
        photo_path: 'sample-portrait',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'part_003',
        event_id: 'ev_gala_002',
        full_name: 'Sarah Adebayo',
        photo_path: 'sample-portrait',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ];

    const initialDownloads: FlyerDownload[] = [
      { id: 'dl_001', participant_id: 'part_001', event_id: 'ev_tech_001', format: 'png', downloaded_at: new Date().toISOString() },
      { id: 'dl_002', participant_id: 'part_001', event_id: 'ev_tech_001', format: 'pdf', downloaded_at: new Date().toISOString() },
      { id: 'dl_003', participant_id: 'part_002', event_id: 'ev_tech_001', format: 'jpg', downloaded_at: new Date().toISOString() },
      { id: 'dl_004', participant_id: 'part_003', event_id: 'ev_gala_002', format: 'png', downloaded_at: new Date().toISOString() },
    ];

    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(initialEvents));
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(initialTemplates));
    localStorage.setItem(LS_PARTICIPANTS_KEY, JSON.stringify(initialParticipants));
    localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(initialDownloads));
  }
}

// Database helper operations
export const db = {
  getCurrentProfile(): Profile {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) {
      const def: Profile = {
        id: 'usr_demo_482b5ca0',
        full_name: 'Alex Morgan',
        email: 'alex.morgan@eventra.io',
        role: 'organisation_owner',
        current_org_id: 'org_elevate_01',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(LS_USER_KEY, JSON.stringify(def));
      return def;
    }
    return JSON.parse(raw);
  },

  updateProfile(updates: Partial<Profile>): Profile {
    const current = this.getCurrentProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(LS_USER_KEY, JSON.stringify(updated));
    return updated;
  },

  getOrganisations(): Organisation[] {
    const raw = localStorage.getItem(LS_ORGS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getCurrentOrganisation(): Organisation {
    const orgs = this.getOrganisations();
    const currentId = localStorage.getItem(LS_CURRENT_ORG_KEY);
    const found = orgs.find((o) => o.id === currentId);
    if (found) return found;
    if (orgs.length > 0) return orgs[0];

    const def: Organisation = {
      id: 'org_elevate_01',
      name: 'Elevate Experience Group',
      slug: 'elevate-group',
      owner_id: 'usr_demo_482b5ca0',
      plan: 'professional',
      created_at: new Date().toISOString(),
    };
    this.saveOrganisation(def);
    return def;
  },

  saveOrganisation(org: Organisation): Organisation {
    const orgs = this.getOrganisations();
    const idx = orgs.findIndex((o) => o.id === org.id);
    if (idx >= 0) {
      orgs[idx] = org;
    } else {
      orgs.push(org);
    }
    localStorage.setItem(LS_ORGS_KEY, JSON.stringify(orgs));
    localStorage.setItem(LS_CURRENT_ORG_KEY, org.id);
    return org;
  },

  setCurrentOrganisationId(orgId: string): void {
    localStorage.setItem(LS_CURRENT_ORG_KEY, orgId);
    this.updateProfile({ current_org_id: orgId });
  },

  getOrgMembers(orgId?: string): OrganisationMember[] {
    const raw = localStorage.getItem(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const targetOrgId = orgId || this.getCurrentOrganisation().id;
    return list.filter((m) => m.org_id === targetOrgId);
  },

  addOrgMember(member: Omit<OrganisationMember, 'id' | 'joined_at'>): OrganisationMember {
    const raw = localStorage.getItem(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const newMember: OrganisationMember = {
      ...member,
      id: `mem_${Date.now()}`,
      joined_at: new Date().toISOString(),
    };
    list.push(newMember);
    localStorage.setItem(LS_ORG_MEMBERS_KEY, JSON.stringify(list));
    return newMember;
  },

  removeOrgMember(memberId: string): void {
    const raw = localStorage.getItem(LS_ORG_MEMBERS_KEY);
    const list: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((m) => m.id !== memberId);
    localStorage.setItem(LS_ORG_MEMBERS_KEY, JSON.stringify(filtered));
  },

  getEvents(): FlyerEvent[] {
    const raw = localStorage.getItem(LS_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getEventById(id: string): FlyerEvent | null {
    const events = this.getEvents();
    return events.find((e) => e.id === id) || null;
  },

  getEventBySlug(slug: string): FlyerEvent | null {
    const events = this.getEvents();
    return events.find((e) => e.slug.toLowerCase() === slug.toLowerCase()) || null;
  },

  saveEvent(event: FlyerEvent): FlyerEvent {
    const events = this.getEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = { ...event, updated_at: new Date().toISOString() };
    } else {
      events.unshift(event);
    }
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
    return event;
  },

  deleteEvent(id: string): void {
    const events = this.getEvents().filter((e) => e.id !== id);
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
  },

  getTemplates(): FlyerTemplate[] {
    const raw = localStorage.getItem(LS_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getTemplateByEventId(eventId: string): FlyerTemplate | null {
    const tmpls = this.getTemplates();
    return tmpls.find((t) => t.event_id === eventId) || null;
  },

  saveTemplate(template: FlyerTemplate): FlyerTemplate {
    const tmpls = this.getTemplates();
    const idx = tmpls.findIndex((t) => t.event_id === template.event_id);
    if (idx >= 0) {
      tmpls[idx] = { ...template, updated_at: new Date().toISOString() };
    } else {
      tmpls.push(template);
    }
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(tmpls));
    return template;
  },

  getParticipants(eventId?: string): Participant[] {
    const raw = localStorage.getItem(LS_PARTICIPANTS_KEY);
    const list: Participant[] = raw ? JSON.parse(raw) : [];
    if (eventId) return list.filter((p) => p.event_id === eventId);
    return list;
  },

  addParticipant(participant: Participant): Participant {
    const list = this.getParticipants();
    list.unshift(participant);
    localStorage.setItem(LS_PARTICIPANTS_KEY, JSON.stringify(list));
    return participant;
  },

  getDownloads(eventId?: string): FlyerDownload[] {
    const raw = localStorage.getItem(LS_DOWNLOADS_KEY);
    const list: FlyerDownload[] = raw ? JSON.parse(raw) : [];
    if (eventId) return list.filter((d) => d.event_id === eventId);
    return list;
  },

  recordDownload(download: FlyerDownload): FlyerDownload {
    const list = this.getDownloads();
    list.push(download);
    localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(list));
    return download;
  },
};
