import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FaShoppingCart } from 'react-icons/fa';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

interface SystemSettings {
  logo_url: string | null;
  primary_color: string;
  favicon_url: string | null;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartAnimating, setCartAnimating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  const isCardPage = location.pathname.startsWith('/card/');
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRef = doc(db, 'system_settings', 'default');
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as SystemSettings;
          setSettings(data);
          
          if (data.primary_color) {
            document.documentElement.style.setProperty('--color-primary', data.primary_color);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  useEffect(() => {
    setCartAnimating(true);
    const timer = setTimeout(() => setCartAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [cartCount]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleLogoError = () => {
    console.error('Erro ao carregar logo');
    setLogoError(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isCardPage) {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Only show Sidebar for authenticated users */}
      {user && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button - only show for authenticated users */}
                {user && (
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  >
                    <span className="sr-only">Open menu</span>
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                      />
                    </svg>
                  </button>
                )}

                {/* Logo/Brand */}
                <Link to="/" className="flex items-center">
                  {settings?.logo_url && !logoError ? (
                    <div className="h-12 flex items-center">
                      <img 
                        src={settings.logo_url}
                        alt="InHouse Card"
                        className="h-full w-auto object-contain"
                        onError={handleLogoError}
                      />
                    </div>
                  ) : (
                    <span className="text-xl md:text-2xl font-bold text-primary">
                      InHouse Card
                    </span>
                  )}
                </Link>
              </div>
              
              <nav className="flex items-center space-x-2 md:space-x-4">
                {/* Cart icon - only show for authenticated users */}
                {user && (
                  <Link to="/cart" className="text-gray-700 hover:text-primary relative p-2">
                    <FaShoppingCart className={`text-xl ${cartAnimating ? 'animate-bounce' : ''}`} />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {user ? (
                  <button 
                    onClick={handleSignOut}
                    className="text-gray-700 hover:text-primary px-3 py-2"
                  >
                    Sair
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link 
                      to="/login" 
                      className="text-gray-700 hover:text-primary px-3 py-2 hidden sm:block"
                    >
                      Entrar
                    </Link>
                    <Link 
                      to="/register" 
                      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
                    >
                      Cadastrar
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} InHouse Card. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}