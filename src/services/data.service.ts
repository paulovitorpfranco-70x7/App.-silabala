import { Injectable, signal, computed, effect } from '@angular/core';
import { Material, FixedCost, Product, Customer, Order, ProductMaterial } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  materials = signal<Material[]>([]);
  fixedCosts = signal<FixedCost[]>([]);
  products = signal<Product[]>([]);
  customers = signal<Customer[]>([]);
  orders = signal<Order[]>([]);

  // Config values
  workHoursPerDay = signal(8);
  workDaysPerMonth = signal(22);
  hourlyRate = computed(() => {
    const totalMonthlyCost = this.fixedCosts().reduce((sum, cost) => sum + cost.monthlyValue, 0);
    const totalMonthlyHours = this.workHoursPerDay() * this.workDaysPerMonth();
    if (totalMonthlyHours === 0) return 0;
    return totalMonthlyCost / totalMonthlyHours;
  });

  constructor() {
    this.loadFromLocalStorage();
    effect(() => {
        this.saveToLocalStorage('materials', this.materials());
        this.saveToLocalStorage('fixedCosts', this.fixedCosts());
        this.saveToLocalStorage('products', this.products());
        this.saveToLocalStorage('customers', this.customers());
        this.saveToLocalStorage('orders', this.orders());
    });
  }

  private loadFromLocalStorage() {
    this.materials.set(this.load('materials') || MOCK_MATERIALS);
    this.fixedCosts.set(this.load('fixedCosts') || MOCK_FIXED_COSTS);
    this.customers.set(this.load('customers') || MOCK_CUSTOMERS);
    
    // Load and migrate products
    const productsData = this.load<any[]>('products') || MOCK_PRODUCTS;
    const migratedProducts = productsData.map(p => {
        if ('finalPrice' in p && !('price' in p)) { // Check for old format
            const totalCost = this.calculateProductCost(p.timeMinutes, p.materials);
            const price = p.finalPrice;
            const profit = price - totalCost;
            return {
                ...p,
                price: price,
                totalCost,
                profit,
                stock: p.stock ?? 0,
                status: p.status ?? (p.stock > 0 ? 'Disponível' : 'Esgotado'),
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                description: p.description ?? '',
                imageUrl: p.imageUrl ?? ''
            };
        }
        // Ensure createdAt is a Date object for new format as well
        if (p.createdAt && typeof p.createdAt === 'string') {
            p.createdAt = new Date(p.createdAt);
        }
        return p;
    });
    this.products.set(migratedProducts);

    const ordersData = this.load<any[]>('orders');
    // Migration for old order structure
    if (ordersData && ordersData.length > 0 && 'status' in ordersData[0]) {
      this.orders.set(generateMockOrders()); // Reset to new mock if old structure detected
    } else {
       const loadedOrders = (ordersData && ordersData.length > 0) ? ordersData : generateMockOrders();
       this.orders.set(loadedOrders.map(o => ({...o, orderDate: new Date(o.orderDate)})));
    }
  }

  private load<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    const data = localStorage.getItem(`silabala_${key}`);
    return data ? JSON.parse(data) : null;
  }

  private saveToLocalStorage<T>(key: string, data: T) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`silabala_${key}`, JSON.stringify(data));
  }

  // Material Methods
  addMaterial(material: Omit<Material, 'id'>) {
    this.materials.update(m => [...m, { ...material, id: Date.now() }]);
  }

  updateMaterial(updatedMaterial: Material) {
    this.materials.update(materials =>
      materials.map(m => (m.id === updatedMaterial.id ? updatedMaterial : m))
    );
  }

  deleteMaterial(materialId: number) {
    this.materials.update(materials => materials.filter(m => m.id !== materialId));
  }
  
  restoreMaterial(material: Material) {
    this.materials.update(materials => [...materials, material]);
  }

  addMaterialsBatch(newMaterials: Omit<Material, 'id'>[]) {
    // Add a small random number to Date.now() to mitigate ID collisions in fast loops
    const materialsWithIds = newMaterials.map(m => ({ ...m, id: Date.now() + Math.random() }));
    this.materials.update(existing => [...existing, ...materialsWithIds]);
  }

  // Cost Methods
  addFixedCost(cost: Omit<FixedCost, 'id'>) {
    this.fixedCosts.update(c => [...c, { ...cost, id: Date.now() }]);
  }

  updateFixedCost(updatedCost: FixedCost) {
    this.fixedCosts.update(costs =>
      costs.map(c => (c.id === updatedCost.id ? updatedCost : c))
    );
  }

  deleteFixedCost(costId: number) {
    this.fixedCosts.update(costs => costs.filter(c => c.id !== costId));
  }
  
  restoreFixedCost(cost: FixedCost) {
    this.fixedCosts.update(costs => [...costs, cost]);
  }

  // Product Methods
  calculateProductCost(timeMinutes: number, materialsUsed: ProductMaterial[]): number {
    const minuteRate = this.hourlyRate() / 60;
    const laborCost = timeMinutes * minuteRate;
    
    const materialsCost = materialsUsed.reduce((sum, usedMat) => {
        const material = this.materials().find(m => m.id === usedMat.materialId);
        return sum + (material ? material.unitCost * usedMat.quantity : 0);
    }, 0);
    
    return laborCost + materialsCost;
  }

  calculateSuggestedPrice(timeMinutes: number, materialsUsed: ProductMaterial[], profitMargin: number): number {
    const totalCost = this.calculateProductCost(timeMinutes, materialsUsed);
    const finalPrice = totalCost * (1 + profitMargin / 100);
    return finalPrice;
  }
  
  addProductFromPricing(data: { name: string; timeMinutes: number; materials: ProductMaterial[]; profitMargin: number; }) {
    const totalCost = this.calculateProductCost(data.timeMinutes, data.materials);
    const price = this.calculateSuggestedPrice(data.timeMinutes, data.materials, data.profitMargin);
    const profit = price - totalCost;

    const newProduct: Product = {
        id: Date.now(),
        name: data.name,
        timeMinutes: data.timeMinutes,
        materials: data.materials,
        profitMargin: data.profitMargin,
        totalCost,
        price,
        profit,
        stock: 0,
        status: 'Disponível',
        createdAt: new Date(),
        description: '',
        imageUrl: `https://picsum.photos/seed/${data.name.replace(/\s/g, '')}/200`
    };
    this.products.update(p => [newProduct, ...p]);
  }

  addProduct(product: Omit<Product, 'id' | 'createdAt'>) {
    this.products.update(p => [{ ...product, id: Date.now(), createdAt: new Date() }, ...p]);
  }

  updateProduct(updatedProduct: Product) {
    this.products.update(products =>
      products.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  }

  deleteProduct(productId: number) {
    this.products.update(products => products.filter(p => p.id !== productId));
  }


  // Customer Methods
  addCustomer(customer: Omit<Customer, 'id'>) {
    this.customers.update(c => [...c, { ...customer, id: Date.now() }]);
  }
  
  // Order Methods
  addOrder(order: Omit<Order, 'id' | 'total'>) {
    const total = order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    this.orders.update(o => [{ ...order, total, id: Date.now() }, ...o]);
    
    // Decrement PRODUCT stock
    order.items.forEach(item => {
      this.products.update(products => 
        products.map(p => {
          if (p.id === item.productId) {
            const newStock = p.stock - item.quantity;
            return {
              ...p,
              stock: newStock,
              status: newStock > 0 ? p.status : 'Esgotado'
            };
          }
          return p;
        })
      );
    });
  }

  updateOrderStatus(orderId: number, status: 'Em produção' | 'Pronto' | 'Entregue') {
    this.orders.update(orders => orders.map(o => o.id === orderId ? {...o, orderStatus: status} : o));
  }
  
  updatePaymentStatus(orderId: number, status: 'Pendente' | 'Pago') {
    this.orders.update(orders => orders.map(o => o.id === orderId ? {...o, paymentStatus: status} : o));
  }
}

