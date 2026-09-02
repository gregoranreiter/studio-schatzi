const encodeUtf8Base64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const safeEqual = (actual: string, expected: string) => {
  const length = Math.max(actual.length, expected.length);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
};

export function hasValidBasicAuthorization(
  authorization: string | null,
  username: string,
  password: string,
) {
  if (!authorization) return false;
  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'basic' || !token || extra) return false;
  return safeEqual(token, encodeUtf8Base64(`${username}:${password}`));
}
