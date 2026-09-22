import { Pipe, PipeTransform } from '@angular/core'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const DIA_COM_ANO = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
})

/**
 * Marca de tempo curta, do jeito que um chat mostra: agora, hora, "ontem" e depois a data
 */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (!value) {
            return ''
        }

        const instant = Date.parse(value)
        if (!Number.isFinite(instant)) {
            return ''
        }

        const date = new Date(instant)
        const elapsed = Date.now() - instant

        if (elapsed < MINUTE) {
            return 'agora'
        }
        if (elapsed < HOUR) {
            return `há ${Math.floor(elapsed / MINUTE)} min`
        }
        if (isSameDay(date, new Date())) {
            return HORA.format(date)
        }
        if (isYesterday(date)) {
            return 'ontem'
        }
        if (elapsed < 365 * DAY) {
            return DIA.format(date)
        }
        return DIA_COM_ANO.format(date)
    }
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function isYesterday(date: Date): boolean {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return isSameDay(date, yesterday)
}