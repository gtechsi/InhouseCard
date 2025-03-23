import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { CardBatch } from '../../types';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  where,
  writeBatch
} from 'firebase/firestore';

export default function BatchCards() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<CardBatch | null>(null);
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [cardCount, setCardCount] = useState(10);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CardBatch | null>(null);
  const [batchCards, setBatchCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    fetchBatches();
  }, [user, isAdmin, isLoading, navigate]);

  async function fetchBatches() {
    try {
      setLoading(true);
      const batchesRef = collection(db, 'card_batches');
      const q = query(batchesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const batchesData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const cardsRef = collection(db, 'cards');
        const cardsQuery = query(cardsRef, where('batchId', '==', doc.id));
        const cardsSnapshot = await getDocs(cardsQuery);
        
        return {
          id: doc.id,
          ...doc.data(),
          cardCount: cardsSnapshot.size
        } as CardBatch;
      }));

      setBatches(batchesData);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar lotes');
    } finally {
      setLoading(false);
    }
  }

  async function createBatch() {
    if (!batchName) {
      setError('O nome do lote é obrigatório');
      return;
    }

    if (cardCount <= 0) {
      setError('A quantidade de cartões deve ser maior que zero');
      return;
    }

    try {
      setIsCreatingBatch(true);
      setError(null);

      // Create batch
      const batchRef = await addDoc(collection(db, 'card_batches'), {
        name: batchName,
        description: batchDescription || null,
        createdAt: new Date().toISOString()
      });

      // Create cards in batches of 500 (Firestore batch limit)
      let currentBatch = writeBatch(db);
      let operationCount = 0;
      
      for (let i = 0; i < cardCount; i++) {
        const linkId = uuidv4();
        const cardRef = doc(collection(db, 'cards'));
        
        currentBatch.set(cardRef, {
          linkId,
          batchId: batchRef.id,
          isActive: false,
          userId: null,
          createdAt: new Date().toISOString()
        });

        operationCount++;
        
        // If we reach 500 operations, commit the batch and start a new one
        if (operationCount === 500) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }
      
      // Commit any remaining operations
      if (operationCount > 0) {
        await currentBatch.commit();
      }

      await fetchBatches();
      setBatchName('');
      setBatchDescription('');
      setCardCount(10);
      setShowBatchForm(false);
      
      toast.success(`Lote criado com sucesso! ${cardCount} cartões foram gerados.`);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar lote');
    } finally {
      setIsCreatingBatch(false);
    }
  }

  async function deleteBatch(batch: CardBatch) {
    try {
      setIsDeletingBatch(true);
      setError(null);

      // Delete all cards in the batch
      const cardsRef = collection(db, 'cards');
      const q = query(cardsRef, where('batchId', '==', batch.id));
      const querySnapshot = await getDocs(q);
      
      const fbBatch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        fbBatch.delete(doc.ref);
      });
      await fbBatch.commit();

      // Delete the batch
      await deleteDoc(doc(db, 'card_batches', batch.id));

      await fetchBatches();
      setShowDeleteConfirm(false);
      setBatchToDelete(null);
      
      toast.success('Lote excluído com sucesso');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir lote');
    } finally {
      setIsDeletingBatch(false);
    }
  }

  async function viewBatchCards(batch: CardBatch) {
    try {
      setSelectedBatch(batch);
      setLoadingCards(true);
      
      const cardsRef = collection(db, 'cards');
      // Query cards by batchId without ordering
      const q = query(cardsRef, where('batchId', '==', batch.id));
      const querySnapshot = await getDocs(q);
      
      // Sort cards in memory
      const cards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      setBatchCards(cards);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar cartões');
    } finally {
      setLoadingCards(false);
    }
  }

  function exportCardsToCSV(batch: CardBatch) {
    if (batchCards.length === 0) return;
    
    const csvContent = [
      ['ID', 'Link', 'Status', 'Usuário', 'Data de Criação'],
      ...batchCards.map(card => [
        card.id,
        `${window.location.origin}/card/${card.linkId}`,
        card.isActive ? 'Ativo' : 'Inativo',
        card.userId || 'Não associado',
        new Date(card.createdAt).toLocaleDateString()
      ])
    ]
    .map(row => row.join(','))
    .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lote-${batch.name.replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <h1 className="text-2xl font-bold">Gerenciamento de Lotes de Cartões</h1>
        <button
          onClick={() => setShowBatchForm(!showBatchForm)}
          className="btn btn-primary"
        >
          {showBatchForm ? 'Cancelar' : 'Criar Novo Lote'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showBatchForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Criar Novo Lote de Cartões</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label htmlFor="batchName" className="form-label">Nome do Lote *</label>
              <input
                id="batchName"
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="input-field"
                placeholder="Ex: Evento XYZ 2025"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="batchDescription" className="form-label">Descrição</label>
              <textarea
                id="batchDescription"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                className="input-field"
                placeholder="Descrição opcional para este lote"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="cardCount" className="form-label">Quantidade de Cartões *</label>
              <input
                id="cardCount"
                type="number"
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value))}
                className="input-field"
                min={1}
                max={1000}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Máximo de 1000 cartões por lote
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={createBatch}
                disabled={isCreatingBatch}
                className="btn btn-primary"
              >
                {isCreatingBatch ? 'Criando...' : 'Criar Lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && batchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o lote "{batchToDelete.name}"? 
              Esta ação não pode ser desfeita e todos os {batchToDelete.cardCount} cartões 
              associados serão excluídos.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setBatchToDelete(null);
                }}
                className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
                disabled={isDeletingBatch}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteBatch(batchToDelete)}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={isDeletingBatch}
              >
                {isDeletingBatch ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBatch ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedBatch.name}</h2>
                {selectedBatch.description && (
                  <p className="text-gray-600 mt-1">{selectedBatch.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Criado em {new Date(selectedBatch.createdAt).toLocaleDateString()} • 
                  {selectedBatch.cardCount} cartões
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportCardsToCSV(selectedBatch)}
                  className="btn bg-green-600 text-white hover:bg-green-700"
                  disabled={batchCards.length === 0}
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Voltar
                </button>
              </div>
            </div>
            
            {loadingCards ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : batchCards.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum cartão encontrado neste lote.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Link
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
                    {batchCards.map((card) => (
                      <tr key={card.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <a 
                            href={`/card/${card.linkId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {card.linkId.substring(0, 8)}...
                          </a>
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
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/card/${card.linkId}`);
                              toast.success('Link copiado para a área de transferência!');
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Copiar Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Lotes de Cartões</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : batches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum lote de cartões criado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Cartões
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
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {batch.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {batch.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {batch.cardCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewBatchCards(batch)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Ver Cartões
                          </button>
                          <button
                            onClick={() => {
                              setBatchToDelete(batch);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}