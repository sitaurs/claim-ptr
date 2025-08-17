jest.mock('../services/pterodactyl', () => ({
  createUser: jest.fn(async (email, username, first, last, pass) => ({ id: 101, uuid: 'uuid-user-101' })),
  createServer: jest.fn(async (userId, name, type, version) => ({ id: 202, identifier: 'srv202' })),
}));

jest.mock('../services/whatsapp', () => ({
  sendAccountDetails: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/whatsapp-service', () => ({
  sendToAdmins: jest.fn(() => Promise.resolve()),
}));

const request = require('supertest');
const fs = require('fs-extra');
const app = require('../index');

describe('Create account & server', () => {
  beforeEach(() => {
    fs.outputJsonSync('./data/users.json', []);
    fs.outputJsonSync('./data/servers.json', []);
  });

  test('creates user and server with version', async () => {
    const payload = {
      phoneNumber: '6280000000002',
      email: 'acc@test.local',
      password: 'pass123',
      firstName: 'Acc',
      lastName: 'Test',
      serverName: 'my-node-server',
      serverType: 'nodejs',
      serverVersion: '18'
    };

    const res = await request(app)
      .post('/api/create-account')
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const users = await fs.readJson('./data/users.json');
    const servers = await fs.readJson('./data/servers.json');

    expect(users.length).toBe(1);
    expect(servers.length).toBe(1);
    expect(servers[0].type).toBe('nodejs');
  });
});
