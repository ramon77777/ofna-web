import { LoginUser } from './types';

const ACCESS_TOKEN_KEY = 'ofna_access_token';
const CURRENT_USER_KEY = 'ofna_current_user';

export function setSession(accessToken: string, user: LoginUser) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getCurrentUser(): LoginUser | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function isPartnerAuthenticated(): boolean {
  const token = getAccessToken();
  const user = getCurrentUser();

  return !!token && user?.role === 'partner';
}

export function isAdminAuthenticated(): boolean {
  const token = getAccessToken();
  const user = getCurrentUser();

  return !!token && user?.role === 'admin';
}

/**
 * Compatibilité avec l’existant partner
 */
export function setPartnerToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getPartnerToken(): string | null {
  return getAccessToken();
}

export function removePartnerToken() {
  clearSession();
}


export function updateCurrentUser(partialUser: Partial<LoginUser>) {
  if (typeof window === 'undefined') return;

  const currentUser = getCurrentUser();

  if (!currentUser) return;

  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({
      ...currentUser,
      ...partialUser,
    }),
  );
}