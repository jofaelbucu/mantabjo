import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { generateLabaRugiPDF } from '@/lib/generatePDF';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Tipe data untuk hasil laporan laba rugi
interface LabaRugiData {
  totalPendapatan: number;
  totalHPP: number;
  labaKotor: number;
  totalBeban: number;
  labaBersih: number;
  detailPendapatan: any[];
  detailBeban: any[];
}

const Laporan = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<LabaRugiData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!user) {
        toast({ title: 'Error', description: 'Anda harus login untuk membuat laporan.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    setReportData(null); 
    try {
        // PERBAIKAN: Atur waktu pada tanggal untuk memastikan semua data dalam satu hari terambil
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        // 1. Ambil data transaksi yang statusnya 'sukses'
        const { data: transaksiData, error: transaksiError } = await supabase
            .from('transaksi')
            .select('harga_jual, harga_beli, jenis_transaksi, tanggal_transaksi, status')
            .eq('user_id', user.id)
            .eq('status', 'sukses') // Tetap filter untuk 'sukses' karena ini adalah laporan laba rugi
            .gte('tanggal_transaksi', startDate.toISOString())
            .lte('tanggal_transaksi', endDate.toISOString());

        if (transaksiError) throw transaksiError;

        // 2. Ambil data pengeluaran dengan kategori 'usaha' untuk beban
        const { data: pengeluaranData, error: pengeluaranError } = await supabase
            .from('pengeluaran')
            .select('jumlah, keterangan, tanggal, kategori')
            .eq('user_id', user.id)
            .eq('kategori', 'usaha') // PERBAIKAN: Hanya hitung beban yang relevan dengan usaha
            .gte('tanggal', startDate.toISOString())
            .lte('tanggal', endDate.toISOString());
        
        if (pengeluaranError) throw pengeluaranError;
        
        // 3. Kalkulasi Laba Rugi
        const totalPendapatan = transaksiData.reduce((sum, item) => sum + item.harga_jual, 0);
        const totalHPP = transaksiData.reduce((sum, item) => sum + item.harga_beli, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const totalBeban = pengeluaranData.reduce((sum, item) => sum + item.jumlah, 0);
        const labaBersih = labaKotor - totalBeban;

        setReportData({
            totalPendapatan,
            totalHPP,
            labaKotor,
            totalBeban,
            labaBersih,
            detailPendapatan: transaksiData,
            detailBeban: pengeluaranData
        });

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({ title: 'Error', description: 'Gagal membuat laporan: ' + error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrintReport = () => {
    if (reportData) {
        generateLabaRugiPDF({
            data: reportData,
            periode: `Periode: ${formatTanggal(dateRange.startDate)} - ${formatTanggal(dateRange.endDate)}`,
        });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Laporan Laba Rugi</h2>
        <p className="text-muted-foreground">Analisis performa keuangan usaha Anda dalam satu laporan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>Pilih rentang tanggal untuk melihat laporan laba rugi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input id="startDate" type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Akhir</Label>
                <Input id="endDate" type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Memproses...' : 'Tampilkan Laporan'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData && (
        <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                    <CardTitle>Hasil Laporan Laba Rugi</CardTitle>
                    <CardDescription>{`Periode: ${formatTanggal(dateRange.startDate)} - ${formatTanggal(dateRange.endDate)}`}</CardDescription>
                </div>
                <Button onClick={handlePrintReport} disabled={reportData.totalPendapatan === 0}>Cetak PDF</Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* PERBAIKAN: Pesan informatif jika data 0 */}
                {reportData.totalPendapatan === 0 && (
                    <div className='text-center py-6 bg-yellow-50 border border-yellow-200 rounded-lg'>
                        <p className='font-semibold'>Tidak Ada Pendapatan Ditemukan</p>
                        <p className='text-sm text-muted-foreground mt-1'>Pastikan ada transaksi dengan status 'sukses' pada periode yang dipilih.</p>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Total Pendapatan</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{formatRupiah(reportData.totalPendapatan)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Laba Kotor</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{formatRupiah(reportData.labaKotor)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Total Beban Operasional</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{formatRupiah(reportData.totalBeban)}</p></CardContent></Card>
                    <Card className={reportData.labaBersih >= 0 ? 'bg-green-50' : 'bg-red-50'}><CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Laba Bersih</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{formatRupiah(reportData.labaBersih)}</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Laporan;
