import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import logo from '@/assets/mantabjo-merpati.png';

// --- Tipe Data yang Diperbarui ---
export interface LabaRugiData {
  totalPendapatan: number;
  totalHPP: number;
  labaKotor: number;
  totalBebanUsaha: number;
  totalBiayaAdmin: number;
  totalBiayaNonUsaha: number;
  labaBersih: number;
  detailPendapatan: any[];
  detailHPP: any[];
  detailBebanUsaha: any[];
  detailBiayaAdmin: BiayaAdminDetail[];
  detailBiayaNonUsaha: any[];
}

// Interface untuk biaya admin berdasarkan sumber dana
interface BiayaAdminDetail {
  sumber_dana: string;
  biaya_admin: number;
}

interface BiayaAdminBySumberDana {
  [sumberDana: string]: number;
}

export interface ArusKasData {
  operasi: {
    penerimaanPelanggan: number;
    pembayaranHPP: number;
    pembayaranBeban: number;
    pembayaranBiayaAdmin: number;
  };
  pendanaan: {
    setoranModal: number;
    bebanNonUsaha: number;
    pemberianPinjaman: number;
    penerimaanPinjaman: number;
  };
  arusKasOperasiBersih: number;
  arusKasPendanaanBersih: number;
  kenaikanKasBersih: number;
}


// --- Fungsi PDF ---

const addHeader = (doc: jsPDF, title: string, periode: string) => {
  doc.addImage(logo, 'PNG', 14, 8, 30, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Aplikasi MantabJo', 60, 18);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 60, 25);
  doc.setFontSize(10);
  doc.text(periode, 60, 30);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);
};

const generateLabaRugiPDF = (report: { data: LabaRugiData; periode: string }) => {
  const { data, periode } = report;
  const doc = new jsPDF();
  addHeader(doc, 'Laporan Laba Rugi', periode);

  const body = [
    ['Pendapatan', '', ''],
    ...data.detailPendapatan.map(item => [`  - ${item.jenis_transaksi}`, formatRupiah(item.harga_jual), '']),
    [{ content: 'Total Pendapatan', styles: { fontStyle: 'bold' as 'bold' } }, '', formatRupiah(data.totalPendapatan)],
    ['', '', ''],
    ['Harga Pokok Penjualan (HPP)', '', ''],
    ...data.detailHPP.map(item => [`  - Modal ${item.jenis_transaksi}`, `(${formatRupiah(item.harga_beli)})`, '']),
    [{ content: 'Total HPP', styles: { fontStyle: 'bold' as 'bold' } }, '', `(${formatRupiah(data.totalHPP)})`],
    ['', '', ''],
    [{ content: 'Laba Kotor', styles: { fontStyle: 'bold' as 'bold', fillColor: '#f0f0f0' } }, '', { content: formatRupiah(data.labaKotor), styles: { fontStyle: 'bold' as 'bold' } }],
    ['', '', ''],
    ['Beban Operasional', '', ''],
    ...data.detailBebanUsaha.map(item => [`  - ${item.keterangan}`, `(${formatRupiah(item.jumlah)})`, '']),
    [{ content: 'Total Beban Operasional', styles: { fontStyle: 'bold' as 'bold' } }, '', `(${formatRupiah(data.totalBebanUsaha)})`],
    ['', '', ''],
    ['Biaya Admin Transfer', '', ''],
    ...data.detailBiayaAdmin.map(item => [`  - Biaya Admin ${item.sumber_dana}`, `(${formatRupiah(item.biaya_admin)})`, '']),
    [{ content: 'Total Biaya Admin', styles: { fontStyle: 'bold' as 'bold' } }, '', `(${formatRupiah(data.totalBiayaAdmin)})`],
    ['', '', ''],
    ['Biaya Non Usaha', '', ''],
    ...data.detailBiayaNonUsaha.map(item => [`  - ${item.keterangan || 'Biaya Non Usaha'}`, `(${formatRupiah(item.jumlah)})`, '']),
    [{ content: 'Total Biaya Non Usaha', styles: { fontStyle: 'bold' as 'bold' } }, '', `(${formatRupiah(data.totalBiayaNonUsaha)})`],
    ['', '', ''],
    [{ content: 'Laba Bersih', styles: { fontStyle: 'bold' as 'bold', fillColor: data.labaBersih >= 0 ? '#d4edda' : '#f8d7da' } }, '', { content: formatRupiah(data.labaBersih), styles: { fontStyle: 'bold' as 'bold' } }]
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [['Deskripsi', 'Jumlah', 'Total']],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: '#333', textColor: '#fff' },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 40, halign: 'right' } }
  });

  doc.save(`Laporan_Laba_Rugi_${periode.replace(/\s/g, '_')}.pdf`);
};

