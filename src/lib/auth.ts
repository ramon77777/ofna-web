import { LoginUser } from './types';

const ACCESS_TOKEN_KEY = 'ofna_access_token';
const CURRENT_USER_KEY = 'ofna_current_user';

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '').trim().toLowerCase();
}

function normalizeUser(user: LoginUser): LoginUser {
  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

export function setSession(accessToken: string, user: LoginUser) {
  if (typeof window === 'undefined') return;

  const normalizedUser = normalizeUser(user);

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  return token && token.trim().length > 0 ? token : null;
}

export function getCurrentUser(): LoginUser | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(CURRENT_USER_KEY);

  if (!raw) return null;

  try {
    const parsedUser = JSON.parse(raw) as LoginUser;

    return normalizeUser(parsedUser);
  } catch {
    clearSession();
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const user = getCurrentUser();

  return !!token && !!user;
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

  const updatedUser = normalizeUser({
    ...currentUser,
    ...partialUser,
  });

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
}