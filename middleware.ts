import { next } from '@vercel/functions';
import {
  accessCookieName,
  createAccessToken,
  hasValidAccessCookie,
  hasValidBasicAuthorization,
  secretsMatch,
} from './src/lib/basic-auth.js';

declare const process: { env: Record<string, string | undefined> };

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'text/plain; charset=utf-8',
};

const loginHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
};

const safeDestination = (value: FormDataEntryValue | string | null) => (
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
);

const escapeAttribute = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const loginPage = (destination: string, invalid = false) => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Zugang — Studio Schatzi</title>
    <style>
      * { box-sizing: border-box; }
      html { background: #fffa91; color: #090909; font-family: Helvetica Neue, Helvetica, Arial, sans-serif; }
      body { min-height: 100svh; margin: 0; padding: clamp(12px, 2vw, 24px); display: grid; grid-template-rows: auto 1fr; }
      header { font-size: clamp(28px, 5vw, 64px); line-height: .9; }
      form { width: min(100%, 560px); align-self: center; justify-self: center; display: grid; gap: 12px; }
      label, input, button, p { font-family: inherit; font-size: clamp(18px, 2vw, 28px); font-weight: 500; line-height: 1.2; }
      input, button { min-height: 64px; border: 0; border-radius: 999px; padding: 12px 24px; }
      input { background: #faf9f6; color: #090909; outline: 0; }
      input:focus { box-shadow: inset 0 0 0 3px #090909; }
      button { background: #090909; color: #faf9f6; cursor: pointer; }
      p { margin: 0; }
    </style>
  </head>
  <body>
    <header>Studio<br>Schatzi</header>
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeAttribute(destination)}">
      <label for="password">Passwort</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Öffnen</button>
      ${invalid ? '<p role="alert">Das Passwort stimmt nicht.</p>' : ''}
    </form>
  </body>
</html>`;

export default async function middleware(request: Request) {
  const username = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return new Response('Site access is not configured.', {
      status: 503,
      headers: noStoreHeaders,
    });
  }

  const url = new URL(request.url);
  const accessToken = await createAccessToken(username, password);

  if (url.pathname === '/login') {
    if (request.method === 'POST') {
      const form = await request.formData();
      const destination = safeDestination(form.get('next'));
      const submittedPassword = form.get('password');
      if (typeof submittedPassword !== 'string' || !secretsMatch(submittedPassword, password)) {
        return new Response(loginPage(destination, true), { status: 200, headers: loginHeaders });
      }

      return new Response(null, {
        status: 303,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Location: destination,
          'Set-Cookie': `${accessCookieName}=${accessToken}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    const destination = safeDestination(url.searchParams.get('next'));
    return new Response(loginPage(destination), { status: 200, headers: loginHeaders });
  }

  const authorized = hasValidBasicAuthorization(
    request.headers.get('authorization'), username, password,
  ) || hasValidAccessCookie(request.headers.get('cookie'), accessToken);

  if (!authorized) {
    return new Response('Authentication required.', {
      status: 401,
      headers: {
        ...noStoreHeaders,
        'WWW-Authenticate': 'Basic realm="Studio Schatzi", charset="UTF-8"',
      },
    });
  }

  return next();
}

export const config = {
  matcher: '/(.*)',
  runtime: 'nodejs',
};
