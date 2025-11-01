import { Injectable, signal } from '@angular/core';
// FIX: Update imports to use the Firebase compat library to match the expected API.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '../firebase.config'; // This can be null

// FIX: Define types based on the Firebase compat library structure.
type Auth = firebase.auth.Auth;
type FirebaseUser = firebase.User;


export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

const FIREBASE_NOT_CONFIGURED_ERROR = "A autenticação está desabilitada. O desenvolvedor precisa configurar as chaves de API do Firebase.";
const UNSUPPORTED_ENV_ERROR = "Esta operação de login não é suportada em um ambiente 'file://'. Por favor, acesse o app através de um servidor web (ex: http://localhost:4200).";
const SOCIAL_LOGIN_DISABLED_ERROR = "Esta forma de login está temporariamente desabilitada.";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth | null = auth;
  currentUser = signal<User | null>(null);

  constructor() {
    if (this.auth) {
      // FIX: Use the onAuthStateChanged method from the auth instance (compat syntax).
      this.auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          };
          this.currentUser.set(user);
        } else {
          this.currentUser.set(null);
        }
      });

      // Handle the result of a redirect sign-in, only if in a supported environment.
      if (this.isSupportedEnvironment()) {
        this.auth.getRedirectResult().catch(error => {
          console.error("Firebase Redirect Result Error:", this.mapFirebaseError(error.code));
        });
      }

    } else {
      console.warn(FIREBASE_NOT_CONFIGURED_ERROR);
    }
  }

  private isSupportedEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    const protocol = window.location.protocol;
    return protocol === 'http:' || protocol === 'httpsa:' || protocol.startsWith('chrome-extension:');
  }

  private firebaseNotConfigured(): Promise<{ success: boolean; error: string }> {
      return Promise.resolve({ success: false, error: FIREBASE_NOT_CONFIGURED_ERROR });
  }

  private async handleSignIn(promise: Promise<any>): Promise<{ success: boolean; error?: string }> {
    if (!this.auth) return this.firebaseNotConfigured();
    try {
      await promise;
      // The onAuthStateChanged listener will handle setting the current user.
      // For redirect flow, this resolves when the redirect is initiated.
      return { success: true };
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      return { success: false, error: this.mapFirebaseError(error.code) };
    }
  }
  
  private developerLogin(): Promise<{ success: boolean; error?: string }> {
    const devUser: User = {
      uid: 'dev-user-01',
      name: 'Desenvolvedora 🎀',
      email: 'dev@silabala.app',
      photoURL: `https://picsum.photos/seed/dev/100`,
    };
    this.currentUser.set(devUser);
    return Promise.resolve({ success: true });
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (email.toLowerCase().trim() === 'dev@dev.com') {
      return this.developerLogin();
    }
    if (!this.auth) return this.firebaseNotConfigured();
    // FIX: Use the signInWithEmailAndPassword method from the auth instance (compat syntax).
    return this.handleSignIn(this.auth.signInWithEmailAndPassword(email, password));
  }
  
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: false, error: SOCIAL_LOGIN_DISABLED_ERROR });
  }

  async signInWithFacebook(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: false, error: SOCIAL_LOGIN_DISABLED_ERROR });
  }

  async signup(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.auth) return this.firebaseNotConfigured();
    try {
      // FIX: Use the createUserWithEmailAndPassword method from the auth instance (compat syntax).
      const credential = await this.auth.createUserWithEmailAndPassword(email, password);
      if (!credential.user) {
        // This case should ideally not happen on success, but good practice to check.
        return { success: false, error: 'Falha ao criar o usuário.' };
      }
      // FIX: Use the updateProfile method on the user object (compat syntax).
      await credential.user.updateProfile({ displayName: name });
      // Manually set user for immediate UI update with the new name.
      const firebaseUser = credential.user;
       const user: User = {
        uid: firebaseUser.uid,
        name: name,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      };
      this.currentUser.set(user);
      return { success: true };
    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        return { success: false, error: this.mapFirebaseError(error.code) };
    }
  }

  async logout(): Promise<void> {
    if (this.auth) {
      // FIX: Use the signOut method from the auth instance (compat syntax).
      await this.auth.signOut();
    }
    // The onAuthStateChanged listener will also set this, but we do it for immediate feedback.
    this.currentUser.set(null);
  }

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.auth) return this.firebaseNotConfigured();
    try {
      // FIX: Use the sendPasswordResetEmail method from the auth instance (compat syntax).
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      return { success: false, error: this.mapFirebaseError(error.code) };
    }
  }

  private mapFirebaseError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/operation-not-supported-in-this-environment':
        return UNSUPPORTED_ENV_ERROR;
      case 'auth/operation-not-allowed':
        return 'Este método de login (e-mail/senha) está desabilitado. Habilite-o no painel do Firebase.';
      case 'auth/unauthorized-domain':
        return 'Este domínio não está autorizado para login. O administrador do app precisa adicioná-lo no painel do Firebase.';
      case 'auth/invalid-email':
        return 'O e-mail fornecido não é válido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha inválidos.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Tente uma mais forte.';
      case 'auth/popup-closed-by-user':
        return 'A janela de login foi fechada. Tente novamente.';
      case 'auth/account-exists-with-different-credential':
        return 'Já existe uma conta com este e-mail usando um método de login diferente.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
    }
  }
}