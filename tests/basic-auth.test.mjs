import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessCookieName,
  createAccessToken,
  hasValidAccessCookie,
  secretsMatch,
} from '../src/lib/basic-auth.ts';

test('the login cookie accepts only the current password token', async () => {
  const token = await createAccessToken('secret');
  const changedToken = await createAccessToken('changed');

  assert.notEqual(token, changedToken);
  assert.equal(hasValidAccessCookie(`${accessCookieName}=${token}`, token), true);
  assert.equal(hasValidAccessCookie(`theme=yellow; ${accessCookieName}=${token}; other=value`, token), true);
  assert.equal(hasValidAccessCookie(`${accessCookieName}=${changedToken}`, token), false);
  assert.equal(hasValidAccessCookie(null, token), false);
});

test('password comparison rejects different secrets', () => {
  assert.equal(secretsMatch('schatzibussi', 'schatzibussi'), true);
  assert.equal(secretsMatch('schatzibussi!', 'schatzibussi'), false);
});
