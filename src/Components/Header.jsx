import { useRef } from "react";
import {
  Flex,
  HStack,
  VStack,
  Avatar,
  AvatarBadge,
  Text,
  IconButton,
  Box,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  Tooltip,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import {
  PulseLogo,
  SearchIcon,
  SunIcon,
  MoonIcon,
  SignOutIcon,
  SoundOnIcon,
  SoundOffIcon,
  CloseIcon,
  SelectIcon,
  TrashIcon,
  BackArrowIcon,
  CamcorderIcon,
  PhoneCallIcon,
} from "./Icons";

const Header = ({
  user,
  activeRoom,
  onSignOut,
  searchQuery,
  onSearchChange,
  soundEnabled,
  onToggleSound,
  messageCount,
  onToggleSelectMode,
  onClearChat,
  isSelectMode,
  onBackToSidebar,
  onStartVideoCall,
  onStartAudioCall,
}) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  // Top-Level Hook Declarations
  const headerBg = useColorModeValue(
    "pulse.lightHeaderBg",
    "pulse.darkHeaderBg",
  );
  const headerBorder = useColorModeValue(
    "pulse.lightBorder",
    "pulse.darkBorder",
  );
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const subtextColor = useColorModeValue(
    "pulse.lightSubtext",
    "pulse.darkSubtext",
  );
  const inputBg = useColorModeValue("pulse.lightInputBg", "pulse.darkInputBg");
  const inputBorder = useColorModeValue("gray.300", "whiteAlpha.100");
  const hoverBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");
  const menuListBg = useColorModeValue("#ffffff", "#1e293b");
  const modalBg = useColorModeValue("#ffffff", "#1e293b");
  const itemPurpleHoverBg = useColorModeValue("purple.50", "whiteAlpha.100");
  const itemRedHoverBg = useColorModeValue("red.50", "whiteAlpha.100");

  const userPhoto = user?.photoURL || user?.providerData?.[0]?.photoURL || "";

  const handleConfirmClearChat = () => {
    onClearChat();
    onClose();
  };

  return (
    <Flex
      w="full"
      h={{ base: "64px", md: "68px" }}
      bg={headerBg}
      borderBottom="1px solid"
      borderColor={headerBorder}
      align="center"
      justify="space-between"
      px={{ base: 3, md: 4 }}
      py={2}
      zIndex="10"
    >
      {/* Clear Chat Confirmation Modal */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <AlertDialogContent bg={modalBg} borderRadius="2xl" overflow="hidden">
          <AlertDialogHeader fontSize="lg" fontWeight="700" color={textColor}>
            Clear Current Chat?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="sm" color={subtextColor}>
            Are you sure you want to clear all messages in this chat for you?
            This action cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter spacing={3}>
            <Button
              ref={cancelRef}
              onClick={onClose}
              size="sm"
              borderRadius="full"
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirmClearChat}
              size="sm"
              borderRadius="full"
            >
              Clear Chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active Room / Contact Info */}
      <HStack spacing={3} flex={1} minW={0}>
        {/* Back button for mobile view */}
        <IconButton
          aria-label="Back to contacts"
          icon={<BackArrowIcon />}
          display={{ base: "flex", md: "none" }}
          variant="ghost"
          size="sm"
          onClick={onBackToSidebar}
          borderRadius="full"
        />

        {activeRoom?.isDM ? (
          <Avatar
            size="sm"
            name={activeRoom.name || "User"}
            src={activeRoom.photoURL || ""}
          >
            <AvatarBadge
              boxSize="1.1em"
              bg="green.500"
              border="2px solid white"
            />
          </Avatar>
        ) : (
          <PulseLogo boxSize="32px" />
        )}

        <VStack spacing={0} align="start" minW={0} flex={1}>
          <Text fontWeight="700" fontSize="sm" color={textColor} noOfLines={1}>
            {activeRoom?.name || "Pulse Chat"}
          </Text>
          <Text fontSize="xs" color={subtextColor}>
            {activeRoom?.isDM ? "online" : `${messageCount} messages`}
          </Text>
        </VStack>
      </HStack>

      {/* Action Controls & Search */}
      <HStack spacing={2} flexShrink={0} justify="flex-end">
        {/* Audio & Video Call Buttons for DMs */}
        {activeRoom?.isDM && (
          <>
            <Tooltip label="Audio Call">
              <IconButton
                size="sm"
                aria-label="Start Audio Call"
                icon={<PhoneCallIcon color="#059669" boxSize="18px" />}
                variant="ghost"
                borderRadius="full"
                onClick={onStartAudioCall}
                _hover={{ bg: hoverBg }}
              />
            </Tooltip>
            <Tooltip label="Video Call">
              <IconButton
                size="sm"
                aria-label="Start Video Call"
                icon={<CamcorderIcon color="#2563eb" boxSize="19px" />}
                variant="ghost"
                borderRadius="full"
                onClick={onStartVideoCall}
                _hover={{ bg: hoverBg }}
              />
            </Tooltip>
          </>
        )}

        {/* Sound Toggle */}
        <Tooltip label={soundEnabled ? "Mute audio" : "Unmute audio"}>
          <IconButton
            size="sm"
            aria-label="Toggle Sound"
            icon={
              soundEnabled ? (
                <SoundOnIcon color="#06b6d4" />
              ) : (
                <SoundOffIcon color="red.400" />
              )
            }
            variant="ghost"
            borderRadius="full"
            color={subtextColor}
            onClick={onToggleSound}
            _hover={{ bg: hoverBg }}
            display={{ base: "none", sm: "flex" }}
          />
        </Tooltip>

        {/* Theme Switcher */}
        <Tooltip
          label={
            colorMode === "dark"
              ? "Switch to Light mode"
              : "Switch to Dark mode"
          }
        >
          <IconButton
            size="sm"
            aria-label="Toggle theme"
            icon={
              colorMode === "dark" ? (
                <SunIcon color="#f59e0b" />
              ) : (
                <MoonIcon color="#8b5cf6" />
              )
            }
            variant="ghost"
            borderRadius="full"
            color={subtextColor}
            onClick={toggleColorMode}
            _hover={{ bg: hoverBg }}
            display={{ base: "none", sm: "flex" }}
          />
        </Tooltip>

        {/* User Options Menu */}
        <Menu>
          <MenuButton
            as={IconButton}
            size="sm"
            aria-label="Options"
            icon={
              <Avatar
                size="xs"
                name={user?.displayName || "U"}
                src={userPhoto}
              />
            }
            variant="ghost"
            borderRadius="full"
          />
          <MenuList bg={menuListBg} borderColor={headerBorder} p={2}>
            <MenuItem
              bg="transparent"
              color={textColor}
              cursor="default"
              fontSize="xs"
            >
              Logged in as{" "}
              <strong>&nbsp;{user?.displayName || user?.email}</strong>
            </MenuItem>
            <MenuDivider borderColor={headerBorder} />

            <Box px={1} pb={2}>
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color={subtextColor} />
                </InputLeftElement>
                <Input
                  placeholder="Search chat..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  bg={inputBg}
                  border="1px solid"
                  borderColor={inputBorder}
                  borderRadius="full"
                  color={textColor}
                  fontSize="xs"
                  h="32px"
                  _placeholder={{ color: subtextColor }}
                  _focus={{
                    bg: inputBg,
                    borderColor: "#8b5cf6",
                    boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.3)",
                  }}
                />
                {searchQuery && (
                  <InputRightElement>
                    <IconButton
                      size="xs"
                      aria-label="Clear search"
                      icon={<CloseIcon />}
                      variant="ghost"
                      onClick={() => onSearchChange("")}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
            </Box>

            <MenuItem
              icon={<SelectIcon color="#8b5cf6" />}
              onClick={onToggleSelectMode}
              bg="transparent"
              fontSize="xs"
              borderRadius="md"
              _hover={{ bg: itemPurpleHoverBg }}
            >
              {isSelectMode ? "Exit Selection Mode" : "Select Messages"}
            </MenuItem>

            <MenuItem
              icon={<TrashIcon color="red.400" />}
              onClick={onOpen}
              bg="transparent"
              fontSize="xs"
              borderRadius="md"
              _hover={{ bg: itemRedHoverBg }}
            >
              Clear Current Chat
            </MenuItem>

            <MenuDivider borderColor={headerBorder} />
            <MenuItem
              icon={<SignOutIcon color="red.400" />}
              color="red.400"
              onClick={onSignOut}
              bg="transparent"
              borderRadius="md"
              _hover={{ bg: itemRedHoverBg }}
            >
              Sign Out
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
};

Header.propTypes = {
  user: PropTypes.object,
  activeRoom: PropTypes.object,
  onSignOut: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  soundEnabled: PropTypes.bool.isRequired,
  onToggleSound: PropTypes.func.isRequired,
  messageCount: PropTypes.number.isRequired,
  onToggleSelectMode: PropTypes.func.isRequired,
  onClearChat: PropTypes.func.isRequired,
  isSelectMode: PropTypes.bool.isRequired,
  onBackToSidebar: PropTypes.func.isRequired,
  onStartVideoCall: PropTypes.func,
  onStartAudioCall: PropTypes.func,
};

export default Header;
