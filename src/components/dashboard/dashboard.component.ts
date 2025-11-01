import { Component, ChangeDetectionStrategy, inject, computed, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { DataService } from '../../services/data.service';
import { View } from '../../app.component';
import { Order } from '../../models';

interface ChartBar {
  day: string; // The label for the bar (e.g., '24/10', '10', 'Jan')
  amount: number;
  height: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  dataService = inject(DataService);
  viewChange = output<View>();

  // --- Chart State ---
  chartPeriod = signal<'7d' | 'month' | 'year'>('7d');
  activeTooltip = signal<string | null>(null);

  // --- KPIs ---
  totalSalesMonth = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.dataService.orders()
      .filter(o => {
        const orderDate = new Date(o.orderDate);
        return o.paymentStatus === 'Pago' && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.total, 0);
  });

  pendingOrders = computed(() => {
    return this.dataService.orders().filter(o => o.orderStatus !== 'Entregue').length;
  });

  estimatedProfitMonth = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const products = this.dataService.products();
    
    return this.dataService.orders()
      .filter(o => {
        const orderDate = new Date(o.orderDate);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((totalProfit, order) => {
        const orderProfit = order.items.reduce((itemProfit, item) => {
          const product = products.find(p => p.id === item.productId);
          return itemProfit + (product ? (product.price - product.totalCost) * item.quantity : 0);
        }, 0);
        return totalProfit + orderProfit;
      }, 0);
  });

  lowStockMaterials = computed(() => {
    return this.dataService.materials().filter(m => m.stock < 10).length;
  });

  // --- Sales Chart ---
  salesChartData = computed<ChartBar[]>(() => {
    const period = this.chartPeriod();
    const orders = this.dataService.orders().filter(o => o.paymentStatus === 'Pago');
    const now = new Date();
    now.setHours(23, 59, 59, 999); // Ensure today is fully included

    let salesData: Map<string, number>;
    let labels: string[];

    if (period === '7d') {
      salesData = new Map<string, number>();
      labels = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayKey = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        labels.push(dayKey);
        salesData.set(dayKey, 0);
      }
      
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(now.getDate() - 6);

      orders
        .filter(o => new Date(o.orderDate) >= sevenDaysAgo && new Date(o.orderDate) <= now)
        .forEach(o => {
          const dayKey = new Date(o.orderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (salesData.has(dayKey)) {
            salesData.set(dayKey, (salesData.get(dayKey) || 0) + o.total);
          }
        });

      const values = Array.from(salesData.values());
      const maxSale = Math.max(...values, 1);

      return labels.map(label => {
        const amount = salesData.get(label) || 0;
        return {
          day: label,
          amount,
          height: `${(amount / maxSale) * 100}%`,
        };
      });

    } else if (period === 'month') {
        salesData = new Map<string, number>();
        labels = [];
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const dayKey = i.toString();
            labels.push(dayKey);
            salesData.set(dayKey, 0);
        }

        orders
            .filter(o => {
                const orderDate = new Date(o.orderDate);
                return orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth;
            })
            .forEach(o => {
                const dayKey = new Date(o.orderDate).getDate().toString();
                if (salesData.has(dayKey)) {
                    salesData.set(dayKey, (salesData.get(dayKey) || 0) + o.total);
                }
            });
        
        const values = Array.from(salesData.values());
        const maxSale = Math.max(...values, 1);

        return labels.map(label => {
          const amount = salesData.get(label) || 0;
          return {
            day: label,
            amount,
            height: `${(amount / maxSale) * 100}%`,
          };
        });

    } else { // period === 'year'
        salesData = new Map<string, number>();
        labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        labels.forEach(label => salesData.set(label, 0));
        const currentYear = now.getFullYear();

        orders
            .filter(o => new Date(o.orderDate).getFullYear() === currentYear)
            .forEach(o => {
                const monthIndex = new Date(o.orderDate).getMonth();
                const monthLabel = labels[monthIndex];
                salesData.set(monthLabel, (salesData.get(monthLabel) || 0) + o.total);
            });
        
        const values = Array.from(salesData.values());
        const maxSale = Math.max(...values, 1);

        return labels.map(label => {
          const amount = salesData.get(label) || 0;
          return {
            day: label,
            amount,
            height: `${(amount / maxSale) * 100}%`,
          };
        });
    }
  });

  hasSalesData = computed(() => this.salesChartData().some(d => d.amount > 0));

  chartTitle = computed(() => {
      switch (this.chartPeriod()) {
          case '7d': return 'Vendas (Últimos 7 dias)';
          case 'month': return 'Vendas (Este Mês)';
          case 'year': return 'Vendas (Este Ano)';
      }
  });

  setChartPeriod(period: '7d' | 'month' | 'year') {
      this.chartPeriod.set(period);
      this.activeTooltip.set(null);
  }
  
  handleBarClick(event: Event, day: string) {
    event.stopPropagation();
    this.activeTooltip.update(current => (current === day ? null : day));
  }

  closeTooltip() {
    this.activeTooltip.set(null);
  }

  // --- Recent Activity ---
  recentOrders = computed(() => this.dataService.orders().slice(0, 5));
  recentProducts = computed(() => this.dataService.products().slice(0, 5));

  // --- Delivery Timeline ---
  upcomingDeliveries = computed(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return this.dataService.orders()
      .filter(o => o.deliveryDate && o.orderStatus !== 'Entregue')
      .map(o => ({...o, deliveryDate: new Date(o.deliveryDate as Date)}))
      .filter(o => o.deliveryDate >= today && o.deliveryDate <= sevenDaysFromNow)
      .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
  });

  // --- Suggestions ---
  suggestions = computed(() => {
    const suggestions: string[] = [];
    
    // Suggestion 1: Restock for top product
    const productCount = new Map<number, number>();
    this.dataService.orders().forEach(order => {
        order.items.forEach(item => {
            productCount.set(item.productId, (productCount.get(item.productId) || 0) + item.quantity);
        });
    });
    if (productCount.size > 0) {
      const topProductId = Array.from(productCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
      const topProduct = this.dataService.products().find(p => p.id === topProductId);
      if (topProduct) {
        suggestions.push(`Você vendeu muito **${topProduct.name}**! Que tal repor os materiais? 💕`);
      }
    }

    // Suggestion 2: Low stock material
    const lowStockMaterial = this.dataService.materials().find(m => m.stock < 10);
    if(lowStockMaterial) {
        suggestions.push(`O material **${lowStockMaterial.name}** está acabando. Adicione à sua lista de compras!`);
    }

    // Suggestion 3: General encouragement
    suggestions.push("Que tal criar uma promoção especial para seus clientes fiéis? 💖");

    return suggestions.slice(0, 2);
  });

  // --- Quote ---
  quoteOfTheDay = computed(() => {
    const quotes = [
      "Cada laço que você cria é um sorriso a mais no mundo 💖",
      "Sua criatividade é o seu superpoder. Use-o todos os dias!",
      "Feito à mão é sinônimo de feito com o coração.",
      "Acredite no poder das suas mãos para criar beleza.",
      "Um pequeno negócio com um grande coração pode mudar o mundo."
    ];
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return quotes[dayOfYear % quotes.length];
  });
  
  // --- Helpers ---
  getCustomerName(customerId: number): string {
    return this.dataService.customers().find(c => c.id === customerId)?.name || 'N/A';
  }

  getProductName(productId: number): string {
    return this.dataService.products().find(p => p.id === productId)?.name || 'N/A';
  }

  onQuickAction(view: View) {
    this.viewChange.emit(view);
  }

  formatSuggestion(suggestion: string): string {
    return suggestion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
}