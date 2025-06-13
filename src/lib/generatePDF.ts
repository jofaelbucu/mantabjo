import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Pastikan Anda sudah menginstal ini: npm install jspdf jspdf-autotable
import { formatRupiah, formatTanggal } from './utils';

// Tipe data ini harus cocok dengan yang ada di komponen Laporan.tsx
interface LabaRugiData {
  totalPendapatan: number;
  totalHPP: number;
  labaKotor: number;
  totalBeban: number;
  labaBersih: number;
  detailPendapatan: any[];
  detailBeban: any[];
}

interface GenerateLabaRugiPDFProps {
  data: LabaRugiData;
  periode: string;
}

// Deklarasikan tipe tambahan untuk autoTable pada jsPDF
// Ini penting agar TypeScript tidak error saat memanggil doc.autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Ini adalah fungsi yang dibutuhkan oleh Laporan.tsx
export const generateLabaRugiPDF = ({ data, periode }: GenerateLabaRugiPDFProps) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let y = 15; // Posisi Y awal

  // --- Header ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Laba Rugi', 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(periode, 105, y, { align: 'center' });
  y += 10;

  // --- Ringkasan Laba Rugi ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Keuangan', 14, y);
  y += 7;

  const summaryBody = [
    ['Total Pendapatan (A)', formatRupiah(data.totalPendapatan)],
    ['Total Harga Pokok Penjualan (HPP) (B)', formatRupiah(data.totalHPP)],
    [{ content: 'Laba Kotor (A - B)', styles: { fontStyle: 'bold' } }, { content: formatRupiah(data.labaKotor), styles: { fontStyle: 'bold' } }],
    ['Total Beban Operasional (C)', formatRupiah(data.totalBeban)],
  ];

  doc.autoTable({
    startY: y,
    head: [['Deskripsi', 'Jumlah']],
    body: summaryBody,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80] }, // Warna header (biru gelap)
    footStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
    foot: [
      ['Laba Bersih (Laba Kotor - C)', { content: formatRupiah(data.labaBersih), styles: { halign: 'right' } }]
    ],
    didDrawPage: (hookData: any) => { y = hookData.cursor.y + 10; } // Update posisi y setelah tabel
  });

  // --- Rincian Pendapatan (dari tabel transaksi) ---
  if (data.detailPendapatan.length > 0) {
    if (y > pageHeight - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rincian Pendapatan', 14, y);
    y += 7;

    const pendapatanColumns = [
        { header: 'Tanggal', dataKey: 'tanggal_transaksi' },
        { header: 'Jenis', dataKey: 'jenis_transaksi' },
        { header: 'Harga Jual', dataKey: 'harga_jual' }
    ];
    const pendapatanBody = data.detailPendapatan.map(item => ({
        ...item,
        tanggal_transaksi: formatTanggal(item.tanggal_transaksi),
        harga_jual: formatRupiah(item.harga_jual)
    }));

    doc.autoTable({
      startY: y,
      columns: pendapatanColumns,
      body: pendapatanBody,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] }, // Warna hijau
      didDrawPage: (hookData: any) => { y = hookData.cursor.y + 10; }
    });
  }

  // --- Rincian Beban (gabungan HPP dan Pengeluaran) ---
   if (y > pageHeight - 40) { doc.addPage(); y = 20; }
   doc.setFontSize(14);
   doc.setFont('helvetica', 'bold');
   doc.text('Rincian Beban', 14, y);
   y += 7;

   // HPP dari transaksi
   const hppDetail = data.detailPendapatan.map(item => ({
       tanggal: formatTanggal(item.tanggal_transaksi),
       keterangan: `HPP untuk ${item.jenis_transaksi}`,
       jumlah: formatRupiah(item.harga_beli),
       kategori: 'HPP'
   }));

   // Beban Operasional dari pengeluaran
   const bebanDetail = data.detailBeban.map(item => ({
       tanggal: formatTanggal(item.tanggal),
       keterangan: item.keterangan || 'Tidak ada keterangan',
       jumlah: formatRupiah(item.jumlah),
       kategori: item.kategori || 'Lain-lain'
   }));
   
   const allBeban = [...hppDetail, ...bebanDetail];

   if (allBeban.length > 0) {
     doc.autoTable({
       startY: y,
       head: [['Tanggal', 'Kategori', 'Keterangan Beban', 'Jumlah']],
       body: allBeban.map(item => [item.tanggal, item.kategori, item.keterangan, item.jumlah]),
       theme: 'striped',
       headStyles: { fillColor: [192, 57, 43] }, // Warna merah
       didDrawPage: (hookData: any) => { y = hookData.cursor.y + 10; }
     });
   }

  // --- Simpan PDF ---
  const tanggalLaporan = new Date().toISOString().split('T')[0];
  doc.save(`laporan-laba-rugi-${tanggalLaporan}.pdf`);
};
