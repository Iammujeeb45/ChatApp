import { useEffect, useRef, useState } from "react";
import {
  Box,
  Container,
  VStack,
  Flex,
  HStack,
  IconButton,
  Button,
  Text,
  Heading,
  useColorModeValue,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import Message from "./Components/Message";
import Header from "./Components/Header";
import Sidebar from "./Components/Sidebar";
import ChatInput from "./Components/ChatInput";
import AuthScreen from "./Components/AuthScreen";
import MediaPreviewModal from "./Components/MediaPreviewModal";
import VideoCallModal from "./Components/VideoCallModal";
import {
  DownChevronIcon,
  TrashIcon,
  CloseIcon,
  CheckSquareIcon,
  PulseLogo,
  LockIcon,
} from "./Components/Icons";
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
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from "firebase/storage";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Web Audio API pop sound generator
const playSendSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

const signinHandler = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider);
};

const signOutHandler = () => {
  signOut(auth);
};

const sanitizeFileName = (name = "media") =>
  name.replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_");

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error(`Unable to encode image as ${type}.`));
      },
      type,
      quality,
    );
  });

const compressImageFile = async (file) => {
  const image = await loadImageFromFile(file);
  const maxWidth = 1600;
  const maxHeight = 1600;

  let { width, height } = image;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let blob = null;
  let contentType = "image/webp";
  let extension = "webp";

  try {
    blob = await canvasToBlob(canvas, "image/webp", 0.82);
  } catch {
    blob = null;
  }

  if (!blob) {
    try {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.78);
      contentType = "image/jpeg";
      extension = "jpg";
    } catch {
      return null;
    }
  }

  return {
    blob,
    contentType,
    extension,
  };
};

const uploadMediaToStorage = async ({
  roomId,
  uid,
  file,
  mediaUrl,
  mediaType,
  mediaName,
}) => {
  const timestamp = Date.now();
  const safeBaseName = sanitizeFileName(mediaName || `${mediaType}_upload`);

  if (file instanceof File || file instanceof Blob) {
    if (mediaType === "image") {
      const compressed = await compressImageFile(file);
      const safeImageBaseName = safeBaseName.replace(/\.[^.]+$/, "");

      if (compressed?.blob) {
        const imageRef = ref(storage, `messages/${roomId}/${uid}/${timestamp}_${safeImageBaseName}.${compressed.extension}`);
        await uploadBytes(imageRef, compressed.blob, { contentType: compressed.contentType });
        return {
          url: await getDownloadURL(imageRef),
          storagePath: imageRef.fullPath,
        };
      }

      const fallbackRef = ref(storage, `messages/${roomId}/${uid}/${timestamp}_${safeBaseName}`);
      await uploadBytes(fallbackRef, file, {
        contentType: file.type || "application/octet-stream",
      });
      return {
        url: await getDownloadURL(fallbackRef),
        storagePath: fallbackRef.fullPath,
      };
    }

    const fileRef = ref(storage, `messages/${roomId}/${uid}/${timestamp}_${safeBaseName}`);
    await uploadBytes(fileRef, file, {
      contentType: file.type || "application/octet-stream",
    });
    return {
      url: await getDownloadURL(fileRef),
      storagePath: fileRef.fullPath,
    };
  }

  if (mediaUrl) {
    const dataRef = ref(storage, `messages/${roomId}/${uid}/${timestamp}_${safeBaseName}`);
    await uploadString(dataRef, mediaUrl, "data_url");
    return {
      url: await getDownloadURL(dataRef),
      storagePath: dataRef.fullPath,
    };
  }

  throw new Error("No media payload found for upload.");
};

