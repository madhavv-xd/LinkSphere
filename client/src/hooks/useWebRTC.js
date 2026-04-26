import { useEffect, useRef, useState, useCallback } from 'react';

// STUN servers to use for ICE candidates
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export function useWebRTC(socket, activeVoiceChannel) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  // Clean up a specific peer
  const cleanupPeer = useCallback((socketId) => {
    if (peersRef.current[socketId]) {
      peersRef.current[socketId].close();
      delete peersRef.current[socketId];
    }
    setRemoteStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[socketId];
      return newStreams;
    });
  }, []);

  // Clean up all peers and local stream
  const cleanupAll = useCallback(() => {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams({});
  }, [cleanupPeer]);

  // Create a new RTCPeerConnection for a given socketId
  const createPeer = useCallback((targetSocketId, initiator) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = peer;

    // Add local tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_signal", {
          targetSocketId,
          signalData: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };

    // Handle incoming streams
    peer.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: event.streams[0]
      }));
    };

    return peer;
  }, [socket]);

  // Handle incoming signaling data
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ fromSocketId, signalData }) => {
      let peer = peersRef.current[fromSocketId];

      if (signalData.type === 'offer') {
        if (!peer) {
          peer = createPeer(fromSocketId, false);
        }
        await peer.setRemoteDescription(new RTCSessionDescription(signalData.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc_signal", {
          targetSocketId: fromSocketId,
          signalData: { type: 'answer', answer }
        });
      } else if (signalData.type === 'answer') {
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        }
      } else if (signalData.type === 'ice-candidate') {
        if (peer && peer.remoteDescription) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (e) {
            console.error("Error adding received ice candidate", e);
          }
        }
      }
    };

    socket.on("webrtc_signal", handleSignal);
    return () => socket.off("webrtc_signal", handleSignal);
  }, [socket, createPeer]);

  // Main lifecycle for joining/leaving voice channel
  useEffect(() => {
    if (!socket || !activeVoiceChannel) {
      // If we left the voice channel, cleanup everything
      cleanupAll();
      return;
    }

    // Start local media, then join the room
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Tell the server we are joining the voice channel
        socket.emit("join_voice", activeVoiceChannel);

        // Server responds with existing users in the voice room
        socket.once("voice_users", async (users) => {
          for (const user of users) {
            // Create a peer connection and send an offer to each existing user
            const peer = createPeer(user.socketId, true);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit("webrtc_signal", {
              targetSocketId: user.socketId,
              signalData: { type: 'offer', offer }
            });
          }
        });

      })
      .catch((err) => {
        console.error("Failed to get local media stream", err);
        // Maybe handle gracefully in UI
      });

    // Handle users leaving
    const handleUserLeft = (socketId) => {
      cleanupPeer(socketId);
    };
    socket.on("user_left_voice", handleUserLeft);

    return () => {
      // Cleanup on unmount or when channel changes
      socket.off("user_left_voice", handleUserLeft);
      // Let the backend know we are leaving so it can broadcast
      if (socket.connected) {
        socket.emit("leave_voice", activeVoiceChannel);
      }
      cleanupAll();
    };
  }, [socket, activeVoiceChannel, createPeer, cleanupAll, cleanupPeer]);

  // Add functionality to toggle mute (audio tracks)
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        return !isEnabled; // Return the new state (true = unmuted, false = muted)
      }
    }
    return false;
  };

  return { localStream, remoteStreams, toggleMute };
}
