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

export interface CierreCaja {
  id?: string;
  aperturaId: string;
  fecha: Date;
  cajero: string;
  cajeroId: string;

  efectivoApertura: number;
  saldoBipApertura: number;
  saldoCajaVecinaApertura: number;

  totalPagosProveedores: number;
  totalVentasEfectivo: number;
  totalVentasTarjeta: number;
  totalDevoluciones: number;

  efectivoCierre: number;
  saldoBipCierre: number;
  saldoCajaVecinaCierre: number;
  montoMaquinaTarjeta: number;

  diferenciaEfectivo: number;
  diferenciaTarjeta: number;
  diferenciaBip: number;
  diferenciaCajaVecina: number;
  diferenciaTotal: number;

  ventaDiaria: number;
}

export interface PagoResumen {
  nombreProveedor: string;
  montoPagado: number;
  metodoPago: string;
}