function App() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [allMessages, setAllMessages] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);

  // Quoted Message Reply State
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  // Active DM Room Navigation
  const [activeRoom, setActiveRoom] = useState(null);

  // Video Call State & Active Call Session
  const [activeCallSession, setActiveCallSession] = useState(null);

  // Explicitly opened contacts for current user
  const [openedContacts, setOpenedContacts] = useState([]);

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Soft Delete & Selection State
  const [deletedMessageIds, setDeletedMessageIds] = useState(() => {
    try {
      const saved = localStorage.getItem("pulse_deleted_msg_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  // Delete Selected Confirmation Dialog State
  const {
    isOpen: isDeleteSelectedOpen,
    onOpen: onDeleteSelectedOpen,
    onClose: onDeleteSelectedClose,
  } = useDisclosure();
  const cancelDeleteSelectedRef = useRef();

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const toast = useToast();

  // Top-Level React Color Mode Hooks
  const appBg = useColorModeValue("pulse.lightAppBg", "pulse.darkAppBg");
  const containerBg = useColorModeValue("pulse.lightChatBg", "pulse.darkChatBg");
  const borderColor = useColorModeValue("pulse.lightBorder", "pulse.darkBorder");
  const canvasPattern = useColorModeValue(
    "radial-gradient(rgba(100, 116, 139, 0.12) 1.2px, transparent 1.2px)",
    "radial-gradient(rgba(255, 255, 255, 0.05) 1.2px, transparent 1.2px)"
  );
  const selectionBarBg = useColorModeValue("blue.600", "blue.900");
  const emptyBoxBg = useColorModeValue("white", "rgba(30, 41, 59, 0.8)");
  const emptyBoxTextColor = useColorModeValue("gray.700", "gray.300");
  const scrollBtnBg = useColorModeValue("white", "#1e293b");
  const scrollBtnColor = useColorModeValue("gray.700", "gray.200");
  const modalBg = useColorModeValue("#ffffff", "#1e293b");
  const textColor = useColorModeValue("pulse.lightText", "pulse.darkText");
  const subtextColor = useColorModeValue("pulse.lightSubtext", "pulse.darkSubtext");

  const userPhoto = user?.photoURL || user?.providerData?.[0]?.photoURL || "";

  // Save deleted message IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pulse_deleted_msg_ids", JSON.stringify(deletedMessageIds));
    } catch (e) {
      console.error("Failed to save deleted message IDs:", e);
    }
  }, [deletedMessageIds]);

  // Start 1-on-1 Video Call
  const handleStartVideoCall = async () => {
    if (!user || !activeRoom || !activeRoom.recipientUid) return;

    try {
      const callDocRef = await addDoc(collection(db, "Calls"), {
        roomId: activeRoom.id,
        callerUid: user.uid,
        callerName: user.displayName || user.email?.split("@")[0] || "User",
        callerPhoto: userPhoto,
        recipientUid: activeRoom.recipientUid,
        recipientName: activeRoom.name,
        recipientPhoto: activeRoom.photoURL || "",
        status: "calling",
        createdAt: serverTimestamp(),
      });

      setActiveCallSession({
        id: callDocRef.id,
        roomId: activeRoom.id,
        callerUid: user.uid,
        callerName: user.displayName || user.email?.split("@")[0] || "User",
        callerPhoto: userPhoto,
        recipientName: activeRoom.name,
        recipientPhoto: activeRoom.photoURL || "",
        status: "calling",
      });
    } catch (e) {
      alert("Failed to initiate video call: " + e.message);
    }
  };

  // Accept Incoming Video Call
  const handleAcceptCall = async (callId) => {
    try {
      await updateDoc(doc(db, "Calls", callId), {
        status: "connected",
      });
      setActiveCallSession((prev) => (prev ? { ...prev, status: "connected" } : null));
    } catch (e) {
      console.error("Failed to accept call:", e);
    }
  };

  // End Active Video Call
  const handleEndCall = async (callId) => {
    if (callId) {
      try {
        await updateDoc(doc(db, "Calls", callId), {
          status: "ended",
        });
      } catch {
        // Ignore if already deleted
      }
    }
    setActiveCallSession(null);
  };

  // Handle Direct Message Contact Selection
  const handleSelectDM = (contactUser) => {
    if (!user) return;
    const dmRoomId = [user.uid, contactUser.uid].sort().join("_");
    const contactPhoto = contactUser.photoURL || contactUser.uri || "";
    setActiveRoom({
      id: dmRoomId,
      name: contactUser.displayName || contactUser.email?.split("@")[0] || "Pulse Member",
      isDM: true,
      photoURL: contactPhoto,
      recipientUid: contactUser.uid,
    });
    setOpenedContacts((prev) => {
      if (prev.some((c) => c.uid === contactUser.uid)) return prev;
      return [...prev, contactUser];
    });
    setShowMobileChat(true);
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    setReplyingToMessage(null);
  };

  const handlePickMedia = ({ file, mediaType, mediaName }) => {
    if (!file || !mediaType) return;

    const mediaPreviewUrl = URL.createObjectURL(file);
    setPendingMedia({
      file,
      mediaType,
      mediaName,
      mediaPreviewUrl,
    });
    setMediaPreviewOpen(true);
    setMessage("");
  };

  const handleCloseMediaPreview = () => {
    if (pendingMedia?.mediaPreviewUrl) {
      URL.revokeObjectURL(pendingMedia.mediaPreviewUrl);
    }
    setPendingMedia(null);
    setMediaPreviewOpen(false);
  };

  // Send Text Message
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!user || !activeRoom) return;
    if (!message.trim()) return;

    const messageText = message.trim();
    setMessage("");

    const currentReplyPayload = replyingToMessage;
    setReplyingToMessage(null);

    if (soundEnabled) {
      playSendSound();
    }

    try {
      await addDoc(collection(db, "Message"), {
        text: messageText,
        uid: user.uid,
        uri: userPhoto,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        roomId: activeRoom.id,
        replyTo: currentReplyPayload,
        reactions: {},
        createdAt: serverTimestamp(),
      });

      scrollToBottom();
    } catch (error) {
      alert("Failed to send message: " + error.message);
    }
  };

  // Send Media Message
  const sendMediaHandler = async ({
    file,
    mediaUrl,
    mediaType,
    caption = "",
    mediaName = "",
  }) => {
    if (!user || !activeRoom) return;

    const currentReplyPayload = replyingToMessage;
    setReplyingToMessage(null);

    if (soundEnabled) {
      playSendSound();
    }

    try {
      const uploadedMedia = await uploadMediaToStorage({
        roomId: activeRoom.id,
        uid: user.uid,
        file,
        mediaUrl,
        mediaType,
        mediaName,
      });

      await addDoc(collection(db, "Message"), {
        text: caption || "",
        caption: caption || "",
        mediaUrl: uploadedMedia.url,
        mediaType,
        mediaName,
        storagePath: uploadedMedia.storagePath,
        uid: user.uid,
        uri: userPhoto,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        roomId: activeRoom.id,
        replyTo: currentReplyPayload,
        reactions: {},
        createdAt: serverTimestamp(),
      });

      scrollToBottom();
    } catch (error) {
      alert("Failed to send media: " + error.message);
    }
  };

  const handleConfirmPendingMedia = async (caption) => {
    if (!pendingMedia || !user || !activeRoom) return;

    const mediaPayload = pendingMedia;
    const currentReplyPayload = replyingToMessage;
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    setPendingMessages((prev) => [
      ...prev,
      {
        id: tempId,
        roomId: activeRoom.id,
        uid: user.uid,
        uri: userPhoto,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        text: caption || "",
        caption: caption || "",
        mediaUrl: mediaPayload.mediaPreviewUrl,
        mediaType: mediaPayload.mediaType,
        mediaName: mediaPayload.mediaName,
        createdAt: new Date(),
        isPending: true,
      },
    ]);

    setReplyingToMessage(null);
    handleCloseMediaPreview();
    if (soundEnabled) {
      playSendSound();
    }

    (async () => {
      try {
        const uploadedMedia = await uploadMediaToStorage({
          roomId: activeRoom.id,
          uid: user.uid,
          file: mediaPayload.file,
          mediaType: mediaPayload.mediaType,
          mediaName: mediaPayload.mediaName,
        });

        await addDoc(collection(db, "Message"), {
          text: caption || "",
          caption: caption || "",
          mediaUrl: uploadedMedia.url,
          mediaType: mediaPayload.mediaType,
          mediaName: mediaPayload.mediaName,
          storagePath: uploadedMedia.storagePath,
          uid: user.uid,
          uri: userPhoto,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          roomId: activeRoom.id,
          replyTo: currentReplyPayload,
          reactions: {},
          createdAt: serverTimestamp(),
        });

        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
        scrollToBottom();
      } catch (error) {
        console.error("Failed to send media:", error);
        setPendingMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isPending: false, sendError: true } : m,
          ),
        );
        toast({
          title: "Failed to send media",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    })();
  };

  // Toggle Emoji Reaction in Firestore
  const handleToggleReaction = async (messageId, emoji) => {
    if (!user || !messageId) return;

    const msgDoc = allMessages.find((m) => m.id === messageId);
    if (!msgDoc) return;

    const currentReactions = msgDoc.reactions || {};
    const existingUids = currentReactions[emoji] || [];

    let updatedUids;
    if (existingUids.includes(user.uid)) {
      updatedUids = existingUids.filter((id) => id !== user.uid);
    } else {
      updatedUids = [...existingUids, user.uid];
    }

    const updatedReactions = {
      ...currentReactions,
      [emoji]: updatedUids,
    };

    try {
      const msgRef = doc(db, "Message", messageId);
      await updateDoc(msgRef, {
        reactions: updatedReactions,
      });
    } catch (e) {
      console.error("Failed to update reaction:", e);
    }
  };

  // Delete Single Message for Me (Local)
  const handleDeleteSingle = (id) => {
    setDeletedMessageIds((prev) => [...prev, id]);
    toast({
      title: "Message deleted for you",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  // Delete Single Message for Everyone (Firestore)
  const handleDeleteForEveryone = async (id) => {
    try {
      await deleteDoc(doc(db, "Message", id));
      toast({
        title: "Message deleted for everyone",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (e) {
      alert("Failed to delete message for everyone: " + e.message);
    }
  };

  // Confirm & Delete Selected Messages for Me
  const handleConfirmDeleteSelectedMe = () => {
    if (selectedMessageIds.length === 0) return;
    setDeletedMessageIds((prev) => [...new Set([...prev, ...selectedMessageIds])]);
    toast({
      title: `${selectedMessageIds.length} message(s) deleted for you`,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    onDeleteSelectedClose();
  };

  // Confirm & Delete Selected Messages for Everyone
  const handleConfirmDeleteSelectedEveryone = async () => {
    if (selectedMessageIds.length === 0) return;
    try {
      await Promise.all(
        selectedMessageIds.map((id) => deleteDoc(doc(db, "Message", id)))
      );
      toast({
        title: `${selectedMessageIds.length} message(s) deleted for everyone`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (e) {
      alert("Failed to delete messages for everyone: " + e.message);
    }
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    onDeleteSelectedClose();
  };

  // Soft Clear All Chat
  const handleClearChat = () => {
    const currentRoomMsgIds = filteredVisibleMessages.map((m) => m.id);
    setDeletedMessageIds((prev) => [...new Set([...prev, ...currentRoomMsgIds])]);
    toast({
      title: "Chat cleared for you",
      status: "info",
      duration: 2500,
      isClosable: true,
    });
    setSelectedMessageIds([]);
    setIsSelectMode(false);
  };

  // Toggle Selection of Message
  const handleToggleSelect = (id) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select All Visible Messages
  const handleSelectAll = () => {
    const visibleIds = filteredVisibleMessages.map((m) => m.id);
    if (selectedMessageIds.length === visibleIds.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(visibleIds);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  // Auth Listener & User Registration in Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "Users", currentUser.uid);
          await setDoc(
            userRef,
            {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Pulse Member",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || currentUser.providerData?.[0]?.photoURL || "",
              lastSeen: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error("Failed to register user in Firestore:", e);
        }
      }
    });

    // Listen to registered users in Firestore
    const usersQuery = query(collection(db, "Users"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snap) => {
      const uDocs = snap.docs.map((d) => d.data());
      setUsersList(uDocs);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, []);

  // Listen to all messages in Firestore
  useEffect(() => {
    const q = query(collection(db, "Message"), orderBy("createdAt", "asc"));

    const unsubscribeMessages = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((item) => ({
        id: item.id,
        roomId: item.data().roomId || "global",
        ...item.data(),
      }));
      setAllMessages(docs);
      setTimeout(scrollToBottom, 100);
    });

    return unsubscribeMessages;
  }, []);

  // Listen to incoming Video Calls in Firestore
  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, "Calls"),
      where("recipientUid", "==", user.uid),
      where("status", "==", "calling")
    );

    const unsubscribeCalls = onSnapshot(callsQuery, (snap) => {
      if (!snap.empty) {
        const callDoc = snap.docs[0];
        setActiveCallSession({
          id: callDoc.id,
          ...callDoc.data(),
        });
      }
    });

    return () => unsubscribeCalls();
  }, [user]);

  // Real-time listener for active call termination on both devices
  useEffect(() => {
    if (!activeCallSession?.id) return;

    const unsubActive = onSnapshot(doc(db, "Calls", activeCallSession.id), (snap) => {
      const data = snap.data();
      if (!data || data.status === "ended") {
        setActiveCallSession(null);
      } else if (data.status === "connected" && activeCallSession.status !== "connected") {
        setActiveCallSession((prev) => (prev ? { ...prev, status: "connected" } : null));
      }
    });

    return () => unsubActive();
  }, [activeCallSession?.id]);

  // Filter recent contacts and merge photoURL from latest messages if needed
  const myRecentContacts = usersList
    .filter((otherUser) => {
      if (!user || otherUser.uid === user.uid) return false;
      if (openedContacts.some((c) => c.uid === otherUser.uid)) return true;
      const dmRoomId = [user.uid, otherUser.uid].sort().join("_");
      return allMessages.some((m) => m.roomId === dmRoomId);
    })
    .map((otherUser) => {
      const userMsg = allMessages.find((m) => m.uid === otherUser.uid && m.uri);
      return {
        ...otherUser,
        photoURL: otherUser.photoURL || userMsg?.uri || "",
      };
    });

  // Messages for active room
  const activeRoomMessages = activeRoom
    ? allMessages.filter((m) => m.roomId === activeRoom.id)
    : [];

  // Filter messages based on soft-delete IDs and search query
  const filteredVisibleMessages = activeRoomMessages
    .filter((m) => !deletedMessageIds.includes(m.id))
    .filter(
      (m) =>
        (m.text || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.caption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mediaName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  const visiblePendingMessages = pendingMessages.filter(
    (m) => m.roomId === activeRoom?.id,
  );

  useEffect(() => {
    if (!activeRoom) return;
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [activeRoom?.id, filteredVisibleMessages.length]);

  if (!user) {
    return <AuthScreen onSignIn={signinHandler} />;
  }

  return (
    <Flex
      minH="100dvh"
      w="100vw"
      bg={appBg}
      justify="stretch"
      align="stretch"
      p={{ base: 0, md: 4 }}
      overflow="hidden"
    >
      {/* Real-Time Video Calling Overlay & Incoming Call Modal */}
      <VideoCallModal
        callSession={activeCallSession}
        currentUser={user}
        onAcceptCall={handleAcceptCall}
        onEndCall={handleEndCall}
      />

      {/* Delete Selected Messages Confirmation Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteSelectedOpen}
        leastDestructiveRef={cancelDeleteSelectedRef}
        onClose={onDeleteSelectedClose}
        isCentered
      >
        <AlertDialogOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <AlertDialogContent bg={modalBg} borderRadius="2xl" overflow="hidden">
          <AlertDialogHeader fontSize="lg" fontWeight="700" color={textColor}>
            Delete {selectedMessageIds.length} Selected Message(s)?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="sm" color={subtextColor}>
            Would you like to delete these {selectedMessageIds.length} selected message(s) for yourself or for everyone in this chat?
          </AlertDialogBody>
          <AlertDialogFooter flexWrap="wrap" gap={2}>
            <Button
              ref={cancelDeleteSelectedRef}
              onClick={onDeleteSelectedClose}
              size="sm"
              borderRadius="full"
            >
              Cancel
            </Button>
            <Button
              colorScheme="gray"
              onClick={handleConfirmDeleteSelectedMe}
              size="sm"
              borderRadius="full"
            >
              Delete for Me
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirmDeleteSelectedEveryone}
              size="sm"
              borderRadius="full"
            >
              Delete for Everyone
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Container
        maxW="1280px"
        h={{ base: "100dvh", md: "calc(100dvh - 36px)" }}
        minH="0"
        w="full"
        p={0}
        borderRadius={{ base: "0", md: "2xl" }}
        overflow="hidden"
        boxShadow="0 20px 40px -15px rgba(0, 0, 0, 0.15)"
        border="1px solid"
        borderColor={borderColor}
        bg={containerBg}
      >
        <Flex h="full" w="full" pos="relative">
          {/* Left Sidebar */}
          <Box
            w={{ base: "full", md: "320px", lg: "360px" }}
            h="full"
            minH={0}
            display={{ base: showMobileChat ? "none" : "block", md: "block" }}
          >
            <Sidebar
              currentUser={user}
              allUsersList={usersList}
              recentContactsList={myRecentContacts}
              activeRoom={activeRoom}
              onSelectDM={handleSelectDM}
              onSignOut={signOutHandler}
            />
          </Box>

          {/* Active Chat Area */}
          <Box
            flex={1}
            h="full"
            minH={0}
            display={{ base: showMobileChat ? "block" : "none", md: "block" }}
          >
            {!activeRoom ? (
              /* WhatsApp Web Empty State when no chat is selected */
              <Flex
                h="full"
                w="full"
                direction="column"
                align="center"
                justify="center"
                p={8}
                bgImage={canvasPattern}
                bgSize="24px 24px"
                textAlign="center"
              >
                <VStack spacing={4} maxW="420px">
                  <PulseLogo boxSize="64px" />
                  <Heading size="lg" fontWeight="800" color={textColor}>
                    PulseChat Web
                  </Heading>
                  <Text fontSize="sm" color={subtextColor} lineHeight="1.6">
                    Send and receive messages in real time. Click <strong>+ New Chat</strong> on the left sidebar to search for a user and start chatting privately.
                  </Text>
                  <HStack spacing={2} pt={2} color={subtextColor} fontSize="xs">
                    <LockIcon color="#2563eb" />
                    <Text fontWeight="600">End-to-End Real-Time Synchronization</Text>
                  </HStack>
                </VStack>
              </Flex>
            ) : (
              <Flex direction="column" h="full" w="full" minH={0}>
                {/* Header */}
                <Header
                  user={user}
                  activeRoom={activeRoom}
                  onSignOut={signOutHandler}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled(!soundEnabled)}
                  messageCount={filteredVisibleMessages.length}
                  onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
                  onClearChat={handleClearChat}
                  isSelectMode={isSelectMode}
                  onBackToSidebar={() => setShowMobileChat(false)}
                  onStartVideoCall={handleStartVideoCall}
                />

                {/* Selection Action Bar */}
                {isSelectMode && (
                  <Flex
                    px={5}
                    py={2.5}
                    bg={selectionBarBg}
                    color="white"
                    align="center"
                    justify="space-between"
                    boxShadow="md"
                  >
                    <HStack spacing={3}>
                      <IconButton
                        aria-label="Cancel Selection"
                        icon={<CloseIcon color="white" />}
                        variant="ghost"
                        size="sm"
                        borderRadius="full"
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedMessageIds([]);
                        }}
                      />
                      <Text fontSize="sm" fontWeight="700">
                        {selectedMessageIds.length} Selected
                      </Text>
                    </HStack>

                    <HStack spacing={2}>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="white"
                        leftIcon={
                          <CheckSquareIcon boxSize="14px" color="white" />
                        }
                        onClick={handleSelectAll}
                      >
                        Select All
                      </Button>
                      <Button
                        size="xs"
                        colorScheme="red"
                        leftIcon={<TrashIcon boxSize="14px" />}
                        isDisabled={selectedMessageIds.length === 0}
                        onClick={onDeleteSelectedOpen}
                        borderRadius="full"
                      >
                        Delete Selected
                      </Button>
                    </HStack>
                  </Flex>
                )}

                {/* Chat Messages Container */}
                <VStack
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  flex={1}
                  minH={0}
                  w="full"
                  overflowY="auto"
                  overflowX="hidden"
                  py={5}
                  spacing={0}
                  bgImage={canvasPattern}
                  bgSize="24px 24px"
                  pos="relative"
                  css={{
                    "&::-webkit-scrollbar": {
                      width: "6px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "rgba(37, 99, 235, 0.3)",
                      borderRadius: "3px",
                    },
                  }}
                >
                  {filteredVisibleMessages.length === 0 ? (
                    <Flex h="full" align="center" justify="center" p={6}>
                      <Box
                        bg={emptyBoxBg}
                        border="1px solid"
                        borderColor={borderColor}
                        px={5}
                        py={2.5}
                        borderRadius="full"
                        boxShadow="sm"
                      >
                        <Text
                          fontSize="xs"
                          color={emptyBoxTextColor}
                          fontWeight="600"
                        >
                          {searchQuery
                            ? `No messages found matching "${searchQuery}"`
                            : `⚡ ${activeRoom.name} active. Send a message!`}
                        </Text>
                      </Box>
                    </Flex>
                  ) : (
                    [...filteredVisibleMessages, ...visiblePendingMessages].map((item) => (
                      <Message
                        key={item.id}
                        id={item.id}
                        user={item.uid === user.uid ? "me" : "other"}
                        text={item.text}
                        caption={item.caption}
                        mediaUrl={item.mediaUrl}
                        mediaType={item.mediaType}
                        mediaName={item.mediaName}
                        uri={item.uri || (item.uid === user.uid ? userPhoto : "")}
                        senderName={item.displayName}
                        uid={item.uid}
                        createdAt={item.createdAt}
                        replyTo={item.replyTo}
                        reactions={item.reactions}
                        currentUid={user.uid}
                        isSelectMode={isSelectMode}
                        isSelected={selectedMessageIds.includes(item.id)}
                        onToggleSelect={handleToggleSelect}
                        onDeleteSingle={handleDeleteSingle}
                        onDeleteForEveryone={handleDeleteForEveryone}
                        onReply={setReplyingToMessage}
                        onToggleReaction={handleToggleReaction}
                        isPending={item.isPending}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </VStack>

                {/* Scroll to bottom button */}
                {showScrollBottom && (
                  <IconButton
                    aria-label="Scroll to bottom"
                    icon={<DownChevronIcon />}
                    onClick={scrollToBottom}
                    pos="absolute"
                    bottom={{ base: "92px", md: "84px" }}
                    right="28px"
                    borderRadius="full"
                    size="sm"
                    bg={scrollBtnBg}
                    color={scrollBtnColor}
                    border="1px solid"
                    borderColor={borderColor}
                    boxShadow="0 4px 12px rgba(0,0,0,0.15)"
                    _hover={{ transform: "scale(1.1)", borderColor: "#2563eb" }}
                    transition="all 0.2s"
                    zIndex="5"
                  />
                )}

                {/* Chat Input */}
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  onSendMessage={submitHandler}
                  onSendMediaMessage={sendMediaHandler}
                  onPickMedia={handlePickMedia}
                  replyingTo={replyingToMessage}
                  onCancelReply={() => setReplyingToMessage(null)}
                />
              </Flex>
            )}
          </Box>
        </Flex>
      </Container>

      <MediaPreviewModal
        isOpen={mediaPreviewOpen}
        onClose={handleCloseMediaPreview}
        file={pendingMedia?.file}
        mediaType={pendingMedia?.mediaType}
        mediaPreviewUrl={pendingMedia?.mediaPreviewUrl || ""}
        initialCaption=""
        onSendMedia={handleConfirmPendingMedia}
        uploadProgress={0}
        isUploading={false}
      />
    </Flex>
  );
}

export default App;
