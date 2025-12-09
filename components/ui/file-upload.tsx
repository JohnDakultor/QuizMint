import { useRef } from "react";
import { FileUp } from "lucide-react"; // example icon

export default function FileUpload({ onFileSelect }: { onFileSelect: (file: File) => void }) {
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".txt,.docx,.pptx,.xlsx"
      />

      {/* Icon button */}
      <button
        type="button"
        onClick={handleIconClick}
        className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
      >
        <FileUp className="w-5 h-5" />
      </button>
    </div>
  );
}
