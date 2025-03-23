import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  AuthError
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signIn(email: string, password: string) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return {
      userId: user.uid,
      email: user.email,
      token: await user.getIdToken()
    };
  } catch (error) {
    const authError = error as AuthError;
    switch (authError.code) {
      case 'auth/invalid-email':
        throw new Error('Email inválido');
      case 'auth/user-disabled':
        throw new Error('Usuário desativado');
      case 'auth/user-not-found':
        throw new Error('Usuário não encontrado');
      case 'auth/wrong-password':
        throw new Error('Senha incorreta');
      default:
        console.error('Login error:', error);
        throw new Error('Erro ao fazer login');
    }
  }
}

export async function signUp(email: string, password: string, fullName: string) {
  try {
    // Create Firebase auth user
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile
    const profileData = {
      fullName,
      email,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Use the user's UID as the document ID
    await setDoc(doc(db, 'profiles', user.uid), profileData);

    return {
      userId: user.uid,
      email: user.email,
      token: await user.getIdToken()
    };
  } catch (error) {
    const authError = error as AuthError;
    switch (authError.code) {
      case 'auth/email-already-in-use':
        throw new Error('Este email já está cadastrado. Por favor, faça login ou use outro email.');
      case 'auth/invalid-email':
        throw new Error('Email inválido. Por favor, verifique o email informado.');
      case 'auth/operation-not-allowed':
        throw new Error('O cadastro com email e senha não está habilitado.');
      case 'auth/weak-password':
        throw new Error('A senha deve ter pelo menos 6 caracteres.');
      default:
        console.error('Registration error:', error);
        throw new Error('Erro ao criar conta. Por favor, tente novamente.');
    }
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Erro ao fazer logout');
  }
}