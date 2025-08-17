const fs = require('fs-extra');
const { sendPromotion } = require('../whatsapp/bot');

// Fungsi untuk mendapatkan semua promosi
async function getAllPromotions() {
  try {
    return await fs.readJson('./data/promotions.json');
  } catch (error) {
    console.error('Error mendapatkan promosi:', error);
    return [];
  }
}

// Fungsi untuk menambahkan promosi baru
async function addPromotion(promotionData) {
  try {
    const promotions = await getAllPromotions();
    
    // Menambahkan ID dan tanggal pembuatan
    const newPromotion = {
      ...promotionData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      active: true
    };
    
    promotions.push(newPromotion);
    await fs.writeJson('./data/promotions.json', promotions, { spaces: 2 });
    
    // Memuat ulang jadwal promosi
    loadAndSchedulePromotions();
    
    return { success: true, promotion: newPromotion };
  } catch (error) {
    console.error('Error menambahkan promosi:', error);
    return { success: false, message: 'Gagal menambahkan promosi' };
  }
}

// Fungsi untuk mengupdate promosi
async function updatePromotion(id, promotionData) {
  try {
    const promotions = await getAllPromotions();
    const index = promotions.findIndex(promo => promo.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Promosi tidak ditemukan' };
    }
    
    // Update data promosi
    promotions[index] = {
      ...promotions[index],
      ...promotionData,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeJson('./data/promotions.json', promotions, { spaces: 2 });
    
    // Memuat ulang jadwal promosi
    loadAndSchedulePromotions();
    
    return { success: true, promotion: promotions[index] };
  } catch (error) {
    console.error('Error mengupdate promosi:', error);
    return { success: false, message: 'Gagal mengupdate promosi' };
  }
}

// Fungsi untuk menghapus promosi
async function deletePromotion(id) {
  try {
    const promotions = await getAllPromotions();
    const filteredPromotions = promotions.filter(promo => promo.id !== id);
    
    if (filteredPromotions.length === promotions.length) {
      return { success: false, message: 'Promosi tidak ditemukan' };
    }
    
    await fs.writeJson('./data/promotions.json', filteredPromotions, { spaces: 2 });
    
    // Memuat ulang jadwal promosi
    loadAndSchedulePromotions();
    
    return { success: true, message: 'Promosi berhasil dihapus' };
  } catch (error) {
    console.error('Error menghapus promosi:', error);
    return { success: false, message: 'Gagal menghapus promosi' };
  }
}

// Fungsi untuk mengaktifkan/menonaktifkan promosi
async function togglePromotion(id) {
  try {
    const promotions = await getAllPromotions();
    const index = promotions.findIndex(promo => promo.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Promosi tidak ditemukan' };
    }
    
    // Toggle status aktif
    promotions[index].active = !promotions[index].active;
    promotions[index].updatedAt = new Date().toISOString();
    
    await fs.writeJson('./data/promotions.json', promotions, { spaces: 2 });
    
    // Memuat ulang jadwal promosi
    loadAndSchedulePromotions();
    
    return { 
      success: true, 
      active: promotions[index].active,
      message: `Promosi berhasil ${promotions[index].active ? 'diaktifkan' : 'dinonaktifkan'}`
    };
  } catch (error) {
    console.error('Error toggle promosi:', error);
    return { success: false, message: 'Gagal mengubah status promosi' };
  }
}

// Fungsi untuk memuat ulang jadwal promosi pada service bot
async function loadAndSchedulePromotions() {
  try {
    const axios = require('axios');
    const botBase = (process.env.BOT_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
    await axios.post(`${botBase}/api/bot/reload-promotions`, {}, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Error menjadwalkan promosi:', error);
    return false;
  }
}

module.exports = {
  getAllPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotion
};