import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { ShipmentDetailsService, ShipmentFullDetail } from './shipment-details.service';

@Component({
  selector: 'app-shipment-details',
  imports: [CommonModule, RouterLink],
  templateUrl: './shipment-details.html'
})
export class ShipmentDetails implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  shipmentId!: number;
  detail: ShipmentFullDetail | null = null;
  loading = true;
  error = '';

  constructor(private service: ShipmentDetailsService, public auth: AuthService, private location: Location) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.service.get(this.shipmentId).subscribe({
      next: (r) => { this.detail = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load shipment details.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  hasSection(section: Record<string, unknown> | null): boolean {
    return section !== null && Object.values(section).some((v) => v !== null && v !== undefined && v !== '' && v !== false);
  }

  entries(section: Record<string, unknown> | null): [string, unknown][] {
    if (!section) return [];
    return Object.entries(section).filter(([k]) => !['id', 'shipmentId', 'shipment'].includes(k));
  }

  formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // Numeric fields (costs, quantities, fees) get thousands separators —
    // dates and text arrive as strings, so this only affects real numbers.
    if (typeof value === 'number') return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return String(value);
  }
}
