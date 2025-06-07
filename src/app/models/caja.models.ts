// Modelo para apertura de caja
export interface AperturaCaja {
  id?: string;
  fecha: Date;
  cajero: string;
  cajeroId: string;
  efectivo: number;
  saldoBip: number;
  saldoCajaVecina: number;
  estado: 'abierta' | 'cerrada';
}

// Modelo para cierre de caja
export interface CierreCaja {
  id?: string;
  aperturaId: string; // Referencia a la apertura
  fecha: Date;
  cajero: string;
  cajeroId: string;

  // Montos de apertura (referencia)
  efectivoApertura: number;
  saldoBipApertura: number;
  saldoCajaVecinaApertura: number;

  // Totales calculados del día
  totalPagosProveedores: number;
  totalVentasEfectivo: number;
  totalVentasTarjeta: number;

  // Montos ingresados al cierre
  efectivoCierre: number;
  saldoBipCierre: number;
  saldoCajaVecinaCierre: number;
  montoMaquinaTarjeta: number;

  // Diferencias
  diferenciaEfectivo: number;
  diferenciaTarjeta: number;
  diferenciaBip: number;
  diferenciaCajaVecina: number;
  diferenciaTotal: number;

  // Total venta del día
  ventaDiaria: number;
}

// Modelo para mostrar pagos en el cierre
export interface PagoResumen {
  nombreProveedor: string;
  montoPagado: number;
  metodoPago: string;
}
