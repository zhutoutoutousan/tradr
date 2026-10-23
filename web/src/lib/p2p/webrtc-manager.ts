"use client";

import { decodeSignal, encodeSignal } from './signal-codec';

// crypto.randomUUID only exists in secure contexts (not on plain-http LAN hosts)
const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export type PeerRole = 'host' | 'guest';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface PeerMessage {
  type: 'game-state' | 'chat' | 'action' | 'ready' | 'ping';
  payload: any;
  timestamp: number;
}

export interface CandidateSummary {
  total: number;
  ipv4: number;
  ipv6: number;
  mdns: number;
  srflx: number;
  relay: number;
}

export interface ConnectionDiagnostics {
  local: CandidateSummary;
  remote: CandidateSummary;
  iceState: string;
  connectionState: string;
  gatheringState: string;
}

export function summarizeCandidates(sdp: string): CandidateSummary {
  const out: CandidateSummary = { total: 0, ipv4: 0, ipv6: 0, mdns: 0, srflx: 0, relay: 0 };
  for (const [, line] of sdp.matchAll(/^a=candidate:(.*)$/gm)) {
    const parts = line.trim().split(/\s+/);
    const address = parts[4] ?? '';
    const type = parts[7];
    out.total++;
    if (type === 'srflx') out.srflx++;
    else if (type === 'relay') out.relay++;
    if (address.endsWith('.local')) out.mdns++;
    else if (address.includes(':')) out.ipv6++;
    else out.ipv4++;
  }
  return out;
}

export function describeSummary(s: CandidateSummary): string {
  if (s.total === 0) return 'keine Netzwerkadressen';
  const parts = [];
  if (s.ipv4) parts.push(`${s.ipv4}× IPv4`);
  if (s.ipv6) parts.push(`${s.ipv6}× IPv6`);
  if (s.mdns) parts.push(`${s.mdns}× .local`);
  if (s.srflx) parts.push(`${s.srflx}× öffentlich`);
  return parts.join(', ');
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Browsers hide LAN addresses behind random "<uuid>.local" mDNS names unless
 * the page has camera/mic access. Those names often can't be resolved between
 * devices (Windows firewalls, iOS <-> Chrome, client-isolated Wi-Fi), so ask for
 * the camera (needed for QR scanning anyway) before gathering candidates; then
 * the QR carries real LAN IPs.
 */
export async function unlockLanAddresses(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err) {
    console.warn('[WebRTC] Camera not granted, LAN addresses stay hidden (mDNS):', err);
    return false;
  }
}

