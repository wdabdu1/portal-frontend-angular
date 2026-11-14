import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ChainInfo, CorrectionsService, LineCorrectionRow, LinesCorrection } from '../corrections.service';

interface LineEdit { row: LineCorrectionRow; qty: number | string; unitPrice: number | string; currencyId: number; uomId: number; }

// SuperUser-only (Phase 3): correct a PO's line quantity / unit price / currency / UoM and its offshore chain.
// The backend enforces every rule; this screen just shows them (see RecordCorrectionsTier3Controller).
@Component({
  selector: 'app-order-money-corrections',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
  templateUrl: './order-money.html'
})
export class OrderMoneyCorrections implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) orderId!: number;
  @Output() saved = new EventEmitter<void>();

  lines: LinesCorrection | null = null;
  edits: LineEdit[] = [];
  currencies: LookupEntity[] = [];
  uoms: LookupEntity[] = [];
  lineReason = '';
  lineMsg = '';
  lineErr = '';
  lineSaving = false;

  chain: ChainInfo | null = null;
  offshorePartners: LookupEntity[] = [];
  chainIds: (number | null)[] = [];
  chainReason = '';
  chainMsg = '';
  chainErr = '';
  chainSaving = false;
  chainConfirm: { tpRows: number; erpRows: number } | null = null;

  constructor(private corrections: CorrectionsService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe((r) => { this.currencies = r; this.cdr.markForCheck(); });
    this.lookups.getAll<LookupEntity>('units-of-measure').subscribe((r) => { this.uoms = r; this.cdr.markForCheck(); });
    this.lookups.getAll<LookupEntity>('business-partners/offshore').subscribe((r) => { this.offshorePartners = r; this.cdr.markForCheck(); });
    this.loadLines();
    this.loadChain();
  }

  // ---- lines ----
  loadLines(): void {
    this.corrections.getLines(this.orderId).subscribe({
      next: (r) => {
        this.lines = r;
        this.edits = r.lines.map((l) => ({ row: l, qty: l.qty, unitPrice: l.unitPrice, currencyId: l.currency.id, uomId: l.uom.id }));
        this.cdr.markForCheck();
      },
      error: () => { this.lineErr = 'Could not load the order lines.'; this.cdr.markForCheck(); }
    });
  }

  num(v: number | string): number {
    return typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  }

  moneyChanged(e: LineEdit): boolean {
    return this.num(e.qty) !== e.row.qty || this.num(e.unitPrice) !== e.row.unitPrice || e.currencyId !== e.row.currency.id;
  }

  anyChanged(e: LineEdit): boolean {
    return this.moneyChanged(e) || e.uomId !== e.row.uom.id;
  }

  get linesChanged(): boolean { return this.edits.some((e) => this.anyChanged(e)); }

  newTotal(e: LineEdit): number { return this.num(e.qty) * this.num(e.unitPrice); }

  saveLines(): void {
    this.lineMsg = ''; this.lineErr = '';
    const changed = this.edits.filter((e) => this.anyChanged(e));
    if (changed.length === 0) { this.lineMsg = 'No changes to save.'; return; }
    if (changed.some((e) => !(this.num(e.qty) > 0) || this.num(e.unitPrice) < 0 || Number.isNaN(this.num(e.unitPrice)))) {
      this.lineErr = 'Quantity must be greater than zero and unit price can\'t be negative.'; return;
    }
    if (this.lineReason.trim().length < 5) { this.lineErr = 'Please give a short reason for the correction (at least 5 characters).'; return; }
    this.lineSaving = true;
    this.corrections.saveLines(this.orderId, changed.map((e) => ({
      lineId: e.row.lineId, qty: this.num(e.qty), unitPrice: this.num(e.unitPrice), currencyId: e.currencyId, unitOfMeasureId: e.uomId
    })), this.lineReason.trim()).subscribe({
      next: (res) => {
        this.lineSaving = false;
        this.lineMsg = `Saved — ${res.changed} field${res.changed === 1 ? '' : 's'} updated; totals, shipment values and planned payments were recalculated.`;
        this.lineReason = '';
        this.loadLines();
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err) => { this.lineSaving = false; this.lineErr = err?.error?.message ?? 'Could not save the changes.'; this.cdr.markForCheck(); }
    });
  }

  // ---- chain ----
  loadChain(): void {
    this.corrections.getChain(this.orderId).subscribe({
      next: (r) => {
        this.chain = r;
        this.chainIds = r.chain.map((c) => c.partner.id);
        this.chainConfirm = null;
        this.cdr.markForCheck();
      },
      error: () => { this.chainErr = 'Could not load the offshore chain.'; this.cdr.markForCheck(); }
    });
  }

  // The current partner of a position must stay selectable even if it's no longer in the active list.
  optionsFor(i: number): { id: number; name: string }[] {
    const list = this.offshorePartners.map((p) => ({ id: p.id as number, name: p['name'] as string }));
    const cur = this.chain?.chain[i]?.partner;
    if (cur && !list.some((p) => p.id === cur.id)) list.push({ id: cur.id, name: cur.name });
    return list;
  }

  trackIndex(i: number): number { return i; }

  addStage(): void { this.chainIds = [...this.chainIds, null]; this.chainConfirm = null; }
  removeStage(i: number): void { this.chainIds = this.chainIds.filter((_, k) => k !== i); this.chainConfirm = null; }
  move(i: number, d: number): void {
    const j = i + d;
    if (j < 0 || j >= this.chainIds.length) return;
    const a = [...this.chainIds];
    [a[i], a[j]] = [a[j], a[i]];
    this.chainIds = a;
    this.chainConfirm = null;
  }

  get chainChanged(): boolean {
    const cur = (this.chain?.chain ?? []).map((c) => c.partner.id);
    return cur.length !== this.chainIds.length || cur.some((v, i) => v !== this.chainIds[i]);
  }

  saveChain(confirm: boolean): void {
    this.chainMsg = ''; this.chainErr = '';
    if (this.chainIds.some((x) => x === null)) { this.chainErr = 'Choose a company for every stage (or remove the empty stage).'; return; }
    if (!this.chainChanged) { this.chainMsg = 'No changes to save.'; return; }
    if (this.chainReason.trim().length < 5) { this.chainErr = 'Please give a short reason for the correction (at least 5 characters).'; return; }
    this.chainSaving = true;
    this.corrections.saveChain(this.orderId, this.chainIds as number[], this.chainReason.trim(), confirm).subscribe({
      next: (res) => {
        this.chainSaving = false;
        if (res.needsConfirm) {
          this.chainConfirm = { tpRows: res.tpRows, erpRows: res.erpRows };
          this.cdr.markForCheck();
          return;
        }
        this.chainMsg = res.tpRows > 0
          ? `Chain updated. ${res.tpRows} Transfer Pricing row(s) were deleted - please redo Transfer Pricing for this order's shipments.`
          : 'Chain updated.';
        this.chainReason = '';
        this.loadChain();
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err) => { this.chainSaving = false; this.chainErr = err?.error?.message ?? 'Could not save the changes.'; this.cdr.markForCheck(); }
    });
  }
}
