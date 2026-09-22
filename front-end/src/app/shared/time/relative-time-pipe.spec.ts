import { RelativeTimePipe } from './relative-time-pipe'

describe('RelativeTimePipe', () => {
    const pipe = new RelativeTimePipe()

    const isoMinutosAtras = (minutes: number): string =>
        new Date(Date.now() - minutes * 60_000).toISOString()

    it('não mostra nada sem data', () => {
        expect(pipe.transform(null)).toBe('')
        expect(pipe.transform(undefined)).toBe('')
        expect(pipe.transform('data inválida')).toBe('')
    })

    it('chama o que acabou de acontecer de agora', () => {
        expect(pipe.transform(isoMinutosAtras(0))).toBe('agora')
    })

    it('conta os minutos dentro da primeira hora', () => {
        expect(pipe.transform(isoMinutosAtras(5))).toBe('há 5 min')
        expect(pipe.transform(isoMinutosAtras(59))).toBe('há 59 min')
    })

    it('mostra a hora para o resto do dia de hoje', () => {
        const hoje = new Date()
        hoje.setHours(9, 5, 0, 0)

        // Só vale se 9h05 já passou hoje, fora disso a data cai em "ontem"
        if (hoje.getTime() < Date.now() - 60 * 60_000) {
            expect(pipe.transform(hoje.toISOString())).toBe('09:05')
        }
    })

    it('resume o dia anterior como ontem', () => {
        const ontem = new Date()
        ontem.setDate(ontem.getDate() - 1)
        ontem.setHours(12, 0, 0, 0)

        expect(pipe.transform(ontem.toISOString())).toBe('ontem')
    })

    it('usa a data para o que é mais antigo', () => {
        const antes = new Date()
        antes.setDate(antes.getDate() - 10)

        expect(pipe.transform(antes.toISOString())).toMatch(/^\d{2}\/\d{2}$/)
    })
})