const generateArusKasPDF = (report: { data: ArusKasData; periode: string }) => {
    const { data, periode } = report;
    const doc = new jsPDF();
    addHeader(doc, 'Laporan Arus Kas', periode);
  
    const body = [
      [{ content: 'Arus Kas dari Aktivitas Operasi', colSpan: 3, styles: { fontStyle: 'bold' as 'bold', fillColor: '#f0f0f0' } }],
      ['Penerimaan dari Pelanggan', formatRupiah(data.operasi.penerimaanPelanggan), ''],
      ['Pembayaran HPP', `(${formatRupiah(data.operasi.pembayaranHPP)})`, ''],
      ['Pembayaran Beban Operasional', `(${formatRupiah(data.operasi.pembayaranBeban)})`, ''],
      ['Pembayaran Biaya Admin', `(${formatRupiah(data.operasi.pembayaranBiayaAdmin)})`, ''],
      [{ content: 'Arus Kas Bersih dari Operasi', styles: { fontStyle: 'bold' as 'bold' } }, '', { content: formatRupiah(data.arusKasOperasiBersih), styles: { fontStyle: 'bold' as 'bold' } }],
      ['', '', ''],
      [{ content: 'Arus Kas dari Aktivitas Investasi', colSpan: 3, styles: { fontStyle: 'bold' as 'bold', fillColor: '#f0f0f0' } }],
      [{ content: 'Arus Kas Bersih dari Investasi', styles: { fontStyle: 'bold' as 'bold' } }, '', { content: formatRupiah(0), styles: { fontStyle: 'bold' as 'bold' } }],
      ['', '', ''],
      [{ content: 'Arus Kas dari Aktivitas Pendanaan', colSpan: 3, styles: { fontStyle: 'bold' as 'bold', fillColor: '#f0f0f0' } }],
      ['Setoran Modal', formatRupiah(data.pendanaan.setoranModal), ''],
      ['Beban Non-Usaha (Prive)', `(${formatRupiah(data.pendanaan.bebanNonUsaha)})`, ''],
      ['Pemberian Pinjaman', `(${formatRupiah(data.pendanaan.pemberianPinjaman)})`, ''],
      ['Penerimaan Pembayaran Hutang', formatRupiah(data.pendanaan.penerimaanPinjaman), ''],
      [{ content: 'Arus Kas Bersih dari Pendanaan', styles: { fontStyle: 'bold' as 'bold' } }, '', { content: formatRupiah(data.arusKasPendanaanBersih), styles: { fontStyle: 'bold' as 'bold' } }],
      ['', '', ''],
      [{ content: 'Kenaikan (Penurunan) Kas Bersih', styles: { fontStyle: 'bold' as 'bold', fillColor: '#f0f0f0' } }, '', { content: formatRupiah(data.kenaikanKasBersih), styles: { fontStyle: 'bold' as 'bold' } }],
    ];
  
    autoTable(doc, {
        startY: 45,
        head: [['Deskripsi', 'Jumlah', 'Total']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: '#333', textColor: '#fff' },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 40, halign: 'right' } }
    });
  
    doc.save(`Laporan_Arus_Kas_${periode.replace(/\s/g, '_')}.pdf`);
};


