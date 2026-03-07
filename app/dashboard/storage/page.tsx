"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Cloud, 
  Upload, 
  File, 
  Trash2, 
  MoreVertical, 
  Loader2, 
  HardDrive,
  Image as ImageIcon,
  FileText,
  Download
} from "lucide-react";
import { auth, storage, db } from "../../firebase/firebaseClient";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata
} from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

interface FileItem {
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  path: string;
}

export default function StoragePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [totalUsage, setTotalUsage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Storage limit (e.g., 100MB for free tier)
  const STORAGE_LIMIT = 100 * 1024 * 1024; 

  useEffect(() => {
    const fetchFiles = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const storageRef = ref(storage, `users/${userId}/files`);
        
        const res = await listAll(storageRef);
        
        const filePromises = res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          
          return {
            name: itemRef.name,
            url,
            type: metadata.contentType || "unknown",
            size: metadata.size,
            createdAt: metadata.timeCreated,
            path: itemRef.fullPath
          };
        });

        const fileList = await Promise.all(filePromises);
        setFiles(fileList);
        
        // Calculate total usage
        const usage = fileList.reduce((acc, file) => acc + file.size, 0);
        setTotalUsage(usage);
        
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchFiles();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (totalUsage + file.size > STORAGE_LIMIT) {
      alert("Storage limit exceeded. Please delete some files to free up space.");
      return;
    }

    setUploading(true);
    try {
      const userId = auth.currentUser.uid;
      const fileRef = ref(storage, `users/${userId}/files/${file.name}`);
      
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const metadata = await getMetadata(fileRef);

      const newFile: FileItem = {
        name: file.name,
        url,
        type: metadata.contentType || "unknown",
        size: metadata.size,
        createdAt: metadata.timeCreated,
        path: fileRef.fullPath
      };

      setFiles(prev => [newFile, ...prev]);
      setTotalUsage(prev => prev + metadata.size);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    try {
      const fileRef = ref(storage, file.path);
      await deleteObject(fileRef);
      
      setFiles(prev => prev.filter(f => f.path !== file.path));
      setTotalUsage(prev => prev - file.size);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.includes("pdf") || type.includes("text")) return FileText;
    return File;
  };

  const usagePercent = Math.min((totalUsage / STORAGE_LIMIT) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Storage & Data
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage your files and storage usage.
          </p>
        </div>
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span>Upload File</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Storage Stats Card */}
        <div className="md:col-span-3 lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Cloud size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Storage Usage</h3>
              <p className="text-sm text-gray-500">Free Plan</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-700 dark:text-gray-300">{formatSize(totalUsage)} used</span>
              <span className="text-gray-500">{formatSize(STORAGE_LIMIT)} total</span>
            </div>
            
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 90 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 text-center">
              You have used {usagePercent.toFixed(1)}% of your storage.
            </p>
          </div>
        </div>

        {/* Files List */}
        <div className="md:col-span-3 lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HardDrive size={18} className="text-purple-600" />
              My Files
            </h3>
            <span className="text-sm text-gray-500">{files.length} items</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No files uploaded yet.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
              {files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div key={file.path} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-4 group">
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 flex gap-2">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={18} />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
