"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Trash2,
  MessageSquare,
  LogOut,
  FileText,
  Trash,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface File {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  unique_id: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [allowPublicQueries, setAllowPublicQueries] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeVectorstore, setActiveVectorstore] = useState<string | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
      router.push("/");
    } else {
      fetchFilesFromBackend();
    }
  }, [router]);

  async function fetchFilesFromBackend() {
    try {
      console.log("Fetching uploaded files...");
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/list_uploaded_files",
        { method: "GET" }
      );

      if (!res.ok) throw new Error("Failed to fetch file list.");

      const data = await res.json();
      const pdfFiles =
        data.uploaded_pdfs?.map((pdfName: string) => ({
          id: crypto.randomUUID(),
          name: pdfName,
          size: "Unknown",
          uploadDate: new Date().toISOString().split("T")[0],
          unique_id: "", // Placeholder
        })) || [];

      const excelFiles =
        data.uploaded_excels?.map((excelName: string) => ({
          id: crypto.randomUUID(),
          name: excelName,
          size: "Unknown",
          uploadDate: new Date().toISOString().split("T")[0],
          unique_id: "", // Placeholder
        })) || [];

      console.log("Fetching file-vectorstore mapping...");
      const mappingRes = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/file_vectorstore_mapping",
        { method: "GET" }
      );

      let mapping: { [key: string]: string } = {};
      if (mappingRes.ok) {
        const mappingData = await mappingRes.json();
        mapping = mappingData.file_vectorstore_mapping || {};
        console.log("File-vectorstore mapping fetched:", mapping);
      } else {
        console.warn("Failed to fetch file-vectorstore mapping.");
      }

      // Build file objects from PDFs and Excels only, filtering out URL-like names
      const mappedPdfFiles: File[] = pdfFiles.map((file) => ({
        ...file,
        unique_id: mapping[file.name] || "",
      }));
      const mappedExcelFiles: File[] = excelFiles.map((file) => ({
        ...file,
        unique_id: mapping[file.name] || "",
      }));

      // Exclude any file whose name starts with "http://" or "https://"
      const allFiles: File[] = [...mappedPdfFiles, ...mappedExcelFiles].filter(
        (file) =>
          !file.name.startsWith("http://") && !file.name.startsWith("https://")
      );

      setFiles(allFiles);
      console.log("Files after mapping:", allFiles);

      console.log("Fetching currently active vectorstore...");
      const activeRes = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/current_vectorstore",
        { method: "GET" }
      );

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveVectorstore(activeData.selected_vectorstore_id || null);
        console.log("Active vectorstore set to:", activeData.selected_vectorstore_id);
      } else {
        console.warn("Failed to fetch current active vectorstore.");
      }
    } catch (error: any) {
      console.error("Error fetching file list:", error);
      toast.error("Failed to load uploaded files.");
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      const file = e.target.files[0];
      console.log("Uploading file:", file.name);

      try {
        const formData = new FormData();
        formData.append("files", file);

        const res = await fetch(
          "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/upload",
          { method: "POST", body: formData }
        );

        if (!res.ok) throw new Error("Error uploading file.");

        const resData = await res.json();
        console.log("Upload response:", resData);

        toast.success(`File "${file.name}" uploaded successfully.`);
        await fetchFilesFromBackend();
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload file.");
        toast.error("Wait for 30 seconds to get processed.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    }
  };

  const handleSetActiveVectorstore = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to set as active vectorstore.");
      return;
    }

    const selected = files.find((file) => file.id === selectedFile);
    console.log("Selected file for activation:", selected);

    if (!selected || !selected.unique_id) {
      toast.error("Selected file does not have a valid vectorstore.");
      return;
    }

    try {
      console.log("Sending request to set active vectorstore to:", selected.unique_id);
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/set_selected_vectorstore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unique_id: selected.unique_id }),
        }
      );

      if (!res.ok) throw new Error("Failed to set active vectorstore.");

      const data = await res.json();
      console.log("Response from set_selected_vectorstore:", data);

      if (data.selected_vectorstore_id) {
        setActiveVectorstore(data.selected_vectorstore_id);
        toast.success(`Vectorstore "${selected.name}" is now active.`);
      } else {
        throw new Error("No selected_vectorstore_id in response.");
      }
    } catch (error: any) {
      console.error("Error setting active vectorstore:", error);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find((file) => file.id === id);
    console.log("Attempting to delete file:", fileToDelete);

    if (!fileToDelete) {
      toast.error("File not found.");
      return;
    }

    try {
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/delete_vectorstore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: fileToDelete.name }),
        }
      );

      if (!res.ok) throw new Error("Failed to delete file.");

      const data = await res.json();
      console.log("Delete response:", data);

      setFiles(files.filter((file) => file.id !== id));
      setSelectedFile(null);

      if (activeVectorstore === fileToDelete.unique_id) {
        setActiveVectorstore(null);
        toast.info("Active vectorstore has been deleted.");
      }

      toast.success(`File "${fileToDelete.name}" has been deleted.`);
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file.");
    }
  };

  const handleSelectFile = (id: string) => {
    setSelectedFile(id === selectedFile ? null : id);
    console.log("SelectedFile state updated to:", id === selectedFile ? null : id);
  };

  const handleChatPage = () => {
    router.push("/chat");
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.push("/");
  };

  const handleClearChatHistory = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear your chat history? This action cannot be undone."
    );
    if (!confirmClear) return;

    localStorage.removeItem("chatMessages");
    toast.success("Chat history has been cleared.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push("/chat")}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_cresol%20(5)-YuOOsUQjnFH4cLQWJWAm0hxlK2UYQ9.png"
              alt="Cresol Logo"
              width={150}
              height={40}
              className="h-8 sm:h-10 w-auto cursor-pointer"
            />
          </button>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800 hidden sm:block">
          Chat Assistant
        </h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleChatPage}
            className="text-gray-600 hover:text-gray-900"
          >
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Back to Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Logout</span>
          </Button>
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
                    className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}
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
                              ? "/path/to/user-avatar.png"
                              : "/path/to/ai-avatar.png"
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
                          className={`p-3 sm:p-4 ${message.isUser ? "text-white" : "text-indigo-800"}`}
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
                              code: ({ node, inline, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || "");
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
                                  <code className="bg-gray-200 rounded px-1" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          />
                        </div>
                        <div
                          className={`px-3 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-xs ${
                            message.isUser ? "bg-indigo-900 text-blue-100" : "bg-indigo-100 text-indigo-700"
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
            {/* Dropdown only includes PDFs and Excels */}
            <div className="w-1/3">
              <Select onValueChange={handleSelectVectorstore} value={selectedUniqueId}>
                <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:bg-white/70 text-sm">
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
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

            {/* Chat Input and Send Button */}
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

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
