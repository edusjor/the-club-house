"use client";

import { ReactNode } from "react";

interface ReceiptFileLinkProps {
  dataUrl: string;
  className?: string;
  children: ReactNode;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] || "application/octet-stream";
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

export default function ReceiptFileLink({ dataUrl, className, children }: ReceiptFileLinkProps) {
  const handleClick = () => {
    try {
      const blobUrl = URL.createObjectURL(dataUrlToBlob(dataUrl));
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      window.open(dataUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
