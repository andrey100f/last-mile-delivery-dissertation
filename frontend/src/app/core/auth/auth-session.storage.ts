/** Shared session keys — used by `AuthService` and `UserService` without circular DI. */
export const ACCESS_TOKEN_STORAGE_KEY = 'deliveryhub.accessToken';
export const USER_ROLE_STORAGE_KEY = 'deliveryhub.userRole';

export function readStoredAccessToken(): string | null {
  const value = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return value !== null && value.length > 0 ? value : null;
}

export function clearStoredAuthSession(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_ROLE_STORAGE_KEY);
}
