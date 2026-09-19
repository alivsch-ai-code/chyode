import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret';

import { hashPassword, passwordSchema, verifyPassword } from '../src/utils/password';
import { generateToken, hashString } from '../src/utils/tokens';
import { signSessionToken, verifySessionToken } from '../src/utils/jwt';
import { inviteEmail, passwordResetEmail, resultsReadyEmail, verifyEmailEmail } from '../src/services/emailTemplates';

test('Passwort-Regeln: mindestens 10 Zeichen, höchstens 72 Bytes', () => {
  assert.equal(passwordSchema.safeParse('kurz').success, false);
  assert.equal(passwordSchema.safeParse('genau-10-z').success, true);
  assert.equal(passwordSchema.safeParse('a'.repeat(72)).success, true);
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false);
  // Umlaute zählen als mehrere Bytes
  assert.equal(passwordSchema.safeParse('ä'.repeat(37)).success, false);
});

test('Passwort-Hash: korrekt, falsch, nie im Klartext', async () => {
  const hash = await hashPassword('Sicheres-Passwort-1');
  assert.notEqual(hash, 'Sicheres-Passwort-1');
  assert.equal(await verifyPassword('Sicheres-Passwort-1', hash), true);
  assert.equal(await verifyPassword('anderes-passwort', hash), false);
});

test('Tokens: zufällig, URL-sicher und Hash ist deterministisch', () => {
  const a = generateToken(32);
  const b = generateToken(32);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.equal(hashString(a), hashString(a));
  assert.notEqual(hashString(a), hashString(b));
  assert.equal(hashString(a).length, 64);
});

test('Sitzungs-Token: Roundtrip und Manipulation wird erkannt', () => {
  const token = signSessionToken({ sub: '11111111-1111-1111-1111-111111111111', tv: 3 });
  assert.deepEqual(verifySessionToken(token), { sub: '11111111-1111-1111-1111-111111111111', tv: 3 });
  assert.throws(() => verifySessionToken(token.slice(0, -2) + 'xx'));
  assert.throws(() => verifySessionToken('kein.jwt.token'));
});

test('E-Mail-Templates: Links enthalten, HTML-Eingaben werden maskiert', () => {
  const evil = '<script>alert(1)</script>';
  const invite = inviteEmail({ inviteeName: evil, inviterName: 'Anna', link: 'https://x.test/register/abc', expiresInDays: 7 });
  assert.ok(invite.html.includes('https://x.test/register/abc'));
  assert.ok(!invite.html.includes('<script>'));
  assert.ok(invite.text.includes('https://x.test/register/abc'));

  const reset = passwordResetEmail({ name: null, link: 'https://x.test/reset/1', expiresInMinutes: 60 });
  assert.ok(reset.text.includes('60 Minuten'));

  const verify = verifyEmailEmail({ name: 'Anna', link: 'https://x.test/verify-email/1', expiresInHours: 24 });
  assert.ok(verify.html.includes('E-Mail-Adresse bestätigen'));

  const results = resultsReadyEmail({
    name: 'Anna',
    tripTitle: '<b>Hütte</b>',
    link: 'https://x.test/trips/1?tab=results',
    favorite: '6.–8. Nov. 2026',
  });
  assert.ok(!results.html.includes('<b>Hütte</b>'));
  assert.ok(results.text.includes('Viel Spaß beim gemeinsamen Feiern und Treffen'));
  assert.ok(results.subject.includes('steht fest'));
});
