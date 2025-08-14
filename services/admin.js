const fs = require('fs-extra');
const bcrypt = require('bcrypt');
const path = require('path');

const ADMIN_FILE_PATH = path.join(__dirname, '../data/admin.json');

// Fungsi untuk memverifikasi kredensial admin
async function verifyAdminCredentials(username, password) {
  try {
    // Memastikan file admin ada
    if (!fs.existsSync(ADMIN_FILE_PATH)) {
      console.error('File admin.json tidak ditemukan, membuat file default');
      await resetAdminPassword();
    }
    
    // Membaca data admin dari file
    const adminData = await fs.readJson(ADMIN_FILE_PATH);
    
    console.log(`Verifikasi admin: ${username}, data admin:`, JSON.stringify(adminData));
    
    // Mencari admin dengan username yang sesuai
    const admin = adminData.find(admin => admin.username === username);
    
    // Jika admin tidak ditemukan
    if (!admin) {
      console.log(`Admin dengan username ${username} tidak ditemukan`);
      return { valid: false, message: 'Username atau password salah' };
    }
    
    // Memverifikasi password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    console.log(`Hasil verifikasi password: ${passwordMatch}`);
    
    if (passwordMatch) {
      return { valid: true, admin: { id: admin.id, username: admin.username } };
    } else {
      return { valid: false, message: 'Username atau password salah' };
    }
  } catch (error) {
    console.error('Error verifikasi admin:', error);
    return { valid: false, message: 'Terjadi kesalahan saat verifikasi' };
  }
}

// Fungsi untuk mengubah password admin
async function changeAdminPassword(adminId, currentPassword, newPassword) {
  try {
    // Membaca data admin dari file
    const adminData = await fs.readJson(ADMIN_FILE_PATH);
    
    // Mencari admin dengan ID yang sesuai
    const adminIndex = adminData.findIndex(admin => admin.id === adminId);
    
    // Jika admin tidak ditemukan
    if (adminIndex === -1) {
      return { success: false, message: 'Admin tidak ditemukan' };
    }
    
    // Memverifikasi password saat ini
    const passwordMatch = await bcrypt.compare(currentPassword, adminData[adminIndex].password);
    
    if (!passwordMatch) {
      return { success: false, message: 'Password saat ini salah' };
    }
    
    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    adminData[adminIndex].password = hashedPassword;
    adminData[adminIndex].updatedAt = new Date().toISOString();
    
    // Menyimpan kembali ke file
    await fs.writeJson('./data/admin.json', adminData, { spaces: 2 });
    
    return { success: true, message: 'Password berhasil diubah' };
  } catch (error) {
    console.error('Error mengubah password admin:', error);
    return { success: false, message: 'Terjadi kesalahan saat mengubah password' };
  }
}

// Fungsi untuk mereset password admin ke default
async function resetAdminPassword() {
  try {
    // Hash password default (admin123)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Data admin default
    const defaultAdmin = [
      {
        id: 'admin-1',
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    // Menyimpan data admin default
    await fs.writeJson(ADMIN_FILE_PATH, defaultAdmin, { spaces: 2 });
    console.log('Password admin berhasil direset ke default (admin123)');
    
    return { success: true, message: 'Password admin berhasil direset' };
  } catch (error) {
    console.error('Error reset password admin:', error);
    return { success: false, message: 'Terjadi kesalahan saat reset password' };
  }
}

module.exports = {
  verifyAdminCredentials,
  changeAdminPassword,
  resetAdminPassword
};