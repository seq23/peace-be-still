import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueInstallToken, verifyInstallToken } from '../src/token.mjs';

const secret = 'a secure test secret with at least 32 bytes';
const install = '12345678-1234-4234-8234-123456789abc';
test('install tokens authenticate their device and expire', async () => {
  const token = await issueInstallToken(install, secret, 0);
  assert.equal(await verifyInstallToken(token, secret, 1000), install);
  assert.equal(await verifyInstallToken(token, secret, 30 * 86400 * 1000), null);
  assert.equal(await verifyInstallToken(`${token}x`, secret, 1000), null);
  assert.equal(await verifyInstallToken(token, 'another secure secret with 32 bytes', 1000), null);
});
test('token issuance fails closed on invalid configuration', async () => {
  await assert.rejects(issueInstallToken(install, 'short'), /CHAT_TOKEN_SECRET_MISSING/);
  await assert.rejects(issueInstallToken('not an install id', secret), /INVALID_INSTALL_ID/);
});
