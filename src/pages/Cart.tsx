import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/orders';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function Cart() {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleCheckout() {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', '/cart');
      navigate('/register');
      return;
    }

    try {
      setLoading(true);

      // Get user's shipping address from profile
      const profileRef = doc(db, 'profiles', user.id);
      const profileDoc = await getDoc(profileRef);
      
      if (!profileDoc.exists()) {
        throw new Error('Profile not found');
      }

      const profile = profileDoc.data();
      const shippingAddress = profile.shipping_address;

      if (!shippingAddress) {
        toast.error('Por favor, atualize seu endereço no perfil');
        navigate('/profile');
        return;
      }

      if (!profile.email) {
        toast.error('Por favor, atualize seu email no perfil');
        navigate('/profile');
        return;
      }

      if (!profile.phone) {
        toast.error('Por favor, atualize seu telefone no perfil');
        navigate('/profile');
        return;
      }

      // Validate cart items
      if (items.length === 0) {
        toast.error('Seu carrinho está vazio');
        return;
      }

      // Create order and get payment URL
      const { paymentUrl } = await createOrder({
        userId: user.id,
        items,
        totalAmount: total,
        shippingAddress: {
          ...shippingAddress,
          email: profile.email,
          phone: profile.phone
        }
      });

      // Clear cart after successful order creation
      clearCart();
      
      // Redirect to Mercado Pago payment page
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Carrinho</h1>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">Seu carrinho está vazio</p>
          <Link
            to="/products"
            className="text-primary hover:underline"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Carrinho</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center py-4 border-b">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1 ml-4">
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-gray-500">
                  {item.price.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                Remover
              </button>
            </div>
          ))}

          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-bold text-primary">
                {total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Finalizar Compra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}