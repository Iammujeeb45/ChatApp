import { useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  Container,
  HStack,
  Input,
  VStack,
} from "@chakra-ui/react";
import Message from "./Components/Message";
import {
  onAuthStateChanged,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { app } from "./Firebase";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

const auth = getAuth(app);
const db = getFirestore(app);

const signinHandler = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider);
};

const signOutHandler = () => {
  signOut(auth);
};

function App() {
  const [user, setUser] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const divForScroll = useRef(null);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("You need to be signed in to send messages.");
      return;
    }

    try {
      setMessage("");
      await addDoc(collection(db, "Message"), {
        text: message,
        uid: user.uid,
        uri: user.photoURL,
        createdAt: serverTimestamp(),
      });
      setMessage("");
      divForScroll.current.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    const m = query(collection(db, "Message"), orderBy("createdAt", "asc"));

    const unsubscribe = onAuthStateChanged(auth, (data) => {
      setUser(data);
    });

    const unsubscribeForMessage = onSnapshot(m, (snap) => {
      setMessages(
        snap.docs.map((item) => {
          const id = item.id;
          return { id, ...item.data() };
        })
      );
    });

    return () => {
      unsubscribe();
      unsubscribeForMessage();
    };
  }, []);

  return (
    <>
      <Box bg={"purple.200"}>
        {user ? (
          <Container h="100vh" bg={"white"}>
            <VStack h="full" paddingY={"5"}>
              <Button onClick={signOutHandler} colorScheme="red" w="full">
                SIGNOUT
              </Button>
              <VStack
                h="full"
                w={"full"}
                overflowY={"auto"}
                css={{
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                }}
              >
                {messages.map((item) => (
                  <Message
                    key={item.id}
                    user={item.uid === user.uid ? "me" : "other"}
                    text={item.text}
                    uri={item.uri}
                  />
                ))}
                <div ref={divForScroll}></div>
              </VStack>

              <form onSubmit={submitHandler} style={{ width: "100%" }}>
                <HStack>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter a message.."
                  />
                  <Button colorScheme={"purple"} type="submit">
                    Send
                  </Button>
                </HStack>
              </form>
            </VStack>
          </Container>
        ) : (
          <Box
            h="100vh"
            w="100vw"
            bgImage="url('https://img.freepik.com/free-psd/3d-rendering-questions-background_23-2151455632.jpg')"
            bgSize="cover"
            bgPosition="center"
            bgRepeat="no-repeat"
          >
            <VStack h={"100vh"} justifyContent={"center"}>
              <Button colorScheme="purple" onClick={signinHandler}>
                Continue with Google
              </Button>
            </VStack>
          </Box>
        )}
      </Box>
    </>
  );
}

export default App;
