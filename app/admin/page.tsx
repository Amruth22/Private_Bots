"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LogOut,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define the structure for uploaded files
interface UploadedFile {
  id: string;
  name: string;
  status: "pending" | "uploading" | "uploaded" | "failed";
  unique_id?: string; // Assigned after successful upload
}

export default function AdminPage() {
  const router = useRouter();

  // State variables
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // ----------------------------------------------------------------
  // 1. Ensure user is logged in and fetch existing uploaded files
  // ----------------------------------------------------------------
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
      router.push("/");
      return;
    }

    // Fetch existing uploaded files from the backend
    fetchUploadedFiles();
  }, [router]);

  // ----------------------------------------------------------------
  // 2. Function to fetch existing uploaded files
  // ----------------------------------------------------------------
  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/list_uploaded_files"
      );
      if (!res.ok) {
        throw new Error("Failed to fetch uploaded files.");
      }

      const data = await res.json();
      const pdfs: string[] = data.uploaded_pdfs || [];
      const excels: string[] = data.uploaded_excels || [];

      const combinedFiles: UploadedFile[] = [
        ...pdfs.map((name) => ({
          id: crypto.randomUUID(),
          name,
          status: "uploaded",
          unique_id: "", // Assuming unique_id is assigned by the backend
        })),
        ...excels.map((name) => ({
          id: crypto.randomUUID(),
          name,
          status: "uploaded",
          unique_id: "",
        })),
      ];

      setUploadedFiles(combinedFiles);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
      toast.error("Failed to load uploaded files.");
    }
  };

  // ----------------------------------------------------------------
  // 3. Handler for file selection and automatic upload
  // ----------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    // Add the file to the uploadedFiles state with 'pending' status
    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      name: file.name,
      status: "pending",
    };
    setUploadedFiles((prev) => [newFile, ...prev]);

    // Start uploading the file
    await uploadFile(newFile.id, file);
  };

  // ----------------------------------------------------------------
  // 4. Function to upload a file
  // ----------------------------------------------------------------
  const uploadFile = async (fileId: string, file: File) => {
    setUploading(true);
    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "uploading" } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/upload_file",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("File upload failed.");
      }

      const data = await res.json();

      // Assuming the backend returns the unique_id after successful upload
      const { unique_id } = data;

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "uploaded", unique_id }
            : f
        )
      );

      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "failed" } : f
        )
      );
      toast.error(`Failed to upload "${file.name}".`);
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------------
  // 5. Handler to retry uploading a failed file
  // ----------------------------------------------------------------
  const handleRetry = async (file: UploadedFile) => {
    if (!file.unique_id && file.status === "failed") {
      // Assuming unique_id is not assigned if upload failed
      // You might need to re-upload the file from the original source
      toast.info("Please re-select the file to retry uploading.");
      return;
    }

    // If unique_id exists, perhaps you can reprocess it
    // Implement based on backend capabilities
    // For simplicity, we'll assume re-upload is needed
    toast.info("Please re-select the file to retry uploading.");
  };

  // ----------------------------------------------------------------
  // 6. Handle logout and navigation
  // ----------------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("chatMessages");
    router.push("/");
  };

  const handleChatPage = () => {
    router.push("/chat");
  };

  // ----------------------------------------------------------------
  // 7. Main Render
  // ----------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-gray-50 bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r from-white/90 to-blue-50/90 backdrop-blur-sm shadow-sm transition-all duration-300">
        <div className="flex items-center space-x-2 transition-transform duration-300 hover:scale-105">
          <Image
            src="/path/to/your/logo.png" // Replace with your logo path
            alt="Logo"
            width={100}
            height={30}
            className="h-6 w-auto sm:h-8 sm:w-auto"
          />
        </div>
        <h1 className="text-base sm:text-xl font-semibold text-gray-800 hidden xs:block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Admin Dashboard
        </h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Chat Page Navigation */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChatPage}
                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-100 transition-colors duration-300"
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Chat Page</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat Page</p>
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-2 sm:p-4 pt-16 sm:pt-20">
        <Card className="max-w-4xl mx-auto p-4 bg-white shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
          <div className="flex flex-col space-y-4">
            {/* File Input */}
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors duration-200">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center">
                <FileText className="w-8 h-8 text-gray-500" />
                <p className="mt-2 text-gray-500">Drag & drop a file or click to select</p>
                <p className="mt-1 text-xs text-gray-400">(PDF, Excel)</p>
              </div>
            </label>

            {/* Uploaded Files List */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Uploaded Files</h3>
              {uploadedFiles.length === 0 ? (
                <p className="text-gray-500">No files uploaded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <li key={file.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src="/path/to/file-icon.png" alt="File Icon" />
                          <AvatarFallback>
                            <FileText />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {file.status === "uploaded" && file.unique_id
                              ? `Vectorstore ID: ${file.unique_id}`
                              : file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {file.status === "uploaded" && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {file.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(file)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </main>

      {/* Toast Container for Notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}
