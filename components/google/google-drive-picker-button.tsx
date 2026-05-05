"use client";

import { useState } from "react";
import { Cloud } from "lucide-react";

type PickerConfig = {
  enabled: boolean;
  clientId: string;
  apiKey: string;
  appId?: string;
  scope: string;
};

type PickerDoc = {
  id: string;
  name?: string;
  mimeType?: string;
  resourceKey?: string;
};

type GooglePickerSdk = {
  accounts?: {
    oauth2?: {
      initTokenClient: (opts: {
        client_id: string;
        scope: string;
        callback: (resp: { access_token?: string; error?: string }) => void;
        error_callback?: () => void;
      }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
    };
  };
  picker?: {
    Action: { PICKED: string };
    Feature: { SUPPORT_DRIVES: string };
    Response: { ACTION: string; DOCUMENTS: string };
    ViewId: { DOCS: string };
    DocsView: new (viewId: string) => {
      setMimeTypes: (mimeTypes: string) => unknown;
      setIncludeFolders: (value: boolean) => unknown;
      setSelectFolderEnabled: (value: boolean) => unknown;
    };
    PickerBuilder: new () => {
      setAppId: (appId: string) => unknown;
      setDeveloperKey: (key: string) => unknown;
      setOAuthToken: (token: string) => unknown;
      addView: (view: unknown) => unknown;
      enableFeature: (feature: string) => unknown;
      setTitle: (title: string) => unknown;
      setCallback: (cb: (data: Record<string, unknown>) => void) => unknown;
      build: () => { setVisible: (value: boolean) => void };
    };
  };
};

declare global {
  interface Window {
    gapi?: {
      load: (
        libs: string,
        opts:
          | (() => void)
          | { callback?: () => void; onerror?: () => void }
      ) => void;
    };
  }
}

const GAPI_SCRIPT = "https://apis.google.com/js/api.js";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
const PICKER_IMPORT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.spreadsheet",
].join(",");

function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-google-script="${src}"]`
    ) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "1") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.googleScript = src;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function waitForPickerApi() {
  return new Promise<void>((resolve, reject) => {
    if (!window.gapi) return reject(new Error("Google API script not loaded"));
    window.gapi.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("Failed to initialize Google Picker API")),
    });
  });
}

function extensionForExportMime(mimeType: string) {
  if (mimeType === "text/plain") return ".txt";
  if (mimeType === "text/csv") return ".csv";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return ".pptx";
  }
  return "";
}

async function fetchDriveFileAsBlob(doc: PickerDoc, accessToken: string) {
  const fileId = doc.id;
  const mimeType = String(doc.mimeType || "");
  const resourceKey = String(doc.resourceKey || "").trim();
  const googleMimeToExport: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  const exportMime = googleMimeToExport[mimeType];
  const params = new URLSearchParams();
  params.set("supportsAllDrives", "true");
  if (resourceKey) {
    params.set("resourceKey", resourceKey);
  }
  const endpoint = exportMime
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}/export?mimeType=${encodeURIComponent(exportMime)}&${params.toString()}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?alt=media&${params.toString()}`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(
      `Failed to download selected Google Drive file (${res.status}). ${
        details || res.statusText || "Unknown Google Drive error."
      }`
    );
  }

  const blob = await res.blob();
  const baseName = String(doc.name || "google-drive-file").trim() || "google-drive-file";
  const suffix = exportMime ? extensionForExportMime(exportMime) : "";
  const hasExt = /\.[a-z0-9]{2,6}$/i.test(baseName);
  const fileName = hasExt || !suffix ? baseName : `${baseName}${suffix}`;
  return new File([blob], fileName, { type: blob.type || "application/octet-stream" });
}

export function GoogleDrivePickerButton(props: {
  onPicked: (file: File) => void;
  disabled?: boolean;
  id?: string;
}) {
  const { onPicked, disabled, id } = props;
  const [loading, setLoading] = useState(false);

  const openPicker = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const configRes = await fetch("/api/google/picker-config", { cache: "no-store" });
      const configData = (await configRes.json()) as Partial<PickerConfig> & {
        error?: string;
      };
      if (!configRes.ok || !configData?.enabled) {
        throw new Error(configData?.error || "Google Drive Picker is not configured.");
      }

      await loadScriptOnce(GAPI_SCRIPT);
      await loadScriptOnce(GIS_SCRIPT);
      await waitForPickerApi();

      const googleSdk = (window as Window & { google?: GooglePickerSdk }).google;
      if (!googleSdk?.accounts?.oauth2 || !googleSdk?.picker) {
        throw new Error("Google SDK did not initialize correctly.");
      }

      const tokenClient = googleSdk.accounts.oauth2.initTokenClient({
        client_id: String(configData.clientId),
        scope: String(configData.scope || "https://www.googleapis.com/auth/drive.file"),
        callback: async (tokenResp: { access_token?: string; error?: string }) => {
          const accessToken = tokenResp?.access_token;
          if (!accessToken) {
            setLoading(false);
            return;
          }

          const view = new googleSdk.picker.DocsView(googleSdk.picker.ViewId.DOCS)
            .setMimeTypes(PICKER_IMPORT_MIME_TYPES)
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false);

          const pickerBuilder = new googleSdk.picker.PickerBuilder()
            .setDeveloperKey(String(configData.apiKey))
            .setOAuthToken(accessToken)
            .addView(view)
            .enableFeature(googleSdk.picker.Feature.SUPPORT_DRIVES)
            .setTitle("Select a Google Drive file")
            .setCallback(async (data: Record<string, unknown>) => {
              try {
                if (data[googleSdk.picker.Response.ACTION] !== googleSdk.picker.Action.PICKED) {
                  return;
                }
                const docs = data[googleSdk.picker.Response.DOCUMENTS] as PickerDoc[] | undefined;
                const picked = docs?.[0];
                if (!picked?.id) return;
                const file = await fetchDriveFileAsBlob(picked, accessToken);
                onPicked(file);
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Failed to import Google Drive file.";
                window.alert(message);
              } finally {
                setLoading(false);
              }
            });
          if (configData.appId) {
            pickerBuilder.setAppId(String(configData.appId));
          }
          const picker = pickerBuilder.build();
          picker.setVisible(true);
        },
        error_callback: () => setLoading(false),
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open Google Drive Picker.";
      window.alert(message);
      setLoading(false);
    }
  };

  return (
    <button
      id={id}
      type="button"
      onClick={openPicker}
      disabled={Boolean(disabled) || loading}
      title="Pick from Google Drive"
      aria-label="Pick from Google Drive"
      className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Cloud className="h-3.5 w-3.5" />
      {loading ? "Opening..." : "Drive"}
    </button>
  );
}
