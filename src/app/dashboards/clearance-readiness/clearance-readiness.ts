import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { exportToExcel } from '../../shared/excel-export.util';
import { DashboardsService, ShipmentHighlight } from '../dashboards.service';

type Classification = 'Red' | 'Yellow' | 'Green';

@Component({
  selector: 'app-clearance-readiness',
  imports: [CommonModule],
  templateUrl: './clearance-readiness.html'
})
export class ClearanceReadiness implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentHighlight[] = [];
  loading = true;
  error = '';
  // Red needs eyes immediately; Yellow/Green start collapsed so a quick
  // glance at the counts is enough when nothing needs attention.
  expandedSection: Classification | null = 'Red';

  toggleSection(section: Classification): void {
    this.expandedSection = this.expandedSection === section ? null : section;
  }

  constructor(private service: DashboardsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getPreClearanceReadiness().subscribe({
      next: (r) => { this.allShipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load pipeline health data.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // The single current step's own light already carries most of the
  // signal; an overdue MOT/SSMO in the background can only ever push
  // the classification up (never down), since it's a real risk even
  // while the visible current step still looks fine.
  classify(s: ShipmentHighlight): Classification {
    if (s.currentStepLight === 'Red' || s.motSsmoAlertLevel === 'Red') return 'Red';
    if (s.currentStepLight === 'Amber' || s.motSsmoAlertLevel === 'Yellow') return 'Yellow';
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

  lightColor(light: string): string {
    if (light === 'Red') return '#c0392b';
    if (light === 'Amber') return '#a66a00';
    return '#1e7e34';
  }

  lightBg(light: string): string {
    if (light === 'Red') return '#fdeaea';
    if (light === 'Amber') return '#fff4e5';
    return '#e6f4ea';
  }

  onExportClick(): void {
    const rows = this.allShipments.map((s) => ({
      classification: this.classify(s),
      businessUnit: s.businessUnit,
      category: s.category,
      blAwbNo: s.blAwbNo,
      fcl: `${s.fcl20Count}x20' ${s.fcl40Count}x40'`,
      eta: s.eta,
      currentStep: s.currentStepName,
      currentStepTarget: s.currentStepTargetDate,
      currentStepStatus: s.currentStepStatus,
      motSsmoAlert: s.motSsmoAlertMessage ?? ''
    }));
    exportToExcel('Shipment Pipeline Health', [
      { key: 'classification', label: 'Classification' },
      { key: 'businessUnit', label: 'BU' },
      { key: 'category', label: 'Cat' },
      { key: 'blAwbNo', label: 'BL/AWB No.' },
      { key: 'fcl', label: 'FCL' },
      { key: 'eta', label: 'ETA' },
      { key: 'currentStep', label: 'Current Step' },
      { key: 'currentStepTarget', label: 'Target Date' },
      { key: 'currentStepStatus', label: 'Status' },
      { key: 'motSsmoAlert', label: 'MOT/SSMO Alert' }
    ], rows);
  }
}