// Mock Data for first-time use
const MOCK_MATERIALS: Material[] = [
    { id: 1, name: 'Fita de Gorgurão Rosa', unitCost: 2.5, unit: 'm', stock: 50, imageUrl: 'https://picsum.photos/seed/ribbon/100/100' },
    { id: 2, name: 'Cola Quente Bastão', unitCost: 0.8, unit: 'un', stock: 100, imageUrl: 'https://picsum.photos/seed/glue/100/100' },
    { id: 3, name: 'Tiara Plástica', unitCost: 1.2, unit: 'un', stock: 30, imageUrl: 'https://picsum.photos/seed/tiara/100/100' },
    { id: 4, name: 'Pérola Sintética', unitCost: 0.1, unit: 'un', stock: 200, imageUrl: 'https://picsum.photos/seed/pearl/100/100' },
    { id: 5, name: 'Fita Cetim Azul', unitCost: 2.2, unit: 'm', stock: 40, imageUrl: 'https://picsum.photos/seed/blueribbon/100/100' },
];
const MOCK_FIXED_COSTS: FixedCost[] = [
    { id: 1, name: 'Salário/Pró-labore', monthlyValue: 1000 },
    { id: 2, name: 'Energia Elétrica', monthlyValue: 80 },
    { id: 3, name: 'Internet', monthlyValue: 100 },
];
const MOCK_CUSTOMERS: Customer[] = [
    { id: 1, name: 'Ana Silva', phone: '11987654321', tags: ['fiel'] },
    { id: 2, name: 'Beatriz Costa', phone: '21912345678', tags: ['novo'] }
];
const MOCK_PRODUCTS: Product[] = [
    {
        id: 101,
        name: 'Laço Boutique Rosa',
        description: 'Laço de fita de gorgurão com detalhe de pérola.',
        imageUrl: 'https://picsum.photos/seed/lacorosa/200',
        timeMinutes: 25,
        materials: [
            { materialId: 1, quantity: 0.7 }, // 70cm of pink ribbon
            { materialId: 2, quantity: 1 },   // 1 glue stick
            { materialId: 4, quantity: 3 },   // 3 pearls
        ],
        totalCost: 6.13, 
        price: 25.00,
        profit: 18.87,
        profitMargin: 307,
        stock: 15,
        status: 'Disponível',
        createdAt: new Date(new Date().setDate(new Date().getDate() - 5))
    },
    {
        id: 102,
        name: 'Tiara Azul com Laço',
        description: 'Tiara encapada com laço de cetim azul.',
        imageUrl: 'https://picsum.photos/seed/tiaraazul/200',
        timeMinutes: 35,
        materials: [
            { materialId: 3, quantity: 1 },   // 1 tiara
            { materialId: 5, quantity: 0.5 }, // 50cm of blue ribbon
            { materialId: 2, quantity: 1 },   // 1 glue stick
        ],
        totalCost: 9.87, 
        price: 35.00,
        profit: 25.13,
        profitMargin: 254, 
        stock: 8,
        status: 'Disponível',
        createdAt: new Date(new Date().setDate(new Date().getDate() - 10))
    }
];

