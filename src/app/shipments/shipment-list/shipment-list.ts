import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ShipmentSummary, ShipmentsService } from '../shipments.service';

@Component({
  selector: 'app-shipment-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './shipment-list.html'
})
export class ShipmentList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  shipments: ShipmentSummary[] = [];
  loading = true;
  error = '';

  constructor(private shipmentsService: ShipmentsService, private router: Router) {}

  viewDetails(id: number): void {
    this.router.navigate(['/shipments', id]);
  }

  ngOnInit(): void {
    this.shipmentsService.getAll().subscribe({
      next: (shipments) => {
        this.shipments = shipments;
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
}
