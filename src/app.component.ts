import { Component, ChangeDetectionStrategy, signal, OnInit, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { OrdersComponent } from './components/orders/orders.component';
import { CustomersComponent } from './components/customers/customers.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ProductsComponent } from './components/products/products.component';
import { DataService } from './services/data.service';
import { PdfService } from './services/pdf.service';
import { SplashScreenComponent } from './components/splash/splash.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { AuthService } from './services/auth.service';
import { SettingsComponent } from './components/settings/settings.component';
import { ThemeService } from './services/theme.service';

export type View = 'dashboard' | 'pricing' | 'products' | 'orders' | 'customers' | 'inventory' | 'reports' | 'login' | 'signup' | 'reset-password' | 'settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DashboardComponent,
    PricingComponent,
    OrdersComponent,
    CustomersComponent,
    InventoryComponent,
    ReportsComponent,
    ProductsComponent,
    SplashScreenComponent,
    LoginComponent,
    SignupComponent,
    ResetPasswordComponent,
    SettingsComponent,
  ],
  providers: [DataService, PdfService, AuthService, ThemeService],
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  
  activeView = signal<View>('login');
  isLoading = signal(true);
  
  currentUser = this.authService.currentUser;

  menuItems: { id: View; name: string; icon: string }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'orders', name: 'Pedidos', icon: '📦' },
    { id: 'products', name: 'Produtos', icon: '🛍️' },
    { id: 'customers', name: 'Clientes', icon: '👩‍💼' },
    { id: 'pricing', name: 'Precificar', icon: '💲' },
    { id: 'settings', name: 'Ajustes', icon: '⚙️' },
  ];

  currentViewName = computed(() => {
    const activeItem = this.menuItems.find(item => item.id === this.activeView());
    // Fallback for views not in the main menu
    if (activeItem) {
      return activeItem.name;
    }
    switch (this.activeView()) {
      case 'inventory': return 'Estoque';
      case 'reports': return 'Relatórios';
      case 'settings': return 'Ajustes';
      default: return 'SilabaLa';
    }
  });

  constructor() {
    effect(() => {
      if (this.currentUser()) {
        const authViews: View[] = ['login', 'signup', 'reset-password'];
        if (authViews.includes(this.activeView())) {
          this.activeView.set('dashboard');
        }
      }
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 7000);
  }

  setView(view: View) {
    this.activeView.set(view);
  }

  logout() {
    this.authService.logout();
    this.activeView.set('login');
  }
}