"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SuggestRegisterModalProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function SuggestRegisterModal({ onClose, isOpen }: SuggestRegisterModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  if (!show) return null;

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="mb-4 text-center text-5xl">
          🎯
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-2xl font-bold text-emerald-400">
          Great Game!
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-slate-300">
          You're playing as a <strong>guest</strong>. Register to save your progress and climb the leaderboard!
        </p>

        {/* Early Supporter Badge */}
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-2xl">💎</span>
            <h3 className="font-bold text-amber-400">Early Supporter Benefit</h3>
          </div>
          <p className="text-center text-sm text-amber-200">
            Register now and get <strong>lifetime free access</strong> to all future premium features!
          </p>
        </div>

        {/* Benefits List */}
        <ul className="mb-6 space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Save your ELO rating and progress</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Sync games across devices</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Appear on global leaderboards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">💎</span>
            <span><strong>All future paid features FREE forever</strong></span>
          </li>
        </ul>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-500 px-6 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
          >
            Register Now (Free)
          </Link>
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Maybe Later
          </button>
        </div>

        {/* Small print */}
        <p className="mt-4 text-center text-xs text-slate-500">
          No payment required. Always free for early users.
        </p>
      </div>
    </div>
  );
}
