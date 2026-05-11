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

        // Correct property names (ms instead of frames)
        redemptionMs: 800,           // was redemptionFrames
        preSpeechMs: 300,            // was preSpeechFrames
        minSpeechMs: 300,            // was minSpeechFrames

        // Critical Vercel / Next.js WASM fix
        ortConfig: (ort) => {
            ort.env.wasm.wasmPaths = {
                'ort-wasm-simd.wasm': '/ort-wasm-simd.wasm',
                'ort-wasm.wasm': '/ort-wasm.wasm'
            };
            console.log("[VAD] ONNX WASM paths configured for Vercel");
        }
    });

        // Critical Vercel WASM fix
        ortConfig: (ort) => {
            ort.env.wasm.wasmPaths = {
                'ort-wasm-simd.wasm': '/ort-wasm-simd.wasm',
                'ort-wasm.wasm': '/ort-wasm.wasm'
            };
            console.log("[VAD] ONNX WASM paths configured for Vercel");
        }
    });

    const loadingRef = useRef(micVAD.loading);

    useEffect(() => {
        console.log("[VAD] Current loading state:", micVAD.loading);
        
        if (loadingRef.current !== micVAD.loading) {
            console.log("[VAD] Loading state changed:", loadingRef.current, "→", micVAD.loading);
            onLoadingChange(micVAD.loading);
            loadingRef.current = micVAD.loading;
        }
    }, [micVAD.loading, onLoadingChange]);

    // Force start if stuck in loading
    useEffect(() => {
        if (micVAD && !micVAD.loading && micVAD.start) {
            console.log("[VAD] Forcing VAD start");
            micVAD.start();
        }
    }, [micVAD]);

    return micVAD;
};
