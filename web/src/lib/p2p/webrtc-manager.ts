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

  constructor() {
    if (typeof window === 'undefined') return;
  }

  async createOffer(username: string): Promise<string> {
    this.role = 'host';
    this.localInfo = {
      id: randomId(),
      role: 'host',
      username
    };

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupPeerConnection();

    this.dataChannel = this.peerConnection.createDataChannel('game', {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.waitForICEGathering();

    return encodeSignal(this.peerConnection.localDescription!, username);
  }

  async acceptOffer(offerString: string, username: string): Promise<string> {
    this.role = 'guest';
    this.localInfo = {
      id: randomId(),
      role: 'guest',
      username
    };

    const offerData = decodeSignal(offerString);
    this.remoteInfo = { id: randomId(), role: 'host', username: offerData.username };

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupPeerConnection();

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerData.description)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await this.waitForICEGathering();

    return encodeSignal(this.peerConnection.localDescription!, username);
  }

  async processAnswer(answerString: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('No peer connection');
    }

    const answerData = decodeSignal(answerString);
    this.remoteInfo = { id: randomId(), role: 'guest', username: answerData.username };

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answerData.description)
    );
  }

  private setupPeerConnection() {
    if (!this.peerConnection) return;

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);

      // ICE can reach "connected" on the guest before the host has even scanned
      // the answer (the host replies to connectivity checks), so "connected" is
      // only reported once the data channel opens.
      if (state === 'failed' || state === 'disconnected') {
        this.setConnectionState('failed');
      } else if (state === 'checking') {
        this.setConnectionState('connecting');
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('[WebRTC] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('[WebRTC] Data channel open');
      this.setConnectionState('connected');
    };

    channel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
      this.setConnectionState('disconnected');
    };

    channel.onerror = (error) => {
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
