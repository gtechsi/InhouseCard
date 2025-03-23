import localforage from 'localforage';

const CACHE_PREFIX = 'inhouse_card_';
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutos

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await localforage.getItem<CacheItem<T>>(CACHE_PREFIX + key);
      
      if (!item) return null;
      
      // Verifica se o cache expirou
      if (Date.now() - item.timestamp > CACHE_DURATION) {
        await this.remove(key);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('Erro ao ler do cache:', error);
      return null;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now()
      };
      await localforage.setItem(CACHE_PREFIX + key, item);
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await localforage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.error('Erro ao remover do cache:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await localforage.keys();
      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
          await localforage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }
};