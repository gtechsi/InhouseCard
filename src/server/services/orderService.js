import { db } from '../../lib/firebase.js';
import { doc, updateDoc } from 'firebase/firestore';
import { logger } from '../utils/logger.js';

export async function updateOrderStatus(paymentInfo) {
  try {
    const orderId = paymentInfo.external_reference;
    if (!orderId) {
      throw new Error('No order ID provided in external_reference');
    }

    const orderRef = doc(db, 'orders', orderId);
    let newStatus;

    switch (paymentInfo.status) {
      case 'approved':
        newStatus = 'paid';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
      case 'rejected':
        newStatus = 'cancelled';
        break;
      default:
        newStatus = 'pending';
    }

    await updateDoc(orderRef, {
      status: newStatus,
      payment_id: paymentInfo.id,
      payment_status: paymentInfo.status,
      payment_method: paymentInfo.payment_method_id,
      updated_at: new Date().toISOString()
    });

    logger.info(`Order ${orderId} status updated to ${newStatus}`);
  } catch (error) {
    logger.error('Error updating order status:', error);
    throw error;
  }
}