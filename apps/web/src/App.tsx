import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Skeleton } from './components/States';
import { AiDraftScreen } from './features/ai-draft/AiDraftScreen';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { SignInScreen } from './features/auth/SignInScreen';
import { CartProvider } from './features/cart/CartContext';
import { CartScreen } from './features/cart/CartScreen';
import { CatalogueScreen } from './features/catalogue/CatalogueScreen';
import { DeskExportScreen } from './features/desk/DeskExportScreen';
import { DeskQueueScreen } from './features/desk/DeskQueueScreen';
import { OrderDetailScreen } from './features/desk/OrderDetailScreen';
import { OrderHistoryScreen } from './features/orders/OrderHistoryScreen';
import { I18nProvider } from './i18n';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'retailer' | 'desk'>;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-base">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'desk' ? '/desk' : '/catalogue'} replace />;
  }

  return <Layout>{children}</Layout>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Navigate to={user.role === 'desk' ? '/desk' : '/catalogue'} replace />;
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Route */}
              <Route path="/sign-in" element={<SignInScreen />} />

              {/* Retailer Routes */}
              <Route
                path="/catalogue"
                element={
                  <ProtectedRoute allowedRoles={['retailer', 'desk']}>
                    <CatalogueScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute allowedRoles={['retailer']}>
                    <CartScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-draft"
                element={
                  <ProtectedRoute allowedRoles={['retailer']}>
                    <AiDraftScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['retailer']}>
                    <OrderHistoryScreen />
                  </ProtectedRoute>
                }
              />

              {/* Desk Routes */}
              <Route
                path="/desk"
                element={
                  <ProtectedRoute allowedRoles={['desk']}>
                    <DeskQueueScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/desk/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['desk']}>
                    <OrderDetailScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/desk/exports"
                element={
                  <ProtectedRoute allowedRoles={['desk']}>
                    <DeskExportScreen />
                  </ProtectedRoute>
                }
              />

              {/* Default Root */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
