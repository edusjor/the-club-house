export type ParsedPaymentReceipt =
  | {
      kind: "UPLOAD";
      fileName: string;
      dataUrl: string;
      reference?: string;
    }
  | {
      kind: "REFERENCE";
      reference: string;
    };

type UploadReceiptPayload = {
  version: 1;
  type: "UPLOAD";
  fileName: string;
  dataUrl: string;
  reference?: string;
};

export function serializePaymentReceipt(input: {
  reference?: string;
  fileName?: string;
  dataUrl?: string;
}) {
  const reference = input.reference?.trim();
  const dataUrl = input.dataUrl?.trim();

  if (dataUrl) {
    const payload: UploadReceiptPayload = {
      version: 1,
      type: "UPLOAD",
      fileName: input.fileName?.trim() || "comprobante",
      dataUrl,
      ...(reference ? { reference } : {}),
    };

    return JSON.stringify(payload);
  }

  if (reference) {
    return reference;
  }

  return undefined;
}

export function parsePaymentReceipt(raw: string | null | undefined): ParsedPaymentReceipt | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<UploadReceiptPayload>;

    if (
      parsed &&
      parsed.version === 1 &&
      parsed.type === "UPLOAD" &&
      typeof parsed.dataUrl === "string" &&
      parsed.dataUrl.length > 0
    ) {
      return {
        kind: "UPLOAD",
        fileName:
          typeof parsed.fileName === "string" && parsed.fileName.trim().length > 0
            ? parsed.fileName.trim()
            : "comprobante",
        dataUrl: parsed.dataUrl,
        ...(typeof parsed.reference === "string" && parsed.reference.trim().length > 0
          ? { reference: parsed.reference.trim() }
          : {}),
      };
    }
  } catch {
    // Legacy plain-text receipt reference.
  }

  return {
    kind: "REFERENCE",
    reference: trimmed,
  };
}

export function formatReceiptSummary(raw: string | null | undefined) {
  const parsed = parsePaymentReceipt(raw);

  if (!parsed) return "Sin comprobante";

  if (parsed.kind === "UPLOAD") {
    if (parsed.reference) {
      return `${parsed.fileName} · Ref. ${parsed.reference}`;
    }

    return parsed.fileName;
  }

  return parsed.reference;
}
