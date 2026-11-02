import { FeatureModule } from '../types/database';

export const PLATFORM_MODULES: FeatureModule[] = [
  // Workspace
  {
    id: 'mod_overview',
    module_key: 'overview',
    name: 'Overview',
    tagline: 'Central operational intelligence',
    category: 'workspace',
    status: 'active',
    description: 'Real-time overview of event health, attendee engagement, and flyer download metrics.',
    route: '/dashboard',
  },
  {
    id: 'mod_my_events',
    module_key: 'my_events',
    name: 'My Events',
    tagline: 'Event portfolio & campaign management',
    category: 'workspace',
    status: 'active',
    description: 'Manage, configure, and monitor live published events and draft campaigns.',
    route: '/dashboard/events',
  },
  {
    id: 'mod_create_event',
    module_key: 'create_event',
    name: 'Create Event',
    tagline: 'Launch new event campaign',
    category: 'workspace',
    status: 'active',
    description: 'Setup a new event, assign organization parameters, and prepare assets.',
    route: '/create-event',
  },

  // Event Tools
  {
    id: 'mod_create_studio',
    module_key: 'eventra_create',
    name: 'Eventra Create',
    tagline: 'Personalised event flyer generation studio',
    category: 'event_tools',
    status: 'active',
    description: 'The core personalization engine. Upload flyer designs, define photo and typography coordinates, and produce branded participant links.',
    badge: 'Core Feature',
    route: '/dashboard',
  },
  {
    id: 'mod_invitations',
    module_key: 'invitations',
    name: 'Digital Invitations',
    tagline: 'Interactive RSVP & calendar invitations',
    category: 'event_tools',
    status: 'coming_soon',
    description: 'Send elegant responsive invites with 1-click RSVP and Google/Apple calendar integration.',
  },
  {
    id: 'mod_registrations',
    module_key: 'registrations',
    name: 'Registrations & Ticketing',
    tagline: 'Tiered passes & checkout pipeline',
    category: 'event_tools',
    status: 'coming_soon',
    description: 'Custom registration forms, tiered access passes, and payment gateway settlement.',
  },
  {
    id: 'mod_attendees',
    module_key: 'attendees',
    name: 'Guest & Attendee CRM',
    tagline: 'Participant directory & segmentation',
    category: 'event_tools',
    status: 'coming_soon',
    description: 'Unified attendee profiles, VIP tagging, communications history, and custom data fields.',
  },
  {
    id: 'mod_checkin',
    module_key: 'check_in',
    name: 'Guest Check-In',
    tagline: 'Fast QR scanner & on-site badge printing',
    category: 'event_tools',
    status: 'coming_soon',
    description: 'Door staff mobile QR code scanning, arrival attendance velocity, and instant sync.',
  },
  {
    id: 'mod_media_gallery',
    module_key: 'media_gallery',
    name: 'Event Photo Gallery',
    tagline: 'Crowdsourced event memories & media feed',
    category: 'event_tools',
    status: 'coming_soon',
    description: 'Curated participant photo uploads, live event slideshows, and moderated asset downloads.',
  },

  // Management
  {
    id: 'mod_analytics',
    module_key: 'analytics',
    name: 'Analytics & Reporting',
    tagline: 'Engagement metrics & download audits',
    category: 'management',
    status: 'active',
    description: 'Real-time download volumes, viral link reach, format preference distribution, and conversion rates.',
    route: '/dashboard/analytics',
  },
  {
    id: 'mod_team',
    module_key: 'team',
    name: 'Team & Organisation',
    tagline: 'Multi-member collaborative workspace',
    category: 'management',
    status: 'active',
    description: 'Manage organisation workspaces, invite event managers and team members with granular RBAC permissions.',
    route: '/dashboard/team',
  },
  {
    id: 'mod_integrations',
    module_key: 'integrations',
    name: 'Integrations',
    tagline: 'Webhooks, Zapier, & calendar APIs',
    category: 'management',
    status: 'coming_soon',
    description: 'Seamlessly stream participant generation webhooks to WhatsApp Business, CRMs, and Slack channels.',
  },

  // Account
  {
    id: 'mod_org_settings',
    module_key: 'org_settings',
    name: 'Organisation Settings',
    tagline: 'Branding, domains & defaults',
    category: 'account',
    status: 'active',
    description: 'Customize organisation identity, default event timezones, and enterprise branding.',
    route: '/dashboard/settings',
  },
];

export function getModulesByCategory(category: FeatureModule['category']): FeatureModule[] {
  return PLATFORM_MODULES.filter((m) => m.category === category);
}

export function getActiveModules(): FeatureModule[] {
  return PLATFORM_MODULES.filter((m) => m.status === 'active');
}
