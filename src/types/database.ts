export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'platform_admin' | 'organisation_owner' | 'organisation_admin' | 'event_manager' | 'team_member';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string;
  role?: UserRole;
  current_org_id?: string;
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

export interface FlyerEvent {
  id: string;
  user_id: string;
  org_id?: string;
  event_name: string;
  slug: string;
  original_flyer_path: string;
  original_flyer_data_url?: string; // For local/offline storage caching
  status: 'draft' | 'published' | 'archived';
  category?: string;
  venue?: string;
  event_date?: string;
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
