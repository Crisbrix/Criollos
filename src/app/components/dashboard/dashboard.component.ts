import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedService, Pedido, Producto } from '../../services/shared.service';

export interface ApiStatus {
  name: string;
  url: string;
  status: 'ok' | 'error' | 'loading';
  mensaje: string;
}

const API = {
  productos: 'https://producto-2fxd.onrender.com/productos',
  pedidos: 'https://pedidos-dg22.onrender.com/api/criollos/pedidos',
  auth: 'https://auth-j0i2.onrender.com/api/criollos/usuarios'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, NgClass, NgFor, NgIf],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);

  showUserModal = false;
  productos: Producto[] = [];
  pedidos: Pedido[] = [];
  usuarios: unknown[] = [];
  apiStatus: ApiStatus[] = [
    { name: 'Productos', url: API.productos, status: 'loading', mensaje: 'Conectando...' },
    { name: 'Pedidos', url: API.pedidos, status: 'loading', mensaje: 'Conectando...' },
    { name: 'Auth', url: API.auth, status: 'loading', mensaje: 'Conectando...' }
  ];

  get state() {
    return this.sharedService.getState();
  }

  get ultimosPedidos(): Pedido[] {
    return this.pedidos.slice(0, 5);
  }

  get productosStockBajo(): Producto[] {
    return this.productos.filter(p => (p.stock || 0) <= (p.stockMinimo || 0));
  }

  get totalStockValue(): number {
    return this.productos.reduce((sum, p) => sum + ((p.precio || 0) * (p.stock || 0)), 0);
  }

  get estadisticas() {
    return {
      totalProductos: this.productos.length,
      stockBajo: this.productosStockBajo.length,
      totalPedidos: this.pedidos.length,
      totalVentas: this.pedidos.reduce((sum, p) => sum + (p.total || 0), 0),
      pedidosPendientes: this.pedidos.filter(p => (p.estado || '').toUpperCase() === 'PENDIENTE').length,
      pedidosEntregados: this.pedidos.filter(p => (p.estado || '').toUpperCase() === 'ENTREGADO').length,
      totalUsuarios: this.usuarios.length
    };
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargarProductos();
    this.cargarPedidos();
    this.cargarUsuarios();
  }

  cargarProductos(): void {
    this.request<Producto[]>('productos', 'GET', `${API.productos}/todos`, null, (data) => {
      this.productos = Array.isArray(data) ? data : [];
      this.apiStatus[0] = { ...this.apiStatus[0], status: 'ok', mensaje: `${this.productos.length} productos` };
    });
  }

  cargarPedidos(): void {
    this.request<Pedido[]>('pedidos', 'GET', `${API.pedidos}/listar`, null, (data) => {
      this.pedidos = Array.isArray(data) ? data : [];
      this.apiStatus[1] = { ...this.apiStatus[1], status: 'ok', mensaje: `${this.pedidos.length} pedidos` };
    });
  }

  cargarUsuarios(): void {
    this.request<unknown[]>('auth', 'GET', `${API.auth}/listar`, null, (data) => {
      this.usuarios = Array.isArray(data) ? data : [];
      this.apiStatus[2] = { ...this.apiStatus[2], status: 'ok', mensaje: `${this.usuarios.length} usuarios` };
    });
  }

  private request<T>(
    source: string,
    method: 'GET' | 'POST',
    url: string,
    body: unknown,
    success: (data: T | null) => void
  ): void {
    this.http.request<T>(method, url, { body, headers: this.headers() }).subscribe({
      next: (data) => { success(data); },
      error: (error) => {
        const idx = this.apiStatus.findIndex(a => a.url.startsWith(url.substring(0, url.indexOf('/', 10))));
        if (idx >= 0) {
          this.apiStatus[idx] = { ...this.apiStatus[idx], status: 'error', mensaje: `Error ${error.status || 'desconocido'}` };
        }
        success(null);
      }
    });
  }

  cerrarSesion(): void {
    this.showUserModal = false;
    this.sharedService.clearSession();
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.state.token) headers = headers.set('Authorization', `Bearer ${this.state.token}`);
    return headers;
  }
}
