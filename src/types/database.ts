export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'platform_admin' | 'organisation_owner' | 'organisation_admin' | 'event_manager' | 'team_member' | 'attendee' | 'host';

export type EventVisibility = 'public' | 'unlisted' | 'private';
export type EventPublicationStatus = 'draft' | 'published' | 'completed' | 'cancelled' | 'archived';
export type EventRegistrationState = 'open' | 'closed' | 'invite_only';
export type EventFormat = 'physical' | 'online' | 'hybrid';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string;
  role?: UserRole;
  account_type?: 'host' | 'attendee';
  is_host?: boolean;
  active_view?: 'host' | 'attendee';
  current_org_id?: string;
  location_city?: string;
  location_country?: string;
  created_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'starter' | 'professional' | 'enterprise';
  logo_url?: string;
  settings?: {
    default_timezone?: string;
    brand_color?: string;
    custom_domain?: string;
  };
  created_at: string;
}

export interface OrganisationMember {
  id: string;
  org_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'event_manager' | 'member';
  joined_at: string;
}

export interface EventScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventFaqItem {
  question: string;
  answer: string;
}

export interface FlyerEvent {
  id: string;
  user_id: string;
  org_id?: string;
  event_name: string;
  title?: string; // Standard alias for event_name
  slug: string;
  original_flyer_path: string;
  original_flyer_data_url?: string; // For local/offline storage caching
  cover_image_url?: string; // Cover image for Discover & Event page
  status: EventPublicationStatus;
  visibility?: EventVisibility; // 'public' | 'unlisted' | 'private'
  registration_status?: EventRegistrationState; // 'open' | 'closed' | 'invite_only'
  category?: string;
  description?: string;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  event_type?: EventFormat;
  online_url?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  capacity?: number;
  registration_open_at?: string;
  registration_close_at?: string;
  is_featured?: boolean;
  organiser_name?: string;
  organiser_email?: string;
  organiser_contact?: string;
  event_website?: string;
  schedule?: EventScheduleItem[];
  faqs?: EventFaqItem[];
  created_at: string;
  updated_at: string;
}

export interface FlyerTemplate {
  id: string;
  event_id: string;
  photo_x: number; // Normalized 0.0 to 1.0
  photo_y: number; // Normalized 0.0 to 1.0
  photo_width: number; // Normalized 0.0 to 1.0
  photo_height: number; // Normalized 0.0 to 1.0
  photo_shape: 'circle' | 'rectangle';
  photo_crop_settings?: {
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
    borderRadius?: number;
    frameScale?: number;
    frameOffsetX?: number;
    frameOffsetY?: number;
    nameOffsetY?: number;
  };
  name_x: number; // Normalized 0.0 to 1.0
  name_y: number; // Normalized 0.0 to 1.0
  name_width: number; // Normalized 0.0 to 1.0
  name_height: number; // Normalized 0.0 to 1.0
  font_family: string;
  font_size: number; // Base font size at 1080px reference width
  font_weight: string;
  text_color: string;
  text_alignment: 'left' | 'center' | 'right';
  max_lines: number;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  full_name: string;
  photo_path: string | null;
  created_at: string;
}

export interface FlyerDownload {
  id: string;
  participant_id: string | null;
  event_id: string;
  format: 'png' | 'jpg' | 'pdf';
  downloaded_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  attendee_user_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  registration_reference: string; // e.g. EVT-7X9K2
  status: 'confirmed' | 'pending' | 'cancelled' | 'waitlisted' | 'rejected';
  custom_answers?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RegistrationFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  options?: string[];
}

export interface RegistrationFormConfig {
  id: string;
  event_id: string;
  is_enabled: boolean;
  approval_required: boolean;
  fields: RegistrationFormField[];
  created_at: string;
  updated_at: string;
}

export interface EventInvitation {
  id: string;
  event_id: string;
  invited_name: string;
  invited_email: string;
  invited_phone?: string;
  invitation_token: string;
  message?: string;
  status: 'draft' | 'sent' | 'delivered' | 'opened' | 'accepted' | 'declined' | 'maybe' | 'expired';
  rsvp_response?: 'accepted' | 'declined' | 'maybe' | 'pending';
  guest_count: number;
  dietary_preferences?: string;
  rsvp_deadline?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedEvent {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface UserInterest {
  id: string;
  user_id: string;
  category: string;
  created_at: string;
}

export interface EventPageAnalytic {
  id: string;
  event_id: string;
  action_type: 'view' | 'register_click' | 'register_submit' | 'invite_click' | 'rsvp_accept' | 'rsvp_decline' | 'event_save' | 'share';
  visitor_id: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface FeatureModule {
  id: string;
  module_key: string;
  name: string;
  tagline: string;
  category: 'workspace' | 'event_tools' | 'management' | 'account';
  status: 'active' | 'beta' | 'coming_soon';
  description: string;
  badge?: string;
  route?: string;
}

export interface SiteVisit {
  id: string;
  visitor_id: string; // Anonymous persistent visitor UUID
  path: string;       // e.g. '/', '/events/worship-expression-40', '/login'
  event_slug?: string;
  referrer?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  timestamp: string;  // ISO string
}

export interface DailyVisitorTrend {
  date: string;       // YYYY-MM-DD
  label: string;      // e.g. 'Mon 03'
  visits: number;
  uniques: number;
}

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  uniqueToday: number;
  visitsThisWeek: number;
  uniqueThisWeek: number;
  conversionRate: number; // visitors -> generated attendees -> downloads
  visitsByPath: Record<string, number>;
  visitsByEventSlug: Record<string, number>;
  dailyTrends: DailyVisitorTrend[];
  recentVisits: SiteVisit[];
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface AttendeeCrmRecord extends Participant {
  event_name: string;
  event_slug: string;
  event_status: EventPublicationStatus;
  downloads_count: number;
  download_formats: string[];
  last_download_at?: string;
}

export interface UserCrmRecord {
  id: string;
  email: string;
  full_name: string;
  org_id: string;
  org_name: string;
  created_at: string;
  events_count: number;
  total_attendees: number;
  total_downloads: number;
}

export interface PlatformOverviewMetrics {
  totalUniqueVisitors: number;
  totalVisits: number;
  visitorsToday: number;
  totalOrganizers: number;
  totalEvents: number;
  publishedEvents: number;
  totalAttendees: number;
  totalDownloads: number;
  totalRegistrations?: number;
  conversionRate: number;
}
