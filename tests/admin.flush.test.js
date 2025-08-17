const request = require('supertest');
const fs = require('fs-extra');
const app = require('../index');

function login(agent, cb) {
  agent
    .post('/admin/login')
    .send({ username: 'admin', password: 'admin123' })
    .end(cb);
}

describe('Admin flush', () => {
  const agent = request.agent(app);

  beforeAll(() => {
    fs.outputJsonSync('./data/admin.json', [{ id: 'admin-1', username: 'admin', password: '$2b$10$dMJOLupDStPJPsMwA4.k0ObmXW3mqPFzWfpOIvRp5vcGn9KQWGYTu' }]);
    fs.outputJsonSync('./data/users.json', [{ a: 1 }]);
    fs.outputJsonSync('./data/servers.json', [{ a: 1 }]);
    fs.outputJsonSync('./data/requests.json', [{ a: 1 }]);
    fs.outputJsonSync('./data/n8n_requests.json', [{ a: 1 }]);
    fs.outputJsonSync('./data/promotions.json', [{ a: 1 }]);
  });

  test('flush all data files', (done) => {
    login(agent, async () => {
      const res = await agent.post('/admin/flush');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const files = ['users','servers','requests','n8n_requests','promotions'];
      for (const f of files) {
        const arr = await fs.readJson(`./data/${f}.json`);
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBe(0);
      }
      done();
    });
  }, 15000);
});
