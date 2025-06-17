import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/utils';
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
  ShoppingCart // Ikon baru untuk modal transaksi
} from 'lucide-react';

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchDashboardData = async () => {
      setLoading(true);
      const today = new Date();
      let startDate: Date, endDate: Date;

      switch (timeframe) {
        case 'minggu-ini':
          const firstDayOfWeek = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
          startDate = new Date(today.setDate(firstDayOfWeek));
          endDate = new Date();
          break;
        case 'bulan-ini':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date();
          break;
        case 'pilih-bulan':
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0);
          break;
        case 'hari-ini':
        default:
          startDate = new Date();
          endDate = new Date();
          break;
      }
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();

      try {
        const [modalRes, pengeluaranRes, hutangRes, transaksiRes] = await Promise.all([
          supabase.from('modals').select('jumlah').eq('user_id', user.id).gte('tanggal', startDateISO).lte('tanggal', endDateISO),
          supabase.from('pengeluaran').select('jumlah, kategori, sumber_dana').eq('user_id', user.id).gte('tanggal', startDateISO).lte('tanggal', endDateISO),
          supabase.from('hutang').select('jumlah, status, jenis').eq('user_id', user.id).gte('tanggal_hutang', startDateISO).lte('tanggal_hutang', endDateISO),
          supabase.from('transaksi').select('harga_jual, harga_beli, sumber_dana').eq('user_id', user.id).eq('status', 'sukses').gte('created_at', startDateISO).lte('created_at', endDateISO),
        ]);

        if (modalRes.error) throw modalRes.error;
        if (pengeluaranRes.error) throw pengeluaranRes.error;
        if (hutangRes.error) throw hutangRes.error;
        if (transaksiRes.error) throw transaksiRes.error;
        
        // Ambil data modals untuk biaya admin
        const modalsDataRes = await supabase
          .from('modals')
          .select('jumlah, sumber_dana, biaya_admin')
          .eq('user_id', user.id)
          .gte('tanggal', startDateISO)
          .lte('tanggal', endDateISO);
          
        if (modalsDataRes.error) throw modalsDataRes.error;
        const modalsData = modalsDataRes.data || [];
        
        console.log('Modals data for biaya admin:', modalsData);
        const pengeluaranData = pengeluaranRes.data || [];
        const transaksiData = transaksiRes.data || [];

        const totalPendapatan = transaksiData.reduce((sum, item) => sum + item.harga_jual, 0);
        const totalHPP = transaksiData.reduce((sum, item) => sum + item.harga_beli, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const totalPengeluaranUsaha = pengeluaranData.filter(p => p.kategori === 'usaha').reduce((sum, item) => sum + item.jumlah, 0);
        const labaBersih = labaKotor - totalPengeluaranUsaha;
        const totalModal = modalRes.data.reduce((sum, item) => sum + item.jumlah, 0);
        const totalPengeluaranNonUsaha = pengeluaranData.filter(p => p.kategori === 'non_usaha').reduce((sum, item) => sum + item.jumlah, 0);
        const hutangUsahaData = hutangRes.data.filter(item => item.jenis === 'usaha' && item.status === 'belum_lunas');
        const hutangNonUsahaData = hutangRes.data.filter(item => item.jenis === 'non_usaha' && item.status === 'belum_lunas');
        const totalHutangBelumLunasUsaha = hutangUsahaData.reduce((sum, item) => sum + item.jumlah, 0);
        const totalHutangBelumLunasNonUsaha = hutangNonUsahaData.reduce((sum, item) => sum + item.jumlah, 0);

        // --- PERUBAHAN 2: Logika kalkulasi dipecah ---
        
        // Kalkulasi untuk Modal Transaksi (dari tabel 'transaksi')
        const modalTransaksiCash = transaksiData.filter(t => t.sumber_dana === 'cash').reduce((sum, item) => sum + item.harga_beli, 0);
        const modalTransaksiSeabank = transaksiData.filter(t => t.sumber_dana === 'seabank').reduce((sum, item) => sum + item.harga_beli, 0);
        const modalTransaksiGopay = transaksiData.filter(t => t.sumber_dana === 'gopay').reduce((sum, item) => sum + item.harga_beli, 0);
        const modalTransaksiAplikasiIsiPulsa = transaksiData.filter(t => t.sumber_dana === 'aplikasi_isipulsa').reduce((sum, item) => sum + item.harga_beli, 0);

        // Kalkulasi untuk Beban Umum (dari tabel 'pengeluaran')
        const bebanUmumCash = pengeluaranData.filter(p => p.sumber_dana === 'cash').reduce((sum, item) => sum + item.jumlah, 0);
        const bebanUmumSeabank = pengeluaranData.filter(p => p.sumber_dana === 'seabank').reduce((sum, item) => sum + item.jumlah, 0);
        const bebanUmumGopay = pengeluaranData.filter(p => p.sumber_dana === 'gopay').reduce((sum, item) => sum + item.jumlah, 0);
        const bebanUmumAplikasiIsiPulsa = pengeluaranData.filter(p => p.sumber_dana === 'aplikasi_isipulsa').reduce((sum, item) => sum + item.jumlah, 0);


        // Calculate total biaya admin
        const biayaAdminCash = modalsData
          .filter(m => m.sumber_dana === 'cash')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminSeabank = modalsData
          .filter(m => m.sumber_dana === 'seabank')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminGopay = modalsData
          .filter(m => m.sumber_dana === 'gopay')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const biayaAdminAplikasiIsiPulsa = modalsData
          .filter(m => m.sumber_dana === 'aplikasi_isipulsa')
          .reduce((sum, item) => sum + (Number(item.biaya_admin) || 0), 0);

        const totalBiayaAdmin = biayaAdminCash + biayaAdminSeabank + biayaAdminGopay + biayaAdminAplikasiIsiPulsa;

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

      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeframe, selectedMonth, selectedYear, user]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan keuangan usaha Anda</p>
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
      ) : (
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
              <p className="text-sm text-muted-foreground">Laba Kotor dikurangi semua Beban Usaha</p>
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
          
          {/* --- PERUBAHAN 3: Bagian Baru untuk Modal Transaksi --- */}
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

          {/* --- PERUBAHAN 4: Bagian untuk Beban Umum --- */}
          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Rincian Beban Umum (dari Pengeluaran)</h3>
          </div>
          <StatCard
            title={`Beban Umum via Cash`}
            value={formatRupiah(stats.bebanUmumCash)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Umum via Seabank`}
            value={formatRupiah(stats.bebanUmumSeabank)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Umum via Gopay`}
            value={formatRupiah(stats.bebanUmumGopay)}
            icon={<Receipt className="h-4 w-4 text-orange-600" />}
            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200"
          />
          <StatCard
            title={`Beban Umum via IsiPulsa`}
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

          <div className="col-span-full mt-4 mb-2 border-b">
             <h3 className="text-lg font-semibold tracking-tight">Lainnya</h3>
          </div>
          <StatCard
            title={`Beban Non-Usaha (${getTitle()})`}
            value={formatRupiah(stats.totalPengeluaranNonUsaha)}
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
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
      )}
    </div>
  );
};

export default Dashboard;