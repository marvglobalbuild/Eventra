import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCustomSupabaseConfig, storeFileInIDB, getFileFromIDB } from './storage-and-db';

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getCustomSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, config.anonKey);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return cachedClient;
}

export function isSupabaseConnected(): boolean {
  return getSupabase() !== null;
}

/**
 * Resolves flyer image source: Checks remote Supabase storage URL or retrieves from local IndexedDB
 */
export async function resolveFlyerSource(originalPath: string, dataUrlFallback?: string): Promise<string> {
  if (!originalPath) return dataUrlFallback || '';

  // Direct public static assets or full URLs
  if (originalPath.startsWith('/') || originalPath.startsWith('http:') || originalPath.startsWith('https:') || originalPath.startsWith('data:') || originalPath.startsWith('blob:')) {
    return originalPath;
  }

  const client = getSupabase();
  if (client) {
    const { data } = client.storage.from('event-flyers').getPublicUrl(originalPath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Check IndexedDB
  const idbData = await getFileFromIDB(originalPath);
  if (idbData) {
    return idbData;
  }

  // Fallback to inline dataUrl
  if (dataUrlFallback) {
    return dataUrlFallback;
  }

  return originalPath;
}

/**
 * Automatically optimizes images to prevent memory spikes, browser crashes,
 * and storage quota exhaustion. Resizes large images (e.g. 12MP-48MP phone photos)
 * down to max 2048px while maintaining crisp resolution and clarity.
 */
export async function optimizeAndCompressImage(
  file: File, 
  maxDim = 2048, 
  quality = 0.88
): Promise<{ dataUrl: string; blob: Blob }> {
  // If not standard image or is SVG, fallback to basic reader
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, blob: file };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // If already small and under 600KB, read directly
      if (width <= maxDim && height <= maxDim && file.size < 600 * 1024) {
        fileToDataUrl(file)
          .then((dataUrl) => resolve({ dataUrl, blob: file }))
          .catch(() => resolve({ dataUrl: '', blob: file }));
        return;
      }

      // Proportional downscale
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fileToDataUrl(file).then((dataUrl) => resolve({ dataUrl, blob: file }));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob((blob) => {
        resolve({
          dataUrl,
          blob: blob || file,
        });
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fileToDataUrl(file).then((dataUrl) => resolve({ dataUrl, blob: file }));
    };

    img.src = objectUrl;
  });
}

/**
 * Stores a flyer image: uploads compressed image to Supabase if configured, or saves in IndexedDB
 */
export async function uploadFlyerFile(file: File, userId: string): Promise<{ path: string; dataUrl: string }> {
  const { dataUrl, blob } = await optimizeAndCompressImage(file, 2048, 0.90);
  const client = getSupabase();
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  if (client) {
    try {
      const { error } = await client.storage.from('event-flyers').upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
      });
      if (!error) {
        return { path: filePath, dataUrl };
      }
      console.warn('Supabase storage upload error, saving locally:', error);
    } catch (err) {
      console.warn('Supabase upload exception:', err);
    }
  }

  // Save to IndexedDB (which has large quota, unlike localStorage)
  await storeFileInIDB(filePath, dataUrl);
  return { path: filePath, dataUrl };
}

/**
 * Stores a participant photo: uploads compressed portrait to Supabase or stores in IndexedDB
 */
