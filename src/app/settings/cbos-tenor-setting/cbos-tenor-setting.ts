import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { API_URL } from '../../api-config';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface CbosTenorSettingResponse {
  tenorId: number | null;
  tenorDays: number | null;
}

// A single, system-wide value — not per-shipment, not per-Tenor. Corp
// Finance picks one Tenor here to represent "the current CBOS Tenor";
// Bank Dues/Pay Bank Dues read this live every time they compute a CBOS
// Due Date, so a change here immediately applies to every running
// shipment — nothing to update per shipment. Expected to change rarely.
@Component({
  selector: 'app-cbos-tenor-setting',
  imports: [CommonModule, FormsModule],
  templateUrl: './cbos-tenor-setting.html'
})
export class CbosTenorSetting implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  tenors: LookupEntity[] = [];
  loading = true;
  error = '';
  saving = false;
  saved = false;

  tenorId: number | null = null;
  currentTenorDays: number | null = null;

  constructor(private http: HttpClient, private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('tenors').subscribe({
      next: (r) => { this.tenors = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<CbosTenorSettingResponse>(`${API_URL}/settings/cbos-tenor`).subscribe({
      next: (r) => {
        this.tenorId = r.tenorId;
        this.currentTenorDays = r.tenorDays;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load the CBOS Tenor setting.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  save(): void {
    this.saving = true;
    this.saved = false;
    this.http.put<CbosTenorSettingResponse>(`${API_URL}/settings/cbos-tenor`, { tenorId: this.tenorId }).subscribe({
      next: (r) => {
        this.saving = false;
        this.saved = true;
        this.currentTenorDays = r.tenorDays;
        setTimeout(() => { this.saved = false; this.cdr.markForCheck(); }, 2000);
        this.cdr.markForCheck();
      },
      error: () => { this.saving = false; this.error = 'Could not save this entry.'; this.cdr.markForCheck(); }
    });
  }
}
