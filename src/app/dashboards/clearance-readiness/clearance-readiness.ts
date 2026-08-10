import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { exportToExcel } from '../../shared/excel-export.util';
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

  private countLight(s: ShipmentReadiness, light: string): number {
    return s.tracks.flatMap((t) => t.items).filter((i) => i.light === light).length;
  }

  // Flattened one-row-per-shipment summary — the full per-track detail
  // doesn't fit a spreadsheet row, so this exports what's already
  // visible in the table (plus the classification and flag counts).
  onExportClick(): void {
    const rows = this.allShipments.map((s) => ({
      classification: s.classification,
      businessUnit: s.businessUnit,
      category: s.category,
      blAwbNo: s.blAwbNo,
      fcl: `${s.fcl20Count}x20' ${s.fcl40Count}x40'`,
      etd: s.etd,
      eta: s.eta,
      redCount: this.countLight(s, 'Red'),
      amberCount: this.countLight(s, 'Amber'),
      greenCount: this.countLight(s, 'Green')
    }));
    exportToExcel('Shipment Pipeline Health', [
      { key: 'classification', label: 'Classification' },
      { key: 'businessUnit', label: 'BU' },
      { key: 'category', label: 'Cat' },
      { key: 'blAwbNo', label: 'BL/AWB No.' },
      { key: 'fcl', label: 'FCL' },
      { key: 'etd', label: 'ETD' },
      { key: 'eta', label: 'ETA' },
      { key: 'redCount', label: 'Red Flags' },
      { key: 'amberCount', label: 'Amber Flags' },
      { key: 'greenCount', label: 'Green Flags' }
    ], rows);
  }
}