export async function uploadParticipantPhoto(file: File, eventId: string): Promise<{ path: string; dataUrl: string }> {
  const { dataUrl, blob } = await optimizeAndCompressImage(file, 1600, 0.88);
  const client = getSupabase();
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  if (client) {
    try {
      const { error } = await client.storage.from('participant-photos').upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
      });
      if (!error) {
        return { path: filePath, dataUrl };
      }
    } catch (err) {
      console.warn('Supabase participant photo upload error:', err);
    }
  }

  await storeFileInIDB(filePath, dataUrl);
  return { path: filePath, dataUrl };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Supabase SQL DDL Schema Script for Eventra Multi-Tenant Platform
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- EVENTRA PLATFORM — SUPABASE POSTGRESQL PRODUCTION DDL
-- Project URL: https://qshjupnpxibbvilxgwix.supabase.co/
-- Tagline: Events. Elevated.
-- Instructions: Paste and run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 0. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'organisation_owner' CHECK (role IN ('platform_admin', 'organisation_owner', 'organisation_admin', 'event_manager', 'team_member')),
    current_org_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ORGANISATIONS TABLE (Multi-tenant workspaces)
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'professional' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    logo_url TEXT,
    settings JSONB DEFAULT '{"default_timezone": "UTC", "brand_color": "#6425E8"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORGANISATION MEMBERS TABLE (Role-based access control)
CREATE TABLE IF NOT EXISTS public.organisation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'event_manager', 'member')),
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(org_id, user_id)
);

-- 4. EVENTS TABLE (Eventra Event registry & original flyer artwork)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    original_flyer_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    category TEXT DEFAULT 'Technology & AI',
    venue TEXT,
    event_date TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FLYER TEMPLATES TABLE (Eventra Create Engine Coordinates & Typography)
CREATE TABLE IF NOT EXISTS public.flyer_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
    photo_x NUMERIC NOT NULL DEFAULT 0.35,
    photo_y NUMERIC NOT NULL DEFAULT 0.28,
    photo_width NUMERIC NOT NULL DEFAULT 0.30,
    photo_height NUMERIC NOT NULL DEFAULT 0.30,
    photo_shape TEXT NOT NULL DEFAULT 'circle' CHECK (photo_shape IN ('circle', 'rectangle')),
    photo_crop_settings JSONB DEFAULT '{"zoom": 1}'::jsonb,
    name_x NUMERIC NOT NULL DEFAULT 0.15,
    name_y NUMERIC NOT NULL DEFAULT 0.60,
    name_width NUMERIC NOT NULL DEFAULT 0.70,
    name_height NUMERIC NOT NULL DEFAULT 0.08,
    font_family TEXT NOT NULL DEFAULT 'Plus Jakarta Sans, sans-serif',
    font_size NUMERIC NOT NULL DEFAULT 44,
    font_weight TEXT NOT NULL DEFAULT '700',
    text_color TEXT NOT NULL DEFAULT '#FFFFFF',
    text_alignment TEXT NOT NULL DEFAULT 'center' CHECK (text_alignment IN ('left', 'center', 'right')),
    max_lines INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PARTICIPANTS TABLE (Self-service attendee submissions)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    photo_path TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. FLYER DOWNLOADS TABLE (Analytics ledger)
CREATE TABLE IF NOT EXISTS public.flyer_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'pdf')),
    downloaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. INDEXES FOR LIGHTNING SPEED QUERIES
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_event_id ON public.flyer_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_downloads_event_id ON public.flyer_downloads(event_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organisation_members(org_id);

-- 9. AUTOMATIC NEW USER PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'organisation_owner',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flyer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flyer_downloads ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Organisations: Members can view their orgs
CREATE POLICY "Org members view organisation" ON public.organisations FOR SELECT USING (
    owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organisation_members 
        WHERE organisation_members.org_id = organisations.id AND organisation_members.user_id = auth.uid()
    )
);
CREATE POLICY "Org owners manage organisation" ON public.organisations FOR ALL USING (owner_id = auth.uid());

-- Organisation Members
CREATE POLICY "Members view org membership" ON public.organisation_members FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organisations WHERE organisations.id = organisation_members.org_id AND organisations.owner_id = auth.uid()
    )
);
CREATE POLICY "Org owners manage members" ON public.organisation_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.organisations WHERE organisations.id = organisation_members.org_id AND organisations.owner_id = auth.uid()
    )
);

