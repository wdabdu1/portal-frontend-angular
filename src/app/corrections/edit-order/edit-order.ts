import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ChangeHistory } from '../change-history/change-history';
import { AuthService } from '../../auth/auth.service';
import { CorrectionsService, LookupRef, PoCorrection, PoCorrectionRequest, PoIdentity } from '../corrections.service';

interface DivisionOption extends LookupEntity { businessUnitId: number; }

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
  private auth = inject(AuthService);

  orderId = 0;
  data: PoCorrection | null = null;
  loading = true;
  error = '';
  saving = false;
  message = '';
  saveError = '';
  historyKey = 0;

  // ---- Phase 2: identity / ownership (SuperUser only) ----
  isSuperUser = false;
  identity: PoIdentity | null = null;
  idMessage = '';
  idError = '';
  idSaving = false;
  businessUnits: LookupEntity[] = [];
  allDivisions: DivisionOption[] = [];
  suppliers: LookupEntity[] = [];
  consignees: LookupEntity[] = [];
  idForm = { poNumber: '', businessUnitId: null as number | null, divisionId: null as number | null, supplierId: null as number | null, consigneeId: null as number | null, reason: '' };

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
        this.isSuperUser = this.auth.hasRole('SuperUser');
        if (this.isSuperUser) this.loadIdentity();
      },
      error: () => { this.error = 'Could not load this order.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private loadIdentity(): void {
    forkJoin({
      identity: this.corrections.getOrderIdentity(this.orderId),
      businessUnits: this.lookups.getAll<LookupEntity>('business-units'),
      divisions: this.lookups.getAll<DivisionOption>('divisions'),
      suppliers: this.lookups.getAll<LookupEntity>('business-partners/suppliers'),
      consignees: this.lookups.getAll<LookupEntity>('business-partners/consignees')
    }).subscribe({
      next: (r) => {
        this.identity = r.identity;
        this.businessUnits = this.withCurrent(r.businessUnits, r.identity.businessUnit);
        this.suppliers = this.withCurrent(r.suppliers, r.identity.supplier);
        this.consignees = this.withCurrent(r.consignees, r.identity.consignee);
        this.allDivisions = r.divisions;
        this.idForm = {
          poNumber: r.identity.poNumber,
          businessUnitId: r.identity.businessUnit.id,
          divisionId: r.identity.division.id,
          supplierId: r.identity.supplier.id,
          consigneeId: r.identity.consignee.id,
          reason: ''
        };
        this.cdr.markForCheck();
      },
      error: () => { this.idError = 'Could not load the identity section.'; this.cdr.markForCheck(); }
    });
  }

  get divisionsForBu(): DivisionOption[] {
    const list = this.allDivisions.filter((d) => d.businessUnitId === this.idForm.businessUnitId);
    const cur = this.identity?.division;
    if (cur && this.idForm.businessUnitId === this.identity?.businessUnit.id && !list.some((d) => d.id === cur.id))
      list.push({ id: cur.id, name: cur.name, businessUnitId: this.idForm.businessUnitId! } as DivisionOption);
    return list;
  }

  onBuChange(): void {
    if (!this.divisionsForBu.some((d) => d.id === this.idForm.divisionId)) this.idForm.divisionId = null;
  }

  get idChanged(): boolean {
    const i = this.identity;
    const f = this.idForm;
    if (!i) return false;
    return f.poNumber.trim() !== i.poNumber || f.businessUnitId !== i.businessUnit.id || f.divisionId !== i.division.id
      || f.supplierId !== i.supplier.id || f.consigneeId !== i.consignee.id;
  }

  saveIdentity(): void {
    const f = this.idForm;
    this.idMessage = '';
    this.idError = '';
    if (!f.poNumber.trim() || !f.businessUnitId || !f.divisionId || !f.supplierId || !f.consigneeId) {
      this.idError = 'PO number, Business Unit, Division, Supplier and Consignee are all required.';
      return;
    }
    if (!this.idChanged) { this.idMessage = 'No changes to save.'; return; }
    if (f.reason.trim().length < 5) { this.idError = 'Please give a short reason for the correction (at least 5 characters).'; return; }
    this.idSaving = true;
    this.corrections.saveOrderIdentity(this.orderId, {
      poNumber: f.poNumber.trim(), businessUnitId: f.businessUnitId, divisionId: f.divisionId,
      supplierId: f.supplierId, consigneeId: f.consigneeId, reason: f.reason.trim()
    }).subscribe({
      next: (res) => {
        this.idSaving = false;
        this.idMessage = `Saved — ${res.changed} field${res.changed === 1 ? '' : 's'} updated.`;
        this.historyKey++;
        this.corrections.getOrder(this.orderId).subscribe({ next: (po) => { this.applyData(po); this.cdr.markForCheck(); } });
        this.loadIdentity();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.idSaving = false;
        this.idError = err?.error?.message ?? 'Could not save the changes.';
        this.cdr.markForCheck();
      }
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
