import { useState, useEffect } from 'react';
import { Profile } from '../types';
import { getProfile } from '../lib/api';
import { FaPhone, FaEnvelope, FaWhatsapp, FaMapMarkerAlt, FaInstagram, FaQrcode } from 'react-icons/fa';
import toast from 'react-hot-toast';
import PixPayment from './PixPayment';

interface CardViewProps {
  userId: string;
}

export default function CardView({ userId }: CardViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPixPayment, setShowPixPayment] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  async function fetchProfile() {
    try {
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getYoutubeEmbedUrl(url: string) {
    try {
      let videoId = '';
      
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v') || '';
      }

      if (!videoId) {
        console.error('Invalid YouTube URL format');
        return null;
      }

      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    } catch (err) {
      console.error('Error parsing YouTube URL:', err);
      return null;
    }
  }

  function handleWhatsAppClick() {
    if (!profile?.whatsapp) {
      toast.error('WhatsApp não configurado');
      return;
    }

    const whatsappNumber = profile.whatsapp.replace(/\D/g, '');
    const fullNumber = whatsappNumber.startsWith('55') ? whatsappNumber : `55${whatsappNumber}`;
    const whatsappUrl = `https://wa.me/${fullNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  function handleMapClick() {
    if (!profile?.coordinates) {
      toast.error('Localização não configurada');
      return;
    }

    const [lat, lng] = profile.coordinates.split(',').map(Number);
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  }

  function handlePhoneClick() {
    if (!profile?.phone) {
      toast.error('Telefone não configurado');
      return;
    }
    window.location.href = `tel:${profile.phone}`;
  }

  function handleInstagramClick() {
    if (!profile?.instagram) {
      toast.error('Instagram não configurado');
      return;
    }
    window.open(`https://instagram.com/${profile.instagram}`, '_blank');
  }

  function handlePixClick() {
    if (!profile?.pix) {
      toast.error('Chave PIX não configurada');
      return;
    }
    setShowPixPayment(!showPixPayment);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center p-4 sm:p-8 bg-red-50 rounded-lg">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Erro ao carregar o perfil</h3>
        <p className="text-gray-700">{error || 'Perfil não encontrado'}</p>
      </div>
    );
  }

  const youtubeEmbedUrl = profile.youtubeUrl ? getYoutubeEmbedUrl(profile.youtubeUrl) : null;

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Cabeçalho com cor personalizada */}
      <div 
        className="h-24 sm:h-32"
        style={{ backgroundColor: profile.headerColor || '#DC2626' }}
      ></div>
      
      {/* Conteúdo principal */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Foto de perfil */}
        <div className="relative -mt-16 mb-4">
          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full border-4 border-white bg-gray-200 overflow-hidden">
            {profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-gray-400">
                {profile.fullName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Informações do perfil */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{profile.fullName}</h1>
          <p className="text-gray-600">{profile.jobTitle || 'Profissional'}</p>
          {profile.company && (
            <p className="text-gray-500 text-sm">{profile.company}</p>
          )}
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
          <button 
            onClick={handlePhoneClick}
            className="flex flex-col items-center"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1">
              <FaPhone className="text-lg sm:text-xl text-gray-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600">Ligar</span>
          </button>

          <a 
            href={`mailto:${profile.email}`}
            className="flex flex-col items-center"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1">
              <FaEnvelope className="text-lg sm:text-xl text-gray-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600">Email</span>
          </a>

          <button 
            onClick={handleWhatsAppClick}
            className="flex flex-col items-center"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1">
              <FaWhatsapp className="text-lg sm:text-xl text-green-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600">WhatsApp</span>
          </button>

          <button 
            onClick={handleMapClick}
            className="flex flex-col items-center"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1">
              <FaMapMarkerAlt className="text-lg sm:text-xl text-gray-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600">Mapa</span>
          </button>
        </div>

        {/* Biografia */}
        {profile.bio && (
          <div className="mb-6 text-center">
            <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{profile.bio}</p>
          </div>
        )}

        {/* Botões adicionais */}
        <div className="space-y-3">
          <button
            onClick={handlePixClick}
            className="w-full bg-primary text-white py-2 sm:py-3 rounded-lg flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <FaQrcode className="text-lg sm:text-xl" />
            <span>Pagamento PIX</span>
          </button>

          {showPixPayment && (
            <div className="mt-4">
              <PixPayment profile={profile} />
            </div>
          )}

          <button
            onClick={handleInstagramClick}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white py-2 sm:py-3 rounded-lg flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <FaInstagram className="text-lg sm:text-xl" />
            <span>Instagram</span>
          </button>

          {/* YouTube Video */}
          {youtubeEmbedUrl && (
            <div className="mt-6">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src={youtubeEmbedUrl}
                  title="YouTube video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}