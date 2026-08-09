import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ShipmentDetailsService, ShipmentFullDetail } from '../../shipments/shipment-details/shipment-details.service';

// Floats in the page's side margin so it's visible without navigating
// away — content is already fully role-aware server-side (Clearance
// users never receive Supplier/pricing fields at all, regardless of
// which page opened this panel).
@Component({
  selector: 'app-shipment-info-panel',
  imports: [CommonModule],
  templateUrl: './shipment-info-panel.html'
})
export class ShipmentInfoPanel implements OnChanges {
  @Input({ required: true }) shipmentId!: number;

  private cdr = inject(ChangeDetectorRef);
  private service = inject(ShipmentDetailsService);

  detail: ShipmentFullDetail | null = null;
  loading = true;
  collapsed = false;

  ngOnChanges(): void {
    if (!this.shipmentId) return;
    this.loading = true;
    this.service.get(this.shipmentId).subscribe({
      next: (d) => { this.detail = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}
