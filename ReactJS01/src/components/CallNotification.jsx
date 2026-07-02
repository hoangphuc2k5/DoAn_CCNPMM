import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Modal, Spin } from 'antd';
import {
  AudioMutedOutlined,
  AudioOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useCall } from './context/call.context';
import { useSocket } from './context/socket.context';
import { getMediaUrl } from '../util/media';
import { acceptCallApi, declineCallApi, hangupCallApi } from '../util/api';

const getInitial = (value, fallback = '?') => {
  const text = String(value || '').trim();
  return text ? text[0].toUpperCase() : fallback;
};

const getStatusText = (status) => {
  switch (status) {
    case 'ringing':
      return 'Dang do chuong';
    case 'connecting':
      return 'Dang ket noi';
    case 'active':
      return 'Dang goi';
    default:
      return 'Cuoc goi';
  }
};

const CallNotification = () => {
  const { callSession, setCallSession, clearCallSession, stopAllSounds } = useCall();
  const { socket } = useSocket();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const cleanupCallResources = useCallback(
    (callId = callSession?.callId) => {
      if (socket && callId) {
        socket.emit('call:leave', { callId });
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      remoteStreamRef.current = null;
      pendingIceCandidatesRef.current = [];
      setHasRemoteStream(false);
      setIsMicMuted(false);
      setIsCameraOff(false);

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    },
    [callSession?.callId, socket]
  );

  const ensureLocalStream = useCallback(async (mediaType) => {
    if (localStreamRef.current) return localStreamRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trinh duyet khong ho tro camera/microphone');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaType === 'video',
    });

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setIsMicMuted(false);
    setIsCameraOff(false);
    return stream;
  }, []);

  const attachLocalTracks = useCallback((peerConnection) => {
    const stream = localStreamRef.current;
    if (!peerConnection || !stream) return;

    const existingTrackIds = new Set(
      peerConnection.getSenders().map((sender) => sender.track?.id).filter(Boolean)
    );

    stream.getTracks().forEach((track) => {
      if (!existingTrackIds.has(track.id)) {
        peerConnection.addTrack(track, stream);
      }
    });
  }, []);

  const flushPendingIceCandidates = useCallback(async (peerConnection) => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate && socket && callSession?.callId) {
        socket.emit('call:ice-candidate', {
          callId: callSession.callId,
          candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      event.streams[0]?.getTracks?.().forEach((track) => {
        const exists = remoteStreamRef.current
          .getTracks()
          .some((currentTrack) => currentTrack.id === track.id);
        if (!exists) remoteStreamRef.current.addTrack(track);
      });

      setHasRemoteStream(true);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play?.().catch(() => undefined);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        cleanupCallResources();
      }
    };

    return peerConnection;
  }, [callSession?.callId, cleanupCallResources, socket]);

  const acceptIncomingCall = useCallback(async () => {
    if (!callSession?.callId) return;

    setIsInitializing(true);
    try {
      await ensureLocalStream(callSession.type);
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;
      attachLocalTracks(peerConnection);

      socket?.emit('call:join', { callId: callSession.callId });
      setCallSession((prev) => (prev ? { ...prev, status: 'connecting' } : prev));

      const res = await acceptCallApi(callSession.callId);
      if (!res || res.EC !== 0) {
        throw new Error(res?.EM || 'Khong the chap nhan cuoc goi');
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
      try {
        await declineCallApi(callSession.callId);
      } catch (declineError) {
        console.error(declineError);
      }
      cleanupCallResources();
      clearCallSession();
    } finally {
      setIsInitializing(false);
    }
  }, [
    attachLocalTracks,
    callSession,
    cleanupCallResources,
    clearCallSession,
    createPeerConnection,
    ensureLocalStream,
    setCallSession,
    socket,
  ]);

  const declineIncomingCall = useCallback(async () => {
    if (callSession?.callId) {
      try {
        await declineCallApi(callSession.callId);
      } catch (error) {
        console.error(error);
      }
    }
    cleanupCallResources();
    clearCallSession();
  }, [callSession?.callId, cleanupCallResources, clearCallSession]);

  const endCurrentCall = useCallback(async () => {
    if (callSession?.callId) {
      try {
        await hangupCallApi(callSession.callId);
      } catch (error) {
        console.error(error);
      }
    }
    cleanupCallResources();
    clearCallSession();
  }, [callSession?.callId, cleanupCallResources, clearCallSession]);

  const toggleMicrophone = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextEnabled = isMicMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setIsMicMuted(!nextEnabled);
  }, [isMicMuted]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextEnabled = isCameraOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setIsCameraOff(!nextEnabled);
  }, [isCameraOff]);

  useEffect(() => {
    if (!socket || !callSession?.callId) return undefined;

    const handleCallAccepted = async ({ _id } = {}) => {
      if (_id?.toString() !== callSession.callId?.toString()) return;

      stopAllSounds();
      setCallSession((prev) => (prev ? { ...prev, status: 'active' } : prev));

      if (callSession.role !== 'caller') return;

      setIsInitializing(true);
      try {
        socket.emit('call:join', { callId: callSession.callId });
        await ensureLocalStream(callSession.type);

        if (!peerConnectionRef.current) {
          peerConnectionRef.current = createPeerConnection();
        }

        attachLocalTracks(peerConnectionRef.current);
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('call:offer', { callId: callSession.callId, offer });
      } catch (error) {
        console.error('Failed to create call offer:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    socket.on('call:accepted', handleCallAccepted);
    return () => socket.off('call:accepted', handleCallAccepted);
  }, [
    attachLocalTracks,
    callSession,
    createPeerConnection,
    ensureLocalStream,
    setCallSession,
    socket,
    stopAllSounds,
  ]);

  useEffect(() => {
    if (!socket || !callSession?.callId) return undefined;

    const sameCall = (callId) => callId?.toString() === callSession.callId?.toString();

    const handleCallOffer = async ({ callId, offer }) => {
      if (!sameCall(callId) || callSession.role !== 'callee') return;

      try {
        if (!peerConnectionRef.current) {
          await ensureLocalStream(callSession.type);
          peerConnectionRef.current = createPeerConnection();
          attachLocalTracks(peerConnectionRef.current);
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIceCandidates(peerConnectionRef.current);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('call:answer', { callId, answer });
        setCallSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
      } catch (error) {
        console.error('Failed to handle call offer:', error);
      }
    };

    const handleCallAnswer = async ({ callId, answer }) => {
      if (!sameCall(callId) || callSession.role !== 'caller' || !peerConnectionRef.current) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(peerConnectionRef.current);
        setCallSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
      } catch (error) {
        console.error('Failed to handle call answer:', error);
      }
    };

    const handleCallIceCandidate = async ({ callId, candidate }) => {
      if (!sameCall(callId) || !candidate || !peerConnectionRef.current) return;

      try {
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingIceCandidatesRef.current.push(candidate);
        }
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    };

    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleCallIceCandidate);
    return () => {
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleCallIceCandidate);
    };
  }, [
    attachLocalTracks,
    callSession,
    createPeerConnection,
    ensureLocalStream,
    flushPendingIceCandidates,
    setCallSession,
    socket,
  ]);

  useEffect(() => {
    if (!callSession?.callId) return undefined;
    const callId = callSession.callId;
    return () => cleanupCallResources(callId);
  }, [callSession?.callId, cleanupCallResources]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
  });

  if (!callSession) return null;

  const isIncomingRinging = callSession.role === 'callee' && callSession.status === 'ringing';
  const isVideoCall = callSession.type === 'video';

  return (
    <Modal
      title={isIncomingRinging ? 'Cuoc goi den' : 'Cuoc goi'}
      open={Boolean(callSession)}
      footer={null}
      maskClosable={false}
      closable={false}
      width={isVideoCall ? 760 : 460}
      style={{ top: 24 }}
      zIndex={10000}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={52} src={getMediaUrl(callSession.peerUser?.avatar)}>
            {getInitial(callSession.peerUser?.name)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {callSession.peerUser?.name || 'Nguoi dung'}
            </div>
            <div style={{ color: '#6b7280' }}>
              {getStatusText(callSession.status)} - {isVideoCall ? 'Video' : 'Audio'}
            </div>
          </div>
        </div>

        {isInitializing ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <Spin size='large' />
            <div style={{ marginTop: 12, color: '#6b7280' }}>Dang khoi tao media...</div>
          </div>
        ) : isVideoCall ? (
          <div
            style={{
              position: 'relative',
              minHeight: 420,
              overflow: 'hidden',
              borderRadius: 12,
              background: '#111827',
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: 420, objectFit: 'cover' }}
            />
            {!hasRemoteStream && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                Dang cho ket noi media...
              </div>
            )}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                width: 150,
                height: 190,
                display: isCameraOff ? 'none' : 'block',
                objectFit: 'cover',
                borderRadius: 10,
                border: '2px solid #fff',
                background: '#000',
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 12px' }}>
            <PhoneOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            <div style={{ marginTop: 12, fontWeight: 700 }}>{getStatusText(callSession.status)}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!isIncomingRinging && (
            <Button shape='round' onClick={toggleMicrophone}>
              {isMicMuted ? <AudioMutedOutlined /> : <AudioOutlined />} {isMicMuted ? 'Bat mic' : 'Tat mic'}
            </Button>
          )}
          {!isIncomingRinging && isVideoCall && (
            <Button shape='round' onClick={toggleCamera}>
              <VideoCameraOutlined /> {isCameraOff ? 'Bat camera' : 'Tat camera'}
            </Button>
          )}
          {isIncomingRinging ? (
            <>
              <Button danger shape='round' onClick={declineIncomingCall}>
                Tu choi
              </Button>
              <Button type='primary' shape='round' onClick={acceptIncomingCall}>
                Tra loi
              </Button>
            </>
          ) : (
            <Button danger type='primary' shape='round' onClick={endCurrentCall}>
              Ket thuc
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CallNotification;