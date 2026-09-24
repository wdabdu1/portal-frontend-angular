import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { API_URL } from '../../api-config';
import { AuthService } from '../../auth/auth.service';

interface MotCertificateSettingsDto {
  id: number;
  expiryDays: number;
  updatedAt: string;
}

@Component({
  selector: 'app-mot-certificate-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mot-certificate-settings.html'
})
export class MotCertificateSettings implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  settings: MotCertificateSettingsDto | null = null;
  loading = true;
  saving = false;
  saved = false;
  error = '';

  constructor(private http: HttpClient, public auth: AuthService) {}

  // Same role set as the PUT endpoint (Manager/SuperUser) — reusing the
  // existing general-Settings check rather than adding a narrower one,
  // since they're identical here.
  get canEdit(): boolean {
    return this.auth.canSeeSettings();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<MotCertificateSettingsDto>(`${API_URL}/settings/mot-certificate-settings`).subscribe({
      next: (r) => { this.settings = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load MOT Certificate settings.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  save(): void {
    if (!this.settings || !this.canEdit) return;
    this.saving = true;
    this.http.put<MotCertificateSettingsDto>(`${API_URL}/settings/mot-certificate-settings`, {
      expiryDays: this.settings.expiryDays
    }).subscribe({
      next: (r) => {
        this.settings = r;
        this.saving = false;
        this.saved = true;
        setTimeout(() => { this.saved = false; this.cdr.markForCheck(); }, 2000);
        this.cdr.markForCheck();
      },
      error: () => { this.saving = false; this.error = 'Could not save.'; this.cdr.markForCheck(); }
    });
  }
}
