import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Link, X, CheckCircle2, AlertCircle, FileVideo, FileText, Image as ImageIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UploadType = 'video' | 'image' | 'document';

export interface UploadResult {
  url: string;           // final URL (object URL if local, remote URL if from API)
  file?: File;           // the raw file if uploaded locally
  duration?: number;     // video only — seconds
  fileSize?: number;     // bytes
  fileType?: string;     // MIME type
  name?: string;
}

interface Props {
  type: UploadType;
  value?: string;                          // existing URL (for edit)
  onChange: (result: UploadResult | null) => void;
  label?: string;
  hint?: string;
  accept?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCEPT: Record<UploadType, string> = {
  video: 'video/mp4,video/webm,video/mov,video/avi,video/mkv,.mp4,.webm,.mov,.avi,.mkv',
  image: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
  document: 'application/pdf,.pdf,application/msword,.doc,.docx,text/plain,.txt',
};

const MAX_SIZE: Record<UploadType, number> = {
  video: 2 * 1024 * 1024 * 1024,   // 2 GB
  image: 10 * 1024 * 1024,          // 10 MB
  document: 50 * 1024 * 1024,       // 50 MB
};

const LABELS: Record<UploadType, string> = {
  video: 'MP4, WebM, MOV, AVI — up to 2 GB',
  image: 'JPG, PNG, WebP, GIF — up to 10 MB',
  document: 'PDF, DOC, DOCX, TXT — up to 50 MB',
};

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const detectVideoDuration = (file: File): Promise<number> =>
  new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { resolve(Math.round(video.duration)); URL.revokeObjectURL(video.src); };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });

const FileIcon = ({ type, className }: { type: UploadType; className?: string }) => {
  if (type === 'video') return <FileVideo className={className} />;
  if (type === 'image') return <ImageIcon className={className} />;
  return <FileText className={className} />;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function FileUpload({ type, value, onChange, label, hint }: Props) {
  const [tab, setTab] = useState<'upload' | 'url'>(value ? 'url' : 'upload');
  const [urlInput, setUrlInput] = useState(value ?? '');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadResult | null>(value ? { url: value } : null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // sync if parent changes value
  useEffect(() => {
    if (value !== undefined && value !== uploaded?.url) {
      setUrlInput(value);
      setUploaded(value ? { url: value } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const simulateUpload = async (file: File) => {
    setError('');
    setUploading(true);
    setProgress(0);

    // Validate size
    if (file.size > MAX_SIZE[type]) {
      setError(`File too large. Max size is ${fmtBytes(MAX_SIZE[type])}.`);
      setUploading(false);
      return;
    }

    // Simulate chunked upload progress
    for (let p = 0; p <= 90; p += Math.random() * 15 + 5) {
      await new Promise(r => setTimeout(r, 80 + Math.random() * 120));
      setProgress(Math.min(p, 90));
    }

    // Auto-detect video duration
    let duration: number | undefined;
    if (type === 'video') {
      duration = await detectVideoDuration(file);
    }

    // Create object URL (in production, you'd POST to your API here and get back a real URL)
    const url = URL.createObjectURL(file);
    setProgress(100);
    await new Promise(r => setTimeout(r, 300));

    const result: UploadResult = {
      url,
      file,
      duration,
      fileSize: file.size,
      fileType: file.type,
      name: file.name,
    };
    setUploaded(result);
    onChange(result);
    setUploading(false);
  };

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    simulateUpload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleUrlConfirm = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) { setError('Please enter a valid URL.'); return; }
    setError('');
    const result: UploadResult = { url: trimmed };
    setUploaded(result);
    onChange(result);
  };

  const clear = () => {
    setUploaded(null);
    setUrlInput('');
    setProgress(0);
    onChange(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {/* Tab switcher */}
      {!uploaded && !uploading && (
        <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden text-sm">
          {([['upload', 'Upload File'], ['url', 'Paste URL']] as const).map(([key, lbl]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); }}
              className={`flex-1 py-2 font-medium flex items-center justify-center gap-1.5 transition ${
                tab === key ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={tab === key ? { background: '#F5820A' } : {}}
            >
              {key === 'upload' ? <Upload size={13} /> : <Link size={13} />}
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Upload tab */}
      {!uploaded && !uploading && tab === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition select-none ${
            dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-orange-50/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: '#F5820A18', color: '#F5820A' }}>
            <FileIcon type={type} className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{LABELS[type]}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[type]}
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* URL tab */}
      {!uploaded && !uploading && tab === 'url' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleUrlConfirm()}
            placeholder={
              type === 'video'
                ? 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                : type === 'image'
                ? 'https://example.com/image.jpg'
                : 'https://drive.google.com/... or direct link'
            }
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
          <button
            onClick={handleUrlConfirm}
            className="px-4 py-2.5 text-white rounded-xl text-sm font-semibold shrink-0 hover:opacity-90 transition"
            style={{ background: '#F5820A' }}
          >
            Use
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileIcon type={type} className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate font-medium">Uploading…</span>
            <span className="ml-auto text-gray-400 shrink-0">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: '#F5820A' }}
            />
          </div>
          <p className="text-xs text-gray-400">Please wait — do not close this window</p>
        </div>
      )}

      {/* Uploaded / confirmed state */}
      {uploaded && !uploading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Image preview */}
          {type === 'image' && (
            <img
              src={uploaded.url}
              alt="Preview"
              className="w-full h-40 object-cover"
            />
          )}

          {/* Video preview (object URL only) */}
          {type === 'video' && uploaded.file && (
            <video
              src={uploaded.url}
              controls
              className="w-full max-h-48 bg-black"
            />
          )}

          <div className="p-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {uploaded.name ?? (uploaded.url.startsWith('blob:') ? 'Uploaded file' : uploaded.url)}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {uploaded.fileSize && <span>{fmtBytes(uploaded.fileSize)}</span>}
                {uploaded.duration !== undefined && uploaded.duration > 0 && (
                  <span>{Math.floor(uploaded.duration / 60)}:{String(uploaded.duration % 60).padStart(2, '0')}</span>
                )}
                {!uploaded.file && <span className="truncate max-w-48">{uploaded.url}</span>}
              </div>
            </div>
            <button
              onClick={clear}
              className="p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
              title="Remove"
            >
              <X size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}