// This function ensures mock orders are always available for all chart views
function generateMockOrders(): Order[] {
    const today = new Date();
    const orders: Order[] = [];
    const productIds = [101, 102];
    const customerIds = [1, 2];
    const productPrices = new Map<number, number>([[101, 25.0], [102, 35.0]]);

    // Helper to create an order
    // Fix: Add explicit return type `Order` to prevent type inference issues.
    const createOrder = (id: number, daysAgo: number, pId: number, qty: number, status: 'Pago' | 'Pendente', orderStatus: 'Entregue' | 'Em produção', method: Order['paymentMethod']): Order => {
        const date = new Date(today);
        date.setDate(today.getDate() - daysAgo);
        const unitPrice = productPrices.get(pId) || 0;
        return {
            id: Date.now() + id,
            customerId: customerIds[id % 2],
            items: [{ productId: pId, quantity: qty, unitPrice }],
            total: qty * unitPrice,
            orderStatus,
            paymentStatus: status,
            paymentMethod: method,
            orderDate: date,
        };
    };

    // --- Orders for the last 7 days ---
    orders.push(createOrder(1, 1, 101, 2, 'Pago', 'Entregue', 'Pix'));       // 1 day ago
    orders.push(createOrder(2, 3, 102, 1, 'Pago', 'Entregue', 'Cartão'));   // 3 days ago
    orders.push(createOrder(3, 6, 101, 1, 'Pago', 'Entregue', 'Dinheiro')); // 6 days ago

    // --- One pending order ---
    orders.push(createOrder(4, 2, 102, 1, 'Pendente', 'Em produção', 'Pix')); // 2 days ago

    // --- Orders for earlier this month (if applicable) ---
    if (today.getDate() > 10) {
        // Fix: Add explicit return type `Order` to prevent type inference issues.
        const createMonthlyOrder = (id: number, dayOfMonth: number): Order => {
             const date = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
             const pId = productIds[id % 2];
             const unitPrice = productPrices.get(pId) || 0;
             return {
                id: Date.now() + 10 + id,
                customerId: customerIds[id % 2],
                items: [{ productId: pId, quantity: 1, unitPrice }],
                total: unitPrice,
                orderStatus: 'Entregue',
                paymentStatus: 'Pago',
                paymentMethod: 'Cartão',
                orderDate: date,
             };
        };
        orders.push(createMonthlyOrder(1, 2));
        orders.push(createMonthlyOrder(2, 5));
    }

    // --- Orders for previous months this year (if applicable) ---
    if (today.getMonth() > 0) {
        // Fix: Add explicit return type `Order | null` to prevent type inference issues.
        const createYearlyOrder = (id: number, monthOffset: number): Order | null => {
             if (today.getMonth() - monthOffset < 0) return null;
             const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15);
             const pId = 101;
             const unitPrice = productPrices.get(pId) || 0;
             return {
                id: Date.now() + 30 + id,
                customerId: 1,
                items: [{ productId: pId, quantity: 2, unitPrice }],
                total: 2 * unitPrice,
                orderStatus: 'Entregue',
                paymentStatus: 'Pago',
                paymentMethod: 'Dinheiro',
                orderDate: date,
             };
        };
        const order1 = createYearlyOrder(1, 1);
        if(order1) orders.push(order1);
        const order2 = createYearlyOrder(2, 2);
        if(order2) orders.push(order2);
    }
    
    return orders.sort((a,b) => b.orderDate.getTime() - a.orderDate.getTime());
}