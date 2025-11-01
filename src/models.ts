export interface Material {
  id: number;
  name: string;
  unitCost: number;
  unit: 'm' | 'un' | 'cm' | 'pct' | 'g' | 'ml' | 'm2' | 'cm2'; // metro, unidade, centimetro, pacote, grama, mililitro, metro quadrado, centimetro quadrado
  stock: number;
  imageUrl?: string;
  widthCm?: number;
  heightCm?: number;
}

export interface FixedCost {
  id: number;
  name: string;
  monthlyValue: number;
}

export interface ProductMaterial {
  materialId: number;
  quantity: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  timeMinutes: number; 
  materials: ProductMaterial[];
  totalCost: number; // calculated cost of materials + labor
  price: number; // final selling price
  profit: number; // price - totalCost
  profitMargin: number; // this is the markup % over cost
  stock: number;
  status: 'Disponível' | 'Esgotado' | 'Em produção';
  createdAt: Date;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  tags: string[];
}

export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  customerId: number;
  items: OrderItem[];
  total: number;
  orderStatus: 'Em produção' | 'Pronto' | 'Entregue';
  paymentStatus: 'Pendente' | 'Pago';
  paymentMethod: 'Dinheiro' | 'Pix' | 'Cartão' | 'Outro';
  orderDate: Date;
  deliveryDate?: Date;
  notes?: string;
}
