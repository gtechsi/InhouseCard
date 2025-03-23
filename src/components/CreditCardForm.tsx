import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import toast from 'react-hot-toast';

interface CreditCardFormProps {
  onSubmit: (formData: any) => Promise<void>;
  publicKey: string;
  loading: boolean;
}

export default function CreditCardForm({ onSubmit, publicKey, loading }: CreditCardFormProps) {
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [mpLoaded, setMpLoaded] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    async function initMercadoPago() {
      try {
        await loadMercadoPago();
        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        // Initialize card form
        const cardForm = mp.cardForm({
          amount: "100.00",
          iframe: true,
          form: {
            id: "credit-card-form",
            cardNumber: {
              id: "card-number",
              placeholder: "Número do cartão",
            },
            expirationDate: {
              id: "expiration-date",
              placeholder: "MM/YY",
            },
            securityCode: {
              id: "security-code",
              placeholder: "CVV",
            },
            cardholderName: {
              id: "cardholder-name",
              placeholder: "Titular do cartão",
            },
            issuer: {
              id: "issuer",
              placeholder: "Banco emissor",
            },
            installments: {
              id: "installments",
              placeholder: "Parcelas",
            },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.error('Form mounted error:', error);
                return;
              }
              setMpLoaded(true);
            },
            onSubmit: async (event: any) => {
              event.preventDefault();

              const {
                paymentMethodId,
                issuerId,
                cardholderEmail,
                amount,
                token,
                installments,
                identificationNumber,
                identificationType,
              } = cardForm.getCardFormData();

              setCardToken(token);
            },
            onFetching: (resource: any) => {
              // Show loading screen
              console.log('Fetching resource:', resource);
            },
            onError: (error: any) => {
              // Handle errors
              console.error('Card form error:', error);
              toast.error('Erro ao processar cartão');
            },
          },
        });

      } catch (error) {
        console.error('Error initializing Mercado Pago:', error);
        toast.error('Erro ao inicializar formulário de pagamento');
      }
    }

    initMercadoPago();
  }, [publicKey]);

  const handleFormSubmit = async (data: any) => {
    if (!cardToken) {
      toast.error('Por favor, preencha os dados do cartão');
      return;
    }

    try {
      await onSubmit({
        ...data,
        cardToken
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro ao processar pagamento');
    }
  };

  if (!mpLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form id="credit-card-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="form-group">
        <div id="card-number" className="input-field"></div>
        {errors.cardNumber && (
          <p className="text-red-500 text-sm mt-1">{errors.cardNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <div id="expiration-date" className="input-field"></div>
          {errors.expirationDate && (
            <p className="text-red-500 text-sm mt-1">{errors.expirationDate.message}</p>
          )}
        </div>

        <div className="form-group">
          <div id="security-code" className="input-field"></div>
          {errors.securityCode && (
            <p className="text-red-500 text-sm mt-1">{errors.securityCode.message}</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <div id="cardholder-name" className="input-field"></div>
        {errors.cardholderName && (
          <p className="text-red-500 text-sm mt-1">{errors.cardholderName.message}</p>
        )}
      </div>

      <div className="form-group">
        <div id="issuer" className="input-field"></div>
      </div>

      <div className="form-group">
        <div id="installments" className="input-field"></div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? 'Processando...' : 'Pagar'}
      </button>
    </form>
  );
}