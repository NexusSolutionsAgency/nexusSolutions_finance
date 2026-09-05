import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-nx-bg nx-watermark">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen relative z-[1]">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-[1500px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
