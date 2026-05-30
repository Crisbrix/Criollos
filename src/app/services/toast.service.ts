import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  tipo: 'exito' | 'error';
  mensaje: string;
  detalle?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<Toast | null>(null);
  toast$ = this.toastSubject.asObservable();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(tipo: 'exito' | 'error', mensaje: string, detalle?: unknown): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.toastSubject.next({ tipo, mensaje, detalle });
    this.timeoutId = setTimeout(() => this.hide(), 5000);
  }

  hide(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.toastSubject.next(null);
  }

  static mensajeDeError(data: unknown): string | null {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      if (obj['error'] === true || obj['success'] === false) {
        return (obj['mensaje'] as string) || (obj['message'] as string) || null;
      }
    }
    return null;
  }
}
