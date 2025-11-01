import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Material } from '../../models';

// This is needed to use the xlsx library from the CDN
declare var XLSX: any;

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  dataService = inject(DataService);
  materials = this.dataService.materials;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // State for modals and messages
  editingMaterial = signal<Material | null>(null);
  materialToDelete = signal<Material | null>(null);
  lastDeletedMaterial = signal<{ material: Material; timer: any } | null>(null);
  pageMessage = signal<{ type: 'success' | 'error' | 'info'; text: string; details?: string[] } | null>(null);

  // Temp state for edit form
  editedMaterialName: string = '';
  editedMaterialStock: number = 0;
  editedMaterialUnit: 'm' | 'un' | 'cm' | 'pct' | 'g' | 'ml' | 'm2' | 'cm2' = 'un';
  
  // --- Edit/Delete Material Methods ---

  openEditModal(material: Material) {
    this.editingMaterial.set(material);
    this.editedMaterialName = material.name;
    this.editedMaterialStock = material.stock;
    this.editedMaterialUnit = material.unit;
  }

  closeEditModal() {
    this.editingMaterial.set(null);
  }

  saveEditedMaterial() {
    const material = this.editingMaterial();
    if (!material || !this.editedMaterialName.trim() || this.editedMaterialStock < 0) {
      alert('Por favor, preencha os dados corretamente.');
      return;
    }

    this.dataService.updateMaterial({
      ...material,
      name: this.editedMaterialName,
      stock: this.editedMaterialStock,
      unit: this.editedMaterialUnit,
    });

    this.pageMessage.set({ type: 'success', text: 'Material atualizado 💖' });
    setTimeout(() => this.pageMessage.set(null), 4000);
    this.closeEditModal();
  }
  
  openDeleteConfirm(material: Material) {
    this.materialToDelete.set(material);
  }

  closeDeleteConfirm() {
    this.materialToDelete.set(null);
  }

  confirmDelete() {
    const material = this.materialToDelete();
    if (!material) return;

    this.dataService.deleteMaterial(material.id);
    
    if (this.lastDeletedMaterial()?.timer) {
        clearTimeout(this.lastDeletedMaterial()!.timer);
    }
    
    const timer = setTimeout(() => {
        this.lastDeletedMaterial.set(null);
    }, 5000); // 5 seconds as requested

    this.lastDeletedMaterial.set({ material: material, timer: timer });
    this.closeDeleteConfirm();
  }
  
  undoDelete() {
      const deleted = this.lastDeletedMaterial();
      if (!deleted) return;

      this.dataService.restoreMaterial(deleted.material);
      clearTimeout(deleted.timer);
      this.lastDeletedMaterial.set(null);
  }

  // --- Excel Import Methods ---

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.pageMessage.set({ type: 'info', text: 'Processando planilha...' });

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        this.processImportedData(json);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        this.pageMessage.set({ type: 'error', text: 'Erro ao processar o arquivo.', details: ['O arquivo pode estar corrompido ou em um formato inválido.'] });
      }
    };
    reader.onerror = (err) => {
        console.error("FileReader error:", err);
        this.pageMessage.set({ type: 'error', text: 'Erro ao ler o arquivo.' });
    };
    reader.readAsArrayBuffer(file);

    // Reset file input
    target.value = '';
  }

  private processImportedData(data: any[][]) {
    if (data.length < 2) {
      this.pageMessage.set({ type: 'info', text: 'A planilha está vazia ou contém apenas o cabeçalho.' });
      return;
    }

    const headers = (data[0] as string[]).map(h => h.toString().toLowerCase().trim());
    const requiredHeaders = ['name', 'unit_cost', 'unit', 'stock_qty'];
    
    const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
    if (missingHeaders.length > 0) {
      this.pageMessage.set({ type: 'error', text: 'Planilha inválida!', details: [`Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`] });
      return;
    }
    
    const nameIndex = headers.indexOf('name');
    const unitCostIndex = headers.indexOf('unit_cost');
    const unitIndex = headers.indexOf('unit');
    const stockQtyIndex = headers.indexOf('stock_qty');
    const imagePathIndex = headers.indexOf('image_path'); // Optional

    const newMaterials: Omit<Material, 'id'>[] = [];
    const errors: string[] = [];
    const validUnits: Array<Material['unit']> = ['m', 'un', 'cm', 'pct', 'g', 'ml', 'm2', 'cm2'];

    // Start from row 1 to skip header
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Skip empty rows
      if (row.every(cell => cell === null || cell === undefined || cell.toString().trim() === '')) {
          continue;
      }
      try {
        const name = row[nameIndex]?.toString().trim();
        const unitCost = parseFloat(row[unitCostIndex]);
        const unit = row[unitIndex]?.toString().toLowerCase().trim();
        const stock = parseInt(row[stockQtyIndex], 10);
        const imageUrl = imagePathIndex > -1 ? row[imagePathIndex]?.toString().trim() : undefined;

        if (!name) {
          errors.push(`Linha ${i + 1}: Nome do material está vazio.`);
          continue;
        }
        if (isNaN(unitCost) || unitCost < 0) {
          errors.push(`Linha ${i + 1}: Custo unitário inválido para "${name}".`);
          continue;
        }
        if (isNaN(stock) || stock < 0) {
          errors.push(`Linha ${i + 1}: Quantidade em estoque inválida para "${name}".`);
          continue;
        }
        if (!unit || !validUnits.includes(unit as any)) {
          errors.push(`Linha ${i + 1}: Unidade inválida para "${name}". Use: ${validUnits.join(', ')}.`);
          continue;
        }

        newMaterials.push({
          name,
          unitCost,
          unit: unit as Material['unit'],
          stock,
          imageUrl: imageUrl || undefined,
        });

      } catch (err) {
        errors.push(`Linha ${i + 1}: Erro inesperado ao processar. Verifique os dados.`);
      }
    }
    
    if (newMaterials.length > 0) {
      this.dataService.addMaterialsBatch(newMaterials);
    }
    
    if (errors.length > 0) {
        this.pageMessage.set({ type: 'error', text: `${newMaterials.length} materiais importados, mas encontramos erros:`, details: errors.slice(0, 5) });
    } else if (newMaterials.length > 0) {
        this.pageMessage.set({ type: 'success', text: `${newMaterials.length} materiais importados com sucesso 💕` });
    } else {
        this.pageMessage.set({ type: 'info', text: 'Nenhum material novo para importar foi encontrado na planilha.' });
    }

    setTimeout(() => this.pageMessage.set(null), 8000);
  }
}