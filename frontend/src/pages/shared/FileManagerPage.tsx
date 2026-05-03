import { useState, useEffect, useCallback, useRef } from "react";
import {
  listAttachments,
  deleteAttachmentWithObject,
  uploadWorkspaceAttachment,
  getAttachmentAccessUrl,
} from "../../lib/repositories/attachments.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import type { AttachmentRow } from "../../lib/repositories/attachments.ts";
import "../../styles/pages.css";

interface FileManagerPageProps {
  workspaceId: string;
}

type SortOption = "date-desc" | "date-asc" | "name-asc" | "size-desc" | "size-asc";

const getFileName = (path: string) => path.split("/").pop() ?? path;

const getFileType = (path: string, mime: string | null): string => {
  const ext = path.split(".").pop()?.toUpperCase() ?? "";
  if (["DXF", "DWG"].includes(ext)) return "DXF";
  if (ext === "CSV") return "CSV";
  if (ext === "PDF") return "PDF";
  if (["TIFF", "TIF"].includes(ext)) return "TIFF";
  if (["XLSX", "XLS"].includes(ext)) return "XLSX";
  if (mime?.startsWith("image/")) return "IMG";
  return ext || "FILE";
};

const formatSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatStorage = (sizeMb: number): string => {
  if (sizeMb >= 1024) return `${(sizeMb / 1024).toFixed(2)} GB`;
  return `${sizeMb.toFixed(1)} MB`;
};

const formatDateLabel = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getIconColor = (type: string) => {
  switch (type) {
    case "DXF":
    case "DWG":
      return {
        bg: "#dbeafe",
        color: "#1d4ed8",
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
      };
    case "CSV":
    case "XLSX":
    case "XLS":
      return {
        bg: "#dcfce7",
        color: "#15803d",
        icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
      };
    case "PDF":
      return {
        bg: "#fee2e2",
        color: "#b91c1c",
        icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
      };
    case "TIFF":
    case "TIF":
    case "IMG":
      return {
        bg: "#f3e8ff",
        color: "#7e22ce",
        icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
      };
    default:
      return {
        bg: "#f1f5f9",
        color: "#475569",
        icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
      };
  }
};

