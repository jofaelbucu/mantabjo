import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password dan konfirmasi password tidak sama',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      
      if (!data.session) {
        // Jika perlu verifikasi email
        setRegisterSuccess(true);
      } else {
        // Jika auto-confirm aktif, langsung arahkan
        navigate('/login', { state: { message: 'Registrasi berhasil! Silakan login.' } });
      }
      
    } catch (error: any) {
      if (error && error.message.includes('User already registered')) {
        setError('Email ini sudah terdaftar. Silakan gunakan email lain atau login.');
      } else {
        setError(error.message || 'Terjadi kesalahan saat registrasi');
      }
    } finally {
      setLoading(false);
    }
  };

  if (registerSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-500 to-green-700 p-4">
        <motion.div 
          className="flex flex-col items-center justify-center text-white text-center max-w-md"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-8xl mb-4">📬</div>
          <h2 className="text-3xl font-bold mb-2">Registrasi Berhasil!</h2>
          <p className="text-lg mb-6">Kami telah mengirimkan link konfirmasi ke email Anda. Silakan cek inbox (atau folder spam) untuk mengaktifkan akun Anda.</p>
          <Button onClick={() => navigate('/login')}>Kembali ke Halaman Login</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-500 to-blue-700 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Daftar Akun MantabJo</CardTitle>
            <CardDescription className="text-center">
              Buat akun baru untuk menggunakan aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  {...register('email')}
                  disabled={loading}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  disabled={loading}
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  disabled={loading}
                />
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : 'Daftar'}
              </Button>

              <div className="text-center text-sm text-gray-500">
                <p>Sudah punya akun? <Link to="/login" className="font-medium text-blue-600 hover:underline">Login di sini</Link></p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;