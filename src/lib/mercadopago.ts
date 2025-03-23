import { loadMercadoPago } from '@mercadopago/sdk-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CartItem } from '../types';

// Declare a interface global do MercadoPago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CreatePreferenceParams {
  items: CartItem[];
  userId: string;
  orderId: string;
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

/**
 * Determina a URL de webhook a ser usada com base no ambiente
 */
function getWebhookUrl(): string {
  // Ambiente de produção
  if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
    return `${window.location.origin}/webhook`;
  }
  
  // Em desenvolvimento, usa ngrok ou webhook.site se disponível
  // Nota: Para desenvolvimento local, é necessário configurar um serviço como ngrok
  // Para fins de teste, você pode usar um webhook temporário do webhook.site
  const ngrokUrl = localStorage.getItem('ngrok_webhook_url');
  if (ngrokUrl) {
    return `${ngrokUrl}/webhook`;
  }
  
  // URL de fallback para testes
  return 'https://webhook.site/your-test-webhook-id';
}

export async function initMercadoPago() {
  try {
    // Get Mercado Pago public key from system settings
    const settingsRef = doc(db, 'system_settings', 'default');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      throw new Error('System settings not found');
    }

    const settings = settingsDoc.data();
    const publicKey = settings.mercadopago_public_key;
    
    if (!publicKey) {
      throw new Error('Mercado Pago public key not configured');
    }

    // Initialize Mercado Pago SDK
    await loadMercadoPago();
    const mp = new window.MercadoPago(publicKey, {
      locale: 'pt-BR'
    });

    return mp;
  } catch (error) {
    console.error('Error initializing Mercado Pago:', error);
    throw error;
  }
}

export async function createPaymentPreference({ items, userId, orderId, shippingAddress }: CreatePreferenceParams) {
  try {
    // Validate cart items
    if (!items.length) {
      throw new Error('Empty cart');
    }

    // Get Mercado Pago settings
    const settingsRef = doc(db, 'system_settings', 'default');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      throw new Error('System settings not found');
    }

    const settings = settingsDoc.data();
    const accessToken = settings.mercadopago_access_token;
    
    if (!accessToken) {
      throw new Error('Mercado Pago access token not configured');
    }

    // Get user profile
    const profileRef = doc(db, 'profiles', userId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      throw new Error('User profile not found');
    }

    const profile = profileDoc.data();

    // Format items for Mercado Pago
    const mpItems = items.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: Number(item.price.toFixed(2)),
      description: item.title,
      category_id: 'others'
    }));

    // Format payer information
    const payer = {
      name: profile.fullName.split(' ')[0],
      surname: profile.fullName.split(' ').slice(1).join(' '),
      email: shippingAddress.email,
      phone: {
        area_code: shippingAddress.phone.slice(0, 2),
        number: shippingAddress.phone.slice(2).replace(/\D/g, '')
      },
      address: {
        zip_code: shippingAddress.zipcode.replace(/\D/g, ''),
        street_name: shippingAddress.street,
        street_number: parseInt(shippingAddress.number),
        neighborhood: shippingAddress.neighborhood,
        city: shippingAddress.city,
        federal_unit: shippingAddress.state
      }
    };

    // Obter a URL do webhook com base no ambiente
    const webhookUrl = getWebhookUrl();
    console.log('Using webhook URL:', webhookUrl);

    // Create payment preference
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: mpItems,
        payer,
        payment_methods: {
          excluded_payment_types: [],
          installments: 12,
          default_installments: 1
        },
        back_urls: {
          success: `${window.location.origin}/payment/status?status=success&order=${orderId}`,
          failure: `${window.location.origin}/payment/status?status=failure&order=${orderId}`,
          pending: `${window.location.origin}/payment/status?status=pending&order=${orderId}`
        },
        auto_return: 'approved',
        statement_descriptor: 'InHouse Card',
        notification_url: webhookUrl,
        external_reference: orderId,
        expires: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago error:', errorData);
      throw new Error(errorData.message || 'Error creating payment preference');
    }

    const data = await response.json();
    console.log('Mercado Pago preference created:', data.id);
    
    return {
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    };
  } catch (error: any) {
    console.error('Error creating payment preference:', error);
    throw new Error(error.message || 'Error creating payment preference');
  }
}

export async function processPayment(paymentData: any) {
  try {
    // Get Mercado Pago settings
    const settingsRef = doc(db, 'system_settings', 'default');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      throw new Error('System settings not found');
    }

    const settings = settingsDoc.data();
    const accessToken = settings.mercadopago_access_token;
    
    if (!accessToken) {
      throw new Error('Mercado Pago access token not configured');
    }

    // Process payment
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment error:', errorData);
      throw new Error(errorData.message || 'Error processing payment');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error processing payment:', error);
    throw new Error(error.message || 'Error processing payment');
  }
}