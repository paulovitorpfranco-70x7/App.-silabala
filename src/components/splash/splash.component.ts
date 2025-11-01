import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SILABALA_LOGO } from '../../assets/logo';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="fixed inset-0 bg-gradient-to-b from-[#FFF6FA] to-[#F9C6D3] flex flex-col items-center justify-center z-50 animate-splash-lifecycle overflow-hidden">
  
  <!-- Particle Background -->
  <div class="absolute inset-0 w-full h-full">
    <div class="particle">💕</div>
    <div class="particle">✨</div>
    <div class="particle">🎀</div>
    <div class="particle">💖</div>
    <div class="particle">✨</div>
    <div class="particle">💕</div>
    <div class="particle">🎀</div>
    <div class="particle">💖</div>
    <div class="particle">✨</div>
    <div class="particle">💕</div>
  </div>

  <!-- Main Content -->
  <div class="relative flex flex-col items-center text-center p-4">
    <div class="animate-fade-in-scale">
        <img [src]="logo" alt="SilabaLa+ Logo" class="w-80 h-auto">
    </div>
    
    <h2 class="mt-6 text-2xl text-[#E94E77] animate-fade-in-delay-1" style="font-family: 'Dancing Script', cursive;">
        Laços e tiaras para pequenos encantos 💕
    </h2>
    
    <!-- Loading Text -->
    <p class="mt-8 text-sm text-gray-500 animate-fade-in-delay-2">
      Preparando seus laços com carinho... 🎀
    </p>
  </div>
  
  <!-- Verse Container -->
  @if (verse()) {
    <div class="versiculo-container">
      <p class="versiculo-texto">
        {{ verse() }}
      </p>
    </div>
  }
</div>
  `,
  styles: [`
  /* --- Main Animations --- */
  @keyframes splash-lifecycle {
    0% { opacity: 0; }
    10%, 90% { opacity: 1; } /* Stay visible longer */
    100% { opacity: 0; }
  }
  .animate-splash-lifecycle {
    animation: splash-lifecycle 7s ease-in-out forwards; /* Increased duration */
  }

  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-fade-in-scale {
    animation: fade-in-scale 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }
  
  @keyframes fade-in-delay {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-delay-1 {
    animation: fade-in-delay 0.8s ease-out 1.2s forwards;
    opacity: 0;
  }
  .animate-fade-in-delay-2 {
    animation: fade-in-delay 0.8s ease-out 1.5s forwards;
    opacity: 0;
  }
  
  /* --- Particle Animations --- */
  .particle {
    position: absolute;
    bottom: -50px;
    font-size: 20px;
    opacity: 0;
    animation: float-up 10s infinite linear;
  }

  @keyframes float-up {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    10%, 90% {
      opacity: 0.4;
    }
    100% {
      transform: translateY(-100vh);
      opacity: 0;
    }
  }
  
  .particle:nth-child(1) { left: 10%; animation-delay: 0s; transform: scale(0.8); }
  .particle:nth-child(2) { left: 20%; animation-delay: 2s; transform: scale(1.2); color: #C8B7E8; }
  .particle:nth-child(3) { left: 30%; animation-delay: 4s; transform: scale(1); }
  .particle:nth-child(4) { left: 40%; animation-delay: 1s; transform: scale(0.9); }
  .particle:nth-child(5) { left: 50%; animation-delay: 7s; transform: scale(1.1); color: #FFD8E8; }
  .particle:nth-child(6) { left: 60%; animation-delay: 3s; transform: scale(0.8); }
  .particle:nth-child(7) { left: 70%; animation-delay: 8s; transform: scale(1); }
  .particle:nth-child(8) { left: 80%; animation-delay: 5s; transform: scale(1.3); color: #C8B7E8; }
  .particle:nth-child(9) { left: 90%; animation-delay: 6s; transform: scale(0.7); }
  .particle:nth-child(10) { left: 95%; animation-delay: 9s; transform: scale(1.1); }

  /* --- Verse Styles --- */
  .versiculo-container {
    position: absolute;
    bottom: 40px;
    left: 0;
    width: 100%;
    text-align: center;
    animation: fadeIn 1.8s ease forwards;
    animation-delay: 1.8s; /* Delay to appear after main content */
    opacity: 0;
    padding: 0 24px;
  }

  .versiculo-texto {
    font-family: 'Dancing Script', cursive;
    color: #E94E77;
    font-size: 1.2rem; /* Slightly larger */
    line-height: 1.5;
    text-shadow: 0 1px 3px rgba(233, 78, 119, 0.2);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreenComponent implements OnInit {
  logo = SILABALA_LOGO;
  verse = signal('');
  
  private http = inject(HttpClient);
  
  private offlineVerses = [
    "Tudo posso naquele que me fortalece. – Filipenses 4:13",
    "O Senhor é meu pastor; nada me faltará. – Salmo 23:1",
    "Entrega o teu caminho ao Senhor; confia nele, e ele o fará. – Salmo 37:5"
  ];

  ngOnInit(): void {
    this.loadVerse();
  }

  private loadVerse() {
    if (typeof localStorage === 'undefined') {
      this.showOfflineVerse();
      return;
    }
    
    const today = new Date().toDateString();
    const cachedVerse = localStorage.getItem('versiculoDia');
    const cachedDate = localStorage.getItem('dataVersiculo');

    if (cachedVerse && cachedDate === today) {
      this.verse.set(cachedVerse);
      return;
    }

    this.http.get<any>('https://www.abibliadigital.com.br/api/verses/nvi/random').subscribe({
      next: (data) => {
        if (data?.text) {
          const newVerse = `"${data.text}" — ${data.book.name} ${data.chapter}:${data.number}`;
          this.verse.set(newVerse);
          localStorage.setItem('versiculoDia', newVerse);
          localStorage.setItem('dataVersiculo', today);
        } else {
          this.showOfflineVerse();
        }
      },
      error: () => this.showOfflineVerse(),
    });
  }

  private showOfflineVerse() {
    const index = Math.floor(Math.random() * this.offlineVerses.length);
    const offlineVerse = this.offlineVerses[index];
    this.verse.set(offlineVerse);

    if (typeof localStorage !== 'undefined') {
      const today = new Date().toDateString();
      localStorage.setItem('versiculoDia', offlineVerse);
      localStorage.setItem('dataVersiculo', today);
    }
  }
}