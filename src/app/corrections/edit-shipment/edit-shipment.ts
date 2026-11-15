import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ChangeHistory } from '../change-history/change-history';
import { ShipmentLinesCorrections } from '../shipment-lines/shipment-lines';
import { AuthService } from '../../auth/auth.service';
import { CorrectionsService, LookupRef, ShipmentCorrection, ShipmentCorrectionRequest } from '../corrections.service';

// Manager/SuperUser-only screen for correcting the DESCRIPTIVE fields of an
// existing Shipment (dates, shipping line, vessel, container counts, HS codes).
// BL/AWB number, PO link, quantities/values and Ship-on-Board date are not here.
@Component({
  selector: 'app-edit-shipment',
  imports: [CommonModule, FormsModule, RouterLink, ChangeHistory, ShipmentLinesCorrections],
  templateUrl: './edit-shipment.html'
})
export class EditShipment implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  shipmentId = 0;
  data: ShipmentCorrection | null = null;
  loading = true;
  error = '';
  saving = false;
  message = '';
  saveError = '';
  historyKey = 0;

  // Phase 2 - BL/AWB number (SuperUser only)
  isSuperUser = false;
  blNo = '';
  blReason = '';
  blSaving = false;
  blMessage = '';
  blError = '';

  shippingLines: LookupEntity[] = [];

  form = {
    blAwbDate: '',
    etd: '',
    eta: '',
    shippingLineId: null as number | null,
    vesselName: '',
    fcl20Count: 0,
    fcl40Count: 0,
    soc: false,
    blFreeDays: null as number | null
  };
  hsCodes: Record<number, string> = {};

  constructor(private corrections: CorrectionsService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      shipment: this.corrections.getShipment(this.shipmentId),
      shippingLines: this.lookups.getAll<LookupEntity>('shipping-lines')
    }).subscribe({
      next: (r) => {
        this.shippingLines = this.withCurrent(r.shippingLines, r.shipment.shippingLine);
        this.applyData(r.shipment);
        this.isSuperUser = this.auth.hasRole('SuperUser');
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load this shipment.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  saveBlNumber(): void {
    this.blMessage = '';
    this.blError = '';
    const no = this.blNo.trim();
    if (!no) { this.blError = 'BL/AWB number is required.'; return; }
    if (no === this.data?.blAwbNo) { this.blMessage = 'No changes to save.'; return; }
    if (this.blReason.trim().length < 5) { this.blError = 'Please give a short reason for the correction (at least 5 characters).'; return; }
    this.blSaving = true;
    this.corrections.saveBlNumber(this.shipmentId, no, this.blReason.trim()).subscribe({
      next: () => {
        this.blSaving = false;
        this.blMessage = 'BL/AWB number updated.';
        this.blReason = '';
        this.historyKey++;
        this.corrections.getShipment(this.shipmentId).subscribe({ next: (sh) => { this.applyData(sh); this.cdr.markForCheck(); } });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.blSaving = false;
        this.blError = err?.error?.message ?? 'Could not save the change.';
        this.cdr.markForCheck();
      }
    });
  }

  private withCurrent(list: LookupEntity[], cur: LookupRef): LookupEntity[] {
    if (list.some((x) => x.id === cur.id)) return list;
    return [...list, { id: cur.id, name: cur.name } as LookupEntity];
  }

  private applyData(s: ShipmentCorrection): void {
    this.data = s;
    this.blNo = s.blAwbNo;
    this.form = {
      blAwbDate: s.blAwbDate ?? '',
      etd: s.etd ?? '',
      eta: s.eta ?? '',
      shippingLineId: s.shippingLine.id,
      vesselName: s.vesselName ?? '',
      fcl20Count: s.fcl20Count,
      fcl40Count: s.fcl40Count,
      soc: s.soc,
      blFreeDays: s.blFreeDays
    };
    this.hsCodes = {};
    for (const li of s.lineItems) this.hsCodes[li.lineItemId] = li.hsCode ?? '';
  }

  save(): void {
    const f = this.form;
    this.message = '';
    this.saveError = '';
    if (!f.shippingLineId) { this.saveError = 'Shipping Line is required.'; return; }
    if (f.fcl20Count === null || f.fcl40Count === null || f.fcl20Count < 0 || f.fcl40Count < 0) {
      this.saveError = 'Container counts must be 0 or more.';
      return;
    }
    const req: ShipmentCorrectionRequest = {
      blAwbDate: f.blAwbDate || null,
      etd: f.etd || null,
      eta: f.eta || null,
      shippingLineId: f.shippingLineId,
      vesselName: f.vesselName.trim() || null,
      fcl20Count: f.fcl20Count,
      fcl40Count: f.fcl40Count,
      soc: f.soc,
      blFreeDays: f.blFreeDays === null || (f.blFreeDays as unknown) === '' ? null : f.blFreeDays,
      lineItems: (this.data?.lineItems ?? []).map((li) => ({ lineItemId: li.lineItemId, hsCode: (this.hsCodes[li.lineItemId] ?? '').trim() || null }))
    };

    this.saving = true;
    this.corrections.saveShipment(this.shipmentId, req).subscribe({
      next: (res) => {
        this.saving = false;
        this.message = res.changed === 0 ? 'No changes to save.' : `Saved — ${res.changed} field${res.changed === 1 ? '' : 's'} updated.`;
        this.historyKey++;
        this.corrections.getShipment(this.shipmentId).subscribe({ next: (s) => { this.applyData(s); this.cdr.markForCheck(); } });
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
