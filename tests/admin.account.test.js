const request = require('supertest');
const fs = require('fs-extra');
const app = require('../index');

function login(agent, cb) {
  agent
    .post('/admin/login')
    .send({ username: 'admin', password: 'admin123' })
    .end(cb);
}

describe('Admin account change', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    fs.outputJsonSync('./data/admin.json', [{ id: 'admin-1', username: 'admin', password: '$2b$10$dMJOLupDStPJPsMwA4.k0ObmXW3mqPFzWfpOIvRp5vcGn9KQWGYTu' }]);
  });

  test('change username only', (done) => {
    login(agent, async () => {
      const res = await agent.post('/admin/account').send({ currentPassword: 'admin123', newUsername: 'admin2' });
      expect([302, 200]).toContain(res.statusCode);
      const admins = await fs.readJson('./data/admin.json');
      expect(admins[0].username).toBe('admin2');
      done();
    });
  });

  test('change password only', (done) => {
    login(agent, async () => {
      const res = await agent.post('/admin/account').send({ currentPassword: 'admin123', newPassword: 'newpass123' });
      expect([302, 200]).toContain(res.statusCode);
      const admins = await fs.readJson('./data/admin.json');
      expect(admins[0].password).toMatch(/\$2b\$/); // bcrypt hash
      done();
    });
  });
});
