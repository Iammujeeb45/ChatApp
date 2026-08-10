import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Flex,
  Box,
  Text,
  Avatar,
  HStack,
  VStack,
  Image,
  IconButton,
  Tooltip,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Badge,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
} from "@chakra-ui/react";
import {
  DoubleCheckIcon,
  DownloadIcon,
  PlayIcon,
  PauseIcon,
  MicIcon,
  TrashIcon,
  CheckSquareIcon,
  SquareIcon,
  ReplyIcon,
} from "./Icons";

// High-contrast colorblind-safe avatar ring colors
const SENDER_COLORS = [
  "#0284c7", // Sky Blue
  "#d97706", // Amber / Warm Orange
  "#059669", // Emerald Green
  "#7c3aed", // Deep Violet
  "#2563eb", // Cobalt Blue
  "#e11d48", // Crimson Red
];

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const getSenderColor = (uid) => {
  if (!uid) return SENDER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[index];
};

const formatTime = (createdAt) => {
  if (!createdAt) return "Just now";
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatAudioTime = (sec) => {
  if (isNaN(sec)) return "0:00";
  const mins = Math.floor(sec / 60);
  const remainder = Math.floor(sec % 60);
  return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
};

// Direct media download helper
const handleDownloadMedia = (mediaUrl, defaultName = "pulse_media") => {
  try {
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = defaultName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Download failed:", err);
  }
};

// Voice Note Audio Player Component
const VoiceNotePlayer = ({ mediaUrl, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (val) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  return (
    <Box minW="220px" maxW="280px" py={1}>
      <audio ref={audioRef} src={mediaUrl} preload="metadata" />
      <HStack spacing={3} align="center">
        <IconButton
          aria-label={isPlaying ? "Pause" : "Play"}
          icon={
            isPlaying ? (
              <PauseIcon boxSize="16px" color="white" />
            ) : (
              <PlayIcon boxSize="16px" color="white" />
            )
          }
          size="md"
          borderRadius="full"
          bg={isMe ? "whiteAlpha.300" : "blue.600"}
          _hover={{ bg: isMe ? "whiteAlpha.400" : "blue.700" }}
          onClick={togglePlay}
        />

        <Box flex={1}>
          <Slider
            aria-label="voice-note-scrubber"
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={handleSeek}
            focusThumbOnChange={false}
          >
            <SliderTrack
              bg={isMe ? "whiteAlpha.400" : "gray.300"}
              h="4px"
              borderRadius="full"
            >
              <SliderFilledTrack bg={isMe ? "white" : "blue.600"} />
            </SliderTrack>
            <SliderThumb boxSize={3} bg={isMe ? "white" : "blue.600"} />
          </Slider>

          <HStack justify="space-between" mt={1}>
            <HStack spacing={1}>
              <MicIcon
                boxSize="12px"
                color={isMe ? "whiteAlpha.800" : "blue.500"}
              />
              <Text
                fontSize="10px"
                fontWeight="600"
                color={isMe ? "whiteAlpha.800" : "gray.500"}
              >
                Voice Note
              </Text>
            </HStack>
            <Text
              fontSize="10px"
              fontWeight="600"
              color={isMe ? "whiteAlpha.800" : "gray.500"}
            >
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </Text>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
};

VoiceNotePlayer.propTypes = {
  mediaUrl: PropTypes.string.isRequired,
  isMe: PropTypes.bool.isRequired,
};

const Message = ({
  id,
  text,
  uri,
  user = "other",
  senderName = "",
  uid = "",
  createdAt = null,
  mediaUrl = null,
  mediaType = null,
  caption = "",
  mediaName = "",
  replyTo = null,
  reactions = {},
  currentUid = "",
  isSelectMode = false,
  isSelected = false,
  onToggleSelect = () => {},
  onDeleteSingle = () => {},
  onDeleteForEveryone = () => {},
  onReply = () => {},
  onToggleReaction = () => {},
}) => {
  const isMe = user === "me";
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelDeleteRef = useRef();
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Robust High-Legibility Bubble Design Tokens
  const outgoingBg = useColorModeValue("#2563eb", "#2563eb");
  const incomingBg = useColorModeValue("#ffffff", "#1e293b");
  const incomingBorder = useColorModeValue(
    "1px solid #cbd5e1",
    "1px solid rgba(255, 255, 255, 0.1)",
  );
  const hoverActionBg = useColorModeValue("#ffffff", "#1e293b");
  const modalBg = useColorModeValue("#ffffff", "#1e293b");
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const subtextColor = useColorModeValue(
    "pulse.lightSubtext",
    "pulse.darkSubtext",
  );
  const actionBorderColor = useColorModeValue("gray.300", "whiteAlpha.200");
  const replyPreviewBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const reactionBadgeBg = useColorModeValue("white", "#1e293b");

  const textColorMe = "#ffffff";
  const textColorOther = useColorModeValue("#0f172a", "#f8fafc");
  const timestampColorMe = "rgba(255, 255, 255, 0.9)";
  const timestampColorOther = useColorModeValue("#64748b", "#94a3b8");
  const senderColor = getSenderColor(uid);

  const downloadFilename =
    mediaName || `pulse_${mediaType || "file"}_${Date.now()}`;

  // Process reaction summary list
  const activeReactions = Object.entries(reactions || {}).filter(
    ([, uids]) => Array.isArray(uids) && uids.length > 0,
  );

  const handleBubbleClick = () => {
    setShowMobileActions((prev) => !prev);
  };

  const handleConfirmDeleteSingle = () => {
    onDeleteSingle(id);
    onDeleteClose();
    setShowMobileActions(false);
  };

  const handleConfirmDeleteForEveryone = () => {
    onDeleteForEveryone(id);
    onDeleteClose();
    setShowMobileActions(false);
  };

  return (
    <Flex
      w="full"
      justify={isMe ? "flex-end" : "flex-start"}
      mb={3.5}
      px={4}
      align="flex-end"
      role="group"
      pos="relative"
    >
      {/* Delete Confirmation Alert Dialog with Delete for Me & Delete for Everyone for ALL messages */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <AlertDialogContent bg={modalBg} borderRadius="2xl" overflow="hidden">
          <AlertDialogHeader fontSize="lg" fontWeight="700" color={textColor}>
            Delete Message?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="sm" color={subtextColor}>
            Would you like to delete this message for yourself or for everyone
            in this chat?
          </AlertDialogBody>
          <AlertDialogFooter flexWrap="wrap" gap={2}>
            <Button
              ref={cancelDeleteRef}
              onClick={onDeleteClose}
              size="sm"
              borderRadius="full"
            >
              Cancel
            </Button>
            <Button
              colorScheme="gray"
              onClick={handleConfirmDeleteSingle}
              size="sm"
              borderRadius="full"
            >
              Delete for Me
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirmDeleteForEveryone}
              size="sm"
              borderRadius="full"
            >
              Delete for Everyone
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Selection Mode Checkbox */}
      {isSelectMode && (
        <IconButton
          aria-label="Select message"
          icon={
            isSelected ? <CheckSquareIcon /> : <SquareIcon color="gray.400" />
          }
          variant="ghost"
          size="sm"
          mr={isMe ? 2 : 0}
          ml={isMe ? 0 : 2}
          order={isMe ? 1 : -1}
          onClick={() => onToggleSelect(id)}
        />
      )}

      {/* Lightbox Modal for Image Preview */}
      {mediaType === "image" && mediaUrl && (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
          <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.850" />
          <ModalContent
            bg="transparent"
            boxShadow="none"
            maxW="90vw"
            maxH="90vh"
          >
            <HStack
              pos="absolute"
              top="-45px"
              right="0"
              spacing={2}
              zIndex="10"
            >
              <Tooltip label="Download Image">
                <IconButton
                  aria-label="Download Image"
                  icon={<DownloadIcon />}
                  size="md"
                  colorScheme="blue"
                  borderRadius="full"
                  onClick={() =>
                    handleDownloadMedia(mediaUrl, downloadFilename)
                  }
                />
              </Tooltip>
              <ModalCloseButton
                color="white"
                size="lg"
                pos="static"
                boxSize="40px"
                bg="blackAlpha.600"
                borderRadius="full"
              />
            </HStack>
            <ModalBody
              p={0}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Image
                src={mediaUrl}
                maxH="80vh"
                maxW="90vw"
                objectFit="contain"
                borderRadius="xl"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* Sender Gmail DP on the left for incoming messages */}
      {!isMe && (
        <Avatar
          size="sm"
          src={uri || undefined}
          name={senderName || "User"}
          mr={2.5}
          mb={0.5}
          border="2px solid"
          borderColor={senderColor}
          boxShadow="0 2px 6px rgba(0, 0, 0, 0.1)"
        />
      )}

      {/* Action Bar (Mouse Hover + Mobile Touch Tap) */}
      {!isSelectMode && (
        <HStack
          pos="absolute"
          top="-22px"
          right={isMe ? "auto" : "50px"}
          left={isMe ? "50px" : "auto"}
          bg={hoverActionBg}
          border="1px solid"
          borderColor={actionBorderColor}
          borderRadius="full"
          px={2}
          py={0.5}
          boxShadow="lg"
          opacity={{ base: showMobileActions ? 1 : 0, md: 0 }}
          _groupHover={{ opacity: 1 }}
          transition="all 0.2s"
          zIndex="5"
          spacing={0.5}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <Text
              key={emoji}
              fontSize="xs"
              cursor="pointer"
              px={1}
              py={0.5}
              borderRadius="md"
              _hover={{ transform: "scale(1.3)" }}
              transition="transform 0.1s"
              onClick={() => {
                onToggleReaction(id, emoji);
                setShowMobileActions(false);
              }}
            >
              {emoji}
            </Text>
          ))}
          <Tooltip label="Reply">
            <IconButton
              aria-label="Reply to message"
              icon={<ReplyIcon />}
              size="xs"
              variant="ghost"
              borderRadius="full"
              onClick={() => {
                onReply({
                  id,
                  senderName: senderName || "User",
                  text:
                    caption ||
                    text ||
                    (mediaType ? `[${mediaType}]` : "Message"),
                });
                setShowMobileActions(false);
              }}
            />
          </Tooltip>
          <Tooltip label="Delete message">
            <IconButton
              aria-label="Delete message"
              icon={<TrashIcon boxSize="13px" color="red.400" />}
              size="xs"
              variant="ghost"
              borderRadius="full"
              onClick={onDeleteOpen}
            />
          </Tooltip>
        </HStack>
      )}

      {/* Message Bubble Container */}
      <VStack
        align={isMe ? "flex-end" : "flex-start"}
        spacing={1}
        maxW={{ base: "88%", sm: "78%", md: "68%" }}
      >
        <Box
          w="full"
          bg={isMe ? outgoingBg : incomingBg}
          color={isMe ? textColorMe : textColorOther}
          px={3.5}
          py={2.5}
          borderRadius={isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px"}
          border={isMe ? "none" : incomingBorder}
          boxShadow={
            isMe
              ? "0 4px 14px rgba(37, 99, 235, 0.35)"
              : "0 2px 8px rgba(0, 0, 0, 0.08)"
          }
          pos="relative"
          transition="transform 0.15s ease"
          onClick={handleBubbleClick}
          cursor="pointer"
          display="flex"
          flexDirection="column"
          sx={{
            wordBreak: "break-word",
          }}
        >
          {/* Sender Name for incoming messages */}
          {!isMe && (
            <Text
              fontSize="xs"
              fontWeight="700"
              color={senderColor}
              mb={1}
              letterSpacing="tight"
            >
              {senderName || "Pulse Member"}
            </Text>
          )}

          {/* Quoted Reply Preview Card inside message bubble */}
          {replyTo && (
            <Box
              bg={
                isMe ? "whiteAlpha.200" : replyPreviewBg
              }
              borderLeft="3px solid"
              borderLeftColor={isMe ? "white" : "#2563eb"}
              borderRadius="md"
              p={2}
              mb={2}
            >
              <Text
                fontSize="11px"
                fontWeight="700"
                color={isMe ? "whiteAlpha.900" : "#2563eb"}
              >
                {replyTo.senderName || "User"}
              </Text>
              <Text
                fontSize="xs"
                color={isMe ? "whiteAlpha.800" : textColorOther}
                noOfLines={2}
              >
                {replyTo.text}
              </Text>
            </Box>
          )}

          {/* Media Content Rendering */}
          {mediaUrl && (
            <Box
              my={1}
              borderRadius="lg"
              overflow="hidden"
              pos="relative"
              role="group"
            >
              {mediaType === "image" && (
                <Box pos="relative">
                  <Image
                    src={mediaUrl}
                    alt="Image message"
                    maxH="280px"
                    w="full"
                    objectFit="cover"
                    borderRadius="lg"
                    cursor="pointer"
                    onClick={onOpen}
                    transition="opacity 0.2s"
                    _hover={{ opacity: 0.9 }}
                  />
                  <IconButton
                    aria-label="Download Image"
                    icon={<DownloadIcon />}
                    size="sm"
                    pos="absolute"
                    top={2}
                    right={2}
                    bg="blackAlpha.700"
                    color="white"
                    borderRadius="full"
                    _hover={{ bg: "blackAlpha.900", transform: "scale(1.1)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(mediaUrl, downloadFilename);
                    }}
                  />
                </Box>
              )}

              {mediaType === "video" && (
                <Box pos="relative">
                  <video
                    src={mediaUrl}
                    controls
                    style={{
                      maxHeight: "280px",
                      width: "100%",
                      borderRadius: "12px",
                    }}
                  />
                  <IconButton
                    aria-label="Download Video"
                    icon={<DownloadIcon />}
                    size="sm"
                    pos="absolute"
                    top={2}
                    right={2}
                    bg="blackAlpha.700"
                    color="white"
                    borderRadius="full"
                    _hover={{ bg: "blackAlpha.900" }}
                    onClick={() =>
                      handleDownloadMedia(mediaUrl, downloadFilename)
                    }
                  />
                </Box>
              )}

              {mediaType === "audio" && (
                <VoiceNotePlayer mediaUrl={mediaUrl} isMe={isMe} />
              )}
            </Box>
          )}

          {/* Caption or Text Message Content */}
          {(text || caption) && (
            <Text
              fontSize="sm"
              lineHeight="1.5"
              whiteSpace="pre-wrap"
              fontWeight="500"
              mt={mediaUrl ? 1.5 : 0}
            >
              {caption || text}
            </Text>
          )}

          {/* Timestamp & Read Receipt */}
          <HStack
            mt={1.5}
            alignSelf="flex-end"
            spacing={1}
            align="center"
          >
            <Text
              fontSize="10px"
              fontWeight="600"
              color={isMe ? timestampColorMe : timestampColorOther}
              userSelect="none"
            >
              {formatTime(createdAt)}
            </Text>
            {isMe && (
              <DoubleCheckIcon isRead={true} boxSize="14px" color="#ffffff" />
            )}
          </HStack>
        </Box>

        {/* Interactive Reaction Pills under message bubble */}
        {activeReactions.length > 0 && (
          <HStack spacing={1} pt={0.5}>
            {activeReactions.map(([emoji, uids]) => {
              const hasReacted = uids.includes(currentUid);
              return (
                <Badge
                  key={emoji}
                  cursor="pointer"
                  onClick={() => onToggleReaction(id, emoji)}
                  bg={
                    hasReacted
                      ? "blue.500"
                      : reactionBadgeBg
                  }
                  color={hasReacted ? "white" : textColorOther}
                  border="1px solid"
                  borderColor={hasReacted ? "blue.600" : incomingBorder}
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  fontSize="10px"
                  boxShadow="xs"
                  _hover={{ transform: "scale(1.1)" }}
                  transition="transform 0.15s"
                >
                  {emoji} {uids.length}
                </Badge>
              );
            })}
          </HStack>
        )}
      </VStack>

      {/* User Gmail DP on the right for outgoing messages */}
      {isMe && (
        <Avatar
          size="sm"
          src={uri || undefined}
          name={senderName || "Me"}
          ml={2.5}
          mb={0.5}
          border="2px solid"
          borderColor="#2563eb"
          boxShadow="0 2px 6px rgba(37, 99, 235, 0.3)"
        />
      )}
    </Flex>
  );
};

Message.propTypes = {
  id: PropTypes.string,
  text: PropTypes.string,
  uri: PropTypes.string,
  user: PropTypes.oneOf(["me", "other"]),
  senderName: PropTypes.string,
  uid: PropTypes.string,
  createdAt: PropTypes.any,
  mediaUrl: PropTypes.string,
  mediaType: PropTypes.string,
  caption: PropTypes.string,
  mediaName: PropTypes.string,
  replyTo: PropTypes.object,
  reactions: PropTypes.object,
  currentUid: PropTypes.string,
  isSelectMode: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  onDeleteSingle: PropTypes.func,
  onDeleteForEveryone: PropTypes.func,
  onReply: PropTypes.func,
  onToggleReaction: PropTypes.func,
};

export default Message;
