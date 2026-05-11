'use client';

import { useEffect } from "react";

export const useMicVADWrapper = (onLoadingChange: (loading: boolean) => void) => {
    console.log("[VAD] Using SIMPLE FALLBACK mode (no real VAD)");

    // Immediately tell the app we're "ready"
    useEffect(() => {
        onLoadingChange(false);
    }, [onLoadingChange]);

    // Return a fake VAD object so nothing breaks
    return {
        loading: false,
        start: () => console.log("[VAD] Start called (fallback)"),
        stop: () => console.log("[VAD] Stop called (fallback)"),
    };
};
