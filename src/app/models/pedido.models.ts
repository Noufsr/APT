export interface Pedido {
  id?: string | number;
  idProveedor: string | number;
  nombreProveedor?: string;
  fechaRecepcion: Date | string;
  montoPagado: number;
  montoTotal: number;
  metodoPago: 'efectivo' | 'credito';
  estado: 'pagado' | 'pendiente';
  productos: ProductoPedido[];
}

export interface ProductoPedido {
  idProducto: string | number;
  nombre?: string;
  cantidad: number;
  precioCompra: number;
  subtotal?: number;
}
