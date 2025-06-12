import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Pelanggan as PelangganType, Transaksi as TransaksiType } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

// Skema validasi untuk form transaksi (tidak ada perubahan)
const transaksiSchema = z.object({
  jenis_transaksi: z.string().min(1, 'Jenis transaksi wajib diisi'),
  nomor_tujuan: z.string().min(3, 'Nomor tujuan wajib diisi'),
  pelanggan_id: z.string().optional(),
  nominal: z.number().min(1, 'Nominal wajib diisi'),
  harga_beli: z.number().min(1, 'Harga beli (modal) wajib diisi'),
  harga_jual: z.number().min(1, 'Harga jual wajib diisi'),
  keterangan: z.string().optional(),
});

type TransaksiFormValues = z.infer<typeof transaksiSchema>;

const Transaksi = () => {
  const { user } = useAuth();
  const [transaksis, setTransaksis] = useState<TransaksiType[]>([]);
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk melacak transaksi yang sedang diedit
  const [editingTransaksi, setEditingTransaksi] = useState<TransaksiType | null>(null);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<TransaksiFormValues>({
    resolver: zodResolver(transaksiSchema),
    defaultValues: {
      jenis_transaksi: "",
      nomor_tujuan: "",
      pelanggan_id: "",
      keterangan: "",
    }
  });

  // Fetch data awal
  useEffect(() => {
    if (user) {
      fetchPelanggans();
      fetchTransaksi();
    }
  }, [user]);

  const fetchPelanggans = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('pelanggan').select('*').eq('user_id', user.id).order('nama');
    if (error) toast({ title: 'Error', description: 'Gagal mengambil data pelanggan.', variant: 'destructive' });
    else setPelanggans(data || []);
  };

  const fetchTransaksi = async () => {
    setLoading(true);
    if (!user) return;
    const { data, error } = await supabase.from('transaksi').select('*, pelanggan:pelanggan_id(nama)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
    if (error) toast({ title: 'Error', description: 'Gagal mengambil riwayat transaksi.', variant: 'destructive' });
    else setTransaksis(data || []);
    setLoading(false);
  };

  // Fungsi untuk menyimpan ATAU mengupdate transaksi
  const onSubmit = async (values: TransaksiFormValues) => {
    setIsSubmitting(true);
    if (!user) return;
    try {
        let error;
        const dataToSubmit = {
            user_id: user.id,
            pelanggan_id: values.pelanggan_id || null,
            jenis_transaksi: values.jenis_transaksi,
            nomor_tujuan: values.nomor_tujuan,
            nominal: values.nominal,
            harga_beli: values.harga_beli,
            harga_jual: values.harga_jual,
            keterangan: values.keterangan,
            status: 'sukses',
        };

        if (editingTransaksi) {
            // Proses Update
            const { error: updateError } = await supabase.from('transaksi').update(dataToSubmit).eq('id', editingTransaksi.id);
            error = updateError;
        } else {
            // Proses Insert
            const { error: insertError } = await supabase.from('transaksi').insert(dataToSubmit);
            error = insertError;
        }

        if (error) throw error;
      
        toast({ title: 'Berhasil!', description: `Transaksi telah berhasil ${editingTransaksi ? 'diperbarui' : 'dicatat'}.` });
        resetForm();
        fetchTransaksi();
    } catch (error: any) {
      toast({ title: 'Gagal', description: 'Gagal menyimpan transaksi: ' + error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi baru untuk menghapus transaksi
  const handleDelete = async (transaksiId: string) => {
    try {
      const { error } = await supabase.from('transaksi').delete().eq('id', transaksiId);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Transaksi telah berhasil dihapus." });
      fetchTransaksi();
    } catch (error: any) {
      toast({ title: "Gagal", description: "Gagal menghapus transaksi: " + error.message, variant: "destructive" });
    }
  };

  // Fungsi untuk memulai mode edit
  const handleEdit = (transaksi: TransaksiType) => {
    setEditingTransaksi(transaksi);
    setValue('jenis_transaksi', transaksi.jenis_transaksi);
    setValue('nomor_tujuan', transaksi.nomor_tujuan);
    setValue('pelanggan_id', transaksi.pelanggan_id || '');
    setValue('nominal', transaksi.nominal);
    setValue('harga_beli', transaksi.harga_beli);
    setValue('harga_jual', transaksi.harga_jual);
    setValue('keterangan', transaksi.keterangan || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fungsi untuk membatalkan mode edit dan membersihkan form
  const resetForm = () => {
    reset(); // Membersihkan nilai form
    setEditingTransaksi(null); // Keluar dari mode edit
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Catat Transaksi</h2>
        <p className="text-muted-foreground">Formulir untuk mencatat penjualan pulsa, PPOB, dll.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingTransaksi ? 'Edit Transaksi' : 'Input Transaksi Baru'}</CardTitle>
            <CardDescription>{editingTransaksi ? `Mengedit transaksi untuk ${editingTransaksi.nomor_tujuan}` : 'Masukkan detail transaksi yang terjadi.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_transaksi">Jenis Transaksi</Label>
                <Input id="jenis_transaksi" placeholder="Contoh: Pulsa Telkomsel, Token PLN" {...register('jenis_transaksi')} />
                {errors.jenis_transaksi && <p className="text-sm text-red-500">{errors.jenis_transaksi.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomor_tujuan">Nomor Tujuan / ID Pelanggan</Label>
                <Input id="nomor_tujuan" placeholder="0812..." {...register('nomor_tujuan')} />
                {errors.nomor_tujuan && <p className="text-sm text-red-500">{errors.nomor_tujuan.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nominal">Nominal</Label>
                    <Controller name="nominal" control={control} render={({ field }) => (<NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />)} />
                    {errors.nominal && <p className="text-sm text-red-500">{errors.nominal.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="harga_jual">Harga Jual (Rp)</Label>
                    <Controller name="harga_jual" control={control} render={({ field }) => (<NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />)} />
                    {errors.harga_jual && <p className="text-sm text-red-500">{errors.harga_jual.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="harga_beli">Harga Beli / Modal (Rp)</Label>
                <Controller name="harga_beli" control={control} render={({ field }) => (<NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />)} />
                {errors.harga_beli && <p className="text-sm text-red-500">{errors.harga_beli.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pelanggan_id">Pelanggan (Opsional)</Label>
                <Controller name="pelanggan_id" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || ''}><SelectTrigger><SelectValue placeholder="Pilih Pelanggan" /></SelectTrigger><SelectContent>{pelanggans.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent></Select>)} />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Menyimpan...' : (editingTransaksi ? 'Update Transaksi' : 'Simpan Transaksi')}
                </Button>
                {editingTransaksi && (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                        Batal
                    </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi Terakhir</CardTitle>
            <CardDescription>10 transaksi terakhir yang dicatat.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin"/></div> 
            : transaksis.length === 0 ? <p className="text-center text-muted-foreground py-6">Belum ada transaksi.</p> 
            : (
              <div className="space-y-4">
                {transaksis.map((t: any) => ( // Use 'any' type to access joined 'pelanggan' data
                  <div key={t.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{t.jenis_transaksi} {formatRupiah(t.nominal, '')}</p>
                      <p className="text-sm text-muted-foreground">{t.pelanggan?.nama || t.nomor_tujuan}</p>
                      <p className="text-xs text-gray-500">{formatTanggal(t.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                       <div className="text-right mr-2">
                           <p className="font-semibold">{formatRupiah(t.harga_jual)}</p>
                           <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${t.status === 'sukses' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                               {t.status}
                           </span>
                       </div>
                       <Button 
                         variant="outline" 
                         size="icon" 
                         className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                         onClick={() => handleEdit(t)}
                       >
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data transaksi secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive hover:bg-destructive/90" 
                                onClick={() => handleDelete(t.id)}
                              >
                                Ya, Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transaksi;
