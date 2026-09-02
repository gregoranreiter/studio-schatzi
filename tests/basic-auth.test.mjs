import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessCookieName,
  createAccessToken,
  hasValidAccessCookie,
  hasValidBasicAuthorization,
  secretsMatch,
} from '../src/lib/basic-auth.ts';

const authorization = (username, password) => (
  `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
);

test('Basic Auth accepts only the configured credentials', () => {
  assert.equal(hasValidBasicAuthorization(authorization('studio', 'secret'), 'studio', 'secret'), true);
  assert.equal(hasValidBasicAuthorization(authorization('studio', 'wrong'), 'studio', 'secret'), false);
  assert.equal(hasValidBasicAuthorization(authorization('other', 'secret'), 'studio', 'secret'), false);
});

test('Basic Auth rejects missing and malformed headers', () => {
  assert.equal(hasValidBasicAuthorization(null, 'studio', 'secret'), false);
  assert.equal(hasValidBasicAuthorization('Bearer token', 'studio', 'secret'), false);
  assert.equal(hasValidBasicAuthorization('Basic token extra', 'studio', 'secret'), false);
});

test('Basic Auth encodes UTF-8 credentials consistently', () => {
  assert.equal(hasValidBasicAuthorization(authorization('studio', 'schätzi'), 'studio', 'schätzi'), true);
});

test('the fallback login cookie accepts only the current credential token', async () => {
  const token = await createAccessToken('studio', 'secret');
  const changedToken = await createAccessToken('studio', 'changed');

  assert.notEqual(token, changedToken);
  assert.equal(hasValidAccessCookie(`${accessCookieName}=${token}`, token), true);
  assert.equal(hasValidAccessCookie(`theme=yellow; ${accessCookieName}=${token}; other=value`, token), true);
  assert.equal(hasValidAccessCookie(`${accessCookieName}=${changedToken}`, token), false);
  assert.equal(hasValidAccessCookie(null, token), false);
});

test('fallback password comparison rejects different secrets', () => {
  assert.equal(secretsMatch('schatzibussi', 'schatzibussi'), true);
  assert.equal(secretsMatch('schatzibussi!', 'schatzibussi'), false);
});
