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
  // Captured here, against the product actually being selected, rather
  // than as a separate step after the shipment exists. Optional — can be
  // left blank and filled in later from Update Shipment's HS Codes block.
  hsCode: string | null;
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

  // Open purchase orders only: confirmed AND still carrying at least one
  // line with quantity left to ship (openCategories is the comma-joined list
  // of those open lines' categories, so blank means nothing left to ship).
  confirmedOrders: ConfirmedOrderOption[] = [];

  // Typeahead for the primary PO: the user types a few letters of the PO
  // number, supplier or category and the list below narrows to matching POs.
  poSearch = '';
  poListOpen = false;
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
        this.confirmedOrders = orders.filter((o) => !!(o.openCategories ?? '').trim());
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

  private orderLabel(po: ConfirmedOrderOption): string {
    return `${po.poNumber} — ${po.supplier} — ${po.openCategories}`;
  }

  // Every whitespace-separated word typed must appear somewhere in the PO
  // number, supplier, category list or business unit (any order, any case).
  get filteredOrders(): ConfirmedOrderOption[] {
    const words = this.poSearch.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return this.confirmedOrders;
    return this.confirmedOrders.filter((po) => {
      const haystack = `${po.poNumber} ${po.supplier} ${po.openCategories} ${po.businessUnit}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }

  onPoSearchInput(): void {
    this.poListOpen = true;
    // Typing after a PO was already picked starts a new search, which also
    // clears the previous selection (and its line items) — the same reset
    // that changing the dropdown used to do.
    if (this.purchaseOrderId !== null) {
      this.purchaseOrderId = null;
      this.onOrderChange();
    }
  }

  pickOrder(po: ConfirmedOrderOption): void {
    this.purchaseOrderId = po.id;
    this.poSearch = this.orderLabel(po);
    this.poListOpen = false;
    this.onOrderChange();
  }

  closePoListSoon(): void {
    // Delay so a click on a list row (mousedown) is handled before the list disappears.
    setTimeout(() => { this.poListOpen = false; this.cdr.markForCheck(); }, 150);
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
          poNumber: order.poNumber,
          hsCode: null
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
        lineItems: selectedItems.map((li) => ({
          purchaseOrderLineItemId: li.id,
          qtyInBl: li.qtyToShip!,
          hsCode: (li.hsCode || '').trim() || null
        }))
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
      const fieldName = firstKey === 'purchaseOrderId' ? 'poSearch' : firstKey;
      const el = document.querySelector(`[name="${fieldName}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
