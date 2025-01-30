"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  SendIcon,
  MessageSquare,
  LogOut,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Message structure for the chat
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Structure for the file options in the dropdown
interface FileOption {
  id: string;
  name: string;
  unique_id: string; // This is critical for identifying the vectorstore
}

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // List of files from the backend (for the dropdown)
  const [files, setFiles] = useState<FileOption[]>([]);
  // The currently selected vectorstore's unique_id
  const [selectedUniqueId, setSelectedUniqueId] = useState<string>("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------
  // 1. Ensure user is logged in & load chat messages & fetch file list
  // ----------------------------------------------------------------
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
      router.push("/");
      return;
    }

    // Load messages from localStorage
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const restored: Message[] = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      } catch (error) {
        console.error("Failed to parse saved messages:", error);
        localStorage.removeItem("chatMessages"); // Clear corrupted data
      }
    }

    // Fetch the list of files from the backend
    fetchUploadedFiles();
  }, [router]);

  // ----------------------------------------------------------------
  // 2. Persist chat messages locally whenever they change
  // ----------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to store chat messages:", err);
    }
  }, [messages]);

  // ----------------------------------------------------------------
  // 3. Scroll to bottom whenever messages change
  // ----------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----------------------------------------------------------------
  // 4. Function to fetch uploaded files & their vectorstore mapping
  // ----------------------------------------------------------------
  async function fetchUploadedFiles() {
    try {
      // 4a. Fetch uploaded PDFs/Excels
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/list_uploaded_files"
      );
      if (!res.ok) throw new Error("Failed to fetch file list.");

      const data = await res.json();
      const pdfs = data.uploaded_pdfs || [];
      const excels = data.uploaded_excels || [];

      // 4b. Fetch file->vectorstore mapping
      const mappingRes = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/file_vectorstore_mapping"
      );
      let mapping: Record<string, string> = {};
      if (mappingRes.ok) {
        const mapData = await mappingRes.json();
        mapping = mapData.file_vectorstore_mapping || {};
      } else {
        console.warn("No mapping retrieved from file_vectorstore_mapping.");
      }

      // 4c. Combine them into one array
      const allFiles: FileOption[] = [
        ...pdfs.map((pdfName: string) => ({
          id: crypto.randomUUID(),
          name: pdfName,
          unique_id: mapping[pdfName] || "",
        })),
        ...excels.map((excelName: string) => ({
          id: crypto.randomUUID(),
          name: excelName,
          unique_id: mapping[excelName] || "",
        })),
      ];

      setFiles(allFiles);
    } catch (err) {
      console.error("Error fetching files:", err);
      toast.error("Failed to load files.");
    }
  }

  // ----------------------------------------------------------------
  // 5. Immediately set the selected vectorstore on dropdown change
  // ----------------------------------------------------------------
  const handleSelectVectorstore = async (newUniqueId: string) => {
    // Update local state so our UI shows the new selection
    setSelectedUniqueId(newUniqueId);
    console.log("User selected vectorstore =>", newUniqueId);

    // If user selects "all" or empty, skip calling set_selected_vectorstore
    if (!newUniqueId || newUniqueId === "all") {
      return; // or handle "all" differently
    }

    try {
      // POST to set_selected_vectorstore immediately
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/set_selected_vectorstore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unique_id: newUniqueId }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to set active vectorstore.");
      }

      const data = await res.json();
      console.log("Vectorstore set successfully =>", data.selected_vectorstore_id);
      toast.success(`Active vectorstore set to ${data.selected_vectorstore_id}`, { autoClose: 1500 });
    } catch (error) {
      console.error("Error setting vectorstore =>", error);
      toast.error("Failed to set the active vectorstore");
    }
  };

  // ----------------------------------------------------------------
  // 6. Sending a message
  // ----------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Construct user message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    // Start a simulated progress bar
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : 90));
    }, 300);

    try {
      // POST question to /ask, including the selected unique_id for the vectorstore
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userMsg.text,
            unique_id: selectedUniqueId,
          }),
        }
      );

      setProgress(95);
      if (!res.ok) {
        throw new Error("Error from /ask endpoint");
      }

      const data = await res.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || "No response from AI",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Finish progress bar
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } catch (error) {
      console.error("Error calling /ask =>", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: "Failed to get a response from the AI.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // 7. Utility function to format time
  // ----------------------------------------------------------------
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ----------------------------------------------------------------
  // 8. Handle logout and admin navigation
  // ----------------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("chatMessages");
    router.push("/");
  };

  const handleAdminPage = () => {
    router.push("/admin");
  };

  // ----------------------------------------------------------------
  // 9. Main Render
  // ----------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-gray-50 bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r from-white/90 to-blue-50/90 backdrop-blur-sm shadow-sm transition-all duration-300">
        <div className="flex items-center space-x-2 transition-transform duration-300 hover:scale-105">
          <Image
            src="/some/logo/path.png"
            alt="Logo"
            width={100}
            height={30}
            className="h-6 w-auto sm:h-8 sm:w-auto"
          />
        </div>
        <h1 className="text-base sm:text-xl font-semibold text-gray-800 hidden xs:block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Chat Assistant
        </h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Admin Settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAdminPage}
                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-100 transition-colors duration-300"
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Admin Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Admin Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Logout */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 hover:bg-red-100 transition-colors duration-300"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Log out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden p-2 sm:p-4 pt-16 sm:pt-20">
        <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden">
          <ScrollArea className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] p-2 sm:p-4 bg-gradient-to-b from-blue-50 to-white bg-opacity-50">
            <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <MessageSquare className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-center text-gray-600 font-medium"
                  >
                    No messages yet. Start a conversation!
                  </motion.p>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 1.5,
                    }}
                    className="w-3 h-3 bg-blue-500 rounded-full"
                  />
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.isUser ? "justify-end" : "justify-start"
                    } mb-4`}
                  >
                    <div
                      className={`flex items-start max-w-[80%] ${
                        message.isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar
                        className={`w-10 h-10 ${
                          message.isUser ? "ml-3" : "mr-3"
                        } ring-2 ring-white shadow-md`}
                      >
                        <AvatarImage
                          src={
                            message.isUser
                              ? "/user-avatar.png"
                              : "/ai-avatar.png"
                          }
                        />
                        <AvatarFallback>
                          {message.isUser ? "U" : "AI"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-2xl overflow-hidden shadow-lg ${
                          message.isUser
                            ? "bg-gradient-to-br from-indigo-600 to-indigo-800"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50"
                        }`}
                      >
                        <div
                          className={`p-3 sm:p-4 ${
                            message.isUser ? "text-white" : "text-indigo-800"
                          }`}
                        >
                          <ReactMarkdown
                            children={message.text}
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  className="text-blue-400 underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              ),
                              code: ({
                                node,
                                inline,
                                className,
                                children,
                                ...props
                              }) => {
                                const match = /language-(\w+)/.exec(
                                  className || ""
                                );
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={materialLight}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code
                                    className="bg-gray-200 rounded px-1"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          />
                        </div>
                        <div
                          className={`px-3 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-xs ${
                            message.isUser
                              ? "bg-indigo-900 text-blue-100"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-end cursor-pointer">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(message.timestamp)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{message.timestamp.toLocaleString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute bottom-4 left-4 right-4 text-center text-gray-500 text-sm"
                >
                  Welcome! Type a message to get started.
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </main>

      {/* Footer with Input and Vectorstore Dropdown */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white/80 backdrop-blur-sm p-2 sm:p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex space-x-2">
            {/* 1. Vectorstore Dropdown */}
            <div className="w-1/3">
              <Select
                onValueChange={handleSelectVectorstore} // Immediately calls the backend
                value={selectedUniqueId}
              >
                <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:bg-white/70 text-sm">
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
                  {/* Optionally handle 'all' as "no single vectorstore" */}
                  <SelectItem value="all">All Files</SelectItem>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.unique_id}>
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-500" />
                        {file.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Chat Input and Send Button */}
            <div className="relative flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:bg-white/70 text-sm pr-10"
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="absolute right-1 top-1 bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 shadow-md hover:shadow-lg p-1"
                disabled={!inputMessage.trim() || isLoading}
              >
                <SendIcon className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>

          {/* 3. Progress Bar for AI thinking */}
          {isLoading && (
            <div className="relative pt-1 my-2">
              <div className="flex mb-1 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                    AI is thinking...
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-indigo-600">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-1 mb-1 text-xs flex rounded bg-indigo-300">
                <div
                  style={{ width: `${progress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                ></div>
              </div>
            </div>
          )}
        </form>
      </footer>

      {/* Toast Container for Notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}
