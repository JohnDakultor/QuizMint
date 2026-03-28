import { useRef } from "react";
import { FileImage, FileUp } from "lucide-react";
import { GoogleDrivePickerButton } from "@/components/google/google-drive-picker-button";

export default function FileUpload({
  onFilesSelect,
}: {
  onFilesSelect: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  return (
    <div>
      <input
        id="quiz-upload-input"
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        multiple
        accept=".txt,.docx,.pdf,.ppt,.pptx,.xlsx,.csv,.md"
      />

      <input
        id="quiz-upload-image-input"
        type="file"
        ref={imageInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        multiple
        accept=".png,.jpg,.jpeg,.webp"
      />

      <div className="flex items-center gap-1.5">
        <button
          id="quiz-upload-local"
          type="button"
          onClick={handleIconClick}
          title="Upload local file"
          aria-label="Upload local file"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <FileUp className="h-3.5 w-3.5" />
          Local
        </button>
        <button
          id="quiz-upload-image"
          type="button"
          onClick={handleImageClick}
          title="Upload image"
          aria-label="Upload image"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-100"
        >
          <FileImage className="h-3.5 w-3.5" />
          Image
        </button>
        <GoogleDrivePickerButton id="quiz-upload-drive" onPicked={(file) => onFilesSelect([file])} />
      </div>
    </div>
  );
}
