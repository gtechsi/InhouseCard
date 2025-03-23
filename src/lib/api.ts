import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Profile, Card } from '../types';
import toast from 'react-hot-toast';

// Profiles
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Profile;
  } catch (error: any) {
    toast.error('Erro ao carregar perfil');
    throw error;
  }
}

export async function updateProfile(userId: string, data: Partial<Profile>): Promise<Profile> {
  try {
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await getDoc(docRef);
    toast.success('Perfil atualizado com sucesso');
    return { id: updatedDoc.id, ...updatedDoc.data() } as Profile;
  } catch (error: any) {
    toast.error('Erro ao atualizar perfil');
    throw error;
  }
}

// Cards
export async function getCard(linkId: string): Promise<Card | null> {
  try {
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('linkId', '==', linkId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Card;
  } catch (error: any) {
    toast.error('Erro ao carregar cartão');
    throw error;
  }
}

export async function checkCardStatus(linkId: string): Promise<{
  status: 'active' | 'inactive' | 'not_found';
  userId?: string;
  redirectUrl: string;
}> {
  try {
    const card = await getCard(linkId);
    
    if (!card) {
      return {
        status: 'not_found',
        redirectUrl: '/404'
      };
    }

    if (!card.isActive) {
      return {
        status: 'inactive',
        redirectUrl: `/card/${linkId}/activate`
      };
    }

    if (!card.userId) {
      return {
        status: 'inactive',
        redirectUrl: `/register?link=${linkId}`
      };
    }

    return {
      status: 'active',
      userId: card.userId,
      redirectUrl: `/card/${linkId}`
    };
  } catch (error) {
    toast.error('Erro ao verificar status do cartão');
    throw error;
  }
}

export async function activateCard(linkId: string, email: string): Promise<boolean> {
  try {
    const card = await getCard(linkId);
    if (!card) throw new Error('Cartão não encontrado');

    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Email não encontrado no sistema');
    }

    const profile = querySnapshot.docs[0];
    await updateDoc(doc(db, 'cards', card.id), {
      userId: profile.id,
      isActive: true
    });

    toast.success('Cartão ativado com sucesso');
    return true;
  } catch (error: any) {
    toast.error(error.message || 'Erro ao ativar cartão');
    throw error;
  }
}