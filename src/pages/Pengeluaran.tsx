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

const pengeluaranSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah pengeluaran harus lebih dari 0'),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  keuntungan: z.number(),
  keterangan: z.string().min(1, 'Keterangan wajib diisi'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['usaha', 'non_usaha'], {
    required_error: 'Kategori pengeluaran wajib dipilih',
  }),
});

type PengeluaranFormValues = z.infer<typeof pengeluaranSchema>;

const Pengeluaran = () => {
  const [pengeluarans, setPengeluarans] = useState<PengeluaranType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<'date' | 'month' | 'year'>('date');

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<PengeluaranFormValues>({
    resolver: zodResolver(pengeluaranSchema),
    defaultValues: {
      jumlah: 0,
      harga_jual: 0,
      keuntungan: 0,
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
      kategori: 'usaha',
    },
  });

  useEffect(() => {
    fetchPengeluarans();
  }, [filterType, filterDate, filterMonth, filterYear]);

  const fetchPengeluarans = async () => {
    setLoading(true);
    try {
      let query = supabase.from('pengeluaran').select('*');

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
    } catch (error) {
      console.error('Error fetching pengeluarans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: PengeluaranFormValues) => {
    try {
      // Hilangkan format 'Rp ' dan pemisah ribuan sebelum menyimpan ke database
      const jumlah = Number(String(values.jumlah).replace(/[^0-9-]/g, ''));
      const hargaJual = Number(String(values.harga_jual).replace(/[^0-9-]/g, ''));
      const keuntungan = Number(String(values.keuntungan).replace(/[^0-9-]/g, ''));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('pengeluaran').insert({
        user_id: user.id,
        jumlah: jumlah,
        harga_jual: hargaJual,
        keuntungan: keuntungan,
        keterangan: values.keterangan,
        tanggal: values.tanggal,
        kategori: values.kategori,
      });

      if (error) throw error;
      
      reset();
      fetchPengeluarans();
    } catch (error) {
      console.error('Error adding pengeluaran:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pengeluaran')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPengeluarans();
    } catch (error) {
      console.error('Error deleting pengeluaran:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengeluaran Harian</h2>
        <p className="text-muted-foreground">
          Catat semua pengeluaran usaha pulsa dan PPOB Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Pengeluaran</CardTitle>
            <CardDescription>
              Catat pengeluaran baru untuk usaha Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="harga_jual" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                        // Hitung keuntungan otomatis
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                />
                {errors.harga_jual && (
                  <p className="text-sm text-red-500">{errors.harga_jual.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="jumlah" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Jumlah Pengeluaran (Rp)
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
                        // Hitung ulang keuntungan
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                />
                {errors.jumlah && (
                  <p className="text-sm text-red-500">{errors.jumlah.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="keuntungan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="keterangan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Keterangan
                </label>
                <input
                  id="keterangan"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Contoh: Beli pulsa, Bayar listrik, dll"
                  {...register('keterangan')}
                />
                {errors.keterangan && (
                  <p className="text-sm text-red-500">{errors.keterangan.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="tanggal" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Tanggal
                </label>
                <input
                  id="tanggal"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('tanggal')}
                />
                {errors.tanggal && (
                  <p className="text-sm text-red-500">{errors.tanggal.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="kategori" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Kategori Pengeluaran
                </label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="kategori-usaha"
                      type="radio"
                      value="usaha"
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      {...register('kategori')}
                    />
                    <label htmlFor="kategori-usaha" className="ml-2 block text-sm font-medium text-gray-700">
                      Usaha (Pulsa & PPOB)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="kategori-non-usaha"
                      type="radio"
                      value="non_usaha"
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      {...register('kategori')}
                    />
                    <label htmlFor="kategori-non-usaha" className="ml-2 block text-sm font-medium text-gray-700">
                      Non-Usaha (Pribadi)
                    </label>
                  </div>
                </div>
                {errors.kategori && (
                  <p className="text-sm text-red-500">{errors.kategori.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full">
                Simpan Pengeluaran
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pengeluaran</CardTitle>
            <CardDescription>
              Daftar pengeluaran yang telah dicatat
            </CardDescription>
            <div className="mt-4 space-y-4">
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="filter-date"
                    value="date"
                    checked={filterType === 'date'}
                    onChange={(e) => setFilterType(e.target.value as 'date')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="filter-date" className="ml-2 text-sm">
                    Filter per Tanggal
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="filter-month"
                    value="month"
                    checked={filterType === 'month'}
                    onChange={(e) => setFilterType(e.target.value as 'month')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="filter-month" className="ml-2 text-sm">
                    Filter per Bulan
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="filter-year"
                    value="year"
                    checked={filterType === 'year'}
                    onChange={(e) => setFilterType(e.target.value as 'year')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="filter-year" className="ml-2 text-sm">
                    Filter per Tahun
                  </label>
                </div>
              </div>
              {filterType === 'date' && (
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
              {filterType === 'month' && (
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
              {filterType === 'year' && (
                <input
                  type="number"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  min="2000"
                  max="2099"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : pengeluarans.length === 0 ? (
              <p className="text-center text-muted-foreground">Belum ada data pengeluaran</p>
            ) : (
              <div className="space-y-4">
                {pengeluarans.map((pengeluaran) => (
                  <div key={pengeluaran.id} className="flex justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{formatRupiah(pengeluaran.jumlah)}</p>
                      <p className="text-sm">{pengeluaran.keterangan}</p>
                      <p className="text-xs text-muted-foreground">{formatTanggal(pengeluaran.tanggal)}</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pengeluaran.kategori === 'usaha' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {pengeluaran.kategori === 'usaha' ? 'Usaha' : 'Non-Usaha'}
                      </span>
                    </div>
                    <div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(pengeluaran.id)}
                      >
                        Hapus
                      </Button>
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

export default Pengeluaran;