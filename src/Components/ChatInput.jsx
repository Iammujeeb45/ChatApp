import { useState, useRef, useEffect } from "react";
import {
  Flex,
  HStack,
  VStack,
  Input,
  IconButton,
  Box,
  Button,
  Text,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import {
  SendIcon,
  PaperclipIcon,
  VideoIcon,
  ImageIcon,
  MicIcon,
  TrashIcon,
  CloseIcon,
  ReplyIcon,
} from "./Icons";

const ChatInput = ({
  message,
  setMessage,
  onSendMessage,
  onSendMediaMessage,
  onPickMedia,
  replyingTo,
  onCancelReply,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const inputBg = useColorModeValue("pulse.lightInputBg", "pulse.darkInputBg");
  const borderColor = useColorModeValue(
    "pulse.lightBorder",
    "pulse.darkBorder",
  );
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const placeholderColor = useColorModeValue(
    "pulse.lightSubtext",
    "pulse.darkSubtext",
  );
  const replyBannerBg = useColorModeValue("blue.50", "rgba(37, 99, 235, 0.15)");
  const recordingToolbarBg = useColorModeValue(
    "red.50",
    "rgba(239, 68, 68, 0.15)",
  );
  const actionHoverBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");
  const menuListBg = useColorModeValue("#ffffff", "#1e293b");
  const micHoverBg = useColorModeValue("blue.50", "whiteAlpha.100");

  // Format recording timer mm:ss
  const formatRecordTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Direct In-Place Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordTimer(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access denied or unavailable: " + err.message);
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;

    recorder.onstop = () => {
      clearInterval(timerIntervalRef.current);
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      onSendMediaMessage({
        file: audioBlob,
        mediaType: "audio",
        caption: "",
        mediaName: `voice_note_${Date.now()}.webm`,
      });

      // Stop mic tracks
      recorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordTimer(0);
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(timerIntervalRef.current);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordTimer(0);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Pass files through so App.jsx can compress and upload them to Firebase Storage
  const handleFileSelect = (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit.");
      return;
    }

    if (onPickMedia) {
      onPickMedia({
        file,
        mediaType,
        mediaName: file.name,
      });
      setMessage("");
      e.target.value = "";
      return;
    }

    onSendMediaMessage({
      file,
      mediaType: mediaType,
      caption: message.trim(),
      mediaName: file.name,
    });
    setMessage("");
    e.target.value = "";
  };

  return (
    <Box w="full" px={4} pb={4} pt={2} zIndex="5">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e, "video")}
      />

      {/* Quoted Reply Preview Banner */}
      {replyingTo && (
        <Flex
          bg={replyBannerBg}
          borderLeft="4px solid"
          borderLeftColor="#2563eb"
          borderTop="1px solid"
          borderRight="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          p={2.5}
          mb={2}
          align="center"
          justify="space-between"
          boxShadow="xs"
        >
          <HStack spacing={2.5} flex={1} overflow="hidden">
            <ReplyIcon color="#2563eb" />
            <VStack align="start" spacing={0} flex={1} overflow="hidden">
              <Text fontSize="xs" fontWeight="700" color="#2563eb">
                Replying to {replyingTo.senderName || "User"}
              </Text>
              <Text fontSize="xs" color={textColor} noOfLines={1}>
                {replyingTo.text}
              </Text>
            </VStack>
          </HStack>

          <IconButton
            size="xs"
            aria-label="Cancel reply"
            icon={<CloseIcon />}
            variant="ghost"
            borderRadius="full"
            onClick={onCancelReply}
          />
        </Flex>
      )}

      {/* In-Place Live Voice Recording Toolbar */}
      {isRecording ? (
        <Flex
          as="div"
          w="full"
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "center" }}
          justify="space-between"
          gap={3}
          bg={recordingToolbarBg}
          border="1.5px solid"
          borderColor="red.400"
          borderRadius={{ base: "24px", sm: "full" }}
          px={5}
          py={2}
          boxShadow="md"
        >
          <HStack spacing={3}>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg="red.500"
              sx={{
                animation: "pulse 1s infinite alternate",
                "@keyframes pulse": {
                  "0%": { opacity: 0.3 },
                  "100%": { opacity: 1 },
                },
              }}
            />
            <Text fontWeight="700" fontSize="sm" color="red.500">
              Recording Voice Note {formatRecordTime(recordTimer)}
            </Text>
          </HStack>

          <HStack spacing={2}>
            <IconButton
              aria-label="Cancel Recording"
              icon={<TrashIcon color="red.500" />}
              size="sm"
              variant="ghost"
              borderRadius="full"
              onClick={cancelRecording}
            />
            <Button
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              leftIcon={<SendIcon />}
              onClick={stopAndSendRecording}
            >
              Send Voice Note
            </Button>
          </HStack>
        </Flex>
      ) : (
        /* Standard Input Form */
        <Flex
          as="form"
          onSubmit={onSendMessage}
          w="full"
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "center" }}
          gap={2}
          bg={inputBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius={{ base: "24px", sm: "full" }}
          px={3}
          py={2}
          boxShadow="sm"
          _focusWithin={{
            borderColor: "#2563eb",
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.25)",
          }}
          transition="all 0.2s ease"
        >
          {/* Attach Media Menu */}
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Attach File"
              icon={<PaperclipIcon color={placeholderColor} />}
              variant="ghost"
              size="sm"
              borderRadius="full"
              mr={1}
              _hover={{
                bg: actionHoverBg,
              }}
              alignSelf="flex-start"
            />
            <MenuList bg={menuListBg} borderColor={borderColor} p={2}>
              <MenuItem
                icon={<ImageIcon color="#2563eb" />}
                onClick={() => imageInputRef.current?.click()}
                fontSize="xs"
                borderRadius="md"
              >
                Photo & Image
              </MenuItem>
              <MenuItem
                icon={<VideoIcon color="#7c3aed" />}
                onClick={() => videoInputRef.current?.click()}
                fontSize="xs"
                borderRadius="md"
              >
                Video
              </MenuItem>
            </MenuList>
          </Menu>

          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            border="none"
            outline="none"
            focusBorderColor="transparent"
            color={textColor}
            fontSize="sm"
            _placeholder={{ color: placeholderColor }}
            px={2}
            py={1}
            h="38px"
            flex={1}
            minW={0}
            w="full"
          />

          <HStack spacing={1} alignSelf={{ base: "flex-end", sm: "center" }}>
            {message.trim() ? (
              <IconButton
                type="submit"
                aria-label="Send Message"
                icon={<SendIcon color="white" />}
                size="sm"
                borderRadius="full"
                bgGradient="linear(to-r, #1d4ed8, #2563eb)"
                color="white"
                boxShadow="0 4px 12px rgba(37, 99, 235, 0.4)"
                _hover={{
                  bgGradient: "linear(to-r, #1e40af, #1d4ed8)",
                  transform: "scale(1.05)",
                }}
                _active={{ transform: "scale(0.95)" }}
                transition="all 0.15s ease"
              />
            ) : (
              <IconButton
                aria-label="Record Voice Note"
                icon={<MicIcon color="#2563eb" />}
                size="sm"
                variant="ghost"
                borderRadius="full"
                onClick={startRecording}
                _hover={{ bg: micHoverBg }}
              />
            )}
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

ChatInput.propTypes = {
  message: PropTypes.string.isRequired,
  setMessage: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onSendMediaMessage: PropTypes.func.isRequired,
  onPickMedia: PropTypes.func,
  replyingTo: PropTypes.object,
  onCancelReply: PropTypes.func,
};

export default ChatInput;
