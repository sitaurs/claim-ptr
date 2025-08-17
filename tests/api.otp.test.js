process.env.DUMMY_TEST_NUMBERS = '6280000000000';

const request = require('supertest');
const fs = require('fs-extra');

// Ensure env variables set before app import
const app = require('../index');

describe('OTP flow', () => {
  const phone = '6280000000000';

  afterAll(() => {
    // Clean OTP file
    if (fs.existsSync('./data/otps.json')) fs.writeJsonSync('./data/otps.json', []);
  });

  test('send OTP to dummy number returns success', async () => {
    const res = await request(app)
      .post('/api/send-otp')
      .send({ phoneNumber: phone });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('verify OTP with correct code succeeds', async () => {
    const res = await request(app)
      .post('/api/verify-otp')
      .send({ phoneNumber: phone, otp: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
