'use client';

import { useEffect, useRef } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { onMisfire, onSpeechEnd, onSpeechStart } from "@/lib/speech-manager";
import { AI_CONFIG } from '@/config/constants';

export const useMicVADWrapper = (onLoadingChange: (loading: boolean) => void) => {
        const micVAD = useMicVAD({
        startOnLoad: true,
        onSpeechStart: () => {
            console.log("[VAD] ✅ Speech started detected!");
            onSpeechStart();
        },
        onSpeechEnd: (audio) => {
            console.log("[VAD] ✅ Speech ended detected, audio length:", audio?.length || 0);
            onSpeechEnd(audio);
        },
        onVADMisfire: () => {
            console.log("[VAD] ⚠️ VAD misfire detected");
            onMisfire();
        },

        // More forgiving thresholds for calm interview speech
        positiveSpeechThreshold: 0.48,
        negativeSpeechThreshold: 0.32,

        // Correct timing options
        redemptionMs: 800,
        preSpeechPadMs: 300,
        minSpeechMs: 300,

        // Simplified WASM config for Vercel
        ortConfig: (ort) => {
            ort.env.wasm.wasmPaths = "/";
            console.log("[VAD] ✅ ONNX WASM configured with root path");
        }
    });
    const loadingRef = useRef(micVAD.loading);

    // Watch loading state
    useEffect(() => {
        console.log("[VAD] Current loading state:", micVAD.loading);
        
        if (loadingRef.current !== micVAD.loading) {
            console.log("[VAD] Loading state changed:", loadingRef.current, "→", micVAD.loading);
            onLoadingChange(micVAD.loading);
            loadingRef.current = micVAD.loading;
        }
    }, [micVAD.loading, onLoadingChange]);

    // Force start if stuck
    useEffect(() => {
        if (micVAD && !micVAD.loading && micVAD.start) {
            console.log("[VAD] Forcing VAD start");
            micVAD.start();
        }
    }, [micVAD]);

    return micVAD;
};
