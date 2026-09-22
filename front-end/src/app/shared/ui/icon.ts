import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

export type IconName = keyof typeof PATHS

const SLASH = 'M3 3 21 21'

/** Traçados de 24×24, desenhados com `currentColor` para herdar a cor de quem usa */
const PATHS = {
    alert: [
        'M12 9v4',
        'M12 17h.01',
        'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
    ],
    back: ['M19 12H5', 'm12 19-7-7 7-7'],
    camera: [
        'M23 7l-7 5 7 5V7Z',
        'M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z',
    ],
    'camera-off': [
        'M23 7l-7 5 7 5V7Z',
        'M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z',
        SLASH,
    ],
    chat: [
        'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
    ],
    check: ['M20 6 9 17l-5-5'],
    home: ['m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z', 'M9 21v-7h6v7'],
    logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
    mic: [
        'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z',
        'M19 10v2a7 7 0 0 1-14 0v-2',
        'M12 19v3',
    ],
    'mic-off': [
        'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z',
        'M19 10v2a7 7 0 0 1-14 0v-2',
        'M12 19v3',
        SLASH,
    ],
    phone: [
        'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
    ],
    'phone-off': [
        'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
        SLASH,
    ],
    plus: ['M12 5v14', 'M5 12h14'],
    refresh: [
        'M23 4v6h-6',
        'M1 20v-6h6',
        'M3.5 9a9 9 0 0 1 14.9-3.4L23 10',
        'M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
    ],
    search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'm21 21-4.3-4.3'],
    send: ['M22 2 11 13', 'M22 2 15 22 11 13 2 9 22 2Z'],
    users: [
        'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
        'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
        'M23 21v-2a4 4 0 0 0-3-3.9',
        'M16 3.1a4 4 0 0 1 0 7.8',
    ],
    x: ['M18 6 6 18', 'M6 6l12 12'],
} as const

@Component({
    selector: 'app-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
            class="size-[1em]"
        >
            @for (path of paths(); track path) {
                <path [attr.d]="path" />
            }
        </svg>
    `,
})
export class Icon {
    readonly name = input.required<IconName>()

    protected readonly paths = computed<readonly string[]>(() => PATHS[this.name()])
}