-- Database setup untuk aplikasi MantabJo
-- Jalankan script ini di Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Tabel untuk data modal
CREATE TABLE IF NOT EXISTS modals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk data pengeluaran
CREATE TABLE IF NOT EXISTS pengeluaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    jumlah DECIMAL(15,2) NOT NULL,
    harga_jual DECIMAL(15,2) DEFAULT 0,
    keuntungan DECIMAL(15,2) DEFAULT 0,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    kategori VARCHAR(100),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk data hutang
CREATE TABLE IF NOT EXISTS hutang (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pelanggan_id UUID REFERENCES pelanggan(id) ON DELETE SET NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal_hutang DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_jatuh_tempo DATE,
    jenis VARCHAR(50) CHECK (jenis IN ('usaha', 'non_usaha')),
    status VARCHAR(50) DEFAULT 'belum_lunas' CHECK (status IN ('belum_lunas', 'lunas', 'terlambat')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk data pelanggan
CREATE TABLE IF NOT EXISTS pelanggan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    nomor_hp VARCHAR(20),
    alamat TEXT,
    email VARCHAR(255),
    tanggal_daftar DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'aktif' CHECK (status IN ('aktif', 'non_aktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk transaksi pulsa/PPOB
CREATE TABLE IF NOT EXISTS transaksi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pelanggan_id UUID REFERENCES pelanggan(id) ON DELETE SET NULL,
    jenis_transaksi VARCHAR(100) NOT NULL, -- 'pulsa', 'paket_data', 'pln', 'pdam', dll
    nomor_tujuan VARCHAR(50) NOT NULL,
    nominal DECIMAL(15,2) NOT NULL,
    harga_beli DECIMAL(15,2) NOT NULL,
    harga_jual DECIMAL(15,2) NOT NULL,
    keuntungan DECIMAL(15,2) GENERATED ALWAYS AS (harga_jual - harga_beli) STORED,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sukses', 'gagal')),
    tanggal_transaksi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security untuk semua tabel
ALTER TABLE modals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;

-- Policies untuk modals
CREATE POLICY "Users can view own modals" ON modals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own modals" ON modals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modals" ON modals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own modals" ON modals
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk pengeluaran
CREATE POLICY "Users can view own pengeluaran" ON pengeluaran
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pengeluaran" ON pengeluaran
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pengeluaran" ON pengeluaran
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pengeluaran" ON pengeluaran
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk hutang
CREATE POLICY "Users can view own hutang" ON hutang
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hutang" ON hutang
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hutang" ON hutang
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hutang" ON hutang
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk pelanggan
CREATE POLICY "Users can view own pelanggan" ON pelanggan
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pelanggan" ON pelanggan
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pelanggan" ON pelanggan
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pelanggan" ON pelanggan
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk transaksi
CREATE POLICY "Users can view own transaksi" ON transaksi
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transaksi" ON transaksi
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transaksi" ON transaksi
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transaksi" ON transaksi
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes untuk performa
CREATE INDEX idx_modals_user_id ON modals(user_id);
CREATE INDEX idx_modals_tanggal ON modals(tanggal);

CREATE INDEX idx_pengeluaran_user_id ON pengeluaran(user_id);
CREATE INDEX idx_pengeluaran_tanggal ON pengeluaran(tanggal);

ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY pengeluaran_policy ON pengeluaran
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_hutang_user_id ON hutang(user_id);
CREATE INDEX idx_hutang_status ON hutang(status);
CREATE INDEX idx_hutang_jatuh_tempo ON hutang(tanggal_jatuh_tempo);

CREATE INDEX idx_pelanggan_user_id ON pelanggan(user_id);
CREATE INDEX idx_pelanggan_nama ON pelanggan(nama);

CREATE INDEX idx_transaksi_user_id ON transaksi(user_id);
CREATE INDEX idx_transaksi_tanggal ON transaksi(tanggal_transaksi);
CREATE INDEX idx_transaksi_status ON transaksi(status);

-- Functions untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers untuk auto-update timestamp
CREATE TRIGGER update_modals_updated_at BEFORE UPDATE ON modals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pengeluaran_updated_at BEFORE UPDATE ON pengeluaran
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hutang_updated_at BEFORE UPDATE ON hutang
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pelanggan_updated_at BEFORE UPDATE ON pelanggan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaksi_updated_at BEFORE UPDATE ON transaksi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();