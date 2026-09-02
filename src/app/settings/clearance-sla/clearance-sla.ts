import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { API_URL } from '../../api-config';

interface ClearanceSlaSetting {
  id: number;
  division: string;
  groupItem: string;
  sequenceOrder: number;
  targetDays: number;
  targetDaysEtd: number;
  isActive: boolean;
}

interface DivisionGroup {
  division: string;
  label: string;
  isRoute: boolean;
  // True only for PreClearanceDocs: the one group whose rows each carry
  // both a backward-from-ETA and a forward-from-ETD target, so the UI
  // shows two inputs and two subtotals instead of one.
  hasEtd: boolean;
  rows: ClearanceSlaSetting[];
}

// A section can span multiple underlying divisions (e.g. Common Task
// combines General's own steps with the separate PreClearanceDo
// division) — each row still carries its own true division for
// save/calculation purposes; this is purely a display grouping
// reflecting the natural end-to-end flow.
interface SlaSection {
  label: string;
  divisions: string[];
}

const SECTIONS: SlaSection[] = [
  { label: 'Pre-Clearance — Document Chain', divisions: ['PreClearanceDocs'] },
  { label: 'Pre-Clearance — Approvals (backward from ETA)', divisions: ['PreClearanceMot', 'PreClearanceSsmo'] },
  { label: 'Clearance — Common Task', divisions: ['PreClearanceDo', 'ClearanceGeneral'] },
  { label: 'Clearance — Route 1: Clear at Port', divisions: ['Route1'] },
  { label: 'Clearance — Route 2: FZ Deposit', divisions: ['Route2'] },
  { label: 'Clearance — Route 3: Clear from FZ', divisions: ['Route3'] }
];

const DIVISION_LABELS: Record<string, string> = {
  ClearanceGeneral: 'Clearance General (from previous step)',
  Route1: 'Route 1 — Clear at Port (from previous step)',
  Route2: 'Route 2 — FZ Deposit (from previous step)',
  Route3: 'Route 3 — Clear from FZ (from previous step)',
  PreClearanceDocs: 'Pre-Clearance — Document Chain',
  PreClearanceMot: 'MOT Approval (backward from ETA)',
  PreClearanceSsmo: 'SSMO Approval (backward from ETA)',
  PreClearanceDo: 'Manifest Process and ability to start process from Actual Arrival Data'
};

// Frontend-only display overrides for individual Document Chain row
// labels. The keys are the raw `groupItem` values stored in the database —
// backend logic (PreClearanceReadinessService.ActualFor) pattern-matches
// on those exact strings, so they can't be renamed at the source; this
// only changes what the Settings page shows.
const GROUP_ITEM_LABELS: Record<string, string> = {
  'Final Draft Received': 'Final Draft Received from Supplier',
  'Final Draft Confirmed': 'Final Draft Confirmed to Supplier',
  'FS Received': 'Original BL received from Supplier',
  'Original Shipment Set Received': 'Sender->Banking Doc Cycle'
};

// Divisions that combine with General's total to form a route's real
// duration. Pre-clearance tracks are standalone — measured backward from
// ETA, nothing to do with the forward clearance cascade at all.
const ROUTE_DIVISIONS = ['Route1', 'Route2', 'Route3'];

// The one division whose rows carry both an ETA-backward and an
// ETD-forward target (see DivisionGroup.hasEtd above).
const DUAL_TARGET_DIVISIONS = ['PreClearanceDocs'];

@Component({
  selector: 'app-clearance-sla',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clearance-sla.html'
})
export class ClearanceSla implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  sections: { label: string; groups: DivisionGroup[] }[] = [];
  loading = true;
  error = '';
  savingId: number | null = null;
  savedId: number | null = null;

  constructor(private http: HttpClient, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<ClearanceSlaSetting[]>(`${API_URL}/settings/clearance-sla-settings`).subscribe({
      next: (rows) => {
        const byDivision = new Map<string, ClearanceSlaSetting[]>();
        for (const row of rows) {
          if (!byDivision.has(row.division)) byDivision.set(row.division, []);
          byDivision.get(row.division)!.push(row);
        }

        this.sections = SECTIONS.map((section) => ({
          label: section.label,
          groups: section.divisions
            .filter((division) => byDivision.has(division))
            .map((division) => ({
              division,
              label: DIVISION_LABELS[division] ?? division,
              isRoute: ROUTE_DIVISIONS.includes(division),
              hasEtd: DUAL_TARGET_DIVISIONS.includes(division),
              rows: byDivision.get(division)!.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            }))
        }));

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load SLA settings.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get allGroups(): DivisionGroup[] {
    return this.sections.flatMap((s) => s.groups);
  }

  // Frontend-only display override for an individual row's label (see
  // GROUP_ITEM_LABELS) — falls back to the raw database value.
  rowLabel(groupItem: string): string {
    return GROUP_ITEM_LABELS[groupItem] ?? groupItem;
  }

  // Sum for this division only (the ETA-backward target for every row —
  // for a dual-target group this is only half the picture, see groupTotalEtd).
  groupTotal(group: DivisionGroup): number {
    return group.rows.reduce((sum, r) => sum + (r.targetDays || 0), 0);
  }

  // ETD-forward sum, only meaningful for a dual-target group (hasEtd).
  groupTotalEtd(group: DivisionGroup): number {
    return group.rows.reduce((sum, r) => sum + (r.targetDaysEtd || 0), 0);
  }

  // Clearance General's own subtotal, used to add onto each route's total.
  get generalTotal(): number {
    const general = this.allGroups.find((g) => g.division === 'ClearanceGeneral');
    return general ? this.groupTotal(general) : 0;
  }

  // Fully computed, never user-editable: General subtotal + this route's
  // own total — except Route 3, which starts from goods already cleared
  // into the FZ, so the General clearance steps don't reapply there.
  combinedRouteTotal(group: DivisionGroup): number {
    if (group.division === 'Route3') return this.groupTotal(group);
    return this.generalTotal + this.groupTotal(group);
  }

  save(setting: ClearanceSlaSetting): void {
    this.savingId = setting.id;
    this.savedId = null;
    this.http.put(`${API_URL}/settings/clearance-sla-settings/${setting.id}`, {
      targetDays: setting.targetDays,
      targetDaysEtd: setting.targetDaysEtd
    }).subscribe({
      next: () => {
        this.savingId = null;
        this.savedId = setting.id;
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingId = null;
        this.error = 'Could not save this SLA setting.';
        this.cdr.markForCheck();
      }
    });
  }
}
