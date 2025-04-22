export interface User {
  uid: string;
  email: string;
  role: string;
  createdAt: Date;
  nombre: string;
  telefono?: string;
  direccion?: string;
}
