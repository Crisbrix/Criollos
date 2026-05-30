import { Component, inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedService } from '../../services/shared.service';

export interface Usuario {
  id?: number;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  username?: string;
  password?: string;
  edad?: number;
  telefono?: string;
  role?: string;
  estado?: string;
}

const API = {
  auth: 'https://auth-j0i2.onrender.com/api/criollos/usuarios'
};

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, FormsModule],
  templateUrl: './usuario.component.html',
  styleUrl: './usuario.component.css'
})
export class UsuarioComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);

  usuarios: Usuario[] = [];
  usuarioForm: Usuario = {
    cedula: '',
    nombre: '',
    apellido: '',
    email: '',
    username: '',
    password: '',
    edad: 25,
    telefono: '',
    role: '',
    estado: 'ACTIVO'
  };
  usuarioBusquedaId = '';
  activeModal: 'nuevo' | 'editar' | 'eliminar' | 'ver' | null = null;
  usuarioSeleccionado: Usuario | null = null;
  loading = false;
  resultado: { tipo: 'exito' | 'error'; mensaje: string; detalle?: unknown } | null = null;

  get state() {
    return this.sharedService.getState();
  }

  ngOnInit(): void {
    this.listarUsuarios();
  }

  get totalUsuarios(): number {
    return this.usuarios.length;
  }

  abrirModalVer(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.activeModal = 'ver';
  }

  abrirModalNuevo(): void {
    this.usuarioForm = { cedula: '', nombre: '', apellido: '', email: '', username: '', password: '', edad: 25, telefono: '', role: '', estado: 'ACTIVO' };
    this.activeModal = 'nuevo';
  }

  abrirModalEditar(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.usuarioForm = {
      cedula: usuario.cedula || '',
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      email: usuario.email || '',
      username: usuario.username || '',
      password: '',
      edad: usuario.edad || 25,
      telefono: usuario.telefono || '',
      role: usuario.role || '',
      estado: usuario.estado || 'ACTIVO'
    };
    this.activeModal = 'editar';
  }

  abrirModalEliminar(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.activeModal = 'eliminar';
  }

  cerrarModal(): void {
    this.activeModal = null;
    this.usuarioSeleccionado = null;
  }

  guardarUsuario(): void {
    const payload = { ...this.usuarioForm, edad: this.numberOrZero(this.usuarioForm.edad) };

    this.loading = true;
    this.resultado = null;

    this.request<Usuario>('Crear usuario', 'POST', `${API.auth}/guardar`, payload, (usuario) => {
      this.loading = false;
      if (usuario && (usuario as any).success !== false) {
        this.resultado = { tipo: 'exito', mensaje: 'Usuario creado exitosamente', detalle: usuario };
        this.cerrarModal();
        this.listarUsuarios();
      } else if (!this.resultado) {
        this.resultado = { tipo: 'error', mensaje: (usuario as any)?.mensaje || 'No se pudo crear el usuario', detalle: usuario };
      }
    });
  }

  actualizarUsuario(): void {
    const usuario = this.usuarioSeleccionado;
    if (!usuario?.id) return;

    const payload: Record<string, unknown> = {
      cedula: this.usuarioForm.cedula,
      nombre: this.usuarioForm.nombre,
      apellido: this.usuarioForm.apellido,
      email: this.usuarioForm.email,
      username: this.usuarioForm.username,
      edad: this.numberOrZero(this.usuarioForm.edad),
      telefono: this.usuarioForm.telefono,
      role: this.usuarioForm.role,
      estado: this.usuarioForm.estado
    };
    payload['password'] = this.usuarioForm.password;

    this.loading = true;
    this.resultado = null;

    this.request<Usuario>('Actualizar usuario', 'PUT', `${API.auth}/actualizar/${encodeURIComponent(usuario.cedula || '')}`, payload, (updated) => {
      this.loading = false;
      if (updated && (updated as any).id) {
        this.resultado = { tipo: 'exito', mensaje: 'Usuario actualizado exitosamente', detalle: updated };
        this.cerrarModal();
        this.listarUsuarios();
      } else if (!this.resultado) {
        this.resultado = { tipo: 'error', mensaje: (updated as any)?.mensaje || 'No se pudo actualizar el usuario', detalle: updated };
      }
    });
  }

  eliminarUsuario(): void {
    const usuario = this.usuarioSeleccionado;
    if (!usuario?.id) return;

    this.loading = true;
    this.resultado = null;

    this.request<{ success?: boolean; mensaje?: string }>('Eliminar usuario', 'DELETE', `${API.auth}/borrar/${encodeURIComponent(usuario.cedula || '')}`, null, (response) => {
      this.loading = false;
      if (response?.success) {
        this.resultado = { tipo: 'exito', mensaje: response.mensaje || 'Usuario eliminado exitosamente', detalle: undefined };
        this.cerrarModal();
        this.listarUsuarios();
      } else if (!this.resultado) {
        this.resultado = { tipo: 'error', mensaje: response?.mensaje || 'No se pudo eliminar el usuario', detalle: response };
      }
    });
  }

  buscarUsuario(): void {
    if (!this.usuarioBusquedaId) return;
    this.loading = true;
    this.resultado = null;

    this.request<Usuario>('Buscar usuario', 'GET', `${API.auth}/buscar/${encodeURIComponent(this.usuarioBusquedaId)}`, null, (usuario) => {
      this.loading = false;
      if (usuario && (usuario as any).id) {
        this.resultado = { tipo: 'exito', mensaje: `Usuario encontrado: ${(usuario as any).nombre || (usuario as any).email}`, detalle: usuario };
        this.usuarioSeleccionado = usuario;
      } else if (!this.resultado) {
        this.resultado = { tipo: 'error', mensaje: 'Usuario no encontrado.' };
      }
    });
  }

  listarUsuarios(): void {
    this.loading = true;
    this.request<Usuario[]>('Listar usuarios', 'GET', `${API.auth}/listar`, null, (usuarios) => {
      this.loading = false;
      this.usuarios = Array.isArray(usuarios) ? usuarios : [];
    });
  }

  private request<T>(
    title: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body: unknown,
    success: (data: T | null) => void
  ): void {
    this.http.request<T>(method, url, { body, headers: this.headers() }).subscribe({
      next: (data) => { success(data); },
      error: (error) => {
        this.loading = false;
        const data = error.error || { mensaje: error.status === 0 ? 'No se pudo conectar con el servicio.' : 'La API respondio con error.', status: error.status };
        this.resultado = { tipo: 'error', mensaje: data.mensaje || data.message || 'Error al conectar con el servidor', detalle: data };
        success(null);
      }
    });
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.state.token) headers = headers.set('Authorization', `Bearer ${this.state.token}`);
    return headers;
  }

  private numberOrZero(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
