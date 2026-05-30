import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedService, Pedido, Producto } from '../../services/shared.service';
import { ToastService } from '../../services/toast.service';

const API = {
  pedidos: 'https://pedidos-dg22.onrender.com/api/criollos/pedidos',
  productos: 'https://producto-2fxd.onrender.com/productos'
};

@Component({
  selector: 'app-pedido',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgClass, NgFor, NgIf, FormsModule],
  templateUrl: './pedido.component.html',
  styleUrl: './pedido.component.css'
})
export class PedidoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);
  private readonly toastService = inject(ToastService);

  pedidos: Pedido[] = [];
  productosDisponibles: Producto[] = [];
  carrito: Array<{
    productoId: number;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    notas: string;
  }> = [];
  pedidoForm = {
    mesa: '1',
    metodoPago: 'EFECTIVO',
    cantidad: 1,
    impuesto: 0,
    notas: 'Sin picante',
    cedulaCliente: ''
  };
  pedidoBusquedaNumero = '';
  estadoFiltro = 'PENDIENTE';
  activeModal: 'pedido' | 'ver' | 'editar' | 'eliminar' | null = null;
  pedidoSeleccionado: Pedido | null = null;
  editarForm = { estado: 'PENDIENTE', mesa: '', notas: '' };
  outputTitle = 'Listo para probar';
  output: unknown = { mensaje: 'Modulo de pedidos' };
  loading = false;

  get state() {
    return this.sharedService.getState();
  }

  get pedidosMostrados(): Pedido[] {
    return this.pedidos.length ? this.pedidos : (this.state.ultimoPedido.numeroPedido ? [this.state.ultimoPedido] : []);
  }

  ngOnInit(): void {
    this.listarPedidos();
  }

  abrirModal(): void {
    if (!this.state.token) {
      this.toastService.show('error', 'Primero debes iniciar sesion.');
      return;
    }
    this.carrito = [];
    this.cargarProductos();
    this.activeModal = 'pedido';
  }

  cargarProductos(): void {
    this.request<Producto[]>('Cargar productos', 'GET', `${API.productos}/todos`, null, (productos) => {
      const errMsg = ToastService.mensajeDeError(productos);
      if (errMsg) { this.toastService.show('error', errMsg); this.productosDisponibles = []; return; }
      this.productosDisponibles = Array.isArray(productos) ? productos : [];
    });
  }

  agregarAlCarrito(producto: Producto): void {
    const itemExistente = this.carrito.find(item => item.productoId === producto.productoId);

    if (itemExistente) {
      itemExistente.cantidad += 1;
      itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioUnitario;
    } else {
      const itemCarrito = {
        productoId: producto.productoId || 0,
        nombreProducto: producto.nombre || '',
        cantidad: 1,
        precioUnitario: producto.precio || 0,
        subtotal: producto.precio || 0,
        notas: 'Sin picante'
      };
      this.carrito.push(itemCarrito);
    }
  }

  eliminarDelCarrito(index: number): void {
    this.carrito.splice(index, 1);
  }

  get totalCarrito(): number {
    return this.carrito.reduce((total, item) => total + item.subtotal, 0);
  }

  productoEnCarrito(productoId: number): boolean {
    return this.carrito.some(item => item.productoId === productoId);
  }

  getCantidadProducto(productoId: number): number {
    const item = this.carrito.find(item => item.productoId === productoId);
    return item ? item.cantidad : 0;
  }

  cerrarModal(): void {
    this.activeModal = null;
    this.pedidoSeleccionado = null;
  }

  abrirModalVer(pedido: Pedido): void {
    this.pedidoSeleccionado = pedido;
    this.activeModal = 'ver';
  }

  abrirModalEditar(pedido: Pedido): void {
    this.pedidoSeleccionado = pedido;
    this.editarForm = {
      estado: pedido.estado || 'PENDIENTE',
      mesa: pedido.mesa || '',
      notas: pedido.detalles?.[0]?.notas || ''
    };
    this.activeModal = 'editar';
  }

  abrirModalEliminar(pedido: Pedido): void {
    this.pedidoSeleccionado = pedido;
    this.activeModal = 'eliminar';
  }

  actualizarPedido(): void {
    const pedido = this.pedidoSeleccionado;
    if (!pedido?.numeroPedido) return;

    this.loading = true;

    this.request<Pedido>('Actualizar estado pedido', 'PUT', `${API.pedidos}/estado/${encodeURIComponent(pedido.numeroPedido)}`, { estado: this.editarForm.estado }, (updated) => {
      this.loading = false;
      if (!updated) return;
      const errMsg = ToastService.mensajeDeError(updated);
      if (errMsg) { this.toastService.show('error', errMsg); return; }
      if (updated?.numeroPedido) {
        this.toastService.show('exito', `Pedido #${updated.numeroPedido} actualizado (${this.editarForm.estado})`);
        this.cerrarModal();
        this.listarPedidos();
      }
    });
  }

  eliminarPedido(): void {
    const pedido = this.pedidoSeleccionado;
    if (!pedido?.numeroPedido) return;

    this.loading = true;

    this.request<string>('Eliminar pedido', 'DELETE', `${API.pedidos}/borrar/${encodeURIComponent(pedido.numeroPedido)}`, null, (response) => {
      this.loading = false;
      if (response && typeof response === 'string') {
        this.toastService.show('exito', response);
        this.cerrarModal();
        this.listarPedidos();
      } else if (response && (response as any)?.mensaje) {
        this.toastService.show('error', (response as any).mensaje);
      } else {
        this.toastService.show('error', 'No se pudo eliminar el pedido');
      }
    });
  }

  crearPedido(): void {
    console.log('=== DEBUG CREAR PEDIDO ===');
    console.log('Carrito:', this.carrito);
    console.log('State:', this.state);

    if (this.carrito.length === 0) {
      this.toastService.show('error', 'Debes agregar al menos un producto al carrito.');
      return;
    }

    const cedulaCliente = this.pedidoForm.cedulaCliente;
    const impuesto = this.numberOrZero(this.pedidoForm.impuesto);
    const subtotalCarrito = this.totalCarrito;
    const totalPedido = subtotalCarrito + impuesto;

    console.log('Cedula cliente:', cedulaCliente);
    console.log('Usuario ID:', this.state.usuario.id);
    console.log('Subtotal:', subtotalCarrito);
    console.log('Total:', totalPedido);

    if (!cedulaCliente) {
      this.toastService.show('error', 'Debes ingresar la cedula del cliente.');
      return;
    }

    const payload = {
      cedulaCliente: cedulaCliente,
      nombreCliente: this.state.usuario.nombre || '',
      mesa: this.pedidoForm.mesa,
      metodoPago: this.pedidoForm.metodoPago,
      impuesto,
      subtotal: subtotalCarrito,
      total: totalPedido,
      usuarioId: this.state.usuario.id || 0,
      detalles: this.carrito.map(item => ({
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        notas: item.notas
      }))
    };

    console.log('Payload a enviar:', JSON.stringify(payload, null, 2));
    console.log('URL:', `${API.pedidos}/guardar`);

    this.loading = true;

    this.request<any>('Crear pedido', 'POST', `${API.pedidos}/guardar`, payload, (res) => {
      this.loading = false;
      console.log('RESPUESTA CREAR PEDIDO:', JSON.stringify(res));
      if (!res) return;
      const errMsg = ToastService.mensajeDeError(res);
      if (errMsg) { this.toastService.show('error', errMsg); return; }
      const numPedido = res.numeroPedido || res.numero_pedido || res.number;
      if (numPedido) {
        this.toastService.show('exito', `Pedido #${numPedido} creado exitosamente`);
        this.seleccionarPedido(res);
        this.cerrarModal();
        this.resetPedidoForm();
        this.listarPedidos();
      }
    });
  }

  buscarPedido(): void {
    if (!this.pedidoBusquedaNumero) return;
    this.loading = true;
    this.request<Pedido>('Buscar pedido', 'GET', `${API.pedidos}/buscar/${encodeURIComponent(this.pedidoBusquedaNumero)}`, null, (pedido) => {
      this.loading = false;
      if (!pedido) return;
      const errMsg = ToastService.mensajeDeError(pedido);
      if (errMsg) { this.toastService.show('error', errMsg); return; }
      if (pedido?.numeroPedido) {
        this.toastService.show('exito', `Pedido encontrado: ${pedido.numeroPedido}`);
        this.seleccionarPedido(pedido);
      }
    });
  }

  listarPedidos(): void {
    this.loading = true;
    this.request<Pedido[]>('Listar pedidos', 'GET', `${API.pedidos}/listar`, null, (pedidos) => {
      this.loading = false;
      const errMsg = ToastService.mensajeDeError(pedidos);
      if (errMsg) { this.toastService.show('error', errMsg); this.pedidos = []; return; }
      this.pedidos = Array.isArray(pedidos) ? pedidos : [];
    });
  }

  listarPedidosPorEstado(): void {
    this.loading = true;
    this.request<Pedido[]>('Filtrar pedidos por estado', 'GET', `${API.pedidos}/listar/estado/${encodeURIComponent(this.estadoFiltro)}`, null, (pedidos) => {
      this.loading = false;
      const errMsg = ToastService.mensajeDeError(pedidos);
      if (errMsg) { this.toastService.show('error', errMsg); this.pedidos = []; return; }
      this.pedidos = Array.isArray(pedidos) ? pedidos : [];
    });
  }

  seleccionarPedido(pedido: Pedido): void {
    this.sharedService.updateState({ ultimoPedido: pedido });
    if (!pedido?.numeroPedido) return;
    this.pedidoBusquedaNumero = pedido.numeroPedido;
  }

  private resetPedidoForm(): void {
    this.pedidoForm = {
      mesa: '1',
      metodoPago: 'EFECTIVO',
      cantidad: 1,
      impuesto: 0,
      notas: 'Sin picante',
      cedulaCliente: ''
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
        const mensaje = data.mensaje || data.message || data.error || (typeof data === 'string' ? data : 'Error al conectar con el servidor');
        this.toastService.show('error', mensaje);
        success(null);
      }
    });
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.state.token) {
      headers = headers.set('Authorization', `Bearer ${this.state.token}`);
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
