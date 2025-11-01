import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { View } from '../../app.component';
import { AuthService } from '../../services/auth.service';
// Fix: Import the official logo image.
import { SILABALA_LOGO } from '../../assets/logo';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // Fix: Converted to inline template to encapsulate component logic and view.
  template: `
<div class="w-full max-w-md space-y-6">
  <div class="text-center">
    <img [src]="logo" alt="SilabaLa+ Logo" class="w-48 h-auto mx-auto mb-4">
    <h2 class="text-3xl font-bold text-[var(--text-color)]" style="font-family: 'Dancing Script', cursive;">Recuperar Senha 💌</h2>
    <p class="text-[var(--secondary-color)]">Não se preocupe, laços também se refazem!</p>
  </div>

  <div class="bg-[var(--card-color)] p-8 rounded-2xl shadow-xl shadow-[var(--shadow-color)] border border-[var(--input-border-color)] space-y-6">
    @if (successMessage()) {
      <div class="bg-[var(--success-bg)] text-[var(--success-text)] p-4 rounded-lg text-center space-y-2">
        <p class="font-semibold">✨ Sucesso!</p>
        <p class="text-sm">{{ successMessage() }}</p>
      </div>
    } @else {
      <p class="text-center text-sm text-[var(--secondary-color)]">
        Digite seu e-mail abaixo e enviaremos um link para você criar uma nova senha.
      </p>
      <form (ngSubmit)="sendResetLink()" class="space-y-4">
        <div>
          <label for="email" class="text-sm font-medium text-[var(--secondary-color)]">Seu e-mail cadastrado 📧</label>
          <input id="email" type="email" [(ngModel)]="email" name="email"
                 class="w-full mt-1" required placeholder="seu@email.com">
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
              <span>Enviar Link</span>
            }
          </button>
        </div>
      </form>
    }
  </div>

  <div class="text-center text-sm text-[var(--secondary-color)]">
    <p>
      Lembrou a senha? <a (click)="navigateTo('login')" class="font-medium text-pink-600 hover:underline cursor-pointer">Voltar para o login 💖</a>
    </p>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  navigate = output<View>();
  authService = inject(AuthService);

  email = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  // Fix: Make the logo available to the template.
  logo = SILABALA_LOGO;

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendResetLink() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    const email = this.email().trim();

    if (!email || !this.isValidEmail(email)) {
      this.errorMessage.set('Por favor, insira um e-mail válido.');
      this.isLoading.set(false);
      return;
    }

    const result = await this.authService.sendPasswordResetEmail(this.email());
    
    if (result.success) {
      this.successMessage.set('Link de recuperação enviado com carinho 💌 Verifique seu e-mail.');
    } else {
      this.errorMessage.set(result.error || 'Ocorreu um erro. Tente novamente.');
    }

    this.isLoading.set(false);
  }

  navigateTo(view: View) {
    this.navigate.emit(view);
  }
}