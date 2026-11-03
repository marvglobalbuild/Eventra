/**
 * Domain & Public URL configuration helper for Eventra
 * Handles resolving participant link URLs across local development, 
 * AI Studio Cloud Run preview environments, and production Vercel/custom domains.
 */

const STORAGE_KEY = 'eventra_public_domain_override';

export function getCustomPublicDomain(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomPublicDomain(url: string): void {
  try {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const withProto = cleaned.startsWith('http://') || cleaned.startsWith('https://') 
        ? cleaned 
        : `https://${cleaned}`;
      localStorage.setItem(STORAGE_KEY, withProto);
    }
  } catch (err) {
    console.error('Failed to save public domain preference', err);
  }
}

export function isCloudRunPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('run.app') || host.includes('aistudio') || host.includes('ais-dev') || host.includes('ais-pre');
}

export function getPublicAppBaseUrl(): string {
  // 1. User manual override (e.g. host entered their Vercel domain in settings/share modal)
  const custom = getCustomPublicDomain();
  if (custom) return custom;

  // 2. Vite environment variable (e.g. set in Vercel project environment settings)
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback to current browser origin or local Wi-Fi IP for phone testing
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const port = window.location.port ? `:${window.location.port}` : ':3000';
      return `http://192.168.1.135${port}`;
    }
    return window.location.origin;
  }

  return '';
}

export function getParticipantFlyerUrl(slug: string): string {
  const base = getPublicAppBaseUrl();
  return `${base}/e/${encodeURIComponent(slug)}`;
}
