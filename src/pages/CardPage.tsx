import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardView from '../components/CardView';
import { checkCardStatus } from '../lib/api';

export default function CardPage() {
  const { linkId = '' } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkId) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    async function verifyCardStatus() {
      try {
        setLoading(true);
        const result = await checkCardStatus(linkId);

        if (result.status === 'not_found') {
          setError('Cartão não encontrado');
          return;
        }

        // Se o cartão não estiver ativo ou não tiver usuário associado,
        // redireciona para a rota apropriada
        if (result.redirectUrl !== `/card/${linkId}`) {
          navigate(result.redirectUrl, { replace: true });
          return;
        }

        if (result.userId) {
          setUserId(result.userId);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao verificar status do cartão');
      } finally {
        setLoading(false);
      }
    }

    verifyCardStatus();
  }, [linkId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Erro</h2>
            <p className="text-gray-700 mb-4">{error || 'Cartão não encontrado ou não configurado'}</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Voltar para a Página Inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-md mx-4">
        <CardView userId={userId} />
      </div>
    </div>
  );
}