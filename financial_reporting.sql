-- Skema Perhitungan dan Struktur Database untuk Laporan Keuangan

/*
=== SKEMA PERHITUNGAN MATEMATIS ===

1. Total Pendapatan
   = SUM(harga_jual) dari tabel transaksi dengan status='sukses'
   Filter: berdasarkan rentang tanggal (per hari/minggu/bulan)

2. Laba Kotor
   = Total Pendapatan - Total HPP
   dimana Total HPP = SUM(harga_beli) dari tabel transaksi dengan status='sukses'

3. Laba Bersih
   = Laba Kotor - Total Beban Usaha - Total Biaya Admin Transfer - Total Biaya Non Usaha
   dimana:
   - Total Beban Usaha = SUM(jumlah) dari tabel pengeluaran dengan kategori='usaha'
   - Total Biaya Admin Transfer = SUM(biaya_admin) dari tabel modals
   - Total Biaya Non Usaha = SUM(jumlah) dari tabel pengeluaran dengan kategori='non_usaha'

4. Total Modal Masuk
   = SUM(jumlah) dari tabel modals

5. Beban Usaha
   = SUM(jumlah) dari tabel pengeluaran dengan kategori='usaha'

6. Biaya Admin Transfer
   = SUM(biaya_admin) dari tabel modals

7. Biaya Non Usaha
   = SUM(jumlah) dari tabel pengeluaran dengan kategori='non_usaha'

8. Total Hutang
   = SUM(jumlah) dari tabel hutang dengan status='belum_lunas'
*/

-- Struktur tabel sudah ada di database_setup.sql, berikut adalah view dan query untuk laporan keuangan

-- View untuk menghitung Laba Bersih per bulan
CREATE OR REPLACE VIEW view_laba_bersih_bulanan AS
WITH pendapatan AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', tanggal_transaksi) AS bulan,
        SUM(harga_jual) AS total_pendapatan,
        SUM(harga_beli) AS total_hpp
    FROM transaksi
    WHERE status = 'sukses'
    GROUP BY user_id, DATE_TRUNC('month', tanggal_transaksi)
),
beban_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', tanggal) AS bulan,
        SUM(jumlah) AS total_beban_usaha
    FROM pengeluaran
    WHERE kategori = 'usaha'
    GROUP BY user_id, DATE_TRUNC('month', tanggal)
),
biaya_admin AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', tanggal) AS bulan,
        SUM(biaya_admin) AS total_biaya_admin
    FROM modals
    GROUP BY user_id, DATE_TRUNC('month', tanggal)
),
biaya_non_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', tanggal) AS bulan,
        SUM(jumlah) AS total_biaya_non_usaha
    FROM pengeluaran
    WHERE kategori = 'non_usaha'
    GROUP BY user_id, DATE_TRUNC('month', tanggal)
)
SELECT 
    p.user_id,
    p.bulan,
    p.total_pendapatan,
    p.total_hpp,
    (p.total_pendapatan - p.total_hpp) AS laba_kotor,
    COALESCE(bu.total_beban_usaha, 0) AS total_beban_usaha,
    COALESCE(ba.total_biaya_admin, 0) AS total_biaya_admin,
    COALESCE(bnu.total_biaya_non_usaha, 0) AS total_biaya_non_usaha,
    (p.total_pendapatan - p.total_hpp - COALESCE(bu.total_beban_usaha, 0) - COALESCE(ba.total_biaya_admin, 0) - COALESCE(bnu.total_biaya_non_usaha, 0)) AS laba_bersih
FROM pendapatan p
LEFT JOIN beban_usaha bu ON p.user_id = bu.user_id AND p.bulan = bu.bulan
LEFT JOIN biaya_admin ba ON p.user_id = ba.user_id AND p.bulan = ba.bulan
LEFT JOIN biaya_non_usaha bnu ON p.user_id = bnu.user_id AND p.bulan = bnu.bulan;

