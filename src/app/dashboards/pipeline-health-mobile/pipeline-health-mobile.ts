import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DashboardsService, ShipmentHighlight } from '../dashboards.service';

type Classification = 'Red' | 'Yellow' | 'Green';

@Component({
  selector: 'app-pipeline-health-mobile',
  imports: [CommonModule],
  templateUrl: './pipeline-health-mobile.html'
})
export class PipelineHealthMobile implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentHighlight[] = [];
  loading = true;
  error = '';

  constructor(private service: DashboardsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getPreClearanceReadiness().subscribe({
      next: (r) => { this.allShipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load data.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  classify(s: ShipmentHighlight): Classification {
    if (s.isCumulativelyLate || s.currentStepLight === 'Red' || s.motSsmoAlertLevel === 'Red' || s.currentDemurrageStorageHitSdg > 0) return 'Red';
    if (s.currentStepLight === 'Amber' || s.motSsmoAlertLevel === 'Yellow' || s.projectedDemurrageStorageHitSdg > 0) return 'Yellow';
    return 'Green';
  }

  private byClassification(target: Classification): ShipmentHighlight[] {
    return this.allShipments
      .filter((s) => this.classify(s) === target)
      .sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }

  get redShipments(): ShipmentHighlight[] { return this.byClassification('Red'); }
  get yellowShipments(): ShipmentHighlight[] { return this.byClassification('Yellow'); }
  get greenShipments(): ShipmentHighlight[] { return this.byClassification('Green'); }
}