-- Events: Organisers manage events, Public can view published events
CREATE POLICY "Organisers manage events" ON public.events FOR ALL USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.organisation_members 
        WHERE organisation_members.org_id = events.org_id AND organisation_members.user_id = auth.uid()
    )
);
CREATE POLICY "Public view published events" ON public.events FOR SELECT USING (status = 'published');

-- Flyer Templates: Organisers manage, Public can view for published events
CREATE POLICY "Organisers manage templates" ON public.flyer_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = flyer_templates.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public view templates" ON public.flyer_templates FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = flyer_templates.event_id AND events.status = 'published')
);

-- Participants: Organisers view, Public can insert for published events
CREATE POLICY "Organisers view participants" ON public.participants FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = participants.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public create participant" ON public.participants FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = participants.event_id AND events.status = 'published')
);

-- Flyer Downloads: Organisers view, Public can record downloads
CREATE POLICY "Organisers view downloads" ON public.flyer_downloads FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = flyer_downloads.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public record downloads" ON public.flyer_downloads FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = flyer_downloads.event_id AND events.status = 'published')
);

-- 11. STORAGE BUCKETS (Event Flyers & Participant Photos)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('event-flyers', 'event-flyers', true),
    ('participant-photos', 'participant-photos', true),
    ('generated-flyers', 'generated-flyers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS
CREATE POLICY "Flyers publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'event-flyers');
CREATE POLICY "Authenticated users upload flyers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-flyers' AND auth.role() = 'authenticated');
CREATE POLICY "Participant photos readable" ON storage.objects FOR SELECT USING (bucket_id = 'participant-photos');
CREATE POLICY "Public upload participant photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'participant-photos');

-- ====================================================
-- 12. STAGE 1 INCREMENTAL SCHEMA (MANAGE, DISCOVER, REGISTER, INVITE)
-- ====================================================

-- Additional columns on public.events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'physical';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS online_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'open';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 500;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organiser_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organiser_email TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organiser_contact TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_website TEXT;

-- Event Registrations (Eventra Register)
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    attendee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    registration_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'confirmed',
    custom_answers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Registration Forms (Custom Form Builder)
CREATE TABLE IF NOT EXISTS public.event_registration_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
    is_enabled BOOLEAN DEFAULT true,
    approval_required BOOLEAN DEFAULT false,
    fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Invitations (Eventra Invite)
CREATE TABLE IF NOT EXISTS public.event_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    invited_name TEXT NOT NULL,
    invited_email TEXT NOT NULL,
    invited_phone TEXT,
    invitation_token TEXT NOT NULL UNIQUE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    rsvp_response TEXT DEFAULT 'pending',
    guest_count INTEGER DEFAULT 1,
    dietary_preferences TEXT,
    rsvp_deadline TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Saved Events (Attendee Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_saved_event UNIQUE (user_id, event_id)
);

-- User Interests (Attendee Discovery Preferences)
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_interest UNIQUE (user_id, category)
);

-- Event Page Analytics
CREATE TABLE IF NOT EXISTS public.event_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_events_visibility_status ON public.events(visibility, status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.event_registrations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.event_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_saved_events_user ON public.saved_events(user_id);

-- Stage 1 RLS Policies
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

-- Registrations RLS: Organiser can view/manage, Public can insert
CREATE POLICY "Organisers view registrations" ON public.event_registrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public submit registration" ON public.event_registrations FOR INSERT WITH CHECK (true);

-- Invitations RLS: Organiser manages, Public can view & update by token
CREATE POLICY "Organisers manage invitations" ON public.event_invitations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_invitations.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public view invitation by token" ON public.event_invitations FOR SELECT USING (true);
CREATE POLICY "Public update rsvp by token" ON public.event_invitations FOR UPDATE USING (true);

-- Saved Events RLS: Users manage their own bookmarks
CREATE POLICY "Users manage saved events" ON public.saved_events FOR ALL USING (user_id = auth.uid());

-- User Interests RLS
CREATE POLICY "Users manage interests" ON public.user_interests FOR ALL USING (user_id = auth.uid());
`;