-- View untuk menghitung Laba Bersih per minggu
CREATE OR REPLACE VIEW view_laba_bersih_mingguan AS
WITH pendapatan AS (
    SELECT 
        user_id,
        DATE_TRUNC('week', tanggal_transaksi) AS minggu,
        SUM(harga_jual) AS total_pendapatan,
        SUM(harga_beli) AS total_hpp
    FROM transaksi
    WHERE status = 'sukses'
    GROUP BY user_id, DATE_TRUNC('week', tanggal_transaksi)
),
beban_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('week', tanggal) AS minggu,
        SUM(jumlah) AS total_beban_usaha
    FROM pengeluaran
    WHERE kategori = 'usaha'
    GROUP BY user_id, DATE_TRUNC('week', tanggal)
),
biaya_admin AS (
    SELECT 
        user_id,
        DATE_TRUNC('week', tanggal) AS minggu,
        SUM(biaya_admin) AS total_biaya_admin
    FROM modals
    GROUP BY user_id, DATE_TRUNC('week', tanggal)
),
biaya_non_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('week', tanggal) AS minggu,
        SUM(jumlah) AS total_biaya_non_usaha
    FROM pengeluaran
    WHERE kategori = 'non_usaha'
    GROUP BY user_id, DATE_TRUNC('week', tanggal)
)
SELECT 
    p.user_id,
    p.minggu,
    p.total_pendapatan,
    p.total_hpp,
    (p.total_pendapatan - p.total_hpp) AS laba_kotor,
    COALESCE(bu.total_beban_usaha, 0) AS total_beban_usaha,
    COALESCE(ba.total_biaya_admin, 0) AS total_biaya_admin,
    COALESCE(bnu.total_biaya_non_usaha, 0) AS total_biaya_non_usaha,
    (p.total_pendapatan - p.total_hpp - COALESCE(bu.total_beban_usaha, 0) - COALESCE(ba.total_biaya_admin, 0) - COALESCE(bnu.total_biaya_non_usaha, 0)) AS laba_bersih
FROM pendapatan p
LEFT JOIN beban_usaha bu ON p.user_id = bu.user_id AND p.minggu = bu.minggu
LEFT JOIN biaya_admin ba ON p.user_id = ba.user_id AND p.minggu = ba.minggu
LEFT JOIN biaya_non_usaha bnu ON p.user_id = bnu.user_id AND p.minggu = bnu.minggu;

-- View untuk menghitung Laba Bersih per hari
CREATE OR REPLACE VIEW view_laba_bersih_harian AS
WITH pendapatan AS (
    SELECT 
        user_id,
        DATE_TRUNC('day', tanggal_transaksi) AS hari,
        SUM(harga_jual) AS total_pendapatan,
        SUM(harga_beli) AS total_hpp
    FROM transaksi
    WHERE status = 'sukses'
    GROUP BY user_id, DATE_TRUNC('day', tanggal_transaksi)
),
beban_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('day', tanggal) AS hari,
        SUM(jumlah) AS total_beban_usaha
    FROM pengeluaran
    WHERE kategori = 'usaha'
    GROUP BY user_id, DATE_TRUNC('day', tanggal)
),
biaya_admin AS (
    SELECT 
        user_id,
        DATE_TRUNC('day', tanggal) AS hari,
        SUM(biaya_admin) AS total_biaya_admin
    FROM modals
    GROUP BY user_id, DATE_TRUNC('day', tanggal)
),
biaya_non_usaha AS (
    SELECT 
        user_id,
        DATE_TRUNC('day', tanggal) AS hari,
        SUM(jumlah) AS total_biaya_non_usaha
    FROM pengeluaran
    WHERE kategori = 'non_usaha'
    GROUP BY user_id, DATE_TRUNC('day', tanggal)
)
SELECT 
    p.user_id,
    p.hari,
    p.total_pendapatan,
    p.total_hpp,
    (p.total_pendapatan - p.total_hpp) AS laba_kotor,
    COALESCE(bu.total_beban_usaha, 0) AS total_beban_usaha,
    COALESCE(ba.total_biaya_admin, 0) AS total_biaya_admin,
    COALESCE(bnu.total_biaya_non_usaha, 0) AS total_biaya_non_usaha,
    (p.total_pendapatan - p.total_hpp - COALESCE(bu.total_beban_usaha, 0) - COALESCE(ba.total_biaya_admin, 0) - COALESCE(bnu.total_biaya_non_usaha, 0)) AS laba_bersih
