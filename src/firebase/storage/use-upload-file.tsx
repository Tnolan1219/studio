'use client';

import { useState } from 'react';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL, type UploadTask } from 'firebase/storage';

interface UploadState {
    uploadTask: UploadTask | null;
    uploadProgress: number;
    isUploading: boolean;
    error: string | null;
    downloadURL: string | null;
}

export function useUploadFile() {
    const storage = useStorage();
    const [uploadState, setUploadState] = useState<UploadState>({
        uploadTask: null,
        uploadProgress: 0,
        isUploading: false,
        error: null,
        downloadURL: null,
    });

    const uploadFile = (file: File, path: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!storage) {
                const err = "Firebase Storage is not initialized.";
                setUploadState(prev => ({ ...prev, error: err }));
                reject(new Error(err));
                return;
            }

            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            setUploadState({
                uploadTask,
                uploadProgress: 0,
                isUploading: true,
                error: null,
                downloadURL: null,
            });

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadState(prev => ({ ...prev, uploadProgress: progress }));
                },
                (error) => {
                    console.error("Upload failed:", error);
                    setUploadState(prev => ({
                        ...prev,
                        isUploading: false,
                        error: error.message,
                    }));
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploadState(prev => ({
                            ...prev,
                            isUploading: false,
                            downloadURL,
                        }));
                        resolve(downloadURL);
                    } catch (error: any) {
                         console.error("Failed to get download URL:", error);
                        setUploadState(prev => ({
                            ...prev,
                            isUploading: false,
                            error: "Failed to get download URL.",
                        }));
                        reject(error);
                    }
                }
            );
        });
    };

    return { ...uploadState, uploadFile };
}
