import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ConfirmedOrderOption, LineItemRemaining, ShipmentsService } from '../shipments.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';

interface LineItemSelection extends LineItemRemaining {
  selected: boolean;
  qtyToShip: number | null;
  // Which of the selected orders this line item came from — shown as a
  // column only once more than one PO is combined into the shipment.
  purchaseOrderId: number;
  poNumber: string;
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
  invalidFields = new Set<string>();
  success = '';

  confirmedOrders: ConfirmedOrderOption[] = [];
  shippingLines: LookupEntity[] = [];
  lineItems: LineItemSelection[] = [];

  // The primary PO, picked from the main dropdown. selectedOrders[0] is
  // always this same order — additional orders can be combined in below
  // it as long as they share its Supplier/Business Unit/Division.
  purchaseOrderId: number | null = null;
  selectedOrders: ConfirmedOrderOption[] = [];
  additionalPurchaseOrderId: number | null = null;

  blAwbNo = '';
  blAwbDate = '';
  etd = '';
  eta = '';
  shippingLineId: number | null = null;
  vesselName = '';
  fcl20Count = 0;
  fcl40Count = 0;
  soc = false;
  blFreeDays: number | null = null;
  isDirectSales = false;
  consigneeName = '';

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

  // Orders that could realistically be combined with what's already
  // selected: same Supplier + Business Unit + Division as the primary PO.
  // The backend enforces this (plus a matching Offshore Partner chain,
  // which isn't visible here) for real on save — this list just avoids
  // offering a combination that's guaranteed to be rejected.
  get additionalOrderOptions(): ConfirmedOrderOption[] {
    if (this.selectedOrders.length === 0) return [];
    const primary = this.selectedOrders[0];
    const selectedIds = new Set(this.selectedOrders.map((o) => o.id));
    return this.confirmedOrders.filter(
      (o) =>
        !selectedIds.has(o.id) &&
        o.businessUnitId === primary.businessUnitId &&
        o.supplierId === primary.supplierId &&
        o.divisionId === primary.divisionId
    );
  }

  onOrderChange(): void {
    this.lineItems = [];
    this.selectedOrders = [];
    this.additionalPurchaseOrderId = null;
    if (!this.purchaseOrderId) return;

    const order = this.confirmedOrders.find((o) => o.id === this.purchaseOrderId);
    if (!order) return;
    this.selectedOrders = [order];
    this.loadLineItemsFor(order);
  }

  addOrder(): void {
    if (!this.additionalPurchaseOrderId) return;
    const order = this.confirmedOrders.find((o) => o.id === this.additionalPurchaseOrderId);
    if (!order) return;
    this.selectedOrders = [...this.selectedOrders, order];
    this.additionalPurchaseOrderId = null;
    this.loadLineItemsFor(order);
  }

  // The primary PO can't be removed by itself — changing the primary
  // dropdown resets the whole combination instead (see onOrderChange).
  removeOrder(orderId: number): void {
    if (this.selectedOrders.length > 0 && this.selectedOrders[0].id === orderId) return;
    this.selectedOrders = this.selectedOrders.filter((o) => o.id !== orderId);
    this.lineItems = this.lineItems.filter((li) => li.purchaseOrderId !== orderId);
  }

  private loadLineItemsFor(order: ConfirmedOrderOption): void {
    this.loadingLineItems = true;
    this.shipments.getLineItemsRemaining(order.id).subscribe({
      next: (items) => {
        const tagged: LineItemSelection[] = items.map((li) => ({
          ...li,
          selected: false,
          qtyToShip: null,
          purchaseOrderId: order.id,
          poNumber: order.poNumber
        }));
        this.lineItems = [...this.lineItems, ...tagged];
        this.loadingLineItems = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = `Could not load line items for ${order.poNumber}.`;
        this.loadingLineItems = false;
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    this.error = '';
    this.success = '';
    this.invalidFields = new Set<string>();

    const requiredFields: [string, unknown][] = [
      ['blAwbNo', this.blAwbNo], ['purchaseOrderId', this.purchaseOrderId], ['shippingLineId', this.shippingLineId]
    ];
    if (this.isDirectSales) requiredFields.push(['consigneeName', this.consigneeName]);
    for (const [key, value] of requiredFields) {
      if (!value) this.invalidFields.add(key);
    }

    if (this.invalidFields.size > 0) {
      this.error = 'Please complete the highlighted required fields.';
      this.scrollToFirstError();
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
        blAwbDate: this.blAwbDate || undefined,
        etd: this.etd || undefined,
        eta: this.eta || undefined,
        shippingLineId: this.shippingLineId!,
        vesselName: this.vesselName || null,
        fcl20Count: this.fcl20Count,
        fcl40Count: this.fcl40Count,
        soc: this.soc,
        blFreeDays: this.blFreeDays ?? undefined,
        isDirectSales: this.isDirectSales,
        consigneeName: this.isDirectSales ? this.consigneeName : null,
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

  fieldBorder(key: string): string {
    return this.invalidFields.has(key) ? '1px solid #c0392b' : '1px solid #ccc';
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstKey = Array.from(this.invalidFields)[0];
      const el = document.querySelector(`[name="${firstKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
