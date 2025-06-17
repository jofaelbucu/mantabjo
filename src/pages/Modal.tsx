import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { NumericFormat } from 'react-number-format';
// --- PERUBAHAN: Impor ikon Trash2 untuk tombol hapus ---
import { Loader2, Wallet, Landmark, CreditCard, Smartphone, TrendingDown, TrendingUp, PlusCircle, Trash2, Receipt, Pencil } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// --- PERUBAHAN: Impor AlertDialog untuk konfirmasi hapus ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRightLeft } from 'lucide-react';

const modalSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah modal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  keterangan: z.string().optional(),
  sumber_dana: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
});
type ModalFormValues = z.infer<typeof modalSchema>;

// --- PERUBAHAN: Tambahkan `detailModals` ke tipe data saldo ---
type SaldoSumberDana = {
  nama: 'cash' | 'seabank' | 'gopay' | 'aplikasi_isipulsa';
  label: string;
  icon: React.ElementType;
  modalAwal: number;
  terpakai: number;
  sisa: number;
  biaya_admin: number;
  detailModals: any[]; // Untuk menyimpan riwayat setoran
};

const transferModalSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah transfer harus lebih dari 0'),
  biaya_admin: z.number().min(0, 'Biaya admin tidak boleh negatif'),
  dari_sumber: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
  ke_sumber: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
});

type TransferModalFormValues = z.infer<typeof transferModalSchema>;

