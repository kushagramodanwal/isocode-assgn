import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Languages,
  LogOut,
  MessageSquareQuote,
  Package,
  ShieldAlert,
  ShoppingCart,
  Store,
  TableProperties,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { useI18n } from '../i18n';
import { MockBadge } from './Badges';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { totalCases } = useCart();
  const { t, lang, setLanguage } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isRetailer = user?.role === 'retailer';
  const isDesk = user?.role === 'desk';

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-bg-surface/95 backdrop-blur border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-text-main">
                  {isDesk ? 'Distributor Desk' : user?.retailer?.name || t.appTitle}
                </span>
                <MockBadge label={user?.role === 'desk' ? 'DESK' : 'RETAILER'} />
              </div>
              <p className="text-[11px] text-text-muted hidden sm:block">
                Jabalpur Distributor Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(lang === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-bg-subtle text-xs font-semibold flex items-center gap-1.5 hover:bg-border transition-colors touch-target"
              title="Toggle Language"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 text-text-muted hover:text-status-error rounded-lg transition-colors touch-target"
              title={t.signOut}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation for Retailers */}
      {isRetailer && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg-surface border-t border-border flex items-center justify-around py-2 px-2 sm:hidden shadow-lg">
          <Link
            to="/catalogue"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === '/catalogue' ? 'text-accent font-bold' : 'text-text-muted'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="mt-1">{t.retailerNavCatalogue}</span>
          </Link>

          <Link
            to="/cart"
            className={`relative flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === '/cart' ? 'text-accent font-bold' : 'text-text-muted'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="mt-1">{t.retailerNavCart}</span>
            {totalCases > 0 && (
              <span className="absolute top-0 right-3 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {totalCases}
              </span>
            )}
          </Link>

          <Link
            to="/ai-draft"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === '/ai-draft' ? 'text-accent font-bold' : 'text-text-muted'
            }`}
          >
            <MessageSquareQuote className="w-5 h-5" />
            <span className="mt-1">{t.retailerNavAiDraft}</span>
          </Link>

          <Link
            to="/orders"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === '/orders' ? 'text-accent font-bold' : 'text-text-muted'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="mt-1">{t.retailerNavOrders}</span>
          </Link>
        </nav>
      )}

      {/* Desktop Navigation Header for Retailers */}
      {isRetailer && (
        <div className="hidden sm:block fixed bottom-4 right-6 z-30">
          <div className="flex items-center gap-2 bg-bg-surface/90 backdrop-blur p-2 rounded-2xl border border-border shadow-xl">
            <Link
              to="/catalogue"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                location.pathname === '/catalogue' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t.retailerNavCatalogue}</span>
            </Link>

            <Link
              to="/cart"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                location.pathname === '/cart' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t.retailerNavCart}</span>
              {totalCases > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold">
                  {totalCases}
                </span>
              )}
            </Link>

            <Link
              to="/ai-draft"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                location.pathname === '/ai-draft' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <MessageSquareQuote className="w-4 h-4" />
              <span>{t.retailerNavAiDraft}</span>
            </Link>

            <Link
              to="/orders"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                location.pathname === '/orders' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.retailerNavOrders}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Desktop / Mobile Nav for Desk users */}
      {isDesk && (
        <div className="bg-bg-surface border-b border-border py-2 px-4 mb-4">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <Link
              to="/desk"
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                location.pathname === '/desk' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>{t.deskNavQueue}</span>
            </Link>

            <Link
              to="/desk/exports"
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                location.pathname === '/desk/exports' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-subtle'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.deskNavExports}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
