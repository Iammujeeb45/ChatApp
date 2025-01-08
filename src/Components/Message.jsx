import PropTypes from "prop-types";
import { HStack, Avatar, Text } from "@chakra-ui/react";

const Message = ({ text, uri, user = "other" }) => {
  return (
    <HStack
      bg={user === "me" ? "purple.100" : "gray.100"}
      paddingX="3"
      paddingY="2"
      borderRadius="base"
      alignSelf={user === "me" ? "flex-end" : "flex-start"}
      maxW="80%"
    >
      {user === "other" && <Avatar src={uri || "https://via.placeholder.com/150"} />}
      <Text>{text}</Text>
      {user === "me" && <Avatar src={uri || "https://via.placeholder.com/150"} />}
    </HStack>
  );
};


Message.propTypes = {
  text: PropTypes.string.isRequired,
  uri: PropTypes.string,            
  user: PropTypes.oneOf(["me", "other"]),
};

Message.defaultProps = {
  uri: "https://via.placeholder.com/150", 
  user: "other",                         
};

export default Message;
