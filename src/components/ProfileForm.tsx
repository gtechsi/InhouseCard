import { useForm } from 'react-hook-form';
import { useState, useRef } from 'react';
import { Profile } from '../types';
import { updateProfile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FaCamera } from 'react-icons/fa';

interface ProfileFormProps {
  profile: Partial<Profile> | null;
  onSuccess: () => void;
}

export default function ProfileForm({ profile, onSuccess }: ProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      fullName: profile?.fullName || '',
      jobTitle: profile?.jobTitle || '',
      company: profile?.company || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      whatsapp: profile?.whatsapp || '',
      coordinates: profile?.coordinates || '',
      website: profile?.website || '',
      instagram: profile?.instagram || '',
      pix: profile?.pix || '',
      bio: profile?.bio || '',
      youtubeUrl: profile?.youtubeUrl || '',
      headerColor: profile?.headerColor || '#DC2626'
    }
  });

  const headerColor = watch('headerColor');

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const base64Image = await convertToBase64(file);
      setAvatarPreview(base64Image);
      
      if (user) {
        await updateProfile(user.id, { avatarUrl: base64Image });
        toast.success('Foto de perfil atualizada com sucesso!');
      }
    } catch (err: any) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem');
      setError('Erro ao processar a imagem. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateProfile(user.id, data);
      toast.success('Perfil atualizado com sucesso!');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Avatar Upload */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
            {avatarPreview ? (
              <img 
                src={avatarPreview} 
                alt="Profile preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-gray-400">
                {profile?.fullName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
          >
            <FaCamera size={16} sm:size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">Nome Completo *</label>
          <input
            id="fullName"
            type="text"
            className="input-field"
            {...register('fullName', { required: 'Nome é obrigatório' })}
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="jobTitle" className="form-label">Cargo</label>
          <input
            id="jobTitle"
            type="text"
            className="input-field"
            {...register('jobTitle')}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="company" className="form-label">Empresa</label>
          <input
            id="company"
            type="text"
            className="input-field"
            {...register('company')}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            id="email"
            type="email"
            className="input-field"
            {...register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido',
              },
            })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="phone" className="form-label">Telefone</label>
          <input
            id="phone"
            type="text"
            className="input-field"
            {...register('phone')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
          <input
            id="whatsapp"
            type="text"
            className="input-field"
            {...register('whatsapp')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="coordinates" className="form-label">Coordenadas (Latitude, Longitude)</label>
          <input
            id="coordinates"
            type="text"
            className="input-field"
            placeholder="Ex: -23.550520, -46.633308"
            {...register('coordinates')}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="instagram" className="form-label">Instagram</label>
          <input
            id="instagram"
            type="text"
            className="input-field"
            placeholder="Seu usuário do Instagram"
            {...register('instagram')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pix" className="form-label">Chave PIX</label>
          <input
            id="pix"
            type="text"
            className="input-field"
            {...register('pix')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="youtubeUrl" className="form-label">URL do Vídeo do YouTube</label>
          <input
            id="youtubeUrl"
            type="text"
            className="input-field"
            placeholder="Ex: https://www.youtube.com/watch?v=..."
            {...register('youtubeUrl')}
          />
          <p className="text-sm text-gray-500 mt-1">
            Cole o link completo do vídeo do YouTube
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="headerColor" className="form-label">Cor do Cabeçalho</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              id="headerColor"
              className="w-12 h-12 p-1 rounded border border-gray-300"
              {...register('headerColor')}
            />
            <input
              type="text"
              className="input-field flex-1"
              value={headerColor}
              onChange={(e) => {
                const input = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(input)) {
                  register('headerColor').onChange({
                    target: { value: input, name: 'headerColor' }
                  });
                }
              }}
            />
          </div>
          <div 
            className="mt-2 h-8 rounded"
            style={{ backgroundColor: headerColor }}
          ></div>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="bio" className="form-label">Biografia</label>
        <textarea
          id="bio"
          rows={4}
          className="input-field"
          {...register('bio')}
        ></textarea>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </form>
  );
}