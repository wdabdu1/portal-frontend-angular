import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DashboardsService, ShipmentReadiness } from '../dashboards.service';

@Component({
  selector: 'app-pipeline-health-mobile',
  imports: [CommonModule],
  templateUrl: './pipeline-health-mobile.html'
})
export class PipelineHealthMobile implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentReadiness[] = [];
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

  get redShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Red').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }

  get yellowShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Yellow').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }

  get greenShipments(): ShipmentReadiness[] {
    return this.allShipments.filter((s) => s.classification === 'Green').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  }
}
