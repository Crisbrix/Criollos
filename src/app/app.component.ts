import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductoComponent } from './components/producto/producto.component';
import { PedidoComponent } from './components/pedido/pedido.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SharedService, UsuarioSesion } from './services/shared.service';

type ViewName = 'login' | 'productos' | 'pedidos' | 'seguimiento';
type AuthMode = 'login' | 'register';

const API = {
  auth: 'https://auth-j0i2.onrender.com/api/criollos/usuarios'
};

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    NgClass,
    NgFor,
    NgIf,
    ProductoComponent,
    PedidoComponent,
    DashboardComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);

  currentView: ViewName = 'login';
  authMode: AuthMode = 'login';
  outputTitle = 'Bienvenido';
  output: unknown = { mensaje: 'Sistema de gestión Criollos' };

  loginForm = {
    email: 'ana@test.com',
    password: '123456'
  };

  loginLoading = false;
  containerTransform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';

  usuarioForm = {
    cedula: '',
    nombre: '',
    apellido: '',
    email: '',
    username: '',
    password: '',
    edad: 25,
    telefono: '',
    role: '',
    estado: ''
  };

  get state() {
    return this.sharedService.getState();
  }

  readonly steps = [
    {
      label: 'Dashboard',
      view: 'seguimiento' as ViewName
    },
    {
      label: 'Productos',
      view: 'productos' as ViewName
    },
    {
      label: 'Pedidos',
      view: 'pedidos' as ViewName
    }
  ];

  estadoClase(estado?: string): string {
    const normalized = (estado || '').toUpperCase();
    if (normalized === 'ENTREGADO') return 'done';
    if (normalized === 'CANCELADO' || normalized === 'ANULADO') return 'cancelled';
    return 'pending';
  }

  crearUsuario(): void {
    const payload = {
      ...this.usuarioForm,
      edad: this.numberOrZero(this.usuarioForm.edad)
    };

    this.request<UsuarioSesion>('Crear usuario', 'POST', `${API.auth}/guardar`, payload, (usuario) => {
      if (!usuario) return;
      this.loginForm.email = payload.email;
      this.loginForm.password = payload.password;
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
      console.log('Datos del login:', data);
      console.log('Usuario recibido:', data.usuario);

      // Decodificar token JWT para obtener datos
      try {
        const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
        console.log('Token decodificado:', tokenPayload);
      } catch (e) {
        console.log('Error al decodificar token:', e);
      }

      // Guardar token primero
      this.sharedService.updateState({
        token: data.token,
        usuario: data.usuario || {},
        cedula: data.usuario?.cedula || ''
      });

      // Intentar buscar usuario por email
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      });

      this.http.get<UsuarioSesion>(`${API.auth}/buscar/${encodeURIComponent(this.loginForm.email)}`, { headers })
        .subscribe({
          next: (usuarioCompleto) => {
            console.log('Usuario completo:', usuarioCompleto);
            if (usuarioCompleto && usuarioCompleto.id) {
              this.sharedService.updateState({
                token: data.token,
                usuario: usuarioCompleto || data.usuario || {},
                cedula: usuarioCompleto?.cedula || data.usuario?.cedula || ''
              });
            }
            this.currentView = 'productos';
          },
          error: (error) => {
            console.log('Error al buscar usuario:', error);
            // Si falla, continuar con los datos del login
            this.currentView = 'productos';
          }
        });
    });
  }

  socialLogin(provider: string): void {
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

  reset(): void {
    this.sharedService.setState({
      token: '',
      usuario: {},
      cedula: '',
      producto: {},
      ultimoPedido: {}
    });
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
