import { Download, FileIcon, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import {
	deleteAttachment,
	getAttachmentUrl,
	uploadAttachment,
} from "#/lib/attachment/functions";

type Attachment = {
	id: string;
	filePath: string;
	fileName: string;
	fileSize: number | null;
	uploadedBy: string | null;
	createdAt: string;
};

function formatFileSize(bytes: number | null): string {
	if (bytes == null) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({
	attachment,
	canDelete,
	onDelete,
}: {
	attachment: Attachment;
	canDelete: boolean;
	onDelete: () => Promise<void>;
}) {
	const [downloading, setDownloading] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function handleDownload() {
		setDownloading(true);
		const result = await getAttachmentUrl({
			data: { filePath: attachment.filePath },
		});
		setDownloading(false);

		if (result.url) {
			window.open(result.url, "_blank");
		}
	}

	async function handleDelete() {
		setDeleting(true);
		const result = await deleteAttachment({
			data: { id: attachment.id, filePath: attachment.filePath },
		});
		setDeleting(false);

		if (!result.error) {
			await onDelete();
		}
	}

	return (
		<div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
			<FileIcon className="size-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">
					{attachment.fileName}
				</p>
				{attachment.fileSize && (
					<p className="text-xs text-muted-foreground">
						{formatFileSize(attachment.fileSize)}
					</p>
				)}
			</div>
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={handleDownload}
					disabled={downloading}
					title="Download"
				>
					{downloading ? <Spinner /> : <Download className="size-3.5" />}
				</Button>
				{canDelete && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={handleDelete}
						disabled={deleting}
						title="Delete"
					>
						{deleting ? (
							<Spinner />
						) : (
							<Trash2 className="size-3.5 text-destructive-foreground" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}

export function AttachmentList({
	taskId,
	projectId,
	attachments,
	canUpload,
	canDelete,
	onAttachmentChange,
}: {
	taskId: string;
	projectId: string;
	attachments: Attachment[];
	canUpload: boolean;
	canDelete: boolean;
	onAttachmentChange: () => Promise<void>;
}) {
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		// Max 10MB
		if (file.size > 10 * 1024 * 1024) {
			alert("File must be under 10MB");
			return;
		}

		setUploading(true);

		// Read file as base64
		const reader = new FileReader();
		reader.onload = async () => {
			const base64 = (reader.result as string).split(",")[1];

			const result = await uploadAttachment({
				data: {
					taskId,
					projectId,
					fileName: file.name,
					fileSize: file.size,
					fileBase64: base64,
					fileType: file.type || "application/octet-stream",
				},
			});

			setUploading(false);

			if (!result.error) {
				await onAttachmentChange();
			}
		};
		reader.readAsDataURL(file);

		// Reset the input so the same file can be uploaded again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	return (
		<div className="space-y-3">
			{attachments.length > 0 && (
				<div className="space-y-2">
					{attachments.map((attachment) => (
						<AttachmentItem
							key={attachment.id}
							attachment={attachment}
							canDelete={canDelete}
							onDelete={onAttachmentChange}
						/>
					))}
				</div>
			)}

			{canUpload && (
				<div>
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						onChange={handleFileSelect}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? <Spinner /> : <Upload className="size-3.5" />}
						{uploading ? "Uploading..." : "Upload file"}
					</Button>
					<p className="mt-1 text-xs text-muted-foreground">Max 10MB</p>
				</div>
			)}
		</div>
	);
}
