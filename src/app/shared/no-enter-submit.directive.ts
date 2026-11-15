import { Directive, HostListener } from '@angular/core';

// Put on a <form>: pressing Enter inside a text/number/date box or a dropdown no longer
// submits (saves) the form. Typing Tab is the way to move on. Enter still works on
// buttons and in multi-line text areas.
@Directive({
  selector: 'form[appNoEnterSubmit]'
})
export class NoEnterSubmitDirective {
  @HostListener('keydown.enter', ['$event'])
  onEnter(event: Event): void {
    const t = event.target as HTMLElement | null;
    if (!t) return;
    const tag = t.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    if (tag === 'INPUT') {
      const type = (t as HTMLInputElement).type;
      if (type === 'submit' || type === 'button') return;
    }
    event.preventDefault();
  }
}
