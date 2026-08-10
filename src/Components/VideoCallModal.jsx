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
    "Connecting video...",
  );
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

  // WebRTC PeerConnection & Real-time Firestore Signaling
  useEffect(() => {
    if (!callSession || isIncoming || !isActiveCall) return;

    let pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    let localStream = null;

    const callDocRef = doc(db, "Calls", callSession.id);
    const callerCandidatesCol = collection(callDocRef, "callerCandidates");
    const calleeCandidatesCol = collection(callDocRef, "calleeCandidates");

    // 1. Get Local Media Stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
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
  }, [callSession?.id, isIncoming, isCaller, isActiveCall]);

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
            borderRadius="3xl"
            overflow="hidden"
            boxShadow="2xl"
            p={6}
          >
            <ModalBody textAlign="center">
              <VStack spacing={5}>
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
                    size="xl"
                    name={callSession.callerName || "User"}
                    src={callSession.callerPhoto || ""}
                    border="3px solid white"
                  />
                </Box>

                <VStack spacing={1}>
                  <Text fontSize="lg" fontWeight="800" color="white">
                    {callSession.callerName || "Pulse Member"}
                  </Text>
                  <Text fontSize="xs" color="blue.300" fontWeight="600">
                    Incoming Video Call...
                  </Text>
                </VStack>

                <HStack spacing={8} pt={2}>
                  <IconButton
                    aria-label="Decline Call"
                    icon={<PhoneOffIcon boxSize="22px" color="white" />}
                    size="lg"
                    borderRadius="full"
                    colorScheme="red"
                    boxShadow="0 8px 20px rgba(239, 68, 68, 0.4)"
                    onClick={() => onEndCall(callSession.id)}
                  />
                  <IconButton
                    aria-label="Accept Call"
                    icon={<PhoneCallIcon boxSize="22px" color="white" />}
                    size="lg"
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
          >
            <ModalBody p={0} pos="relative" h="100vh" w="100vw">
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
                  {/* Remote Video (Fullscreen) */}
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

                  {/* Header Overlay */}
                  <Flex
                    pos="absolute"
                    top={6}
                    left={6}
                    align="center"
                    bg="blackAlpha.750"
                    px={4}
                    py={2}
                    borderRadius="full"
                    backdropFilter="blur(8px)"
                    zIndex="10"
                    border="1px solid rgba(255, 255, 255, 0.15)"
                  >
                    <HStack spacing={3}>
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
                        <Text fontSize="xs" fontWeight="700" color="white">
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
                          ● {connectionStatus}
                        </Badge>
                      </VStack>
                    </HStack>
                  </Flex>

                  {/* Local Video (Floating PiP Preview) */}
                  <Box
                    pos="absolute"
                    bottom={24}
                    right={6}
                    w={{ base: "120px", sm: "160px", md: "200px" }}
                    h={{ base: "160px", sm: "210px", md: "260px" }}
                    borderRadius="2xl"
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
                        transform: "scaleX(-1)", // Mirror local video
                      }}
                    />
                  </Box>

                  {/* Bottom In-Call Control Toolbar */}
                  <Flex
                    pos="absolute"
                    bottom={6}
                    left="50%"
                    transform="translateX(-50%)"
                    bg="rgba(15, 23, 42, 0.85)"
                    border="1px solid rgba(255, 255, 255, 0.15)"
                    px={6}
                    py={3}
                    borderRadius="full"
                    backdropFilter="blur(16px)"
                    boxShadow="0 12px 32px rgba(0,0,0,0.5)"
                    zIndex="20"
                  >
                    <HStack spacing={4}>
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
                      />

                      {/* Toggle Camera */}
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
                      />

                      {/* HD Mode Switcher */}
                      <Badge
                        cursor="pointer"
                        px={3}
                        py={2}
                        borderRadius="full"
                        bg="blue.600"
                        color="white"
                        fontSize="10px"
                        fontWeight="700"
                        _hover={{ bg: "blue.700" }}
                        onClick={() => setUseJitsiFallback(true)}
                      >
                        ⚡ Switch to HD Relay
                      </Badge>

                      {/* Red End Call Button */}
                      <IconButton
                        aria-label="End Call"
                        icon={<PhoneOffIcon boxSize="22px" color="white" />}
                        size="md"
                        borderRadius="full"
                        colorScheme="red"
                        boxShadow="0 4px 16px rgba(239, 68, 68, 0.5)"
                        onClick={() => onEndCall(callSession.id)}
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
