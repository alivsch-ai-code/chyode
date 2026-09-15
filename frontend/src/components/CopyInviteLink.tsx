'use client';

import { useState } from 'react';

export function CopyInviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
      <input readOnly value={link} className="flex-1 bg-transparent text-sm text-slate-600 outline-none" />
      <button onClick={handleCopy} className="btn-secondary shrink-0">
        {copied ? 'Kopiert!' : 'Link kopieren'}
      </button>
    </div>
  );
}
