import { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { Pelanggan as PelangganType } from '@/lib/supabase';

const pelangganSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  nomor_hp: z.string().min(1, 'Nomor HP wajib diisi'),
  alamat: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional(),
  status: z.enum(['aktif', 'non_aktif']),
});

type PelangganFormValues = z.infer<typeof pelangganSchema>;

const Pelanggan = () => {
  const [pelanggans, setPelanggans] = useState<PelangganType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PelangganFormValues>({
    resolver: zodResolver(pelangganSchema) as Resolver<PelangganFormValues>,
    defaultValues: {
      status: 'aktif',
      nama: '',
      nomor_hp: '',
      alamat: '',
      email: '',
    },
  });

  useEffect(() => {
    fetchPelanggans();
  }, []);

  const fetchPelanggans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pelanggan')
        .select('*')
        .order('nama');

      if (error) throw error;
      setPelanggans(data || []);
    } catch (error) {
      console.error('Error fetching pelanggans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: PelangganFormValues) => {
    try {
      if (editingId) {
        // Update existing pelanggan
        const { error } = await supabase
          .from('pelanggan')
          .update({
            nama: values.nama,
            nomor_hp: values.nomor_hp,
            alamat: values.alamat,
            email: values.email,
            status: values.status,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Add new pelanggan
        const { error } = await supabase.from('pelanggan').insert({
          nama: values.nama,
          nomor_hp: values.nomor_hp,
          alamat: values.alamat,
          email: values.email,
          status: values.status,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

        if (error) throw error;
      }
      
      reset();
      setEditingId(null);
      fetchPelanggans();
    } catch (error) {
      console.error('Error saving pelanggan:', error);
    }
  };

  const handleEdit = (pelanggan: PelangganType) => {
    setEditingId(pelanggan.id);
    setValue('nama', pelanggan.nama);
    setValue('nomor_hp', pelanggan.nomor_hp);
    setValue('email', pelanggan.email || '');
    setValue('status', pelanggan.status);
    setValue('alamat', pelanggan.alamat || '');
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if pelanggan has related records
      const { data: hutangData, error: hutangError } = await supabase
        .from('hutang')
        .select('id')
        .eq('pelanggan_id', id)
        .limit(1);

      if (hutangError) throw hutangError;

      const { data: transaksiData, error: transaksiError } = await supabase
        .from('transaksi')
        .select('id')
        .eq('pelanggan_id', id)
        .limit(1);

      if (transaksiError) throw transaksiError;

      if (hutangData?.length > 0 || transaksiData?.length > 0) {
        const confirmNonAktif = window.confirm(
          'Pelanggan ini memiliki data transaksi atau hutang terkait. Apakah Anda ingin mengubah status menjadi non-aktif sebagai gantinya?'
        );

        if (confirmNonAktif) {
          const { error: updateError } = await supabase
            .from('pelanggan')
            .update({ status: 'non_aktif' })
            .eq('id', id);

          if (updateError) throw updateError;
          fetchPelanggans();
          return;
        }
        return;
      }

      const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus pelanggan ini?');
      
      if (confirmDelete) {
        const { error } = await supabase
          .from('pelanggan')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchPelanggans();
      }
    } catch (error) {
      console.error('Error managing pelanggan:', error);
      alert('Terjadi kesalahan saat mengelola data pelanggan');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Manajemen Pelanggan</h2>
        <p className="text-muted-foreground">
          Kelola data pelanggan usaha pulsa dan PPOB Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</CardTitle>
            <CardDescription>
              {editingId ? 'Perbarui data pelanggan' : 'Tambahkan pelanggan baru'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="nama" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nama
                </label>
                <input
                  id="nama"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('nama')}
                />
                {errors.nama && (
                  <p className="text-sm text-red-500">{errors.nama.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="nomor_hp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nomor HP
                </label>
                <input
                  id="nomor_hp"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('nomor_hp')}
                />
                {errors.nomor_hp && (
                  <p className="text-sm text-red-500">{errors.nomor_hp.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email (Opsional)
                </label>
                <input
                  id="email"
                  type="email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="alamat" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Alamat (Opsional)
                </label>
                <textarea
                  id="alamat"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('alamat')}
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Perbarui' : 'Simpan'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pelanggan</CardTitle>
            <CardDescription>
              Semua pelanggan yang telah terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : pelanggans.length === 0 ? (
              <p className="text-center text-muted-foreground">Belum ada data pelanggan</p>
            ) : (
              <div className="space-y-4">
                {pelanggans.map((pelanggan) => (
                  <div key={pelanggan.id} className="flex justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{pelanggan.nama}</p>
                      <p className="text-sm">{pelanggan.nomor_hp}</p>
                      {pelanggan.alamat && (
                        <p className="text-xs text-muted-foreground">{pelanggan.alamat}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pelanggan)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(pelanggan.id)}
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

export default Pelanggan;