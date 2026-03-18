import { useRef } from "react";
import { FileUp } from "lucide-react";
import { GoogleDrivePickerButton } from "@/components/google/google-drive-picker-button";

export default function FileUpload({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".txt,.docx,.pdf,.ppt,.pptx,.xlsx,.csv,.md"
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleIconClick}
          title="Upload local file"
          aria-label="Upload local file"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <FileUp className="h-3.5 w-3.5" />
          Local
        </button>
        <GoogleDrivePickerButton onPicked={onFileSelect} />
      </div>
    </div>
  );
}
