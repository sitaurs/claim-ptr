jest.mock('fs-extra', () => ({
  readJsonSync: jest.fn(() => ({ whatsapp: { admin_numbers: ['6281',' 6282 '], group_id: '1203' }, bot_url: 'http://localhost:3001', server: { admin_session_secret: 'k' } }))
}));

const { formatWhatsAppNumber, formatGroupId, getAdminNumbers } = require('../services/whatsapp-service');

describe('whatsapp-service utils', () => {
  test('formatWhatsAppNumber normalizes correctly', () => {
    expect(formatWhatsAppNumber('08123')).toBe('628123@s.whatsapp.net');
    expect(formatWhatsAppNumber('+628123')).toBe('628123@s.whatsapp.net');
  });

  test('formatGroupId appends @g.us', () => {
    expect(formatGroupId('1203')).toBe('1203@g.us');
    expect(formatGroupId('1203@g.us')).toBe('1203@g.us');
  });

  test('getAdminNumbers returns unique formatted', () => {
    const list = getAdminNumbers();
    expect(list).toContain('6281@s.whatsapp.net');
    expect(list).toContain('6282@s.whatsapp.net');
  });
});
