import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { LineItemRemaining, ShipmentsService } from '../shipments.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';

interface LineItemSelection extends LineItemRemaining {
  selected: boolean;
  qtyToShip: number | null;
}

@Component({
  selector: 'app-new-shipment',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
  templateUrl: './new-shipment.html'
})
export class NewShipment implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  loadingLineItems = false;
  saving = false;
  error = '';
  success = '';

  confirmedOrders: { id: number; poNumber: string; businessUnit: string; supplier: string }[] = [];
  shippingLines: LookupEntity[] = [];
  lineItems: LineItemSelection[] = [];

  purchaseOrderId: number | null = null;
  blAwbNo = '';
  blAwbDate = '';
  etd = '';
  eta = '';
  shippingLineId: number | null = null;
  fcl20Count = 0;
  fcl40Count = 0;
  soc = false;
  blFreeDays: number | null = null;

  constructor(private lookups: SettingsLookupService, private shipments: ShipmentsService, private router: Router) {}

  ngOnInit(): void {
    this.shipments.getConfirmedOrders().subscribe({
      next: (orders) => {
        this.confirmedOrders = orders;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load confirmed purchase orders.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.lookups.getAll<LookupEntity>('shipping-lines').subscribe({
      next: (lines) => {
        this.shippingLines = lines;
        this.cdr.markForCheck();
      }
    });
  }

  onOrderChange(): void {
    this.lineItems = [];
    if (!this.purchaseOrderId) return;

    this.loadingLineItems = true;
    this.shipments.getLineItemsRemaining(this.purchaseOrderId).subscribe({
      next: (items) => {
        this.lineItems = items.map((li) => ({ ...li, selected: false, qtyToShip: null }));
        this.loadingLineItems = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load line items for this order.';
        this.loadingLineItems = false;
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.blAwbNo || !this.purchaseOrderId || !this.shippingLineId) {
      this.error = 'Please fill in BL/AWB number, purchase order, and shipping line.';
      return;
    }

    const selectedItems = this.lineItems.filter((li) => li.selected && li.qtyToShip && li.qtyToShip > 0);

    if (selectedItems.length === 0) {
      this.error = 'Select at least one line item with a quantity to ship.';
      return;
    }

    const overLimit = selectedItems.find((li) => li.qtyToShip! > li.qtyRemaining);
    if (overLimit) {
      this.error = `Quantity for ${overLimit.modelProduct} exceeds the remaining ${overLimit.qtyRemaining}.`;
      return;
    }

    this.saving = true;

    this.shipments
      .create({
        blAwbNo: this.blAwbNo,
        purchaseOrderId: this.purchaseOrderId!,
        blAwbDate: this.blAwbDate || undefined,
        etd: this.etd || undefined,
        eta: this.eta || undefined,
        shippingLineId: this.shippingLineId!,
        fcl20Count: this.fcl20Count,
        fcl40Count: this.fcl40Count,
        soc: this.soc,
        blFreeDays: this.blFreeDays ?? undefined,
        lineItems: selectedItems.map((li) => ({ purchaseOrderLineItemId: li.id, qtyInBl: li.qtyToShip! }))
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.success = 'Shipment created as Draft.';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/shipments']), 1000);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Could not create shipment.';
          this.cdr.markForCheck();
        }
      });
  }
}
