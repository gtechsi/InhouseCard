import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, where, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import toast from 'react-hot-toast';

// Helper function for date formatting
const formatDateTime = (timestamp: any) => {
  if (!timestamp) return '--/--/---- --:--';

  try {
    // Handle Firestore Timestamp
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    }
    
    // Handle string date
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    }

    return '--/--/---- --:--';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--/--/---- --:--';
  }
};

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  formatDateTime: (timestamp: any) => string;
}

function OrderDetailsModal({ order, onClose, onStatusChange, formatDateTime }: OrderDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const { isAdmin } = useAuth();

  const handleStatusChange = async () => {
    if (newStatus === order.status) return;
    
    try {
      setLoading(true);
      await onStatusChange(order.id, newStatus);
      toast.success('Status atualizado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Detalhes do Pedido #{order.id.slice(0, 8)}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Cliente */}
            <div>
              <h3 className="font-medium mb-2">Informações do Cliente</h3>
              <p className="text-gray-600">Nome: {order.customerName}</p>
            </div>

            {/* Endereço de Entrega */}
            {order.shipping_address && (
              <div>
                <h3 className="font-medium mb-2">Endereço de Entrega</h3>
                <p className="text-gray-600">
                  {order.shipping_address.street}, {order.shipping_address.number}
                  {order.shipping_address.complement && ` - ${order.shipping_address.complement}`}<br />
                  {order.shipping_address.neighborhood}<br />
                  {order.shipping_address.city} - {order.shipping_address.state}<br />
                  CEP: {order.shipping_address.zipcode}
                </p>
              </div>
            )}

            {/* Produtos */}
            <div>
              <h3 className="font-medium mb-2">Produtos</h3>
              <ul className="space-y-2">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.title}</span>
                    <span className="text-gray-600">
                      {(item.unit_price * item.quantity).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                <span>Total</span>
                <span>{order.total_amount.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}</span>
              </div>
            </div>

            {/* Status - Only show for admins */}
            {isAdmin && (
              <div>
                <h3 className="font-medium mb-2">Status do Pedido</h3>
                <div className="flex items-center space-x-4">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  <button
                    onClick={handleStatusChange}
                    disabled={loading || newStatus === order.status}
                    className="btn btn-primary"
                  >
                    {loading ? 'Atualizando...' : 'Atualizar Status'}
                  </button>
                </div>
              </div>
            )}

            {/* Data */}
            <div>
              <h3 className="font-medium mb-2">Data e Hora</h3>
              <p className="text-gray-600">{formatDateTime(order.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchOrders();
  }, [user, isAdmin, navigate, statusFilter]);

  async function fetchOrders() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const ordersRef = collection(db, 'orders');
      
      // Build query based on user role and filters
      let baseQuery;
      
      if (isAdmin) {
        // Admin can see all orders
        if (statusFilter !== 'all') {
          baseQuery = query(
            ordersRef,
            where('status', '==', statusFilter),
            orderBy('created_at', 'desc')
          );
        } else {
          baseQuery = query(
            ordersRef,
            orderBy('created_at', 'desc')
          );
        }
      } else {
        // Regular users can only see their own orders
        if (statusFilter !== 'all') {
          baseQuery = query(
            ordersRef,
            where('user_id', '==', user.id),
            where('status', '==', statusFilter),
            orderBy('created_at', 'desc')
          );
        } else {
          baseQuery = query(
            ordersRef,
            where('user_id', '==', user.id),
            orderBy('created_at', 'desc')
          );
        }
      }

      const querySnapshot = await getDocs(baseQuery);
      const ordersData = await Promise.all(
        querySnapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data();
          
          // Get customer profile
          const profileRef = doc(db, 'profiles', orderData.user_id);
          const profileSnap = await getDoc(profileRef);
          const customerName = profileSnap.exists() ? profileSnap.data().fullName : 'Cliente não encontrado';

          return {
            id: orderDoc.id,
            ...orderData,
            customerName
          } as Order;
        })
      );

      setOrders(ordersData);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      setError('Erro ao carregar pedidos. Por favor, tente novamente.');
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!isAdmin) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updated_at: Timestamp.now()
      });
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm === '') return true;
    
    return (
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'paid':
        return 'Pago';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">
        {isAdmin ? 'Gerenciar Pedidos' : 'Meus Pedidos'}
      </h1>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>

            {/* Search - Only show for admins */}
            {isAdmin && (
              <input
                type="text"
                placeholder="Buscar por cliente ou número do pedido"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 w-full sm:w-auto"
              />
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum pedido encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    {isAdmin && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtos
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data e Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(0, 8)}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customerName}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <ul>
                          {order.items.map((item, index) => (
                            <li key={index}>
                              {item.quantity}x {item.title}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.total_amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary hover:text-primary-dark font-medium"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
}