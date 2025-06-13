import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      
      setLoginSuccess(true);
      
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan yang tidak diketahui.';
      if (error && error.message) {
          if (error.message.includes('Invalid login credentials')) {
              errorMessage = 'Email atau password yang Anda masukkan salah.';
          } else if (error.message.toLowerCase().includes('network')) {
              errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
          } else {
              errorMessage = error.message;
          }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-50 p-4 relative overflow-hidden">
      {/* Elemen Dekoratif di Latar Belakang */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-pink-300 to-rose-200 rounded-full opacity-50 -translate-x-1/4 -translate-y-1/4 filter blur-2xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-300 to-pink-200 rounded-full opacity-40 translate-x-1/4 translate-y-1/4 filter blur-3xl"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {loginSuccess ? (
          <motion.div 
            className="flex flex-col items-center justify-center text-gray-800"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onAnimationComplete={() => setTimeout(() => navigate('/dashboard'), 500)}
          >
            <motion.div 
              className="text-9xl mb-4 text-pink-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              ✓
            </motion.div>
            <motion.h2 
              className="text-2xl font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Login Berhasil!
            </motion.h2>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/70 backdrop-blur-xl border-white/30 shadow-lg">
              <CardHeader>
                {/* --- PERUBAHAN DI SINI --- */}
                {/* Menambahkan logo dan menghapus CardTitle */}
                <div className="flex justify-center mb-4">
                  <img src="/src/assets/mantabjo-merpati.png" alt="Logo MantabJo" className="w-40 h-auto" />
                </div>
                {/* CardTitle sebelumnya dihapus */}
                {/* --- AKHIR PERUBAHAN --- */}
                <CardDescription className="text-center text-gray-600 !mt-0"> 
                  {/* Tambahkan !mt-0 untuk menghapus margin atas jika perlu */}
                  Masukkan email dan password untuk melanjutkan
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
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm font-medium border border-red-200">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Memproses...' : 'Login'}
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    <p>Belum punya akun? <Link to="/register" className="font-medium text-pink-600 hover:underline">Daftar di sini</Link></p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Login;
