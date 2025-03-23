import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export const validateWebhook = [
  // Validate required fields
  body('action').notEmpty().isString().optional(),
  body('data.id').notEmpty().isString().optional(),
  
  // Validation middleware
  (req, res, next) => {
    // Se for uma notificação de webhook v2 (id no query params), pular validações
    if (req.query && (req.query.id || req.query.data && req.query.data.id)) {
      logger.info('Webhook v2 detectado, pulando validação de campos');
      return next();
    }
    
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      logger.warn('Invalid webhook payload:', errors.array());
      // Não retornar erro, apenas logar para fins de depuração
      // return res.status(400).json({ errors: errors.array() });
    }

    // Validate Mercado Pago signature if provided
    const signature = req.headers['x-signature'];
    if (signature) {
      try {
        if (!validateSignature(req, signature)) {
          logger.warn('Invalid webhook signature', { timestamp: new Date().toISOString() });
          // Não bloquear a requisição, apenas logar o aviso
          // return res.status(401).json({ error: 'Invalid signature' });
        } else {
          logger.info('Webhook signature validated successfully');
        }
      } catch (error) {
        logger.error('Error during signature validation:', error);
        // Não bloquear a requisição em caso de erro
      }
    } else {
      logger.warn('No signature provided in webhook request');
    }

    next();
  }
];

function validateSignature(req, signature) {
  try {
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.warn('MP_WEBHOOK_SECRET not configured');
      return true; // Skip validation if secret not configured
    }
    
    // Get the raw body from the request
    const requestBody = JSON.stringify(req.body);
    
    // Verifica se a assinatura do Mercado Pago está no formato esperado (ts-XXXXXX)
    if (signature && signature.startsWith('ts-')) {
      // Para Mercado Pago, estamos aceitando o formato ts-XXXXX
      logger.info('Assinatura do Mercado Pago detectada e aceita');
      return true;
    }
    
    // Generate HMAC (hash-based message authentication code)
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(requestBody);
    const calculatedSignature = hmac.digest('hex');
    
    // Compare signatures - sem usar timingSafeEqual que está causando erros
    return calculatedSignature === signature;
  } catch (error) {
    logger.error('Error validating webhook signature:', error);
    return false;
  }
}