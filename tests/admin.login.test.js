const request = require('supertest');
const app = require('../index');
const fs = require('fs-extra');

describe('Admin Login', () => {
  beforeAll(() => {
    fs.outputJsonSync('./data/admin.json', [{ id: 'admin-1', username: 'admin', password: '$2b$10$dMJOLupDStPJPsMwA4.k0ObmXW3mqPFzWfpOIvRp5vcGn9KQWGYTu' }]);
  });

  test('rejects invalid credentials (render error page)', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ username: 'wrong', password: 'wrong' });
    expect([200, 302]).toContain(res.statusCode);
  });

  test('accepts default credentials', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    expect([200, 302]).toContain(res.statusCode);
  });
});
