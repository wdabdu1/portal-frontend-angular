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
  isActive: boolean;
}

interface DivisionGroup {
  division: string;
  label: string;
  rows: ClearanceSlaSetting[];
}

const DIVISION_LABELS: Record<string, string> = {
  ClearanceGeneral: 'Clearance General',
  Route1: 'Route 1 — Clear at Port',
  Route2: 'Route 2 — FZ Deposit',
  Route3: 'Route 3 — Clear from FZ'
};

@Component({
  selector: 'app-clearance-sla',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clearance-sla.html'
})
export class ClearanceSla implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  groups: DivisionGroup[] = [];
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
        this.groups = Array.from(byDivision.entries()).map(([division, groupRows]) => ({
          division,
          label: DIVISION_LABELS[division] ?? division,
          rows: groupRows.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
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

  groupTotal(group: DivisionGroup): number {
    return group.rows.reduce((sum, r) => sum + (r.targetDays || 0), 0);
  }

  save(setting: ClearanceSlaSetting): void {
    this.savingId = setting.id;
    this.savedId = null;
    this.http.put(`${API_URL}/settings/clearance-sla-settings/${setting.id}`, { targetDays: setting.targetDays }).subscribe({
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
