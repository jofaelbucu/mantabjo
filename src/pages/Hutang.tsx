import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Hutang as HutangType, Pelanggan as PelangganType } from '@/lib/supabase';
import { NumericFormat } from 'react-number-format';
import { useAuth } from '@/lib/AuthContext';

// --- (1) UPDATE ZOD SCHEMA ---
// Menambahkan tanggal_jatuh_tempo (opsional)
const hutangSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah hutang harus lebih dari 0'),
  pelanggan_id: z.string().optional(),
  tanggal_hutang: z.string().min(1, 'Tanggal wajib diisi'),
  tanggal_jatuh_tempo: z.string().optional(), // Tambahan baru
  jenis: z.enum(['usaha', 'non_usaha'], {
    required_error: 'Jenis hutang wajib dipilih',
  }),
  keterangan: z.string().optional(),
}).refine((data) => {
  if (data.jenis === 'usaha' && (!data.pelanggan_id || data.pelanggan_id === '')) {
    return false;
  }
  if (data.jenis === 'non_usaha' && (!data.keterangan || data.keterangan.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Pelanggan wajib dipilih untuk hutang usaha, dan keterangan wajib diisi untuk hutang non-usaha',
  path: ['pelanggan_id', 'keterangan'],
});

type HutangFormValues = z.infer<typeof hutangSchema>;

// Pastikan tipe ini sesuai dengan hasil generate Supaabase atau tambahkan manual
type HutangWithPelanggan = HutangType & {
  tanggal_jatuh_tempo?: string | null;
  pelanggan: PelangganType | null;
};

const Hutang = () => {
  const { user } = useAuth();
  const [hutangs, setHutangs] = useState<HutangWithPelanggan[]>([]);
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('semua');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<HutangFormValues>({
    resolver: zodResolver(hutangSchema),
    // --- (2) UPDATE DEFAULT VALUES ---
    defaultValues: {
      jumlah: 0,
      pelanggan_id: '',
      tanggal_hutang: new Date().toISOString().split('T')[0],
      tanggal_jatuh_tempo: '', // Tambahan baru
      jenis: 'usaha',
      keterangan: '',
    },
  });

  useEffect(() => {
    if (user) {
        fetchPelanggans();
        fetchHutangs();
    }
  }, [activeTab, user]);

  const fetchPelanggans = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('pelanggan')
        .select('*')
        .eq('user_id', user.id)
        .order('nama');
      if (error) throw error;
      setPelanggans(data || []);
    } catch (error) {
      console.error('Error fetching pelanggans:', error);
    }
  };

  const fetchHutangs = async () => {
    try {
      setLoading(true);
      if (!user) return;

      let query = supabase
        .from('hutang')
        .select('*, pelanggan:pelanggan_id(*)')
        .eq('user_id', user.id)
        .order('tanggal_hutang', { ascending: false });

      // --- (3) UPDATE FETCH LOGIC FOR NEW TAB ---
      if (activeTab === 'belum_lunas') {
        query = query.eq('status', 'belum_lunas');
      } else if (activeTab === 'lunas') {
        query = query.eq('status', 'lunas');
      } else if (activeTab === 'terlambat') {
        query = query.eq('status', 'terlambat');
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setHutangs(data || []);
    } catch (fetchError) {
      console.error('Error fetching hutangs:', fetchError);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: HutangFormValues) => {
    try {
      if (!user) {
        alert('Anda harus login terlebih dahulu');
        return;
      }

      // --- (4) UPDATE SUBMIT LOGIC ---
      const { error } = await supabase.from('hutang').insert({
        jumlah: values.jumlah,
        pelanggan_id: values.jenis === 'usaha' ? values.pelanggan_id : null,
        tanggal_hutang: values.tanggal_hutang,
        tanggal_jatuh_tempo: values.tanggal_jatuh_tempo || null, // Tambahkan ini
        status: 'belum_lunas',
        jenis: values.jenis,
        keterangan: values.keterangan || '',
        user_id: user.id,
      });

      if (error) throw error;
      
      reset();
      fetchHutangs();
      alert('Hutang berhasil disimpan!');
    } catch (error: any) {
      console.error('Error adding hutang:', error);
      alert('Gagal menyimpan hutang: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'lunas' | 'belum_lunas') => {
    try {
      const { error } = await supabase
        .from('hutang')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchHutangs();
    } catch (error) {
      console.error('Error updating hutang status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus hutang ini?')) {
        try {
            const { error } = await supabase
              .from('hutang')
              .delete()
              .eq('id', id);
            if (error) throw error;
            fetchHutangs();
          } catch (error) {
            console.error('Error deleting hutang:', error);
          }
    }
  };

  // --- (5) HELPER FUNCTION FOR STATUS BADGE ---
  const getStatusBadge = (status: 'lunas' | 'belum_lunas' | 'terlambat') => {
    switch (status) {
      case 'lunas':
        return <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Lunas</span>;
      case 'terlambat':
        return <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Terlambat</span>;
      case 'belum_lunas':
      default:
        return <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Belum Lunas</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Manajemen Hutang</h2>
        <p className="text-muted-foreground">Kelola hutang pelanggan usaha pulsa dan PPOB Anda</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Hutang</CardTitle>
            <CardDescription>Catat hutang baru untuk pelanggan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* ... field jenis, pelanggan, jumlah ... (tidak berubah) */}
                <div className="space-y-2">
                    <label htmlFor="jenis" className="text-sm font-medium">Jenis Hutang</label>
                    <div className="flex space-x-4 pt-1">
                        <div className="flex items-center"><input id="jenis-usaha" type="radio" value="usaha" className="h-4 w-4" {...register('jenis')} /><label htmlFor="jenis-usaha" className="ml-2 block text-sm">Usaha</label></div>
                        <div className="flex items-center"><input id="jenis-non-usaha" type="radio" value="non_usaha" className="h-4 w-4" {...register('jenis')} /><label htmlFor="jenis-non-usaha" className="ml-2 block text-sm">Non-Usaha</label></div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="pelanggan_id" className="text-sm font-medium">Pelanggan</label>
                    <select id="pelanggan_id" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" {...register('pelanggan_id')}>
                        <option value="">Pilih Pelanggan</option>
                        {pelanggans.map((p) => (<option key={p.id} value={p.id}>{p.nama}</option>))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="jumlah" className="text-sm font-medium">Jumlah Hutang</label>
                    <NumericFormat id="jumlah" thousandSeparator="." decimalSeparator="," prefix="Rp " placeholder="Rp 0" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" onValueChange={(v) => setValue('jumlah', v.floatValue || 0, { shouldValidate: true })}/>
                    {errors.jumlah && <p className="text-sm text-red-500">{errors.jumlah.message}</p>}
                </div>

              {/* --- (6) UPDATE FORM UI --- */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="tanggal_hutang" className="text-sm font-medium">Tanggal Hutang</label>
                  <input id="tanggal_hutang" type="date" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" {...register('tanggal_hutang')} />
                  {errors.tanggal_hutang && <p className="text-sm text-red-500">{errors.tanggal_hutang.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="tanggal_jatuh_tempo" className="text-sm font-medium">Tanggal Jatuh Tempo</label>
                  <input id="tanggal_jatuh_tempo" type="date" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" {...register('tanggal_jatuh_tempo')} />
                </div>
              </div>

              <div className="space-y-2">
                  <label htmlFor="keterangan" className="text-sm font-medium">Keterangan</label>
                  <input id="keterangan" type="text" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Contoh: Pulsa 50rb, dll" {...register('keterangan')} />
                  {errors.keterangan && <p className="text-sm text-red-500">{errors.keterangan.message}</p>}
              </div>

              <Button type="submit" className="w-full">Simpan Hutang</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Hutang</CardTitle>
            <CardDescription>Semua hutang pelanggan yang tercatat</CardDescription>
          </CardHeader>
          <CardContent>
            {/* --- (7) UPDATE TABS UI --- */}
            <Tabs defaultValue="semua" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="semua">Semua</TabsTrigger>
                <TabsTrigger value="belum_lunas">Belum Lunas</TabsTrigger>
                <TabsTrigger value="terlambat">Terlambat</TabsTrigger>
                <TabsTrigger value="lunas">Lunas</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab} className="mt-4">
                {loading ? (<p>Loading...</p>) : hutangs.length === 0 ? (<p className="text-center text-muted-foreground">Belum ada data hutang</p>) : (
                  <div className="space-y-4">
                    {hutangs.map((hutang) => (
                      <div key={hutang.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{hutang.jenis === 'usaha' ? hutang.pelanggan?.nama : hutang.keterangan}</p>
                          <p className="text-sm font-bold">{formatRupiah(hutang.jumlah)}</p>
                          {/* --- (8) UPDATE DISPLAY LIST --- */}
                          <p className="text-xs text-muted-foreground">
                            Tgl: {formatTanggal(hutang.tanggal_hutang)}
                            {hutang.tanggal_jatuh_tempo && (
                              <span className='ml-2'>| Jatuh Tempo: {formatTanggal(hutang.tanggal_jatuh_tempo)}</span>
                            )}
                          </p>
                          <div className="flex space-x-2 mt-1">
                            {getStatusBadge(hutang.status as any)}
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${hutang.jenis === 'usaha' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                              {hutang.jenis === 'usaha' ? 'Usaha' : 'Non-Usaha'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {hutang.status !== 'lunas' && (
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange(hutang.id, 'lunas')}>Tandai Lunas</Button>
                          )}
                           {hutang.status === 'lunas' && (
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange(hutang.id, 'belum_lunas')}>Tandai Belum Lunas</Button>
                           )}
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(hutang.id)}>Hapus</Button>
                        </div>
                      </div>
                    ))}
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