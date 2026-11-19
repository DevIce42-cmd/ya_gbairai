const test = require('node:test');
const assert = require('node:assert/strict');
require('../server/config/env');
const { createApp } = require('../server/app');
const { prisma } = require('../server/db/prisma');
const { ADMIN_KEY } = require('../server/config/env');

let server;
let baseUrl;
const createdPostIds = [];

test.before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });
});

test.after(async () => {
  for (const id of createdPostIds) {
    await prisma.post.deleteMany({ where: { id } });
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

test('GET /health & GET /meta work with seeded data', async () => {
  const h = await fetch(`${baseUrl}/health`).then((r) => r.json());
  assert.equal(h.ok, true);
  assert.equal(h.service, "Y'A GBAIRAI !");

  const m = await fetch(`${baseUrl}/meta`).then((r) => r.json());
  assert.equal(m.ok, true);
  assert.ok(m.data.stats.confessions >= 5);
  assert.ok(m.data.stats.stories >= 3);
});

test('Storytime creation + Partie 2 sequel + reactions + comments', async () => {
  const guestHeaders = { 'Content-Type': 'application/json', 'X-Guest-Id': 'gb_test_author_123' };

  const p1Res = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify({
      type: 'STORYTIME',
      title: 'Test Série — Le bus de minuit',
      content:
        'Il était minuit passé quand je suis monté dans le mauvais bus en rentrant de soirée. Au lieu de me ramener chez moi, il roulait vers une destination complètement inattendue…',
      tags: ['#PlotTwist', '#Voyage'],
    }),
  });
  const p1 = await p1Res.json();
  assert.equal(p1Res.status, 201);
  assert.equal(p1.data.partNumber, 1);
  assert.ok(p1.data.seriesId);
  createdPostIds.push(p1.data.id);

  // Add Partie 2
  const p2Res = await fetch(`${baseUrl}/series/${p1.data.seriesId}/parts`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify({
      title: 'Le bus de minuit — Partie 2',
      content:
        'Finalement le chauffeur a été adorable et m’a ramené directement au terminus où un ami m’attendait avec des croissants chauds.',
    }),
  });
  const p2 = await p2Res.json();
  assert.equal(p2Res.status, 201);
  assert.equal(p2.data.partNumber, 2);
  createdPostIds.push(p2.data.id);

  // Toggle FIRE reaction
  const rRes = await fetch(`${baseUrl}/posts/${p1.data.id}/reactions`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify({ type: 'FIRE' }),
  });
  const rBody = await rRes.json();
  assert.equal(rRes.status, 200);
  assert.equal(rBody.data.active, true);
  assert.equal(rBody.data.reactions.FIRE, 1);

  // Add comment
  const cRes = await fetch(`${baseUrl}/posts/${p1.data.id}/comments`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify({ content: 'Incroyable histoire !' }),
  });
  assert.equal(cRes.status, 201);
});

test('Anti-XSS sanitization & anti-doxxing PII block', async () => {
  const piiRes = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'CONFESSION',
      content: 'Écrivez à mon boss sur boss@exemple.fr pour rigoler.',
    }),
  });
  const piiBody = await piiRes.json();
  assert.equal(piiRes.status, 400);
  assert.equal(piiBody.error.code, 'PII_BLOCKED');

  const xssRes = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Guest-Id': 'gb_test_xss_123' },
    body: JSON.stringify({
      type: 'CONFESSION',
      content: '<script>alert(1)</script>J’ai glissé sur une peau de banane devant toute la classe.',
      tags: ['#Gênant'],
    }),
  });
  const xssBody = await xssRes.json();
  assert.equal(xssRes.status, 201);
  assert.ok(!xssBody.data.content.includes('<script>'));
  createdPostIds.push(xssBody.data.id);
});

test('Report & Admin Moderation Dashboard', async () => {
  const targetId = createdPostIds[createdPostIds.length - 1];
  const repRes = await fetch(`${baseUrl}/posts/${targetId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Spam ou publicité', details: 'Test modération' }),
  });
  const repBody = await repRes.json();
  assert.equal(repRes.status, 201);

  // Unauthorized without admin key
  const unauth = await fetch(`${baseUrl}/admin/dashboard`);
  assert.equal(unauth.status, 403);

  // Authorized with admin key
  const dashRes = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { 'X-Admin-Key': ADMIN_KEY },
  });
  const dash = await dashRes.json();
  assert.equal(dashRes.status, 200);
  assert.ok(dash.data.openReports.some((r) => r.id === repBody.data.id));

  // Dismiss report
  const resolveRes = await fetch(`${baseUrl}/admin/reports/${repBody.data.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ action: 'dismiss' }),
  });
  assert.equal(resolveRes.status, 200);
});
