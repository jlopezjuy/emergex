import { JWT_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from './auth.constants';

/**
 * Web auth hardening:
 *
 * Access/refresh tokens are no longer persisted in browser storage.
 * The web client now relies on:
 * - HttpOnly refresh cookie emitted by backend
 * - in-memory access token for Authorization / STOMP headers
 *
 * This helper remains only to clean legacy tokens left by older builds.
 */
export function clearLegacyStoredTokens(): void {
  localStorage.removeItem(JWT_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}
