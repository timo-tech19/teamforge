import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const listAttachmentsByTask = createServerFn({ method: "GET" })
	.inputValidator(z.object({ taskId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { data: attachments, error } = await supabase
			.from("task_attachments")
			.select("id, file_path, file_name, file_size, uploaded_by, created_at")
			.eq("task_id", data.taskId)
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return attachments.map((a) => ({
			id: a.id,
			filePath: a.file_path,
			fileName: a.file_name,
			fileSize: a.file_size,
			uploadedBy: a.uploaded_by,
			createdAt: a.created_at,
		}));
	});

export const uploadAttachment = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			taskId: z.uuid(),
			projectId: z.uuid(),
			fileName: z.string(),
			fileSize: z.number().int(),
			fileBase64: z.string(),
			fileType: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// Decode base64 to binary
		const binary = Buffer.from(data.fileBase64, "base64");

		// Upload to storage: {project_id}/{task_id}/{filename}
		const storagePath = `${data.projectId}/${data.taskId}/${data.fileName}`;
		const { error: uploadError } = await supabase.storage
			.from("attachments")
			.upload(storagePath, binary, {
				contentType: data.fileType,
				upsert: false,
			});

		if (uploadError) {
			return { error: uploadError.message };
		}

		// Create metadata record
		const { error: insertError } = await supabase
			.from("task_attachments")
			.insert({
				task_id: data.taskId,
				file_path: storagePath,
				file_name: data.fileName,
				file_size: data.fileSize,
				uploaded_by: user.id,
			});

		if (insertError) {
			// Clean up the uploaded file if metadata insert fails
			await supabase.storage.from("attachments").remove([storagePath]);
			return { error: insertError.message };
		}

		return { error: null };
	});

export const getAttachmentUrl = createServerFn({ method: "GET" })
	.inputValidator(z.object({ filePath: z.string() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Generate a signed URL valid for 1 hour
		const { data: signed, error } = await supabase.storage
			.from("attachments")
			.createSignedUrl(data.filePath, 3600);

		if (error) {
			return { error: error.message, url: null };
		}

		return { error: null, url: signed.signedUrl };
	});

export const deleteAttachment = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid(), filePath: z.string() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Delete from storage
		const { error: storageError } = await supabase.storage
			.from("attachments")
			.remove([data.filePath]);

		if (storageError) {
			return { error: storageError.message };
		}

		// Delete metadata record
		const { error: dbError } = await supabase
			.from("task_attachments")
			.delete()
			.eq("id", data.id);

		if (dbError) {
			return { error: dbError.message };
		}

		return { error: null };
	});
