import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SectionLockInfo, SectionLockService } from './section-lock.service';

// Drop into any section header: <app-section-lock-badge [entityType]="'Shipment'" [entityId]="shipmentId" [sectionKey]="'forwarder'" [lockInfo]="locks['forwarder']" (locked)="onLockChange()" (unlocked)="onLockChange()" />
@Component({
  selector: 'app-section-lock-badge',
  imports: [CommonModule],
  template: `
    <span *ngIf="lockInfo" style="display:inline-flex; align-items:center; gap:6px; font-size:12px;">
      <span style="background:#e6f4ea; color:#1e7e34; padding:2px 8px; border-radius:4px;">
        🔒 Confirmed by {{ lockInfo.confirmedByName }} — {{ lockInfo.confirmedAt | date: 'MMM d, y' }}
      </span>
      <button *ngIf="canUnlock" (click)="doUnlock()" [disabled]="working"
        style="padding:2px 8px; background:transparent; color:#c0392b; border:1px solid #c0392b; border-radius:4px; cursor:pointer; font-size:11px;">
        {{ working ? '...' : 'Unlock' }}
      </button>
    </span>
    <button *ngIf="!lockInfo" (click)="doConfirm()" [disabled]="working"
      style="padding:2px 10px; background:#eee; color:#333; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
      {{ working ? '...' : '🔓 Confirm & Lock Section' }}
    </button>
  `
})
export class SectionLockBadge {
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

  @Input() entityType!: string;
  @Input() entityId!: number;
  @Input() sectionKey!: string;
  @Input() lockInfo: SectionLockInfo | null = null;

  @Output() locked = new EventEmitter<void>();
  @Output() unlocked = new EventEmitter<void>();

  working = false;

  constructor(private service: SectionLockService) {}

  get canUnlock(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  doConfirm(): void {
    this.working = true;
    this.service.confirm(this.entityType, this.entityId, this.sectionKey).subscribe({
      next: () => { this.working = false; this.locked.emit(); },
      error: () => { this.working = false; this.cdr.markForCheck(); }
    });
  }

  doUnlock(): void {
    if (!window.confirm(`Unlock this section for editing?`)) return;
    this.working = true;
    this.service.unlock(this.entityType, this.entityId, this.sectionKey).subscribe({
      next: () => { this.working = false; this.unlocked.emit(); },
      error: () => { this.working = false; this.cdr.markForCheck(); }
    });
  }
}