export interface PeerInfo {
  id: string;
  role: PeerRole;
  username: string;
}

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private role: PeerRole | null = null;
  private localInfo: PeerInfo | null = null;
  private remoteInfo: PeerInfo | null = null;
  private onMessageCallbacks: Set<(message: PeerMessage) => void> = new Set();
  private onStateChangeCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private connectionState: ConnectionState = 'disconnected';
  private remoteSdp = '';

  constructor() {
    if (typeof window === 'undefined') return;
  }

  async createOffer(username: string): Promise<string> {
    this.disconnect();
    this.role = 'host';
    this.localInfo = { id: randomId(), role: 'host', username };
    await unlockLanAddresses();
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.setupPeerConnection();

    this.dataChannel = this.peerConnection.createDataChannel('game', {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.waitForICEGathering();

    console.log('[WebRTC] Local candidates:', describeSummary(summarizeCandidates(this.peerConnection.localDescription!.sdp)));
    return encodeSignal(this.peerConnection.localDescription!, username);
  }

  async acceptOffer(offerString: string, username: string): Promise<string> {
    const offerData = decodeSignal(offerString);
    this.disconnect();
    this.role = 'guest';
    this.localInfo = { id: randomId(), role: 'guest', username };
    this.remoteInfo = { id: randomId(), role: 'host', username: offerData.username };
    this.remoteSdp = offerData.description.sdp ?? '';
    console.log('[WebRTC] Offer candidates:', describeSummary(summarizeCandidates(this.remoteSdp)));

    await unlockLanAddresses();
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.setupPeerConnection();

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerData.description)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await this.waitForICEGathering();

    console.log('[WebRTC] Local candidates:', describeSummary(summarizeCandidates(this.peerConnection.localDescription!.sdp)));
    return encodeSignal(this.peerConnection.localDescription!, username);
  }

  async processAnswer(answerString: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('No peer connection');
    }

    const answerData = decodeSignal(answerString);
    this.remoteInfo = { id: randomId(), role: 'guest', username: answerData.username };
    this.remoteSdp = answerData.description.sdp ?? '';
    console.log('[WebRTC] Answer candidates:', describeSummary(summarizeCandidates(this.remoteSdp)));

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answerData.description)
    );
  }

  private setupPeerConnection() {
    const pc = this.peerConnection;
    if (!pc) return;

    pc.oniceconnectionstatechange = () => {
      if (this.peerConnection !== pc) return;
      const state = pc.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);

      // ICE can reach "connected" on the guest before the host has even scanned
      // the answer (the host replies to connectivity checks), so "connected" is
      // only reported once the data channel opens.
      // "disconnected" is often transient (ICE recovers on its own), only "failed" is final.
      if (state === 'failed') {
        this.setConnectionState('failed');
      } else if (state === 'checking') {
        this.setConnectionState('connecting');
      }
    };

    pc.onicecandidateerror = (event) => {
      const e = event as RTCPeerConnectionIceErrorEvent;
      if (e.errorCode !== 701) console.warn('[WebRTC] ICE candidate error:', e.errorCode, e.errorText);
    };

    pc.ondatachannel = (event) => {
      if (this.peerConnection !== pc) return;
      console.log('[WebRTC] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      if (this.dataChannel !== channel) return;
      console.log('[WebRTC] Data channel open');
      this.setConnectionState('connected');
    };

    channel.onclose = () => {
      if (this.dataChannel !== channel) return;
      console.log('[WebRTC] Data channel closed');
      this.setConnectionState('disconnected');
    };

    channel.onerror = (error) => {
      if (this.dataChannel !== channel) return;
      console.error('[WebRTC] Data channel error:', error);
      this.setConnectionState('failed');
    };

    channel.onmessage = (event) => {
      try {
        const message: PeerMessage = JSON.parse(event.data);
        this.notifyMessageListeners(message);
      } catch (error) {
        console.error('[WebRTC] Failed to parse message:', error);
      }
    };
  }

  private async waitForICEGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (this.peerConnection?.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection?.addEventListener('icegatheringstatechange', checkState);

      setTimeout(() => {
        this.peerConnection?.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 5000);
    });
  }

  sendMessage(message: Omit<PeerMessage, 'timestamp'>): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[WebRTC] Cannot send message, channel not open');
      return false;
    }

    try {
      const fullMessage: PeerMessage = {
        ...message,
        timestamp: Date.now()
      };
      this.dataChannel.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to send message:', error);
      return false;
    }
  }

  onMessage(callback: (message: PeerMessage) => void): () => void {
    this.onMessageCallbacks.add(callback);
    return () => this.onMessageCallbacks.delete(callback);
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.onStateChangeCallbacks.add(callback);
    callback(this.connectionState);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  private notifyMessageListeners(message: PeerMessage) {
    this.onMessageCallbacks.forEach(callback => callback(message));
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.onStateChangeCallbacks.forEach(callback => callback(state));
  }

  getDiagnostics(): ConnectionDiagnostics {
    const pc = this.peerConnection;
    return {
      local: summarizeCandidates(pc?.localDescription?.sdp ?? ''),
      remote: summarizeCandidates(this.remoteSdp),
      iceState: pc?.iceConnectionState ?? 'none',
      connectionState: pc?.connectionState ?? 'none',
      gatheringState: pc?.iceGatheringState ?? 'none',
    };
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.setConnectionState('disconnected');
    this.role = null;
    this.localInfo = null;
    this.remoteInfo = null;
    this.remoteSdp = '';
  }

  getLocalInfo(): PeerInfo | null {
    return this.localInfo;
  }

  getRemoteInfo(): PeerInfo | null {
    return this.remoteInfo;
  }

  getRole(): PeerRole | null {
    return this.role;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }
}

export const webrtcManager = new WebRTCManager();
