import { User } from '../user/user.model'

export type CallStatus = 'idle' | 'dialing' | 'ringing' | 'connecting' | 'active' | 'ended'

export type CallMedia = 'audio' | 'video'

export type CallEndReason = 'hangup' | 'declined' | 'unanswered' | 'failed' | 'busy'

interface SignalBase {
    callId: string
    conversationId: string
    /** Destinatário; o servidor entrega no `/user/queue/call` dele */
    to: string
    /** Preenchido pelo servidor na entrega, nunca pelo cliente */
    from?: User
}

export type CallSignal =
    | (SignalBase & { type: 'offer'; media: CallMedia; sdp: string })
    | (SignalBase & { type: 'answer'; sdp: string })
    | (SignalBase & { type: 'ice'; candidate: RTCIceCandidateInit })
    | (SignalBase & { type: 'hangup'; reason: CallEndReason })

/** Credenciais efêmeras de TURN, emitidas por chamada */
export interface IceServers {
    iceServers: RTCIceServer[]
}

export function endReasonLabel(reason: CallEndReason): string {
    switch (reason) {
        case 'declined':
            return 'Chamada recusada'
        case 'unanswered':
            return 'Ninguém atendeu'
        case 'busy':
            return 'A pessoa está em outra chamada'
        case 'failed':
            return 'A conexão caiu'
        default:
            return 'Chamada encerrada'
    }
}