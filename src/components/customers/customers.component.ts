import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersComponent {
  dataService = inject(DataService);
  customers = this.dataService.customers;

  // New customer form
  newCustomerName: string = '';
  newCustomerPhone: string = '';
  newCustomerTags: string = ''; // comma-separated

  addCustomer() {
    if (!this.newCustomerName || !this.newCustomerPhone) {
      alert('Por favor, preencha o nome e o telefone.');
      return;
    }
    this.dataService.addCustomer({
      name: this.newCustomerName,
      phone: this.newCustomerPhone,
      tags: this.newCustomerTags.split(',').map(tag => tag.trim()).filter(tag => tag),
    });

    // Reset form
    this.newCustomerName = '';
    this.newCustomerPhone = '';
    this.newCustomerTags = '';
  }

  getTagClass(tag: string): string {
    switch (tag.toLowerCase()) {
      case 'fiel':
        return 'bg-pink-100 text-pink-800';
      case 'novo':
        return 'bg-green-100 text-green-800';
      case 'em débito':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
