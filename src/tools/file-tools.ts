import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getFrappeApp, getDB } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function uploadFile(args: {
  file_name: string;
  content_base64?: string;
  file_url?: string;
  doctype?: string;
  docname?: string;
  fieldname?: string;
  is_private?: boolean;
  folder?: string;
}) {
  try {
    logger.info(`upload_file called for file: ${args.file_name}`);

    if (!args.content_base64 && !args.file_url) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Either 'content_base64' or 'file_url' must be provided to upload a file."
      );
    }

    if (args.content_base64) {
      // Use the SDK's FrappeFileUpload.uploadFile() which sends proper multipart/form-data
      // We need to construct a File-like object from the base64 content
      const uploader = getFrappeApp().file();

      // Decode base64 to binary buffer (strip data URI prefix if present)
      let base64Data = args.content_base64;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");

      // Create a Blob (Node.js 18+ has built-in Blob)
      const blob = new Blob([buffer]);
      // Create a File object (compatible with browser File API used by the SDK)
      const file = new File([blob], args.file_name);

      const result = await uploader.uploadFile(
        file,
        {
          isPrivate: args.is_private ?? false,
          folder: args.folder || "Home",
          doctype: args.doctype,
          docname: args.docname,
          fieldname: args.fieldname,
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } else {
      // Upload via file_url (remote URL link)
      const client = getFrappeApp().call();
      const params: Record<string, any> = {
        file_url: args.file_url,
        file_name: args.file_name,
        doctype: args.doctype,
        docname: args.docname,
        fieldname: args.fieldname,
        is_private: args.is_private ? 1 : 0,
        folder: args.folder || "Home",
      };
      const result = await client.post("upload_file", params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function listAttachments(args: { doctype: string; docname: string }) {
  try {
    logger.info(`list_attachments called for doctype: ${args.doctype}, docname: ${args.docname}`);
    const db = getDB();
    const result = await db.getDocList("File", {
      fields: ["name", "file_name", "file_url", "is_private"],
      filters: [
        ["attached_to_doctype", "=", args.doctype],
        ["attached_to_name", "=", args.docname],
      ],
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function downloadFile(args: { file_url: string }) {
  try {
    logger.info(`download_file called for URL: ${args.file_url}`);
    const client = getFrappeApp().call();
    const response = await (client as any).axios.get(args.file_url, {
      responseType: "arraybuffer",
    });
    const base64 = Buffer.from(response.data).toString("base64");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              file_url: args.file_url,
              content_base64: base64,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function deleteFile(args: { file_name: string }) {
  try {
    logger.info(`delete_file called for: ${args.file_name}`);
    const db = getDB();
    const result = await db.deleteDoc("File", args.file_name);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function attachFileToDocument(args: {
  file_name: string;
  doctype: string;
  docname: string;
  content_base64?: string;
  file_url?: string;
  fieldname?: string;
  is_private?: boolean;
}) {
  return uploadFile({
    file_name: args.file_name,
    doctype: args.doctype,
    docname: args.docname,
    content_base64: args.content_base64,
    file_url: args.file_url,
    fieldname: args.fieldname,
    is_private: args.is_private,
  });
}
