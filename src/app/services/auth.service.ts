import { Injectable } from '@angular/core';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { User as AppUser } from '../models/user.models';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = getAuth();
  private db = getFirestore();
  private currentUserSubject: BehaviorSubject<AppUser | null> = new BehaviorSubject<AppUser | null>(null);
  private authInitializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);


 constructor(private navCtrl: NavController) {
  onAuthStateChanged(this.auth, async (user) => {
    if (user) {
      const appUser = await this.createAppUser(user);
      if (!appUser.activo) {
        console.warn('Usuario inactivo. Cerrando sesión...');
        await this.logout();
        alert('Tu cuenta está inactiva. Contacta con un administrador.');
        this.authInitializedSubject.next(true);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(appUser));
      localStorage.setItem('userName', appUser.nombre);
      localStorage.setItem('userRole', appUser.role);

      this.currentUserSubject.next(appUser);

      // ✅ Solo redirige si el usuario está en la ruta de login
      if (window.location.pathname === '/login') {
        this.navCtrl.navigateRoot('/home');
      }

    } else {
      console.log('No hay usuario autenticado (onAuthStateChanged)');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');

      this.currentUserSubject.next(null);
    }

    this.authInitializedSubject.next(true);
  });

};
 getUserFromLocalStorage(): AppUser | null {
    try {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        return JSON.parse(userJson) as AppUser;
      }
      return null;
    } catch {
      return null;
    }
  }
 get authInitialized$(): Observable<boolean> {
    return this.authInitializedSubject.asObservable();
  }

async reauthenticateUser(password: string): Promise<void> {
  const user = this.auth.currentUser;
  if (!user || !user.email) throw new Error('No hay usuario autenticado');

  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);

}
  private async createAppUser(user: FirebaseUser): Promise<AppUser> {
    const userDocRef = doc(this.db, 'users', user.uid);
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        console.log('Datos completos del usuario Firestore:', userData);

        return {
          uid: user.uid,
          email: user.email ?? '',
          role: userData?.['role'] || 'usuario',
          createdAt: userData?.['createdAt']?.toDate() || new Date(),
          nombre: userData?.['nombre'] || '',
          telefono: userData?.['telefono'] || undefined,
          direccion: userData?.['direccion'] || undefined,
          activo: userData?.['activo'] ?? true // ✅
        };
      } else {
        console.warn('No se encontró el documento de usuario, usando valores por defecto');
        return {
          uid: user.uid,
          email: user.email ?? '',
          role: 'usuario',
          createdAt: new Date(),
          nombre: '',
          activo: true, // ✅
        };
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario en Firestore:', error);
      return {
        uid: user.uid,
        email: user.email ?? '',
        role: 'usuario',
        createdAt: new Date(),
        nombre: '',
        activo: true, // ✅
      };
    }
  }

  // Login
  async login(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return credential;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
       this.navCtrl.navigateRoot('/login');


    } catch (error) {
      console.error('Error al cerrar sesión:', error);

    }
  }

  // Retorna el usuario actual
  get currentUser(): Observable<AppUser | null> {
    return new Observable<AppUser | null>(subscriber => {
      const sub = this.currentUserSubject.subscribe(subscriber);
      // Si no hay usuario tras 500 ms (Firebase lento o offline), emitimos usuario offline
      setTimeout(() => {
        if (this.currentUserSubject.value === null) {
          const offlineUser = this.getUserFromLocalStorage();
          if (offlineUser) {
            this.currentUserSubject.next(offlineUser);
            subscriber.next(offlineUser);
          }
        }
      }, 500);
      return () => sub.unsubscribe();
    });
  }
  // Retorna el valor actual del usuario sin necesidad de suscripción
  get currentUserValue(): AppUser | null {
    if (this.currentUserSubject.value !== null) {
      return this.currentUserSubject.value;
    }
    return this.getUserFromLocalStorage();
  }

  // Verifica si el usuario actual es administrador
  isAdmin(): boolean {
    const user = this.currentUserValue;
    return user !== null && user.role === 'admin';
  }

  // Registrar un nuevo usuario (para administradores)
  async registerUser(userData: {
    email: string;
    password: string;
    nombre: string;
    role: string;
    telefono?: number;
    direccion?: string;
    activo?: boolean; // ✅ nuevo campo
  }) {
    try {
      // Verificar que el usuario actual sea administrador
      if (!this.isAdmin()) {
        throw new Error('No tienes permisos para crear usuarios');
      }

      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        userData.email,
        userData.password
      );

      const newUser = userCredential.user;

      // Actualizar el displayName
      if (newUser) {
        await updateProfile(newUser, {
          displayName: userData.nombre
        });
      }

      // Guardar información adicional en Firestore
      await setDoc(doc(this.db, 'users', newUser.uid), {
        email: userData.email,
        nombre: userData.nombre,
        role: userData.role,
        telefono: userData.telefono || null,
        direccion: userData.direccion || '',
        uid: newUser.uid,
        createdAt: serverTimestamp(),
        createdBy: this.auth.currentUser?.uid,
        activo: true, // ✅ nuevo campo
      });

      return newUser;
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      throw error;
    }

  }
enviarResetPassword(email: string) {
  return sendPasswordResetEmail(this.auth, email);
}
async actualizarEstadoUsuario(uid: string, activo: boolean) {
  const userRef = doc(this.db, 'users', uid);
  await setDoc(userRef, { activo }, { merge: true });
}
async getAllUsers(): Promise<AppUser[]> {
  const usersRef = collection(this.db, 'users');
  const snapshot = await getDocs(usersRef);

  return snapshot.docs.map(doc => {
    const data = doc.data() as {
      email: string;
      nombre: string;
      role: string;
      telefono?: number;
      direccion?: string;
      createdAt?: any;
      activo?: boolean;
    };

    return {
      uid: doc.id,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      telefono: data.telefono || null,
      direccion: data.direccion || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      activo: data.activo ?? true
    };
  });

}
getFirebaseUser(): FirebaseUser | null {
  return this.auth.currentUser;
}

}
