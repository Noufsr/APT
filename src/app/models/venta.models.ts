export interface ProductoVendido {
  idProducto: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Boleta {
  id: number;
  fecha: Date;
  total: number;
  productosVendidos: ProductoVendido[];
  metodo_pago: string;
  cajero: string;
}
