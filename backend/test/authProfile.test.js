const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const requireAuth = require('../src/middleware/auth');
const { updateMe } = require('../src/controllers/authController');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("profile updates reject attempts to change a user's role", async () => {
  const response = createResponse();

  await updateMe({ body: { role: 'owner' }, user: { id: 'user-id' } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /only profile details/i);
});

test("cookie-based JWT authentication populates the user context", () => {
  const payload = { id: 'user-id', email: 'user@example.com', phone: '+923001234567' };
  const token = jwt.sign(payload, 'test-secret');
  const req = { cookies: { jwt: token }, headers: {} };
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, payload);
  assert.equal(res.statusCode, 200);
});
