const fs = require('fs-extra');
const { sendOTP } = require('./whatsapp');

// Fungsi untuk menghasilkan OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fungsi untuk menyimpan OTP
async function saveOTP(phoneNumber, otp) {
  try {
    // Membaca data OTP yang ada
    const otps = await fs.readJson('./data/otps.json');
    
    // Menghapus OTP lama untuk nomor yang sama jika ada
    const filteredOTPs = otps.filter(item => item.phoneNumber !== phoneNumber);
    
    // Menambahkan OTP baru
    filteredOTPs.push({
      phoneNumber,
      otp,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Berlaku 5 menit
    });
    
    // Menyimpan kembali ke file
    await fs.writeJson('./data/otps.json', filteredOTPs, { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error('Error menyimpan OTP:', error);
    return false;
  }
}

// Fungsi untuk memverifikasi OTP
async function verifyOTP(phoneNumber, otp) {
  try {
    // Membaca data OTP
    const otps = await fs.readJson('./data/otps.json');
    
    // Mencari OTP untuk nomor telepon yang diberikan
    const otpData = otps.find(item => item.phoneNumber === phoneNumber);
    
    // Jika tidak ada OTP untuk nomor tersebut
    if (!otpData) {
      return { valid: false, message: 'OTP tidak ditemukan' };
    }
    
    // Jika OTP sudah kedaluwarsa
    if (new Date() > new Date(otpData.expiresAt)) {
      return { valid: false, message: 'OTP sudah kedaluwarsa' };
    }
    
    // Jika OTP tidak cocok
    if (otpData.otp !== otp) {
      return { valid: false, message: 'OTP tidak valid' };
    }
    
    // Jika OTP valid, hapus dari daftar
    const updatedOTPs = otps.filter(item => item.phoneNumber !== phoneNumber);
    await fs.writeJson('./data/otps.json', updatedOTPs, { spaces: 2 });
    
    return { valid: true, message: 'OTP terverifikasi' };
  } catch (error) {
    console.error('Error verifikasi OTP:', error);
    return { valid: false, message: 'Terjadi kesalahan saat verifikasi OTP' };
  }
}

// Fungsi untuk mengirim OTP ke nomor telepon
async function sendOTPToPhone(phoneNumber) {
  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Kirim OTP via WhatsApp
    const sent = await sendOTP(phoneNumber, otp);
    
    if (sent) {
      // Simpan OTP
      await saveOTP(phoneNumber, otp);
      return { success: true, message: 'OTP berhasil dikirim' };
    } else {
      return { success: false, message: 'Gagal mengirim OTP' };
    }
  } catch (error) {
    console.error('Error mengirim OTP:', error);
    return { success: false, message: 'Terjadi kesalahan saat mengirim OTP' };
  }
}

// Fungsi untuk memeriksa apakah nomor telepon sudah terdaftar
async function isPhoneRegistered(phoneNumber) {
  try {
    const users = await fs.readJson('./data/users.json');
    return users.some(user => user.phoneNumber === phoneNumber);
  } catch (error) {
    console.error('Error memeriksa nomor telepon:', error);
    return false;
  }
}

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTPToPhone,
  isPhoneRegistered
};