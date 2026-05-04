export type SignalingPeerRole = 'host' | 'guest';

export type SignalingMessage =
  | {
    readonly peerId: string;
    readonly role: SignalingPeerRole;
    readonly roomId: string;
    readonly type: 'peer-joined';
  }
  | {
    readonly peerId: string;
    readonly roomId: string;
    readonly type: 'peer-left';
  }
  | {
    readonly reason: 'room-full';
    readonly roomId: string;
    readonly type: 'room-full';
  }
  | {
    readonly description: unknown;
    readonly fromPeerId: string;
    readonly roomId: string;
    readonly toPeerId?: string;
    readonly type: 'offer' | 'answer';
  }
  | {
    readonly candidate: unknown;
    readonly fromPeerId: string;
    readonly roomId: string;
    readonly toPeerId?: string;
    readonly type: 'ice-candidate';
  };
