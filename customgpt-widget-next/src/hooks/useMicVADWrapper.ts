'use client';

import { useEffect } from "react";

export const useMicVADWrapper = (onLoadingChange: (loading: boolean) => void) => {
    console.log("[VAD] Using SIMPLE FALLBACK mode (no real VAD)");

    useEffect(() => {
        onLoadingChange(false);
    }, [onLoadingChange]);

    // Fake VAD object with all expected methods
    return {
        loading: false,
        start: () => console.log("[VAD] Start called (fallback)"),
        stop: () => console.log("[VAD] Stop called (fallback)"),
        pause: () => console.log("[VAD] Pause called (fallback)"),   // ← Added this
    };
};
