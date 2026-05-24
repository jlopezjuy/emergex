import { JWT_STORAGE_KEY } from './auth.constants';

// Ofuscación simétrica XOR + Base64 para prevenir que scripts de ataques XSS automatizados
// lean el JWT plano directamente desde el localStorage.
const STORAGE_SALT = 'EMERGEX_CLIENT_SECURE_SALT_2026';

function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export function saveSecureToken(token: string): void {
  if (!token) return;
  try {
    const obscured = btoa(xorCipher(token, STORAGE_SALT));
    localStorage.setItem(JWT_STORAGE_KEY, obscured);
  } catch (e) {
    // Fallback seguro en caso de error
    localStorage.setItem(JWT_STORAGE_KEY, token);
  }
}

export function getSecureToken(): string | null {
  const stored = localStorage.getItem(JWT_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const decrypted = xorCipher(atob(stored), STORAGE_SALT);
    // Un JWT siempre tiene una estructura de tres partes separadas por puntos (header.payload.signature)
    if (decrypted && decrypted.includes('.') && decrypted.split('.').length === 3) {
      return decrypted;
    }
  } catch (e) {
    // Si falla la decodificación pero el valor crudo parece un JWT plano, lo retornamos como fallback
    if (stored.includes('.') && stored.split('.').length === 3) {
      return stored;
    }
  }
  return null;
}

export function removeSecureToken(): void {
  localStorage.removeItem(JWT_STORAGE_KEY);
}
