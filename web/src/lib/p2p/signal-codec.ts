// Compact encoding of a WebRTC data-channel offer/answer for QR codes.
//
// A raw SDP (plus JSON + base64) is 1-3 KB, which needs a QR so dense that
// phone cameras can't read it. Only a handful of fields matter for a
// data-channel-only session, so we send those and rebuild the SDP on the
// other side. Format (fields separated by "~"):
//   T1~<o|a>~<ufrag>~<pwd>~<sha-256 fingerprint, base64>~<setup>~<mid>~<username>~<candidates...>
// Candidates: <h|s|r|p><address>,<port>  (UDP only).

const SEP = '~';
const SETUP: Record<string, string> = { actpass: 'p', active: 'a', passive: 's' };
const SETUP_REV: Record<string, string> = { p: 'actpass', a: 'active', s: 'passive' };
const CAND_TYPE: Record<string, string> = { host: 'h', srflx: 's', relay: 'r', prflx: 'p' };
const CAND_TYPE_REV: Record<string, string> = { h: 'host', s: 'srflx', r: 'relay', p: 'prflx' };
const TYPE_PREF: Record<string, number> = { host: 126, prflx: 110, srflx: 100, relay: 0 };

export interface DecodedSignal {
  description: RTCSessionDescriptionInit;
  username: string;
}

function hexToBase64(hex: string): string {
  const bytes = hex.split(':').map((h) => String.fromCharCode(parseInt(h, 16)));
  return btoa(bytes.join(''));
}

function base64ToHex(b64: string): string {
  return Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(':');
}

function encodeName(name: string): string {
  return encodeURIComponent(name).replace(/~/g, '%7E');
}

/** Returns null if the SDP has something the compact format can't represent. */
function compact(description: RTCSessionDescriptionInit, username: string): string | null {
  const sdp = description.sdp ?? '';
  const get = (key: string) => sdp.match(new RegExp(`^a=${key}:(.*)$`, 'm'))?.[1]?.trim();

  const ufrag = get('ice-ufrag');
  const pwd = get('ice-pwd');
  const fingerprint = get('fingerprint');
  const setup = get('setup');
  const mid = get('mid') ?? '0';
  if (!ufrag || !pwd || !fingerprint || !setup || !SETUP[setup]) return null;
  if ((sdp.match(/^m=/gm) ?? []).length !== 1 || !/^m=application .*webrtc-datachannel/m.test(sdp)) return null;

  const [algo, hex] = fingerprint.split(/\s+/);
  if (algo.toLowerCase() !== 'sha-256' || !hex) return null;
  if ([ufrag, pwd, mid].some((v) => v.includes(SEP))) return null;

  const candidates: string[] = [];
  for (const [, line] of sdp.matchAll(/^a=candidate:(.*)$/gm)) {
    const parts = line.trim().split(/\s+/);
    // foundation component transport priority address port "typ" type ...
    if (parts.length < 8 || parts[1] !== '1' || parts[2].toLowerCase() !== 'udp') continue;
    const type = CAND_TYPE[parts[7]];
    if (!type) continue;
    candidates.push(`${type}${parts[4]},${parts[5]}`);
  }

  return [
    'T1',
    description.type === 'offer' ? 'o' : 'a',
    ufrag,
    pwd,
    hexToBase64(hex),
    SETUP[setup],
    mid,
    encodeName(username),
    ...candidates,
  ].join(SEP);
}

function expand(code: string): DecodedSignal {
  const [version, type, ufrag, pwd, fp, setup, mid, name, ...candidates] = code.split(SEP);
  if (version !== 'T1' || !ufrag || !pwd || !fp || !SETUP_REV[setup]) {
    throw new Error('Invalid signal code');
  }

  const sessionId = Math.floor(Math.random() * 1e15);
  const lines = [
    'v=0',
    `o=- ${sessionId} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    `a=group:BUNDLE ${mid}`,
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
  ];
  candidates.forEach((c, i) => {
    const candType = CAND_TYPE_REV[c[0]];
    const sep = c.lastIndexOf(',');
    if (!candType || sep < 2) return;
    const address = c.slice(1, sep);
    const port = c.slice(sep + 1);
    const priority = (TYPE_PREF[candType] << 24) + ((65535 - i) << 8) + 255;
    const related = candType === 'host' ? '' : ' raddr 0.0.0.0 rport 0';
    lines.push(`a=candidate:${i + 1} 1 udp ${priority} ${address} ${port} typ ${candType}${related} generation 0`);
  });
  lines.push(
    `a=ice-ufrag:${ufrag}`,
    `a=ice-pwd:${pwd}`,
    'a=ice-options:trickle',
    `a=fingerprint:sha-256 ${base64ToHex(fp)}`,
    `a=setup:${SETUP_REV[setup]}`,
    `a=mid:${mid}`,
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    'a=end-of-candidates',
  );

  return {
    description: { type: type === 'o' ? 'offer' : 'answer', sdp: lines.join('\r\n') + '\r\n' },
    username: decodeURIComponent(name ?? ''),
  };
}

export function encodeSignal(description: RTCSessionDescriptionInit, username: string): string {
  return compact(description, username) ?? btoa(JSON.stringify({ offer: description, answer: description, info: { username } }));
}

export function decodeSignal(code: string): DecodedSignal {
  const trimmed = code.trim();
  if (trimmed.startsWith('T1' + SEP)) return expand(trimmed);

  // Legacy format: base64(JSON.stringify({ offer|answer, info }))
  const data = JSON.parse(atob(trimmed));
  const description = data.offer ?? data.answer;
  if (!description?.sdp) throw new Error('Invalid signal code');
  return { description, username: data.info?.username ?? '' };
}
