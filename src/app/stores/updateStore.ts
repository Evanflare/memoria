import { create } from 'zustand';

interface UpdateState {
    progress: number;
    isDownloading: boolean;
    setProgress: (progress: number) => void;
    setIsDownloading: (isDownloading: boolean) => void;
    reset: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
    progress: 0,
    isDownloading: false,
    setProgress: (progress) => set({ progress }),
    setIsDownloading: (isDownloading) => set({ isDownloading }),
    reset: () => set({ progress: 0, isDownloading: false }),
}));