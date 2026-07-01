import React from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
  url: string;
  onUrl: (url: string) => void;
}

const ImageUpload: React.FC<Props> = ({ onFile, url, onUrl }) => {
  const [preview, setPreview] = React.useState<string | null>(null);

  const onDrop = React.useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      onFile(f);
      setPreview(URL.createObjectURL(f));
      onUrl('');
    },
    [onFile, onUrl],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const display = preview || url || '/placeholder.webp';

  return (
    <div {...getRootProps({ className: 'cursor-pointer rounded-lg border-2 border-dashed border-fg-subtle p-4 text-center' })}>
      <input {...getInputProps()} />
      {display ? (
        <img src={display} alt="" className="mt-2 h-auto max-h-[30rem] max-w-full rounded-lg" />
      ) : isDragActive ? (
        <p>Bild hier ablegen …</p>
      ) : (
        <p>Bild ziehen &amp; ablegen oder klicken</p>
      )}
    </div>
  );
};

export default ImageUpload;
