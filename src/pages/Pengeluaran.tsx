import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { NumericFormat } from 'react-number-format';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Pengeluaran as PengeluaranType } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Wallet, Landmark, CreditCard, Smartphone } from 'lucide-react';

// Skema Zod disesuaikan dengan standar baru (lowercase dan snake_case)
const pengeluaranSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah pengeluaran harus lebih dari 0'),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  keuntungan: z.number(),
  keterangan: z.string().min(1, 'Keterangan wajib diisi'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['usaha', 'non_usaha']),
  sumber_dana: z.enum(['cash', 'seabank', 'gopay', 'aplikasi_isipulsa']),
});

type PengeluaranFormValues = z.infer<typeof pengeluaranSchema>;

const Pengeluaran = () => {
  const { user } = useAuth();
  const [pengeluarans, setPengeluarans] = useState<PengeluaranType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<'date' | 'month' | 'year'>('date');

  // Opsi disesuaikan dengan standar baru (id menggunakan lowercase)
  const sumberDanaOptions = [
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'seabank', label: 'Seabank', icon: Landmark },
    { id: 'gopay', label: 'Gopay', icon: CreditCard },
    { id: 'aplikasi_isipulsa', label: 'Aplikasi IsiPulsa', icon: Smartphone },
  ];

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<PengeluaranFormValues>({
    resolver: zodResolver(pengeluaranSchema),
    defaultValues: {
      jumlah: 0,
      harga_jual: 0,
      keuntungan: 0,
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
      kategori: 'usaha',
      sumber_dana: 'cash',
    },
  });

  useEffect(() => {
    if (user) {
        fetchPengeluarans();
    }
  }, [user, filterType, filterDate, filterMonth, filterYear]);

  const fetchPengeluarans = async () => {
    setLoading(true);
    if (!user) return;
    try {
      let query = supabase.from('pengeluaran').select('*').eq('user_id', user.id);

      if (filterType === 'date') {
        query = query.eq('tanggal', filterDate);
      } else if (filterType === 'month') {
        const [year, month] = filterMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;
        query = query.gte('tanggal', startDate).lte('tanggal', endDate);
      } else if (filterType === 'year') {
        query = query.gte('tanggal', `${filterYear}-01-01`).lte('tanggal', `${filterYear}-12-31`);
      }

      const { data, error } = await query.order('tanggal', { ascending: false });

      if (error) throw error;
      setPengeluarans(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: `Gagal mengambil data pengeluaran: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: PengeluaranFormValues) => {
    setIsSubmitting(true);
    if (!user) return;
    try {
      // Pengiriman data yang bersih tanpa transformasi
      const { error } = await supabase.from('pengeluaran').insert({
        user_id: user.id,
        jumlah: values.jumlah,
        harga_jual: values.harga_jual,
        keuntungan: values.keuntungan,
        keterangan: values.keterangan,
        tanggal: values.tanggal,
        kategori: values.kategori,
        sumber_dana: values.sumber_dana,
      });

      if (error) throw error;
      
      toast({ title: "Berhasil", description: "Pengeluaran berhasil dicatat." });
      reset();
      fetchPengeluarans();
    } catch (error: any) {
      console.error("Supabase Error Details:", error);
      toast({ title: "Gagal", description: `Gagal menyimpan pengeluaran: ${error.message}. Cek console.`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('pengeluaran').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Pengeluaran berhasil dihapus." });
      fetchPengeluarans();
    } catch (error: any) {
      toast({ title: "Gagal", description: `Gagal menghapus pengeluaran: ${error.message}`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-black">Pengeluaran Harian</h2>
        <p className="text-black">
          Catat semua pengeluaran usaha pulsa dan PPOB Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Tambah Pengeluaran</CardTitle>
            <CardDescription className="text-black">
              Catat pengeluaran baru untuk usaha Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="harga_jual" className="text-sm font-medium text-black">
                  Harga Jual (Rp)
                </label>
                <Controller
                  name="harga_jual"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <NumericFormat
                      id="harga_jual"
                      value={value}
                      onValueChange={(v) => {
                        const hargaJual = v.floatValue || 0;
                        onChange(hargaJual);
                        const jumlahBeli = watch('jumlah');
                        const keuntungan = jumlahBeli > hargaJual ? 0 : hargaJual - jumlahBeli;
                        setValue('keuntungan', keuntungan);
                      }}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="Rp "
                      allowNegative={false}
                      decimalScale={0}
                      placeholder="Contoh: 15.000"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="jumlah" className="text-sm font-medium text-black">
                  Harga Beli / Modal (Rp)
                </label>
                <Controller
                  name="jumlah"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <NumericFormat
                      id="jumlah"
                      value={value}
                      onValueChange={(v) => {
                        const jumlahBeli = v.floatValue || 0;
                        onChange(jumlahBeli);
                        const hargaJual = watch('harga_jual');
                        const keuntungan = jumlahBeli > hargaJual ? 0 : hargaJual - jumlahBeli;
                        setValue('keuntungan', keuntungan);
                      }}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="Rp "
                      allowNegative={false}
                      decimalScale={0}
                      placeholder="Contoh: 10.000"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="keuntungan" className="text-sm font-medium text-black">
                  Keuntungan (Rp)
                </label>
                <Controller
                  name="keuntungan"
                  control={control}
                  render={({ field: { value } }) => (
                    <NumericFormat
                      id="keuntungan"
                      value={value}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="Rp "
                      readOnly
                      disabled
                      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-black"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="keterangan" className="text-sm font-medium text-black">
                  Keterangan
                </label>
                <input id="keterangan" type="text" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" placeholder="Contoh: Beli pulsa, Bayar listrik, dll" {...register('keterangan')} />
              </div>

              <div className="space-y-2">
                <label htmlFor="tanggal" className="text-sm font-medium text-black">
                  Tanggal
                </label>
                <input id="tanggal" type="date" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" {...register('tanggal')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Kategori Pengeluaran
                </label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input id="kategori-usaha" type="radio" value="usaha" className="h-4 w-4 border-gray-300" {...register('kategori')} />
                    <label htmlFor="kategori-usaha" className="ml-2 block text-sm font-medium text-black"> Usaha (Modal) </label>
                  </div>
                  <div className="flex items-center">
                    <input id="kategori-non-usaha" type="radio" value="non_usaha" className="h-4 w-4 border-gray-300" {...register('kategori')} />
                    <label htmlFor="kategori-non-usaha" className="ml-2 block text-sm font-medium text-black"> Non-Usaha (Pribadi) </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Sumber Dana
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                  {sumberDanaOptions.map(option => (
                    <div className="flex items-center" key={option.id}>
                      <input id={`sumber_dana-${option.id}`} type="radio" value={option.id} className="h-4 w-4 border-gray-300" {...register('sumber_dana')} />
                      <label htmlFor={`sumber_dana-${option.id}`} className="ml-2 flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
                        <option.icon className="h-5 w-5 text-gray-600" />
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-black">Riwayat Pengeluaran</CardTitle>
            <CardDescription className="text-black"> Daftar pengeluaran yang telah dicatat </CardDescription>
            <div className="mt-4 space-y-4">
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input type="radio" id="filter-date" value="date" checked={filterType === 'date'} onChange={(e) => setFilterType(e.target.value as 'date')} className="h-4 w-4 border-gray-300" />
                  <label htmlFor="filter-date" className="ml-2 text-sm text-black"> Filter per Tanggal </label>
                </div>
                <div className="flex items-center">
                  <input type="radio" id="filter-month" value="month" checked={filterType === 'month'} onChange={(e) => setFilterType(e.target.value as 'month')} className="h-4 w-4 border-gray-300" />
                  <label htmlFor="filter-month" className="ml-2 text-sm text-black"> Filter per Bulan </label>
                </div>
                <div className="flex items-center">
                  <input type="radio" id="filter-year" value="year" checked={filterType === 'year'} onChange={(e) => setFilterType(e.target.value as 'year')} className="h-4 w-4 border-gray-300" />
                  <label htmlFor="filter-year" className="ml-2 text-sm text-black"> Filter per Tahun </label>
                </div>
              </div>
              {filterType === 'date' && ( <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" /> )}
              {filterType === 'month' && ( <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" /> )}
              {filterType === 'year' && ( <input type="number" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} min="2000" max="2099" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-black" /> )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? ( <p className="text-center text-black">Loading...</p> ) : pengeluarans.length === 0 ? ( <p className="text-center text-black">Belum ada data pengeluaran</p> ) : (
              <div className="space-y-4">
                {pengeluarans.map((pengeluaran) => {
                  const matchingOption = sumberDanaOptions.find(opt => opt.id === pengeluaran.sumber_dana);
                  const IconComponent = matchingOption?.icon || Wallet;
                  
                  return (
                    <div key={pengeluaran.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium text-black">{formatRupiah(pengeluaran.jumlah)}</p>
                        <p className="text-sm text-black">{pengeluaran.keterangan}</p>
                        <p className="text-xs text-black">{formatTanggal(pengeluaran.tanggal)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pengeluaran.kategori === 'usaha' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {pengeluaran.kategori === 'usaha' ? 'Usaha' : 'Non-Usaha'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-black">
                            <IconComponent className="h-3.5 w-3.5" />
                            {matchingOption?.label || pengeluaran.sumber_dana}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(pengeluaran.id)}>
                          Hapus
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pengeluaran;