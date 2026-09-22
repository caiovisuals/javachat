import { CdkTrapFocus } from '@angular/cdk/a11y'
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'

import { CallService } from '../../core/call/call-service'
import { endReasonLabel } from '../../core/call/call.model'
import { Avatar } from '../../shared/ui/avatar'
import { Icon } from '../../shared/ui/icon'
import { SrcObject } from '../../shared/ui/src-object'

/** Fica montado na moldura: uma chamada pode chegar em qualquer tela */
@Component({
    selector: 'app-call-overlay',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkTrapFocus, Avatar, Icon, SrcObject],
    templateUrl: './call-overlay.html',
})
export class CallOverlay {
    private readonly calls = inject(CallService)

    protected readonly status = this.calls.status
    protected readonly peer = this.calls.peer
    protected readonly media = this.calls.media
    protected readonly local = this.calls.local
    protected readonly remote = this.calls.remote
    protected readonly micOn = this.calls.micOn
    protected readonly cameraOn = this.calls.cameraOn
    protected readonly error = this.calls.error

    protected readonly duration = computed(() => {
        const total = this.calls.seconds()
        const minutes = Math.floor(total / 60)
            .toString()
            .padStart(2, '0')
        const seconds = (total % 60).toString().padStart(2, '0')
        return `${minutes}:${seconds}`
    })

    protected readonly headline = computed(() => {
        switch (this.status()) {
            case 'dialing':
                return 'Chamando…'
            case 'connecting':
                return 'Conectando…'
            case 'active':
                return this.duration()
            default:
                return ''
        }
    })

    protected readonly endedLabel = computed(() => endReasonLabel(this.calls.endedBecause()))

    protected accept(): void {
        void this.calls.accept()
    }

    protected decline(): void {
        this.calls.decline()
    }

    protected hangup(): void {
        this.calls.hangup()
    }

    protected toggleMic(): void {
        this.calls.toggleMic()
    }

    protected toggleCamera(): void {
        this.calls.toggleCamera()
    }

    protected dismiss(): void {
        this.calls.dismiss()
    }
}