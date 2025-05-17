export interface User {
  uid: string;
  email: string;
  nombre: string;
  role: string;
  telefono?: string | number | null;
  direccion?: string;
  createdAt: Date;
  activo: boolean;
}
