import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Producto } from '../../models/producto.models';
import { Proveedor } from '../../models/proveedor.models';
import * as XLSX from 'xlsx';

interface ProductoImportado extends Omit<Producto, 'id'> {
  fila: number;
  errores: string[];
  valido: boolean;
  importar: boolean;
}

@Component({
  selector: 'app-importar-productos',
  templateUrl: './importar-productos.page.html',
  styleUrls: ['./importar-productos.page.scss'],
  standalone: false
})
export class ImportarProductosPage implements OnInit {
  archivo: File | null = null;
  productosImportados: ProductoImportado[] = [];
  productosExistentes: Producto[] = [];
  proveedores: Proveedor[] = [];
  mostrarPreview: boolean = false;
  cargando: boolean = false;

  // Estadísticas
  totalProductos: number = 0;
  productosValidos: number = 0;
  productosConErrores: number = 0;

  // Mapeo de columnas Excel
  columnasEsperadas = {
    'CAD': 'cad',
    'NOMBRE': 'nombre',
    'CODIGO_BARRAS': 'cod_barras',
    'UNIDAD': 'unidad',
    'STOCK': 'stock',
    'AVISO_STOCK': 'aviso_stock',
    'PRECIO_COMPRA': 'precio_compra',
    'PRECIO_VENTA': 'precio_venta',
    'MARCA': 'marca',
    'CATEGORIA': 'categoria'
  };

  // Proveedor seleccionado para todos los productos
  proveedorSeleccionado: string = '';

  constructor(
    private firestoreService: FirestoreService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    // Cargar productos existentes para validación
    this.firestoreService.getProductos().subscribe(productos => {
      this.productosExistentes = productos;
      console.log('Productos existentes cargados:', this.productosExistentes.length);

      // Debug: mostrar algunos CADs existentes
      if (this.productosExistentes.length > 0) {
        console.log('Ejemplos de CADs en base de datos:',
          this.productosExistentes.slice(0, 5).map(p => ({
            cad: p.cad,
            tipo: typeof p.cad,
            nombre: p.nombre
          }))
        );
      }
    });

    // Cargar proveedores para validación
    this.firestoreService.getProveedores().subscribe(proveedores => {
      this.proveedores = proveedores;
    });
  }

  onFileChange(event: any) {
    const target: DataTransfer = <DataTransfer>(event.target);

    if (target.files.length !== 1) {
      this.mostrarToast('Por favor seleccione un archivo', 'warning');
      return;
    }

    const file = target.files[0];

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls',
      '.xlsx'
    ];

    if (!tiposPermitidos.some(tipo => file.type.includes(tipo) || file.name.endsWith(tipo))) {
      this.mostrarToast('Por favor seleccione un archivo Excel válido (.xls o .xlsx)', 'danger');
      return;
    }

