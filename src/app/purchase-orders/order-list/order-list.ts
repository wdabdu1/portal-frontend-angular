import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PurchaseOrderSummary, PurchaseOrdersService } from '../purchase-orders.service';

@Component({
  selector: 'app-order-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './order-list.html'
})
export class OrderList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  orders: PurchaseOrderSummary[] = [];
  loading = true;
  error = '';
  confirmingId: number | null = null;

  constructor(private ordersService: PurchaseOrdersService, public auth: AuthService, private router: Router) {}

  viewDetails(id: number): void {
    this.router.navigate(['/orders', id]);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load purchase orders.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirm(id: number): void {
    this.confirmingId = id;
    this.ordersService.confirm(id).subscribe({
      next: () => {
        this.confirmingId = null;
        this.load();
      },
      error: () => {
        this.confirmingId = null;
        this.error = 'Could not confirm this order.';
        this.cdr.markForCheck();
      }
    });
  }
}
