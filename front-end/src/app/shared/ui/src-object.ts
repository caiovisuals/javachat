import { Directive, ElementRef, effect, inject, input } from '@angular/core'

@Directive({ selector: 'video[appSrcObject]' })
export class SrcObject {
    readonly appSrcObject = input<MediaStream | null>(null)

    private readonly element = inject<ElementRef<HTMLVideoElement>>(ElementRef)

    constructor() {
        effect(() => {
            this.element.nativeElement.srcObject = this.appSrcObject()
        })
    }
}