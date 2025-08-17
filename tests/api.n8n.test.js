const request = require('supertest');
const fs = require('fs-extra');

jest.mock('../services/whatsapp-admin');
jest.mock('../services/whatsapp', () => ({ sendMessage: jest.fn(() => Promise.resolve()) }));

const app = require('../index');

describe('N8n request endpoint', () => {
  beforeEach(() => {
    // reset file sebelum tiap test
    fs.outputJsonSync('./data/n8n_requests.json', []);
  });

  test('creates new n8n request', async () => {
    const payload = {
      phoneNumber: '6280000000001',
      email: 'user@test.local',
      name: 'Test User',
      reason: 'testing api'
    };
    const res = await request(app)
      .post('/api/request-n8n')
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // data file updated dan berisi payload
    const arr = await fs.readJson('./data/n8n_requests.json');
    expect(arr.length).toBeGreaterThan(0);
    expect(arr.some(r => r.phoneNumber === payload.phoneNumber && r.email === payload.email)).toBe(true);
  });
});
