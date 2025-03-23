import { collection, addDoc, serverTimestamp, getDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { CartItem } from '../types';
import { createPaymentPreference } from './mercadopago';
import toast from 'react-hot-toast';

interface CreateOrderParams {
  userId: string;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
    email: string;
    phone: string;
  };
}

export async function createOrder({ userId, items, totalAmount, shippingAddress }: CreateOrderParams) {
  try {
    // Usar transação para garantir consistência
    const result = await runTransaction(db, async (transaction) => {
      // Validar usuário
      const userRef = doc(db, 'profiles', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      // Validar carrinho
      if (items.length === 0) {
        throw new Error('Carrinho vazio');
      }

      // Validar endereço
      if (!shippingAddress.zipcode || !shippingAddress.street || !shippingAddress.number || 
          !shippingAddress.neighborhood || !shippingAddress.city || !shippingAddress.state ||
          !shippingAddress.email || !shippingAddress.phone) {
        throw new Error('Endereço de entrega incompleto');
      }

      // Formatar itens do pedido
      const orderItems = items.map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: Number(item.price.toFixed(2))
      }));

      // Criar documento do pedido
      const ordersRef = collection(db, 'orders');
      const orderData = {
        user_id: userId,
        items: orderItems,
        total_amount: Number(totalAmount.toFixed(2)),
        status: 'pending',
        payment_status: 'pending',
        shipping_address: shippingAddress,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Adicionar pedido usando a transação
      const orderRef = doc(ordersRef);
      transaction.set(orderRef, orderData);

      // Criar preferência de pagamento
      const preference = await createPaymentPreference({
        items,
        userId,
        shippingAddress,
        orderId: orderRef.id
      });

      // Atualizar pedido com informações do pagamento
      transaction.update(orderRef, {
        payment_preference_id: preference.id,
        payment_url: preference.init_point
      });

      return {
        orderId: orderRef.id,
        paymentUrl: preference.init_point
      };
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    throw new Error(error.message || 'Erro ao criar pedido. Por favor, tente novamente.');
  }
}