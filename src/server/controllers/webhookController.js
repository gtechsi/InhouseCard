import { logger } from '../utils/logger.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente
dotenv.config();

// Determinar caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin se ainda não estiver inicializado
let db;
if (!admin.apps.length) {
  try {
    // Verificar se temos variáveis de ambiente para o Firebase Admin SDK
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // A chave privada vem com \n escapados como texto, precisamos convertê-los
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      logger.info('Firebase Admin inicializado com credenciais completas');
    } else {
      // Inicialização mínima para desenvolvimento
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      logger.info('Firebase Admin inicializado para desenvolvimento (sem credenciais)');
    }
  } catch (error) {
    logger.error('Erro ao inicializar Firebase Admin:', error);
    process.exit(1); // Falha crítica, encerrar o aplicativo
  }
  
  db = admin.firestore();
} else {
  db = admin.firestore();
}

// Configurar cliente Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const payment = new Payment(client);

// Função para registrar log de webhook
async function logWebhookEvent(data) {
  try {
    const result = await db.collection('webhook_logs').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info(`Webhook log registrado com ID: ${result.id}`);
  } catch (error) {
    logger.error('Erro ao registrar log de webhook:', error);
  }
}

export const handleWebhook = async (req, res) => {
  try {
    // Detectar formato do webhook
    const body = req.body;
    
    // Log completo do payload recebido, incluindo cabeçalhos
    logger.info('Webhook payload recebido:', JSON.stringify(body));
    logger.info('Webhook headers:', JSON.stringify(req.headers));
    
    // Extrair dados importantes com base no formato
    let action, paymentId, notificationType;
    
    // Verificar se é o formato que inclui 'topic' e 'id' (formato feed)
    if (body.topic && body.id) {
      notificationType = body.topic;
      action = body.topic === 'payment' ? 'payment.updated' : `${body.topic}.notification`;
      paymentId = body.id.toString();
      logger.info(`Detectado formato feed: topic=${body.topic}, id=${body.id}`);
    } 
    // Formato tradicional com 'action' e 'data.id'
    else if (body.action && body.data && body.data.id) {
      action = body.action;
      paymentId = body.data.id.toString();
      notificationType = 'standard';
      logger.info(`Detectado formato padrão: action=${action}, data.id=${paymentId}`);
    }
    // Tenta extrair do formato mais recente da API v2
    else if (body.type && body.data) {
      action = body.type;
      paymentId = body.data.id.toString();
      notificationType = 'api_v2';
      logger.info(`Detectado formato API v2: type=${body.type}, data.id=${paymentId}`);
    }
    // Outro formato desconhecido
    else {
      logger.warn('Formato de webhook não reconhecido:', JSON.stringify(body));
      
      // Tentar encontrar qualquer ID de pagamento na requisição
      paymentId = (body.id || (body.data && body.data.id) || 'unknown').toString();
      action = 'unknown';
      notificationType = 'unknown';
    }
    
    // Registrar no Firestore para monitoramento
    await logWebhookEvent({
      action,
      paymentId,
      notificationType,
      status: 'received',
      details: body,
      received_at: new Date().toISOString()
    });
    
    // Processar notificações de pagamento (qualquer formato)
    if (paymentId !== 'unknown' && (
      action.includes('payment') || 
      notificationType === 'payment' || 
      notificationType === 'merchant_order' ||
      notificationType === 'api_v2')
    ) {
      // Obter detalhes do pagamento do Mercado Pago
      let paymentInfo;
      try {
        logger.info(`Buscando informações do pagamento ${paymentId} no Mercado Pago`);
        paymentInfo = await payment.get({ id: paymentId });
        logger.info('Detalhes do pagamento obtidos:', { 
          id: paymentInfo.id,
          status: paymentInfo.status,
          external_reference: paymentInfo.external_reference,
          full_response: JSON.stringify(paymentInfo)
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
          details: { error: 'Falha ao obter informações do pagamento do Mercado Pago', message: error.message }
        });
        
        return res.status(200).json({ error: 'Erro ao recuperar informações do pagamento', processed: false });
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
          details: { 
            error: 'Referência do pedido não encontrada nos dados do pagamento',
            payment_info: JSON.stringify(paymentInfo)
          }
        });
        
        return res.status(200).json({ error: 'Referência do pedido não encontrada', processed: false });
      }

      // Buscar pedido no Firestore
      try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
          logger.error(`Pedido ${orderId} não encontrado no banco de dados`);
          
          // Registrar erro de pedido não encontrado
          await logWebhookEvent({
            action,
            paymentId,
            status: 'error',
            orderId,
            details: { error: 'Pedido não encontrado no banco de dados' }
          });
          
          return res.status(200).json({ error: 'Pedido não encontrado', processed: false });
        }
        
        const orderData = orderDoc.data();
        logger.info(`Pedido ${orderId} encontrado. Status atual: ${orderData.status}, Payment Status: ${orderData.payment_status}`);

        // Garantir que podemos processar o status mesmo se não mudar (força atualização)
        // Determinar novo status com base no status do pagamento
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
          case 'charged_back':
            newStatus = 'cancelled';
            logger.info(`Pagamento ${paymentInfo.status} para o pedido ${orderId}`);
            break;
          case 'in_process':
          case 'in_mediation':
          case 'authorized':
            newStatus = 'pending';
            logger.info(`Pagamento em processamento (${paymentInfo.status}) para o pedido ${orderId}`);
            break;
          default:
            newStatus = 'pending';
            logger.info(`Status de pagamento desconhecido: ${paymentInfo.status} para o pedido ${orderId}`);
        }

        // Sempre atualizar mesmo que o status não mude
        // Isso garante que qualquer possível problema no banco seja corrigido
        await orderRef.update({
          status: newStatus,
          payment_id: paymentInfo.id,
          payment_status: paymentInfo.status,
          payment_method: paymentInfo.payment_method_id,
          payment_confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          payment_details: {
            status_detail: paymentInfo.status_detail,
            payment_type_id: paymentInfo.payment_type_id,
            payment_method_id: paymentInfo.payment_method_id,
            transaction_amount: paymentInfo.transaction_amount,
            installments: paymentInfo.installments
          }
        });

        logger.info(`Status do pedido ${orderId} atualizado para ${newStatus} (payment_status: ${paymentInfo.status})`);
          
        // Registrar atualização bem-sucedida
        await logWebhookEvent({
          action,
          paymentId,
          status: 'success',
          orderId,
          details: {
            oldStatus: orderData.status,
            newStatus,
            oldPaymentStatus: orderData.payment_status,
            newPaymentStatus: paymentInfo.status
          }
        });
          
        logger.info(`Atualização do pedido ${orderId} concluída com sucesso`);
      } catch (error) {
        logger.error(`Erro ao atualizar pedido ${orderId}:`, error);
        
        // Registrar erro ao atualizar pedido
        await logWebhookEvent({
          action,
          paymentId,
          status: 'error',
          orderId,
          details: { error: 'Erro ao atualizar status do pedido', message: error.message }
        });
        
        return res.status(200).json({ error: 'Erro ao atualizar status do pedido', processed: false });
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
      received_at: new Date().toISOString(),
      processed: true
    });
  } catch (error) {
    logger.error('Erro ao processar webhook:', error);
    
    // Registrar erro geral
    await logWebhookEvent({
      action: req.body?.action || req.body?.topic || req.body?.type || 'unknown',
      paymentId: req.body?.data?.id || req.body?.id || 'unknown',
      status: 'error',
      orderId: null,
      details: { error: 'Erro interno do servidor', message: error.message }
    });
    
    // Mesmo com erro, devolvemos 200 para o Mercado Pago não retentar
    res.status(200).json({ error: 'Internal server error', processed: false });
  }
};