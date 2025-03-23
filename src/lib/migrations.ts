import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

const defaultSettings = {
  primary_color: '#DC2626',
  logo_url: null,
  favicon_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function createInitialSettings() {
  try {
    // Verificar se as configurações já existem
    const settingsRef = doc(db, 'system_settings', 'default');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      // Criar configurações padrão
      await setDoc(settingsRef, defaultSettings);
      console.log('Configurações iniciais criadas com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao criar configurações iniciais:', error);
    // Tentar criar novamente em caso de erro
    try {
      const settingsRef = doc(db, 'system_settings', 'default');
      await setDoc(settingsRef, defaultSettings, { merge: true });
      console.log('Configurações iniciais criadas com sucesso na segunda tentativa!');
    } catch (retryError) {
      console.error('Erro ao criar configurações iniciais na segunda tentativa:', retryError);
    }
  }
}

export async function runMigrations() {
  try {
    // Criar configurações iniciais
    await createInitialSettings();

    // Criar documento de configuração
    const configRef = doc(db, 'config', 'system');
    const configDoc = await getDoc(configRef);

    if (!configDoc.exists()) {
      await setDoc(configRef, {
        version: '1.0.0',
        lastMigration: new Date().toISOString()
      });
    }

    console.log('Migrações concluídas com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
  }
}