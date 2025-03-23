import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function CardActivation() {
  const { linkId = '' } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkId) {
      setError('Link inválido');
      setValidating(false);
      return;
    }

    async function validateCard() {
      try {
        const cardsRef = collection(db, 'cards');
        const q = query(cardsRef, where('linkId', '==', linkId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Cartão não encontrado');
        }

        const card = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };

        if (card.isActive) {
          navigate(`/card/${linkId}`);
          return;
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setValidating(false);
      }
    }

    validateCard();
  }, [linkId, navigate]);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkId) {
      setError('Link inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar usuário pelo email
      const profilesRef = collection(db, 'profiles');
      const q = query(profilesRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Email não encontrado no sistema');
      }

      const profile = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };

      // Buscar e atualizar o cartão
      const cardsRef = collection(db, 'cards');
      const cardQuery = query(cardsRef, where('linkId', '==', linkId));
      const cardSnapshot = await getDocs(cardQuery);

      if (cardSnapshot.empty) {
        throw new Error('Cartão não encontrado');
      }

      const cardDoc = cardSnapshot.docs[0];
      await updateDoc(doc(db, 'cards', cardDoc.id), {
        userId: profile.id,
        isActive: true
      });

      navigate(`/card/${linkId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Erro</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Voltar para a Página Inicial
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Ativar Cartão</h1>
          
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <p className="text-blue-700">
              Para ativar seu cartão, informe o email cadastrado no sistema.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-md mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleActivation} className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Cadastrado
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Informe seu email cadastrado"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                  Ativando...
                </span>
              ) : (
                'Ativar Cartão'
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}