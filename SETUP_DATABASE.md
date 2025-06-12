# Setup Database MantabJo

Panduan lengkap untuk mengatur database Supabase untuk aplikasi MantabJo.

## Langkah 1: Setup Supabase Project

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Login atau buat akun baru
3. Klik "New Project"
4. Isi detail project:
   - Name: MantabJo
   - Database Password: (buat password yang kuat)
   - Region: pilih yang terdekat dengan lokasi Anda
5. Klik "Create new project"

## Langkah 2: Dapatkan Credentials

1. Setelah project dibuat, buka tab "Settings" > "API"
2. Copy nilai berikut:
   - Project URL (sudah ada di `.env.local`)
   - anon public key (sudah ada di `.env.local`)

## Langkah 3: Setup Database Schema

1. Buka tab "SQL Editor" di Supabase Dashboard
2. Klik "New Query"
3. Copy seluruh isi file `database_setup.sql` ke editor
4. Klik "Run" untuk menjalankan script

## Langkah 4: Verifikasi Setup

1. Buka tab "Table Editor"
2. Pastikan tabel-tabel berikut sudah dibuat:
   - `modals`
   - `pengeluaran`
   - `hutang`
   - `pelanggan`
   - `transaksi`

## Langkah 5: Setup Authentication

1. Buka tab "Authentication" > "Settings"
2. Pastikan "Enable email confirmations" dinonaktifkan untuk development
3. Di bagian "Site URL", tambahkan: `http://localhost:5173`
4. Di bagian "Redirect URLs", tambahkan: `http://localhost:5173/**`

## Langkah 6: Buat User Admin

1. Buka tab "Authentication" > "Users"
2. Klik "Add user"
3. Isi:
   - Email: admin@mantabjo.com (atau email pilihan Anda)
   - Password: (buat password yang kuat)
   - Email Confirm: true
4. Klik "Create user"

## Langkah 7: Test Aplikasi

1. Pastikan server development sudah berjalan (`npm run dev`)
2. Buka `http://localhost:5173`
3. Aplikasi akan menampilkan splash screen, kemudian redirect ke login
4. Login dengan credentials admin yang sudah dibuat
5. Setelah login berhasil, Anda akan diarahkan ke dashboard

## Struktur Database

### Tabel `modals`
- Menyimpan data modal usaha
- Fields: id, user_id, jumlah, tanggal, keterangan

### Tabel `pengeluaran`
- Menyimpan data pengeluaran
- Fields: id, user_id, jumlah, tanggal, kategori, keterangan

### Tabel `hutang`
- Menyimpan data hutang
- Fields: id, user_id, nama_debitur, jumlah, tanggal_hutang, tanggal_jatuh_tempo, status, keterangan

### Tabel `pelanggan`
- Menyimpan data pelanggan
- Fields: id, user_id, nama, nomor_hp, alamat, email, tanggal_daftar, status

### Tabel `transaksi`
- Menyimpan data transaksi pulsa/PPOB
- Fields: id, user_id, pelanggan_id, jenis_transaksi, nomor_tujuan, nominal, harga_beli, harga_jual, keuntungan, status, tanggal_transaksi, keterangan

## Security Features

- **Row Level Security (RLS)**: Setiap user hanya bisa mengakses data mereka sendiri
- **Authentication**: Menggunakan Supabase Auth dengan email/password
- **Policies**: Setiap tabel memiliki policies untuk SELECT, INSERT, UPDATE, DELETE

## Troubleshooting

### Aplikasi menampilkan layar kosong
- Pastikan file `.env.local` ada dan berisi credentials yang benar
- Restart development server setelah mengubah environment variables
- Periksa console browser untuk error JavaScript

### Error saat login
- Pastikan user sudah dibuat di Supabase Auth
- Periksa Site URL dan Redirect URLs di Supabase Auth settings
- Pastikan email confirmation dinonaktifkan untuk development

### Error saat mengakses data
- Pastikan database schema sudah dijalankan
- Periksa RLS policies sudah aktif
- Pastikan user_id di data sesuai dengan auth.uid()

## Development Tips

1. Gunakan Supabase Table Editor untuk melihat dan mengedit data secara manual
2. Gunakan SQL Editor untuk menjalankan query custom
3. Monitor logs di tab "Logs" untuk debugging
4. Gunakan Supabase CLI untuk development yang lebih advanced

## Production Deployment

Untuk production:
1. Update Site URL dan Redirect URLs dengan domain production
2. Enable email confirmations
3. Setup custom SMTP untuk email
4. Review dan update RLS policies sesuai kebutuhan
5. Setup backup database