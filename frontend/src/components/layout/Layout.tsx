import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { Breadcrumb } from './Breadcrumb';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#F7F8F6] font-sans">
      <AppHeader />
      <main className="max-w-[1500px] mx-auto px-6 py-6">
        <Breadcrumb />
        <Outlet />
      </main>
    </div>
  );
}
