import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedService, Pedido } from '../../services/shared.service';

export interface EventoTrazabilidad {
  hora: Date;
  titulo: string;
  detalle: string;
}

const API = {
  pedidos: 'https://pedidos-dg22.onrender.com/api/criollos/pedidos'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgClass, NgFor, NgIf],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sharedService = inject(SharedService);

  eventos: EventoTrazabilidad[] = [];
  pedidos: Pedido[] = [];
  outputTitle = 'Dashboard';
  output: unknown = { mensaje: 'Sistema de seguimiento de pedidos' };

  get state() {
    return this.sharedService.getState();
  }

  get eventosDashboard(): EventoTrazabilidad[] {
    return this.eventos.slice(0, 5);
  }

  get ultimosPedidos(): Pedido[] {
    return this.pedidos.slice(0, 5);
  }

  get estadisticas() {
    return {
      totalPedidos: this.pedidos.length,
      totalVentas: this.pedidos.reduce((sum, p) => sum + (p.total || 0), 0),
      pedidosPendientes: this.pedidos.filter(p => (p.estado || '').toUpperCase() === 'PENDIENTE').length,
      pedidosEntregados: this.pedidos.filter(p => (p.estado || '').toUpperCase() === 'ENTREGADO').length
    };
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.addEvento('Dashboard iniciado', 'Panel de seguimiento listo.');
  }

  cargarDatos(): void {
    this.listarPedidos();
  }

  listarPedidos(): void {
    this.request<Pedido[]>('Listar pedidos', 'GET', `${API.pedidos}/listar`, null, (pedidos) => {
      this.pedidos = Array.isArray(pedidos) ? pedidos : [];
    });
  }

  limpiarEventos(): void {
    this.eventos = [];
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

  private addEvento(titulo: string, detalle: string): void {
    this.eventos = [
      { hora: new Date(), titulo, detalle },
      ...this.eventos
    ];
  }
}
