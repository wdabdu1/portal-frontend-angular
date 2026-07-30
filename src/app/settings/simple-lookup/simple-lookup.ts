import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

export type FieldType = 'text' | 'number' | 'checkbox' | 'date';
export type FieldFormat = 'percent';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  readonly?: boolean;
  format?: FieldFormat;
}

@Component({
  selector: 'app-simple-lookup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './simple-lookup.html'
})
export class SimpleLookup implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  title = '';
  resource = '';
  fields: FieldConfig[] = [];

  items: LookupEntity[] = [];
  newItem: Record<string, unknown> = {};
  loading = true;
  error = '';

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  get editableFields(): FieldConfig[] {
    return this.fields.filter((f) => !f.readonly);
  }

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.title = data['title'];
    this.resource = data['resource'];
    this.fields = data['fields'];
    this.resetNewItem();
    this.load();
  }

  resetNewItem(): void {
    this.newItem = {};
    for (const f of this.editableFields) {
      this.newItem[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? null : '';
    }
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<LookupEntity>(this.resource).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = `Could not load ${this.title}.`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  add(): void {
    const payload = { ...this.newItem, isActive: true };
    this.lookups.create(this.resource, payload).subscribe({
      next: () => {
        this.resetNewItem();
        this.load();
      },
      error: () => {
        this.error = `Could not create ${this.title} entry.`;
        this.cdr.markForCheck();
      }
    });
  }

  displayValue(item: LookupEntity, field: FieldConfig): string {
    const raw = item[field.key];
    if (field.format === 'percent') {
      const num = Number(raw) || 0;
      return `${(num * 100).toFixed(2)}%`;
    }
    return String(raw ?? '');
  }
}
