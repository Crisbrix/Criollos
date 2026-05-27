import { CurrencyPipe, DatePipe, JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ViewName = 'login' | 'productos' | 'pedidos' | 'seguimiento';
type AuthMode = 'login' | 'register';

interface UsuarioSesion {
  email?: string;
  nombre?: string;
  role?: string;
}

interface Producto {
  productoId?: number;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  stockMinimo?: number;
  categoria?: string;
  activo?: boolean;
}

interface Pedido {
  numeroPedido?: string;
  cedulaCliente?: string;
  nombreCliente?: string;
  mesa?: string;
  metodoPago?: string;
  estado?: string;
  subtotal?: number;
  impuesto?: number;
  total?: number;
  detalles?: Array<{
    productoId?: number;
    nombreProducto?: string;
    cantidad?: number;
    notas?: string;
  }>;
}

interface EventoTrazabilidad {
  hora: Date;
  titulo: string;
  detalle: string;
}

const API = {
  auth: 'https://auth-j0i2.onrender.com',
  productos: 'http://localhost:8081/productos',
  pedidos: 'http://localhost:8082/api/criollos/pedidos'
};

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, FormsModule, JsonPipe, NgClass, NgFor, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  currentView: ViewName = 'login';
  authMode: AuthMode = 'login';
  outputTitle = 'Listo para probar';
  output: unknown = {
    ayuda: 'Enciende Auth en 8080, Producto en 8081 y Pedidos en 8082.'
  };

  state = {
    token: '',
    usuario: {} as UsuarioSesion,
    cedula: '',
    producto: {} as Producto,
    ultimoPedido: {} as Pedido
  };

  loginForm = {
    email: 'ana@test.com',
    password: '123456',
    cedula: '123456'
  };

  loginLoading = false;

  containerTransform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';

  usuarioForm = {
    cedula: '123456',
    nombre: 'Ana',
    apellido: 'Perez',
    email: 'ana@test.com',
    username: 'ana',
    password: '123456',
    edad: 25,
    telefono: '3001234567',
    role: 'USER',
    estado: 'ACTIVO'
  };

  productoForm = {
    nombre: 'Arepa criolla',
    descripcion: 'Arepa con queso',
    precio: 8500,
    stock: 20,
    stockMinimo: 5,
    categoria: 'Comida',
    activo: true
  };

  pedidoForm = {
    mesa: '1',
    metodoPago: 'EFECTIVO',
    cantidad: 1,
    impuesto: 0,
    notas: 'Sin picante'
  };

  productoBusquedaId = '1';
  pedidoBusquedaNumero = '';
  estadoFiltro = 'PENDIENTE';
  productos: Producto[] = [];
  pedidos: Pedido[] = [];
  eventos: EventoTrazabilidad[] = [];

  readonly steps = [
    {
      label: 'Login',
      view: 'login' as ViewName,
      done: () => Boolean(this.state.token),
      detail: () => this.state.usuario.nombre || 'Usuario pendiente'
    },
    {
      label: 'Producto',
      view: 'productos' as ViewName,
      done: () => Boolean(this.state.producto.productoId),
      detail: () => this.state.producto.nombre || 'Inventario pendiente'
    },
    {
      label: 'Pedido',
      view: 'pedidos' as ViewName,
      done: () => Boolean(this.state.ultimoPedido.numeroPedido),
      detail: () => this.state.ultimoPedido.numeroPedido || 'Pedido pendiente'
    },
    {
      label: 'Seguimiento',
      view: 'seguimiento' as ViewName,
      done: () => this.eventos.length > 0,
      detail: () => `${this.eventos.length} eventos`
    }
  ];

  crearUsuario(): void {
    const payload = {
      ...this.usuarioForm,
      edad: this.numberOrZero(this.usuarioForm.edad)
    };

    this.request<UsuarioSesion>('Crear usuario', 'POST', `${API.auth}/guardar`, payload, (usuario) => {
      if (!usuario) return;
      this.loginForm.email = payload.email;
      this.loginForm.password = payload.password;
      this.loginForm.cedula = payload.cedula;
      this.authMode = 'login';
    });
  }

  login(): void {
    this.loginLoading = true;
    this.request<{ token?: string; usuario?: UsuarioSesion }>('Login', 'POST', `${API.auth}/login`, {
      email: this.loginForm.email,
      password: this.loginForm.password
    }, (data) => {
      this.loginLoading = false;
      if (!data?.token) return;
      this.state.token = data.token;
      this.state.usuario = data.usuario || {};
      this.state.cedula = this.loginForm.cedula;
      this.currentView = 'productos';
      this.addEvento('Sesion iniciada', `Cliente ${this.state.usuario.nombre || this.state.cedula} autenticado.`);
    });
  }

  socialLogin(provider: string): void {
    this.addEvento('Social login', `Iniciando sesión con ${provider}`);
    this.setOutput(`Social login: ${provider}`, { mensaje: `Simulado: ${provider}` });
  }

  onMouseMove(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    this.containerTransform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  onMouseLeave(): void {
    this.containerTransform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  }

  guardarProducto(): void {
    const payload = {
      ...this.productoForm,
      precio: this.numberOrZero(this.productoForm.precio),
      stock: this.numberOrZero(this.productoForm.stock),
      stockMinimo: this.numberOrZero(this.productoForm.stockMinimo),
      activo: Boolean(this.productoForm.activo)
    };

    this.request<Producto>('Guardar producto', 'POST', `${API.productos}/guardar`, payload, (producto) => {
      if (!producto?.productoId) return;
      this.seleccionarProducto(producto);
      this.currentView = 'pedidos';
    });
  }

  buscarProducto(): void {
    if (!this.productoBusquedaId) return;
    this.request<Producto>('Buscar producto', 'GET', `${API.productos}/buscar/${encodeURIComponent(this.productoBusquedaId)}`, null, (producto) => {
      if (!producto?.productoId) return;
      this.seleccionarProducto(producto);
      this.currentView = 'pedidos';
    });
  }

  listarProductos(): void {
    this.request<Producto[]>('Listar productos', 'GET', `${API.productos}/todos`, null, (productos) => {
      this.productos = Array.isArray(productos) ? productos : [];
    });
  }

  seleccionarProducto(producto: Producto): void {
    this.state.producto = producto || {};
    if (!producto?.productoId) return;
    this.productoBusquedaId = String(producto.productoId);
    this.addEvento('Producto seleccionado', `${producto.nombre} #${producto.productoId}`);
  }

  crearPedido(): void {
    if (!this.state.cedula || !this.state.producto.productoId) {
      this.setOutput('Falta completar el flujo', {
        mensaje: 'Primero inicia sesion y selecciona un producto.'
      });
      return;
    }

    const payload = {
      cedulaCliente: this.state.cedula,
      mesa: this.pedidoForm.mesa,
      metodoPago: this.pedidoForm.metodoPago,
      impuesto: this.numberOrZero(this.pedidoForm.impuesto),
      detalles: [
        {
          productoId: this.state.producto.productoId,
          cantidad: this.numberOrZero(this.pedidoForm.cantidad),
          notas: this.pedidoForm.notas
        }
      ]
    };

    this.request<Pedido>('Crear pedido', 'POST', `${API.pedidos}/guardar`, payload, (pedido) => {
      if (!pedido?.numeroPedido) return;
      this.seleccionarPedido(pedido);
      this.currentView = 'seguimiento';
    });
  }

  buscarPedido(): void {
    if (!this.pedidoBusquedaNumero) return;
    this.request<Pedido>('Buscar pedido', 'GET', `${API.pedidos}/buscar/${encodeURIComponent(this.pedidoBusquedaNumero)}`, null, (pedido) => {
      if (pedido?.numeroPedido) this.seleccionarPedido(pedido);
    });
  }

  listarPedidos(): void {
    this.request<Pedido[]>('Listar pedidos', 'GET', `${API.pedidos}/listar`, null, (pedidos) => {
      this.pedidos = Array.isArray(pedidos) ? pedidos : [];
    });
  }

  listarPedidosPorEstado(): void {
    this.request<Pedido[]>('Filtrar pedidos por estado', 'GET', `${API.pedidos}/listar/estado/${encodeURIComponent(this.estadoFiltro)}`, null, (pedidos) => {
      this.pedidos = Array.isArray(pedidos) ? pedidos : [];
    });
  }

  seleccionarPedido(pedido: Pedido): void {
    this.state.ultimoPedido = pedido || {};
    if (!pedido?.numeroPedido) return;
    this.pedidoBusquedaNumero = pedido.numeroPedido;
    this.addEvento('Pedido en trazabilidad', `${pedido.numeroPedido} - ${pedido.estado || 'SIN_ESTADO'}`);
  }

  limpiarEventos(): void {
    this.eventos = [];
  }

  clearOutput(): void {
    this.setOutput('Listo para probar', {
      mensaje: 'Selecciona un modulo para continuar.'
    });
  }

  reset(): void {
    this.state = {
      token: '',
      usuario: {},
      cedula: '',
      producto: {},
      ultimoPedido: {}
    };
    this.productos = [];
    this.pedidos = [];
    this.eventos = [];
    this.currentView = 'login';
    this.authMode = 'login';
    this.setOutput('Flujo reiniciado', {
      mensaje: 'Puedes iniciar de nuevo desde login.'
    });
  }

  private request<T>(
    title: string,
    method: 'GET' | 'POST',
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
        this.addEvento(title, 'Operacion completada correctamente.');
        success(data);
      },
      error: (error) => {
        const data = error.error || {
          mensaje: error.status === 0
            ? 'No se pudo conectar con el servicio.'
            : 'La API respondio con error.',
          status: error.status
        };
        this.setOutput(title, data);
        this.addEvento(title, data.mensaje || 'Error de comunicacion');
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

  private addEvento(titulo: string, detalle: string): void {
    this.eventos = [
      { hora: new Date(), titulo, detalle },
      ...this.eventos
    ];
  }

  private numberOrZero(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
