import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChangeLogRow, CorrectionsService } from '../corrections.service';

// Read-only list of every correction made to one PO / Shipment (who, when,
// field, old -> new). Re-reads whenever `refreshKey` changes (the edit pages
// bump it after each save).
@Component({
  selector: 'app-change-history',
  imports: [CommonModule],
  templateUrl: './change-history.html'
})
export class ChangeHistory implements OnChanges {
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityType!: 'orders' | 'shipments';
  @Input({ required: true }) entityId!: number;
  @Input() refreshKey = 0;

  rows: ChangeLogRow[] = [];
  display: { row: ChangeLogRow; reason: string | null; isNote: boolean }[] = [];
  loading = true;
  error = '';

  constructor(private service: CorrectionsService) {}

  ngOnChanges(): void {
    if (!this.entityId) return;
    this.loading = true;
    this.service.getHistory(this.entityType, this.entityId).subscribe({
      next: (r) => { this.rows = r; this.buildDisplay(); this.loading = false; this.error = ''; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load history.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // Informational rows written next to a change (they have no "old value").
  private static readonly NOTE_FIELDS = ['Transfer Pricing entries deleted', 'Offshore ERP info deleted', 'Shipment line subtotals recalculated'];

  // Every save writes its changed fields plus one "Correction reason" row, all with the same timestamp.
  // Show the reason once, under the first change of that save, instead of as a separate row with an "(empty)" old value.
  private buildDisplay(): void {
    const reasonOf = new Map<string, string>();
    for (const r of this.rows)
      if (r.fieldName === 'Correction reason') reasonOf.set(r.changedAt + '|' + r.changedByName, r.newValue ?? '');
    const shown = new Set<string>();
    this.display = [];
    for (const r of this.rows) {
      if (r.fieldName === 'Correction reason') continue;
      const key = r.changedAt + '|' + r.changedByName;
      const reason = !shown.has(key) ? (reasonOf.get(key) ?? null) : null;
      shown.add(key);
      this.display.push({ row: r, reason, isNote: ChangeHistory.NOTE_FIELDS.includes(r.fieldName) });
    }
  }

  // Dates were stored as yyyy-MM-dd; show them as DD/MM/YYYY like the rest of the app.
  show(v: string | null): string {
    if (v === null || v === '') return '(empty)';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }

  // The API sends UTC timestamps without a "Z"; add it so they render in local time.
  when(v: string): string {
    return /[zZ]|[+-]\d{2}:\d{2}$/.test(v) ? v : v + 'Z';
  }
}
