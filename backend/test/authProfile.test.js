const test = require('node:test');
const assert = require('node:assert/strict');
const { updateMe } = require('../src/controllers/authController');

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
