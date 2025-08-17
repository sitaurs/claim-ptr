module.exports = {
  sendToAdmins: jest.fn(() => Promise.resolve()),
  sendMessage: jest.fn(() => Promise.resolve()),
  sendJsonRequestNotification: jest.fn(() => Promise.resolve()),
  checkBotStatus: jest.fn(() => ({ connected: true })),
};
