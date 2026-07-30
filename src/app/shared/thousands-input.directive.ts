import { Directive, ElementRef, HostListener, Renderer2, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appThousands]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ThousandsInputDirective), multi: true }]
})
export class ThousandsInputDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  writeValue(value: number | null): void {
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    const raw = value.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
    this.renderer.setProperty(this.el.nativeElement, 'value', raw);
    this.onChange(raw === '' ? null : Number(raw));
  }

  @HostListener('blur')
  onBlur(): void {
    const raw = this.el.nativeElement.value.replace(/,/g, '');
    const numeric = raw === '' ? null : Number(raw);
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(numeric));
    this.onTouched();
  }

  private format(value: number | null): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
}
