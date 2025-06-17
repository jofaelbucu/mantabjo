-- Fungsi: laporan_keuangan_harian
CREATE OR REPLACE FUNCTION laporan_keuangan_harian(
  IN _user_id UUID,
  IN _start_date DATE,
  IN _end_date DATE
)
RETURNS TABLE (
  tanggal DATE,
  total_pendapatan NUMERIC,
  total_hpp NUMERIC,
  laba_kotor NUMERIC,
  total_beban_usaha NUMERIC,
  total_biaya_admin NUMERIC,
  total_biaya_non_usaha NUMERIC,
  laba_bersih NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d::DATE AS tanggal,
    COALESCE(SUM(t.harga_jual), 0) AS total_pendapatan,
    COALESCE(SUM(t.harga_beli), 0) AS total_hpp,
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0) AS laba_kotor,
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND tanggal = d), 0) AS total_beban_usaha,
    COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND tanggal = d), 0) AS total_biaya_admin,
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND tanggal = d), 0) AS total_biaya_non_usaha,
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND tanggal = d), 0)
      - COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND tanggal = d), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND tanggal = d), 0)
    AS laba_bersih
  FROM generate_series(_start_date, _end_date, '1 day') d
  LEFT JOIN transaksi t ON t.user_id = _user_id AND t.status = 'sukses' AND DATE(t.tanggal_transaksi) = d
  GROUP BY d
  ORDER BY d;
END;
$$ LANGUAGE plpgsql;


-- Fungsi: laporan_keuangan_mingguan
CREATE OR REPLACE FUNCTION laporan_keuangan_mingguan(
  IN _user_id UUID,
  IN _start_date DATE,
  IN _end_date DATE
)
RETURNS TABLE (
  minggu_awal DATE,
  minggu_akhir DATE,
  total_pendapatan NUMERIC,
  total_hpp NUMERIC,
  laba_kotor NUMERIC,
  total_beban_usaha NUMERIC,
  total_biaya_admin NUMERIC,
  total_biaya_non_usaha NUMERIC,
  laba_bersih NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', tgl)::DATE AS minggu_awal,
    (DATE_TRUNC('week', tgl) + INTERVAL '6 days')::DATE AS minggu_akhir,
    COALESCE(SUM(t.harga_jual), 0),
    COALESCE(SUM(t.harga_beli), 0),
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0),
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0),
    COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0),
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0),
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0)
      - COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND tanggal BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'), 0)
  FROM generate_series(_start_date, _end_date, '1 week') tgl
  LEFT JOIN transaksi t ON t.user_id = _user_id AND t.status = 'sukses' AND t.tanggal_transaksi BETWEEN DATE_TRUNC('week', tgl) AND DATE_TRUNC('week', tgl) + INTERVAL '6 days'
  GROUP BY minggu_awal
  ORDER BY minggu_awal;
END;
$$ LANGUAGE plpgsql;


-- Fungsi: laporan_keuangan_bulanan
CREATE OR REPLACE FUNCTION laporan_keuangan_bulanan(
  IN _user_id UUID,
  IN _start_date DATE,
  IN _end_date DATE
)
RETURNS TABLE (
  bulan INT,
  tahun INT,
  total_pendapatan NUMERIC,
  total_hpp NUMERIC,
  laba_kotor NUMERIC,
  total_beban_usaha NUMERIC,
  total_biaya_admin NUMERIC,
  total_biaya_non_usaha NUMERIC,
  laba_bersih NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM bulan)::INT,
    EXTRACT(YEAR FROM bulan)::INT,
    COALESCE(SUM(t.harga_jual), 0),
    COALESCE(SUM(t.harga_beli), 0),
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0),
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0),
    COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0),
    COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0),
    COALESCE(SUM(t.harga_jual - t.harga_beli), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'usaha' AND user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0)
      - COALESCE((SELECT SUM(biaya_admin) FROM modals WHERE user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0)
      - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kategori = 'non_usaha' AND user_id = _user_id AND DATE_TRUNC('month', tanggal) = bulan), 0)
  FROM generate_series(_start_date, _end_date, '1 month') bulan
  LEFT JOIN transaksi t ON t.user_id = _user_id AND t.status = 'sukses' AND DATE_TRUNC('month', t.tanggal_transaksi) = bulan
  GROUP BY bulan
  ORDER BY bulan;
END;
$$ LANGUAGE plpgsql;
