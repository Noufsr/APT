import { Component, OnInit } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { CierreCaja } from '../../models/caja.models';

interface DiaReporte {
  fecha: Date;
  ventaDiaria: number;
  cierre: CierreCaja | null;
  mostrarDetalle: boolean;
}

interface SemanaReporte {
  fechaInicio: Date;
  fechaFin: Date;
  totalVentaSemana: number;
  dias: DiaReporte[];
  mostrarDias: boolean;
}

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit {
  semanas: SemanaReporte[] = [];
  semanasActuales: number = 4;
  cargando: boolean = false;
  sinMasDatos: boolean = false;

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    this.cargarReportes();
  }

  cargarReportes() {
    this.cargando = true;
    this.firestoreService.getTodosCierres().subscribe(
      (cierres: CierreCaja[]) => {
        console.log('Cierres obtenidos:', cierres.length);
        this.procesarCierres(cierres);
        this.cargando = false;
      },
      error => {
        console.error('Error cargando cierres:', error);
        this.cargando = false;
      }
    );
  }

  procesarCierres(cierres: CierreCaja[]) {
    // Limpiar semanas anteriores
    this.semanas = [];

    // Calcular fecha de inicio (hace n semanas desde hoy)
    const hoy = new Date();
    const inicioReportes = new Date(hoy);
    inicioReportes.setDate(hoy.getDate() - (this.semanasActuales * 7));

    // Generar las semanas
    for (let i = 0; i < this.semanasActuales; i++) {
      const fechaInicioSemana = new Date(inicioReportes);
      fechaInicioSemana.setDate(inicioReportes.getDate() + (i * 7));

      // Ajustar al lunes de esa semana
      const diaSemana = fechaInicioSemana.getDay();
      const diasAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      fechaInicioSemana.setDate(fechaInicioSemana.getDate() + diasAlLunes);

      const fechaFinSemana = new Date(fechaInicioSemana);
      fechaFinSemana.setDate(fechaInicioSemana.getDate() + 6);

      const semana = this.crearSemana(fechaInicioSemana, fechaFinSemana, cierres);
      this.semanas.push(semana);
    }

    // Ordenar semanas de más reciente a más antigua
    this.semanas.sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
  }

  crearSemana(fechaInicio: Date, fechaFin: Date, cierres: CierreCaja[]): SemanaReporte {
    const dias: DiaReporte[] = [];
    let totalVentaSemana = 0;

    // Generar los 7 días de la semana
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fechaInicio.getDate() + i);

      // Buscar cierre para este día
      const cierreDelDia = cierres.find(cierre => {
        const fechaCierre = this.convertirAFecha(cierre.fecha);
        return this.esMismoDia(fechaCierre, fecha);
      });

      const ventaDiaria = cierreDelDia ? cierreDelDia.ventaDiaria : 0;
      totalVentaSemana += ventaDiaria;

      dias.push({
        fecha: fecha,
        ventaDiaria: ventaDiaria,
        cierre: cierreDelDia || null,
        mostrarDetalle: false
      });
    }

    return {
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      totalVentaSemana: totalVentaSemana,
      dias: dias,
      mostrarDias: false
    };
  }

  convertirAFecha(fecha: any): Date {
    if (fecha instanceof Date) {
      return fecha;
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      return fecha.toDate();
    } else if (typeof fecha === 'string') {
      return new Date(fecha);
    }
    return new Date();
  }

  esMismoDia(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
  }

  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  toggleSemana(semana: SemanaReporte) {
    semana.mostrarDias = !semana.mostrarDias;
  }

  toggleDia(dia: DiaReporte) {
    dia.mostrarDetalle = !dia.mostrarDetalle;
  }

  cargarMasSemanas() {
    const semanasAnteriores = this.semanasActuales;
    this.semanasActuales += 4;

    this.cargando = true;
    this.firestoreService.getTodosCierres().subscribe(
      (cierres: CierreCaja[]) => {
        const semanasAntes = this.semanas.length;
        this.procesarCierres(cierres);

        // Verificar si se agregaron nuevas semanas con datos
        let semanasConDatos = 0;
        for (let i = semanasAnteriores; i < this.semanasActuales; i++) {
          if (this.semanas[i] && this.semanas[i].totalVentaSemana > 0) {
            semanasConDatos++;
          }
        }

        if (semanasConDatos === 0) {
          this.sinMasDatos = true;
          // Revertir a la cantidad anterior si no hay datos nuevos
          this.semanasActuales = semanasAnteriores;
          this.procesarCierres(cierres);
        } else {
          this.sinMasDatos = false;
        }

        this.cargando = false;
      },
      error => {
        console.error('Error cargando más cierres:', error);
        this.cargando = false;
        this.semanasActuales = semanasAnteriores;
      }
    );
  }

  formatearMonto(monto: number): string {
    return '$' + monto.toLocaleString('es-CL');
  }
}
