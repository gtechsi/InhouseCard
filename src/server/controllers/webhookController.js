import { logger } from '../utils/logger.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configurar cliente Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const payment = new Payment(client);

// Função para registrar log de webhook
async function logWebhookEvent(data) {
  try {
    const logsRef = collection(db, 'webhook_logs');
    await addDoc(logsRef, {
      ...data,
      timestamp: serverTimestamp()
    });
    logger.info('Webhook log registered successfully');
  } catch (error) {
    logger.error('Error registering webhook log:', error);
  }
}

export const handleWebhook = async (req, res) => {
  try {
    const { action, data } = req.body;

    // Log the webhook payload
    logger.info('Received webhook:', { action, data });

    // Registrar no Firestore para monitoramento
    await logWebhookEvent({
      action,
      paymentId: data.id,
      status: 'received',
      details: req.body
    });

    // Processar notificações de pagamento
    if (action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data.id;
      
      // Obter detalhes do pagamento do Mercado Pago
      let paymentInfo;
      try {
        paymentInfo = await payment.get({ id: paymentId });
        logger.info('Payment details retrieved:', { 
          id: paymentInfo.id,
          status: paymentInfo.status,
          external_reference: paymentInfo.external_reference
        });
      } catch (error) {
        logger.error('Failed to get payment info from Mercado Pago:', error);
        
        // Registrar erro ao buscar informações de pagamento
        await logWebhookEvent({
          action,
          paymentId: data.id,
          status: 'error',
          orderId: null,
          details: { error: 'Failed to get payment info from Mercado Pago' }
        });
        
        return res.status(500).json({ error: 'Error retrieving payment information' });
      }
      
      // Obter referência do pedido
      const orderId = paymentInfo.external_reference;
      if (!orderId) {
        logger.error('Order reference not found in payment data');
        
        // Registrar erro de referência de pedido não encontrada
        await logWebhookEvent({
          action,
          paymentId: data.id,
          status: 'error',
          orderId: null,
          details: { error: 'Order reference not found in payment data' }
        });
        
        return res.status(400).json({ error: 'Order reference not found' });
      }

      // Buscar pedido no Firestore
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
          logger.error(`Order ${orderId} not found in database`);
          
          // Registrar erro de pedido não encontrado
          await logWebhookEvent({
            action,
            paymentId: data.id,
            status: 'error',
            orderId,
            details: { error: 'Order not found in database' }
          });
          
          return res.status(404).json({ error: 'Order not found' });
        }
        
        const orderData = orderDoc.data();
        logger.info(`Order ${orderId} found. Current status: ${orderData.status}`);

        // Processar apenas se o status for diferente
        if (orderData.payment_status !== paymentInfo.status) {
          // Determinar novo status
          let newStatus;
          switch (paymentInfo.status) {
            case 'approved':
              newStatus = 'paid';
              logger.info(`Payment approved for order ${orderId}`);
              break;
            case 'pending':
              newStatus = 'pending';
              logger.info(`Payment pending for order ${orderId}`);
              break;
            case 'rejected':
            case 'cancelled':
            case 'refunded':
              newStatus = 'cancelled';
              logger.info(`Payment ${paymentInfo.status} for order ${orderId}`);
              break;
            case 'in_process':
              newStatus = 'pending';
              logger.info(`Payment in process for order ${orderId}`);
              break;
            default:
              newStatus = 'pending';
              logger.info(`Unknown payment status: ${paymentInfo.status} for order ${orderId}`);
          }

          // Atualizar status do pedido
          await updateDoc(orderRef, {
            status: newStatus,
            payment_id: paymentInfo.id,
            payment_status: paymentInfo.status,
            payment_method: paymentInfo.payment_method_id,
            payment_confirmed_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            payment_details: {
              status_detail: paymentInfo.status_detail,
              payment_type_id: paymentInfo.payment_type_id,
              payment_method_id: paymentInfo.payment_method_id,
              transaction_amount: paymentInfo.transaction_amount,
              installments: paymentInfo.installments
            }
          });

          logger.info(`Order ${orderId} status updated from ${orderData.status} to ${newStatus}`);
          
          // Registrar atualização bem-sucedida
          await logWebhookEvent({
            action,
            paymentId: data.id,
            status: 'success',
            orderId,
            details: {
              oldStatus: orderData.status,
              newStatus,
              paymentStatus: paymentInfo.status
            }
          });
        } else {
          logger.info(`Order ${orderId} payment status already up to date (${paymentInfo.status})`);
          
          // Registrar status já atualizado
          await logWebhookEvent({
            action,
            paymentId: data.id,
            status: 'info',
            orderId,
            details: { 
              message: 'Payment status already up to date',
              currentStatus: orderData.status 
            }
          });
        }
      } catch (error) {
        logger.error(`Error updating order ${orderId}:`, error);
        
        // Registrar erro ao atualizar pedido
        await logWebhookEvent({
          action,
          paymentId: data.id,
          status: 'error',
          orderId,
          details: { error: 'Error updating order status' }
        });
        
        return res.status(500).json({ error: 'Error updating order status' });
      }
    } else {
      logger.info(`Ignoring webhook with action: ${action}`);
      
      // Registrar ação desconhecida
      await logWebhookEvent({
        action,
        paymentId: data?.id || 'unknown',
        status: 'info',
        orderId: null,
        details: { message: 'Ignored webhook with unknown action' }
      });
    }

    // Enviar resposta de sucesso
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      received_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    
    // Registrar erro geral
    await logWebhookEvent({
      action: req.body?.action || 'unknown',
      paymentId: req.body?.data?.id || 'unknown',
      status: 'error',
      orderId: null,
      details: { error: 'Internal server error' }
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
};