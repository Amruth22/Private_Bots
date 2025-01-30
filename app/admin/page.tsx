"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Assuming you have a RadioGroup component
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
      // Fetch uploaded files
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/list_uploaded_files",
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch file list.");
      }

      const data = await res.json();
      const pdfFiles =
        data.uploaded_pdfs?.map((pdfName: string) => ({
          id: Date.now().toString() + Math.random(),
          name: pdfName,
          size: "Unknown",
          uploadDate: new Date().toISOString().split("T")[0],
          unique_id: "",
        })) || [];

      const excelFiles =
        data.uploaded_excels?.map((excelName: string) => ({
          id: Date.now().toString() + Math.random(),
          name: excelName,
          size: "Unknown",
          uploadDate: new Date().toISOString().split("T")[0],
          unique_id: "",
        })) || [];

      // Fetch file-vectorstore mapping
      const mappingRes = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/file_vectorstore_mapping",
        {
          method: "GET",
        }
      );

      let mapping: { [key: string]: string } = {};
      if (mappingRes.ok) {
        const mappingData = await mappingRes.json();
        mapping = mappingData.file_vectorstore_mapping || {};
      } else {
        console.warn("Failed to fetch file-vectorstore mapping.");
      }

      // Assign unique_id to each file
      const mappedPdfFiles = pdfFiles.map((file) => ({
        ...file,
        unique_id: mapping[file.name] || "",
      }));

      const mappedExcelFiles = excelFiles.map((file) => ({
        ...file,
        unique_id: mapping[file.name] || "",
      }));

      setFiles([...mappedPdfFiles, ...mappedExcelFiles]);

      // Fetch the currently active vectorstore
      const activeRes = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/current_vectorstore",
        {
          method: "GET",
        }
      );

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveVectorstore(activeData.selected_vectorstore_id || null);
      }
    } catch (error: any) {
      console.error("Error fetching file list:", error);
      toast.error("Failed to load uploaded files.");
    }
  }

  // Handle file upload with uploading state and feedback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);

      const file = e.target.files[0];

      try {
        const formData = new FormData();
        formData.append("files", file);

        const res = await fetch(
          "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error("Error uploading file.");
        }

        const resData = await res.json();

        toast.success(`File "${file.name}" uploaded successfully.`);
        // Refresh file list to show newly uploaded file(s)
        await fetchFilesFromBackend();
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload file.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    }
  };

  // Handle setting the selected file as active vectorstore
  const handleSetActiveVectorstore = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to set as active vectorstore.");
      return;
    }

    const selected = files.find((file) => file.id === selectedFile);

    if (!selected || !selected.unique_id) {
      toast.error("Selected file does not have a valid vectorstore.");
      return;
    }

    try {
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/set_selected_vectorstore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unique_id: selected.unique_id }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to set active vectorstore.");
      }

      const data = await res.json();
      setActiveVectorstore(data.selected_vectorstore_id);
      toast.success(`Vectorstore "${selected.name}" is now active.`);
    } catch (error: any) {
      console.error("Error setting active vectorstore:", error);
      toast.error("Failed to set active vectorstore.");
    }
  };

  // Handle deleting a single file
  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find((file) => file.id === id);
    if (!fileToDelete) {
      toast.error("File not found.");
      return;
    }

    try {
      // Delete the file from backend
      const res = await fetch(
        "https://custom-gpt-azures-fix-406df467a391.herokuapp.com/delete_vectorstore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename: fileToDelete.name }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to delete file.");
      }

      const data = await res.json();

      // Update the frontend state
      setFiles(files.filter((file) => file.id !== id));
      setSelectedFile(null); // Clear selection if the deleted file was selected

      // If the deleted file was the active vectorstore, update the activeVectorstore state
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

  // Handle selecting a single file (radio button behavior)
  const handleSelectFile = (id: string) => {
    setSelectedFile(id === selectedFile ? null : id); // Toggle selection
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
      {/* Loading overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-4 rounded shadow-md flex flex-col items-center space-y-2">
            <svg
              className="animate-spin h-6 w-6 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <p className="text-gray-700">Uploading your file, please wait...</p>
          </div>
        </div>
      )}

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
          Admin Settings
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

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg h-full overflow-hidden">
            <CardHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b p-3 sm:p-4">
              <CardTitle className="text-xl sm:text-2xl text-[#4F46E5]">
                File Management
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-16rem)] px-3 sm:px-6">
              <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
                {/* Controls */}
                <div className="flex items-center justify-between space-x-2 pb-4 border-b">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowPublicQueries"
                      checked={allowPublicQueries}
                      onCheckedChange={(checked) =>
                        setAllowPublicQueries(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="allowPublicQueries"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Allow Public Queries
                    </label>
                  </div>
                  {/* Set as Active Button */}
                  <Button
                    onClick={handleSetActiveVectorstore}
                    disabled={!selectedFile}
                    variant="default"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Set as Active
                  </Button>
                </div>

                {/* Upload File */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">
                    Upload File
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      className="flex-1 text-sm"
                      disabled={uploading} // disable input while uploading
                    />
                    <Button
                      className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-all duration-200 text-sm"
                      disabled={uploading} // disable button while uploading
                    >
                      <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Uploaded Files */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">
                    Uploaded Files
                  </h3>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg overflow-hidden">
                    <Input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mb-2 px-2 py-1 text-sm"
                    />
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">Select</TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            File Name
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">Size</TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            Upload Date
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files
                          .filter((file) =>
                            file.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          )
                          .map((file) => (
                            <TableRow
                              key={file.id}
                              className={`hover:bg-gray-50 transition-colors duration-150 ${
                                activeVectorstore === file.unique_id
                                  ? "bg-green-100"
                                  : ""
                              }`}
                            >
                              <TableCell>
                                <RadioGroup
                                  value={selectedFile}
                                  onValueChange={(val) =>
                                    handleSelectFile(val === file.id ? null : val)
                                  }
                                  className="flex items-center"
                                >
                                  <RadioGroupItem
                                    value={file.id}
                                    id={`radio-${file.id}`}
                                  />
                                </RadioGroup>
                              </TableCell>
                              <TableCell className="flex items-center text-xs sm:text-sm">
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500" />
                                {file.name}
                                {activeVectorstore === file.unique_id && (
                                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-200 text-green-800 rounded">
                                    Active
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {file.size}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {file.uploadDate}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-100 transition-colors duration-200"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="sr-only">Delete file</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Active Vectorstore Display */}
                {activeVectorstore && (
                  <div className="mt-4 p-4 bg-green-100 rounded-md">
                    <p className="text-green-800">
                      Active Vectorstore ID:{" "}
                      <span className="font-semibold">{activeVectorstore}</span>
                    </p>
                  </div>
                )}

                {/* Clear Chat History Section */}
                <div className="mt-6">
                  <h3 className="text-base sm:text-lg font-medium mb-2">
                    Manage Chat History
                  </h3>
                  <Button
                    variant="destructive"
                    onClick={handleClearChatHistory}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
                  >
                    <Trash className="h-5 w-5" />
                    <span>Clear Chat History</span>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </Card>
        </div>
      </main>

      {/* Toast Container for Notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}
