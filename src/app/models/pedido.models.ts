export interface Pedido {
  id?: string;
  idProveedor: string;
  nombreProveedor?: string;
  fechaRecepcion: Date | string;
  montoPagado: number;
  montoTotal: number;
  metodoPago: string;
  estado: string;
  productos: ProductoPedido[];
}

export interface ProductoPedido {
  idProducto: string;
  nombre?: string;
  cantidad: number;
}
