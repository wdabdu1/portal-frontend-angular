import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { API_URL } from '../../api-config';

interface ClearanceSlaSetting {
  id: number;
  milestoneKey: string;
  label: string;
  targetDays: number;
  isActive: boolean;
}

@Component({
  selector: 'app-clearance-sla',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clearance-sla.html'
})
export class ClearanceSla implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  settings: ClearanceSlaSetting[] = [];
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
      next: (r) => { this.settings = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load SLA settings.'; this.loading = false; this.cdr.markForCheck(); }
    });
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
