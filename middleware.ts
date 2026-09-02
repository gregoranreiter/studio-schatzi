import { next } from '@vercel/functions';
import { hasValidBasicAuthorization } from './src/lib/basic-auth.js';

declare const process: { env: Record<string, string | undefined> };

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'text/plain; charset=utf-8',
};

export default function middleware(request: Request) {
  const username = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return new Response('Site access is not configured.', {
      status: 503,
      headers: noStoreHeaders,
    });
  }

  if (!hasValidBasicAuthorization(request.headers.get('authorization'), username, password)) {
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
