import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClearanceService, ClearanceShipmentSummary } from '../clearance.service';

@Component({
  selector: 'app-clearance-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './clearance-list.html'
})
export class ClearanceList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  shipments: ClearanceShipmentSummary[] = [];
  loading = true;
  error = '';
  searchText = '';

  constructor(private service: ClearanceService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getShipmentsForClearance(this.searchText || undefined).subscribe({
      next: (r) => { this.shipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load shipments.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onSearchChange(): void {
    this.load();
  }

  select(shipmentId: number): void {
    this.router.navigate(['/clearance', shipmentId]);
  }

  trafficColor(light: string): string {
    switch (light) {
      case 'Green': return '#2a7d2a';
      case 'Amber': return '#c98a00';
      case 'Red': return '#c0392b';
      default: return '#999';
    }
  }
}
