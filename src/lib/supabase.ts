import { createClient } from '@supabase/supabase-js';

// 1. Ambil variabel environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Validasi penting untuk menghentikan aplikasi jika .env tidak ada atau salah.
//    Ini mencegah error CORS yang membingungkan.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("KONFIGURASI ERROR: Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur dengan benar di dalam file .env.local Anda.");
}

// 3. Inisialisasi dan ekspor Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- Tipe data Anda (TIDAK ADA PERUBAHAN, sudah benar) ---
// Bagian ini dipertahankan karena sudah benar dan digunakan di seluruh aplikasi Anda.

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Modal = {
  id: string;
  jumlah: number;
  tanggal_hutang: string;
  keterangan?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  minggu?: number;
  bulan?: number;
  tahun?: number;
};

export type Pengeluaran = {
  id: string;
  jumlah: number;
  harga_jual: number;
  keuntungan: number;
  keterangan: string;
  tanggal: string;
  kategori: 'usaha' | 'non_usaha';
  user_id: string;
  created_at: string;
};

export type Hutang = {
  id: string;
  jumlah: number;
  tanggal_hutang: string;
  status: 'lunas' | 'belum_lunas';
  jenis: 'usaha' | 'non_usaha';
  pelanggan_id: string;
  keterangan: string;
  user_id: string;
  created_at: string;
  tanggal_jatuh_tempo?: string | null;
  tanggal_lunas?: string | null;
};

export type Pelanggan = {
  id: string;
  nama: string;
  nomor_hp: string;
  alamat?: string;
  user_id: string;
  created_at: string;
  email?: string;
  status: 'aktif' | 'non_aktif';
};

export type Transaksi = {
  id: string;
  jenis_transaksi: string;
  nominal: number;
  harga_beli: number;
  harga_jual: number;
  keuntungan: number;
  tanggal_transaksi: string;
  keterangan?: string;
  nomor_tujuan?: string;
  pelanggan_id?: string;
  user_id: string;
  created_at: string;
  status: 'sukses' | 'pending' | 'gagal';
  pelanggan?: Pelanggan; // Assuming this is for joined data
};

// Tipe ini mungkin diperlukan untuk query dengan join
export type HutangWithPelanggan = Hutang & {
  pelanggan: Pelanggan | null;
};