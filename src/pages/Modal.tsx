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
import type { Modal as ModalType } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { NumericFormat } from 'react-number-format';
import { Loader2 } from 'lucide-react';

const modalSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah modal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  keterangan: z.string().optional(),
});

type ModalFormValues = z.infer<typeof modalSchema>;

const Modal = () => {
  const { user } = useAuth();
  const [modals, setModals] = useState<ModalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingModal, setEditingModal] = useState<ModalType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<ModalFormValues>({
    resolver: zodResolver(modalSchema),
    defaultValues: {
      jumlah: 0,
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchModals();
    }
  }, [user]);

  const fetchModals = async () => {
    setLoading(true);
    if (!user) return;
    try {
      const { data, error } = await supabase.from('modals').select('*').eq('user_id', user.id).order('tanggal', { ascending: false });
      if (error) throw error;
      setModals(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDialogForEdit = (modal: ModalType) => {
    setEditingModal(modal);
    setValue('jumlah', modal.jumlah);
    setValue('tanggal', modal.tanggal_hutang); // Handle both potential field names
    setValue('keterangan', modal.keterangan || '');
    setIsDialogOpen(true);
  };

  const openDialogForNew = () => {
    setEditingModal(null);
    reset({
        jumlah: 0,
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
    });
    setIsDialogOpen(true);
  }

  const onSubmit = async (values: ModalFormValues) => {
    setIsSubmitting(true);
    if (!user) {
        toast({ title: 'Error', description: "User tidak ditemukan", variant: 'destructive'});
        setIsSubmitting(false);
        return;
    };

    const modalData = {
        jumlah: values.jumlah,
        tanggal: values.tanggal,
        keterangan: values.keterangan,
        user_id: user.id,
    };

    try {
      let error;
      if (editingModal) {
        // Update
        const { error: updateError } = await supabase.from('modals').update(modalData).eq('id', editingModal.id);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase.from('modals').insert(modalData);
        error = insertError;
      }

      if (error) throw error;
      
      toast({ title: 'Berhasil', description: `Modal berhasil ${editingModal ? 'diperbarui' : 'ditambahkan'}` });
      setIsDialogOpen(false);
      fetchModals();

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manajemen Modal</h2>
          <p className="text-muted-foreground">Kelola modal usaha Anda.</p>
        </div>
        <Button onClick={openDialogForNew}>Tambah Modal</Button>
      </div>
      <Card>
          <CardHeader>
            <CardTitle>Riwayat Modal</CardTitle>
            <CardDescription>Daftar modal yang telah ditambahkan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin"/></div>
            ) : modals.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Belum ada data modal</p>
            ) : (
              <div className="space-y-4">
                {modals.map((modal) => (
                  <div key={modal.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{formatRupiah(modal.jumlah)}</p>
                      <p className="text-sm text-muted-foreground">{formatTanggal(modal.tanggal_hutang)}</p>
                       {modal.keterangan && <p className="text-xs text-gray-500">{modal.keterangan}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openDialogForEdit(modal)}>Edit</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModal ? 'Edit Modal' : 'Tambah Modal Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah Modal (Rp)</Label>
                <Controller
                  name="jumlah"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      id="jumlah"
                      value={field.value}
                      onValueChange={(v) => field.onChange(v.floatValue || 0)}
                      thousandSeparator="." decimalSeparator="," prefix="Rp "
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Controller
                    name="tanggal"
                    control={control}
                    render={({ field }) => <Input id="tanggal" type="date" {...field} />}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                <Controller
                    name="keterangan"
                    control={control}
                    render={({ field }) => <Input id="keterangan" {...field} />}
                />
              </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Modal;