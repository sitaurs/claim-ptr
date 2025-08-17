jest.mock('axios', () => ({ post: jest.fn(() => Promise.resolve({ data: { success: true } })) }));

const request = require('supertest');
const fs = require('fs-extra');
const app = require('../index');

function login(agent, cb) {
  agent
    .post('/admin/login')
    .send({ username: 'admin', password: 'admin123' })
    .end(cb);
}

describe('Admin promotions', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    fs.outputJsonSync('./data/admin.json', { id: 'admin-1', username: 'admin', password: '$2b$10$dMJOLupDStPJPsMwA4.k0ObmXW3mqPFzWfpOIvRp5vcGn9KQWGYTu' });
    fs.outputJsonSync('./data/promotions.json', []);
  });

  test('add and toggle promotion', (done) => {
    login(agent, async () => {
      // add
      let res = await agent.post('/api/promotions').send({ groupId: '1203', message: 'Hello', intervalMinutes: 5 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const promos = await fs.readJson('./data/promotions.json');
      expect(promos.length).toBe(1);

      // toggle
      const id = promos[0].id;
      res = await agent.post(`/api/promotions/${id}/toggle`).send();
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      done();
    });
  });
});
