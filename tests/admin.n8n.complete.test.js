jest.mock('../services/whatsapp', () => ({ sendMessage: jest.fn(() => Promise.resolve(true)) }));

const request = require('supertest');
const fs = require('fs-extra');
const app = require('../index');

function login(agent, cb) {
  agent
    .post('/admin/login')
    .send({ username: 'admin', password: 'admin123' })
    .end(cb);
}

describe('Admin N8n complete', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    fs.outputJsonSync('./data/admin.json', [{ id: 'admin-1', username: 'admin', password: '$2b$10$dMJOLupDStPJPsMwA4.k0ObmXW3mqPFzWfpOIvRp5vcGn9KQWGYTu' }]);
    fs.outputJsonSync('./data/n8n_requests.json', [{ id: 'req1', phoneNumber: '628111', email: 'x@y.z', name: 'X', status: 'pending' }]);
  });

  test('complete request and send WA', (done) => {
    login(agent, async () => {
      const res = await agent.post('/admin/n8n/req1/complete').send({ n8nUrl: 'http://n8n', username: 'u', password: 'p', note: 'done' });
      expect([200, 302]).toContain(res.statusCode);

      const arr = await fs.readJson('./data/n8n_requests.json');
      const r = arr.find(x => x.id === 'req1');
      expect(r.status).toBe('completed');
      expect(r.credentials.n8nUrl).toBe('http://n8n');
      done();
    });
  }, 15000);
});
