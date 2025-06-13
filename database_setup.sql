-- Database setup untuk aplikasi MantabJo (Diperbaiki)
-- Urutan pembuatan tabel telah disesuaikan untuk mengatasi error dependensi.

-- 1. Buat tabel yang tidak memiliki dependensi terlebih dahulu.
CREATE TABLE IF NOT EXISTS modals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    jumlah DECIMAL(15, 2) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    -- KOLOM BARU DITAMBAHKAN DI SINI
    sumber_dana VARCHAR(50) NOT NULL CHECK (sumber_dana IN ('cash', 'seabank', 'gopay', 'aplikasi_isipulsa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pengeluaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    jumlah DECIMAL(15, 2) NOT NULL,
    harga_jual DECIMAL(15, 2) DEFAULT 0,
    keuntungan DECIMAL(15, 2) DEFAULT 0,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    kategori VARCHAR(50) CHECK (kategori IN ('usaha', 'non_usaha')),
    -- KOLOM BARU DITAMBAHKAN DI SINI
    sumber_dana VARCHAR(50) NOT NULL CHECK (sumber_dana IN ('cash', 'seabank', 'gopay', 'aplikasi_isipulsa')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PERBAIKAN UTAMA: Buat tabel 'pelanggan' SEBELUM tabel lain yang mereferensikannya.
CREATE TABLE IF NOT EXISTS pelanggan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    nomor_hp VARCHAR(20), -- Diubah agar konsisten dengan form Anda
    alamat TEXT,
    email VARCHAR(255),
    tanggal_daftar DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'aktif' CHECK (status IN ('aktif', 'non_aktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Buat tabel yang memiliki dependensi ke 'pelanggan'.
CREATE TABLE IF NOT EXISTS hutang (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pelanggan_id UUID REFERENCES pelanggan(id) ON DELETE SET NULL,
    jumlah DECIMAL(15, 2) NOT NULL,
    tanggal_hutang DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_jatuh_tempo DATE,
    jenis VARCHAR(50) CHECK (jenis IN ('usaha', 'non_usaha')),
    status VARCHAR(50) DEFAULT 'belum_lunas' CHECK (status IN ('belum_lunas', 'lunas')), -- Status 'terlambat' sebaiknya ditentukan di frontend
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.hutang
ADD COLUMN tanggal_lunas timestamptz NULL;

CREATE TABLE IF NOT EXISTS transaksi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pelanggan_id UUID REFERENCES pelanggan(id) ON DELETE SET NULL,
    jenis_transaksi VARCHAR(100) NOT NULL,
    nomor_tujuan VARCHAR(50) NOT NULL,
    nominal DECIMAL(15, 2) NOT NULL,
    harga_beli DECIMAL(15, 2) NOT NULL,
    harga_jual DECIMAL(15, 2) NOT NULL,
    keuntungan DECIMAL(15, 2) GENERATED ALWAYS AS (harga_jual - harga_beli) STORED,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sukses', 'gagal')),
    -- KOLOM BARU DITAMBAHKAN DI SINI
    sumber_dana VARCHAR(50) NOT NULL CHECK (sumber_dana IN ('cash', 'seabank', 'gopay', 'aplikasi_isipulsa')),
    tanggal_transaksi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Aktifkan Row Level Security (RLS) untuk semua tabel.
ALTER TABLE modals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;

-- 5. Buat Policies RLS (disederhanakan).
-- Kebijakan ini memastikan pengguna hanya bisa mengakses data mereka sendiri.
DROP POLICY IF EXISTS "Users can manage own modals" ON modals;
CREATE POLICY "Users can manage own modals" ON modals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own pengeluaran" ON pengeluaran;
CREATE POLICY "Users can manage own pengeluaran" ON pengeluaran FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own hutang" ON hutang;
CREATE POLICY "Users can manage own hutang" ON hutang FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own pelanggan" ON pelanggan;
CREATE POLICY "Users can manage own pelanggan" ON pelanggan FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own transaksi" ON transaksi;
CREATE POLICY "Users can manage own transaksi" ON transaksi FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Buat Indexes untuk performa.
CREATE INDEX IF NOT EXISTS idx_modals_user_id_tanggal ON modals(user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_user_id_tanggal ON pengeluaran(user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_hutang_user_id ON hutang(user_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_user_id ON pelanggan(user_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_user_id_tanggal ON transaksi(user_id, tanggal_transaksi);

-- 7. Buat Fungsi dan Trigger untuk auto-update kolom 'updated_at'.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Hapus trigger lama jika ada, untuk menghindari error duplikat
DROP TRIGGER IF EXISTS update_modals_updated_at ON modals;
CREATE TRIGGER update_modals_updated_at BEFORE UPDATE ON modals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pengeluaran_updated_at ON pengeluaran;
CREATE TRIGGER update_pengeluaran_updated_at BEFORE UPDATE ON pengeluaran FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hutang_updated_at ON hutang;
CREATE TRIGGER update_hutang_updated_at BEFORE UPDATE ON hutang FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pelanggan_updated_at ON pelanggan;
CREATE TRIGGER update_pelanggan_updated_at BEFORE UPDATE ON pelanggan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transaksi_updated_at ON transaksi;
CREATE TRIGGER update_transaksi_updated_at BEFORE UPDATE ON transaksi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

