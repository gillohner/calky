// src/components/LoginModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Key } from "lucide-react";
import QRCode from "qrcode";
import { generateAuthUrl, loginWithAuthUrl } from "../services/pubky";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (session: any) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [authUrl, setAuthUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Generating QR code...");
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if user is on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      handleGenerateAuthUrl();
    }
  }, [isOpen]);

  const handleGenerateAuthUrl = async () => {
    try {
      setIsLoading(true);
      setError("");
      setStatus("Generating auth URL...");

      const result = await generateAuthUrl();
      if (!result) {
        throw new Error("Failed to generate auth URL");
      }

      const { url, promise } = result;
      setAuthUrl(url);
      setStatus("Auth URL generated. Waiting for connection...");

      const qrUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#f8fafc",
        },
      });
      setQrCodeUrl(qrUrl);

      console.log("Waiting for auth request response...");
      const response = await promise;
      console.log("Auth response received:", response);

      const extractedPubkey = response.z32();
      console.log("Extracted pubkey:", extractedPubkey);

      const loginResult = await loginWithAuthUrl(extractedPubkey);

      if (loginResult.success && loginResult.session) {
        setStatus("✅ Successfully connected! Redirecting...");
        onLogin(loginResult.session);
        onClose();
      } else {
        throw new Error(loginResult.error || "Login failed");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setError(`Authentication error: ${error.message}`);
      setStatus("Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(authUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        alert("Error while copying the URL.");
      }
    );
  };

  const openPubkyRingApp = () => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const fallbackUrl = isIOS
      ? "https://apps.apple.com/app/pubky-ring"
      : "https://play.google.com/store/apps/details?id=com.pubky.ring";

    const appLink = `pubkyring://${authUrl}`;

    // Try to open the app
    const newTab = window.open(appLink, "_blank");

    // Fallback to store if app is not installed
    setTimeout(() => {
      if (newTab) {
        newTab.location.href = fallbackUrl;
      }
    }, 2000);
  };

  const handleAuthorizeWithPubkyRing = () => {
    if (authUrl) {
      copyToClipboard();
      openPubkyRingApp();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Login with Pubky Ring
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-slate-300 text-sm mb-4">
              Scan this QR code with the Pubky Ring app
            </p>

            {/* Status */}
            <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-lg text-sm mb-4">
              <p
                className={`${
                  error
                    ? "text-red-500 dark:text-red-400"
                    : "text-gray-700 dark:text-slate-300"
                }`}
              >
                {error || status}
              </p>
            </div>

            {/* Copy URL button */}
            {authUrl && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white transition-colors mb-4"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "URL copied!" : "Copy auth URL"}
              </button>
            )}

            {/* Authorize with Pubky Ring button - shown on mobile */}
            {isMobile && authUrl && (
              <button
                onClick={handleAuthorizeWithPubkyRing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Authorize with Pubky Ring
              </button>
            )}
          </div>

          {/* Retry button if error */}
          {error && (
            <button
              onClick={handleGenerateAuthUrl}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium"
            >
              {isLoading ? "Generating..." : "Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
