const safeEqual = (actual: string, expected: string) => {
  const length = Math.max(actual.length, expected.length);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
};

export const accessCookieName = '__Host-studio_schatzi_access';

export function secretsMatch(actual: string, expected: string) {
  return safeEqual(actual, expected);
}

export async function createAccessToken(password: string) {
  const source = new TextEncoder().encode(`studio-schatzi-access\0${password}`);
  const digest = await crypto.subtle.digest('SHA-256', source);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hasValidAccessCookie(cookieHeader: string | null, expectedToken: string) {
  if (!cookieHeader) return false;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => (
    part.startsWith(`${accessCookieName}=`)
  ));
  if (!cookie) return false;
  return safeEqual(cookie.slice(accessCookieName.length + 1), expectedToken);
}
