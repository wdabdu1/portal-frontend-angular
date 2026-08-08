import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BuAccumulatedRow, TransferPricingService } from '../transfer-pricing.service';

@Component({
  selector: 'app-transfer-pricing-accumulated',
  imports: [CommonModule, RouterLink],
  templateUrl: './transfer-pricing-accumulated.html'
})
export class TransferPricingAccumulated implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: BuAccumulatedRow[] = [];
  loading = true;
  error = '';

  constructor(private service: TransferPricingService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAccumulated().subscribe({
      next: (r) => { this.rows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load accumulated history.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // Every BU can have a different number/mix of offshore stages — this
  // builds the full set of distinct sequence positions across ALL rows,
  // so every row's table has consistent columns even if that particular
  // BU doesn't have data at every position.
  get allSequenceOrders(): number[] {
    const set = new Set<number>();
    for (const row of this.rows) for (const stage of row.stages) set.add(stage.sequenceOrder);
    return [...set].sort((a, b) => a - b);
  }

  stageFor(row: BuAccumulatedRow, sequenceOrder: number) {
    return row.stages.find((s) => s.sequenceOrder === sequenceOrder) ?? null;
  }

  stageLabel(sequenceOrder: number): string {
    const isLastAnywhere = this.rows.some((r) => r.stages.some((s) => s.sequenceOrder === sequenceOrder && s.isLast));
    return isLastAnywhere ? `Offshore-${sequenceOrder} (Last, where applicable)` : `Offshore-${sequenceOrder}`;
  }
}
