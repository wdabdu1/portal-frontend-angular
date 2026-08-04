import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ShipmentSummary, ShipmentsService } from '../shipments.service';

type SortColumn = keyof ShipmentSummary;

@Component({
  selector: 'app-shipment-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './shipment-list.html'
})
export class ShipmentList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentSummary[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'blAwbNo';
  sortAsc = true;

  constructor(private shipmentsService: ShipmentsService, private router: Router) {}

  viewDetails(id: number): void {
    this.router.navigate(['/shipments', id]);
  }

  ngOnInit(): void {
    this.shipmentsService.getAll().subscribe({
      next: (shipments) => {
        this.allShipments = shipments;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load shipments.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get shipments(): ShipmentSummary[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...this.allShipments].sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
  }
}
