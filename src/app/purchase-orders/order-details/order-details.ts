import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDetailsService, PurchaseOrderDetail } from './order-details.service';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, RouterLink],
  templateUrl: './order-details.html'
})
export class OrderDetails implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  order: PurchaseOrderDetail | null = null;
  loading = true;
  error = '';

  constructor(private service: OrderDetailsService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.get(id).subscribe({
      next: (r) => { this.order = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load order details.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }
}
