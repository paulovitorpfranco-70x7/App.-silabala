import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Material, ProductMaterial, FixedCost } from '../../models';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './pricing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent {
  dataService = inject(DataService);

  // --- Component State ---
  activeTab = signal<'products' | 'materials' | 'costs'>('products');
  pageMessage = signal<string | null>(null);

  // --- Product Calculation Tab State ---
  productName = signal('');
  timeMinutes = signal<number | null>(null); // FIX: init with null
  profitMargin = signal<number | null>(30); // Default to 30%
  selectedMaterials = signal(new Map<number, number>());
  materialSearchTerm = signal('');
  suggestedPrice = signal<number | null>(null);
  viewingMaterial = signal<Material | null>(null);
  
  // --- Materials Tab State ---
  newMaterialName = signal('');
  newMaterialCost = signal<number | null>(null); // FIX: init with null
  newMaterialUnit = signal<Material['unit'] | 'm2'>('un');
  newMaterialStock = signal<number | null>(null); // FIX: init with null
  newMaterialImage = signal<string | null>(null);
  newMaterialWidth = signal<number | null>(null);
  newMaterialHeight = signal<number | null>(null);
  newMaterialUsedArea = signal<number | null>(null);

  // --- Costs Tab State ---
  newCostName = signal('');
  newCostMonthlyValue = signal<number | null>(null); // FIX: init with null
  editingCost = signal<FixedCost | null>(null);
  editedCostName = signal('');
  editedCostValue = signal<number | null>(null); // FIX: init with null
  costToDelete = signal<FixedCost | null>(null);
  lastDeletedCost = signal<{ cost: FixedCost; timer: any } | null>(null);

  // --- Computed Values ---
  hourlyRate = this.dataService.hourlyRate;
  
  filteredMaterials = computed(() => {
    const term = this.materialSearchTerm().toLowerCase();
    if (!term) {
      return this.dataService.materials();
    }
    return this.dataService.materials().filter(m => m.name.toLowerCase().includes(term));
  });

  costPlaceholder = computed(() => {
    const unit = this.newMaterialUnit();
    if (unit === 'm2') return 'Custo total da peça (R$)';
    return 'Custo unitário (R$)';
  });

  totalAreaDisplay = computed(() => {
      const width = this.newMaterialWidth() ?? 0;
      const height = this.newMaterialHeight() ?? 0;
      return width * height;
  });

  estimatedPieceCost = computed(() => {
      const totalCost = this.newMaterialCost() ?? 0;
      const totalArea = (this.newMaterialWidth() ?? 0) * (this.newMaterialHeight() ?? 0);
      const usedArea = this.newMaterialUsedArea() ?? 0;

      if (totalCost > 0 && totalArea > 0 && usedArea > 0) {
          const costPerCm2 = totalCost / totalArea;
          return costPerCm2 * usedArea;
      }
      return 0;
  });

  // --- Methods ---
  setTab(tab: 'products' | 'materials' | 'costs') {
    this.activeTab.set(tab);
  }
  
  // --- Product Tab Methods ---
  isMaterialSelected(materialId: number): boolean {
    return this.selectedMaterials().has(materialId);
  }

  toggleMaterialSelection(material: Material) {
    this.selectedMaterials.update(current => {
      const newMap = new Map(current);
      if (newMap.has(material.id)) {
        newMap.delete(material.id);
      } else {
        newMap.set(material.id, 1);
      }
      return newMap;
    });
  }
  
  updateMaterialQuantity(materialId: number, event: Event) {
    const quantity = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(quantity) && quantity >= 0) {
      this.selectedMaterials.update(current => {
        const newMap = new Map(current);
        newMap.set(materialId, quantity);
        return newMap;
      });
    }
  }
  
  calculatePrice() {
    const materialsUsed: ProductMaterial[] = Array.from(this.selectedMaterials().entries())
      .map(([materialId, quantity]) => ({ materialId, quantity }));
      
    if (!this.productName()) {
      alert('Por favor, dê um nome ao produto.');
      return;
    }
    if (materialsUsed.length === 0) {
      alert('Por favor, selecione pelo menos um material.');
      return;
    }
    
    const price = this.dataService.calculateSuggestedPrice(
      this.timeMinutes() || 0,
      materialsUsed,
      this.profitMargin() || 0
    );
    this.suggestedPrice.set(price);
  }

  saveProduct() {
    if (this.suggestedPrice() === null) {
      alert('Por favor, calcule o preço primeiro.');
      return;
    }
    const materials: ProductMaterial[] = Array.from(this.selectedMaterials().entries())
      .map(([materialId, quantity]) => ({ materialId, quantity }));

    this.dataService.addProductFromPricing({
      name: this.productName(),
      timeMinutes: this.timeMinutes() || 0,
      materials,
      profitMargin: this.profitMargin() || 0,
    });
    
    this.pageMessage.set(`Produto "${this.productName()}" salvo com sucesso!`);
    setTimeout(() => this.pageMessage.set(null), 4000);

    // Reset form
    this.productName.set('');
    this.timeMinutes.set(null);
    this.profitMargin.set(30);
    this.selectedMaterials.set(new Map());
    this.suggestedPrice.set(null);
  }

  openMaterialModal(material: Material) {
    this.viewingMaterial.set(material);
  }

  closeMaterialModal() {
    this.viewingMaterial.set(null);
  }

  // --- Material Tab Methods ---
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.newMaterialImage.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }
  
  addMaterial() {
    const name = this.newMaterialName().trim();
    let cost = this.newMaterialCost();
    let unit = this.newMaterialUnit();
    const stock = this.newMaterialStock();
    const widthCm = this.newMaterialWidth();
    const heightCm = this.newMaterialHeight();
    
    if (!name || cost === null || stock === null) {
      alert('Preencha nome, custo e estoque.');
      return;
    }

    if (unit === 'm2' && (widthCm === null || heightCm === null || widthCm <= 0 || heightCm <= 0)) {
       alert('Para a unidade de área, por favor preencha as dimensões da peça comprada.');
       return;
    }

    // If unit is area, calculate cost per cm² and change unit
    if (unit === 'm2') {
        const totalArea = widthCm! * heightCm!;
        cost = cost / totalArea; // Cost per cm²
        unit = 'cm2';
    }

    this.dataService.addMaterial({
      name,
      unitCost: cost,
      unit,
      stock,
      imageUrl: this.newMaterialImage() ?? undefined,
      widthCm: unit === 'cm2' ? widthCm! : undefined,
      heightCm: unit === 'cm2' ? heightCm! : undefined,
    });

    // Reset form
    this.newMaterialName.set('');
    this.newMaterialCost.set(null);
    this.newMaterialUnit.set('un');
    this.newMaterialStock.set(null);
    this.newMaterialImage.set(null);
    this.newMaterialWidth.set(null);
    this.newMaterialHeight.set(null);
    this.newMaterialUsedArea.set(null);
  }

  // --- Costs Tab Methods ---
  addFixedCost() {
    const name = this.newCostName().trim();
    const value = this.newCostMonthlyValue();
    if (!name || value === null || value <= 0) {
      alert('Preencha o nome e um valor mensal válido.');
      return;
    }
    this.dataService.addFixedCost({ name, monthlyValue: value });
    this.newCostName.set('');
    this.newCostMonthlyValue.set(null);
  }

  openEditModal(cost: FixedCost) {
    this.editingCost.set(cost);
    this.editedCostName.set(cost.name);
    this.editedCostValue.set(cost.monthlyValue);
  }

  closeEditModal() {
    this.editingCost.set(null);
  }

  saveEditedCost() {
    const cost = this.editingCost();
    const name = this.editedCostName().trim();
    const value = this.editedCostValue();
    if (!cost || !name || value === null || value <= 0) {
      alert('Preencha os dados corretamente.');
      return;
    }
    this.dataService.updateFixedCost({ ...cost, name, monthlyValue: value });
    this.closeEditModal();
  }

  openDeleteConfirm(cost: FixedCost) {
    this.costToDelete.set(cost);
  }

  closeDeleteConfirm() {
    this.costToDelete.set(null);
  }

  confirmDelete() {
    const cost = this.costToDelete();
    if (!cost) return;
    this.dataService.deleteFixedCost(cost.id);
    
    // Undo logic
    if (this.lastDeletedCost()?.timer) {
      clearTimeout(this.lastDeletedCost()!.timer);
    }
    const timer = setTimeout(() => this.lastDeletedCost.set(null), 5000);
    this.lastDeletedCost.set({ cost, timer });
    
    this.closeDeleteConfirm();
  }
  
  undoDelete() {
    const deleted = this.lastDeletedCost();
    if (!deleted) return;
    this.dataService.restoreFixedCost(deleted.cost);
    clearTimeout(deleted.timer);
    this.lastDeletedCost.set(null);
  }
}
