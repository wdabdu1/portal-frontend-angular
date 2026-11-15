import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { CorrectionsService, ShipAvailableLine, ShipLineRow, ShipmentLines } from '../corrections.service';

interface LineEdit { row: ShipLineRow; qty: number | string | null; }
interface AddEdit { item: ShipAvailableLine; add: boolean; qty: number | string | null; hsCode: string; }

// SuperUser-only: correct the quantity-in-BL of existing shipment lines and add the items that were
// left off when the shipment was created. Two-step save: review the summary, then confirm.
@Component({
  selector: 'app-shipment-lines-corrections',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
  templateUrl: './shipment-lines.html'
})
export class ShipmentLinesCorrections implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) shipmentId!: number;
  @Output() saved = new EventEmitter<void>();

  data: ShipmentLines | null = null;
  edits: LineEdit[] = [];
  adds: AddEdit[] = [];
  reason = '';
  message = '';
  error = '';
  saving = false;
  reviewing = false;

  constructor(private corrections: CorrectionsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.corrections.getShipmentLines(this.shipmentId).subscribe({
      next: (r) => {
        this.data = r;
        this.edits = r.lines.map((l) => ({ row: l, qty: l.qtyInBl }));
        this.adds = r.available.map((a) => ({ item: a, add: false, qty: null, hsCode: '' }));
        this.reviewing = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load the shipment lines.'; this.cdr.markForCheck(); }
    });
  }

  num(v: number | string | null): number {
    return typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  }

  get changedEdits(): LineEdit[] { return this.edits.filter((e) => this.num(e.qty) !== e.row.qtyInBl); }
  get chosenAdds(): AddEdit[] { return this.adds.filter((a) => a.add); }
  get anyChange(): boolean { return this.changedEdits.length > 0 || this.chosenAdds.length > 0; }

  hint(e: LineEdit): string {
    const parts: string[] = [`max ${this.fmt(e.row.maxQty)}`];
    if (e.row.minQty > 0) parts.push(`min ${this.fmt(e.row.minQty)} (already allocated)`);
    return parts.join(', ');
  }

  fmt(n: number): string { return n.toLocaleString('en-US', { maximumFractionDigits: 4 }); }

  // Client-side checks mirror the server so mistakes show before the review step.
  private validate(): string | null {
    for (const e of this.changedEdits) {
      const q = this.num(e.qty);
      if (!(q > 0)) return `'${e.row.model}': quantity must be greater than zero.`;
      if (q > e.row.maxQty) return `'${e.row.model}': quantity ${this.fmt(q)} exceeds what is left on the order (${this.fmt(e.row.maxQty)}).`;
      if (q < e.row.minQty) return `'${e.row.model}': quantity ${this.fmt(q)} is below the ${this.fmt(e.row.minQty)} already allocated / withdrawn.`;
    }
    for (const a of this.chosenAdds) {
      const q = this.num(a.qty);
      if (!(q > 0)) return `'${a.item.model}': enter a quantity for the added item.`;
      if (q > a.item.remainingQty) return `'${a.item.model}': quantity ${this.fmt(q)} exceeds what is left on the order (${this.fmt(a.item.remainingQty)}).`;
    }
    if (this.reason.trim().length < 5) return 'Please give a short reason for the correction (at least 5 characters).';
    return null;
  }

  review(): void {
    this.message = '';
    this.error = this.validate() ?? '';
    if (this.error) return;
    this.reviewing = true;
  }

  back(): void { this.reviewing = false; }

  save(): void {
    this.saving = true;
    this.error = '';
    this.corrections.saveShipmentLines(
      this.shipmentId,
      this.changedEdits.map((e) => ({ lineId: e.row.lineId, qtyInBl: this.num(e.qty) })),
      this.chosenAdds.map((a) => ({ purchaseOrderLineItemId: a.item.purchaseOrderLineItemId, qtyInBl: this.num(a.qty), hsCode: a.hsCode.trim() || null })),
      this.reason.trim()
    ).subscribe({
      next: (res) => {
        this.saving = false;
        this.message = `Saved - ${res.changed} line change${res.changed === 1 ? '' : 's'}. Shipment value and payment due lines were refreshed.`;
        this.reason = '';
        this.load();
        this.saved.emit();
      },
      error: (err) => {
        this.saving = false;
        this.reviewing = false;
        this.error = err?.error?.message ?? 'Could not save the changes.';
        this.cdr.markForCheck();
      }
    });
  }
}
