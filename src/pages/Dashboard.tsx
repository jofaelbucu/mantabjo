import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { formatRupiah, cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { 
  Loader2,
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  ShoppingCart, // Ikon untuk modal transaksi
  BarChart3, // Ikon untuk laporan
  Calendar as CalendarIcon, // Ikon untuk calendar
  RefreshCcw // Ikon untuk refresh laporan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState, useEffect } from 'react';

// --- PERUBAHAN 1: Update Tipe Data Statistik untuk memisahkan pengeluaran ---
type DashboardStats = {
  totalPendapatan: number;
  labaKotor: number;
  labaBersih: number;
  totalModal: number;
  totalPengeluaranUsaha: number;
  totalPengeluaranNonUsaha: number;
  totalHutangBelumLunasUsaha: number;
  totalHutangBelumLunasNonUsaha: number;
  totalHutangBelumLunas: number;
  // State untuk modal dari tabel Transaksi
  modalTransaksiCash: number;
  modalTransaksiSeabank: number;
  modalTransaksiGopay: number;
  modalTransaksiAplikasiIsiPulsa: number;
  // State untuk beban dari tabel Pengeluaran
  bebanUmumCash: number;
  bebanUmumSeabank: number;
  bebanUmumGopay: number;
  bebanUmumAplikasiIsiPulsa: number;
  // State untuk biaya admin
  biayaAdminCash: number;
  biayaAdminSeabank: number;
  biayaAdminGopay: number;
  biayaAdminAplikasiIsiPulsa: number;
  totalBiayaAdmin: number;
};

// --- TAMBAHAN: Tipe Data untuk Laporan Keuangan ---
type LaporanKeuanganHarian = {
  tanggal: string;
  total_pendapatan: number;
  total_hpp: number;
  laba_kotor: number;
  total_beban_usaha: number;
  total_biaya_admin: number;
  total_biaya_non_usaha: number;
  laba_bersih: number;
};

type LaporanKeuanganMingguan = {
  minggu_awal: string;
  minggu_akhir: string;
  total_pendapatan: number;
  total_hpp: number;
  laba_kotor: number;
  total_beban_usaha: number;
  total_biaya_admin: number;
  total_biaya_non_usaha: number;
  laba_bersih: number;
};

type LaporanKeuanganBulanan = {
  bulan: number;
  tahun: number;
  total_pendapatan: number;
  total_hpp: number;
  laba_kotor: number;
  total_beban_usaha: number;
  total_biaya_admin: number;
  total_biaya_non_usaha: number;
  laba_bersih: number;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPendapatan: 0,
    labaKotor: 0,
    labaBersih: 0,
    totalModal: 0,
    totalPengeluaranUsaha: 0,
    totalPengeluaranNonUsaha: 0,
    totalHutangBelumLunasUsaha: 0,
    totalHutangBelumLunasNonUsaha: 0,
    totalHutangBelumLunas: 0,
    // Inisialisasi state baru
    modalTransaksiCash: 0,
    modalTransaksiSeabank: 0,
    modalTransaksiGopay: 0,
    modalTransaksiAplikasiIsiPulsa: 0,
    bebanUmumCash: 0,
    bebanUmumSeabank: 0,
    bebanUmumGopay: 0,
    bebanUmumAplikasiIsiPulsa: 0,
    // Inisialisasi state biaya admin
    biayaAdminCash: 0,
    biayaAdminSeabank: 0,
    biayaAdminGopay: 0,
    biayaAdminAplikasiIsiPulsa: 0,
    totalBiayaAdmin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('hari-ini');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- TAMBAHAN: State untuk Laporan Keuangan ---
  const [viewMode, setViewMode] = useState<'dashboard' | 'laporan'>('dashboard');
  const [reportType, setReportType] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [laporanHarian, setLaporanHarian] = useState<LaporanKeuanganHarian[]>([]);
  const [laporanMingguan, setLaporanMingguan] = useState<LaporanKeuanganMingguan[]>([]);
  const [laporanBulanan, setLaporanBulanan] = useState<LaporanKeuanganBulanan[]>([]);
  const [loadingLaporan, setLoadingLaporan] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // 1 Januari tahun ini
  const [endDate, setEndDate] = useState<Date | undefined>(new Date()); // Hari ini

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchDashboardData = async () => {
      setLoading(true);
      console.log('Fetching dashboard data for user:', user.id);
      
      try {
        // Ambil semua data tanpa filter tanggal untuk memastikan data muncul
        const [modalRes, pengeluaranRes, hutangRes, transaksiRes] = await Promise.all([
          supabase.from('modals').select('jumlah').eq('user_id', user.id),
          supabase.from('pengeluaran').select('jumlah, kategori, sumber_dana').eq('user_id', user.id),
          supabase.from('hutang').select('jumlah, status, jenis').eq('user_id', user.id),
          supabase.from('transaksi').select('harga_jual, harga_beli, sumber_dana').eq('user_id', user.id).eq('status', 'sukses'),
        ]);

        if (modalRes.error) throw modalRes.error;
        if (pengeluaranRes.error) throw pengeluaranRes.error;
        if (hutangRes.error) throw hutangRes.error;
        if (transaksiRes.error) throw transaksiRes.error;
        
        // Ambil data modals untuk biaya admin
        const modalsDataRes = await supabase
          .from('modals')
          .select('jumlah, sumber_dana, biaya_admin')
          .eq('user_id', user.id);
          
        if (modalsDataRes.error) throw modalsDataRes.error;
        const modalsData = modalsDataRes.data || [];
        
        // Log data untuk debugging
        console.log('Data yang diambil dari database:');
        console.log('Modals data:', modalsData);
        console.log('Pengeluaran data:', pengeluaranRes.data);
        console.log('Transaksi data:', transaksiRes.data);
        console.log('Hutang data:', hutangRes.data);
        
        const pengeluaranData = pengeluaranRes.data || [];
        const transaksiData = transaksiRes.data || [];

        // Pastikan nilai yang dihitung tidak NaN atau undefined
        const totalPendapatan = transaksiData.reduce((sum, item) => sum + (Number(item.harga_jual) || 0), 0);
        const totalHPP = transaksiData.reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);
        const labaKotor = totalPendapatan - totalHPP;
        
        // Pastikan kategori diperiksa dengan benar
        const totalPengeluaranUsaha = pengeluaranData
          .filter(p => p.kategori === 'usaha' || p.kategori === 'Usaha')
          .reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
          
        const totalPengeluaranNonUsaha = pengeluaranData
          .filter(p => p.kategori === 'non_usaha' || p.kategori === 'Non Usaha' || p.kategori === 'non usaha')
          .reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        const hutangUsahaData = hutangRes.data.filter(item => (item.jenis === 'usaha' || item.jenis === 'Usaha') && (item.status === 'belum_lunas' || item.status === 'Belum Lunas'));
        const hutangNonUsahaData = hutangRes.data.filter(item => (item.jenis === 'non_usaha' || item.jenis === 'Non Usaha' || item.jenis === 'non usaha') && (item.status === 'belum_lunas' || item.status === 'Belum Lunas'));
        const totalHutangBelumLunasUsaha = hutangUsahaData.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        const totalHutangBelumLunasNonUsaha = hutangNonUsahaData.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);

        // Kalkulasi untuk Modal Transaksi (dari tabel 'transaksi')
        const modalTransaksiCash = transaksiData.filter(t => t.sumber_dana === 'cash' || t.sumber_dana === 'Cash').reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);
        const modalTransaksiSeabank = transaksiData.filter(t => t.sumber_dana === 'seabank' || t.sumber_dana === 'Seabank').reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);
        const modalTransaksiGopay = transaksiData.filter(t => t.sumber_dana === 'gopay' || t.sumber_dana === 'Gopay').reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);
        const modalTransaksiAplikasiIsiPulsa = transaksiData.filter(t => t.sumber_dana === 'aplikasi_isipulsa' || t.sumber_dana === 'Aplikasi IsiPulsa').reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);

        // Kalkulasi untuk Beban Umum (dari tabel 'pengeluaran')
        const bebanUmumCash = pengeluaranData.filter(p => p.sumber_dana === 'cash' || p.sumber_dana === 'Cash').reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        const bebanUmumSeabank = pengeluaranData.filter(p => p.sumber_dana === 'seabank' || p.sumber_dana === 'Seabank').reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        const bebanUmumGopay = pengeluaranData.filter(p => p.sumber_dana === 'gopay' || p.sumber_dana === 'Gopay').reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        const bebanUmumAplikasiIsiPulsa = pengeluaranData.filter(p => p.sumber_dana === 'aplikasi_isipulsa' || p.sumber_dana === 'Aplikasi IsiPulsa').reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);

        // Calculate total biaya admin
        const biayaAdminCash = modalsData
          .filter(m => m.sumber_dana === 'cash' || m.sumber_dana === 'Cash')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminSeabank = modalsData
          .filter(m => m.sumber_dana === 'seabank' || m.sumber_dana === 'Seabank')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminGopay = modalsData
          .filter(m => m.sumber_dana === 'gopay' || m.sumber_dana === 'Gopay')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminAplikasiIsiPulsa = modalsData
          .filter(m => m.sumber_dana === 'aplikasi_isipulsa' || m.sumber_dana === 'Aplikasi IsiPulsa')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const totalBiayaAdmin = biayaAdminCash + biayaAdminSeabank + biayaAdminGopay + biayaAdminAplikasiIsiPulsa;
        
        // Hitung totalModal dari data modals
        const totalModal = modalsData.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
        
        // Perhitungan Laba Bersih yang diperbarui: Laba Kotor - Beban Usaha - Biaya Admin - Biaya Non Usaha
        const labaBersih = labaKotor - totalPengeluaranUsaha - totalBiayaAdmin - totalPengeluaranNonUsaha;

        console.log('Hasil perhitungan:');
        console.log('Total Pendapatan:', totalPendapatan);
        console.log('Total HPP:', totalHPP);
        console.log('Laba Kotor:', labaKotor);
        console.log('Total Pengeluaran Usaha:', totalPengeluaranUsaha);
        console.log('Total Pengeluaran Non Usaha:', totalPengeluaranNonUsaha);
        console.log('Total Biaya Admin:', totalBiayaAdmin);
        console.log('Laba Bersih:', labaBersih);
        console.log('Total Modal:', totalModal);

        setStats({
            totalPendapatan,
            labaKotor,
            labaBersih,
            totalModal,
            totalPengeluaranUsaha,
            totalPengeluaranNonUsaha,
            totalHutangBelumLunasUsaha,
            totalHutangBelumLunasNonUsaha,
            totalHutangBelumLunas: totalHutangBelumLunasUsaha + totalHutangBelumLunasNonUsaha,
            modalTransaksiCash,
            modalTransaksiSeabank,
            modalTransaksiGopay,
            modalTransaksiAplikasiIsiPulsa,
            bebanUmumCash,
            bebanUmumSeabank,
            bebanUmumGopay,
            bebanUmumAplikasiIsiPulsa,
            biayaAdminCash,
            biayaAdminSeabank,
            biayaAdminGopay,
            biayaAdminAplikasiIsiPulsa,
            totalBiayaAdmin,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, timeframe, selectedMonth, selectedYear]);
  
  const getTitle = () => {
    switch (timeframe) {
        case 'minggu-ini': return 'Minggu Ini';
        case 'bulan-ini': return 'Bulan Ini';
        case 'pilih-bulan': return `${new Date(2000, selectedMonth - 1, 1).toLocaleString('id-ID', { month: 'long' })} ${selectedYear}`;
        case 'hari-ini':
        default: return 'Hari Ini';
    }
  };

  const isNetProfitPositive = stats.labaBersih >= 0;

  const StatCard = ({ title, value, icon, description, className }: { title: string, value: string, icon: React.ReactNode, description?: string, className?: string }) => (
    <Card className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
  );

  // --- TAMBAHAN: Fungsi untuk mengambil data laporan keuangan ---
  const fetchLaporanKeuangan = async () => {
    if (!user) return;
    
    setLoadingLaporan(true);
    console.log('Fetching laporan keuangan for user:', user.id);
    
    // Format tanggal untuk query
    const formattedStartDate = startDate ? startDate.toISOString().split('T')[0] : '2023-01-01';
    const formattedEndDate = endDate ? endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    console.log(`Fetching data from ${formattedStartDate} to ${formattedEndDate}`);
    
    try {
      if (reportType === 'harian') {
        // Ambil data laporan harian dengan rentang tanggal yang dipilih
        const { data, error } = await supabase.rpc('laporan_keuangan_harian', {
          _user_id: user.id,
          _start_date: formattedStartDate,
          _end_date: formattedEndDate
        });
        
        if (error) {
          console.error('Error fetching laporan harian:', error);
          throw error;
        }
        console.log('Laporan harian data:', data);
        setLaporanHarian(data || []);
      } else if (reportType === 'mingguan') {
        // Ambil data laporan mingguan dengan rentang tanggal yang dipilih
        const { data, error } = await supabase.rpc('laporan_keuangan_mingguan', {
          _user_id: user.id,
          _start_date: formattedStartDate,
          _end_date: formattedEndDate
        });
        
        if (error) {
          console.error('Error fetching laporan mingguan:', error);
          throw error;
        }
        console.log('Laporan mingguan data:', data);
        setLaporanMingguan(data || []);
      } else if (reportType === 'bulanan') {
        // Ambil data laporan bulanan dengan rentang tanggal yang dipilih
        const { data, error } = await supabase.rpc('laporan_keuangan_bulanan', {
          _user_id: user.id,
          _start_date: formattedStartDate,
          _end_date: formattedEndDate
        });
        
        if (error) {
          console.error('Error fetching laporan bulanan:', error);
          throw error;
        }
        console.log('Laporan bulanan data:', data);
        setLaporanBulanan(data || []);
      }
    } catch (error) {
      console.error('Error fetching laporan keuangan:', error);
    } finally {
      setLoadingLaporan(false);
    }
  };

  // --- TAMBAHAN: Fungsi untuk memformat tanggal ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // --- TAMBAHAN: Fungsi untuk mendapatkan nama bulan ---
  const getNamaBulan = (bulan: number) => {
    return new Date(2000, bulan - 1, 1).toLocaleString('id-ID', { month: 'long' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan keuangan usaha Anda</p>
        </div>
        
        {/* --- TAMBAHAN: Toggle antara Dashboard dan Laporan --- */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button 
            variant={viewMode === 'dashboard' ? "default" : "outline"}
            onClick={() => setViewMode('dashboard')}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Dashboard
          </Button>
          <Button 
            variant={viewMode === 'laporan' ? "default" : "outline"}
            onClick={() => {
              setViewMode('laporan');
              fetchLaporanKeuangan();
            }}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Laporan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hari-ini" onValueChange={setTimeframe} value={timeframe}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-fit bg-pink-100/60 p-1 h-auto rounded-lg">
          <TabsTrigger value="hari-ini" className="transition-colors duration-200 rounded-md data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-pink-100/80">Hari Ini</TabsTrigger>
          <TabsTrigger value="minggu-ini" className="transition-colors duration-200 rounded-md data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-pink-100/80">Minggu Ini</TabsTrigger>
          <TabsTrigger value="bulan-ini" className="transition-colors duration-200 rounded-md data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-pink-100/80">Bulan Ini</TabsTrigger>
          <TabsTrigger value="pilih-bulan" className="transition-colors duration-200 rounded-md data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-pink-100/80">Pilih Bulan</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {timeframe === 'pilih-bulan' && (
        <motion.div 
            className="mt-4 flex items-center gap-4 p-4 bg-muted/40 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded-md border p-2 bg-background shadow-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>{new Date(2000, month - 1, 1).toLocaleString('id-ID', { month: 'long' })}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded-md border p-2 bg-background shadow-sm">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : viewMode === 'dashboard' ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Bagian Ringkasan Utama */}
          <Card className={`col-span-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isNetProfitPositive ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-300' : 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Keuntungan Bersih ({getTitle()})</CardTitle>
              {isNetProfitPositive ? <ShieldCheck className="h-5 w-5 text-green-700" /> : <ShieldAlert className="h-5 w-5 text-red-700" />}
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${isNetProfitPositive ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {isNetProfitPositive ? '+' : ''}{formatRupiah(stats.labaBersih)}
              </p>
              <p className="text-sm text-muted-foreground">Perhitunagnnya adalah Laba Kotor - Beban Usaha - Biaya Admin - Biaya Non Usaha</p>
            </CardContent>
          </Card>
          <StatCard
            title={`Total Pendapatan (${getTitle()})`}
            value={formatRupiah(stats.totalPendapatan)}
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            description="Dari semua transaksi sukses"
            className="bg-green-50 dark:bg-green-900/20 border-green-200"
          />
          <StatCard
            title={`Laba Kotor (${getTitle()})`}
            value={formatRupiah(stats.labaKotor)}
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            description="Pendapatan - Harga Pokok Penjualan"
            className="bg-green-50 dark:bg-green-900/20 border-green-200"
          />
          <StatCard
            title={`Total Modal Masuk (${getTitle()})`}
            value={formatRupiah(stats.totalModal)}
            icon={<Wallet className="h-4 w-4 text-blue-600" />}
            className="bg-blue-50 dark:bg-blue-900/20 border-blue-200"
          />
          <StatCard
            title={`Beban Usaha (${getTitle()})`}
            value={formatRupiah(stats.totalPengeluaranUsaha)}
            icon={<Receipt className="h-4 w-4 text-amber-600" />}
            className="bg-amber-50 dark:bg-amber-900/20 border-amber-200"
          />
          
          {/* Bagian Rincian Modal Transaksi */}
          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Rincian Modal Terpakai (dari Transaksi)</h3>
          </div>
          <StatCard
            title={`Modal Transaksi via Cash`}
            value={formatRupiah(stats.modalTransaksiCash)}
            icon={<ShoppingCart className="h-4 w-4 text-cyan-600" />}
            className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200"
          />
          <StatCard
            title={`Modal Transaksi via Seabank`}
            value={formatRupiah(stats.modalTransaksiSeabank)}
            icon={<ShoppingCart className="h-4 w-4 text-cyan-600" />}
            className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200"
          />
          <StatCard
            title={`Modal Transaksi via Gopay`}
            value={formatRupiah(stats.modalTransaksiGopay)}
            icon={<ShoppingCart className="h-4 w-4 text-cyan-600" />}
            className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200"
          />
          <StatCard
            title={`Modal Transaksi via IsiPulsa`}
            value={formatRupiah(stats.modalTransaksiAplikasiIsiPulsa)}
            icon={<ShoppingCart className="h-4 w-4 text-cyan-600" />}
            className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200"
          />

          {/* Bagian Rincian Beban Usaha */}
          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Rincian Beban Usaha (dari Pengeluaran)</h3>
          </div>
          <StatCard
            title={`Beban Usaha via Cash`}
            value={formatRupiah(stats.bebanUmumCash)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Usaha via Seabank`}
            value={formatRupiah(stats.bebanUmumSeabank)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Usaha via Gopay`}
            value={formatRupiah(stats.bebanUmumGopay)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Usaha via IsiPulsa`}
            value={formatRupiah(stats.bebanUmumAplikasiIsiPulsa)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          
          {/* Bagian Biaya Admin */}
          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Rincian Biaya Admin Transfer</h3>
          </div>
          <StatCard
            title={`Biaya Admin Cash`}
            value={formatRupiah(stats.biayaAdminCash)}
            icon={<Receipt className="h-4 w-4 text-purple-600" />}
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-200"
          />
          <StatCard
            title={`Biaya Admin Seabank`}
            value={formatRupiah(stats.biayaAdminSeabank)}
            icon={<Receipt className="h-4 w-4 text-purple-600" />}
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-200"
          />
          <StatCard
            title={`Biaya Admin Gopay`}
            value={formatRupiah(stats.biayaAdminGopay)}
            icon={<Receipt className="h-4 w-4 text-purple-600" />}
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-200"
          />
          <StatCard
            title={`Biaya Admin IsiPulsa`}
            value={formatRupiah(stats.biayaAdminAplikasiIsiPulsa)}
            icon={<Receipt className="h-4 w-4 text-purple-600" />}
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-200"
          />

          <Card className="col-span-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-purple-50 dark:bg-purple-900/20 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Total Biaya Admin ({getTitle()})</CardTitle>
              <Receipt className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {formatRupiah(stats.totalBiayaAdmin)}
              </p>
              <p className="text-sm text-muted-foreground">Total biaya admin dari semua transfer</p>
            </CardContent>
          </Card>

          {/* Bagian Biaya Non Usaha */}
          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Biaya Non Usaha & Hutang</h3>
          </div>
          <StatCard
            title={`Biaya Non-Usaha (${getTitle()})`}
            value={formatRupiah(stats.totalPengeluaranNonUsaha)}
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            description="Denda, donasi, kehilangan barang, dll"
            className="bg-amber-50 dark:bg-amber-900/20 border-amber-200"
          />
          <StatCard
            title="Hutang Usaha (Belum Lunas)"
            value={formatRupiah(stats.totalHutangBelumLunasUsaha)}
            icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
            className="bg-red-50 dark:bg-red-900/20 border-red-200"
          />
          <Card className="col-span-full md:col-span-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-red-50 dark:bg-red-900/20 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hutang Aktif (Usaha & Non-Usaha)</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatRupiah(stats.totalHutangBelumLunas)}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Tampilan Laporan Keuangan
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Laporan Keuangan {getTitle()}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLaporanKeuangan()}
              disabled={loadingLaporan}
            >
              {loadingLaporan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memuat...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
          
          {/* Tambahkan pemilihan rentang tanggal */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span>Dari:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2">
              <span>Sampai:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button onClick={fetchLaporanKeuangan} className="md:self-end">
              Terapkan Filter
            </Button>
          </div>
          
          <div className="mb-4">
            <Tabs
              value={reportType}
              onValueChange={(value) => setReportType(value as 'harian' | 'mingguan' | 'bulanan')}
            >
              <TabsList>
                <TabsTrigger value="harian">Harian</TabsTrigger>
                <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {loadingLaporan ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reportType === 'harian' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                    <TableHead className="text-right">Total HPP</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                    <TableHead className="text-right">Beban Usaha</TableHead>
                    <TableHead className="text-right">Biaya Admin</TableHead>
                    <TableHead className="text-right">Biaya Non Usaha</TableHead>
                    <TableHead className="text-right">Laba Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporanHarian.length > 0 ? (
                    laporanHarian.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.tanggal)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_pendapatan)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_hpp)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.laba_kotor)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_beban_usaha)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_admin)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_non_usaha)}</TableCell>
                        <TableCell className={`text-right font-bold ${item.laba_bersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatRupiah(item.laba_bersih)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Tidak ada data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportType === 'mingguan' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                    <TableHead className="text-right">Total HPP</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                    <TableHead className="text-right">Beban Usaha</TableHead>
                    <TableHead className="text-right">Biaya Admin</TableHead>
                    <TableHead className="text-right">Biaya Non Usaha</TableHead>
                    <TableHead className="text-right">Laba Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporanMingguan.length > 0 ? (
                    laporanMingguan.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.minggu_awal)} - {formatDate(item.minggu_akhir)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_pendapatan)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_hpp)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.laba_kotor)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_beban_usaha)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_admin)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_non_usaha)}</TableCell>
                        <TableCell className={`text-right font-bold ${item.laba_bersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatRupiah(item.laba_bersih)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Tidak ada data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                    <TableHead className="text-right">Total HPP</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                    <TableHead className="text-right">Beban Usaha</TableHead>
                    <TableHead className="text-right">Biaya Admin</TableHead>
                    <TableHead className="text-right">Biaya Non Usaha</TableHead>
                    <TableHead className="text-right">Laba Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporanBulanan.length > 0 ? (
                    laporanBulanan.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{getNamaBulan(item.bulan)} {item.tahun}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_pendapatan)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_hpp)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.laba_kotor)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_beban_usaha)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_admin)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_biaya_non_usaha)}</TableCell>
                        <TableCell className={`text-right font-bold ${item.laba_bersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatRupiah(item.laba_bersih)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Tidak ada data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;