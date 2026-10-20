import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ChangeHistory } from '../change-history/change-history';
import { CorrectionsService, LookupRef, PoCorrection, PoCorrectionRequest } from '../corrections.service';

// Manager/SuperUser-only screen for correcting the DESCRIPTIVE fields of an
// existing Purchase Order. Money, supplier, BU, PO number, status and the
// offshore chain are deliberately not here (see RecordCorrectionsController).
@Component({
  selector: 'app-edit-order',
  imports: [CommonModule, FormsModule, RouterLink, ChangeHistory],
  templateUrl: './edit-order.html'
})
export class EditOrder implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  orderId = 0;
  data: PoCorrection | null = null;
  loading = true;
  error = '';
  saving = false;
  message = '';
  saveError = '';
  historyKey = 0;

  originCountries: LookupEntity[] = [];
  incoterms: LookupEntity[] = [];
  shipmentModes: LookupEntity[] = [];
  paymentTerms: LookupEntity[] = [];
  approvalTypes: LookupEntity[] = [];
  brands: LookupEntity[] = [];
  ports: LookupEntity[] = [];

  form = {
    originCountryId: null as number | null,
    incotermId: null as number | null,
    shipmentModeId: null as number | null,
    supplierPaymentTermId: null as number | null,
    approvalTypeId: null as number | null,
    brandManufacturerId: null as number | null,
    portOfLoadingId: null as number | null,
    portOfDischargeId: null as number | null,
    offshorePoNo: '',
    offshorePoDate: '',
    supplierPiNo: '',
    supplierPiDate: '',
    receivedSignedPiDate: '',
    sentSignedPiDate: '',
    buPoDate: '',
    orderExecutionDate: '',
    latestShippingDate: ''
  };

  constructor(private corrections: CorrectionsService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      po: this.corrections.getOrder(this.orderId),
      originCountries: this.lookups.getAll<LookupEntity>('origin-countries'),
      incoterms: this.lookups.getAll<LookupEntity>('incoterms'),
      shipmentModes: this.lookups.getAll<LookupEntity>('shipment-modes'),
      paymentTerms: this.lookups.getAll<LookupEntity>('payment-terms'),
      approvalTypes: this.lookups.getAll<LookupEntity>('approval-types'),
      brands: this.lookups.getAll<LookupEntity>('business-partners/brands'),
      ports: this.lookups.getAll<LookupEntity>('ports')
    }).subscribe({
      next: (r) => {
        // Always keep the record's CURRENT value selectable, even if that
        // lookup has since been deactivated and no longer comes back in the list.
        this.originCountries = this.withCurrent(r.originCountries, r.po.originCountry);
        this.incoterms = this.withCurrent(r.incoterms, r.po.incoterm);
        this.shipmentModes = this.withCurrent(r.shipmentModes, r.po.shipmentMode);
        this.paymentTerms = this.withCurrent(r.paymentTerms, r.po.paymentTerm);
        this.approvalTypes = this.withCurrent(r.approvalTypes, r.po.approvalType);
        this.brands = this.withCurrent(r.brands, r.po.brandManufacturer);
        this.ports = this.withCurrent(this.withCurrent(r.ports, r.po.portOfLoading), r.po.portOfDischarge);
        this.applyData(r.po);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load this order.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private withCurrent(list: LookupEntity[], cur: LookupRef | null): LookupEntity[] {
    if (!cur || list.some((x) => x.id === cur.id)) return list;
    return [...list, { id: cur.id, name: cur.name } as LookupEntity];
  }

  private applyData(po: PoCorrection): void {
    this.data = po;
    this.form = {
      originCountryId: po.originCountry.id,
      incotermId: po.incoterm.id,
      shipmentModeId: po.shipmentMode.id,
      supplierPaymentTermId: po.paymentTerm.id,
      approvalTypeId: po.approvalType.id,
      brandManufacturerId: po.brandManufacturer.id,
      portOfLoadingId: po.portOfLoading?.id ?? null,
      portOfDischargeId: po.portOfDischarge?.id ?? null,
      offshorePoNo: po.offshorePoNo ?? '',
      offshorePoDate: po.offshorePoDate ?? '',
      supplierPiNo: po.supplierPiNo ?? '',
      supplierPiDate: po.supplierPiDate ?? '',
      receivedSignedPiDate: po.receivedSignedPiDate ?? '',
      sentSignedPiDate: po.sentSignedPiDate ?? '',
      buPoDate: po.buPoDate ?? '',
      orderExecutionDate: po.orderExecutionDate ?? '',
      latestShippingDate: po.latestShippingDate ?? ''
    };
  }

  save(): void {
    const f = this.form;
    this.message = '';
    this.saveError = '';
    if (!f.originCountryId || !f.incotermId || !f.shipmentModeId || !f.supplierPaymentTermId || !f.approvalTypeId || !f.brandManufacturerId) {
      this.saveError = 'Origin Country, Incoterm, Shipment Mode, Payment Term, Approval Type and Brand/Manufacturer are required.';
      return;
    }
    const req: PoCorrectionRequest = {
      originCountryId: f.originCountryId,
      incotermId: f.incotermId,
      shipmentModeId: f.shipmentModeId,
      supplierPaymentTermId: f.supplierPaymentTermId,
      approvalTypeId: f.approvalTypeId,
      brandManufacturerId: f.brandManufacturerId,
      portOfLoadingId: f.portOfLoadingId,
      portOfDischargeId: f.portOfDischargeId,
      offshorePoNo: f.offshorePoNo.trim() || null,
      offshorePoDate: f.offshorePoDate || null,
      supplierPiNo: f.supplierPiNo.trim() || null,
      supplierPiDate: f.supplierPiDate || null,
      receivedSignedPiDate: f.receivedSignedPiDate || null,
      sentSignedPiDate: f.sentSignedPiDate || null,
      buPoDate: f.buPoDate || null,
      orderExecutionDate: f.orderExecutionDate || null,
      latestShippingDate: f.latestShippingDate || null
    };

    this.saving = true;
    this.corrections.saveOrder(this.orderId, req).subscribe({
      next: (res) => {
        this.saving = false;
        this.message = res.changed === 0 ? 'No changes to save.' : `Saved — ${res.changed} field${res.changed === 1 ? '' : 's'} updated.`;
        this.historyKey++;
        this.corrections.getOrder(this.orderId).subscribe({ next: (po) => { this.applyData(po); this.cdr.markForCheck(); } });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.message ?? 'Could not save the changes.';
        this.cdr.markForCheck();
      }
    });
  }
}
