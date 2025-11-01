import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';
import { Order, Product } from '../models';

declare var jspdf: any;

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private dataService = inject(DataService);

  generateOrderReceipt(order: Order) {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    const customer = this.dataService.customers().find(c => c.id === order.customerId);
    const products = this.dataService.products();

    // Header
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text('SilabaLa+ Recibo', 105, 20, { align: 'center' });

    // Order Info
    doc.setFontSize(12);
    doc.setFont('Nunito', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Pedido #${order.id}`, 20, 40);
    doc.text(`Data: ${new Date(order.orderDate).toLocaleDateString('pt-BR')}`, 20, 46);
    doc.text(`Cliente: ${customer?.name || 'Não informado'}`, 20, 52);

    // Items Table Header
    let y = 70;
    doc.setFont('Poppins', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Produto', 20, y);
    doc.text('Qtd.', 120, y);
    doc.text('Preço Unit.', 150, y);
    doc.text('Subtotal', 180, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    // Items
    doc.setFont('Nunito', 'normal');
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const productName = product?.name || 'Produto não encontrado';
      const subtotal = item.quantity * item.unitPrice;

      doc.text(productName, 20, y);
      doc.text(item.quantity.toString(), 120, y);
      doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 150, y);
      doc.text(`R$ ${subtotal.toFixed(2)}`, 180, y);
      y += 7;
    });

    // Total
    doc.line(20, y + 5, 190, y + 5);
    y += 12;
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(16);
    doc.text(`Total: R$ ${order.total.toFixed(2)}`, 190, y, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Obrigado pela sua compra! ❤️', 105, 280, { align: 'center' });

    doc.save(`recibo_silabala_${order.id}.pdf`);
  }

  generateProductCatalog() {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const products = this.dataService.products().filter(p => p.status === 'Disponível');

    // Header
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text('Catálogo de Produtos SilabaLa+', 105, 20, { align: 'center' });

    let y = 40;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    products.forEach((product, index) => {
      if (y > pageHeight - 60) { // Check for page break
        doc.addPage();
        y = 20;
      }
      
      // Image (placeholder if no image)
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Handle CORS for picsum.photos
        img.src = product.imageUrl || `https://via.placeholder.com/200/F8C6D8/FFFFFF?text=${encodeURIComponent(product.name)}`;
        // This is async, for real app we might need to handle image loading better
        // but for this context, we will assume it works for the placeholder.
        // To draw real images, we would need to handle canvas and async operations.
        // For simplicity, we draw a placeholder rectangle.
        doc.setFillColor(248, 200, 216); // bg-pink-200
        doc.roundedRect(margin, y, 40, 40, 3, 3, 'F');
        doc.setFontSize(20);
        doc.text('🎀', margin + 20, y + 25, {align: 'center'});

      } catch (e) {
        console.error("Could not add image to PDF", e);
        doc.setFillColor(248, 200, 216);
        doc.roundedRect(margin, y, 40, 40, 3, 3, 'F');
      }

      // Product Info
      const textX = margin + 50;
      doc.setFont('Poppins', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(product.name, textX, y + 10);

      doc.setFont('Nunito', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const descriptionLines = doc.splitTextToSize(product.description || 'Sem descrição.', 120);
      doc.text(descriptionLines, textX, y + 18);

      doc.setFont('Poppins', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(219, 39, 119); // pink-600
      doc.text(`R$ ${product.price.toFixed(2)}`, 190, y + 25, { align: 'right' });
      
      y += 55; // Space for next product
      if (index < products.length - 1) {
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.line(margin, y - 7.5, 190, y - 7.5);
      }

    });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Feito com 💖 por SilabaLa+', 105, pageHeight - 10, { align: 'center' });

    doc.save(`catalogo_silabala.pdf`);
  }
}
