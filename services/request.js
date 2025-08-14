const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sendJsonRequestNotification } = require('./whatsapp');

const REQUESTS_FILE_PATH = path.join(__dirname, '../data/requests.json');

// Memastikan file requests.json ada
if (!fs.existsSync(REQUESTS_FILE_PATH)) {
  fs.writeJsonSync(REQUESTS_FILE_PATH, [], { spaces: 2 });
}

/**
 * Mendapatkan semua request JSON
 */
async function getAllRequests() {
  try {
    const requests = await fs.readJson(REQUESTS_FILE_PATH);
    return requests;
  } catch (error) {
    console.error('Error membaca requests:', error);
    return [];
  }
}

/**
 * Mendapatkan request berdasarkan ID
 * @param {string} requestId - ID request
 */
async function getRequestById(requestId) {
  try {
    const requests = await getAllRequests();
    return requests.find(request => request.id === requestId);
  } catch (error) {
    console.error(`Error mendapatkan request dengan ID ${requestId}:`, error);
    return null;
  }
}

/**
 * Membuat request JSON baru
 * @param {object} requestData - Data request
 */
async function createRequest(requestData) {
  try {
    const requests = await getAllRequests();
    
    // Membuat request baru
    const newRequest = {
      id: uuidv4(),
      ...requestData,
      processed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Menambahkan request baru ke array
    requests.push(newRequest);
    
    // Menyimpan perubahan
    await fs.writeJson(REQUESTS_FILE_PATH, requests, { spaces: 2 });
    
    // Mengirim notifikasi WhatsApp
    try {
      await sendJsonRequestNotification(newRequest);
    } catch (notifyError) {
      console.error('Error mengirim notifikasi WhatsApp:', notifyError);
    }
    
    return newRequest;
  } catch (error) {
    console.error('Error membuat request:', error);
    throw error;
  }
}

/**
 * Memperbarui status request
 * @param {string} requestId - ID request
 * @param {boolean} processed - Status processed
 */
async function updateRequestStatus(requestId, processed) {
  try {
    const requests = await getAllRequests();
    const requestIndex = requests.findIndex(request => request.id === requestId);
    
    if (requestIndex === -1) {
      throw new Error(`Request dengan ID ${requestId} tidak ditemukan`);
    }
    
    // Memperbarui status request
    requests[requestIndex].processed = processed;
    requests[requestIndex].updatedAt = new Date().toISOString();
    
    // Menyimpan perubahan
    await fs.writeJson(REQUESTS_FILE_PATH, requests, { spaces: 2 });
    
    return requests[requestIndex];
  } catch (error) {
    console.error(`Error memperbarui status request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Menandai semua request sebagai diproses
 */
async function markAllRequestsAsProcessed() {
  try {
    const requests = await getAllRequests();
    
    // Memperbarui status semua request
    const updatedRequests = requests.map(request => ({
      ...request,
      processed: true,
      updatedAt: new Date().toISOString()
    }));
    
    // Menyimpan perubahan
    await fs.writeJson(REQUESTS_FILE_PATH, updatedRequests, { spaces: 2 });
    
    return updatedRequests;
  } catch (error) {
    console.error('Error menandai semua request sebagai diproses:', error);
    throw error;
  }
}

/**
 * Menghapus request berdasarkan ID
 * @param {string} requestId - ID request
 */
async function deleteRequest(requestId) {
  try {
    const requests = await getAllRequests();
    const filteredRequests = requests.filter(request => request.id !== requestId);
    
    // Menyimpan perubahan
    await fs.writeJson(REQUESTS_FILE_PATH, filteredRequests, { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error(`Error menghapus request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Menghapus semua request
 */
async function clearAllRequests() {
  try {
    // Menyimpan array kosong
    await fs.writeJson(REQUESTS_FILE_PATH, [], { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error('Error menghapus semua request:', error);
    throw error;
  }
}

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
  markAllRequestsAsProcessed,
  deleteRequest,
  clearAllRequests
};