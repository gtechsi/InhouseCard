// Script para testar o webhook do Mercado Pago enviando uma notificação simulada
// Execute com: node test-webhook.js

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// URL do webhook
const webhookUrl = process.env.MP_NOTIFICATION_URL || 'http://localhost:3000/webhook';

// ID do pagamento para testar (substitua por um ID real do Mercado Pago, se disponível)
const paymentId = '123456789';

// Crie diferentes payloads para testar os diferentes formatos de webhook

// Formato topic e id (IPN feed)
const topicPayload = {
  topic: 'payment',
  id: paymentId
};

// Formato action e data.id (webhook / notificação tradicional)
const actionPayload = {
  action: 'payment.updated',
  data: {
    id: paymentId
  }
};

// Formato API v2
const apiV2Payload = {
  type: 'payment',
  data: {
    id: paymentId
  }
};

// Função para enviar a requisição de teste
async function sendTestWebhook(payload, name) {
  try {
    console.log(`Enviando payload de teste (formato ${name}):`, JSON.stringify(payload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Webhook': 'true'
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await response.json();
    console.log(`Resposta (${response.status}):`, responseData);
    
    return { success: response.ok, status: response.status, data: responseData };
  } catch (error) {
    console.error('Erro ao enviar webhook de teste:', error);
    return { success: false, error: error.message };
  }
}

// Executar os testes
async function runTests() {
  console.log('=== TESTE DE WEBHOOK DO MERCADO PAGO ===');
  console.log(`URL do webhook: ${webhookUrl}`);
  console.log('--------------------------------------');
  
  // Testar os diferentes formatos
  console.log('\n1. Testando formato de feed (topic/id):');
  await sendTestWebhook(topicPayload, 'feed');
  
  console.log('\n2. Testando formato tradicional (action/data.id):');
  await sendTestWebhook(actionPayload, 'tradicional');
  
  console.log('\n3. Testando formato API v2 (type/data.id):');
  await sendTestWebhook(apiV2Payload, 'API v2');
  
  console.log('\nTestes concluídos. Verifique os logs do servidor para mais detalhes.');
}

// Executar os testes
runTests().catch(error => {
  console.error('Erro ao executar testes:', error);
}); 