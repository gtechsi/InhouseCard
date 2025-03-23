import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const orderId = searchParams.get('order');

  useEffect(() => {
    async function handlePaymentStatus() {
      if (!orderId) return;

      try {
        // Get order details
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('Pedido não encontrado');
        }

        // Update order status based on payment status
        let newStatus;
        let message;
        switch (status) {
          case 'success':
            newStatus = 'paid';
            message = 'Pagamento realizado com sucesso!';
            break;
          case 'pending':
            newStatus = 'pending';
            message = 'Pagamento pendente';
            break;
          case 'failure':
            newStatus = 'cancelled';
            message = 'Falha no pagamento';
            break;
          default:
            return;
        }

        // Only update if status is different
        if (orderDoc.data().status !== newStatus) {
          await updateDoc(orderRef, {
            status: newStatus,
            payment_status: status,
            payment_confirmed_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }

        // Show appropriate toast message
        if (newStatus === 'paid') {
          toast.success(message);
        } else if (newStatus === 'pending') {
          toast.info(message);
        } else {
          toast.error(message);
        }

      } catch (error) {
        console.error('Error handling payment status:', error);
        toast.error('Erro ao processar status do pagamento');
      }
    }

    handlePaymentStatus();

    // Redirect to orders page after 3 seconds
    const timer = setTimeout(() => {
      navigate('/orders');
    }, 3000);

    return () => clearTimeout(timer);
  }, [status, orderId, navigate]);

  // Get appropriate message and color based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          title: 'Pagamento realizado com sucesso!',
          message: 'Seu pedido foi confirmado e está sendo processado.',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'failure':
        return {
          title: 'Houve uma falha no pagamento',
          message: 'Por favor, tente novamente ou entre em contato conosco.',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'pending':
        return {
          title: 'Pagamento pendente',
          message: 'Aguardando confirmação do pagamento.',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      default:
        return {
          title: 'Status do pagamento',
          message: 'Verificando status do pagamento...',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className={`max-w-md w-full ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg p-8 text-center`}>
        {/* Status Message */}
        <h1 className={`text-2xl font-bold ${statusConfig.textColor} mb-4`}>
          {statusConfig.title}
        </h1>
        <p className={`${statusConfig.textColor} mb-8`}>
          {statusConfig.message}
        </p>

        {/* Redirect Message */}
        <p className="text-gray-600 text-sm">
          Você será redirecionado para a página de pedidos em alguns segundos...
        </p>
      </div>
    </div>
  );
}