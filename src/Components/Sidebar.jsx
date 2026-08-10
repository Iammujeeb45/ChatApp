import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  VStack,
  HStack,
  Flex,
  Avatar,
  AvatarBadge,
  Text,
  InputGroup,
  InputLeftElement,
  Input,
  IconButton,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@chakra-ui/react";
import {
  PulseLogo,
  SearchIcon,
  CloseIcon,
  UserPlusIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
  SignOutIcon,
} from "./Icons";

const Sidebar = ({
  currentUser,
  allUsersList = [],
  recentContactsList = [],
  activeRoom,
  onSelectDM,
  onSignOut,
}) => {
  const [searchContact, setSearchContact] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  const sidebarBg = useColorModeValue("pulse.lightHeaderBg", "pulse.darkHeaderBg");
  const borderColor = useColorModeValue("pulse.lightBorder", "pulse.darkBorder");
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const subtextColor = useColorModeValue("pulse.lightSubtext", "pulse.darkSubtext");
  const inputBg = useColorModeValue("pulse.lightInputBg", "pulse.darkInputBg");
  const modalBg = useColorModeValue("#ffffff", "#1e293b");
  const hoverBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const activeBg = useColorModeValue("blue.100", "rgba(37, 99, 235, 0.2)");
  const menuListBg = useColorModeValue("#ffffff", "#1e293b");
  const itemRedHoverBg = useColorModeValue("red.50", "whiteAlpha.100");
  const itemHoverBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");

  const currentUserPhoto = currentUser?.photoURL || currentUser?.providerData?.[0]?.photoURL || "";

  // Filter recent contacts in sidebar
  const filteredRecentContacts = recentContactsList.filter(
    (u) =>
      u.uid !== currentUser?.uid &&
      ((u.displayName || "").toLowerCase().includes(searchContact.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchContact.toLowerCase()))
  );

  // Filter all users in New Chat Modal ONLY when user types a search query
  const searchTrim = modalSearch.trim().toLowerCase();
  const modalFilteredUsers = searchTrim
    ? allUsersList.filter(
        (u) =>
          u.uid !== currentUser?.uid &&
          ((u.displayName || "").toLowerCase().includes(searchTrim) ||
            (u.email || "").toLowerCase().includes(searchTrim))
      )
    : [];

  const handleSelectContactFromModal = (member) => {
    onSelectDM(member);
    onClose();
    setModalSearch("");
  };

  return (
    <Flex
      direction="column"
      w={{ base: "full", md: "320px", lg: "360px" }}
      h="full"
      bg={sidebarBg}
      borderRight="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
      zIndex="5"
    >
      {/* New Chat Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(6px)" bg="blackAlpha.600" />
        <ModalContent bg={modalBg} borderRadius="2xl" overflow="hidden">
          <ModalHeader borderBottom="1px solid" borderColor={borderColor} py={3}>
            <HStack spacing={2}>
              <UserPlusIcon color="#2563eb" />
              <Text fontSize="md" fontWeight="700" color={textColor}>
                Start New Private Chat
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton mt={1} />
          <ModalBody p={4}>
            <InputGroup size="sm" mb={4}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color={subtextColor} />
              </InputLeftElement>
              <Input
                placeholder="Type Gmail address or Name to search..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                bg={inputBg}
                borderRadius="full"
                fontSize="xs"
                color={textColor}
                _placeholder={{ color: subtextColor }}
                autoFocus
              />
            </InputGroup>

            <VStack maxH="320px" overflowY="auto" spacing={2} align="stretch">
              {!searchTrim ? (
                <Box p={6} textAlign="center">
                  <UserPlusIcon boxSize="28px" color={subtextColor} mx="auto" mb={2} />
                  <Text fontSize="xs" color={subtextColor} fontWeight="500">
                    Type a Gmail address or Name above to find a user.
                  </Text>
                </Box>
              ) : modalFilteredUsers.length === 0 ? (
                <Box p={6} textAlign="center">
                  <Text fontSize="xs" color="red.400" fontWeight="600">
                    No data found matching "{modalSearch}"
                  </Text>
                </Box>
              ) : (
                modalFilteredUsers.map((member) => {
                  const memberPhoto = member.photoURL || member.uri || (member.providerData && member.providerData[0]?.photoURL) || "";
                  return (
                    <Box
                      key={member.uid}
                      p={3}
                      borderRadius="xl"
                      cursor="pointer"
                      _hover={{ bg: hoverBg }}
                      onClick={() => handleSelectContactFromModal(member)}
                      transition="all 0.15s"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <HStack spacing={3}>
                        <Avatar
                          size="md"
                          name={member.displayName || "User"}
                          src={memberPhoto}
                        >
                          <AvatarBadge boxSize="1.1em" bg="green.500" border="2px solid white" />
                        </Avatar>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>
                            {member.displayName || "Pulse Member"}
                          </Text>
                          <Text fontSize="xs" color={subtextColor} noOfLines={1}>
                            {member.email}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  );
                })
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Sidebar Top Header */}
      <Flex
        h="68px"
        align="center"
        justify="space-between"
        px={4}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <HStack spacing={3}>
          <PulseLogo boxSize="32px" />
          <Text fontWeight="800" fontSize="lg" bgGradient="linear(to-r, #0284c7, #2563eb)" bgClip="text">
            PulseChat
          </Text>
        </HStack>

        {/* Profile Avatar Menu for Mobile & Desktop Sidebar */}
        <Menu>
          <MenuButton
            as={IconButton}
            size="sm"
            aria-label="Profile options"
            icon={
              <Avatar
                size="sm"
                name={currentUser?.displayName || "Me"}
                src={currentUserPhoto}
                border="2px solid"
                borderColor="#2563eb"
              >
                <AvatarBadge boxSize="1.1em" bg="green.500" border="2px solid white" />
              </Avatar>
            }
            variant="ghost"
            borderRadius="full"
          />
          <MenuList bg={menuListBg} borderColor={borderColor} p={2} zIndex="20">
            <MenuItem bg="transparent" color={textColor} cursor="default" fontSize="xs">
              Logged in as <strong>&nbsp;{currentUser?.displayName || currentUser?.email}</strong>
            </MenuItem>
            <MenuDivider borderColor={borderColor} />

            {/* Toggle Theme option */}
            <MenuItem
              icon={colorMode === "dark" ? <SunIcon color="#f59e0b" /> : <MoonIcon color="#2563eb" />}
              onClick={toggleColorMode}
              bg="transparent"
              fontSize="xs"
              borderRadius="md"
              _hover={{ bg: itemHoverBg }}
            >
              {colorMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </MenuItem>

            <MenuDivider borderColor={borderColor} />

            {/* Sign Out option */}
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
      </Flex>

      {/* Search Bar & New Chat (+) Button */}
      <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
        <HStack spacing={2}>
          <InputGroup size="sm" flex={1}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color={subtextColor} />
            </InputLeftElement>
            <Input
              placeholder="Search recent chats..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              bg={inputBg}
              border="1px solid"
              borderColor={useColorModeValue("gray.300", "whiteAlpha.100")}
              borderRadius="full"
              fontSize="xs"
              color={textColor}
              _placeholder={{ color: subtextColor }}
              _focus={{
                borderColor: "#2563eb",
                boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.25)",
              }}
            />
            {searchContact && (
              <IconButton
                size="xs"
                aria-label="Clear contact search"
                icon={<CloseIcon />}
                variant="ghost"
                onClick={() => setSearchContact("")}
                pos="absolute"
                right="4px"
                top="50%"
                transform="translateY(-50%)"
                zIndex="2"
              />
            )}
          </InputGroup>

          <Tooltip label="Start New Chat">
            <IconButton
              aria-label="New Chat"
              icon={<PlusIcon color="white" />}
              size="sm"
              bg="#2563eb"
              borderRadius="full"
              _hover={{ bg: "#1d4ed8" }}
              onClick={onOpen}
            />
          </Tooltip>
        </HStack>
      </Box>

      {/* Active Direct Contacts List */}
      <VStack flex={1} overflowY="auto" spacing={1} p={2} align="stretch">
        <HStack justify="space-between" px={3} pt={2} pb={1}>
          <Text fontSize="11px" fontWeight="700" color={subtextColor} letterSpacing="wider" textTransform="uppercase">
            Direct Messages ({filteredRecentContacts.length})
          </Text>
          <Text
            fontSize="10px"
            fontWeight="600"
            color="#2563eb"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={onOpen}
          >
            + New Chat
          </Text>
        </HStack>

        {filteredRecentContacts.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text fontSize="xs" color={subtextColor} mb={3}>
              {searchContact ? `No recent chats matching "${searchContact}"` : "No direct messages yet."}
            </Text>
            <IconButton
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              icon={<UserPlusIcon />}
              aria-label="Find contacts"
              onClick={onOpen}
            />
          </Box>
        ) : (
          filteredRecentContacts.map((member) => {
            const isSelectedDM = activeRoom?.id === (member.dmRoomId || member.uid);
            const memberPhoto = member.photoURL || member.uri || (member.providerData && member.providerData[0]?.photoURL) || "";
            return (
              <Box
                key={member.uid}
                p={3}
                borderRadius="xl"
                cursor="pointer"
                bg={isSelectedDM ? activeBg : "transparent"}
                border={isSelectedDM ? "1px solid #2563eb" : "1px solid transparent"}
                _hover={{ bg: hoverBg }}
                onClick={() => onSelectDM(member)}
                transition="all 0.15s"
              >
                <HStack spacing={3}>
                  <Avatar
                    size="md"
                    name={member.displayName || "User"}
                    src={memberPhoto}
                  >
                    <AvatarBadge boxSize="1.1em" bg="green.500" border="2px solid white" />
                  </Avatar>
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>
                      {member.displayName || "Pulse Member"}
                    </Text>
                    <Text fontSize="xs" color={subtextColor} noOfLines={1}>
                      {member.email}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            );
          })
        )}
      </VStack>
    </Flex>
  );
};

Sidebar.propTypes = {
  currentUser: PropTypes.object,
  allUsersList: PropTypes.array.isRequired,
  recentContactsList: PropTypes.array.isRequired,
  activeRoom: PropTypes.object,
  onSelectDM: PropTypes.func.isRequired,
  onSignOut: PropTypes.func,
};

export default Sidebar;
