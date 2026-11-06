import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { PageTitle } from "./components/PageTitle";
import { HomeRedirect, RequireRole } from "./components/RequireRole";
import { NotFound } from "./components/States";
import { LoginPage } from "./pages/LoginPage";
import { ShopLayout } from "./pages/shop/ShopLayout";
import { CataloguePage } from "./pages/shop/CataloguePage";
import { CartPage } from "./pages/shop/CartPage";
import { OrdersPage } from "./pages/shop/OrdersPage";
import { OrderPage } from "./pages/shop/OrderPage";
import { TypeOrderPage } from "./pages/shop/TypeOrderPage";
import { ShopCapturePage } from "./pages/shop/ShopCapturePage";

// The order desk is a separate chunk: retailers on 3G never download it.
const desk = <T extends string>(name: T) =>
  lazy(() => import(`./pages/desk/${name}.tsx`).then((m: Record<string, React.ComponentType>) => ({ default: m[name]! })));
const DeskLayout = desk("DeskLayout");
const InboxPage = desk("InboxPage");
const NewCapturePage = desk("NewCapturePage");
const DeskCapturePage = desk("DeskCapturePage");
const DeskOrdersPage = desk("DeskOrdersPage");
const DeskOrderPage = desk("DeskOrderPage");
const ExportPage = desk("ExportPage");
const LoadingPage = desk("LoadingPage");
const QuietPage = desk("QuietPage");
const Loading = () => <div className="mx-auto max-w-6xl p-4"><div className="skeleton h-12" /></div>;

const router = createBrowserRouter([{
  element: <><PageTitle /><Outlet /></>,
  children: [
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireRole role="RETAILER" />,
    children: [{
      path: "/shop",
      element: <ShopLayout />,
      children: [
        { index: true, element: <CataloguePage /> },
        { path: "cart", element: <CartPage /> },
        { path: "orders", element: <OrdersPage /> },
        { path: "orders/:id", element: <OrderPage /> },
        { path: "capture", element: <TypeOrderPage /> },
        { path: "capture/:id", element: <ShopCapturePage /> },
      ],
    }],
  },
  {
    element: <RequireRole role="DESK" />,
    children: [{
      path: "/desk",
      element: <Suspense fallback={<Loading />}><DeskLayout /></Suspense>,
      children: [
        { index: true, element: <Suspense fallback={<Loading />}><InboxPage /></Suspense> },
        { path: "capture/new", element: <Suspense fallback={<Loading />}><NewCapturePage /></Suspense> },
        { path: "capture/:id", element: <Suspense fallback={<Loading />}><DeskCapturePage /></Suspense> },
        { path: "orders", element: <Suspense fallback={<Loading />}><DeskOrdersPage /></Suspense> },
        { path: "orders/:id", element: <Suspense fallback={<Loading />}><DeskOrderPage /></Suspense> },
        { path: "export", element: <Suspense fallback={<Loading />}><ExportPage /></Suspense> },
        { path: "loading", element: <Suspense fallback={<Loading />}><LoadingPage /></Suspense> },
        { path: "retailers", element: <Suspense fallback={<Loading />}><QuietPage /></Suspense> },
      ],
    }],
  },
  { path: "*", element: <NotFound /> },
]}]);

export function App() {
  return <RouterProvider router={router} />;
}