FROM pendapatan p
LEFT JOIN beban_usaha bu ON p.user_id = bu.user_id AND p.hari = bu.hari
LEFT JOIN biaya_admin ba ON p.user_id = ba.user_id AND p.hari = ba.hari
LEFT JOIN biaya_non_usaha bnu ON p.user_id = bnu.user_id AND p.hari = bnu.hari;

-- Contoh Query untuk menghitung Laba Bersih berdasarkan rentang tanggal tertentu
/*
SELECT 
    SUM(t.harga_jual) AS total_pendapatan,
    SUM(t.harga_beli) AS total_hpp,
    (SUM(t.harga_jual) - SUM(t.harga_beli)) AS laba_kotor,
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE user_id = :user_id AND kategori = 'usaha' AND tanggal BETWEEN :start_date AND :end_date), 0) AS total_beban_usaha,
    COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = :user_id AND tanggal BETWEEN :start_date AND :end_date), 0) AS total_biaya_admin,
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE user_id = :user_id AND kategori = 'non_usaha' AND tanggal BETWEEN :start_date AND :end_date), 0) AS total_biaya_non_usaha,
    (
        SUM(t.harga_jual) - SUM(t.harga_beli) - 
        COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE user_id = :user_id AND kategori = 'usaha' AND tanggal BETWEEN :start_date AND :end_date), 0) - 
        COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = :user_id AND tanggal BETWEEN :start_date AND :end_date), 0) - 
        COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE user_id = :user_id AND kategori = 'non_usaha' AND tanggal BETWEEN :start_date AND :end_date), 0)
    ) AS laba_bersih
FROM transaksi t
WHERE t.user_id = :user_id AND t.status = 'sukses' AND t.tanggal_transaksi BETWEEN :start_date AND :end_date;
*/

-- Contoh Query untuk menghitung Total Modal Masuk
/*
SELECT 
    SUM(jumlah) AS total_modal_masuk,
    SUM(biaya_admin) AS total_biaya_admin
FROM modals
WHERE user_id = :user_id AND tanggal BETWEEN :start_date AND :end_date;
*/

-- Contoh Query untuk menghitung Total Hutang yang belum lunas
/*
SELECT 
    SUM(jumlah) AS total_hutang_belum_lunas
FROM hutang
WHERE user_id = :user_id AND status = 'belum_lunas';
*/

-- Contoh Query untuk menghitung Beban Usaha berdasarkan sumber dana
/*
SELECT 
    sumber_dana,
    SUM(jumlah) AS total_beban_usaha
FROM pengeluaran
WHERE user_id = :user_id AND kategori = 'usaha' AND tanggal BETWEEN :start_date AND :end_date
GROUP BY sumber_dana;
*/

-- Contoh Query untuk menghitung Biaya Admin Transfer berdasarkan sumber dana
/*
SELECT 
    sumber_dana,
    SUM(biaya_admin) AS total_biaya_admin
FROM modals
WHERE user_id = :user_id AND tanggal BETWEEN :start_date AND :end_date
GROUP BY sumber_dana;
*/

-- Contoh Query untuk menghitung Biaya Non Usaha berdasarkan sumber dana
/*
SELECT 
    sumber_dana,
    SUM(jumlah) AS total_biaya_non_usaha
FROM pengeluaran
WHERE user_id = :user_id AND kategori = 'non_usaha' AND tanggal BETWEEN :start_date AND :end_date
GROUP BY sumber_dana;
*/