import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileForm from '../components/ProfileForm';
import AddressForm from '../components/AddressForm';
import CardView from '../components/CardView';
import { getProfile } from '../lib/api';
import { Profile } from '../types';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'address'>('view');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await getProfile(user.id);
        if (!data) {
          setActiveTab('edit');
        } else {
          setProfile(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, navigate]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    try {
      const data = await getProfile(user.id);
      setProfile(data);
      setActiveTab('view');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'view'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Visualizar
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'edit'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Editar
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'address'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Endereço
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      ) : (
        <div>
          {activeTab === 'view' ? (
            profile ? (
              <CardView userId={user.id} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Você ainda não configurou seu perfil.</p>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="btn btn-primary"
                >
                  Configurar Perfil
                </button>
              </div>
            )
          ) : activeTab === 'edit' ? (
            <ProfileForm profile={profile} onSuccess={handleProfileUpdate} />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Endereço de Entrega</h2>
              <AddressForm 
                currentAddress={profile?.shipping_address}
                onSuccess={handleProfileUpdate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}