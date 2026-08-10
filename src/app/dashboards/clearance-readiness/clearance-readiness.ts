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
  // Red needs eyes immediately; Yellow/Green start collapsed so a quick
  // glance at the counts is enough when nothing needs attention.
  expandedSection: 'Red' | 'Yellow' | 'Green' | null = 'Red';

  toggleSection(section: 'Red' | 'Yellow' | 'Green'): void {
    this.expandedSection = this.expandedSection === section ? null : section;
  }

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

  get redShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Red').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }

  get yellowShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Yellow').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }

  get greenShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Green').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
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
