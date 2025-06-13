# MantabJo - Aplikasi Pencatatan Keuangan Pulsa dan PPOB

MantabJo adalah aplikasi web untuk pencatatan keuangan usaha pulsa dan PPOB. Aplikasi ini membantu pemilik usaha untuk mengelola modal, pengeluaran, hutang pelanggan, dan menghasilkan laporan keuangan.

## Fitur

- **Manajemen Modal Awal**: Catat dan kelola modal usaha
- **Pencatatan Pengeluaran Harian**: Catat semua pengeluaran operasional
- **Manajemen Hutang dan CRM**: Kelola hutang pelanggan dan data pelanggan
- **Perhitungan Keuntungan**: Hitung keuntungan harian, mingguan, dan bulanan
- **Laporan Keuangan**: Hasilkan laporan keuangan dalam format PDF
- **Manajemen Data Pelanggan**: Kelola informasi pelanggan

## Teknologi

- React.js (Vite)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Database)
- React Router
- React Hook Form + Zod
- jsPDF

## Cara Menjalankan

### Prasyarat

- Node.js (versi 18 atau lebih baru)
- npm atau yarn
- Akun Supabase

### Langkah-langkah

1. Clone repositori ini
   ```bash
   git clone https://github.com/username/MantabJo.git
   cd MantabJo
   ```

2. Instal dependensi
   ```bash
   npm install
   ```

3. Buat file `.env.local` dan isi dengan kredensial Supabase Anda
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Jalankan aplikasi dalam mode pengembangan
   ```bash
   npm run dev
   ```

5. Buka [http://localhost:5173](http://localhost:5173) di browser Anda

## Deployment

Aplikasi ini dikonfigurasi untuk deployment ke GitHub Pages:

```bash
npm run deploy
```

## Struktur Database

Aplikasi ini menggunakan Supabase dengan struktur tabel berikut:

- **modal**: Menyimpan data modal usaha
- **pengeluaran**: Menyimpan data pengeluaran harian
- **hutang**: Menyimpan data hutang pelanggan
- **pelanggan**: Menyimpan data pelanggan

## Lisensi

MIT
