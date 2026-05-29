import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedService, Producto } from '../../services/shared.service';

const API = {
  productos: 'https://producto-2fxd.onrender.com/productos'
};

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CurrencyPipe, NgClass, NgFor, NgIf, FormsModule],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.css'
})
export class ProductoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);

  productos: Producto[] = [];
  productoForm = {
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    stockMinimo: 0,
    categoria: '',
    activo: true
  };
  productoBusquedaId = '';
  activeModal: 'nuevo' | 'editar' | 'eliminar' | 'ver' | null = null;
  productoSeleccionado: Producto | null = null;
  loading = false;
  resultado: { tipo: 'exito' | 'error'; mensaje: string; detalle?: unknown } | null = null;
  private resultadoTimer: any = null;
  outputTitle = 'Productos';
  output: unknown = { mensaje: 'Modulo de productos' };

  get selectedProduct(): Producto {
    return this.sharedService.getState().producto;
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  get totalStock(): number {
    return this.productos.reduce((total, producto) => total + this.numberOrZero(producto.stock), 0);
  }

  get alertasActivas(): number {
    return this.productos.filter((producto) => this.numberOrZero(producto.stock) <= this.numberOrZero(producto.stockMinimo)).length;
  }

  ngOnInit(): void {
    this.listarProductos();
  }

  abrirModalNuevo(): void {
    this.resetProductoForm();
    this.productoSeleccionado = null;
    this.activeModal = 'nuevo';
  }

  abrirModalEditar(producto: Producto): void {
    this.productoSeleccionado = producto;
    this.productoForm = {
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio: producto.precio || 0,
      stock: producto.stock || 0,
      stockMinimo: producto.stockMinimo || 0,
      categoria: producto.categoria || '',
      activo: producto.activo !== false
    };
    this.activeModal = 'editar';
  }

  abrirModalVer(producto: Producto): void {
    this.productoSeleccionado = producto;
    this.activeModal = 'ver';
  }

  abrirModalEliminar(producto: Producto): void {
    this.productoSeleccionado = producto;
    this.activeModal = 'eliminar';
  }

  cerrarModal(): void {
    this.activeModal = null;
    this.productoSeleccionado = null;
  }

  guardarProducto(): void {
    const payload = {
      ...this.productoForm,
      precio: this.numberOrZero(this.productoForm.precio),
      stock: this.numberOrZero(this.productoForm.stock),
      stockMinimo: this.numberOrZero(this.productoForm.stockMinimo),
      activo: Boolean(this.productoForm.activo)
    };

    this.loading = true;
    this.resultado = null;

    this.request<Producto>('Crear producto', 'POST', `${API.productos}/guardar`, payload, (producto) => {
      this.loading = false;
      if (producto?.productoId) {
        this.resultado = {
          tipo: 'exito',
          mensaje: `Producto "${producto.nombre}" creado exitosamente`,
          detalle: producto
        };
        this.seleccionarProducto(producto);
        this.cerrarModal();
        this.resetProductoForm();
        this.listarProductos();
      } else {
        this.resultado = {
          tipo: 'error',
          mensaje: 'No se pudo crear el producto',
          detalle: producto
        };
      }
    });
  }

  actualizarProducto(): void {
    if (!this.productoSeleccionado?.productoId) return;

    const payload = {
      productoId: this.productoSeleccionado.productoId,
      ...this.productoForm,
      precio: this.numberOrZero(this.productoForm.precio),
      stock: this.numberOrZero(this.productoForm.stock),
      stockMinimo: this.numberOrZero(this.productoForm.stockMinimo),
      activo: Boolean(this.productoForm.activo)
    };

    this.loading = true;
    this.resultado = null;

    this.request<Producto>('Actualizar producto', 'PUT', `${API.productos}/actualizar/${payload.productoId}`, payload, (producto) => {
      this.loading = false;
      if (producto?.productoId) {
        this.resultado = {
          tipo: 'exito',
          mensaje: `Producto "${producto.nombre}" actualizado exitosamente`,
          detalle: producto
        };
        this.seleccionarProducto(producto);
        this.cerrarModal();
        this.listarProductos();
      } else {
        this.resultado = {
          tipo: 'error',
          mensaje: 'No se pudo actualizar el producto',
          detalle: producto
        };
      }
    });
  }

  eliminarProducto(): void {
    if (!this.productoSeleccionado?.productoId) return;

    this.loading = true;
    this.resultado = null;

    this.request<any>('Eliminar producto', 'DELETE', `${API.productos}/eliminar/${this.productoSeleccionado.productoId}`, null, (response) => {
      this.loading = false;
      if (response?.success) {
        this.resultado = {
          tipo: 'exito',
          mensaje: 'Producto eliminado exitosamente',
          detalle: response
        };
        this.cerrarModal();
        this.listarProductos();
      } else {
        this.resultado = {
          tipo: 'error',
          mensaje: response?.mensaje || 'No se pudo eliminar el producto',
          detalle: response
        };
      }
    });
  }

  buscarProducto(): void {
    if (!this.productoBusquedaId) return;
    this.loading = true;
    this.resultado = null;

    this.request<Producto>('Buscar producto', 'GET', `${API.productos}/buscar/${encodeURIComponent(this.productoBusquedaId)}`, null, (producto) => {
      this.loading = false;
      if (producto?.productoId) {
        this.resultado = {
          tipo: 'exito',
          mensaje: `Producto encontrado: ${producto.nombre}`,
          detalle: producto
        };
        this.seleccionarProducto(producto);
      } else {
        this.resultado = {
          tipo: 'error',
          mensaje: `No se encontro producto con ID: ${this.productoBusquedaId}`,
          detalle: producto
        };
      }
    });
  }

  listarProductos(): void {
    this.loading = true;

    this.request<Producto[]>('Listar productos', 'GET', `${API.productos}/todos`, null, (productos) => {
      this.loading = false;
      this.productos = Array.isArray(productos) ? productos : [];
    });
  }

  seleccionarProducto(producto: Producto): void {
    this.sharedService.updateState({ producto });
    if (!producto?.productoId) return;
    this.productoBusquedaId = String(producto.productoId);
  }

  private resetProductoForm(): void {
    this.productoForm = {
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      stockMinimo: 0,
      categoria: '',
      activo: true
    };
  }

  private request<T>(
    title: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body: unknown,
    success: (data: T | null) => void
  ): void {
    this.http.request<T>(method, url, {
      body,
      headers: this.headers()
    }).subscribe({
      next: (data) => {
        this.setOutput(`${title} (OK)`, data);
        success(data);
      },
      error: (error) => {
        this.loading = false;
        const data = error.error || {
          mensaje: error.status === 0
            ? 'No se pudo conectar con el servicio.'
            : 'La API respondio con error.',
          status: error.status
        };
        this.setOutput(title, data);
        this.resultado = {
          tipo: 'error',
          mensaje: data.mensaje || 'Error al conectar con el servidor',
          detalle: data
        };
        success(null);
      }
    });
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const state = this.sharedService.getState();
    if (state.token) {
      headers = headers.set('Authorization', `Bearer ${state.token}`);
    }
    return headers;
  }

  private setOutput(title: string, data: unknown): void {
    this.outputTitle = title;
    this.output = data || {};
  }

  private numberOrZero(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
