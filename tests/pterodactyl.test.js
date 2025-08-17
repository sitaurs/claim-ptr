const { resolveDockerImage } = require('../services/pterodactyl');

describe('resolveDockerImage', () => {
  test('returns fallback when version empty', () => {
    const fallback = 'ghcr.io/parkervcp/yolks:nodejs_18';
    expect(resolveDockerImage('nodejs', '', fallback)).toBe(fallback);
  });

  test('maps nodejs version correctly', () => {
    expect(resolveDockerImage('nodejs', '16', 'fallback')).toBe('ghcr.io/parkervcp/yolks:nodejs_16');
  });

  test('maps python version correctly', () => {
    expect(resolveDockerImage('python', '3.10', 'fallback')).toBe('ghcr.io/parkervcp/yolks:python_3.10');
  });

  test('invalid python version returns fallback', () => {
    expect(resolveDockerImage('python', 'abc', 'fallback')).toBe('fallback');
  });
});
