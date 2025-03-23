import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function setUserAsAdmin(email: string) {
  try {
    // Verificar se o usuário atual é admin
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      throw new Error('Permissão negada: apenas administradores podem executar esta ação');
    }

    // Buscar o perfil do usuário pelo email
    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Usuário não encontrado');
    }

    const userDoc = querySnapshot.docs[0];
    
    // Atualizar o papel do usuário para admin
    await updateDoc(doc(db, 'profiles', userDoc.id), {
      role: 'admin'
    });

    return true;
  } catch (error) {
    console.error('Erro ao definir usuário como admin:', error);
    throw error;
  }
}

async function getCurrentUser() {
  try {
    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      return {
        id: adminDoc.id,
        ...adminDoc.data(),
        isAdmin: true
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    return null;
  }
}