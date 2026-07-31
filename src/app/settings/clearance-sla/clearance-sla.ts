import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface ClearanceSlaSetting extends LookupEntity {
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

  newMilestoneKey = '';
  newLabel = '';
  newTargetDays: number | null = null;

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<ClearanceSlaSetting>('clearance-sla-settings').subscribe({
      next: (r) => { this.settings = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load SLA settings.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  add(): void {
    if (!this.newMilestoneKey || !this.newLabel || !this.newTargetDays) return;
    this.lookups.create<ClearanceSlaSetting>('clearance-sla-settings', {
      milestoneKey: this.newMilestoneKey, label: this.newLabel, targetDays: this.newTargetDays, isActive: true
    }).subscribe({
      next: () => {
        this.newMilestoneKey = '';
        this.newLabel = '';
        this.newTargetDays = null;
        this.load();
      },
      error: () => { this.error = 'Could not create SLA setting.'; this.cdr.markForCheck(); }
    });
  }
}
