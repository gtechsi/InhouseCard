import { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { initMercadoPago, createCardToken, createPaymentPreference } from '../lib/mercadopago';
import toast from 'react-hot-toast';

interface CheckoutFormProps {
  items: CartItem[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CheckoutForm({ items, onSuccess, onCancel }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [installments, setInstallments] = useState('1');

  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY)
      .catch(error => {
        console.error('Erro ao inicializar Mercado Pago:', error);
        toast.error('Erro ao inicializar pagamento');
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Create card token
      const cardToken = await createCardToken({
        cardNumber,
        cardholderName,
        expirationMonth,
        expirationYear,
        securityCode,
      });

      // Create payment preference
      const preference = await createPaymentPreference(items);

      // Process payment
      const response = await fetch('YOUR_BACKEND_URL/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: cardToken.id,
          installments,
          preferenceId: preference.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }

      const result = await response.json();
      
      if (result.status === 'approved') {
        toast.success('Pagamento aprovado!');
        onSuccess();
      } else {
        toast.error('Pagamento não aprovado');
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="form-group">
        <label htmlFor="cardNumber" className="form-label">
          Número do Cartão
        </label>
        <input
          id="cardNumber"
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          className="input-field"
          placeholder="1234 5678 9012 3456"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="cardholderName" className="form-label">
          Nome no Cartão
        </label>
        <input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="input-field"
          placeholder="Como aparece no cartão"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="expirationMonth" className="form-label">
            Mês de Expiração
          </label>
          <input
            id="expirationMonth"
            type="text"
            value={expirationMonth}
            onChange={(e) => setExpirationMonth(e.target.value)}
            className="input-field"
            placeholder="MM"
            maxLength={2}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="expirationYear" className="form-label">
            Ano de Expiração
          </label>
          <input
            id="expirationYear"
            type="text"
            value={expirationYear}
            onChange={(e) => setExpirationYear(e.target.value)}
            className="input-field"
            placeholder="YYYY"
            maxLength={4}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="securityCode" className="form-label">
          Código de Segurança (CVV)
        </label>
        <input
          id="securityCode"
          type="text"
          value={securityCode}
          onChange={(e) => setSecurityCode(e.target.value)}
          className="input-field"
          placeholder="123"
          maxLength={4}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="installments" className="form-label">
          Parcelas
        </label>
        <select
          id="installments"
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
          className="input-field"
          required
        >
          <option value="1">1x sem juros</option>
          <option value="2">2x sem juros</option>
          <option value="3">3x sem juros</option>
          <option value="4">4x sem juros</option>
          <option value="5">5x sem juros</option>
          <option value="6">6x sem juros</option>
        </select>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Processando...' : 'Finalizar Compra'}
        </button>
      </div>
    </form>
  );
}