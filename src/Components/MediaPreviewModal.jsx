import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  Image,
  Box,
  VStack,
  Text,
  Progress,
  useColorModeValue,
} from "@chakra-ui/react";
import { SendIcon } from "./Icons";

const MediaPreviewModal = ({
  isOpen,
  onClose,
  file,
  mediaType,
  mediaPreviewUrl,
  initialCaption = "",
  onSendMedia,
  uploadProgress,
  isUploading,
}) => {
  const [caption, setCaption] = useState("");

  const modalBg = useColorModeValue("#ffffff", "#1e293b");
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");

  useEffect(() => {
    if (isOpen) {
      setCaption(initialCaption || "");
    }
  }, [initialCaption, isOpen]);

  const handleSend = () => {
    onSendMedia(caption);
    setCaption("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <ModalContent bg={modalBg} color={textColor} borderRadius="2xl">
        <ModalHeader
          fontSize="md"
          borderBottom="1px solid"
          borderColor={useColorModeValue("gray.200", "whiteAlpha.100")}
        >
          Send {mediaType ? mediaType.toUpperCase() : "Media"}
        </ModalHeader>
        <ModalCloseButton isDisabled={isUploading} />

        <ModalBody py={4}>
          <VStack spacing={4} align="center">
            {/* Preview Box */}
            <Box
              w="full"
              maxH="300px"
              borderRadius="xl"
              overflow="hidden"
              bg={useColorModeValue("gray.100", "slate.900")}
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={2}
            >
              {mediaType === "image" && (
                <Image
                  src={mediaPreviewUrl}
                  maxH="280px"
                  objectFit="contain"
                  borderRadius="lg"
                  boxSize="full"
                />
              )}
              {mediaType === "video" && (
                <video
                  src={mediaPreviewUrl}
                  controls
                  style={{
                    maxHeight: "280px",
                    borderRadius: "12px",
                    width: "100%",
                  }}
                />
              )}
              {mediaType === "audio" && (
                <Box w="full" p={4}>
                  <Text fontSize="xs" color="gray.500" mb={2} noOfLines={1}>
                    🎵 {file?.name || "Audio File"}
                  </Text>
                  <audio
                    src={mediaPreviewUrl}
                    controls
                    style={{ width: "100%" }}
                  />
                </Box>
              )}
            </Box>

            {/* Optional Caption */}
            <Input
              placeholder="Add a caption (optional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              isDisabled={isUploading}
              size="sm"
              borderRadius="full"
            />

            {/* Upload Progress Bar */}
            {isUploading && (
              <Box w="full" pt={2}>
                <Text fontSize="xs" color="#8b5cf6" mb={1} fontWeight="600">
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
                <Progress
                  value={uploadProgress}
                  size="xs"
                  colorScheme="purple"
                  borderRadius="full"
                  hasStripe
                  isAnimated
                />
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter
          gap={2}
          borderTop="1px solid"
          borderColor={useColorModeValue("gray.200", "whiteAlpha.100")}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            isDisabled={isUploading}
            size="sm"
            borderRadius="full"
          >
            Cancel
          </Button>
          <Button
            bgGradient="linear(to-r, #6366f1, #8b5cf6)"
            color="white"
            rightIcon={<SendIcon color="white" />}
            onClick={handleSend}
            isLoading={isUploading}
            loadingText="Sending"
            size="sm"
            borderRadius="full"
            _hover={{ bgGradient: "linear(to-r, #4f46e5, #7c3aed)" }}
          >
            Send
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

MediaPreviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  file: PropTypes.object,
  mediaType: PropTypes.string,
  mediaPreviewUrl: PropTypes.string,
  initialCaption: PropTypes.string,
  onSendMedia: PropTypes.func.isRequired,
  uploadProgress: PropTypes.number,
  isUploading: PropTypes.bool,
};

export default MediaPreviewModal;
