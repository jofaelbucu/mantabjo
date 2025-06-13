import { createClient } from '@supabase/supabase-js';

// 1. Ambil variabel environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Validasi penting untuk menghentikan aplikasi jika .env tidak ada atau salah.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("KONFIGURASI ERROR: Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur dengan benar di dalam file .env.local Anda.");
}

// 3. Inisialisasi dan ekspor Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- Tipe Data Aplikasi ---

// Tipe untuk sumber dana yang konsisten di seluruh aplikasi
type SumberDana = 'cash' | 'seabank' | 'gopay' | 'aplikasi_isipulsa';

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Modal = {
  id: string;
  jumlah: number;
  tanggal: string; // DISESUAIKAN: Nama kolom yang benar adalah 'tanggal'
  keterangan?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sumber_dana: SumberDana; // DITAMBAHKAN: Properti sumber_dana
};

export type Pengeluaran = {
  id: string;
  jumlah: number;
  harga_jual: number;
  keuntungan: number;
  keterangan: string;
  tanggal: string;
  kategori: 'usaha' | 'non_usaha';
  sumber_dana: SumberDana; // Sudah benar
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
  sumber_dana: SumberDana; // DITAMBAHKAN: Properti sumber_dana
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
  sumber_dana: SumberDana; // DITAMBAHKAN: Properti sumber_dana
  pelanggan?: Pelanggan;
};

// Tipe helper untuk query dengan join (sudah benar)
export type HutangWithPelanggan = Hutang & {
  pelanggan: Pelanggan | null;
};