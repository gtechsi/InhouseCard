import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaHome, 
  FaUser, 
  FaShoppingCart, 
  FaBox, 
  FaUsers, 
  FaCreditCard, 
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaStore,
  FaReceipt,
  FaBell
} from 'react-icons/fa';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  submenu?: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems: MenuItem[] = [
  {
    label: 'Início',
    path: '/',
    icon: <FaHome />
  },
  {
    label: 'Meu Perfil',
    path: '/profile',
    icon: <FaUser />
  },
  {
    label: 'Produtos',
    path: '/products',
    icon: <FaStore />
  },
  {
    label: 'Carrinho',
    path: '/cart',
    icon: <FaShoppingCart />
  },
  {
    label: 'Meus Pedidos',
    path: '/orders',
    icon: <FaReceipt />,
    adminOnly: false
  },
  {
    label: 'Administração',
    path: '/admin',
    icon: <FaCog />,
    adminOnly: true,
    submenu: [
      {
        label: 'Dashboard',
        path: '/admin',
        icon: <FaHome />
      },
      {
        label: 'Produtos',
        path: '/admin/products',
        icon: <FaBox />
      },
      {
        label: 'Pedidos',
        path: '/admin/orders',
        icon: <FaClipboardList />
      },
      {
        label: 'Usuários',
        path: '/admin/users',
        icon: <FaUsers />
      },
      {
        label: 'Lotes de Cartões',
        path: '/admin/batches',
        icon: <FaCreditCard />
      },
      {
        label: 'Configurações',
        path: '/admin/settings',
        icon: <FaCog />
      },
      {
        label: 'Monitor de Webhooks',
        path: '/admin/webhooks',
        icon: <FaBell />
      }
    ]
  }
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const checkWidth = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsExpanded(!isMobileView);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.adminOnly && !isAdmin) return null;

    const active = isActive(item.path);
    const hasSubmenu = item.submenu && item.submenu.length > 0;

    return (
      <div key={item.path} className="relative group w-full">
        <Link
          to={item.path}
          onClick={() => isMobile && onClose()}
          className={`flex items-center p-3 space-x-3 rounded-lg transition-colors w-full ${
            active 
              ? 'bg-primary text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          } ${!isExpanded ? 'justify-center' : ''}`}
          title={!isExpanded ? item.label : undefined}
        >
          <span className="text-xl flex-shrink-0">{item.icon}</span>
          {(isExpanded || (isMobile && isOpen)) && (
            <span className="whitespace-nowrap flex-grow text-sm">{item.label}</span>
          )}
          {hasSubmenu && isExpanded && (
            <FaChevronRight className="ml-auto text-sm flex-shrink-0" />
          )}
        </Link>

        {hasSubmenu && (
          <div className={`${
            isExpanded 
              ? 'pl-6 mt-1 space-y-1' 
              : 'absolute left-full top-0 ml-2 bg-white rounded-lg shadow-lg hidden group-hover:block min-w-[200px] z-50'
          }`}>
            {item.submenu?.map(subitem => renderMenuItem(subitem))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 transform ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative'
        } bg-white ${
          isExpanded ? 'w-72' : 'w-20'
        } transition-all duration-300 ease-in-out flex flex-col shadow-lg`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          {(isExpanded || (isMobile && isOpen)) && (
            <span className="text-xl font-bold text-primary truncate">InHouse Card</span>
          )}
          {!isMobile && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
            >
              {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </aside>
    </>
  );
}