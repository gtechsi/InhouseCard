import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CardPage from './pages/CardPage';
import CardActivation from './pages/CardActivation';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import BatchCards from './pages/Admin/BatchCards';
import Settings from './pages/Admin/Settings';
import Products from './pages/Admin/Products';
import Orders from './pages/Admin/Orders';
import WebhookMonitor from './pages/Admin/WebhookMonitor';
import ProductList from './pages/Products';
import Cart from './pages/Cart';
import PaymentStatus from './pages/PaymentStatus';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Layout>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            
            {/* Payment status routes */}
            <Route path="/payment/status" element={<PaymentStatus />} />
            
            {/* Card routes */}
            <Route path="/card/:linkId" element={<CardPage />} />
            <Route path="/card/:linkId/activate" element={<CardActivation />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<Products />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/batches" element={<BatchCards />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/webhooks" element={<WebhookMonitor />} />
            
            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;