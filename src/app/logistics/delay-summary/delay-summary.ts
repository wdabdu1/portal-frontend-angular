import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { DelayLogService, DelaySummary } from '../delay-log.service';

// Logistics performance review: where the post-clearance wait comes from (delay reasons),
// release -> whole-shipment-dispatched per shipment (business days vs the dispatch target),
// and delivery performance by city (calendar days vs each city's target).
@Component({
  selector: 'app-delay-summary',
  imports: [CommonModule, FormsModule],
  templateUrl: './delay-summary.html'
})
export class DelaySummaryPage implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  data: DelaySummary | null = null;
  loading = true;
  error = '';
  from = '';
  to = '';

  constructor(private service: DelayLogService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.summary(this.from || undefined, this.to || undefined).subscribe({
      next: (r) => { this.data = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load the delay summary.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  clearFilters(): void { this.from = ''; this.to = ''; this.load(); }

  get totalReasonDays(): number { return (this.data?.reasons ?? []).reduce((s, r) => s + r.days, 0); }

  exportEntries(): void {
    if (!this.data) return;
    exportToExcel('Logistics Delay Log', [
      { key: 'blAwbNo', label: 'BL No.' }, { key: 'businessUnit', label: 'BU' }, { key: 'consignee', label: 'Consignee' },
      { key: 'reason', label: 'Reason' }, { key: 'fromDate', label: 'From' }, { key: 'toDate', label: 'To' },
      { key: 'days', label: 'Business Days' }, { key: 'note', label: 'Note' }, { key: 'createdBy', label: 'Logged By' }
    ], this.data.entries);
  }

  exportDispatch(): void {
    if (!this.data) return;
    exportToExcel('Logistics Dispatch', [
      { key: 'blAwbNo', label: 'BL No.' }, { key: 'withdrawalRef', label: 'FZ Withdrawal Ref' }, { key: 'businessUnit', label: 'BU' }, { key: 'consignee', label: 'Consignee' },
      { key: 'releaseDate', label: 'Clearance Release' }, { key: 'firstLoadDate', label: 'First Truck Loaded' },
      { key: 'fullyDispatchedDate', label: 'Fully Dispatched' }, { key: 'days', label: 'Business Days' },
      { key: 'targetDays', label: 'Target' }, { key: 'gap', label: 'Gap (+/-)' },
      { key: 'loggedDays', label: 'Delay Days Logged' }, { key: 'unexplainedDays', label: 'No Reason Logged' }
    ], this.data.dispatch);
  }
}
