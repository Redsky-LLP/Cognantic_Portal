import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

export interface EndingWarning {
  sessionId: string
  minutesRemaining: number
  cost10: number
  cost15: number
}

export interface ExtensionConfirmed {
  extensionMinutes: number
  newEndTime: string
  amountCharged: number
}

export function useSessionHub(
  sessionId: string | null,
  role: 'patient' | 'clinician',
  onWarning: (w: EndingWarning) => void,
  onExtensionOffer: (offer: { extensionId: string; minutes: number; cost: number }) => void,
  onExtensionResponse: (res: { accepted: boolean; extensionId: string }) => void,
  onExtensionConfirmed: (c: ExtensionConfirmed) => void,
) {
  const connRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7208'}/hubs/session`, {
        accessTokenFactory: () => localStorage.getItem('cognantic_token') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    conn.on('SessionEndingWarning', onWarning)
    conn.on('ExtensionOffer',       onExtensionOffer)
    conn.on('ExtensionResponse',    onExtensionResponse)
    conn.on('ExtensionConfirmed',   onExtensionConfirmed)

    conn.start()
      .then(() => conn.invoke('JoinSession', sessionId, role))
      .catch(console.error)

    connRef.current = conn

    return () => { conn.stop() }
  }, [sessionId])

  const respondToExtension = useCallback(
    (accepted: boolean, extensionId: string) => {
      connRef.current?.invoke('RespondToExtension',
        sessionId, accepted, extensionId)
    }, [sessionId])

  return { respondToExtension }
}