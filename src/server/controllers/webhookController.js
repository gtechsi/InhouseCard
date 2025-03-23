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
    // Detectar formato do webhook
    const body = req.body;
    
    // Log do payload recebido
    logger.info('Webhook payload recebido:', JSON.stringify(body));
    
    // Extrair dados importantes com base no formato
    let action, paymentId, notificationType;
    
    // Verificar se é o formato que inclui 'topic' e 'id' (formato feed)
    if (body.topic && body.id) {
      notificationType = body.topic;
      action = body.topic === 'payment' ? 'payment.updated' : `${body.topic}.notification`;
      paymentId = body.id;
      logger.info(`Detectado formato feed: topic=${body.topic}, id=${body.id}`);
    } 
    // Formato tradicional com 'action' e 'data.id'
    else if (body.action && body.data && body.data.id) {
      action = body.action;
      paymentId = body.data.id;
      notificationType = 'standard';
      logger.info(`Detectado formato padrão: action=${action}, data.id=${paymentId}`);
    }
    // Outro formato desconhecido
    else {
      logger.warn('Formato de webhook não reconhecido:', JSON.stringify(body));
      
      // Tentar encontrar qualquer ID de pagamento na requisição
      paymentId = body.id || (body.data && body.data.id) || 'unknown';
      action = 'unknown';
      notificationType = 'unknown';
    }
    
    // Registrar no Firestore para monitoramento
    await logWebhookEvent({
      action,
      paymentId,
      notificationType,
      status: 'received',
      details: body
    });
    
    // Processar notificações de pagamento (qualquer formato)
    if (paymentId !== 'unknown' && (action.includes('payment') || notificationType === 'payment' || notificationType === 'merchant_order')) {
      // Obter detalhes do pagamento do Mercado Pago
      let paymentInfo;
      try {
        paymentInfo = await payment.get({ id: paymentId });
        logger.info('Detalhes do pagamento obtidos:', { 
          id: paymentInfo.id,
          status: paymentInfo.status,
          external_reference: paymentInfo.external_reference
        });
      } catch (error) {
        logger.error('Falha ao obter informações do pagamento do Mercado Pago:', error);
        
        // Registrar erro ao buscar informações de pagamento
        await logWebhookEvent({
          action,
          paymentId,
          notificationType,
          status: 'error',
          orderId: null,
          details: { error: 'Falha ao obter informações do pagamento do Mercado Pago' }
        });
        
        return res.status(500).json({ error: 'Erro ao recuperar informações do pagamento' });
      }
      
      // Obter referência do pedido
      const orderId = paymentInfo.external_reference;
      if (!orderId) {
        logger.error('Referência do pedido não encontrada nos dados do pagamento');
        
        // Registrar erro de referência de pedido não encontrada
        await logWebhookEvent({
          action,
          paymentId,
          status: 'error',
          orderId: null,
          details: { error: 'Referência do pedido não encontrada nos dados do pagamento' }
        });
        
        return res.status(400).json({ error: 'Referência do pedido não encontrada' });
      }

      // Buscar pedido no Firestore
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
          logger.error(`Pedido ${orderId} não encontrado no banco de dados`);
          
          // Registrar erro de pedido não encontrado
          await logWebhookEvent({
            action,
            paymentId,
            status: 'error',
            orderId,
            details: { error: 'Pedido não encontrado no banco de dados' }
          });
          
          return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        const orderData = orderDoc.data();
        logger.info(`Pedido ${orderId} encontrado. Status atual: ${orderData.status}`);

        // Processar apenas se o status for diferente
        if (!orderData.payment_status || orderData.payment_status !== paymentInfo.status) {
          // Determinar novo status
          let newStatus;
          switch (paymentInfo.status) {
            case 'approved':
              newStatus = 'paid';
              logger.info(`Pagamento aprovado para o pedido ${orderId}`);
              break;
            case 'pending':
              newStatus = 'pending';
              logger.info(`Pagamento pendente para o pedido ${orderId}`);
              break;
            case 'rejected':
            case 'cancelled':
            case 'refunded':
              newStatus = 'cancelled';
              logger.info(`Pagamento ${paymentInfo.status} para o pedido ${orderId}`);
              break;
            case 'in_process':
              newStatus = 'pending';
              logger.info(`Pagamento em processamento para o pedido ${orderId}`);
              break;
            default:
              newStatus = 'pending';
              logger.info(`Status de pagamento desconhecido: ${paymentInfo.status} para o pedido ${orderId}`);
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

          logger.info(`Status do pedido ${orderId} atualizado de ${orderData.status} para ${newStatus}`);
          
          // Registrar atualização bem-sucedida
          await logWebhookEvent({
            action,
            paymentId,
            status: 'success',
            orderId,
            details: {
              oldStatus: orderData.status,
              newStatus,
              paymentStatus: paymentInfo.status
            }
          });
        } else {
          logger.info(`Status de pagamento do pedido ${orderId} já está atualizado (${paymentInfo.status})`);
          
          // Registrar status já atualizado
          await logWebhookEvent({
            action,
            paymentId,
            status: 'info',
            orderId,
            details: { 
              message: 'Status de pagamento já atualizado',
              currentStatus: orderData.status 
            }
          });
        }
      } catch (error) {
        logger.error(`Erro ao atualizar pedido ${orderId}:`, error);
        
        // Registrar erro ao atualizar pedido
        await logWebhookEvent({
          action,
          paymentId,
          status: 'error',
          orderId,
          details: { error: 'Erro ao atualizar status do pedido' }
        });
        
        return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
      }
    } else {
      logger.info(`Ignorando webhook com tipo: ${notificationType}, ação: ${action}`);
      
      // Registrar ação desconhecida
      await logWebhookEvent({
        action,
        paymentId: paymentId || 'unknown',
        status: 'info',
        orderId: null,
        details: { message: 'Webhook ignorado com tipo ou ação desconhecida' }
      });
    }

    // Enviar resposta de sucesso
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      received_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao processar webhook:', error);
    
    // Registrar erro geral
    await logWebhookEvent({
      action: req.body?.action || req.body?.topic || 'unknown',
      paymentId: req.body?.data?.id || req.body?.id || 'unknown',
      status: 'error',
      orderId: null,
      details: { error: 'Erro interno do servidor' }
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
};