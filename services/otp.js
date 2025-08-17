const fs = require('fs-extra');
const { sendOTP } = require('./whatsapp');
require('dotenv').config();
const path = require('path');

function normalizePhone(num) {
  if (!num) return '';
  let n = String(num).replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (!n.startsWith('62')) n = '62' + n;
  return n;
}

function getDummyNumbers() {
  // Read from ENV
  const rawEnv = process.env.DUMMY_TEST_NUMBERS || '';
  // Try also from config.json (whatsapp.dummy_numbers)
  let configNumbers = [];
  try {
    const CONFIG_FILE_PATH = path.join(__dirname, '../data/config.json');
    const cfg = fs.readJsonSync(CONFIG_FILE_PATH);
    const arr = cfg?.whatsapp?.dummy_numbers;
    if (Array.isArray(arr)) configNumbers = arr.map(s => String(s));
  } catch (e) {}

  const merged = [];
  if (rawEnv.trim()) merged.push(...rawEnv.split(',').map(s => s.trim()));
  if (configNumbers.length) merged.push(...configNumbers);

  const dummyNumbers = merged
    .map(s => normalizePhone(s))
    .filter(Boolean);

  // Diagnostics
  try {
    console.log('ℹ️ ENV.DUMMY_TEST_NUMBERS =', JSON.stringify(rawEnv));
  } catch {}
  if (dummyNumbers.length) {
    console.log('🐛 [OTP] DUMMY NUMBERS LOADED:', dummyNumbers);
  } else {
    console.log('ℹ️ [OTP] No dummy numbers configured');
  }
  return new Set(dummyNumbers);
}

function isDummyNumber(phoneNumber) {
  return getDummyNumbers().has(normalizePhone(phoneNumber));
}

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
    const normalized = normalizePhone(phoneNumber);
    const isDummy = isDummyNumber(normalized);
    const otp = isDummy ? '123456' : generateOTP();

    console.log('ℹ️ [OTP] sendOTPToPhone', { phoneNumber, normalized, isDummy, otpLen: otp.length });
    
    // Kirim OTP via WhatsApp / DM admin
    if (isDummy) {
      const { sendToAdmins } = require('./whatsapp-service');
      await sendToAdmins(`(DUMMY) OTP ${otp} untuk nomor ${normalized}`);
    } else {
      await sendOTP(normalized, otp);
    }
    
    // Simpan OTP untuk verifikasi berikutnya
    await saveOTP(normalized, otp);
    return { success: true, message: 'OTP berhasil dikirim' };
  } catch (error) {
    console.error('Error mengirim OTP:', error);
    return { success: false, message: 'Terjadi kesalahan saat mengirim OTP' };
  }
}

// Fungsi untuk memeriksa apakah nomor telepon sudah terdaftar
async function isPhoneRegistered(phoneNumber) {
  try {
    // Dummy number selalu dianggap belum terdaftar agar bisa klaim berulang
    if (isDummyNumber(phoneNumber)) return false;
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