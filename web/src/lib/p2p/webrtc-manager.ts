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

/** The id a guest uses for its single link to the host. */
export const HOST_PEER_ID = 'host';

interface LinkEvents {
  onIceState: (link: PeerLink, state: RTCIceConnectionState) => void;
  onOpen: (link: PeerLink) => void;
  onClose: (link: PeerLink) => void;
  onMessage: (link: PeerLink, message: PeerMessage) => void;
}

/** One RTCPeerConnection + data channel to a single remote device. */
class PeerLink {
  readonly pc: RTCPeerConnection;
  channel: RTCDataChannel | null = null;
  remoteName = '';
  remoteSdp = '';
  open = false;
  closed = false;

  constructor(readonly id: string, private events: LinkEvents) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;
    pc.oniceconnectionstatechange = () => {
      if (this.closed) return;
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      this.events.onIceState(this, pc.iceConnectionState);
    };
    pc.onicecandidateerror = (event) => {
      const e = event as RTCPeerConnectionIceErrorEvent;
      if (e.errorCode !== 701) console.warn('[WebRTC] ICE candidate error:', e.errorCode, e.errorText);
    };
    pc.ondatachannel = (event) => {
      if (this.closed) return;
      console.log('[WebRTC] Data channel received');
      this.attach(event.channel);
    };
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
    };
  }

  attach(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () => {
      if (this.closed || this.channel !== channel) return;
      console.log('[WebRTC] Data channel open');
      this.open = true;
      this.events.onOpen(this);
    };
    channel.onclose = () => {
      if (this.closed || this.channel !== channel) return;
      console.log('[WebRTC] Data channel closed');
      this.close();
    };
    channel.onerror = (error) => {
      if (this.closed || this.channel !== channel) return;
      console.error('[WebRTC] Data channel error:', error);
    };
    channel.onmessage = (event) => {
      try {
        this.events.onMessage(this, JSON.parse(event.data) as PeerMessage);
      } catch (error) {
        console.error('[WebRTC] Failed to parse message:', error);
      }
    };
  }

  async gather(): Promise<void> {
    const pc = this.pc;
    if (pc.iceGatheringState === 'complete') return;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (pc.iceGatheringState === 'complete') done();
      };
      const timer = setTimeout(() => done(), 5000);
      const done = () => {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      };
      pc.addEventListener('icegatheringstatechange', check);
    });
  }

  send(text: string): boolean {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    try {
      this.channel.send(text);
      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to send message:', error);
      return false;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    const wasOpen = this.open;
    this.open = false;
    try {
      this.channel?.close();
    } catch {}
    this.pc.close();
    if (wasOpen) this.events.onClose(this);
  }

  diagnostics(): ConnectionDiagnostics {
    return {
      local: summarizeCandidates(this.pc.localDescription?.sdp ?? ''),
      remote: summarizeCandidates(this.remoteSdp),
      iceState: this.pc.iceConnectionState,
      connectionState: this.pc.connectionState,
      gatheringState: this.pc.iceGatheringState,
    };
  }
}

/**
 * Star topology: a guest has one link to the host, the host has one link per
 * guest and can keep issuing new offers to add more players. The connection
 * state reported via onStateChange is that of the handshake in progress.
 */
class WebRTCManager {
  private links = new Map<string, PeerLink>();
  private pending: PeerLink | null = null;
  private lastConnected: PeerLink | null = null;
  private role: PeerRole | null = null;
  private localInfo: PeerInfo | null = null;
  private onMessageCallbacks: Set<(message: PeerMessage, from: string) => void> = new Set();
  private onStateChangeCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private onPeersChangeCallbacks: Set<(peers: PeerInfo[]) => void> = new Set();
  private connectionState: ConnectionState = 'disconnected';
  private nextGuest = 1;
  private offerToken = 0;

  private events: LinkEvents = {
    onIceState: (link, state) => {
      if (link !== this.pending) return;
      // ICE can reach "connected" on the guest before the host has even scanned
      // the answer (the host replies to connectivity checks), so "connected" is
      // only reported once the data channel opens.
      // "disconnected" is often transient (ICE recovers on its own), only "failed" is final.
      if (state === 'failed') this.setConnectionState('failed');
      else if (state === 'checking') this.setConnectionState('connecting');
    },
    onOpen: (link) => {
      this.links.set(link.id, link);
      this.lastConnected = link;
      if (this.pending === link) {
        this.pending = null;
        this.setConnectionState('connected');
      }
      this.notifyPeers();
    },
    onClose: (link) => {
      if (this.links.get(link.id) === link) this.links.delete(link.id);
      if (this.role === 'guest') this.setConnectionState('disconnected');
      this.notifyPeers();
    },
    onMessage: (link, message) => {
      this.onMessageCallbacks.forEach((cb) => cb(message, link.id));
    },
  };

