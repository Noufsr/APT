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

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = getAuth();
  private db = getFirestore();
  private currentUserSubject: BehaviorSubject<AppUser | null> = new BehaviorSubject<AppUser | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const appUser = await this.createAppUser(user);
        this.currentUserSubject.next(appUser);
      } else {
        this.currentUserSubject.next(null);
      }
    });
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
          direccion: userData?.['direccion'] || undefined
        };
      } else {
        console.warn('No se encontró el documento de usuario, usando valores por defecto');
        return {
          uid: user.uid,
          email: user.email ?? '',
          role: 'usuario',
          createdAt: new Date(),
          nombre: '',
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
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // Retorna el usuario actual
  get currentUser(): Observable<AppUser | null> {
    return this.currentUserSubject.asObservable();
  }

  // Retorna el valor actual del usuario sin necesidad de suscripción
  get currentUserValue(): AppUser | null {
    return this.currentUserSubject.value;
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
        createdBy: this.auth.currentUser?.uid
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
}
