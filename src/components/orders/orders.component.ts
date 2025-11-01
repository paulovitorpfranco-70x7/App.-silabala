import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { PdfService } from '../../services/pdf.service';
import { Order, OrderItem, Product } from '../../models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Main content -->
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-[var(--text-color)]">Pedidos</h1>
        <button (click)="showNewOrderModal.set(true)"
          class="text-white font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 flex items-center bg-[var(--accent-color)] hover:opacity-80">
          <span class="mr-2 text-xl">🛍️</span> Novo Pedido
        </button>
      </div>

       @if (pageMessage()) {
        <div class="bg-[var(--highlight-bg)] border-l-4 border-pink-500 text-[var(--highlight-text)] p-4 rounded-lg" role="alert">
          <p class="font-bold">{{ pageMessage() }}</p>
        </div>
      }

      <!-- Orders table -->
      <div class="bg-[var(--card-color)] border border-[var(--input-border-color)] rounded-lg shadow-sm overflow-x-auto">
        <table class="min-w-full leading-normal">
          <thead>
            <tr class="border-b-2 border-[var(--input-border-color)] bg-[var(--card-bg-hover)] text-left text-xs font-semibold text-[var(--secondary-color)] uppercase tracking-wider">
              <th class="px-5 py-3">ID</th>
              <th class="px-5 py-3">Cliente</th>
              <th class="px-5 py-3">Data</th>
              <th class="px-5 py-3">TOTAL</th>
              <th class="px-5 py-3">STATUS PEDIDO</th>
              <th class="px-5 py-3">STATUS PAG.</th>
              <th class="px-5 py-3 text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
            <tr class="border-b border-[var(--input-border-color)] hover:bg-[var(--card-bg-hover)]">
              <td class="px-5 py-4 text-sm">
                <p class="text-[var(--text-color)] whitespace-no-wrap">#{{ order.id }}</p>
              </td>
              <td class="px-5 py-4 text-sm">
                <p class="text-[var(--text-color)] whitespace-no-wrap">{{ customerNameMapping().get(order.customerId) || 'N/A' }}</p>
              </td>
              <td class="px-5 py-4 text-sm">
                <p class="text-[var(--text-color)] whitespace-no-wrap">{{ order.orderDate | date:'dd/MM/yyyy' }}</p>
              </td>
              <td class="px-5 py-4 text-sm">
                <p class="text-[var(--text-color)] whitespace-no-wrap font-semibold">{{ order.total | currency:'BRL' }}</p>
              </td>
              <td class="px-5 py-4 text-sm">
                 <div class="relative inline-block">
                    <select [value]="order.orderStatus" (change)="updateOrderStatus(order, $event)" 
                            class="appearance-none w-32 font-semibold rounded-full py-1 pl-3 pr-8 text-xs leading-tight focus:outline-none focus:ring-2 focus:ring-pink-400" 
                            [style.background-color]="getOrderStatusBgColor(order.orderStatus)"
                            [style.color]="getOrderStatusTextColor(order.orderStatus)">
                        <option value="Em produção">Em produção</option>
                        <option value="Pronto">Pronto</option>
                        <option value="Entregue">Entregue</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" [style.color]="getOrderStatusTextColor(order.orderStatus)">
                        <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
              </td>
               <td class="px-5 py-4 text-sm">
                 <div class="relative inline-block">
                    <select [value]="order.paymentStatus" (change)="updatePaymentStatus(order, $event)" 
                            class="appearance-none w-32 font-semibold rounded-full py-1 pl-3 pr-8 text-xs leading-tight focus:outline-none focus:ring-2 focus:ring-pink-400"
                            [style.background-color]="getPaymentStatusBgColor(order.paymentStatus)"
                            [style.color]="getPaymentStatusTextColor(order.paymentStatus)">
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" [style.color]="getPaymentStatusTextColor(order.paymentStatus)">
                        <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
              </td>
              <td class="px-5 py-4 text-sm text-center">
                <button (click)="generateReceipt(order)" class="font-semibold text-pink-600 hover:text-pink-800 transition-colors inline-flex flex-col items-center leading-tight">
                  <span>Gerar</span>
                  <span>Recibo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </td>
            </tr>
            } @empty {
            <tr>
              <td colspan="7" class="text-center py-10 text-[var(--secondary-color)]">
                <div class="text-4xl">🎀</div>
                <p class="mt-2">Nenhum pedido encontrado.</p>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Order Modal -->
    @if (showNewOrderModal()) {
    <div class="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div class="bg-[var(--bg-color)] rounded-lg shadow-xl p-6 w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col modal-content">
        <h2 class="text-2xl font-bold mb-6 text-[var(--text-color)]">Criar Novo Pedido</h2>
        
        <div class="overflow-y-auto pr-4 flex-grow">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Left Column -->
              <div class="space-y-4">
                <div>
                  <label for="customer" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Cliente *</label>
                  <select id="customer" [ngModel]="selectedCustomerId()" (ngModelChange)="selectedCustomerId.set($any($event))"
                    class="w-full">
                    <option [ngValue]="null" disabled>Selecione um cliente</option>
                    @for (customer of customers(); track customer.id) {
                    <option [ngValue]="customer.id">{{ customer.name }}</option>
                    }
                  </select>
                </div>
                
                 <div>
                    <h3 class="text-lg font-medium text-[var(--secondary-color)] mb-2">Produtos *</h3>
                    <div class="max-h-48 overflow-y-auto border border-[var(--input-border-color)] rounded-md p-2 bg-[var(--card-bg-hover)]">
                        @for (product of products(); track product.id) {
                        <div class="flex items-center justify-between p-2 hover:bg-[var(--highlight-bg)] rounded-md">
                            <label class="flex items-center cursor-pointer">
                                <div class="relative flex items-center justify-center w-4 h-4 shrink-0">
                                    <input type="checkbox" [checked]="isProductSelected(product.id)" (change)="toggleProductSelection(product)" 
                                           [disabled]="product.stock <= 0"
                                           class="peer appearance-none h-4 w-4 rounded border-2 border-pink-300 focus:ring-pink-500 focus:ring-offset-0 checked:bg-pink-500 checked:border-0 disabled:bg-gray-200 disabled:border-gray-300 disabled:cursor-not-allowed bg-[var(--input-bg)]">
                                    <svg class="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <span class="ml-3 text-sm text-[var(--text-color)]">{{ product.name }} - {{ product.price | currency:'BRL' }}
                                  @if(product.stock <= 0) {
                                    <span class="text-red-500 text-xs">(Esgotado)</span>
                                  } @else {
                                    <span class="text-[var(--secondary-color)] text-xs">({{product.stock}} em estoque)</span>
                                  }
                                </span>
                            </label>
                            @if (isProductSelected(product.id)) {
                                <input type="number" min="1" [max]="product.stock" [value]="selectedProducts().get(product.id)?.quantity || 1" 
                                      (input)="updateProductQuantity(product.id, $event)"
                                      class="w-20 text-center text-sm p-1 rounded-md bg-[var(--card-bg-hover)] border border-pink-200 text-[var(--text-color)] focus:ring-1 focus:ring-pink-400">
                            }
                        </div>
                        } @empty {
                            <p class="text-center text-[var(--secondary-color)] p-4">Nenhum produto cadastrado.</p>
                        }
                    </div>
                </div>

                @if(newOrderTotal() > 0) {
                    <div class="bg-[var(--highlight-bg)] p-4 rounded-lg text-center">
                        <h4 class="text-lg font-bold text-pink-800 dark:text-pink-200">Total do Pedido</h4>
                        <p class="text-3xl font-bold text-pink-600 dark:text-pink-300">{{ newOrderTotal() | currency:'BRL' }}</p>
                    </div>
                }

              </div>

              <!-- Right Column -->
              <div class="space-y-4">
                  <div>
                    <label for="deliveryDate" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Data de Entrega</label>
                    <input type="date" id="deliveryDate" [ngModel]="deliveryDate()" (ngModelChange)="deliveryDate.set($event)" class="w-full">
                  </div>
                   <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label for="paymentMethod" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Forma Pag.</label>
                          <select id="paymentMethod" [ngModel]="paymentMethod()" (ngModelChange)="paymentMethod.set($any($event))" class="w-full">
                            <option>Pix</option>
                            <option>Dinheiro</option>
                            <option>Cartão</option>
                            <option>Outro</option>
                          </select>
                        </div>
                        <div>
                           <label for="paymentStatus" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Status Pag.</label>
                            <select id="paymentStatus" [ngModel]="paymentStatus()" (ngModelChange)="paymentStatus.set($any($event))" class="w-full">
                                <option>Pendente</option>
                                <option>Pago</option>
                            </select>
                        </div>
                   </div>
                   <div>
                       <label for="orderStatus" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Status do Pedido</label>
                        <select id="orderStatus" [ngModel]="orderStatus()" (ngModelChange)="orderStatus.set($any($event))" class="w-full">
                            <option>Em produção</option>
                            <option>Pronto</option>
                            <option>Entregue</option>
                        </select>
                   </div>
                   <div>
                       <label for="notes" class="block text-sm font-medium text-[var(--secondary-color)] mb-1">Observações</label>
                       <textarea id="notes" [ngModel]="notes()" (ngModelChange)="notes.set($event)" rows="3" placeholder="Detalhes do pedido, cores, etc." class="w-full"></textarea>
                   </div>
              </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-4 pt-6 border-t border-[var(--input-border-color)] mt-6">
          <button (click)="resetNewOrderForm()"
            class="font-bold py-2 px-6 rounded-xl transition duration-300 bg-[var(--card-color)] text-[var(--secondary-color)] border border-[var(--input-border-color)] hover:bg-[var(--card-bg-hover)]">
            Cancelar
          </button>
          <button (click)="createOrder()"
            class="text-white font-bold py-2 px-6 rounded-xl shadow-md transition duration-300 bg-[var(--accent-color)] hover:opacity-80">
            Salvar Pedido
          </button>
        </div>
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent {
  dataService = inject(DataService);
  pdfService = inject(PdfService);

  orders = this.dataService.orders;
  customers = this.dataService.customers;
  products = this.dataService.products;
  pageMessage = signal<string | null>(null);

  // New order form state
  showNewOrderModal = signal(false);
  selectedCustomerId = signal<number | null>(null);
  selectedProducts = signal<Map<number, { product: Product; quantity: number }>>(new Map<number, { product: Product; quantity: number }>());
  deliveryDate = signal('');
  paymentMethod = signal<'Dinheiro' | 'Pix' | 'Cartão' | 'Outro'>('Pix');
  paymentStatus = signal<'Pendente' | 'Pago'>('Pendente');
  orderStatus = signal<'Em produção' | 'Pronto' | 'Entregue'>('Em produção');
  notes = signal('');

  customerNameMapping = computed(() => {
    const mapping = new Map<number, string>();
    this.customers().forEach(c => mapping.set(c.id, c.name));
    return mapping;
  });

  newOrderTotal = computed(() => {
    let total = 0;
    for (const item of this.selectedProducts().values()) {
      total += item.product.price * item.quantity;
    }
    return total;
  });
  
  toggleProductSelection(product: Product) {
    if (product.stock <= 0) return;
    this.selectedProducts.update(currentMap => {
        const newMap = new Map<number, { product: Product; quantity: number }>(currentMap);
        if (newMap.has(product.id)) {
            newMap.delete(product.id);
        } else {
            newMap.set(product.id, { product, quantity: 1 });
        }
        return newMap;
    });
  }

  updateProductQuantity(productId: number, event: Event) {
    let quantity = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1;
    }

    this.selectedProducts.update(currentMap => {
        const newMap = new Map<number, { product: Product; quantity: number }>(currentMap);
        const item = newMap.get(productId);
        if (item) {
            if (quantity > item.product.stock) {
                quantity = item.product.stock;
            }
            (event.target as HTMLInputElement).value = quantity.toString();
            newMap.set(productId, { ...item, quantity });
        }
        return newMap;
    });
  }

  isProductSelected(productId: number): boolean {
    return this.selectedProducts().has(productId);
  }
  
  createOrder() {
    const customerId = this.selectedCustomerId();
    if (!customerId) {
        alert('Por favor, selecione um cliente.');
        return;
    }

    const items: OrderItem[] = Array.from(this.selectedProducts().values()).map((item: { product: Product, quantity: number }) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price
    }));

    if (items.length === 0) {
        alert('Por favor, adicione pelo menos um produto ao pedido.');
        return;
    }

    this.dataService.addOrder({
        customerId,
        items,
        orderStatus: this.orderStatus(),
        paymentStatus: this.paymentStatus(),
        paymentMethod: this.paymentMethod(),
        orderDate: new Date(),
        deliveryDate: this.deliveryDate() ? new Date(this.deliveryDate()) : undefined,
        notes: this.notes()
    });

    this.resetNewOrderForm();
    this.pageMessage.set('Pedido cadastrado com sucesso 💖');
    setTimeout(() => this.pageMessage.set(null), 4000);
  }

  resetNewOrderForm() {
    this.showNewOrderModal.set(false);
    this.selectedCustomerId.set(null);
    this.selectedProducts.set(new Map<number, { product: Product; quantity: number }>());
    this.deliveryDate.set('');
    this.paymentMethod.set('Pix');
    this.paymentStatus.set('Pendente');
    this.orderStatus.set('Em produção');
    this.notes.set('');
  }

  updateOrderStatus(order: Order, event: Event) {
    const status = (event.target as HTMLSelectElement).value as 'Em produção' | 'Pronto' | 'Entregue';
    this.dataService.updateOrderStatus(order.id, status);
  }
  
  updatePaymentStatus(order: Order, event: Event) {
    const status = (event.target as HTMLSelectElement).value as 'Pendente' | 'Pago';
    this.dataService.updatePaymentStatus(order.id, status);
  }

  generateReceipt(order: Order) {
    this.pdfService.generateOrderReceipt(order);
  }
  
  getOrderStatusBgColor(status: string): string {
    const isDark = document.body.classList.contains('dark-theme');
    switch (status) {
      case 'Em produção': return isDark ? '#5f481c' : '#fefce8';
      case 'Pronto': return isDark ? '#294069' : '#eff6ff';
      case 'Entregue': return isDark ? '#224b30' : '#f0fdf4';
      default: return isDark ? '#4c305f' : '#f9fafb';
    }
  }

  getPaymentStatusBgColor(status: string): string {
    const isDark = document.body.classList.contains('dark-theme');
    switch (status) {
      case 'Pendente': return isDark ? '#632222' : '#fef2f2';
      case 'Pago': return isDark ? '#224b30' : '#f0fdf4';
      default: return isDark ? '#4c305f' : '#f9fafb';
    }
  }

  getOrderStatusTextColor(status: string): string {
    const isDark = document.body.classList.contains('dark-theme');
    switch (status) {
      case 'Em produção': return isDark ? '#fde68a' : '#b45309';
      case 'Pronto': return isDark ? '#bfdbfe' : '#1e40af';
      case 'Entregue': return isDark ? '#a7f3d0' : '#166534';
      default: return isDark ? '#fbe8f2' : '#3d3d3d';
    }
  }

  getPaymentStatusTextColor(status: string): string {
    const isDark = document.body.classList.contains('dark-theme');
    switch (status) {
      case 'Pendente': return isDark ? '#fecaca' : '#991b1b';
      case 'Pago': return isDark ? '#a7f3d0' : '#166534';
      default: return isDark ? '#fbe8f2' : '#3d3d3d';
    }
  }
}