import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UsuarioSesion {
  id?: number;
  cedula?: string;
  email?: string;
  nombre?: string;
  role?: string;
}

export interface Producto {
  productoId?: number;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  stockMinimo?: number;
  categoria?: string;
  activo?: boolean;
}

export interface Pedido {
  id?: number;
  numeroPedido?: string;
  cedulaCliente?: string;
  nombreCliente?: string;
  emailCliente?: string;
  mesa?: string;
  usuarioId?: number;
  metodoPago?: string;
  estado?: string;
  subtotal?: number;
  impuesto?: number;
  total?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  detalles?: Array<{
    id?: number;
    productoId?: number;
    nombreProducto?: string;
    cantidad?: number;
    precioUnitario?: number;
    subtotal?: number;
    notas?: string;
  }>;
}

export interface AppState {
  token: string;
  usuario: UsuarioSesion;
  cedula: string;
  producto: Producto;
  ultimoPedido: Pedido;
}

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private stateSubject = new BehaviorSubject<AppState>({
    token: '',
    usuario: {},
    cedula: '',
    producto: {},
    ultimoPedido: {}
  });

  state$ = this.stateSubject.asObservable();

  constructor() { }

  getState(): AppState {
    return this.stateSubject.value;
  }

  setState(state: AppState): void {
    this.stateSubject.next(state);
  }

  updateState(partial: Partial<AppState>): void {
    this.setState({ ...this.getState(), ...partial });
  }
}
