import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import ArchitecturePage from './pages/ArchitecturePage';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-brand-600 text-white shadow'
            : 'text-brand-100 hover:bg-brand-700/50'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* ── Top nav ──────────────────────────────────────────────── */}
        <header className="bg-brand-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">🏷️</span>
              <div>
                <p className="text-base font-bold leading-tight">Retail Pricing Manager</p>
                <p className="text-xs text-brand-100 leading-tight">Feed Management System</p>
              </div>
            </div>
            <nav className="flex gap-2">
              <NavItem to="/"       label="⬆ Upload Feeds" />
              <NavItem to="/search" label="🔍 Search & Edit" />
              <NavItem to="/architecture" label="🏗️ Architecture" />
            </nav>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────── */}
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/"       element={<div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"><UploadPage /></div>} />
            <Route path="/search" element={<div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"><SearchPage /></div>} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Routes>
        </main>

        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          Retail Pricing Feed Manager — {new Date().getFullYear()}
        </footer>
      </div>
    </BrowserRouter>
  );
}
