import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2,
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

// Tipe data untuk statistik
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
          supabase.from('pengeluaran').select('jumlah, kategori').eq('user_id', user.id).gte('tanggal', startDateISO).lte('tanggal', endDateISO),
          supabase.from('hutang').select('jumlah, status, jenis').eq('user_id', user.id).gte('tanggal_hutang', startDateISO).lte('tanggal_hutang', endDateISO),
          supabase.from('transaksi').select('harga_jual, harga_beli').eq('user_id', user.id).eq('status', 'sukses').gte('created_at', startDateISO).lte('created_at', endDateISO),
        ]);

        if (modalRes.error) throw modalRes.error;
        if (pengeluaranRes.error) throw pengeluaranRes.error;
        if (hutangRes.error) throw hutangRes.error;
        if (transaksiRes.error) throw transaksiRes.error;

        const totalPendapatan = transaksiRes.data.reduce((sum, item) => sum + item.harga_jual, 0);
        const totalHPP = transaksiRes.data.reduce((sum, item) => sum + item.harga_beli, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const totalPengeluaranUsaha = pengeluaranRes.data.filter(p => p.kategori === 'usaha').reduce((sum, item) => sum + item.jumlah, 0);
        const labaBersih = labaKotor - totalPengeluaranUsaha;
        const totalModal = modalRes.data.reduce((sum, item) => sum + item.jumlah, 0);
        const totalPengeluaranNonUsaha = pengeluaranRes.data.filter(p => p.kategori === 'non_usaha').reduce((sum, item) => sum + item.jumlah, 0);
        const hutangUsahaData = hutangRes.data.filter(item => item.jenis === 'usaha' && item.status === 'belum_lunas');
        const hutangNonUsahaData = hutangRes.data.filter(item => item.jenis === 'non_usaha' && item.status === 'belum_lunas');
        const totalHutangBelumLunasUsaha = hutangUsahaData.reduce((sum, item) => sum + item.jumlah, 0);
        const totalHutangBelumLunasNonUsaha = hutangNonUsahaData.reduce((sum, item) => sum + item.jumlah, 0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan keuangan usaha Anda</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>Cetak Laporan</Button>
        </div>
      </div>

      <Tabs defaultValue="hari-ini" onValueChange={setTimeframe} value={timeframe}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="hari-ini">Hari Ini</TabsTrigger>
          <TabsTrigger value="minggu-ini">Minggu Ini</TabsTrigger>
          <TabsTrigger value="bulan-ini">Bulan Ini</TabsTrigger>
          <TabsTrigger value="pilih-bulan">Pilih Bulan</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* PERBAIKAN: Kode untuk 'pilih-bulan' dikembalikan */}
      {timeframe === 'pilih-bulan' && (
        <div className="mt-4 flex items-center gap-4">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded-md border p-2 bg-background">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>{new Date(2000, month - 1, 1).toLocaleString('id-ID', { month: 'long' })}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded-md border p-2 bg-background">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={`col-span-full ${stats.labaBersih >= 0 ? 'bg-green-100 dark:bg-green-900/40 border-green-200' : 'bg-red-100 dark:bg-red-900/40 border-red-200'}`}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-base font-semibold">Keuntungan Bersih ({getTitle()})</CardTitle><ShieldCheck className={`h-5 w-5 ${stats.labaBersih >= 0 ? 'text-green-700' : 'text-red-700'}`} /></CardHeader><CardContent><p className="text-4xl font-bold">{formatRupiah(stats.labaBersih)}</p><p className="text-sm text-muted-foreground">Laba Kotor dikurangi semua Beban Usaha</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Modal Masuk ({getTitle()})</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalModal)}</p></CardContent></Card>
          
          <Card className="col-span-1 lg:col-span-2"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Laba Kotor ({getTitle()})</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.labaKotor)}</p><p className="text-xs text-muted-foreground">Pendapatan - Harga Beli</p></CardContent></Card>
          
          
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Beban Usaha ({getTitle()})</CardTitle><Receipt className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalPengeluaranUsaha)}</p></CardContent></Card>
          <Card className="bg-amber-100 dark:bg-amber-900/40 border-amber-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Beban Non-Usaha ({getTitle()})</CardTitle><AlertTriangle className="h-4 w-4 text-amber-700" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalPengeluaranNonUsaha)}</p></CardContent></Card>

          <Card className="col-span-full md:col-span-1 bg-blue-100 dark:bg-blue-900/40 border-blue-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Hutang Belum Lunas (Usaha)</CardTitle><ShieldAlert className="h-4 w-4 text-blue-700" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalHutangBelumLunasUsaha)}</p></CardContent></Card>
          <Card className="col-span-1 lg:col-span-2"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Hutang Aktif</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalHutangBelumLunas)}</p></CardContent></Card>
          <Card className="col-span-1 lg:col-span-4"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pendapatan ({getTitle()})</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{formatRupiah(stats.totalPendapatan)}</p><p className="text-xs text-muted-foreground">Dari semua transaksi sukses</p></CardContent></Card>
          
        </div>
      )}
    </div>
  );
};

export default Dashboard;
