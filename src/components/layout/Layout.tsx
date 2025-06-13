import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
      <footer className="border-t py-4 bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} MantabJo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;