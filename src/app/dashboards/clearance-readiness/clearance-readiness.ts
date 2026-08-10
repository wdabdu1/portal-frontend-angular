import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardsService, ShipmentReadiness } from '../dashboards.service';

@Component({
  selector: 'app-clearance-readiness',
  imports: [CommonModule, RouterLink],
  templateUrl: './clearance-readiness.html'
})
export class ClearanceReadiness implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentReadiness[] = [];
  loading = true;
  error = '';
  expandedShipmentId: number | null = null;

  constructor(private service: DashboardsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getPreClearanceReadiness().subscribe({
      next: (r) => { this.allShipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load readiness data.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // Worst-first: most Red flags at the top, ties broken by most Amber.
  get shipments(): ShipmentReadiness[] {
    return [...this.allShipments].sort((a, b) => this.redCount(b) - this.redCount(a) || this.amberCount(b) - this.amberCount(a));
  }

  private allItems(s: ShipmentReadiness) {
    return s.tracks.flatMap((t) => t.items);
  }

  redCount(s: ShipmentReadiness): number {
    return this.allItems(s).filter((i) => i.light === 'Red').length;
  }

  amberCount(s: ShipmentReadiness): number {
    return this.allItems(s).filter((i) => i.light === 'Amber').length;
  }

  greenCount(s: ShipmentReadiness): number {
    return this.allItems(s).filter((i) => i.light === 'Green').length;
  }

  toggle(shipmentId: number): void {
    this.expandedShipmentId = this.expandedShipmentId === shipmentId ? null : shipmentId;
  }

  lightColor(light: string): string {
    if (light === 'Red') return '#c0392b';
    if (light === 'Amber') return '#a66a00';
    return '#1e7e34';
  }

  lightBg(light: string): string {
    if (light === 'Red') return '#fdeaea';
    if (light === 'Amber') return '#fff4e5';
    return '#e6f4ea';
  }
}
