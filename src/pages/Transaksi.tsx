import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Pelanggan as PelangganType, Transaksi as TransaksiType } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Pencil, Wallet, Landmark, CreditCard, Smartphone, UserSearch, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const transaksiSchema = z.object({
  jenis_transaksi: z.string().min(1, 'Jenis transaksi wajib diisi'),
  nomor_tujuan: z.string().min(3, 'Nomor tujuan wajib diisi'),
  pelanggan_id: z.string().optional(),
  nominal: z.number().min(1, 'Nominal wajib diisi'),
  harga_beli: z.number().min(1, 'Harga beli (modal) wajib diisi'),
  harga_jual: z.number().min(1, 'Harga jual wajib diisi'),
  keterangan: z.string().optional(),
  sumber_dana: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
});

type TransaksiFormValues = z.infer<typeof transaksiSchema>;

const TRANSACTIONS_PER_PAGE = 10;

const Transaksi = () => {
  const { user } = useAuth();
  const [transaksis, setTransaksis] = useState<TransaksiType[]>([]);
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState<TransaksiType | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [filterType, setFilterType] = useState('semua');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const pageCount = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);

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
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
        fetchTransaksi();
    }
  }, [user, currentPage, filterType, date, dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, date, dateRange]);


  const fetchPelanggans = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('pelanggan').select('*').eq('user_id', user.id).order('nama');
    if (error) toast({ title: 'Error', description: 'Gagal mengambil data pelanggan.', variant: 'destructive' });
    else setPelanggans(data || []);
  };

  const fetchTransaksi = async () => {
    setLoading(true);
    if (!user) return;

    let query = supabase
        .from('transaksi')
        .select('*, pelanggan:pelanggan_id(nama)', { count: 'exact' })
        .eq('user_id', user.id);

    if (filterType !== 'semua' && (date || (dateRange?.from && dateRange?.to))) {
        let fromDate, toDate;
        switch (filterType) {
            case 'harian':
                fromDate = new Date(date!.setHours(0, 0, 0, 0)).toISOString();
                toDate = new Date(date!.setHours(23, 59, 59, 999)).toISOString();
                break;
            case 'rentang':
                if (dateRange?.from && dateRange?.to) {
                    fromDate = new Date(dateRange.from.setHours(0, 0, 0, 0)).toISOString();
                    toDate = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();
                }
                break;
        }
        if (fromDate && toDate) {
           query = query.gte('created_at', fromDate).lte('created_at', toDate);
        }
    }
    
    const from = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    const to = from + TRANSACTIONS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
        toast({ title: 'Error', description: 'Gagal mengambil riwayat transaksi.', variant: 'destructive' });
        setTransaksis([]);
        setTotalTransactions(0);
    } else {
        setTransaksis(data as any[] || []);
        setTotalTransactions(count || 0);
    }
    setLoading(false);
  };
  
  const onSubmit = async (values: TransaksiFormValues) => {
    setIsSubmitting(true);
    if (!user) return;
    try {
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

  const handleDelete = async (transaksiId: string) => {
    try {
      const { error } = await supabase.from('transaksi').delete().eq('id', transaksiId);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Transaksi telah berhasil dihapus." });
      if (transaksis.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
      } else {
          fetchTransaksi();
      }
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
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Catat Transaksi</h2>
        <p className="text-foreground">Formulir untuk mencatat penjualan pulsa, PPOB, dll.</p>
      </div>
      
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">{editingTransaksi ? 'Edit Transaksi' : 'Input Transaksi Baru'}</CardTitle>
            <CardDescription>{editingTransaksi ? `Mengedit transaksi untuk ${editingTransaksi.nomor_tujuan}`: 'Masukkan detail transaksi yang terjadi.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_transaksi" className="text-foreground">Jenis Transaksi</Label>
                <input id="jenis_transaksi" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground" placeholder="Contoh: Pulsa Telkomsel" {...register('jenis_transaksi')} />
                {errors.jenis_transaksi && <p className="text-sm text-red-500">{errors.jenis_transaksi.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomor_tujuan" className="text-foreground">Nomor Tujuan / ID Pelanggan</Label>
                <input id="nomor_tujuan" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground" placeholder="Contoh: 08123456789" {...register('nomor_tujuan')} />
                {errors.nomor_tujuan && <p className="text-sm text-red-500">{errors.nomor_tujuan.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nominal" className="text-foreground">Nominal</Label>
                  <Controller name="nominal" control={control} render={({ field }) => ( <NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" /> )} />
                  {errors.nominal && <p className="text-sm text-red-500">{errors.nominal.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="harga_jual" className="text-foreground">Harga Jual (Rp)</Label>
                  <Controller name="harga_jual" control={control} render={({ field }) => ( <NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" /> )} />
                  {errors.harga_jual && <p className="text-sm text-red-500">{errors.harga_jual.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="harga_beli" className="text-foreground">Harga Beli / Modal (Rp)</Label>
                  <Controller name="harga_beli" control={control} render={({ field }) => (<NumericFormat value={field.value ?? undefined} onValueChange={(v) => field.onChange(v.floatValue || 0)} thousandSeparator="." decimalSeparator="," prefix="Rp " className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"/> )} />
                  {errors.harga_beli && <p className="text-sm text-red-500">{errors.harga_beli.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Pelanggan (Opsional)</Label>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-foreground border border-input rounded-md px-3 text-sm">
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
                    <AccordionContent className="border border-t-0 border-input rounded-b-md p-2">
                      <div className="relative mb-2">
                        <UserSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama atau nomor HP..."
                          value={customerSearch}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerSearch(e.target.value)}
                          className="pl-8 text-foreground"
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
                            className="p-2 rounded-md hover:bg-accent cursor-pointer text-foreground"
                          >
                            <p className="font-medium text-sm">{p.nama}</p>
                            <p className="text-xs text-muted-foreground">{p.nomor_hp}</p>
                          </div>
                        )) : (
                          <p className="text-center text-sm text-muted-foreground py-4">Pelanggan tidak ditemukan.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-foreground">Keterangan (Opsional)</Label>
                <Input id="keterangan" className="text-foreground border-input" {...register('keterangan')} />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Sumber Dana Pembayaran</Label>
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
                                    className="h-4 w-4 border-input text-primary focus:ring-primary"
                                />
                                <label
                                    htmlFor={`sumber_dana_transaksi-${option.id}`}
                                    className="ml-2 flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
                                >
                                    <option.icon className="h-5 w-5 text-muted-foreground" />
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
                {editingTransaksi && ( <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Batal</Button> )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="text-card-foreground">Riwayat Transaksi</CardTitle>
              <CardDescription>
                  Lihat dan kelola transaksi yang telah dicatat.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 mb-4">
                      <TabsList className="bg-muted text-muted-foreground w-full sm:w-auto justify-start">
                          <TabsTrigger value="semua">Semua</TabsTrigger>
                          <TabsTrigger value="harian">Harian</TabsTrigger>
                          <TabsTrigger value="rentang">Rentang</TabsTrigger>
                      </TabsList>
                      
                      {filterType === 'harian' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full sm:w-[260px] justify-start text-left font-normal",
                                !date ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? (
                                format(date, "PPP", { locale: indonesiaLocale })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              captionLayout="dropdown"
                              locale={indonesiaLocale}
                              className="rounded-md border shadow-sm"
                            />
                          </PopoverContent>
                        </Popover>
                      )}

                      {filterType === 'rentang' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="date"
                              variant="outline"
                              className={cn(
                                "w-full sm:w-[300px] justify-start text-left font-normal",
                                !(dateRange?.from && dateRange?.to) ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate"> 
                                {dateRange?.from ? (
                                  dateRange.to ? (
                                    <>
                                      {format(dateRange.from, "P", { locale: indonesiaLocale })} –{" "}
                                      {format(dateRange.to, "P", { locale: indonesiaLocale })}
                                    </>
                                  ) : (
                                    format(dateRange.from, "P", { locale: indonesiaLocale })
                                  )
                                ) : (
                                  <span>Pilih rentang tanggal</span>
                                )}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={2}
                              defaultMonth={dateRange?.from}
                              captionLayout="dropdown"
                              locale={indonesiaLocale}
                              className="rounded-md border shadow-sm"
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                  </div>
              </Tabs>

              {loading ? ( 
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-foreground" /></div> 
              ) : transaksis.length === 0 ? ( 
                  <p className="text-center text-foreground py-6">Belum ada transaksi pada periode ini.</p> 
              ) : (
                  <div className="space-y-4 text-foreground">
                      {transaksis.map((t) => {
                      const matchingOption = sumberDanaOptions.find(opt => opt.id === t.sumber_dana);
                      const IconComponent = matchingOption?.icon || Wallet;
                      return (
                          <div key={t.id} className="flex justify-between items-center gap-2 border-b border-border pb-2">
                            <div className='flex-1 min-w-0'>
                                <p className="font-medium text-foreground truncate">{t.jenis_transaksi} {formatRupiah(t.nominal)}</p>
                                <p className="text-sm text-foreground truncate">{t.pelanggan?.nama || t.nomor_tujuan}</p>
                                <div className="flex items-center gap-x-3 text-xs text-muted-foreground mt-1">
                                    <span>{formatTanggal(t.created_at)}</span>
                                    <span className='flex items-center gap-1.5'>
                                        <IconComponent className='h-3.5 w-3.5' />
                                        {matchingOption?.label || t.sumber_dana}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-foreground">{formatRupiah(t.harga_jual)}</p>
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${t.status === 'sukses' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.status}</span>
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(t as TransaksiType)}><Pencil className="h-4 w-4" /></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle className="text-card-foreground">Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data transaksi secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(t.id)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                          </div>
                      );
                      })}
                  </div>
              )}
              
              {pageCount > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                      <PaginationItem>
                          <PaginationPrevious 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
                              className={cn(currentPage === 1 ? 'pointer-events-none opacity-50' : undefined)}
                          />
                      </PaginationItem>
                      
                      <PaginationItem>
                          <PaginationLink href="#" isActive>
                              {currentPage}
                          </PaginationLink>
                      </PaginationItem>
                      
                      {pageCount > currentPage + 1 && (<PaginationItem><PaginationEllipsis /></PaginationItem>)}
                      {pageCount > currentPage && (
                        <PaginationItem>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(pageCount); }}>
                              {pageCount}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                          <PaginationNext 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.min(prev + 1, pageCount)); }}
                              className={cn(currentPage === pageCount ? 'pointer-events-none opacity-50' : undefined)}
                          />
                      </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
          </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Transaksi;