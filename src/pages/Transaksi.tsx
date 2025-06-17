import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const pelangganSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  nomor_hp: z.string().min(1, 'Nomor HP wajib diisi'),
  alamat: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional(),
  status: z.enum(['aktif', 'non_aktif']),
});

type PelangganFormValues = z.infer<typeof pelangganSchema>;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Pelanggan as PelangganType, Transaksi as TransaksiType } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Pencil, Wallet, Landmark, CreditCard, Smartphone, UserSearch, XCircle, UserPlus } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect } from 'react';

const transaksiSchema = z.object({
  jenis_transaksi: z.string().min(1, 'Jenis transaksi wajib diisi'),
  nomor_tujuan: z.string().min(3, 'Nomor tujuan wajib diisi'),
  pelanggan_id: z.string().optional(),
  nominal: z.number(),
  harga_beli: z.number().min(1, 'Harga beli (modal) wajib diisi'),
  harga_jual: z.number().min(1, 'Harga jual wajib diisi'),
  keterangan: z.string().optional(),
  sumber_dana: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
}).transform((data) => ({
  ...data,
  nominal: data.harga_beli
}));

type TransaksiFormValues = z.infer<typeof transaksiSchema>;

const Transaksi = () => {
  const { user } = useAuth();
  const [transaksis, setTransaksis] = useState<TransaksiType[]>([]);
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState<TransaksiType | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [filterType, setFilterType] = useState<'today' | 'date' | 'month' | 'date_range'>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Jumlah item per halaman untuk pagination
  const maxVisibleItems = 5; // Maksimal item yang terlihat sebelum scroll
  
  const { register: registerPelanggan, handleSubmit: handleSubmitPelanggan, reset: resetPelanggan, formState: { errors: pelangganErrors } } = useForm<PelangganFormValues>({
    resolver: zodResolver(pelangganSchema),
    defaultValues: {
      status: 'aktif',
      nama: '',
      nomor_hp: '',
      alamat: '',
      email: '',
    },
  });

  const sumberDanaOptions = [
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'seabank', label: 'Seabank', icon: Landmark },
    { id: 'gopay', label: 'Gopay', icon: CreditCard },
    { id: 'aplikasi_isipulsa', label: 'Aplikasi IsiPulsa', icon: Smartphone },
  ];

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<TransaksiFormValues>({
    resolver: zodResolver(transaksiSchema),
    defaultValues: {
      jenis_transaksi: "",
      nomor_tujuan: "",
      pelanggan_id: "",
      keterangan: "",
      sumber_dana: 'cash',
    }
  });

  const selectedPelangganId = watch('pelanggan_id');
  const selectedPelanggan = pelanggans.find(p => p.id === selectedPelangganId);

  const filteredPelanggans = pelanggans.filter(p => 
    p.nama.toLowerCase().includes(customerSearch.toLowerCase()) ||
    p.nomor_hp?.includes(customerSearch)
  );

  useEffect(() => {
    if (user) {
      fetchPelanggans();
      setCurrentPage(1);
      fetchTransaksi();
    }
  }, [user, filterType, filterDate, filterMonth, filterStartDate, filterEndDate]);

  const fetchPelanggans = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('pelanggan').select('*').eq('user_id', user.id).order('nama');
    if (error) toast({ title: 'Error', description: 'Gagal mengambil data pelanggan.', variant: 'destructive' });
    else setPelanggans(data || []);
  };

  const fetchTransaksi = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('transaksi')
      .select('*, pelanggan(*)')
      .eq('user_id', user.id);

    // Pastikan format tanggal konsisten menggunakan format lokal YYYY-MM-DD
    const today = new Date();
    // Gunakan waktu lokal untuk menghindari masalah timezone
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log('Filter type:', filterType);
    
    if (filterType === 'today') {
      // Untuk filter hari ini, gunakan pendekatan rentang waktu karena tanggal_transaksi adalah TIMESTAMP WITH TIME ZONE
      console.log('Filtering by today:', todayStr);
      query = query.gte('tanggal_transaksi', `${todayStr} 00:00:00`).lt('tanggal_transaksi', `${todayStr} 23:59:59.999`);
      console.log('Database query for today:', `SELECT * FROM transaksi WHERE tanggal_transaksi >= '${todayStr} 00:00:00' AND tanggal_transaksi < '${todayStr} 23:59:59.999'`);
    } else if (filterType === 'date') {
      // Gunakan filterDate yang baru ditambahkan
      console.log('Filtering by selected date:', filterDate);
      query = query.gte('tanggal_transaksi', `${filterDate} 00:00:00`).lt('tanggal_transaksi', `${filterDate} 23:59:59.999`);
      console.log('Database query for date:', `SELECT * FROM transaksi WHERE tanggal_transaksi >= '${filterDate} 00:00:00' AND tanggal_transaksi < '${filterDate} 23:59:59.999'`);
    } else if (filterType === 'month') {
      // Filter berdasarkan bulan (YYYY-MM)
      const [year, month] = filterMonth.split('-');
      const startDate = `${year}-${month}-01`;
      // Hitung tanggal akhir bulan
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;
      
      console.log('Filtering by month:', filterMonth, 'from', startDate, 'to', endDate);
      query = query.gte('tanggal_transaksi', `${startDate} 00:00:00`).lt('tanggal_transaksi', `${endDate} 23:59:59.999`);
    } else if (filterType === 'date_range') {
      // Filter berdasarkan rentang tanggal
      console.log('Filtering by date range:', filterStartDate, 'to', filterEndDate);
      query = query.gte('tanggal_transaksi', `${filterStartDate} 00:00:00`).lt('tanggal_transaksi', `${filterEndDate} 23:59:59.999`);
      console.log('Database query for date range:', `SELECT * FROM transaksi WHERE tanggal_transaksi >= '${filterStartDate} 00:00:00' AND tanggal_transaksi < '${filterEndDate} 23:59:59.999'`);
    }

    // Tambahkan log untuk melihat query yang dihasilkan
    console.log('Final query:', query);

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      toast({ title: 'Error', description: 'Gagal mengambil riwayat transaksi.', variant: 'destructive' });
    } else {
      console.log('Fetched transactions:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('First transaction date:', data[0].tanggal_transaksi);
        console.log('Sample transaction data:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('No transactions found for filter:', filterType);
      }
      setTransaksis(data as any[] || []);
    }
    setLoading(false);
  };

  const onSubmit = async (values: TransaksiFormValues) => {
    setIsSubmitting(true);
    if (!user) return;
    try {
      // Pastikan tanggal transaksi selalu menggunakan format yang benar
      const today = new Date();
      // Gunakan waktu lokal untuk menghindari masalah timezone
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      console.log('Saving transaction with date:', todayStr);
      
      const dataToSubmit = {
        user_id: user.id,
        pelanggan_id: values.pelanggan_id || null,
        jenis_transaksi: values.jenis_transaksi,
        nomor_tujuan: values.nomor_tujuan,
        nominal: values.nominal,
        harga_beli: values.harga_beli,
        harga_jual: values.harga_jual,
        keterangan: values.keterangan,
        sumber_dana: values.sumber_dana,
        status: 'sukses',
        tanggal_transaksi: todayStr, // Tambahkan tanggal transaksi hari ini dengan format YYYY-MM-DD
      };

      let error;
      if (editingTransaksi) {
        const { error: updateError } = await supabase.from('transaksi').update(dataToSubmit).eq('id', editingTransaksi.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('transaksi').insert(dataToSubmit);
        error = insertError;
      }

      if (error) throw error;
      
      toast({ title: 'Berhasil!', description: `Transaksi telah berhasil ${editingTransaksi ? 'diperbarui' : 'dicatat'}.` });
      resetForm();
      fetchTransaksi();
    } catch (error: any) {
      console.error("Supabase Transaksi Error:", error);
      toast({ title: 'Gagal', description: `Gagal menyimpan transaksi: ${error.message}. Cek console.`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPelanggan = async (values: PelangganFormValues) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('pelanggan').insert({
        ...values,
        user_id: user.id,
      }).select();

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Data pelanggan berhasil ditambahkan.',
      });

      // Update pelanggan list and select the new customer
      fetchPelanggans();
      if (data?.[0]) {
        setValue('pelanggan_id', data[0].id);
        setValue('nomor_tujuan', data[0].nomor_hp || '');
      }

      setIsAddingCustomer(false);
      resetPelanggan();
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: `Gagal menambahkan pelanggan: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

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

  const handleEdit = (transaksi: TransaksiType) => {
    setEditingTransaksi(transaksi);
    setValue('jenis_transaksi', transaksi.jenis_transaksi);
    setValue('nomor_tujuan', transaksi.nomor_tujuan || '');
    setValue('pelanggan_id', transaksi.pelanggan_id || '');
    setValue('nominal', transaksi.nominal);
    setValue('harga_beli', transaksi.harga_beli);
    setValue('harga_jual', transaksi.harga_jual);
    setValue('keterangan', transaksi.keterangan || '');
    setValue('sumber_dana', transaksi.sumber_dana || 'cash');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    reset();
    setEditingTransaksi(null);
    setCustomerSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
        <CardHeader>
          <CardTitle className="text-black">{editingTransaksi ? 'Edit Transaksi' : 'Input Transaksi Baru'}</CardTitle>
          <CardDescription className="text-black">{editingTransaksi ? `Mengedit transaksi untuk ${editingTransaksi.nomor_tujuan}`: 'Masukkan detail transaksi yang terjadi.'}</CardDescription>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_transaksi" className="text-black">Jenis Transaksi</Label>
                <input id="jenis_transaksi" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-black border-gray-300" placeholder="Contoh: Pulsa Telkomsel" {...register('jenis_transaksi')} />
                {errors.jenis_transaksi && <p className="text-sm text-red-500">{errors.jenis_transaksi.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomor_tujuan" className="text-black">Nomor Tujuan / ID Pelanggan</Label>
                <input id="nomor_tujuan" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-black border-gray-300" placeholder="Contoh: 08123456789" {...register('nomor_tujuan')} />
                {errors.nomor_tujuan && <p className="text-sm text-red-500">{errors.nomor_tujuan.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="harga_beli" className="text-black">Harga Beli (Rp)</Label>
                  <Controller name="harga_beli" control={control} render={({ field }) => (<NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"/> )} />
                  {errors.harga_beli && <p className="text-sm text-red-500">{errors.harga_beli.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="harga_jual" className="text-black">Harga Jual (Rp)</Label>
                  <Controller name="harga_jual" control={control} render={({ field }) => ( <NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" /> )} />
                  {errors.harga_jual && <p className="text-sm text-red-500">{errors.harga_jual.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black">Pelanggan (Opsional)</Label>
                <div className="flex gap-2">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-black border border-gray-300 rounded-md px-3 text-sm">
                        {selectedPelanggan ? (
                          <div className="flex justify-between w-full items-center pr-2">
                            <span>{selectedPelanggan.nama}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setValue('pelanggan_id', '');
                              }}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : 'Pilih Pelanggan'}
                      </AccordionTrigger>
                      <AccordionContent className="border border-t-0 border-gray-300 rounded-b-md p-2">
                        <div className="relative mb-2">
                          <UserSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="Cari nama atau nomor HP..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="pl-8 text-black"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filteredPelanggans.length > 0 ? filteredPelanggans.map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setValue('pelanggan_id', p.id);
                                setValue('nomor_tujuan', p.nomor_hp || '');
                                setCustomerSearch('');
                              }}
                              className="p-2 rounded-md hover:bg-gray-100 cursor-pointer text-black"
                            >
                              <p className="font-medium text-sm">{p.nama}</p>
                              <p className="text-xs text-gray-600">{p.nomor_hp}</p>
                            </div>
                          )) : (
                            <p className="text-center text-sm text-gray-500 py-4">Pelanggan tidak ditemukan.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                        <DialogDescription>
                          Masukkan data pelanggan baru di bawah ini.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmitPelanggan(onSubmitPelanggan)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nama">Nama</Label>
                          <Input
                            id="nama"
                            {...registerPelanggan('nama')}
                            className="text-black"
                          />
                          {pelangganErrors.nama && (
                            <p className="text-sm text-red-500">{pelangganErrors.nama.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nomor_hp">Nomor HP</Label>
                          <Input
                            id="nomor_hp"
                            {...registerPelanggan('nomor_hp')}
                            className="text-black"
                          />
                          {pelangganErrors.nomor_hp && (
                            <p className="text-sm text-red-500">{pelangganErrors.nomor_hp.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email (Opsional)</Label>
                          <Input
                            id="email"
                            type="email"
                            {...registerPelanggan('email')}
                            className="text-black"
                          />
                          {pelangganErrors.email && (
                            <p className="text-sm text-red-500">{pelangganErrors.email.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="alamat">Alamat (Opsional)</Label>
                          <Input
                            id="alamat"
                            {...registerPelanggan('alamat')}
                            className="text-black"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddingCustomer(false)}>
                            Batal
                          </Button>
                          <Button type="submit">
                            Simpan Pelanggan
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-black">Keterangan (Opsional)</Label>
                <Input id="keterangan" className="text-black border-gray-300" {...register('keterangan')} />
              </div>

              <div className="space-y-2">
                <Label className="text-black">Sumber Dana Pembayaran</Label>
                <Controller
                  name="sumber_dana"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                      {sumberDanaOptions.map(option => (
                        <div className="flex items-center" key={option.id}>
                          <input
                            id={`sumber_dana_transaksi-${option.id}`}
                            type="radio"
                            value={option.id}
                            checked={field.value === option.id}
                            onChange={() => field.onChange(option.id)}
                            className="h-4 w-4 border-gray-300"
                          />
                          <label
                            htmlFor={`sumber_dana_transaksi-${option.id}`}
                            className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer"
                          >
                            <option.icon className="h-5 w-5 text-gray-600" />
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                />
                {errors.sumber_dana && <p className="text-sm text-red-500">{errors.sumber_dana.message}</p>}
              </div>

              <div className="flex space-x-2 pt-2">
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

        <Card className="mt-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-black">Riwayat Transaksi</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Pilih periode transaksi yang ingin ditampilkan
            </CardDescription>
              <div className="mt-4 space-y-4">
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="filter-today" 
                      value="today" 
                      checked={filterType === 'today'} 
                      onChange={(e) => {
                        setFilterType(e.target.value as 'today');
                        // Reset today's date when selecting 'today' filter
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setSelectedDate(today);
                      }} 
                      className="h-4 w-4 border-gray-300" 
                    />
                    <label htmlFor="filter-today" className="ml-2 text-sm text-black"> Hari Ini </label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="filter-date" 
                      value="date" 
                      checked={filterType === 'date'} 
                      onChange={(e) => {
                        setFilterType(e.target.value as 'date');
                      }} 
                      className="h-4 w-4 border-gray-300" 
                    />
                    <label htmlFor="filter-date" className="ml-2 text-sm text-black"> Pilih Tanggal </label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="filter-month" 
                      value="month" 
                      checked={filterType === 'month'} 
                      onChange={(e) => {
                        setFilterType(e.target.value as 'month');
                      }} 
                      className="h-4 w-4 border-gray-300" 
                    />
                    <label htmlFor="filter-month" className="ml-2 text-sm text-black"> Filter per Bulan </label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="filter-date-range" 
                      value="date_range" 
                      checked={filterType === 'date_range'} 
                      onChange={(e) => {
                        setFilterType(e.target.value as 'date_range');
                      }} 
                      className="h-4 w-4 border-gray-300" 
                    />
                    <label htmlFor="filter-date-range" className="ml-2 text-sm text-black"> Rentang Tanggal </label>
                  </div>
                </div>
                
                {filterType === 'date' && (
                  <div className="space-y-2">
                    <Label htmlFor="filter-date-input" className="text-sm text-black">Pilih Tanggal</Label>
                    <input 
                      id="filter-date-input"
                      type="date" 
                      value={filterDate} 
                      onChange={(e) => {
                        setFilterDate(e.target.value);
                      }} 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" 
                    />
                  </div>
                )}
                
                {filterType === 'month' && (
                  <div className="space-y-2">
                    <Label htmlFor="filter-month-input" className="text-sm text-black">Pilih Bulan</Label>
                    <input 
                      id="filter-month-input"
                      type="month" 
                      value={filterMonth} 
                      onChange={(e) => {
                        setFilterMonth(e.target.value);
                      }} 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" 
                    />
                  </div>
                )}
                
                {filterType === 'date_range' && (
                  <div className="space-y-4">
                    <div className="flex flex-row gap-4">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="filter-start-date" className="text-sm text-black">Tanggal Mulai</Label>
                        <input 
                          id="filter-start-date"
                          type="date" 
                          value={filterStartDate} 
                          onChange={(e) => {
                            setFilterStartDate(e.target.value);
                          }}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" 
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="filter-end-date" className="text-sm text-black">Tanggal Akhir</Label>
                        <input 
                          id="filter-end-date"
                          type="date" 
                          value={filterEndDate} 
                          onChange={(e) => {
                            setFilterEndDate(e.target.value);
                          }}
                          min={filterStartDate}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </CardHeader>

          <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-black" />
          </div>
        ) : transaksis.length === 0 ? (
          <p className="text-center text-black py-6">Belum ada transaksi.</p>
        ) : (
          <>
            <div className="space-y-4 text-black max-h-[calc(var(--item-height)*var(--max-visible-items))] overflow-y-auto pr-2" style={{
              '--item-height': '5.5rem',
              '--max-visible-items': maxVisibleItems
            } as React.CSSProperties}>
              {transaksis
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((t) => {
                  const matchingOption = sumberDanaOptions.find(opt => opt.id === t.sumber_dana);
                  const IconComponent = matchingOption?.icon || Wallet;
                  return (
                    <div key={t.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium text-black">
                          {t.jenis_transaksi} {formatRupiah(t.nominal)}
                        </p>
                        <p className="text-sm text-black">
                          {t.pelanggan?.nama || t.nomor_tujuan}
                        </p>
                        <div className="flex items-center gap-x-3 text-xs text-black mt-1">
                          <span>{formatTanggal(t.created_at)}</span>
                          <span className="flex items-center gap-1.5">
                            <IconComponent className="h-3.5 w-3.5" />
                            {matchingOption?.label || t.sumber_dana}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-right mr-2">
                          <p className="font-semibold text-black">{formatRupiah(t.harga_jual)}</p>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 text-black ${
                              t.status === "sukses" ? "bg-green-100" : "bg-yellow-100"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-600"
                          onClick={() => handleEdit(t as TransaksiType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-black">Anda Yakin?</AlertDialogTitle>
                              <AlertDialogDescription className="text-black">
                                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data transaksi secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive"
                                onClick={() => handleDelete(t.id)}
                              >
                                Ya, Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
            </div>

            {transaksis.length > itemsPerPage && (
              <div className="mt-6">
                <Card className="border-t border-gray-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="w-full sm:w-auto"
                      >
                        Sebelumnya
                      </Button>
                      <div className="flex flex-wrap justify-center items-center gap-2">
                        {Array.from({ length: Math.ceil(transaksis.length / itemsPerPage) }, (_, i) => i + 1).map(
                          (page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[40px]"
                            >
                              {page}
                            </Button>
                          )
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(Math.ceil(transaksis.length / itemsPerPage), prev + 1)
                          )
                        }
                        disabled={currentPage === Math.ceil(transaksis.length / itemsPerPage)}
                        className="w-full sm:w-auto"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </CardContent>


        </Card>
      </div>
    </div>
  );
};

export default Transaksi;