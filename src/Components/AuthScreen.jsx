import React from "react";
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  Flex,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import { GoogleIcon, PulseLogo } from "./Icons";

const AuthScreen = ({ onSignIn }) => {
  const bg = useColorModeValue("pulse.lightAppBg", "pulse.darkAppBg");
  const cardBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue(
    "pulse.lightBorder",
    "pulse.darkBorder",
  );
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const subtextColor = useColorModeValue(
    "pulse.lightSubtext",
    "pulse.darkSubtext",
  );

  return (
    <Flex h="100vh" w="100vw" align="center" justify="center" bg={bg} p={4}>
      <VStack spacing={6} w="full" maxW="400px">
        {/* Logo & Title */}
        <VStack spacing={3}>
          <PulseLogo boxSize="52px" />
          <Heading
            size="lg"
            fontWeight="800"
            color={textColor}
            letterSpacing="tight"
          >
            PulseChat
          </Heading>
          <Text fontSize="sm" color={subtextColor} textAlign="center">
            Sign in to start messaging
          </Text>
        </VStack>

        {/* Clean Login Card */}
        <Box
          w="full"
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="2xl"
          boxShadow="0 10px 25px -5px rgba(0, 0, 0, 0.1)"
          p={6}
        >
          <VStack spacing={4}>
            <Button
              w="full"
              h="48px"
              bg="#2563eb"
              color="white"
              borderRadius="xl"
              leftIcon={<GoogleIcon />}
              onClick={onSignIn}
              fontWeight="600"
              fontSize="sm"
              boxShadow="0 4px 12px rgba(37, 99, 235, 0.3)"
              _hover={{
                bg: "#1d4ed8",
                transform: "translateY(-1px)",
              }}
              _active={{
                transform: "translateY(0)",
              }}
              transition="all 0.15s ease"
            >
              Sign in with Google
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Flex>
  );
};

AuthScreen.propTypes = {
  onSignIn: PropTypes.func.isRequired,
};

export default AuthScreen;