  /** Host: create an offer for one more guest. Already connected guests stay connected. */
  async createOffer(username: string): Promise<string> {
    if (this.role !== 'host') this.disconnect();
    this.cancelPending();
    this.role = 'host';
    this.localInfo = { id: HOST_PEER_ID, role: 'host', username };
    this.setConnectionState('disconnected');
    const token = this.offerToken;
    await unlockLanAddresses();
    if (token !== this.offerToken) throw new Error('Offer cancelled');
    const link = new PeerLink(`p${this.nextGuest++}-${randomId().slice(0, 4)}`, this.events);
    this.pending = link;
    link.attach(link.pc.createDataChannel('game', { ordered: true }));
    await link.pc.setLocalDescription(await link.pc.createOffer());
    await link.gather();
    if (link.closed) throw new Error('Offer cancelled');
    console.log('[WebRTC] Local candidates:', describeSummary(summarizeCandidates(link.pc.localDescription!.sdp)));
    return encodeSignal(link.pc.localDescription!, username);
  }

  async acceptOffer(offerString: string, username: string): Promise<string> {
    const offerData = decodeSignal(offerString);
    this.disconnect();
    this.role = 'guest';
    this.localInfo = { id: randomId(), role: 'guest', username };
    await unlockLanAddresses();
    const link = new PeerLink(HOST_PEER_ID, this.events);
    link.remoteName = offerData.username;
    link.remoteSdp = offerData.description.sdp ?? '';
    console.log('[WebRTC] Offer candidates:', describeSummary(summarizeCandidates(link.remoteSdp)));
    this.pending = link;
    await link.pc.setRemoteDescription(new RTCSessionDescription(offerData.description));
    await link.pc.setLocalDescription(await link.pc.createAnswer());
    await link.gather();
    console.log('[WebRTC] Local candidates:', describeSummary(summarizeCandidates(link.pc.localDescription!.sdp)));
    return encodeSignal(link.pc.localDescription!, username);
  }

  async processAnswer(answerString: string): Promise<void> {
    const link = this.pending;
    if (!link || this.role !== 'host') throw new Error('No peer connection');
    const answerData = decodeSignal(answerString);
    link.remoteName = answerData.username;
    link.remoteSdp = answerData.description.sdp ?? '';
    console.log('[WebRTC] Answer candidates:', describeSummary(summarizeCandidates(link.remoteSdp)));
    await link.pc.setRemoteDescription(new RTCSessionDescription(answerData.description));
  }

  /** Abort the handshake in progress without touching connected peers. */
  cancelPending() {
    const link = this.pending;
    this.pending = null;
    this.offerToken++;
    link?.close();
    this.setConnectionState('disconnected');
  }

  /** Send to one peer, or to every connected peer when `to` is omitted. */
  sendMessage(message: Omit<PeerMessage, 'timestamp'>, to?: string): boolean {
    const text = JSON.stringify({ ...message, timestamp: Date.now() });
    if (to) return this.links.get(to)?.send(text) ?? false;
    let sent = false;
    for (const link of this.links.values()) sent = link.send(text) || sent;
    if (!sent) console.warn('[WebRTC] Cannot send message, no open channel');
    return sent;
  }

  onMessage(callback: (message: PeerMessage, from: string) => void): () => void {
    this.onMessageCallbacks.add(callback);
    return () => this.onMessageCallbacks.delete(callback);
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.onStateChangeCallbacks.add(callback);
    callback(this.connectionState);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  onPeersChange(callback: (peers: PeerInfo[]) => void): () => void {
    this.onPeersChangeCallbacks.add(callback);
    callback(this.getPeers());
    return () => this.onPeersChangeCallbacks.delete(callback);
  }

  getPeers(): PeerInfo[] {
    const role: PeerRole = this.role === 'host' ? 'guest' : 'host';
    return [...this.links.values()].map((l) => ({ id: l.id, role, username: l.remoteName }));
  }

  private notifyPeers() {
    const peers = this.getPeers();
    this.onPeersChangeCallbacks.forEach((cb) => cb(peers));
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.onStateChangeCallbacks.forEach(callback => callback(state));
  }

  getDiagnostics(): ConnectionDiagnostics {
    const link = this.pending ?? this.lastConnected;
    if (link) return link.diagnostics();
    const none = summarizeCandidates('');
    return { local: none, remote: none, iceState: 'none', connectionState: 'none', gatheringState: 'none' };
  }

  /** Close every link. */
  disconnect() {
    this.offerToken++;
    this.pending?.close();
    this.pending = null;
    const links = [...this.links.values()];
    this.links.clear();
    links.forEach((l) => l.close());
    this.lastConnected = null;
    this.setConnectionState('disconnected');
    this.role = null;
    this.localInfo = null;
    this.notifyPeers();
  }

  getLocalInfo(): PeerInfo | null {
    return this.localInfo;
  }

  /** The peer whose handshake completed most recently. */
  getRemoteInfo(): PeerInfo | null {
    const l = this.lastConnected;
    if (!l) return null;
    return { id: l.id, role: this.role === 'host' ? 'guest' : 'host', username: l.remoteName };
  }

  getRole(): PeerRole | null {
    return this.role;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** True while at least one peer is connected. */
  isConnected(): boolean {
    return this.links.size > 0;
  }
}

export const webrtcManager = new WebRTCManager();
