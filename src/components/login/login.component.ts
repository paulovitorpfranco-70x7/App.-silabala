import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { View } from '../../app.component';
import { AuthService } from '../../services/auth.service';
import { SILABALA_LOGO } from '../../assets/logo';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // Fix: Converted to inline template to encapsulate component logic and view.
  template: `
<div class="w-full max-w-md space-y-6">
  <div class="text-center">
    <img [src]="logo" alt="SilabaLa+ Logo" class="w-48 h-auto mx-auto mb-4">
    <h2 class="text-3xl font-bold text-[var(--text-color)]" style="font-family: 'Dancing Script', cursive;">Bem-vinda de volta! 💖</h2>
    <p class="text-[var(--secondary-color)]">Que bom te ver por aqui de novo.</p>
  </div>

  <div class="bg-[var(--card-color)] p-8 rounded-2xl shadow-xl shadow-[var(--shadow-color)] border border-[var(--input-border-color)] space-y-6">
    <form (ngSubmit)="login()" class="space-y-4">
      <div>
        <label for="email" class="text-sm font-medium text-[var(--secondary-color)]">E-mail 📧</label>
        <input id="email" type="email" [(ngModel)]="email" name="email"
               class="w-full mt-1" required placeholder="seu@email.com ou dev@dev.com">
      </div>
      <div>
        <div class="flex justify-between items-baseline">
          <label for="password" class="text-sm font-medium text-[var(--secondary-color)]">Senha 🔒</label>
          <a (click)="navigateTo('reset-password')" class="text-sm text-pink-600 hover:underline cursor-pointer">Esqueceu a senha?</a>
        </div>
        <input id="password" type="password" [(ngModel)]="password" name="password"
               class="w-full mt-1" required placeholder="Qualquer senha para modo dev">
      </div>

      @if (errorMessage()) {
        <div class="bg-[var(--danger-bg)] text-[var(--danger-text)] text-sm p-3 rounded-lg text-center">
          {{ errorMessage() }}
        </div>
      }

      <div>
        <button type="submit" [disabled]="isLoading()"
                class="w-full text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex justify-center items-center bg-[var(--accent-color)] shadow-[0_3px_6px_var(--shadow-color)] hover:opacity-80 disabled:opacity-50">
          @if (isLoading()) {
            <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          } @else {
            <span>Entrar</span>
          }
        </button>
      </div>
    </form>
    
  </div>

  <div class="text-center text-sm text-[var(--secondary-color)]">
    <p>
      Não tem uma conta? <a (click)="navigateTo('signup')" class="font-medium text-pink-600 hover:underline cursor-pointer">Crie uma agora! 🎀</a>
    </p>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  navigate = output<View>();
  authService = inject(AuthService);

  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  logo = SILABALA_LOGO;

  private async handleAuth(authPromise: Promise<{ success: boolean; error?: string }>) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const result = await authPromise;
    if (result.error) {
      this.errorMessage.set(result.error);
    }
    // On success, the main app component will automatically redirect via effect.
    this.isLoading.set(false);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  login() {
    this.errorMessage.set(null);
    const email = this.email().trim();
    const password = this.password();

    if (!email) {
      this.errorMessage.set('Por favor, insira seu e-mail.');
      return;
    }
    if (!this.isValidEmail(email)) {
      this.errorMessage.set('Por favor, insira um e-mail válido.');
      return;
    }
    if (!password) {
        this.errorMessage.set('Por favor, insira sua senha.');
        return;
    }
    this.handleAuth(this.authService.login(email, password));
  }

  navigateTo(view: View) {
    this.navigate.emit(view);
  }
}