// --- Komponen Utama Halaman Laporan ---
const Laporan = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'laba-rugi' | 'arus-kas'>('laba-rugi');
  const [labaRugiData, setLabaRugiData] = useState<LabaRugiData | null>(null);
  const [arusKasData, setArusKasData] = useState<ArusKasData | null>(null);
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
    setLabaRugiData(null); 
    setArusKasData(null);

    const startDate = new Date(dateRange.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    try {
      if (reportType === 'laba-rugi') {
        // Mengambil data transaksi
        const { data: transaksiData, error: trxErr } = await supabase.from('transaksi')
            .select('harga_jual, harga_beli, jenis_transaksi, created_at, status, sumber_dana')
            .eq('user_id', user.id).eq('status', 'sukses')
            .gte('created_at', startDateISO).lte('created_at', endDateISO);
        if (trxErr) throw trxErr;

        // Mengambil data pengeluaran usaha
        const { data: pengeluaranUsahaData, error: pengUsahaErr } = await supabase.from('pengeluaran')
            .select('jumlah, keterangan, tanggal, kategori, sumber_dana')
            .eq('user_id', user.id).eq('kategori', 'usaha')
            .gte('tanggal', startDateISO).lte('tanggal', endDateISO);
        if (pengUsahaErr) throw pengUsahaErr;
        
        // Mengambil data pengeluaran non usaha
        const { data: pengeluaranNonUsahaData, error: pengNonUsahaErr } = await supabase.from('pengeluaran')
            .select('jumlah, keterangan, tanggal, kategori, sumber_dana')
            .eq('user_id', user.id).eq('kategori', 'non_usaha')
            .gte('tanggal', startDateISO).lte('tanggal', endDateISO);
        if (pengNonUsahaErr) throw pengNonUsahaErr;
        
        // Mengambil data biaya admin
        const { data: modalsData, error: modalsErr } = await supabase.from('modals')
            .select('jumlah, sumber_dana, biaya_admin, tanggal')
            .eq('user_id', user.id)
            .gte('tanggal', startDateISO).lte('tanggal', endDateISO);
        if (modalsErr) throw modalsErr;
        
        // Perhitungan total pendapatan dan HPP
        const totalPendapatan = transaksiData.reduce((sum, item) => sum + item.harga_jual, 0);
        const totalHPP = transaksiData.reduce((sum, item) => sum + item.harga_beli, 0);
        const labaKotor = totalPendapatan - totalHPP;
        
        // Perhitungan beban usaha
        const totalBebanUsaha = pengeluaranUsahaData.reduce((sum, item) => sum + item.jumlah, 0);
        
        // Perhitungan biaya admin
        const biayaAdminDetails: BiayaAdminDetail[] = [];
        let totalBiayaAdmin = 0;
        
        // Mengelompokkan biaya admin berdasarkan sumber dana
        const biayaAdminBySumberDana: BiayaAdminBySumberDana = {};
        modalsData.forEach(item => {
          const sumberDana = item.sumber_dana;
          const biayaAdmin = Number(item.biaya_admin) || 0;
          
          if (!biayaAdminBySumberDana[sumberDana]) {
            biayaAdminBySumberDana[sumberDana] = 0;
          }
          
          biayaAdminBySumberDana[sumberDana] += biayaAdmin;
          totalBiayaAdmin += biayaAdmin;
        });
        
        // Membuat detail biaya admin
        Object.keys(biayaAdminBySumberDana).forEach(sumberDana => {
          biayaAdminDetails.push({
            sumber_dana: sumberDana,
            biaya_admin: biayaAdminBySumberDana[sumberDana]
          });
        });
        
        // Perhitungan biaya non usaha
        const totalBiayaNonUsaha = pengeluaranNonUsahaData.reduce((sum, item) => sum + item.jumlah, 0);
        
        // Perhitungan laba bersih
        const labaBersih = labaKotor - totalBebanUsaha - totalBiayaAdmin - totalBiayaNonUsaha;

        setLabaRugiData({
            totalPendapatan, 
            totalHPP, 
            labaKotor, 
            totalBebanUsaha, 
            totalBiayaAdmin,
            totalBiayaNonUsaha,
            labaBersih,
            detailPendapatan: transaksiData,
            detailHPP: transaksiData,
            detailBebanUsaha: pengeluaranUsahaData,
            detailBiayaAdmin: biayaAdminDetails,
            detailBiayaNonUsaha: pengeluaranNonUsahaData
        });
      } else if (reportType === 'arus-kas') {
        const [transaksiRes, pengeluaranRes, modalRes, hutangRes] = await Promise.all([
            supabase.from('transaksi').select('harga_jual, harga_beli').eq('user_id', user.id).eq('status', 'sukses').gte('created_at', startDateISO).lte('created_at', endDateISO),
            supabase.from('pengeluaran').select('jumlah, kategori').eq('user_id', user.id).gte('tanggal', startDateISO).lte('tanggal', endDateISO),
            supabase.from('modals').select('jumlah, biaya_admin').eq('user_id', user.id).gte('tanggal', startDateISO).lte('tanggal', endDateISO),
            supabase.from('hutang').select('jumlah, status, jenis, tanggal_lunas, tanggal_hutang').eq('user_id', user.id),
        ]);
        
        const penerimaanPelanggan = transaksiRes.data?.reduce((sum, t) => sum + t.harga_jual, 0) || 0;
        const pembayaranHPP = transaksiRes.data?.reduce((sum, t) => sum + t.harga_beli, 0) || 0;
        const pembayaranBeban = pengeluaranRes.data?.filter(p => p.kategori === 'usaha').reduce((sum, p) => sum + p.jumlah, 0) || 0;
        const pembayaranBiayaAdmin = modalRes.data?.reduce((sum, m) => sum + (Number(m.biaya_admin) || 0), 0) || 0;
        const arusKasOperasiBersih = penerimaanPelanggan - pembayaranHPP - pembayaranBeban - pembayaranBiayaAdmin;

        const setoranModal = modalRes.data?.reduce((sum, m) => sum + m.jumlah, 0) || 0;
        const bebanNonUsaha = pengeluaranRes.data?.filter(p => p.kategori === 'non_usaha').reduce((sum, p) => sum + p.jumlah, 0) || 0;
        const pemberianPinjaman = hutangRes.data?.filter(h => new Date(h.tanggal_hutang) >= startDate && new Date(h.tanggal_hutang) <= endDate).reduce((sum, h) => sum + h.jumlah, 0) || 0;
        const penerimaanPinjaman = hutangRes.data?.filter(h => h.status === 'lunas' && h.tanggal_lunas && new Date(h.tanggal_lunas) >= startDate && new Date(h.tanggal_lunas) <= endDate).reduce((sum, h) => sum + h.jumlah, 0) || 0;
        const arusKasPendanaanBersih = setoranModal + penerimaanPinjaman - bebanNonUsaha - pemberianPinjaman;

        setArusKasData({
          operasi: { penerimaanPelanggan, pembayaranHPP, pembayaranBeban, pembayaranBiayaAdmin },
          pendanaan: { setoranModal, bebanNonUsaha, pemberianPinjaman, penerimaanPinjaman },
          arusKasOperasiBersih,
          arusKasPendanaanBersih,
          kenaikanKasBersih: arusKasOperasiBersih + arusKasPendanaanBersih
        });
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({ title: 'Error', description: 'Gagal membuat laporan: ' + error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrintReport = () => {
    const periode = `Periode: ${formatTanggal(dateRange.startDate)} - ${formatTanggal(dateRange.endDate)}`;
    if (reportType === 'laba-rugi' && labaRugiData) {
        generateLabaRugiPDF({ data: labaRugiData, periode });
    } else if (reportType === 'arus-kas' && arusKasData) {
        generateArusKasPDF({ data: arusKasData, periode });
    } else {
        toast({ title: 'Info', description: 'Tampilkan laporan terlebih dahulu sebelum mencetak.', variant: 'default' });
    }
  }

  const renderLabaRugiReport = () => (
    labaRugiData && (
        <Card className="shadow-lg">
            <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                    <CardTitle className="text-gray-900">Hasil Laporan Laba Rugi</CardTitle>
                    <CardDescription className="text-gray-600">{`Periode: ${formatTanggal(dateRange.startDate)} - ${formatTanggal(dateRange.endDate)}`}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-gray-900'>Total Pendapatan</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold text-gray-900'>{formatRupiah(labaRugiData.totalPendapatan)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-gray-900'>Laba Kotor</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold text-gray-900'>{formatRupiah(labaRugiData.labaKotor)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-gray-900'>Total Beban Usaha</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold text-gray-900'>{formatRupiah(labaRugiData.totalBebanUsaha)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-gray-900'>Total Biaya Admin</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold text-gray-900'>{formatRupiah(labaRugiData.totalBiayaAdmin)}</p></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-gray-900'>Total Biaya Non Usaha</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold text-gray-900'>{formatRupiah(labaRugiData.totalBiayaNonUsaha)}</p></CardContent></Card>
                    <Card className={labaRugiData.labaBersih >= 0 ? 'bg-green-50 col-span-3' : 'bg-red-50 col-span-3'}>
                        <CardHeader className='pb-2'><CardTitle className={`text-sm font-medium ${labaRugiData.labaBersih >= 0 ? 'text-green-900' : 'text-red-900'}`}>Laba Bersih</CardTitle></CardHeader>
                        <CardContent><p className={`text-2xl font-bold ${labaRugiData.labaBersih >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatRupiah(labaRugiData.labaBersih)}</p></CardContent>
                    </Card>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="details">
                    <AccordionTrigger className="text-sm text-gray-800 hover:no-underline">Lihat Rincian Laporan</AccordionTrigger>
                    <AccordionContent className="grid gap-6 md:grid-cols-2 pt-2">
                       <div>
                         <h3 className="font-semibold mb-2 text-gray-900">Rincian Pendapatan ({labaRugiData.detailPendapatan.length})</h3>
                         {labaRugiData.detailPendapatan.map((item, idx) => <div key={idx} className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>{item.jenis_transaksi}</span><span className='text-gray-900 font-medium'>{formatRupiah(item.harga_jual)}</span></div>)}
                       </div>
                       <div>
                         <h3 className="font-semibold mb-2 text-gray-900">Rincian Beban ({labaRugiData.detailHPP.length + labaRugiData.detailBebanUsaha.length + labaRugiData.detailBiayaAdmin.length + labaRugiData.detailBiayaNonUsaha.length})</h3>
                         <p className='text-xs font-bold text-gray-700 mb-1'>Harga Pokok Penjualan</p>
                         {labaRugiData.detailHPP.map((item, idx) => <div key={idx} className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Modal {item.jenis_transaksi}</span><span className='text-gray-900 font-medium'>{formatRupiah(item.harga_beli)}</span></div>)}
                         <p className='text-xs font-bold text-gray-700 mt-2 mb-1'>Beban Operasional</p>
                         {labaRugiData.detailBebanUsaha.map((item, idx) => <div key={idx} className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>{item.keterangan}</span><span className='text-gray-900 font-medium'>{formatRupiah(item.jumlah)}</span></div>)}
                         <p className='text-xs font-bold text-gray-700 mt-2 mb-1'>Biaya Admin Transfer</p>
                         {labaRugiData.detailBiayaAdmin.map((item, idx) => <div key={idx} className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Biaya Admin {item.sumber_dana}</span><span className='text-gray-900 font-medium'>{formatRupiah(item.biaya_admin)}</span></div>)}
                         <p className='text-xs font-bold text-gray-700 mt-2 mb-1'>Biaya Non Usaha</p>
                         {labaRugiData.detailBiayaNonUsaha.map((item, idx) => <div key={idx} className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>{item.keterangan || 'Biaya Non Usaha'}</span><span className='text-gray-900 font-medium'>{formatRupiah(item.jumlah)}</span></div>)}
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
  );
  
  const renderArusKasReport = () => (
    arusKasData && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-gray-900">Hasil Laporan Arus Kas</CardTitle>
                <CardDescription className="text-gray-600">{`Periode: ${formatTanggal(dateRange.startDate)} - ${formatTanggal(dateRange.endDate)}`}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Card className={arusKasData.kenaikanKasBersih >= 0 ? 'bg-green-50' : 'bg-red-50'}>
                    <CardHeader className='pb-2'><CardTitle className={`text-sm font-medium ${arusKasData.kenaikanKasBersih >= 0 ? 'text-green-900' : 'text-red-900'}`}>Perubahan Kas Bersih</CardTitle></CardHeader>
                    <CardContent><p className={`text-2xl font-bold ${arusKasData.kenaikanKasBersih >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatRupiah(arusKasData.kenaikanKasBersih)}</p></CardContent>
                </Card>
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Arus Kas Masuk</h3>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Penerimaan dari Pelanggan</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.operasi.penerimaanPelanggan)}</span></div>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Setoran Modal</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.pendanaan.setoranModal)}</span></div>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Penerimaan Pembayaran Hutang</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.pendanaan.penerimaanPinjaman)}</span></div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Arus Kas Keluar</h3>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Pembayaran HPP</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.operasi.pembayaranHPP)}</span></div>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Pembayaran Beban Operasional</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.operasi.pembayaranBeban)}</span></div>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Beban Non-Usaha (Prive)</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.pendanaan.bebanNonUsaha)}</span></div>
                        <div className="flex justify-between text-sm border-b py-1"><span className='text-gray-800'>Pemberian Pinjaman</span><span className='text-gray-900 font-medium'>{formatRupiah(arusKasData.pendanaan.pemberianPinjaman)}</span></div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-pink-700">Pusat Laporan</h2>
            <p className="text-gray-600">Analisis performa keuangan usaha Anda secara komprehensif.</p>
          </div>
          <Button onClick={handlePrintReport} disabled={loading || (!labaRugiData && !arusKasData)} className="bg-pink-600 text-white hover:bg-pink-700">
              Cetak PDF
          </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900">Buat Laporan Baru</CardTitle>
          <CardDescription className="text-gray-600">Pilih jenis laporan dan rentang tanggal yang diinginkan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
              <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-pink-100/60 p-1 h-auto rounded-lg">
                  <TabsTrigger value="laba-rugi" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700">Laporan Laba Rugi</TabsTrigger>
                  <TabsTrigger value="arus-kas" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700">Laporan Arus Kas</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-gray-800">Tanggal Mulai</Label>
                  <Input id="startDate" type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="text-gray-900"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-gray-800">Tanggal Akhir</Label>
                  <Input id="endDate" type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="text-gray-900"/>
                </div>
              </div>
              <Button onClick={handleGenerateReport} disabled={loading} className="w-full bg-pink-600 text-white hover:bg-pink-700">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses Laporan...' : 'Tampilkan Laporan'}
              </Button>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-pink-600"/></div>
      ) : (
        <div className="mt-6">
            {reportType === 'laba-rugi' ? renderLabaRugiReport() : renderArusKasReport()}
        </div>
      )}
    </div>
  );
};

export default Laporan;