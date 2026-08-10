import React, { useState, useRef, useEffect } from "react";
import {
  Flex,
  HStack,
  VStack,
  Input,
  IconButton,
  Box,
  Collapse,
  Button,
  SimpleGrid,
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
  EmojiIcon,
  PaperclipIcon,
  ImageIcon,
  VideoIcon,
  MicIcon,
  TrashIcon,
  CloseIcon,
  ReplyIcon,
} from "./Icons";

// Categorized Comprehensive Emoji Collection
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "😀 Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🥸",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
    ],
  },
  {
    id: "gestures",
    name: "👍 Gestures",
    emojis: [
      "👍",
      "👎",
      "👊",
      "✊",
      "🤛",
      "🤜",
      "🤞",
      "✌️",
      "🤟",
      "🤘",
      "👌",
      "🤌",
      "🤏",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "✋",
      "🤚",
      "🖐️",
      "🖖",
      "👋",
      "🤙",
      "💪",
      "✍️",
      "🙏",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "👁️",
      "🧠",
      "🗣️",
      "👤",
      "👥",
      "🫂",
    ],
  },
  {
    id: "hearts",
    name: "❤️ Hearts",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "💯",
      "💥",
      "💫",
      "💦",
      "💨",
      "💬",
      "💭",
      "💡",
      "⚡",
      "💣",
      "🔥",
    ],
  },
  {
    id: "objects",
    name: "🎉 Celebrations",
    emojis: [
      "🎉",
      "🎊",
      "🎈",
      "🎁",
      "🎀",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🎾",
      "🎮",
      "🎯",
      "🎨",
      "🎭",
      "🎬",
      "🎤",
      "🎧",
      "🎷",
      "🎸",
      "🎹",
      "📱",
      "💻",
      "📷",
      "📸",
      "🍿",
      "☕",
      "🍺",
      "🥂",
      "🍾",
      "🍕",
      "🍔",
      "🍟",
      "🌮",
      "🍣",
      "🚀",
      "✨",
    ],
  },
];

const ChatInput = ({
  message,
  setMessage,
  onSendMessage,
  onSendMediaMessage,
  replyingTo,
  onCancelReply,
}) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
  const emojiPanelBg = useColorModeValue("#ffffff", "#1e293b");

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
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Audio = reader.result;
        onSendMediaMessage({
          mediaUrl: base64Audio,
          mediaType: "audio",
          caption: "",
          mediaName: `voice_note_${Date.now()}.webm`,
        });
      };
      reader.readAsDataURL(audioBlob);

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

  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  // Convert File to Base64 Data URL
  const handleFileSelect = (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onSendMediaMessage({
        mediaUrl: reader.result,
        mediaType: mediaType,
        caption: message.trim(),
        mediaName: file.name,
      });
      setMessage("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const currentCategoryObj =
    EMOJI_CATEGORIES.find((c) => c.id === activeCategory) ||
    EMOJI_CATEGORIES[0];

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
        ref={videoInputRef}
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e, "video")}
      />

      {/* Quoted Reply Preview Banner */}
      {replyingTo && (
        <Flex
          bg={useColorModeValue("blue.50", "rgba(37, 99, 235, 0.15)")}
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

      {/* Comprehensive Categorized Emoji Panel */}
      <Collapse in={showEmojis} animateOpacity>
        <Box
          bg={emojiPanelBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="2xl"
          p={3}
          mb={2.5}
          boxShadow="xl"
          maxW="full"
        >
          {/* Category Tabs Header */}
          <HStack
            justify="space-between"
            mb={2.5}
            borderBottom="1px solid"
            borderColor={borderColor}
            pb={2}
          >
            <HStack spacing={1} overflowX="auto">
              {EMOJI_CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  size="xs"
                  variant={activeCategory === cat.id ? "solid" : "ghost"}
                  colorScheme={activeCategory === cat.id ? "blue" : "gray"}
                  borderRadius="full"
                  fontSize="xs"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </HStack>
            <IconButton
              size="xs"
              aria-label="Close emoji picker"
              icon={<CloseIcon />}
              variant="ghost"
              borderRadius="full"
              onClick={() => setShowEmojis(false)}
            />
          </HStack>

          {/* Emoji Grid */}
          <SimpleGrid
            columns={{ base: 7, sm: 10, md: 12 }}
            spacing={1.5}
            maxH="180px"
            overflowY="auto"
            p={1}
          >
            {currentCategoryObj.emojis.map((emoji, index) => (
              <Button
                key={index}
                size="sm"
                variant="ghost"
                fontSize="xl"
                p={0}
                minW="34px"
                h="34px"
                borderRadius="lg"
                _hover={{
                  transform: "scale(1.25)",
                  bg: useColorModeValue("blue.50", "whiteAlpha.200"),
                }}
                transition="transform 0.1s ease"
                onClick={() => addEmoji(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </SimpleGrid>
        </Box>
      </Collapse>

      {/* In-Place Live Voice Recording Toolbar */}
      {isRecording ? (
        <Flex
          as="div"
          w="full"
          align="center"
          justify="space-between"
          bg={useColorModeValue("red.50", "rgba(239, 68, 68, 0.15)")}
          border="1.5px solid"
          borderColor="red.400"
          borderRadius="full"
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
          align="center"
          bg={inputBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="full"
          px={3}
          py={1.5}
          boxShadow="sm"
          _focusWithin={{
            borderColor: "#2563eb",
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.25)",
          }}
          transition="all 0.2s ease"
        >
          <IconButton
            aria-label="Emoji Picker"
            icon={
              <EmojiIcon color={showEmojis ? "#2563eb" : placeholderColor} />
            }
            variant="ghost"
            size="sm"
            borderRadius="full"
            onClick={() => setShowEmojis(!showEmojis)}
            _hover={{
              bg: useColorModeValue("blackAlpha.50", "whiteAlpha.100"),
            }}
          />

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
                bg: useColorModeValue("blackAlpha.50", "whiteAlpha.100"),
              }}
            />
            <MenuList
              bg={useColorModeValue("#ffffff", "#1e293b")}
              borderColor={borderColor}
              p={2}
            >
              <MenuItem
                icon={<ImageIcon color="#0284c7" />}
                onClick={() => imageInputRef.current?.click()}
                fontSize="xs"
                borderRadius="md"
              >
                Upload Image
              </MenuItem>
              <MenuItem
                icon={<VideoIcon color="#7c3aed" />}
                onClick={() => videoInputRef.current?.click()}
                fontSize="xs"
                borderRadius="md"
              >
                Upload Video
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
          />

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
              ml={1}
            />
          ) : (
            <IconButton
              aria-label="Record Voice Note"
              icon={<MicIcon color="#2563eb" />}
              size="sm"
              variant="ghost"
              borderRadius="full"
              onClick={startRecording}
              ml={1}
              _hover={{ bg: useColorModeValue("blue.50", "whiteAlpha.100") }}
            />
          )}
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
  replyingTo: PropTypes.object,
  onCancelReply: PropTypes.func,
};

export default ChatInput;
