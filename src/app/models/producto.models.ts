
export interface Producto {
  id: string | number;
  nombre: string;
  stock: number;
  precio_compra: number;
  precio_venta: number;
  cod_barras: number;
  marca: string;
  categoria: string;
  idproveedor: string | number;
}