    this.archivo = file;
    this.procesarArchivo();
  }

  procesarArchivo() {
    if (!this.archivo) return;

    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const binaryData = e.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(binaryData, { type: 'binary' });

        // Tomar la primera hoja
        const worksheetName = workbook.SheetNames[0];
        const worksheet: XLSX.WorkSheet = workbook.Sheets[worksheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (jsonData.length === 0) {
          this.mostrarToast('El archivo está vacío', 'warning');
          return;
        }

        // Procesar y validar datos
        this.procesarDatosExcel(jsonData);

      } catch (error) {
        console.error('Error al procesar archivo:', error);
        this.mostrarToast('Error al procesar el archivo Excel', 'danger');
      }
    };

    reader.readAsBinaryString(this.archivo);
  }

  procesarDatosExcel(datos: any[]) {
    this.productosImportados = [];

    datos.forEach((fila, index) => {
      const producto = this.mapearFilaAProducto(fila, index + 2); // +2 porque Excel empieza en 1 y tiene encabezado
      this.validarProducto(producto);
      this.productosImportados.push(producto);
    });

    this.actualizarEstadisticas();
    this.mostrarPreview = true;
  }

  mapearFilaAProducto(fila: any, numeroFila: number): ProductoImportado {
    // Función auxiliar para obtener valor de columna con múltiples nombres posibles
    const obtenerValor = (nombresPosibles: string[]): any => {
      for (const nombre of nombresPosibles) {
        if (fila[nombre] !== undefined && fila[nombre] !== null) {
          return fila[nombre];
        }
      }
      return null;
    };

    const producto: ProductoImportado = {
      cad: this.parseNumero(obtenerValor(['CAD', 'cad'])),
      nombre: (obtenerValor(['NOMBRE', 'nombre']) || '').toString().trim(),
      unidad: this.normalizarUnidad(obtenerValor(['UNIDAD', 'unidad'])),
      stock: this.parseNumero(obtenerValor(['STOCK', 'stock'])),
      aviso_stock: this.parseNumero(obtenerValor(['AVISO_STOCK', 'aviso_stock'])) || 0,
      precio_compra: this.parseNumero(obtenerValor(['PRECIO_COMPRA', 'precio_compra'])),
      precio_venta: this.parseNumero(obtenerValor(['PRECIO_VENTA', 'precio_venta'])),
      cod_barras: this.parseNumero(obtenerValor(['CODIGO_BARRAS', 'codigo_barras', 'COD_BARRAS', 'cod_barras'])),
      marca: (obtenerValor(['MARCA', 'marca']) || '').toString().trim(),
      categoria: (obtenerValor(['CATEGORIA', 'categoria']) || '').toString().trim(),
      idproveedor: '', // Se asignará luego desde el selector
      fila: numeroFila,
      errores: [],
      valido: true,
      importar: true
    };

    return producto;
  }

  parseNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    // Convertir a string y limpiar
    const valorString = valor.toString().replace(/,/g, '.');
    const numero = parseFloat(valorString);

    return isNaN(numero) ? 0 : numero;
  }

  normalizarUnidad(valor: any): string {
    if (!valor) return 'U';

    const unidad = valor.toString().toUpperCase().trim();

    if (unidad === 'KG' || unidad === 'KILOGRAMO' || unidad === 'KILOGRAMOS') {
      return 'KG';
    }

    return 'U';
  }

  validarProducto(producto: ProductoImportado) {
    producto.errores = [];
    producto.valido = true;

    // Validar campos requeridos
    if (!producto.nombre || producto.nombre.trim() === '') {
      producto.errores.push('Nombre es requerido');
      producto.valido = false;
    }

    // Validar que tenga al menos un código
    if ((!producto.cad || producto.cad === 0) && (!producto.cod_barras || producto.cod_barras === 0)) {
      producto.errores.push('Debe tener CAD o Código de Barras');
      producto.valido = false;
    }

    // Validar duplicados de CAD
    if (producto.cad && producto.cad !== 0) {
      // Convertir a número para comparación consistente
      const cadNumero = Number(producto.cad);

      const cadDuplicado = this.productosExistentes.find(p => {
        // Asegurar que ambos valores sean números para la comparación
        return p.cad && Number(p.cad) === cadNumero;
      });

      if (cadDuplicado) {
        producto.errores.push(`CAD ${producto.cad} ya existe en la base de datos`);
        producto.valido = false;
      }

      // Verificar duplicados en la misma importación
      const duplicadoEnImportacion = this.productosImportados.find(p =>
        p.cad && Number(p.cad) === cadNumero && p.fila !== producto.fila
      );
      if (duplicadoEnImportacion) {
        producto.errores.push(`CAD duplicado en fila ${duplicadoEnImportacion.fila}`);
        producto.valido = false;
      }
    }

    // Validar duplicados de código de barras
    if (producto.cod_barras && producto.cod_barras !== 0) {
      // Convertir a número para comparación consistente
      const codigoNumero = Number(producto.cod_barras);

      const codigoDuplicado = this.productosExistentes.find(p => {
        // Asegurar que ambos valores sean números para la comparación
        return p.cod_barras && Number(p.cod_barras) === codigoNumero;
      });

      if (codigoDuplicado) {
        producto.errores.push(`Código de barras ${producto.cod_barras} ya existe en la base de datos`);
        producto.valido = false;
      }

      // Verificar duplicados en la misma importación
      const duplicadoEnImportacion = this.productosImportados.find(p =>
        p.cod_barras && Number(p.cod_barras) === codigoNumero && p.fila !== producto.fila
      );
      if (duplicadoEnImportacion) {
        producto.errores.push(`Código de barras duplicado en fila ${duplicadoEnImportacion.fila}`);
        producto.valido = false;
      }
    }

    // Validar precios
    if (producto.precio_venta <= 0) {
      producto.errores.push('Precio de venta debe ser mayor a 0');
      producto.valido = false;
    }

    // Validar stock negativo
    if (producto.stock < 0) {
      producto.errores.push('Stock no puede ser negativo');
      producto.valido = false;
    }

    // Si no es válido, no importar por defecto
    if (!producto.valido) {
      producto.importar = false;
    }
  }

  actualizarEstadisticas() {
    this.totalProductos = this.productosImportados.length;
    this.productosValidos = this.productosImportados.filter(p => p.valido).length;
    this.productosConErrores = this.productosImportados.filter(p => !p.valido).length;
  }

  toggleImportar(producto: ProductoImportado) {
    producto.importar = !producto.importar;
  }

  toggleSeleccionarTodos() {
    const todosSeleccionados = this.productosImportados
      .filter(p => p.valido)
      .every(p => p.importar);

    this.productosImportados
      .filter(p => p.valido)
      .forEach(p => p.importar = !todosSeleccionados);
  }

  async descargarPlantilla() {
    // Crear datos de ejemplo
    const datosEjemplo = [
      {
        CAD: 1001,
        NOMBRE: 'Producto Ejemplo 1',
        CODIGO_BARRAS: 7501234567890,
        UNIDAD: 'U',
        STOCK: 50,
        AVISO_STOCK: 10,
        PRECIO_COMPRA: 1000,
        PRECIO_VENTA: 1500,
        MARCA: 'Marca A',
        CATEGORIA: 'Categoría 1'
      },
      {
        CAD: 1002,
        NOMBRE: 'Producto Ejemplo 2',
        CODIGO_BARRAS: 7501234567891,
        UNIDAD: 'KG',
        STOCK: 25.5,
        AVISO_STOCK: 5,
        PRECIO_COMPRA: 2000,
        PRECIO_VENTA: 3000,
        MARCA: 'Marca B',
        CATEGORIA: 'Categoría 2'
      }
    ];

    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(datosEjemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Ajustar anchos de columna
    const columnas = [
      { wch: 10 }, // CAD
      { wch: 30 }, // NOMBRE
      { wch: 15 }, // CODIGO_BARRAS
      { wch: 10 }, // UNIDAD
      { wch: 10 }, // STOCK
      { wch: 12 }, // AVISO_STOCK
      { wch: 15 }, // PRECIO_COMPRA
      { wch: 15 }, // PRECIO_VENTA
      { wch: 15 }, // MARCA
      { wch: 15 }  // CATEGORIA
    ];
    ws['!cols'] = columnas;

    // Descargar archivo
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');

    await this.mostrarToast('Plantilla descargada exitosamente', 'success');
  }

  async ejecutarImportacion(productos: ProductoImportado[]) {
    const loading = await this.loadingController.create({
      message: 'Importando productos...',
      spinner: 'crescent'
    });

    await loading.present();

    let exitosos = 0;
    let errores = 0;
    const productosConError: string[] = [];

    // Opción 1: Importación individual (más control sobre errores)
    for (const producto of productos) {
      try {
        // Limpiar campos no necesarios para Firestore
        const productoLimpio: Producto = {
          id: '',
          cad: producto.cad,
          nombre: producto.nombre,
          unidad: producto.unidad,
          stock: producto.stock,
          aviso_stock: producto.aviso_stock,
          precio_compra: producto.precio_compra,
          precio_venta: producto.precio_venta,
          cod_barras: producto.cod_barras,
          marca: producto.marca,
          categoria: producto.categoria,
          idproveedor: this.proveedorSeleccionado // Usar el proveedor seleccionado
        };

        await this.firestoreService.guardarProducto(productoLimpio);
        exitosos++;
      } catch (error) {
        console.error(`Error al importar producto de fila ${producto.fila}:`, error);
        errores++;
        productosConError.push(`Fila ${producto.fila}: ${producto.nombre}`);
      }
    }

    await loading.dismiss();

    // Mostrar resumen
    let mensaje = `Importación completada:\n${exitosos} productos importados exitosamente`;

    if (errores > 0) {
      mensaje += `\n${errores} productos con errores`;
      if (productosConError.length <= 5) {
        mensaje += `:\n${productosConError.join('\n')}`;
      }
    }

    const alertResumen = await this.alertController.create({
      header: 'Resumen de Importación',
      message: mensaje,
      buttons: [{
        text: 'OK',
        handler: () => {
          if (exitosos > 0) {
            this.limpiarFormulario();
          }
        }
      }]
    });

    await alertResumen.present();
  }

  limpiarFormulario() {
    this.archivo = null;
    this.productosImportados = [];
    this.mostrarPreview = false;
    this.totalProductos = 0;
    this.productosValidos = 0;
    this.productosConErrores = 0;
    this.proveedorSeleccionado = ''; // Limpiar proveedor seleccionado

    // Limpiar el input file
    const inputFile = document.getElementById('fileInput') as HTMLInputElement;
    if (inputFile) {
      inputFile.value = '';
    }
  }

  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  // Métodos auxiliares para el template
  getProductosAImportar(): number {
    return this.productosImportados.filter(p => p.importar && p.valido).length;
  }

  tieneProductosValidos(): boolean {
    return this.getProductosAImportar() > 0;
  }

  async importarProductos() {
    const productosAImportar = this.productosImportados.filter(p => p.importar && p.valido);

    if (productosAImportar.length === 0) {
      await this.mostrarToast('No hay productos válidos para importar', 'warning');
      return;
    }

    // Validar si necesitan proveedor
    if (!this.proveedorSeleccionado) {
      const alert = await this.alertController.create({
        header: 'Proveedor no seleccionado',
        message: '¿Desea importar los productos sin asignar proveedor?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Importar sin proveedor',
            handler: () => {
              this.confirmarImportacion(productosAImportar);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.confirmarImportacion(productosAImportar);
    }
  }

  async confirmarImportacion(productosAImportar: ProductoImportado[]) {
    const alert = await this.alertController.create({
      header: 'Confirmar Importación',
      message: `¿Está seguro de importar ${productosAImportar.length} productos?${this.proveedorSeleccionado ? '\nProveedor: ' + this.proveedores.find(p => p.id === this.proveedorSeleccionado)?.nombreProveedor : ''}`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Importar',
          handler: () => {
            this.ejecutarImportacion(productosAImportar);
          }
        }
      ]
    });

    await alert.present();
  }
}
