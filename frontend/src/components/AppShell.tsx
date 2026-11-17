import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav.js';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl border-x border-slate-800/60 lg:max-w-none lg:flex-row lg:justify-start lg:shadow-none lg:border-x-0">
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-40 lg:hidden">
          <h1 className="text-base font-bold tracking-tight text-indigo-400">
            ASTRA Developers App
          </h1>
        </header>

        <main className="flex-1 w-full p-5 pb-24 lg:p-0 lg:pb-0 lg:max-w-6xl lg:mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
};