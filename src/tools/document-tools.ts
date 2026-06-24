import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getDB } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";
import { GetDocListArgs } from "../types/frappe.js";

export async function createDocument(args: { doctype: string; document: Record<string, any> }) {
  try {
    logger.info(`create_document called for doctype: ${args.doctype}`);
    const db = getDB();
    const result = await db.createDoc(args.doctype, args.document);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getDocument(args: { doctype: string; name: string }) {
  try {
    logger.info(`get_document called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const result = await db.getDoc(args.doctype, args.name);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function updateDocument(args: {
  doctype: string;
  name: string;
  document: Record<string, any>;
}) {
  try {
    logger.info(`update_document called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const result = await db.updateDoc(args.doctype, args.name, args.document);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function deleteDocument(args: { doctype: string; name: string }) {
  try {
    logger.info(`delete_document called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const result = await db.deleteDoc(args.doctype, args.name);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function listDocuments(args: {
  doctype: string;
  fields?: string[];
  filters?: any[];
  orFilters?: any[];
  limit_start?: number;
  limit?: number;
  orderBy?: { field: string; order: "asc" | "desc" };
  asDict?: boolean;
}) {
  try {
    logger.info(`list_documents called for doctype: ${args.doctype}`, args);
    const db = getDB();

    const getListArgs: GetDocListArgs = {
      fields: args.fields,
      filters: args.filters,
      orFilters: args.orFilters,
      limit_start: args.limit_start,
      limit: args.limit,
      orderBy: args.orderBy,
      asDict: args.asDict,
    };

    const result = await db.getDocList(args.doctype, getListArgs);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getDocumentCount(args: { doctype: string; filters?: any[] }) {
  try {
    logger.info(`get_document_count called for doctype: ${args.doctype}`);
    const db = getDB();
    const result = await db.getCount(args.doctype, args.filters);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: result }, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getFieldValue(args: {
  doctype: string;
  filters: any;
  fieldname: string;
}) {
  try {
    logger.info(`get_field_value called for doctype: ${args.doctype}, field: ${args.fieldname}`);
    const db = getDB();
    // getValue takes doctype, filters, fieldname.
    // filters can be string (name of doc) or object or array
    const result = await db.getValue(args.doctype, args.filters, args.fieldname);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function setFieldValue(args: {
  doctype: string;
  name: string;
  fieldname: string;
  value: any;
}) {
  try {
    logger.info(`set_field_value called for doctype: ${args.doctype}, name: ${args.name}, field: ${args.fieldname}`);
    const db = getDB();
    const result = await db.setValue(args.doctype, args.name, args.fieldname, args.value);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function renameDocument(args: {
  doctype: string;
  old_name: string;
  new_name: string;
  merge?: boolean;
}) {
  try {
    logger.info(`rename_document called for doctype: ${args.doctype}, old: ${args.old_name}, new: ${args.new_name}`);
    const db = getDB();
    const result = await db.renameDoc(args.doctype, args.old_name, args.new_name, args.merge ?? false);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getSingleValue(args: { doctype: string; fieldname: string }) {
  try {
    logger.info(`get_single_value called for doctype: ${args.doctype}, fieldname: ${args.fieldname}`);
    const db = getDB();
    const result = await db.getSingleValue(args.doctype, args.fieldname);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function submitDocument(args: { document: Record<string, any> }) {
  try {
    logger.info(`submit_document called`);
    const db = getDB();
    const result = await db.submit(args.document);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function cancelDocument(args: { doctype: string; name: string }) {
  try {
    logger.info(`cancel_document called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const result = await db.cancel(args.doctype, args.name);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