export default function FileManagerPage({ workspaceId }: FileManagerPageProps) {
  const [files, setFiles] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverDropzone, setDragOverDropzone] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<number | undefined>(undefined);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setError(null);
      const data = await listAttachments(workspaceId);
      setFiles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const totalStorageMb = 500 * 1024;
  const usedStorageBytes = files.reduce(
    (sum, f) => sum + (f.size_bytes ?? 0),
    0,
  );
  const usedStorageMb = usedStorageBytes / (1024 * 1024);
  const storagePercentage = (usedStorageMb / totalStorageMb) * 100;
  const safeStoragePercentage = Math.min(100, Math.max(storagePercentage, 2));
  const latestUpload = files[0];

  const fileTypes = Array.from(
    new Set(files.map((f) => getFileType(f.storage_path, f.mime_type))),
  );

  let filtered = files;
  if (activeType !== "ALL") {
    filtered = filtered.filter(
      (f) => getFileType(f.storage_path, f.mime_type) === activeType,
    );
  }
  if (search.trim()) {
    const query = search.trim().toLowerCase();
    filtered = filtered.filter((f) =>
      getFileName(f.storage_path).toLowerCase().includes(query),
    );
  }

  filtered = [...filtered].sort((a, b) => {
    const nameA = getFileName(a.storage_path);
    const nameB = getFileName(b.storage_path);
    if (sortBy === "name-asc") return nameA.localeCompare(nameB);
    if (sortBy === "size-desc")
      return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
    if (sortBy === "size-asc")
      return (a.size_bytes ?? 0) - (b.size_bytes ?? 0);
    if (sortBy === "date-asc")
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((f) => selectedFiles.has(f.id));
  const visibleSelectedCount = filtered.filter((f) =>
    selectedFiles.has(f.id),
  ).length;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedFiles);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFiles(next);
  };

  const toggleAll = () => {
    const next = new Set(selectedFiles);
    if (allVisibleSelected) {
      filtered.forEach((f) => next.delete(f.id));
    } else {
      filtered.forEach((f) => next.add(f.id));
    }
    setSelectedFiles(next);
  };

  const showNotice = (message: string) => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    setNotice(message);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 2200);
  };

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!rowMenuRef.current) return;
      if (!rowMenuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const openFilePicker = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const uploadFiles = Array.from(fileList);

    setUploading(true);
    setError(null);

    const results = await Promise.allSettled(
      uploadFiles.map((file) => uploadWorkspaceAttachment(workspaceId, file)),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.length - successCount;

    if (failureCount > 0) {
      setError(`${failureCount} upload${failureCount === 1 ? "" : "s"} failed. Please retry those files.`);
    }

    if (successCount > 0) {
      showNotice(`${successCount} file${successCount === 1 ? "" : "s"} uploaded.`);
      await fetchFiles();
    }

    setUploading(false);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleDropUpload = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverDropzone(false);
    void handleUploadFiles(event.dataTransfer.files);
  };

  const handleFileDownload = async (file: AttachmentRow) => {
    try {
      const url = await getAttachmentAccessUrl(file);
      window.open(url, "_blank", "noopener,noreferrer");
      setOpenMenuId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file.");
    }
  };

  const handleCopyFileLink = async (file: AttachmentRow) => {
    try {
      const url = await getAttachmentAccessUrl(file);
      await navigator.clipboard.writeText(url);
      showNotice("Secure file link copied.");
      setOpenMenuId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy link.");
    }
  };

  const handleSingleDelete = async (file: AttachmentRow) => {
    try {
      await deleteAttachmentWithObject(file);
      showNotice("File deleted.");
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
      setOpenMenuId(null);
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file.");
    }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedCount === 0) return;
    const toDelete = filtered.filter((f) => selectedFiles.has(f.id));
    const results = await Promise.allSettled(
      toDelete.map((f) => deleteAttachmentWithObject(f)),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      setSelectedFiles(new Set());
      showNotice(`${successCount} file${successCount === 1 ? "" : "s"} deleted.`);
      await fetchFiles();
    }

    if (failureCount > 0) {
      setError(`${failureCount} delete${failureCount === 1 ? "" : "s"} failed. Please retry.`);
    }
  };

  if (loading) {
    return (
      <div className="hub-body file-manager-page">
        <p style={{ padding: "2rem" }}>Loading files...</p>
      </div>
    );
  }

  return (
    <div className="hub-body file-manager-page">
      {error && (
        <div
          style={{
            background: "var(--danger-bg, #fee)",
            color: "var(--danger, #c00)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <header className="page-header" style={{ padding: 0 }}>
        <div>
          <h1>File Manager</h1>
          <p className="page-subtitle">
            Centralized cloud storage for CAD files, plans, and drone imagery
          </p>
        </div>
        <div className="header-actions">
          <input
            ref={uploadInputRef}
            type="file"
            className="file-manager-hidden-input"
            multiple
            onChange={(e) => handleUploadFiles(e.target.files)}
          />
          <button
            className="btn btn-primary"
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
            onClick={openFilePicker}
            disabled={uploading}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      </header>
      {notice && <div className="alert-bar alert-warning">{notice}</div>}

      <div className="file-manager-kpi-grid">
        <div className="card file-manager-kpi-card">
          <span className="file-manager-kpi-label">Total Files</span>
          <strong className="file-manager-kpi-value">{files.length}</strong>
        </div>
        <div className="card file-manager-kpi-card">
          <span className="file-manager-kpi-label">File Types</span>
          <strong className="file-manager-kpi-value">{fileTypes.length}</strong>
        </div>
        <div className="card file-manager-kpi-card">
          <span className="file-manager-kpi-label">Stored Data</span>
          <strong className="file-manager-kpi-value">
            {formatStorage(usedStorageMb)}
          </strong>
        </div>
        <div className="card file-manager-kpi-card">
          <span className="file-manager-kpi-label">Latest Upload</span>
          <strong className="file-manager-kpi-value">
            {latestUpload ? formatDateLabel(latestUpload.created_at) : "\u2014"}
          </strong>
        </div>
      </div>

      <div className="file-manager-top-grid">
        <div className="card file-manager-storage-card">
          <h3 className="file-manager-section-title">Drive Storage</h3>
          <div className="file-manager-storage-meta">
            <span className="file-manager-storage-used">
              {formatStorage(usedStorageMb)}
            </span>
            <span>{(totalStorageMb / 1024).toFixed(0)} GB Total</span>
          </div>
          <div className="file-manager-storage-track">
            <div
              className="file-manager-storage-fill"
              style={{ width: `${safeStoragePercentage}%` }}
            />
          </div>
          <p className="file-manager-storage-copy">
            Using {storagePercentage.toFixed(2)}% of your secure cloud space.
          </p>
        </div>
        <div
          className={`card file-manager-dropzone ${dragOverDropzone ? "drag-over" : ""}`}
          onClick={openFilePicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverDropzone(true);
          }}
          onDragLeave={() => setDragOverDropzone(false)}
          onDrop={handleDropUpload}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          aria-label="Upload files by clicking or dragging files into this area"
        >
          <div className="file-manager-dropzone-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3 className="file-manager-dropzone-title">
            Click to Upload or Drag & Drop
          </h3>
          <p className="file-manager-dropzone-copy">
            Supports DXF, DWG, LandXML, CSV, PDF, and TIFF.
          </p>
          <button
            className="btn btn-outline btn-sm"
            onClick={openFilePicker}
            disabled={uploading}
          >
            Browse Files
          </button>
        </div>
      </div>

      <div className="file-manager-content">
        <div className="file-manager-toolbar">
          <div className="file-manager-toolbar-left">
            <h2 className="file-manager-active-title">All Files</h2>
          </div>
          <div className="file-manager-toolbar-right">
            <div className="file-manager-search">
              <svg
                className="file-manager-search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="input-field file-manager-search-input"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <SelectDropdown
              className="input-field file-manager-select"
              value={sortBy}
              onChange={(val) => setSortBy(val as SortOption)}
              options={[
                { value: "date-desc", label: "Newest first" },
                { value: "date-asc", label: "Oldest first" },
                { value: "name-asc", label: "Name A-Z" },
                { value: "size-desc", label: "Largest first" },
                { value: "size-asc", label: "Smallest first" }
              ]}
            />
          </div>
        </div>

        <div className="file-manager-type-filters">
          <button
            className={`file-manager-type-pill ${activeType === "ALL" ? "active" : ""}`}
            onClick={() => setActiveType("ALL")}
          >
            All types
          </button>
          {fileTypes.map((type) => (
            <button
              key={type}
              className={`file-manager-type-pill ${activeType === type ? "active" : ""}`}
              onClick={() => setActiveType(type)}
            >
              {type}
            </button>
          ))}
          <span className="file-manager-result-count">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="card file-manager-table-card">
          {visibleSelectedCount > 0 && (
            <div className="file-manager-selection-bar">
              <span className="file-manager-selection-copy">
                {visibleSelectedCount} selected
              </span>
              <div className="file-manager-selection-actions">
                <button
                  className="btn btn-sm file-manager-action-btn danger"
                  onClick={handleBulkDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
          <table className="invoice-table file-manager-table">
            <thead>
              <tr>
                <th
                  className="file-col-select"
                  style={{ width: "40px", textAlign: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible files"
                  />
                </th>
                <th className="file-col-icon" style={{ width: "44px" }}></th>
                <th className="file-col-name">File Name</th>
                <th className="file-col-type">Type</th>
                <th className="file-col-size">Size</th>
                <th className="file-col-uploaded">Uploaded</th>
                <th className="file-col-actions" style={{ width: "52px", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => {
                const type = getFileType(file.storage_path, file.mime_type);
                const icon = getIconColor(type);
                const name = getFileName(file.storage_path);
                return (
                  <tr
                    key={file.id}
                    className={selectedFiles.has(file.id) ? "selected" : ""}
                  >
                    <td
                      className="file-col-select"
                      style={{ textAlign: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        aria-label={`Select ${name}`}
                      />
                    </td>
                    <td className="file-col-icon">
                      <div
                        className="file-manager-row-icon"
                        style={{ background: icon.bg, color: icon.color }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={icon.icon} />
                        </svg>
                      </div>
                    </td>
                    <td className="file-col-name file-cell-name">{name}</td>
                    <td className="file-col-type">
                      <span className="file-manager-type-tag">{type}</span>
                    </td>
                    <td className="file-col-size">
                      {formatSize(file.size_bytes)}
                    </td>
                    <td className="file-col-uploaded">
                      {formatDateLabel(file.created_at)}
                    </td>
                    <td
                      className="file-col-actions"
                      style={{ textAlign: "right" }}
                    >
                      <div
                        className="file-manager-row-actions"
                        ref={openMenuId === file.id ? rowMenuRef : undefined}
                      >
                        <button
                          className="file-manager-row-menu-btn"
                          onClick={() =>
                            setOpenMenuId((prev) =>
                              prev === file.id ? null : file.id,
                            )
                          }
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === file.id}
                          aria-label={`Open actions for ${name}`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                        {openMenuId === file.id && (
                          <div className="file-manager-row-menu" role="menu">
                            <button
                              className="file-manager-row-menu-item"
                              onClick={() => handleFileDownload(file)}
                            >
                              Open / Download
                            </button>
                            <button
                              className="file-manager-row-menu-item"
                              onClick={() => handleCopyFileLink(file)}
                            >
                              Copy Link
                            </button>
                            <button
                              className="file-manager-row-menu-item danger"
                              onClick={() => handleSingleDelete(file)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "64px 0" }}
                  >
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--border-heavy)"
                      strokeWidth="1"
                      style={{ marginBottom: "16px" }}
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <h3 style={{ margin: 0, color: "var(--text-h)" }}>
                      No files found
                    </h3>
                    <p
                      style={{
                        color: "var(--text)",
                        fontSize: "13px",
                      }}
                    >
                      {files.length === 0
                        ? "Upload your first file to get started."
                        : "Adjust your filters or upload a new file."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
