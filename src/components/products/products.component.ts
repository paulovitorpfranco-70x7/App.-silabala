import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { PdfService } from '../../services/pdf.service';
import { Product, Material, ProductMaterial } from '../../models';

type ProductForm = Omit<Product, 'id' | 'createdAt' | 'totalCost' | 'profit' | 'materials'> & { materials: Map<number, number> };

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent {
  dataService = inject(DataService);
  pdfService = inject(PdfService);

  showModal = signal(false);
  isEditing = signal(false);
  
  searchTerm = signal('');
  filterStatus = signal<'all' | 'Disponível' | 'Esgotado' | 'Em produção'>('all');

  // Form State
  currentProduct = signal<ProductForm | null>(null);
  
  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.filterStatus();
    return this.dataService.products()
      .filter(p => status === 'all' || p.status === status)
      .filter(p => p.name.toLowerCase().includes(term));
  });

  // Calculation for the form
  formCalculations = computed(() => {
    const product = this.currentProduct();
    if (!product) return { totalCost: 0, profit: 0, margin: 0 };

    const materials: ProductMaterial[] = Array.from(product.materials.entries()).map(([materialId, quantity]) => ({ materialId, quantity }));
    const totalCost = this.dataService.calculateProductCost(product.timeMinutes, materials);
    const profit = product.price - totalCost;
    const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    
    return { totalCost, profit, margin };
  });

  openNewProductModal() {
    this.isEditing.set(false);
    this.currentProduct.set({
      name: '',
      description: '',
      imageUrl: '',
      timeMinutes: 0,
      materials: new Map(),
      price: 0,
      profitMargin: 30,
      stock: 0,
      status: 'Disponível',
    });
    this.showModal.set(true);
  }
  
  openEditProductModal(product: Product) {
    this.isEditing.set(true);
    this.currentProduct.set({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      timeMinutes: product.timeMinutes,
      materials: new Map(product.materials.map(m => [m.materialId, m.quantity])),
      price: product.price,
      profitMargin: product.profitMargin,
      stock: product.stock,
      status: product.status,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.currentProduct.set(null);
  }

  updateCurrentProductField(field: keyof ProductForm, value: any) {
    this.currentProduct.update(p => {
      if (!p) return null;
      
      const isNumeric = ['timeMinutes', 'price', 'stock'].includes(field as string);
      const processedValue = isNumeric ? +value : value;

      return { ...p, [field]: processedValue };
    });
  }

  onMaterialSelect(materialId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.currentProduct.update(p => {
      if (!p) return p;
      const newMaterials = new Map(p.materials);
      if (isChecked) {
        newMaterials.set(materialId, 1);
      } else {
        newMaterials.delete(materialId);
      }
      return { ...p, materials: newMaterials };
    });
  }

  updateMaterialQuantity(materialId: number, event: Event) {
    const quantity = parseFloat((event.target as HTMLInputElement).value);
    if(isNaN(quantity) || quantity < 0) return;
     this.currentProduct.update(p => {
      if (!p) return p;
      const newMaterials = new Map(p.materials);
      newMaterials.set(materialId, quantity);
      return { ...p, materials: newMaterials };
    });
  }

  saveProduct() {
    const form = this.currentProduct();
    if (!form || !form.name) {
      alert('O nome do produto é obrigatório.');
      return;
    }
    
    const calcs = this.formCalculations();
    const productData: Omit<Product, 'id' | 'createdAt'> = {
      ...form,
      totalCost: calcs.totalCost,
      profit: calcs.profit,
      materials: Array.from(form.materials.entries()).map(([materialId, quantity]) => ({ materialId, quantity })),
    };

    if (this.isEditing()) {
        const originalProduct = this.dataService.products().find(p => p.name === form.name); // simplistic find
        if (originalProduct) {
            this.dataService.updateProduct({ ...productData, id: originalProduct.id, createdAt: originalProduct.createdAt });
        }
    } else {
        this.dataService.addProduct(productData);
    }

    this.closeModal();
  }

  deleteProduct(productId: number) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        this.dataService.deleteProduct(productId);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.currentProduct()) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentProduct.update(p => p ? { ...p, imageUrl: e.target?.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  }

  exportCatalog() {
      this.pdfService.generateProductCatalog();
  }

  getStatusClass(status: Product['status']) {
    switch (status) {
      case 'Disponível': return 'bg-green-100 text-green-800';
      case 'Esgotado': return 'bg-red-100 text-red-800';
      case 'Em produção': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
