import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { View } from '../../app.component';
import { AuthService } from '../../services/auth.service';
// Fix: Import the official logo image.
import { SILABALA_LOGO } from '../../assets/logo';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // Fix: Converted to inline template to encapsulate component logic and view.
  template: `
<div class="w-full max-w-md space-y-6">
  <div class="text-center">
    <img [src]="logo" alt="SilabaLa+ Logo" class="w-48 h-auto mx-auto mb-4">
    <h2 class="text-2xl font-bold text-[var(--text-color)]">Crie sua conta ✨</h2>
    <p class="text-[var(--secondary-color)]">E comece a encantar com suas criações.</p>
  </div>

  <div class="bg-[var(--card-color)] p-8 rounded-2xl shadow-xl shadow-[var(--shadow-color)] border border-[var(--input-border-color)] space-y-6">
    <form (ngSubmit)="signup()" class="space-y-4">
      <div>
        <label for="name" class="text-sm font-medium text-[var(--secondary-color)]">Seu Nome 👩‍🦰</label>
        <input id="name" type="text" [(ngModel)]="name" name="name"
               class="w-full mt-1" required placeholder="Como podemos te chamar?">
      </div>
       <div>
        <label for="email" class="text-sm font-medium text-[var(--secondary-color)]">E-mail 📧</label>
        <input id="email" type="email" [(ngModel)]="email" name="email"
               class="w-full mt-1" required placeholder="seu@email.com">
      </div>
      <div>
        <label for="password" class="text-sm font-medium text-[var(--secondary-color)]">Senha 🔒</label>
        <input id="password" type="password" [(ngModel)]="password" name="password"
               class="w-full mt-1" required placeholder="Crie uma senha forte">
      </div>
       <div>
        <label for="confirmPassword" class="text-sm font-medium text-[var(--secondary-color)]">Confirmar Senha 🔑</label>
        <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword"
               class="w-full mt-1" required placeholder="Repita a senha">
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
            <span>Criar Conta 💕</span>
          }
        </button>
      </div>
    </form>

  </div>

  <div class="text-center text-sm text-[var(--secondary-color)]">
    <p>
      Já tem uma conta? <a (click)="navigateTo('login')" class="font-medium text-pink-600 hover:underline cursor-pointer">Entre aqui! 💖</a>
    </p>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  navigate = output<View>();
  authService = inject(AuthService);
  
  name = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  // Fix: Make the logo available to the template.
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

  signup() {
    this.errorMessage.set(null);
    const name = this.name().trim();
    const email = this.email().trim();
    const password = this.password();

    if (!name) {
      this.errorMessage.set('Por favor, insira seu nome.');
      return;
    }
    if (!email || !this.isValidEmail(email)) {
      this.errorMessage.set('Por favor, insira um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      this.errorMessage.set('Sua senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== this.confirmPassword()) {
      this.errorMessage.set('As senhas não conferem.');
      return;
    }

    this.handleAuth(this.authService.signup(name, email, password));
  }

  navigateTo(view: View) {
    this.navigate.emit(view);
  }
}