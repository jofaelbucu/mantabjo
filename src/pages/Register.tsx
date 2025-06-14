import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      
      // Tampilkan halaman sukses jika perlu verifikasi email
      setRegisterSuccess(true);
      
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

  // Tampilan halaman sukses dipusatkan
  if (registerSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50 p-4 relative overflow-hidden">
        {/* Elemen Dekoratif di Latar Belakang */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-pink-300 to-rose-200 rounded-full opacity-50 -translate-x-1/4 -translate-y-1/4 filter blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-300 to-pink-200 rounded-full opacity-40 translate-x-1/4 translate-y-1/4 filter blur-3xl"></div>
        
        <motion.div 
          className="relative z-10 flex flex-col items-center justify-center text-gray-800 text-center max-w-md bg-white/70 backdrop-blur-xl border-white/30 shadow-lg rounded-xl p-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-8xl mb-4 text-pink-500">📬</div>
          <h2 className="text-3xl font-bold mb-2">Registrasi Berhasil!</h2>
          <p className="text-lg mb-6 text-gray-600">Kami telah mengirimkan link konfirmasi ke email Anda. Silakan cek inbox (atau folder spam) untuk mengaktifkan akun Anda.</p>
          <Button onClick={() => navigate('/login')} className="bg-pink-600 hover:bg-pink-700 text-white">
            Kembali ke Halaman Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-50 p-4 relative overflow-hidden">
        {/* Elemen Dekoratif di Latar Belakang */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-pink-300 to-rose-200 rounded-full opacity-50 -translate-x-1/4 -translate-y-1/4 filter blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-300 to-pink-200 rounded-full opacity-40 translate-x-1/4 translate-y-1/4 filter blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-white/70 backdrop-blur-xl border-white/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
                <img src="./src/assets/mantabjo-merpati.png" alt="Logo MantabJo" className="w-40 h-auto" />
            </div>
            <CardDescription className="text-center text-gray-600 !mt-0">
              Buat akun baru untuk menggunakan aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  {...register('email')}
                  disabled={loading}
                  className="bg-white/80 focus:bg-white"
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        disabled={loading}
                        className="bg-white/80 focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">Konfirmasi Password</Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...register('confirmPassword')}
                        disabled={loading}
                        className="bg-white/80 focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : 'Daftar'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                <p>Sudah punya akun? <Link to="/login" className="font-medium text-pink-600 hover:underline">Login di sini</Link></p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
