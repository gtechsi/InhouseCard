import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Interface para logs de webhook
interface WebhookLog {
  id: string;
  timestamp: any;
  action: string;
  status: string;
  paymentId: string;
  orderId: string;
  details: any;
}

export default function WebhookMonitor() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Formatar data/hora
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(date);
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/profile');
      return;
    }

    // Verificar se a coleção de logs existe
    async function checkCollection() {
      try {
        const settingsRef = doc(db, 'system_settings', 'default');
        const settingsDoc = await getDoc(settingsRef);
        
        if (!settingsDoc.exists()) {
          console.error('Configurações do sistema não encontradas');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao verificar coleção de logs:', error);
        setLoading(false);
      }
    }

    checkCollection();

    // Assinar atualizações da coleção de logs de webhook
    const logsQuery = query(
      collection(db, 'webhook_logs'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData: WebhookLog[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as WebhookLog);
      
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao monitorar logs de webhook:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin, navigate]);

  // Exibir URL atual do webhook
  const webhookUrl = () => {
    const ngrokUrl = localStorage.getItem('ngrok_webhook_url');
    
    if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
      return `${window.location.origin}/webhook`;
    }
    
    if (ngrokUrl) {
      return `${ngrokUrl}/webhook`;
    }
    
    return 'Não configurado';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Monitor de Webhooks</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuração Atual</h2>
        
        <div className="mb-4">
          <p><strong>URL do Webhook:</strong> {webhookUrl()}</p>
          {webhookUrl() === 'Não configurado' && (
            <p className="text-red-500 text-sm mt-1">
              Configure a URL do ngrok em Configurações para testar webhooks localmente
            </p>
          )}
        </div>
        
        <div>
          <p className="text-sm text-gray-600">
            Para testar, você pode usar o Postman para enviar uma solicitação POST para a URL acima com o seguinte corpo:
          </p>
          <pre className="bg-gray-100 p-3 rounded text-xs mt-2 overflow-auto">
{`{
  "action": "payment.created",
  "data": {
    "id": "123456789"
  }
}`}
          </pre>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Logs Recentes</h2>
        
        {loading ? (
          <p>Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">Nenhum log de webhook encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Data/Hora</th>
                  <th className="py-3 px-6 text-left">Ação</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-left">ID Pagamento</th>
                  <th className="py-3 px-6 text-left">ID Pedido</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-6 text-left">{log.action}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-left">{log.paymentId}</td>
                    <td className="py-3 px-6 text-left">{log.orderId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 