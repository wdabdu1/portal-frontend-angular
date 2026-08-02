import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { PurchaseOrdersService } from '../purchase-orders.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';

interface Division extends LookupEntity {
  businessUnitId: number;
  name: string;
}

interface LineItemRow {
  productCategoryId: number | null;
  modelProductId: number | null;
  productTypeId: number | null;
  qty: number | null;
  unitOfMeasureId: number | null;
  unitPrice: number | null;
  currencyId: number | null;
}

interface OffshoreRow {
  businessPartnerId: number | null;
}

@Component({
  selector: 'app-new-supplier-order',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
  templateUrl: './new-supplier-order.html'
})
export class NewSupplierOrder implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;
  error = '';
  success = '';

  businessUnits: LookupEntity[] = [];
  divisions: Division[] = [];
  filteredDivisions: Division[] = [];
  suppliers: LookupEntity[] = [];
  brands: LookupEntity[] = [];
  consignees: LookupEntity[] = [];
  offshoreEntities: LookupEntity[] = [];
  approvalTypes: LookupEntity[] = [];
  paymentTerms: LookupEntity[] = [];
  incoterms: LookupEntity[] = [];
  originCountries: LookupEntity[] = [];
  shipmentModes: LookupEntity[] = [];
  currencies: LookupEntity[] = [];
  unitsOfMeasure: LookupEntity[] = [];
  productCategories: LookupEntity[] = [];
  productTypes: LookupEntity[] = [];
  modelProducts: LookupEntity[] = [];

  poNumber = '';
  businessUnitId: number | null = null;
  divisionId: number | null = null;
  supplierId: number | null = null;
  brandManufacturerId: number | null = null;
  approvalTypeId: number | null = null;
  consigneeId: number | null = null;
  supplierPiNo = '';
  supplierPiDate = '';
  supplierPaymentTermId: number | null = null;
  incotermId: number | null = null;
  originCountryId: number | null = null;
  buShippingBudget: number | null = null;
  shipmentModeId: number | null = null;
  offshorePoNo = '';
  offshorePoDate = '';
  receivedSignedPiDate = '';
  sentSignedPiDate = '';
  buPoDate = '';
  orderExecutionDate = '';
  latestShippingDate = '';

  lineItems: LineItemRow[] = [this.emptyLineItem()];
  offshoreRows: OffshoreRow[] = [];

  constructor(private lookups: SettingsLookupService, private orders: PurchaseOrdersService, private router: Router) {}

  ngOnInit(): void {
    forkJoin({
      businessUnits: this.lookups.getAll<LookupEntity>('business-units'),
      divisions: this.lookups.getAll<Division>('divisions'),
      suppliers: this.lookups.getAll<LookupEntity>('business-partners/suppliers'),
      brands: this.lookups.getAll<LookupEntity>('business-partners/brands'),
      consignees: this.lookups.getAll<LookupEntity>('business-partners/consignees'),
      offshoreEntities: this.lookups.getAll<LookupEntity>('business-partners/offshore'),
      approvalTypes: this.lookups.getAll<LookupEntity>('approval-types'),
      paymentTerms: this.lookups.getAll<LookupEntity>('payment-terms'),
      incoterms: this.lookups.getAll<LookupEntity>('incoterms'),
      originCountries: this.lookups.getAll<LookupEntity>('origin-countries'),
      shipmentModes: this.lookups.getAll<LookupEntity>('shipment-modes'),
      currencies: this.lookups.getAll<LookupEntity>('currencies'),
      unitsOfMeasure: this.lookups.getAll<LookupEntity>('units-of-measure'),
      productCategories: this.lookups.getAll<LookupEntity>('product-categories'),
      productTypes: this.lookups.getAll<LookupEntity>('product-types'),
      modelProducts: this.lookups.getAll<LookupEntity>('model-products')
    }).subscribe({
      next: (res) => {
        Object.assign(this, res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load form data.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onBusinessUnitChange(): void {
    this.filteredDivisions = this.divisions.filter((d) => d.businessUnitId === this.businessUnitId);
    this.divisionId = null;
  }

  emptyLineItem(): LineItemRow {
    return {
      productCategoryId: null,
      modelProductId: null,
      productTypeId: null,
      qty: null,
      unitOfMeasureId: null,
      unitPrice: null,
      currencyId: null
    };
  }

  addLineItem(): void {
    this.lineItems.push(this.emptyLineItem());
  }

  removeLineItem(index: number): void {
    this.lineItems.splice(index, 1);
    if (this.lineItems.length === 0) this.lineItems.push(this.emptyLineItem());
  }

  addOffshoreRow(): void {
    this.offshoreRows.push({ businessPartnerId: null });
  }

  removeOffshoreRow(index: number): void {
    this.offshoreRows.splice(index, 1);
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.poNumber || !this.businessUnitId || !this.divisionId || !this.supplierId) {
      this.error = 'Please fill in the required identity fields.';
      return;
    }

    const validLineItems = this.lineItems.filter(
      (li) => li.productCategoryId && li.modelProductId && li.productTypeId && li.qty && li.unitOfMeasureId && li.unitPrice && li.currencyId
    );

    if (validLineItems.length === 0) {
      this.error = 'At least one complete line item is required.';
      return;
    }

    this.saving = true;

    this.orders
      .create({
        poNumber: this.poNumber,
        businessUnitId: this.businessUnitId!,
        divisionId: this.divisionId!,
        supplierId: this.supplierId!,
        brandManufacturerId: this.brandManufacturerId!,
        approvalTypeId: this.approvalTypeId!,
        consigneeId: this.consigneeId!,
        supplierPiNo: this.supplierPiNo || undefined,
        supplierPiDate: this.supplierPiDate || undefined,
        supplierPaymentTermId: this.supplierPaymentTermId!,
        incotermId: this.incotermId!,
        originCountryId: this.originCountryId!,
        buShippingBudget: this.buShippingBudget ?? undefined,
        shipmentModeId: this.shipmentModeId!,
        offshorePoNo: this.offshorePoNo || undefined,
        offshorePoDate: this.offshorePoDate || undefined,
        receivedSignedPiDate: this.receivedSignedPiDate || undefined,
        sentSignedPiDate: this.sentSignedPiDate || undefined,
        buPoDate: this.buPoDate || undefined,
        orderExecutionDate: this.orderExecutionDate || undefined,
        latestShippingDate: this.latestShippingDate || undefined,
        lineItems: validLineItems as any,
        offshorePartners: this.offshoreRows
          .filter((r) => r.businessPartnerId)
          .map((r, i) => ({ businessPartnerId: r.businessPartnerId!, sequenceOrder: i + 1 }))
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.success = 'Purchase order created as Draft.';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/orders']), 1000);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Could not create purchase order.';
          this.cdr.markForCheck();
        }
      });
  }
}
