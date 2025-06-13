import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Hutang as HutangType, Pelanggan as PelangganType } from '@/lib/supabase';
import { NumericFormat } from 'react-number-format';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Wallet, Landmark, CreditCard, Smartphone, Check, X, UserSearch, XCircle } from 'lucide-react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const hutangSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah hutang harus lebih dari 0'),
  pelanggan_id: z.string().optional(),
  tanggal_hutang: z.string().min(1, 'Tanggal wajib diisi'),
  tanggal_jatuh_tempo: z.string().optional(),
  jenis: z.enum(['usaha', 'non_usaha']),
  keterangan: z.string().optional(),
  sumber_dana: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
}).refine((data) => {
  if (data.jenis === 'usaha' && (!data.pelanggan_id || data.pelanggan_id === '')) {
    return false;
  }
  if (data.jenis === 'non_usaha' && (!data.keterangan || data.keterangan.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Pelanggan wajib untuk hutang usaha, Keterangan wajib untuk non-usaha.',
  path: ['pelanggan_id', 'keterangan'],
});

type HutangFormValues = z.infer<typeof hutangSchema>;

type HutangWithPelanggan = HutangType & {
  pelanggan: PelangganType | null;
};

const Hutang = () => {
  const { user } = useAuth();
  const [hutangs, setHutangs] = useState<HutangWithPelanggan[]>([]);
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('belum_lunas');
  const [customerSearch, setCustomerSearch] = useState('');

  const sumberDanaOptions = [
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'seabank', label: 'Seabank', icon: Landmark },
    { id: 'gopay', label: 'Gopay', icon: CreditCard },
    { id: 'aplikasi_isipulsa', label: 'Aplikasi IsiPulsa', icon: Smartphone },
  ];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<HutangFormValues>({
    resolver: zodResolver(hutangSchema),
    defaultValues: {
      jumlah: 0,
      pelanggan_id: '',
      tanggal_hutang: new Date().toISOString().split('T')[0],
      tanggal_jatuh_tempo: '',
      jenis: 'usaha',
      keterangan: '',
      sumber_dana: 'cash',
    },
  });
  
  const jenisHutang = watch('jenis');
  const selectedPelangganId = watch('pelanggan_id');
  const selectedPelanggan = pelanggans.find(p => p.id === selectedPelangganId);
  
  const filteredPelanggans = pelanggans.filter(p => 
    p.nama.toLowerCase().includes(customerSearch.toLowerCase()) ||
    p.nomor_hp?.includes(customerSearch)
  );

  useEffect(() => {
    if (user) {
        fetchPelanggans();
        fetchHutangs();
    }
  }, [activeTab, user]);

  const fetchPelanggans = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('pelanggan').select('*').eq('user_id', user.id).order('nama');
    if (error) {
        console.error("Supabase Pelanggan Fetch Error:", error);
        toast({ title: 'Error', description: `Gagal mengambil data pelanggan: ${error.message}. Cek console.`, variant: 'destructive' });
    } else {
        setPelanggans(data || []);
    }
  };

  const fetchHutangs = async () => {
    setLoading(true);
    if (!user) return;
    try {
      let query = supabase
        .from('hutang')
        .select('*, pelanggan:pelanggan_id(*)')
        .eq('user_id', user.id)
        .order('tanggal_hutang', { ascending: false });

      if (activeTab === 'belum_lunas') {
        query = query.eq('status', 'belum_lunas').or(`tanggal_jatuh_tempo.is.null,tanggal_jatuh_tempo.gte.${new Date().toISOString()}`);
      } else if (activeTab === 'lunas') {
        query = query.eq('status', 'lunas');
      } else if (activeTab === 'terlambat') {
        query = query.eq('status', 'belum_lunas').lt('tanggal_jatuh_tempo', new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setHutangs(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: `Gagal mengambil data hutang: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: HutangFormValues) => {
    setIsSubmitting(true);
    if (!user) return;
    try {
      const { error } = await supabase.from('hutang').insert({
        jumlah: values.jumlah,
        pelanggan_id: values.jenis === 'usaha' ? values.pelanggan_id : null,
        tanggal_hutang: values.tanggal_hutang,
        tanggal_jatuh_tempo: values.tanggal_jatuh_tempo || null,
        status: 'belum_lunas',
        jenis: values.jenis,
        keterangan: values.keterangan || '',
        sumber_dana: values.sumber_dana,
        user_id: user.id,
      });

      if (error) throw error;
      
      toast({ title: "Berhasil", description: "Hutang berhasil disimpan." });
      reset();
      setCustomerSearch('');
      fetchHutangs();
    } catch (error: any) {
      toast({ title: 'Gagal', description: 'Gagal menyimpan hutang: ' + error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- FUNGSI YANG SEDANG KITA SELIDIKI ---
  const handleStatusChange = async (id: string, newStatus: 'lunas' | 'belum_lunas') => {
    // 1. Pesan ini akan muncul di console saat fungsi pertama kali dijalankan
    console.log(`Mencoba mengubah status untuk ID: ${id} menjadi ${newStatus}`);

    try {
      // 2. Kita tambahkan .select() di akhir untuk meminta Supabase mengembalikan data yang diubah
      const { data, error } = await supabase
        .from('hutang')
        .update({ status: newStatus, tanggal_lunas: newStatus === 'lunas' ? new Date().toISOString() : null })
        .eq('id', id)
        .select(); // <-- Penambahan .select() sangat penting untuk debugging

      // 3. Jika ada error dari Supabase, kita cetak di console
      if (error) {
        console.error("ERROR DARI SUPABASE:", error);
        throw error;
      }
      
      // 4. Jika berhasil, kita lihat data apa yang berhasil diubah
      console.log("UPDATE BERHASIL:", data);

      toast({ title: "Status Diperbarui", description: "Status hutang telah berhasil diubah." });
      
      fetchHutangs();
    } catch (error: any) {
      // 5. Cetak error apa pun yang tertangkap di blok catch
      console.error("GAGAL DALAM BLOK CATCH:", error);
      toast({ title: "Error", description: `Gagal memperbarui status: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
        const { error } = await supabase.from('hutang').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Hutang berhasil dihapus." });
        fetchHutangs();
    } catch (error: any) {
        toast({ title: "Gagal", description: `Gagal menghapus hutang: ${error.message}`, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: 'lunas' | 'belum_lunas', jatuhTempo: string | null | undefined) => {
    const isTerlambat = status === 'belum_lunas' && jatuhTempo && new Date(jatuhTempo) < new Date();
    if (isTerlambat) {
        return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-800">Terlambat</span>;
    }
    switch (status) {
      case 'lunas':
        return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-800">Lunas</span>;
      case 'belum_lunas':
      default:
        return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">Belum Lunas</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-black">Manajemen Hutang</h2>
        <p className="text-black">Kelola hutang pelanggan dan pinjaman lainnya</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Tambah Hutang</CardTitle>
            <CardDescription className="text-black">Catat hutang baru untuk pelanggan atau pinjaman</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Jenis Hutang</label>
                    <div className="flex space-x-4 pt-1">
                        <div className="flex items-center"><input id="jenis-usaha" type="radio" value="usaha" className="h-4 w-4" {...register('jenis')} /><label htmlFor="jenis-usaha" className="ml-2 block text-sm text-black">Usaha</label></div>
                        <div className="flex items-center"><input id="jenis-non-usaha" type="radio" value="non_usaha" className="h-4 w-4" {...register('jenis')} /><label htmlFor="jenis-non-usaha" className="ml-2 block text-sm text-black">Non-Usaha</label></div>
                    </div>
                </div>

                {jenisHutang === 'usaha' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Pelanggan (Wajib untuk jenis Usaha)</label>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger className="text-black border border-gray-300 rounded-md px-3 text-sm hover:no-underline">
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
                                  setValue('pelanggan_id', '', { shouldValidate: true });
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
                                  setValue('pelanggan_id', p.id, { shouldValidate: true });
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
                  </div>
                )}
                
                <div className="space-y-2">
                    <label htmlFor="jumlah" className="text-sm font-medium text-black">Jumlah Hutang</label>
                    <NumericFormat id="jumlah" thousandSeparator="." decimalSeparator="," prefix="Rp " placeholder="Rp 0" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" onValueChange={(v) => setValue('jumlah', v.floatValue || 0, { shouldValidate: true })}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="tanggal_hutang" className="text-sm font-medium text-black">Tanggal Hutang</label>
                    <input id="tanggal_hutang" type="date" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" {...register('tanggal_hutang')} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="tanggal_jatuh_tempo" className="text-sm font-medium text-black">Jatuh Tempo (Opsional)</label>
                    <input id="tanggal_jatuh_tempo" type="date" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" {...register('tanggal_jatuh_tempo')} />
                  </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="keterangan" className="text-sm font-medium text-black">Keterangan {jenisHutang === 'non_usaha' && '(Wajib untuk jenis Non-Usaha)'}</label>
                    <Input id="keterangan" type="text" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" placeholder="Contoh: Pinjam uang, Pulsa 50rb, dll" {...register('keterangan')} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">Sumber Dana</label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                    {sumberDanaOptions.map(option => (
                      <div className="flex items-center" key={option.id}>
                        <input id={`sumber_dana_hutang-${option.id}`} type="radio" value={option.id} className="h-4 w-4 border-gray-300" {...register('sumber_dana')} />
                        <label htmlFor={`sumber_dana_hutang-${option.id}`} className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
                          <option.icon className="h-5 w-5 text-gray-600" />
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Hutang'}
                </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-black">Daftar Hutang</CardTitle>
            <CardDescription className="text-black">Semua hutang yang tercatat</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="belum_lunas" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="belum_lunas">Belum Lunas</TabsTrigger>
                <TabsTrigger value="terlambat">Terlambat</TabsTrigger>
                <TabsTrigger value="lunas">Lunas</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab} className="mt-4">
                {loading ? (<div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-black" /></div>) : hutangs.length === 0 ? (<p className="text-center text-black py-6">Belum ada data hutang</p>) : (
                  <div className="space-y-4">
                    {hutangs.map((hutang) => {
                       const matchingOption = sumberDanaOptions.find(opt => opt.id === hutang.sumber_dana);
                       const IconComponent = matchingOption?.icon || Wallet;
                      return (
                        <div key={hutang.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium text-black">{hutang.jenis === 'usaha' ? hutang.pelanggan?.nama : hutang.keterangan}</p>
                            <p className="text-sm font-bold text-black">{formatRupiah(hutang.jumlah)}</p>
                            <p className="text-xs text-black">
                              Tgl: {formatTanggal(hutang.tanggal_hutang)}
                              {hutang.tanggal_jatuh_tempo && (<span className='ml-2'>| Jatuh Tempo: {formatTanggal(hutang.tanggal_jatuh_tempo)}</span>)}
                            </p>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              {getStatusBadge(hutang.status, hutang.tanggal_jatuh_tempo)}
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${hutang.jenis === 'usaha' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                {hutang.jenis === 'usaha' ? 'Usaha' : 'Non-Usaha'}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-xs text-black">
                                <IconComponent className="h-3.5 w-3.5" />
                                {matchingOption?.label || hutang.sumber_dana}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            {hutang.status !== 'lunas' && (
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(hutang.id, 'lunas')} className='flex items-center gap-1'>
                                <Check className='h-4 w-4'/> Tandai Lunas
                              </Button>
                            )}
                            {hutang.status === 'lunas' && (
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(hutang.id, 'belum_lunas')} className='flex items-center gap-1'>
                                 <X className='h-4 w-4'/> Batal Lunas
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">Hapus</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-black">Anda Yakin?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-black">
                                    Tindakan ini akan menghapus data hutang secara permanen.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDelete(hutang.id)}
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
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Hutang;