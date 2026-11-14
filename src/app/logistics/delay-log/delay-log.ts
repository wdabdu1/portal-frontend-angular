import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DelayEntry, DelayLogService, DelayReasonOption } from '../delay-log.service';

// Logistics Delay Log for one shipment: why the cargo waited to get onto trucks after
// Clearance released it. Many entries per shipment; "to" empty = still ongoing.
// Days are business days (both ends counted) and calculated by the server.
@Component({
  selector: 'app-delay-log',
  imports: [CommonModule, FormsModule],
  template: `
    <div style="margin-top: 16px; padding: 12px; border: 1px solid #e3e3e3; border-radius: 6px; background: #fcfcfc;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="font-size: 13px;">Logistics Delay Log</strong>
        <span style="font-size: 11px; color: #888;">Total logged: {{ totalDays }} business day(s)</span>
      </div>
      <p *ngIf="error" style="color: #c0392b; font-size: 12px; margin: 6px 0 0;">{{ error }}</p>
      <p *ngIf="!loading && entries.length === 0" style="color: #888; font-size: 12px; margin: 8px 0 0;">No delays logged for this shipment.</p>

      <table *ngIf="entries.length > 0" style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #ddd; color: #555;">
            <th style="padding: 4px;">Reason</th><th style="padding: 4px;">From</th><th style="padding: 4px;">To</th>
            <th style="padding: 4px;">Days</th><th style="padding: 4px;">Note</th><th style="padding: 4px;">Logged by</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let e of entries" style="border-bottom: 1px solid #eee;">
            <td style="padding: 4px;">{{ e.reason }}</td>
            <td style="padding: 4px;">{{ e.fromDate | date: 'dd/MM/yyyy' }}</td>
            <td style="padding: 4px;">{{ e.toDate ? (e.toDate | date: 'dd/MM/yyyy') : '' }}<span *ngIf="e.ongoing" style="color: #a66a00;">ongoing</span></td>
            <td style="padding: 4px; font-weight: 600;">{{ e.days }}</td>
            <td style="padding: 4px; max-width: 220px; white-space: normal;">{{ e.note || '' }}</td>
            <td style="padding: 4px; color: #777;">{{ e.createdBy }}</td>
            <td style="padding: 4px; white-space: nowrap; text-align: right;">
              <ng-container *ngIf="canEdit">
                <button (click)="startEdit(e)" style="background: none; border: none; color: #0a3d62; cursor: pointer; font-size: 12px;">Edit</button>
                <button (click)="remove(e)" style="background: none; border: none; color: #c0392b; cursor: pointer; font-size: 12px;">Delete</button>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="canEdit" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
        <div style="font-size: 12px; color: #555; margin-bottom: 4px;">{{ editingId ? 'Edit entry' : 'Add a delay' }}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
          <div>
            <label style="display:block; font-size:11px; color:#555;">Reason</label>
            <select [(ngModel)]="form.reasonId" style="padding: 5px;">
              <option [ngValue]="null">-- select --</option>
              <option *ngFor="let r of reasons" [ngValue]="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-size:11px; color:#555;">From</label>
            <input type="date" [(ngModel)]="form.fromDate" style="padding: 4px;" />
          </div>
          <div>
            <label style="display:block; font-size:11px; color:#555;">To (empty = ongoing)</label>
            <input type="date" [(ngModel)]="form.toDate" style="padding: 4px;" />
          </div>
          <div style="flex: 1; min-width: 160px;">
            <label style="display:block; font-size:11px; color:#555;">Note</label>
            <input type="text" maxlength="500" [(ngModel)]="form.note" style="padding: 5px; width: 100%; box-sizing: border-box;" />
          </div>
          <button (click)="save()" [disabled]="saving || !form.reasonId || !form.fromDate"
            style="padding: 6px 14px; background: #0a3d62; color: white; border: none; border-radius: 4px; cursor: pointer;">
            {{ saving ? 'Saving...' : (editingId ? 'Update' : 'Add') }}
          </button>
          <button *ngIf="editingId" (click)="cancelEdit()" style="padding: 6px 12px; background: transparent; color: #555; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
      </div>
      <p *ngIf="!canEdit" style="font-size: 11px; color: #999; margin: 8px 0 0;">View only.</p>
    </div>
  `
})
export class DelayLog implements OnChanges {
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) shipmentId!: number;
  @Input() withdrawalId: number | null = null;
  @Input() canEdit = false;

  entries: DelayEntry[] = [];
  reasons: DelayReasonOption[] = [];
  loading = false;
  saving = false;
  error = '';
  editingId: number | null = null;
  form = this.emptyForm();

  constructor(private service: DelayLogService) {}

  private emptyForm() {
    return { reasonId: null as number | null, fromDate: '', toDate: '', note: '' };
  }

  get totalDays(): number {
    return this.entries.reduce((sum, e) => sum + e.days, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shipmentId'] && this.shipmentId) {
      this.load();
      if (this.canEdit && this.reasons.length === 0) {
        this.service.reasons().subscribe({ next: (r) => { this.reasons = r; this.cdr.markForCheck(); } });
      }
    }
  }

  load(): void {
    this.loading = true;
    this.service.list(this.shipmentId).subscribe({
      next: (r) => { this.entries = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load the delay log.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  startEdit(e: DelayEntry): void {
    this.editingId = e.id;
    this.form = { reasonId: e.reasonId, fromDate: e.fromDate, toDate: e.toDate ?? '', note: e.note ?? '' };
    this.error = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.error = '';
  }

  save(): void {
    if (!this.form.reasonId || !this.form.fromDate) return;
    this.saving = true;
    this.error = '';
    const req = {
      shipmentId: this.shipmentId, withdrawalId: this.withdrawalId, reasonId: this.form.reasonId,
      fromDate: this.form.fromDate, toDate: this.form.toDate || null, note: this.form.note.trim() || null
    };
    const call$ = this.editingId ? this.service.update(this.editingId, req) : this.service.create(req);
    call$.subscribe({
      next: () => { this.saving = false; this.cancelEdit(); this.load(); },
      error: (err) => { this.saving = false; this.error = err?.error?.message || 'Could not save the delay.'; this.cdr.markForCheck(); }
    });
  }

  remove(e: DelayEntry): void {
    if (!confirm(`Delete this delay entry (${e.reason}, ${e.days} day(s))?`)) return;
    this.service.remove(e.id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Could not delete the entry.'; this.cdr.markForCheck(); }
    });
  }
}
