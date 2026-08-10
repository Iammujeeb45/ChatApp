/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Avatar,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react";
import {
  MicIcon,
  MicOffIcon,
  CamcorderIcon,
  VideoOffIcon,
  PhoneOffIcon,
  PhoneCallIcon,
} from "./Icons";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { app } from "../Firebase";

const db = getFirestore(app);

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

const VideoCallModal = ({
  callSession,
  currentUser,
  onAcceptCall,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    "Connecting...",
  );
  const [callDuration, setCallDuration] = useState(0);
  const [useJitsiFallback, setUseJitsiFallback] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const modalBg = useColorModeValue("#0f172a", "#090d16");
  const overlayBg = "rgba(0, 0, 0, 0.9)";

  const isIncoming =
    callSession &&
    callSession.status === "calling" &&
    callSession.callerUid !== currentUser?.uid;
  const isCaller = callSession && callSession.callerUid === currentUser?.uid;
  const isActiveCall =
    callSession &&
    (callSession.status === "calling" || callSession.status === "connected");
  const isAudioOnly = callSession?.callType === "audio";

  // Real-time listener for Call Termination by either party
  useEffect(() => {
    if (!callSession?.id) return;

    const unsubCall = onSnapshot(doc(db, "Calls", callSession.id), (snap) => {
      const data = snap.data();
      if (!data || data.status === "ended") {
        onEndCall(callSession.id);
      }
    });

    return () => unsubCall();
  }, [callSession?.id, onEndCall]);

  // Call Duration Timer
  useEffect(() => {
    if (!isActiveCall || isIncoming) return;
    if (connectionStatus !== "Connected") return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActiveCall, isIncoming, connectionStatus]);

  // Reset duration when call ends
  useEffect(() => {
    if (!callSession) setCallDuration(0);
  }, [callSession]);

  const formatCallDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // WebRTC PeerConnection & Real-time Firestore Signaling
  useEffect(() => {
    if (!callSession || isIncoming || !isActiveCall) return;

    let pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    let localStream = null;

    const callDocRef = doc(db, "Calls", callSession.id);
    const callerCandidatesCol = collection(callDocRef, "callerCandidates");
    const calleeCandidatesCol = collection(callDocRef, "calleeCandidates");

    // 1. Get Local Media Stream (audio-only or audio+video)
    const mediaConstraints = isAudioOnly
      ? { audio: true, video: false }
      : { video: true, audio: true };

    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then(async (stream) => {
        localStream = stream;
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle Incoming Remote Media Stream Tracks
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            setConnectionStatus("Connected");
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            setConnectionStatus("Connected");
          } else if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            setConnectionStatus("Connection weak...");
          }
        };

        // 2. Caller Signaling Logic
        if (isCaller) {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(callerCandidatesCol, event.candidate.toJSON());
            }
          };

          // Create SDP Offer
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);

          await updateDoc(callDocRef, {
            offer: {
              sdp: offerDescription.sdp,
              type: offerDescription.type,
            },
          });

          // Listen for SDP Answer from Callee
          const unsubCallDoc = onSnapshot(callDocRef, async (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              const answerDescription = new RTCSessionDescription(data.answer);
              await pc.setRemoteDescription(answerDescription);
            }
          });

          // Listen for Callee ICE Candidates
          const unsubCalleeCandidates = onSnapshot(
            calleeCandidatesCol,
            (snapshot) => {
              snapshot.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                  const candidate = new RTCIceCandidate(change.doc.data());
                  await pc.addIceCandidate(candidate).catch(() => {});
                }
              });
            },
          );

          return () => {
            unsubCallDoc();
            unsubCalleeCandidates();
          };
        } else {
          // 3. Callee Signaling Logic
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(calleeCandidatesCol, event.candidate.toJSON());
            }
          };

          const callSnapshot = await getDoc(callDocRef);
          const callData = callSnapshot.data();

          if (callData?.offer) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(callData.offer),
            );
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            await updateDoc(callDocRef, {
              answer: {
                sdp: answerDescription.sdp,
                type: answerDescription.type,
              },
              status: "connected",
            });
          }

          // Listen for Caller ICE Candidates
          const unsubCallerCandidates = onSnapshot(
            callerCandidatesCol,
            (snapshot) => {
              snapshot.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                  const candidate = new RTCIceCandidate(change.doc.data());
                  await pc.addIceCandidate(candidate).catch(() => {});
                }
              });
            },
          );

          return () => {
            unsubCallerCandidates();
          };
        }
      })
      .catch((err) => {
        console.error("Camera/Mic access error:", err);
        setConnectionStatus("Permission denied");
      });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [callSession?.id, isIncoming, isCaller, isActiveCall, isAudioOnly]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!callSession) return null;

  const jitsiRoomName = `pulsechat_vcall_${callSession.roomId || callSession.id}`;

  return (
    <>
      {/* 1. Incoming Call Alert Modal */}
      {isIncoming && (
        <Modal
          isOpen={true}
          onClose={() => onEndCall(callSession.id)}
          isCentered
          size="sm"
        >
          <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.750" />
          <ModalContent
            bg={modalBg}
            borderRadius={{ base: "24px", md: "3xl" }}
            overflow="hidden"
            boxShadow="2xl"
            px={{ base: 4, md: 6 }}
            py={{ base: 5, md: 6 }}
            mx={3}
            maxW={{ base: "calc(100vw - 24px)", sm: "sm" }}
          >
            <ModalBody textAlign="center" p={0}>
              <VStack spacing={{ base: 4, md: 5 }}>
                <Box
                  p={1}
                  borderRadius="full"
                  bgGradient="linear(to-r, #0284c7, #2563eb)"
                  sx={{
                    animation: "pulse 1.2s infinite alternate",
                    "@keyframes pulse": {
                      "0%": { transform: "scale(1)" },
                      "100%": { transform: "scale(1.08)" },
                    },
                  }}
                >
                  <Avatar
                    size={{ base: "lg", sm: "xl" }}
                    name={callSession.callerName || "User"}
                    src={callSession.callerPhoto || ""}
                    border="3px solid white"
                  />
                </Box>

                <VStack spacing={1}>
                  <Text
                    fontSize={{ base: "md", md: "lg" }}
                    fontWeight="800"
                    color="white"
                    noOfLines={1}
                  >
                    {callSession.callerName || "Pulse Member"}
                  </Text>
                  <Text fontSize="xs" color="blue.300" fontWeight="600">
                    Incoming {isAudioOnly ? "Audio" : "Video"} Call...
                  </Text>
                </VStack>

                <HStack spacing={{ base: 5, md: 8 }} pt={2}>
                  <IconButton
                    aria-label="Decline Call"
                    icon={<PhoneOffIcon boxSize="22px" color="white" />}
                    size={{ base: "md", md: "lg" }}
                    borderRadius="full"
                    colorScheme="red"
                    boxShadow="0 8px 20px rgba(239, 68, 68, 0.4)"
                    onClick={() => onEndCall(callSession.id)}
                  />
                  <IconButton
                    aria-label="Accept Call"
                    icon={<PhoneCallIcon boxSize="22px" color="white" />}
                    size={{ base: "md", md: "lg" }}
                    borderRadius="full"
                    colorScheme="green"
                    boxShadow="0 8px 20px rgba(34, 197, 94, 0.4)"
                    onClick={() => onAcceptCall(callSession.id)}
                  />
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* 2. Active Video Call Screen */}
      {!isIncoming && isActiveCall && (
        <Modal
          isOpen={true}
          onClose={() => onEndCall(callSession.id)}
          size="full"
        >
          <ModalOverlay bg={overlayBg} backdropFilter="blur(10px)" />
          <ModalContent
            bg={modalBg}
            m={0}
            borderRadius="0"
            overflow="hidden"
            pos="relative"
            w="100vw"
            maxW="100vw"
            h="100dvh"
            maxH="100dvh"
          >
            <ModalBody p={0} pos="relative" h="full" w="full">
              {useJitsiFallback ? (
                /* Dedicated High-Definition Jitsi Frame Fallback */
                <iframe
                  src={`https://meet.jit.si/${jitsiRoomName}#userInfo.displayName="${currentUser?.displayName || "Pulse User"}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.disableDeepLinking=true`}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  title="PulseChat Video Call"
                />
              ) : (
                /* Native WebRTC Video Streams */
                <>
                  {/* Remote Video (Fullscreen) — or Avatar for Audio Calls */}
                  {isAudioOnly ? (
                    <Flex
                      w="full"
                      h="full"
                      direction="column"
                      align="center"
                      justify="center"
                      bgGradient="linear(to-b, #0f172a, #1e293b, #0f172a)"
                    >
                      <Box
                        p={1.5}
                        borderRadius="full"
                        bgGradient="linear(to-r, #059669, #10b981)"
                        mb={6}
                        sx={{
                          animation: connectionStatus === "Connected" ? "none" : "pulse 1.5s infinite alternate",
                          "@keyframes pulse": {
                            "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(5, 150, 105, 0.5)" },
                            "100%": { transform: "scale(1.05)", boxShadow: "0 0 0 20px rgba(5, 150, 105, 0)" },
                          },
                        }}
                      >
                        <Avatar
                          size="2xl"
                          name={
                            callSession.recipientName ||
                            callSession.callerName ||
                            "Contact"
                          }
                          src={
                            callSession.recipientPhoto ||
                            callSession.callerPhoto ||
                            ""
                          }
                          border="4px solid white"
                        />
                      </Box>
                      <Text fontSize="xl" fontWeight="800" color="white" mb={1}>
                        {callSession.recipientName ||
                          callSession.callerName ||
                          "Pulse Call"}
                      </Text>
                      <Text fontSize="sm" color="whiteAlpha.700" fontWeight="600">
                        {connectionStatus === "Connected"
                          ? formatCallDuration(callDuration)
                          : connectionStatus}
                      </Text>
                    </Flex>
                  ) : (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#090d16",
                      }}
                    />
                  )}

                  {/* Header Overlay */}
                  <Flex
                    pos="absolute"
                    top={{ base: 3, md: 6 }}
                    left={{ base: 3, md: 6 }}
                    align="center"
                    bg="blackAlpha.750"
                    px={{ base: 3, md: 4 }}
                    py={{ base: 1.5, md: 2 }}
                    borderRadius="full"
                    backdropFilter="blur(8px)"
                    zIndex="10"
                    border="1px solid rgba(255, 255, 255, 0.15)"
                    maxW={{ base: "calc(100vw - 24px)", md: "unset" }}
                  >
                    <HStack spacing={{ base: 2, md: 3 }} minW={0}>
                      <Avatar
                        size="sm"
                        name={
                          callSession.recipientName ||
                          callSession.callerName ||
                          "Contact"
                        }
                        src={
                          callSession.recipientPhoto ||
                          callSession.callerPhoto ||
                          ""
                        }
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" fontWeight="700" color="white" noOfLines={1}>
                          {callSession.recipientName ||
                            callSession.callerName ||
                            "Pulse Call"}
                        </Text>
                        <Badge
                          colorScheme={
                            connectionStatus === "Connected" ? "green" : "blue"
                          }
                          fontSize="9px"
                          borderRadius="full"
                          px={2}
                        >
                          ● {connectionStatus === "Connected" ? (isAudioOnly ? formatCallDuration(callDuration) : "Connected") : connectionStatus}
                        </Badge>
                      </VStack>
                    </HStack>
                  </Flex>

                  {/* Local Video (Floating PiP Preview) — hidden for audio calls */}
                  {!isAudioOnly && (
                    <Box
                      pos="absolute"
                      bottom={{
                        base: "calc(env(safe-area-inset-bottom) + 72px)",
                        md: 24,
                      }}
                      right={{ base: 3, md: 6 }}
                      w={{ base: "92px", sm: "140px", md: "200px" }}
                      h={{ base: "124px", sm: "180px", md: "260px" }}
                      borderRadius={{ base: "18px", md: "2xl" }}
                      overflow="hidden"
                      boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                      border="2px solid rgba(255, 255, 255, 0.3)"
                      bg="black"
                      zIndex="10"
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: "scaleX(-1)",
                        }}
                      />
                    </Box>
                  )}

                  {/* Bottom In-Call Control Toolbar */}
                  <Flex
                    pos="absolute"
                    bottom={{
                      base: "calc(env(safe-area-inset-bottom) + 10px)",
                      md: 6,
                    }}
                    left="50%"
                    transform="translateX(-50%)"
                    bg="rgba(15, 23, 42, 0.85)"
                    border="1px solid rgba(255, 255, 255, 0.15)"
                    px={{ base: 3, sm: 4, md: 6 }}
                    py={{ base: 2, md: 3 }}
                    borderRadius={{ base: "24px", md: "full" }}
                    backdropFilter="blur(16px)"
                    boxShadow="0 12px 32px rgba(0,0,0,0.5)"
                    zIndex="20"
                    maxW={{ base: "calc(100vw - 12px)", md: "unset" }}
                    w={{ base: "calc(100vw - 12px)", md: "auto" }}
                  >
                    <HStack
                      spacing={{ base: 2, sm: 2, md: 4 }}
                      flexWrap="wrap"
                      justify="center"
                      w="full"
                    >
                      {/* Mute Audio */}
                      <IconButton
                        aria-label="Toggle Mute"
                        icon={
                          isMuted ? (
                            <MicOffIcon color="white" />
                          ) : (
                            <MicIcon color="white" />
                          )
                        }
                        size="md"
                        borderRadius="full"
                        bg={isMuted ? "red.500" : "whiteAlpha.200"}
                        _hover={{ bg: isMuted ? "red.600" : "whiteAlpha.300" }}
                        onClick={toggleMute}
                        w={{ base: "44px", md: "40px" }}
                        h={{ base: "44px", md: "40px" }}
                        minW={{ base: "44px", md: "40px" }}
                      />

                      {/* Toggle Camera — hidden for audio calls */}
                      {!isAudioOnly && (
                        <IconButton
                          aria-label="Toggle Camera"
                          icon={
                            isVideoOff ? (
                              <VideoOffIcon color="white" />
                            ) : (
                              <CamcorderIcon color="white" />
                            )
                          }
                          size="md"
                          borderRadius="full"
                          bg={isVideoOff ? "red.500" : "whiteAlpha.200"}
                          _hover={{
                            bg: isVideoOff ? "red.600" : "whiteAlpha.300",
                          }}
                          onClick={toggleVideo}
                          w={{ base: "44px", md: "40px" }}
                          h={{ base: "44px", md: "40px" }}
                          minW={{ base: "44px", md: "40px" }}
                        />
                      )}

                      {/* HD Mode Switcher — only for video calls */}
                      {!isAudioOnly && (
                        <Badge
                          cursor="pointer"
                          px={{ base: 3, md: 3 }}
                          py={{ base: 2, md: 2 }}
                          borderRadius="full"
                          bg="blue.600"
                          color="white"
                          fontSize={{ base: "9px", md: "10px" }}
                          fontWeight="700"
                          _hover={{ bg: "blue.700" }}
                          onClick={() => setUseJitsiFallback(true)}
                          whiteSpace="nowrap"
                          minH={{ base: "44px", md: "auto" }}
                          display="flex"
                          alignItems="center"
                        >
                          ⚡ Switch to HD Relay
                        </Badge>
                      )}

                      {/* Red End Call Button */}
                      <IconButton
                        aria-label="End Call"
                        icon={<PhoneOffIcon boxSize="22px" color="white" />}
                        size="md"
                        borderRadius="full"
                        colorScheme="red"
                        boxShadow="0 4px 16px rgba(239, 68, 68, 0.5)"
                        onClick={() => onEndCall(callSession.id)}
                        w={{ base: "44px", md: "40px" }}
                        h={{ base: "44px", md: "40px" }}
                        minW={{ base: "44px", md: "40px" }}
                      />
                    </HStack>
                  </Flex>
                </>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

VideoCallModal.propTypes = {
  callSession: PropTypes.object,
  currentUser: PropTypes.object,
  onAcceptCall: PropTypes.func.isRequired,
  onEndCall: PropTypes.func.isRequired,
};

export default VideoCallModal;
