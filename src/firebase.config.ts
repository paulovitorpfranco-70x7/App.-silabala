// FIX: Update Firebase imports to use the compat library, resolving module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// --- Configuração do Firebase ---
// As chaves abaixo foram configuradas para habilitar a autenticação real
// para o projeto SilabaLa+.
export const firebaseConfig = {
  apiKey: "AIzaSyCOZZRYV8l1K97aNT-sed8pToZRLCsiOD0",
  authDomain: "silabala-8590f.firebaseapp.com",
  projectId: "silabala-8590f",
  storageBucket: "silabala-8590f.firebasestorage.app",
  messagingSenderId: "470307745533",
  appId: "1:470307745533:web:8729e5603dd4169d6ad894",
  measurementId: "G-XRGCPRV8T6"
};

// A inicialização do Firebase agora acontecerá com os valores corretos.
// Isso habilitará o login real com os provedores configurados no Firebase.
// FIX: Use compat initialization logic to prevent re-initialization on hot reloads.
if (!firebase.apps.length) {
  // CORRECTED: The initializeApp function is namespaced under the firebase object.
  firebase.initializeApp(firebaseConfig);
}

// Inicializa a Autenticação Firebase e a exporta para ser usada no AuthService.
// FIX: Export the auth instance using the compat syntax.
export const auth = firebase.auth();