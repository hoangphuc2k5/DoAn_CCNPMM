import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getMediaUrl } from "../../util/media";
import {
  acceptCallApi,
  declineCallApi,
  hangupCallApi,
  startCallApi,
} from "../../util/api";

const CallContext = createContext({
  callSession: null,
  startOutgoingCall: async () => {},
  acceptIncomingCall: async () => {},
  declineIncomingCall: async () => {},
  endCurrentCall: async () => {},
  setCallSession: () => {},
});

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [callSession, setCallSession] = useState(null);
  const { user } = useSelector((state) => state.auth);
  
  // Audio refs
  const ringtoneRef = useRef(null);
  const holdMusicRef = useRef(null);
  
  // Play ringtone (for incoming calls)
  const playRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    ringtoneRef.current = new Audio(getMediaUrl("/uploads/sound/nhac_chuong_iphone-www_tiengdong_com.mp3"));
    ringtoneRef.current.loop = true;
    ringtoneRef.current.play().catch((err) => console.error("Failed to play ringtone:", err));
  }, []);
  
  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);
  
  // Play hold music (for outgoing calls)
  const playHoldMusic = useCallback(() => {
    if (holdMusicRef.current) {
      holdMusicRef.current.pause();
      holdMusicRef.current.currentTime = 0;
    }
    holdMusicRef.current = new Audio(getMediaUrl("/uploads/sound/nhac_chuong_cuoc_goi_zalo-www_tiengdong_com.mp3"));
    holdMusicRef.current.loop = true;
    holdMusicRef.current.play().catch((err) => console.error("Failed to play hold music:", err));
  }, []);
  
  // Stop hold music
  const stopHoldMusic = useCallback(() => {
    if (holdMusicRef.current) {
      holdMusicRef.current.pause();
      holdMusicRef.current.currentTime = 0;
    }
  }, []);
  
  // Stop all sounds
  const stopAllSounds = useCallback(() => {
    stopRingtone();
    stopHoldMusic();
  }, [stopRingtone, stopHoldMusic]);
  
  // Start outgoing call
  const startOutgoingCall = useCallback(async (conversationId, type) => {
    try {
      const res = await startCallApi(conversationId, { type });
      if (!res || res.EC !== 0) {
        throw new Error(res?.EM || "Không thể bắt đầu cuộc gọi");
      }
      return res.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, []);
  
  // Accept incoming call
  const acceptIncomingCall = useCallback(async (callId) => {
    try {
      const res = await acceptCallApi(callId);
      if (!res || res.EC !== 0) {
        throw new Error(res?.EM || "Không thể chấp nhận cuộc gọi");
      }
      return res.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, []);
  
  // Decline incoming call
  const declineIncomingCall = useCallback(async (callId) => {
    try {
      await declineCallApi(callId);
    } catch (error) {
      console.error(error);
    }
  }, []);
  
  // End current call
  const endCurrentCall = useCallback(async (callId) => {
    try {
      await hangupCallApi(callId);
    } catch (error) {
      console.error(error);
    }
  }, []);
  
  // Clear call session and stop all sounds
  const clearCallSession = useCallback(() => {
    setCallSession(null);
    stopAllSounds();
  }, [stopAllSounds]);
  
  return (
    <CallContext.Provider
      value={{
        callSession,
        setCallSession,
        startOutgoingCall,
        acceptIncomingCall,
        declineIncomingCall,
        endCurrentCall,
        clearCallSession,
        playRingtone,
        stopRingtone,
        playHoldMusic,
        stopHoldMusic,
        stopAllSounds,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
