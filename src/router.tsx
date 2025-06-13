import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Modal from './pages/Modal';
import Pengeluaran from './pages/Pengeluaran';
import Hutang from './pages/Hutang';
import Pelanggan from "./pages/Pelanggan";
import Laporan from "./pages/Laporan"; 
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Transaksi from './pages/Transaksi';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/splash" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'modal',
        element: <Modal />,
      },
      {
        path: 'pengeluaran',
        element: <Pengeluaran />,
      },
      {
        path: 'hutang',
        element: <Hutang />,
      },
      {
        path: 'pelanggan',
        element: <Pelanggan />,
      },
      {
        path: 'laporan',
        element: <Laporan />,
      },
      {
        path: 'transaksi',
        element: <Transaksi />,
      },
        {
          path: '*',
          element: <Navigate to="/dashboard" replace />,
        },
      ],
    },
    {
      path: '/splash',
      element: <SplashScreen />,
    },
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/register',
      element: <Register />,
    },
  ]
);