import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SystemSettings {
  primary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  titanium_card_image_url: string | null;
  mercadopago_public_key: string | null;
  mercadopago_access_token: string | null;
  feature_icons: {
    digital_url: string | null;
    updated_url: string | null;
    eco_url: string | null;
  };
  fonts: {
    heading: string;
    body: string;
  };
  updated_at?: string;
}

const defaultSettings: SystemSettings = {
  primary_color: '#DC2626',
  logo_url: null,
  favicon_url: null,
  hero_image_url: null,
  titanium_card_image_url: null,
  mercadopago_public_key: null,
  mercadopago_access_token: null,
  feature_icons: {
    digital_url: null,
    updated_url: null,
    eco_url: null
  },
  fonts: {
    heading: 'Altone',
    body: 'system-ui'
  }
};

const availableFonts = [
  { name: 'Altone', value: 'Altone' },
  { name: 'System UI', value: 'system-ui' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Times New Roman', value: 'Times New Roman' }
];

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File inputs
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [titaniumCardImage, setTitaniumCardImage] = useState<File | null>(null);
  const [digitalIcon, setDigitalIcon] = useState<File | null>(null);
  const [updatedIcon, setUpdatedIcon] = useState<File | null>(null);
  const [ecoIcon, setEcoIcon] = useState<File | null>(null);

  // Previews
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewFavicon, setPreviewFavicon] = useState<string | null>(null);
  const [previewHeroImage, setPreviewHeroImage] = useState<string | null>(null);
  const [previewTitaniumCardImage, setPreviewTitaniumCardImage] = useState<string | null>(null);
  const [previewDigitalIcon, setPreviewDigitalIcon] = useState<string | null>(null);
  const [previewUpdatedIcon, setPreviewUpdatedIcon] = useState<string | null>(null);
  const [previewEcoIcon, setPreviewEcoIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/profile');
      return;
    }

    fetchSettings();
  }, [user, isAdmin, navigate]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      
      const settingsRef = doc(db, 'system_settings', 'default');
      let settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        const initialSettings = {
          ...defaultSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await setDoc(settingsRef, initialSettings);
        settingsDoc = await getDoc(settingsRef);
      }

      const data = settingsDoc.data() as SystemSettings;
      const mergedSettings = {
        ...defaultSettings,
        ...data
      };
      
      setSettings(mergedSettings);
      if (mergedSettings.logo_url) setPreviewLogo(mergedSettings.logo_url);
      if (mergedSettings.favicon_url) setPreviewFavicon(mergedSettings.favicon_url);
      if (mergedSettings.hero_image_url) setPreviewHeroImage(mergedSettings.hero_image_url);
      if (mergedSettings.titanium_card_image_url) setPreviewTitaniumCardImage(mergedSettings.titanium_card_image_url);
      if (mergedSettings.feature_icons.digital_url) setPreviewDigitalIcon(mergedSettings.feature_icons.digital_url);
      if (mergedSettings.feature_icons.updated_url) setPreviewUpdatedIcon(mergedSettings.feature_icons.updated_url);
      if (mergedSettings.feature_icons.eco_url) setPreviewEcoIcon(mergedSettings.feature_icons.eco_url);

      document.documentElement.style.setProperty('--color-primary', mergedSettings.primary_color);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setError('Erro ao carregar configurações. Por favor, tente novamente.');
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isAdmin) return;

    try {
      setSaving(true);
      setError(null);
      
      let logoUrl = settings.logo_url;
      let faviconUrl = settings.favicon_url;
      let heroImageUrl = settings.hero_image_url;
      let titaniumCardImageUrl = settings.titanium_card_image_url;
      let digitalIconUrl = settings.feature_icons.digital_url;
      let updatedIconUrl = settings.feature_icons.updated_url;
      let ecoIconUrl = settings.feature_icons.eco_url;

      if (logo) {
        logoUrl = await convertToBase64(logo);
      }

      if (favicon) {
        faviconUrl = await convertToBase64(favicon);
      }

      if (heroImage) {
        heroImageUrl = await convertToBase64(heroImage);
      }

      if (titaniumCardImage) {
        titaniumCardImageUrl = await convertToBase64(titaniumCardImage);
      }

      if (digitalIcon) {
        digitalIconUrl = await convertToBase64(digitalIcon);
      }

      if (updatedIcon) {
        updatedIconUrl = await convertToBase64(updatedIcon);
      }

      if (ecoIcon) {
        ecoIconUrl = await convertToBase64(ecoIcon);
      }

      const updatedSettings = {
        ...settings,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        hero_image_url: heroImageUrl,
        titanium_card_image_url: titaniumCardImageUrl,
        feature_icons: {
          digital_url: digitalIconUrl,
          updated_url: updatedIconUrl,
          eco_url: ecoIconUrl
        },
        updated_at: new Date().toISOString()
      };

      const settingsRef = doc(db, 'system_settings', 'default');
      await setDoc(settingsRef, updatedSettings, { merge: true });

      setSettings(updatedSettings);
      document.documentElement.style.setProperty('--color-primary', settings.primary_color);

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações. Por favor, tente novamente.');
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  // Adiciona função para lidar com a configuração do ngrok
  const handleNgrokConfig = () => {
    const currentUrl = localStorage.getItem('ngrok_webhook_url') || '';
    const newUrl = prompt('Digite a URL do ngrok para webhooks (ex: https://1234abcd.ngrok.io):', currentUrl);
    
    if (newUrl === null) return; // Usuário cancelou
    
    if (newUrl.trim() === '') {
      localStorage.removeItem('ngrok_webhook_url');
      toast.success('URL do ngrok removida');
    } else {
      // Validar se a URL é do formato ngrok
      if (newUrl.includes('ngrok.io') || newUrl.includes('ngrok-free.app')) {
        localStorage.setItem('ngrok_webhook_url', newUrl);
        toast.success('URL do ngrok configurada com sucesso');
      } else {
        toast.error('URL inválida. Deve ser uma URL do ngrok');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Configurações do Sistema</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button 
            onClick={fetchSettings}
            className="ml-4 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mercado Pago Settings */}
          <div className="form-group">
            <h3 className="text-lg font-medium mb-4">Configurações do Mercado Pago</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="mercadopago_public_key" className="form-label">
                  Chave Pública (Public Key)
                </label>
                <input
                  id="mercadopago_public_key"
                  type="text"
                  value={settings.mercadopago_public_key || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    mercadopago_public_key: e.target.value
                  })}
                  className="input-field"
                  placeholder="TEST-0000000-0000-0000-0000-000000000000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Chave pública para integração com o Mercado Pago
                </p>
              </div>

              <div>
                <label htmlFor="mercadopago_access_token" className="form-label">
                  Token de Acesso (Access Token)
                </label>
                <input
                  id="mercadopago_access_token"
                  type="password"
                  value={settings.mercadopago_access_token || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    mercadopago_access_token: e.target.value
                  })}
                  className="input-field"
                  placeholder="TEST-0000000000000000-000000-00000000000000000000000000000000-000000000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Token de acesso para autenticação com a API do Mercado Pago
                </p>
              </div>
            </div>
          </div>

          {/* Cor Primária */}
          <div className="form-group">
            <label htmlFor="primaryColor" className="form-label">
              Cor Primária
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                id="primaryColor"
                value={settings.primary_color}
                onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                className="w-20 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => {
                  const input = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(input)) {
                    setSettings({...settings, primary_color: input});
                  }
                }}
                className="input-field flex-1"
                placeholder="#000000"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <div 
              className="mt-2 h-8 rounded"
              style={{ backgroundColor: settings.primary_color }}
            ></div>
          </div>

          {/* Fontes */}
          <div className="form-group">
            <h3 className="text-lg font-medium mb-4">Fontes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="headingFont" className="form-label">
                  Fonte dos Títulos
                </label>
                <select
                  id="headingFont"
                  value={settings.fonts.heading}
                  onChange={(e) => setSettings({
                    ...settings,
                    fonts: {...settings.fonts, heading: e.target.value}
                  })}
                  className="input-field"
                >
                  {availableFonts.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bodyFont" className="form-label">
                  Fonte do Corpo
                </label>
                <select
                  id="bodyFont"
                  value={settings.fonts.body}
                  onChange={(e) => setSettings({
                    ...settings,
                    fonts: {...settings.fonts, body: e.target.value}
                  })}
                  className="input-field"
                >
                  {availableFonts.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="form-group">
            <label htmlFor="logo" className="form-label">
              Logo
            </label>
            <div className="flex items-center space-x-4">
              {previewLogo && (
                <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewLogo}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogo(file);
                    const base64 = await convertToBase64(file);
                    setPreviewLogo(base64);
                  }
                }}
                className="input-field flex-1"
              />
            </div>
          </div>

          {/* Favicon */}
          <div className="form-group">
            <label htmlFor="favicon" className="form-label">
              Favicon
            </label>
            <div className="flex items-center space-x-4">
              {previewFavicon && (
                <div className="w-10 h-10 border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewFavicon}
                    alt="Favicon preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <input
                type="file"
                id="favicon"
                accept="image/x-icon,image/png"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFavicon(file);
                    const base64 = await convertToBase64(file);
                    setPreviewFavicon(base64);
                  }
                }}
                className="input-field flex-1"
              />
            </div>
          </div>

          {/* Hero Image */}
          <div className="form-group">
            <label htmlFor="heroImage" className="form-label">
              Imagem Principal (Hero)
            </label>
            <div className="flex items-center space-x-4">
              {previewHeroImage && (
                <div className="w-32 h-20 border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewHeroImage}
                    alt="Hero image preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                id="heroImage"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setHeroImage(file);
                    const base64 = await convertToBase64(file);
                    setPreviewHeroImage(base64);
                  }
                }}
                className="input-field flex-1"
              />
            </div>
          </div>

          {/* Titanium Card Image */}
          <div className="form-group">
            <label htmlFor="titaniumCardImage" className="form-label">
              Imagem do Cartão Titanium
            </label>
            <div className="flex items-center space-x-4">
              {previewTitaniumCardImage && (
                <div className="w-32 h-20 border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewTitaniumCardImage}
                    alt="Titanium card preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                id="titaniumCardImage"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setTitaniumCardImage(file);
                    const base64 = await convertToBase64(file);
                    setPreviewTitaniumCardImage(base64);
                  }
                }}
                className="input-field flex-1"
              />
            </div>
          </div>

          {/* Feature Icons */}
          <div className="form-group">
            <h3 className="text-lg font-medium mb-4">Ícones dos Recursos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="digitalIcon" className="form-label">
                  Ícone Digital
                </label>
                <div className="flex items-center space-x-4">
                  {previewDigitalIcon && (
                    <div className="w-12 h-12 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={previewDigitalIcon}
                        alt="Digital icon preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="digitalIcon"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDigitalIcon(file);
                        const base64 = await convertToBase64(file);
                        setPreviewDigitalIcon(base64);
                      }
                    }}
                    className="input-field flex-1"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="updatedIcon" className="form-label">
                  Ícone Atualização
                </label>
                <div className="flex items-center space-x-4">
                  {previewUpdatedIcon && (
                    <div className="w-12 h-12 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={previewUpdatedIcon}
                        alt="Updated icon preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="updatedIcon"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUpdatedIcon(file);
                        const base64 = await convertToBase64(file);
                        setPreviewUpdatedIcon(base64);
                      }
                    }}
                    className="input-field flex-1"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ecoIcon" className="form-label">
                  Ícone Ecológico
                </label>
                <div className="flex items-center space-x-4">
                  {previewEcoIcon && (
                    <div className="w-12 h-12 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={previewEcoIcon}
                        alt="Eco icon preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="ecoIcon"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEcoIcon(file);
                        const base64 = await convertToBase64(file);
                        setPreviewEcoIcon(base64);
                      }
                    }}
                    className="input-field flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary min-w-[200px]"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>

      {/* Seção de Configurações de Desenvolvimento */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configurações de Desenvolvimento</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">URL do Ngrok para Webhooks</label>
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">
                {localStorage.getItem('ngrok_webhook_url') || 'Não configurado'}
              </span>
              <button 
                onClick={handleNgrokConfig}
                className="btn btn-sm btn-primary"
              >
                Configurar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Usado para testes de webhook em ambiente de desenvolvimento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}