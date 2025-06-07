export interface Boleta {
  id: string;
  folio: number;
  fecha: Date;
  total: number;
  productosVendidos: ProductoVendido[];
  metodo_pago: string;
  cajero: string;
}

export interface ProductoVendido {
  idProducto: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}
