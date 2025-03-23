import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export const validateWebhook = [
  // Validate required fields
  body('action').notEmpty().isString(),
  body('data.id').notEmpty().isString(),
  
  // Validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      logger.warn('Invalid webhook payload:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate Mercado Pago signature if provided
    const signature = req.headers['x-signature'];
    if (signature) {
      if (!validateSignature(req, signature)) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      logger.info('Webhook signature validated successfully');
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
    
    // Generate HMAC (hash-based message authentication code)
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(requestBody);
    const calculatedSignature = hmac.digest('hex');
    
    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    logger.error('Error validating webhook signature:', error);
    return false;
  }
}