const Modal = () => {
  const { user } = useAuth();
  const [saldos, setSaldos] = useState<SaldoSumberDana[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState<any>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const sumberDanaOptions = [
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'seabank', label: 'Seabank', icon: Landmark },
    { id: 'gopay', label: 'Gopay', icon: CreditCard },
    { id: 'aplikasi_isipulsa', label: 'Aplikasi IsiPulsa', icon: Smartphone },
  ];

  const { control, handleSubmit, reset, setValue } = useForm<ModalFormValues>({
    resolver: zodResolver(modalSchema),
    defaultValues: {
      jumlah: 0,
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
      sumber_dana: 'cash',
    },
  });

  const { control: transferControl, handleSubmit: handleTransferSubmit, reset: resetTransfer, watch: watchTransfer } = useForm<TransferModalFormValues>({
    resolver: zodResolver(transferModalSchema),
    defaultValues: {
      jumlah: 0,
      dari_sumber: 'cash',
      ke_sumber: 'seabank',
      keterangan: '',
    },
  });

  const dariSumber = watchTransfer('dari_sumber');
  const keSumber = watchTransfer('ke_sumber');

  const openTransferDialog = () => {
    resetTransfer({
      jumlah: 0,
      dari_sumber: 'cash',
      ke_sumber: 'seabank',
      biaya_admin: 0,
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsTransferDialogOpen(true);
  };

  const onTransferSubmit = async (values: TransferModalFormValues) => {
    if (values.dari_sumber === values.ke_sumber) {
      toast({
        title: 'Error',
        description: 'Sumber dana asal dan tujuan tidak boleh sama',
        variant: 'destructive'
      });
      return;
    }

    const saldoAsal = saldos.find(s => s.nama === values.dari_sumber);
    if (!saldoAsal || saldoAsal.sisa < values.jumlah) {
      toast({
        title: 'Error',
        description: 'Saldo tidak mencukupi untuk transfer',
        variant: 'destructive'
      });
      return;
    }

    setIsTransferSubmitting(true);
    if (!user) return;

    try {
      // Kurangi saldo sumber asal (termasuk biaya admin)
      const { error: errorKurang } = await supabase.from('modals').insert({
        jumlah: -(values.jumlah + Number(values.biaya_admin)),
        tanggal: values.tanggal,
        keterangan: `Transfer ke ${sumberDanaOptions.find(s => s.id === values.ke_sumber)?.label} - ${values.keterangan || ''} (Biaya Admin: ${formatRupiah(values.biaya_admin)})`,
        sumber_dana: values.dari_sumber,
        user_id: user.id,
        biaya_admin: Number(values.biaya_admin)
      });

      if (errorKurang) throw errorKurang;

      // Tambah saldo sumber tujuan
      const { error: errorTambah } = await supabase.from('modals').insert({
        jumlah: values.jumlah,
        tanggal: values.tanggal,
        keterangan: `Transfer dari ${sumberDanaOptions.find(s => s.id === values.dari_sumber)?.label} - ${values.keterangan || ''}`,
        sumber_dana: values.ke_sumber,
        user_id: user.id,
      });

      if (errorTambah) throw errorTambah;
      
      toast({ title: 'Berhasil', description: `Transfer modal berhasil dilakukan.` });
      setIsTransferDialogOpen(false);
      fetchSaldos();

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSaldos();
    }
  }, [user]);

  const fetchSaldos = async () => {
    setLoading(true);
    if (!user) return;

    try {
      // --- PERUBAHAN: Ambil semua kolom dari tabel modals ---
      const [modalsRes, pengeluaranRes, transaksiRes] = await Promise.all([
        supabase.from('modals').select('*').eq('user_id', user.id),
        supabase.from('pengeluaran').select('jumlah, sumber_dana').eq('user_id', user.id),
        supabase.from('transaksi').select('harga_beli, sumber_dana').eq('user_id', user.id).eq('status', 'sukses'),
      ]);

      if (modalsRes.error) throw modalsRes.error;
      if (pengeluaranRes.error) throw pengeluaranRes.error;
      if (transaksiRes.error) throw transaksiRes.error;

      const modalsData = modalsRes.data || [];
      const pengeluaranData = pengeluaranRes.data || [];
      const transaksiData = transaksiRes.data || [];

      const calculatedSaldos = sumberDanaOptions.map(source => {
        const detailModalsForSource = modalsData.filter(m => m.sumber_dana === source.id);
        
        const totalModalMasuk = detailModalsForSource.reduce((sum, item) => sum + item.jumlah, 0);

        const totalPengeluaranUmum = pengeluaranData
          .filter(p => p.sumber_dana === source.id)
          .reduce((sum, item) => sum + item.jumlah, 0);

        const totalModalTransaksi = transaksiData
          .filter(t => t.sumber_dana === source.id)
          .reduce((sum, item) => sum + item.harga_beli, 0);

        const totalBiayaAdmin = detailModalsForSource
          .filter(m => m.biaya_admin)
          .reduce((sum, item) => sum + (item.biaya_admin || 0), 0);
        
        const totalTerpakai = totalPengeluaranUmum + totalModalTransaksi;
        const sisaSaldo = totalModalMasuk - totalTerpakai;

        return {
          nama: source.id as SaldoSumberDana['nama'],
          label: source.label,
          icon: source.icon,
          modalAwal: totalModalMasuk,
          terpakai: totalTerpakai,
          sisa: sisaSaldo,
          biaya_admin: totalBiayaAdmin,
          detailModals: detailModalsForSource, // Simpan detailnya
        };
      });

      setSaldos(calculatedSaldos);

    } catch (error: any) {
      toast({ title: 'Error', description: `Gagal mengambil data saldo: ${error.message}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDialogForNew = () => {
    reset({
      jumlah: 0,
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
      sumber_dana: 'cash',
    });
    setIsDialogOpen(true);
  }

  const onSubmit = async (values: ModalFormValues) => {
    setIsSubmitting(true);
    if (!user) return;

    try {
      const { error } = await supabase.from('modals').insert({
        jumlah: values.jumlah,
        tanggal: values.tanggal,
        keterangan: values.keterangan,
        sumber_dana: values.sumber_dana,
        user_id: user.id,
      });

      if (error) throw error;
      
      toast({ title: 'Berhasil', description: `Modal berhasil ditambahkan.` });
      setIsDialogOpen(false);
      fetchSaldos();

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- PERUBAHAN: Fungsi untuk menghapus satu entri modal ---
  const handleEditModalEntry = async (values: ModalFormValues) => {
    if (!selectedModal || !user) return;
    setIsEditSubmitting(true);

    try {
      const { error } = await supabase
        .from('modals')
        .update({
          jumlah: values.jumlah,
          tanggal: values.tanggal,
          keterangan: values.keterangan,
          sumber_dana: values.sumber_dana
        })
        .eq('id', selectedModal.id);

      if (error) throw error;
      
      toast({ title: 'Berhasil', description: 'Modal berhasil diperbarui.' });
      setIsEditDialogOpen(false);
      fetchSaldos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openEditDialog = (modal: any) => {
    setSelectedModal(modal);
    setValue('jumlah', modal.jumlah);
    setValue('tanggal', modal.tanggal);
    setValue('keterangan', modal.keterangan || '');
    setValue('sumber_dana', modal.sumber_dana);
    setIsEditDialogOpen(true);
  };

  const handleDeleteModalEntry = async (modalId: string) => {
    try {
      const { error } = await supabase.from('modals').delete().eq('id', modalId);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Satu entri setoran modal telah dihapus." });
      fetchSaldos(); // Hitung ulang saldo setelah menghapus
    } catch (error: any) {
      toast({ title: "Gagal", description: "Gagal menghapus entri modal: " + error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-black">Saldo Modal</h2>
          <p className="text-black">Totaln Keseluruhan Sumber Dana.</p>
        </div>
        <div className="flex gap-2">
          {/* <Button onClick={openTransferDialog} variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Modal
          </Button> */}
          <Button onClick={openDialogForNew}>
            <PlusCircle className="mr-4 h-4 w-4" /> Tambah Setoran Modal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-black"/></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {saldos.map((saldo) => (
            <Card key={saldo.nama} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <saldo.icon className="h-8 w-8 text-pink-600" />
                    <div>
                      <CardTitle className="text-2xl font-bold text-black">{saldo.label}</CardTitle>
                      <CardDescription>Saldo Akhir Saat Ini</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetTransfer({
                        jumlah: 0,
                        dari_sumber: saldo.nama,
                        ke_sumber: saldos.find(s => s.nama !== saldo.nama)?.nama || '',
                        biaya_admin: 0,
                        keterangan: `Transfer dari ${saldo.label}`,
                        tanggal: new Date().toISOString().split('T')[0],
                      });
                      openTransferDialog();
                    }}
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div>
                  <p className={`text-4xl font-extrabold mb-4 ${saldo.sisa < 0 ? 'text-red-600' : 'text-black'}`}>
                    {formatRupiah(saldo.sisa)}
                  </p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm">Lihat Rincian</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="h-4 w-4" /> Total Modal Masuk
                          </span>
                          <span className="font-medium">{formatRupiah(saldo.modalAwal)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 text-red-700">
                            <TrendingDown className="h-4 w-4" /> Total Dana Terpakai
                          </span>
                          <span className="font-medium">{formatRupiah(saldo.terpakai)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 text-orange-700">
                            <Receipt className="h-4 w-4" /> Total Biaya Admin
                          </span>
                          <span className="font-medium">{formatRupiah(saldo.biaya_admin)}</span>
                        </div>
                        
                        {/* --- PERUBAHAN: Tampilkan riwayat setoran modal --- */}
                        <div className='pt-3'>
                            <h4 className='font-semibold text-xs text-gray-600 mb-2'>RIWAYAT SETORAN MODAL ({saldo.detailModals.length})</h4>
                            <div className='space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
                                {saldo.detailModals.length > 0 ? saldo.detailModals.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map(m => (
                                    <div key={m.id} className='flex justify-between items-center text-xs border-b pb-2'>
                                        <div>
                                            <p className='font-bold'>{formatRupiah(m.jumlah)}</p>
                                            <p className='text-gray-500'>{formatTanggal(m.tanggal)}</p>
                                        </div>
                                        <div className="flex gap-1 ml-auto">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-blue-500 hover:bg-blue-100"
                                                onClick={() => openEditDialog(m)}
                                            >
                                                <Pencil className="h-4 w-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="max-w-md">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-black">Anda Yakin Ingin Menghapus?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-black">
                                                            Tindakan ini akan menghapus setoran modal sebesar <strong>{formatRupiah(m.jumlah)}</strong> pada tanggal <strong>{formatTanggal(m.tanggal)}</strong> secara permanen. Saldo akan dihitung ulang.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteModalEntry(m.id)}>
                                                            Ya, Hapus
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )) : (
                                    <p className='text-xs text-center text-gray-500 py-2'>Belum ada riwayat setoran.</p>
                                )}
                            </div>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-black">Tambah Setoran Modal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label htmlFor="jumlah" className="text-black">Jumlah Modal (Rp)</Label>
                <Controller
                  name="jumlah"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      id="jumlah"
                      value={field.value ?? undefined}
                      onValueChange={(v) => field.onChange(v.floatValue || 0)}
                      thousandSeparator="." decimalSeparator="," prefix="Rp "
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                    />
                  )}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="tanggal" className="text-black">Tanggal</Label>
                <Input id="tanggal" type="date" {...control.register('tanggal')} className="text-black border-gray-300"/>
              </div>
               <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-black">Keterangan (Opsional)</Label>
                <Input id="keterangan" {...control.register('keterangan')} className="text-black border-gray-300"/>
              </div>
            <div className="space-y-2">
              <Label className="text-black">Dari Sumber Dana</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                {sumberDanaOptions.map(option => (
                  <div className="flex items-center" key={option.id}>
                    <input id={`sumber_dana_modal-${option.id}`} type="radio" value={option.id} className="h-4 w-4" {...control.register('sumber_dana')} />
                    <label htmlFor={`sumber_dana_modal-${option.id}`} className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
                      <option.icon className="h-5 w-5 text-gray-600" />
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Setoran'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-black">Transfer Modal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="jumlah" className="text-black">Jumlah Transfer (Rp)</Label>
              <Controller
                name="jumlah"
                control={transferControl}
                render={({ field }) => (
                  <NumericFormat
                    id="jumlah"
                    value={field.value ?? undefined}
                    onValueChange={(v) => field.onChange(v.floatValue || 0)}
                    thousandSeparator="." decimalSeparator="," prefix="Rp "
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biaya_admin" className="text-black">Biaya Admin (Rp)</Label>
              <Controller
                name="biaya_admin"
                control={transferControl}
                render={({ field }) => (
                  <NumericFormat
                    id="biaya_admin"
                    value={field.value ?? undefined}
                    onValueChange={(v) => field.onChange(v.floatValue || 0)}
                    thousandSeparator="." decimalSeparator="," prefix="Rp "
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal" className="text-black">Tanggal</Label>
              <Input 
                id="tanggal" 
                type="date" 
                {...transferControl.register('tanggal')} 
                className="text-black border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-black">Dari Sumber Dana</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-gray-100">
                  {(() => {
                    const sourceOption = sumberDanaOptions.find(option => option.id === dariSumber);
                    if (sourceOption) {
                      const Icon = sourceOption.icon;
                      return (
                        <>
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-black">
                            {sourceOption.label}
                          </span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black">Ke Sumber Dana</Label>
                <div className="space-y-2">
                  {sumberDanaOptions
                    .filter(option => option.id !== dariSumber)
                    .map(option => (
                      <div className="flex items-center" key={option.id}>
                        <input
                          id={`ke_sumber-${option.id}`}
                          type="radio"
                          value={option.id}
                          className="h-4 w-4"
                          {...transferControl.register('ke_sumber')}
                        />
                        <label htmlFor={`ke_sumber-${option.id}`} className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
                          <option.icon className="h-5 w-5 text-gray-600" />
                          {option.label}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan" className="text-black">Keterangan (Opsional)</Label>
              <Input id="keterangan" {...transferControl.register('keterangan')} className="text-black border-gray-300"/>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)} disabled={isTransferSubmitting}>Batal</Button>
              <Button type="submit" disabled={isTransferSubmitting}>
                {isTransferSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isTransferSubmitting ? 'Memproses...' : 'Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-black">Edit Setoran Modal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditModalEntry)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="jumlah" className="text-black">Jumlah Modal (Rp)</Label>
              <Controller
                name="jumlah"
                control={control}
                render={({ field }) => (
                  <NumericFormat
                    id="jumlah"
                    value={field.value ?? undefined}
                    onValueChange={(v) => field.onChange(v.floatValue || 0)}
                    thousandSeparator="." decimalSeparator="," prefix="Rp "
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal" className="text-black">Tanggal</Label>
              <Input id="tanggal" type="date" {...control.register('tanggal')} className="text-black border-gray-300"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan" className="text-black">Keterangan (Opsional)</Label>
              <Input id="keterangan" {...control.register('keterangan')} className="text-black border-gray-300"/>
            </div>
            <div className="space-y-2">
              <Label className="text-black">Dari Sumber Dana</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                {sumberDanaOptions.map(option => (
                  <div className="flex items-center" key={option.id}>
                    <input id={`sumber_dana_modal-${option.id}`} type="radio" value={option.id} className="h-4 w-4" {...control.register('sumber_dana')} />
                    <label htmlFor={`sumber_dana_modal-${option.id}`} className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
                      <option.icon className="h-5 w-5 text-gray-600" />
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={isEditSubmitting}>Simpan</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-black">Konfirmasi Edit Modal</AlertDialogTitle>
                    <AlertDialogDescription className="text-black">
                      Apakah Anda yakin ingin mengubah data setoran modal ini? Perubahan akan mempengaruhi perhitungan saldo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction type="submit" onClick={handleSubmit(handleEditModalEntry)} disabled={isEditSubmitting}>
                      {isEditSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditSubmitting ? 'Menyimpan...' : 'Ya, Simpan'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditSubmitting}>Batal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Modal;