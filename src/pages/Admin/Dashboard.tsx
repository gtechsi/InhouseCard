import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Card } from '../../types';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs,
  addDoc,
  doc,
  updateDoc,
  where 
} from 'firebase/firestore';

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [newCardLink, setNewCardLink] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/profile');
      return;
    }

    fetchCards();
  }, [user, isAdmin, isLoading, navigate]);

  async function fetchCards() {
    try {
      setLoading(true);
      const cardsRef = collection(db, 'cards');
      const q = query(cardsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const cardsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Card[];

      setCards(cardsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateNewCard() {
    try {
      setGeneratingCard(true);
      setError(null);
      
      const linkId = uuidv4();
      const cardsRef = collection(db, 'cards');
      await addDoc(cardsRef, {
        linkId,
        isActive: false,
        userId: null,
        createdAt: new Date().toISOString()
      });
      
      const newLink = `${window.location.origin}/card/${linkId}`;
      setNewCardLink(newLink);
      fetchCards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingCard(false);
    }
  }

  async function toggleCardStatus(card: Card) {
    try {
      const cardRef = doc(db, 'cards', card.id);
      await updateDoc(cardRef, {
        isActive: !card.isActive
      });
      fetchCards();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <button
          onClick={generateNewCard}
          disabled={generatingCard}
          className="btn btn-primary"
        >
          {generatingCard ? 'Gerando...' : 'Gerar Novo Cartão'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {newCardLink && (
        <div className="bg-green-50 p-4 rounded-md mb-6">
          <h3 className="font-medium text-green-800 mb-2">Novo cartão gerado com sucesso!</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={newCardLink}
              readOnly
              className="input-field flex-grow mr-2"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(newCardLink);
                alert('Link copiado para a área de transferência!');
              }}
              className="btn btn-secondary"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Cartões Gerados</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : cards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum cartão gerado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cards.map((card) => (
                    <tr key={card.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {card.linkId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          card.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {card.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.userId ? card.userId.substring(0, 8) + '...' : 'Não associado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleCardStatus(card)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          {card.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <a
                          href={`/card/${card.linkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Visualizar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}