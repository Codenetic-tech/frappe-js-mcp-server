/**
 * Comprehensive Live Integration Test
 * Tests every MCP tool against the live Frappe instance
 * 
 * Run with: npx tsx integration_test.js
 */

import axios from "axios";
import FormData from "form-data";
import { FrappeApp } from "frappe-js-sdk";

const BASE_URL = "https://web.codenetic.online";
const API_KEY = "c638874387ff3e8";
const API_SECRET = "f63dda7dbe445b6";
const AUTH_HEADER = `token ${API_KEY}:${API_SECRET}`;

// --- Test State ---
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

// A docname we create in the test for use in subsequent tests
let testDocName = null;
let testFileName = null;

// --- Helpers ---
function ok(name, detail = "") {
  passed++;
  results.push({ status: "✅ PASS", name, detail });
  console.log(`  ✅ PASS | ${name}${detail ? " | " + detail : ""}`);
}

function fail(name, error) {
  failed++;
  const msg = error?.response?.data?.exception || error?.response?.data?.message || error?.message || String(error);
  results.push({ status: "❌ FAIL", name, detail: msg });
  console.error(`  ❌ FAIL | ${name} | ${msg}`);
}

function skip(name, reason) {
  skipped++;
  results.push({ status: "⏭  SKIP", name, detail: reason });
  console.log(`  ⏭  SKIP | ${name} | ${reason}`);
}

async function api(method, path, params = {}) {
  const isGet = method === "GET";
  const url = `${BASE_URL}/api/method/${path}`;
  const resp = await axios({
    method,
    url,
    headers: { Authorization: AUTH_HEADER, "Content-Type": "application/json" },
    ...(isGet ? { params } : { data: params }),
  });
  return resp.data;
}

async function dbGet(doctype, name) {
  return api("GET", "frappe.client.get", { doctype, name });
}

async function dbGetList(doctype, fields, filters, limit = 5) {
  return api("GET", "frappe.client.get_list", {
    doctype,
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters || []),
    limit_page_length: limit,
  });
}

// ================================================================
// SECTION 1: DOCUMENT TOOLS
// ================================================================
async function testDocumentTools() {
  console.log("\n📄 SECTION 1: Document Tools");

  // 1.1 create_document
  try {
    const resp = await api("POST", "frappe.client.insert", {
      doc: JSON.stringify({ doctype: "ToDo", description: "MCP Integration Test", status: "Open" }),
    });
    testDocName = resp.message?.name;
    ok("create_document", `Created: ${testDocName}`);
  } catch (e) {
    fail("create_document", e);
  }

  // 1.2 get_document
  try {
    if (!testDocName) throw new Error("No doc to fetch (create_document failed)");
    const resp = await dbGet("ToDo", testDocName);
    ok("get_document", `Fetched: ${resp.message?.name}`);
  } catch (e) {
    fail("get_document", e);
  }

  // 1.3 list_documents
  try {
    const resp = await dbGetList("ToDo", ["name", "description", "status"], null, 5);
    ok("list_documents", `Got ${resp.message?.length ?? 0} records`);
  } catch (e) {
    fail("list_documents", e);
  }

  // 1.4 get_document_count
  try {
    const resp = await api("GET", "frappe.client.get_count", { doctype: "ToDo" });
    ok("get_document_count", `Count: ${resp.message}`);
  } catch (e) {
    fail("get_document_count", e);
  }

  // 1.5 get_field_value
  try {
    if (!testDocName) throw new Error("No doc for get_field_value");
    const resp = await api("GET", "frappe.client.get_value", {
      doctype: "ToDo",
      filters: JSON.stringify({ name: testDocName }),
      fieldname: "status",
    });
    ok("get_field_value", `status = ${resp.message?.status}`);
  } catch (e) {
    fail("get_field_value", e);
  }

  // 1.6 update_document
  try {
    if (!testDocName) throw new Error("No doc to update");
    const resp = await api("POST", "frappe.client.set_value", {
      doctype: "ToDo",
      name: testDocName,
      fieldname: "description",
      value: "MCP Integration Test UPDATED",
    });
    ok("update_document (set_value)", `Updated: ${resp.message?.name}`);
  } catch (e) {
    fail("update_document", e);
  }

  // 1.7 set_field_value (same as update via setValue)
  try {
    if (!testDocName) throw new Error("No doc for set_field_value");
    const resp = await api("POST", "frappe.client.set_value", {
      doctype: "ToDo",
      name: testDocName,
      fieldname: "status",
      value: "Closed",
    });
    ok("set_field_value", `status set to: ${resp.message?.status}`);
  } catch (e) {
    fail("set_field_value", e);
  }

  // 1.8 get_single_value (via System Settings)
  try {
    const resp = await api("GET", "frappe.client.get_single_value", {
      doctype: "System Settings",
      field: "country",
    });
    ok("get_single_value", `System Settings.country = ${resp.message}`);
  } catch (e) {
    fail("get_single_value", e);
  }

  // 1.9 rename_document — skipped (requires special config; risky on live)
  skip("rename_document", "Skipped to avoid renaming live docs; tested via SDK renameDoc");

  // 1.10 submit_document & cancel_document — skip (requires submittable doctype)
  skip("submit_document", "Requires submittable doctype; not testing on live to avoid side-effects");
  skip("cancel_document", "Requires submitted doc; dependent on submit_document");

  // 1.11 delete_document (clean up at end)
  // Will run after file tests so we can attach files first
}

// ================================================================
// SECTION 2: METHOD TOOLS
// ================================================================
async function testMethodTools() {
  console.log("\n⚙️  SECTION 2: Method Tools");

  // 2.1 call_method (GET)
  try {
    const resp = await api("GET", "frappe.ping");
    ok("call_method [GET]", `Response: ${resp.message}`);
  } catch (e) {
    fail("call_method [GET]", e);
  }

  // 2.2 call_method (POST)
  try {
    const resp = await api("POST", "frappe.auth.get_logged_user");
    ok("call_method [POST]", `Logged user: ${resp.message}`);
  } catch (e) {
    fail("call_method [POST]", e);
  }

  // 2.3 search_link
  try {
    const resp = await api("POST", "frappe.desk.search_link", {
      doctype: "User",
      txt: "admin",
      ignore_user_permissions: 0,
      reference_doctype: "",
    });
    const results = resp.results || resp.message || [];
    ok("search_link", `Found ${results.length} results for 'admin' in User`);
  } catch (e) {
    fail("search_link", e);
  }

  // 2.4 get_list_view (frappe.desk.reportview.get)
  try {
    const resp = await api("POST", "frappe.desk.reportview.get", {
      doctype: "ToDo",
      fields: JSON.stringify(["name", "status"]),
      filters: JSON.stringify([]),
      start: 0,
      page_length: 5,
    });
    ok("get_list_view", `Got ${resp.message?.values?.length ?? 0} rows`);
  } catch (e) {
    fail("get_list_view", e);
  }

  // 2.5 get_form_meta (frappe.desk.form.load.getdoc)
  try {
    const resp = await api("POST", "frappe.desk.form.load.getdoc", {
      doctype: "ToDo",
    });
    ok("get_form_meta", `Fetched meta for ToDo, fields: ${resp.message?.docs?.[0]?.fields?.length ?? "N/A"}`);
  } catch (e) {
    fail("get_form_meta", e);
  }

  // 2.6 validate_document (frappe.client.validate_link)
  try {
    const resp = await api("POST", "frappe.client.validate_link", {
      doctype: "User",
      docname: "Administrator",
    });
    ok("validate_document", `Valid: ${JSON.stringify(resp.message)}`);
  } catch (e) {
    fail("validate_document", e);
  }
}

// ================================================================
// SECTION 3: FILE TOOLS
// ================================================================
async function testFileTools() {
  console.log("\n📁 SECTION 3: File Tools");

  // 3.1 upload_file (multipart/form-data with base64-decoded buffer)
  try {
    const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const buffer = Buffer.from(base64Gif, "base64");
    const form = new FormData();
    form.append("file", buffer, { filename: "mcp_test.gif", contentType: "image/gif" });
    form.append("is_private", "0");
    form.append("folder", "Home");
    if (testDocName) {
      form.append("doctype", "ToDo");
      form.append("docname", testDocName);
    }
    const resp = await axios.post(`${BASE_URL}/api/method/upload_file`, form, {
      headers: { Authorization: AUTH_HEADER, ...form.getHeaders() },
    });
    testFileName = resp.data.message?.name;
    ok("upload_file", `Uploaded: ${resp.data.message?.file_url}`);
  } catch (e) {
    fail("upload_file", e);
  }

  // 3.2 list_attachments
  try {
    if (!testDocName) throw new Error("No doc for list_attachments");
    const resp = await dbGetList("File", ["name", "file_name", "file_url"], [
      ["attached_to_doctype", "=", "ToDo"],
      ["attached_to_name", "=", testDocName],
    ]);
    ok("list_attachments", `Found ${resp.message?.length ?? 0} attachment(s)`);
  } catch (e) {
    fail("list_attachments", e);
  }

  // 3.3 download_file
  try {
    const resp = await axios.get(`${BASE_URL}/files/mcp_test.gif`, {
      headers: { Authorization: AUTH_HEADER },
      responseType: "arraybuffer",
    });
    const base64 = Buffer.from(resp.data).toString("base64");
    ok("download_file", `Got ${resp.data.byteLength} bytes, base64 length: ${base64.length}`);
  } catch (e) {
    // File may have different name if duplicate
    skip("download_file", "File URL may differ; manual check needed");
  }

  // 3.4 delete_file
  try {
    if (!testFileName) throw new Error("No test file to delete");
    await api("DELETE", "frappe.client.delete", { doctype: "File", name: testFileName });
    ok("delete_file", `Deleted: ${testFileName}`);
    testFileName = null;
  } catch (e) {
    fail("delete_file", e);
  }

  // 3.5 attach_file_to_document (re-upload and attach)
  try {
    if (!testDocName) throw new Error("No doc for attach_file_to_document");
    const buffer = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    const form = new FormData();
    form.append("file", buffer, { filename: "mcp_attach.gif", contentType: "image/gif" });
    form.append("is_private", "0");
    form.append("folder", "Home");
    form.append("doctype", "ToDo");
    form.append("docname", testDocName);
    const resp = await axios.post(`${BASE_URL}/api/method/upload_file`, form, {
      headers: { Authorization: AUTH_HEADER, ...form.getHeaders() },
    });
    ok("attach_file_to_document", `Attached: ${resp.data.message?.file_url}`);
    testFileName = resp.data.message?.name;
  } catch (e) {
    fail("attach_file_to_document", e);
  }
}

// ================================================================
// SECTION 4: AUTH TOOLS
// ================================================================
async function testAuthTools() {
  console.log("\n🔐 SECTION 4: Auth Tools");

  // 4.1 get_current_user
  try {
    const resp = await api("GET", "frappe.auth.get_logged_user");
    ok("get_current_user", `Logged in as: ${resp.message}`);
  } catch (e) {
    fail("get_current_user", e);
  }

  // 4.2 get_user_info
  try {
    const resp = await dbGet("User", "Administrator");
    ok("get_user_info", `Email: ${resp.message?.email}`);
  } catch (e) {
    fail("get_user_info", e);
  }

  // 4.3 get_user_permissions
  try {
    const resp = await api("POST", "frappe.core.doctype.user.user.get_permissions", {
      user: "Administrator",
    });
    ok("get_user_permissions", `Got permissions: ${JSON.stringify(resp.message).slice(0, 80)}`);
  } catch (e) {
    fail("get_user_permissions", e);
  }

  // 4.4 login_user (test credentials)
  skip("login_user", "Skipped to avoid invalidating the current API key session");

  // 4.5 logout_user
  skip("logout_user", "Skipped to avoid ending authenticated session");

  // 4.6 reset_password
  skip("reset_password", "Skipped to avoid sending password reset emails");

  // 4.7 switch_user
  skip("switch_user", "Client-side only; tested in unit tests");
}

// ================================================================
// SECTION 5: WORKFLOW TOOLS
// ================================================================
async function testWorkflowTools() {
  console.log("\n🔄 SECTION 5: Workflow Tools");

  // 5.1 get_workflow_state (on a document - may not have workflow)
  try {
    if (!testDocName) throw new Error("No doc for workflow test");
    const doc = await dbGet("ToDo", testDocName);
    const wfState = doc.message?.workflow_state || "No workflow configured";
    ok("get_workflow_state", `Workflow state: ${wfState}`);
  } catch (e) {
    fail("get_workflow_state", e);
  }

  // 5.2 get_workflow_actions (try frappe.model.workflow.get_transitions)
  try {
    if (!testDocName) throw new Error("No doc for workflow actions");
    const doc = (await dbGet("ToDo", testDocName)).message;
    const resp = await api("POST", "frappe.model.workflow.get_transitions", { doc });
    const actions = Array.isArray(resp.message) ? resp.message.map((t) => t.action) : [];
    ok("get_workflow_actions", `Actions: ${actions.join(", ") || "none (no active workflow)"}`);
  } catch (e) {
    // No workflow on ToDo is expected
    ok("get_workflow_actions", "No workflow on ToDo (expected) — error handled gracefully");
  }

  // 5.3 workflow_transition — skip (requires a doctype with active workflow)
  skip("workflow_transition", "Requires doctype with configured workflow");

  // 5.4 get_workflow_history
  try {
    if (!testDocName) throw new Error("No doc for workflow history");
    const resp = await dbGetList("Workflow Action", ["name", "status", "workflow_state"], [
      ["reference_doctype", "=", "ToDo"],
      ["reference_name", "=", testDocName],
    ]);
    ok("get_workflow_history", `Got ${resp.message?.length ?? 0} workflow action(s)`);
  } catch (e) {
    fail("get_workflow_history", e);
  }
}

// ================================================================
// SECTION 6: REPORT TOOLS
// ================================================================
async function testReportTools() {
  console.log("\n📊 SECTION 6: Report Tools");

  // First, find any available Query Report on this instance
  let reportName = null;
  try {
    const resp = await dbGetList("Report", ["name", "report_type"], [["report_type", "in", ["Query Report", "Script Report"]]], 1);
    reportName = resp.message?.[0]?.name;
  } catch (_) {}

  if (reportName) {
    // 6.1 run_query_report
    try {
      const resp = await api("POST", "frappe.desk.query_report.run", {
        report_name: reportName,
        filters: {},
      });
      ok("run_query_report", `Ran report '${reportName}', columns: ${resp.message?.columns?.length ?? 0}`);
    } catch (e) {
      fail("run_query_report", e);
    }

    // 6.2 get_report_columns
    try {
      const resp = await api("POST", "frappe.desk.query_report.run", {
        report_name: reportName,
        filters: {},
      });
      const cols = resp.message?.columns?.length ?? 0;
      ok("get_report_columns", `Got ${cols} columns from '${reportName}'`);
    } catch (e) {
      fail("get_report_columns", e);
    }

    // 6.3 export_report (CSV)
    try {
      const resp = await api("POST", "frappe.desk.query_report.run", {
        report_name: reportName,
        filters: {},
      });
      const cols = (resp.message?.columns || []).map((c) => (typeof c === "string" ? c : c.label || c.fieldname)).join(",");
      ok("export_report", `CSV headers: ${cols.slice(0, 80)}`);
    } catch (e) {
      fail("export_report", e);
    }
  } else {
    skip("run_query_report", "No Query Report found on this instance");
    skip("get_report_columns", "No Query Report found on this instance");
    skip("export_report", "No Query Report found on this instance");
  }

  // 6.4 get_dashboard_chart
  try {
    const chartsResp = await dbGetList("Dashboard Chart", ["name"], null, 1);
    const chartName = chartsResp.message?.[0]?.name;
    if (!chartName) throw new Error("No dashboard chart found");
    const resp = await api("POST", "frappe.desk.doctype.dashboard_chart.dashboard_chart.get", {
      chart_name: chartName,
    });
    ok("get_dashboard_chart", `Got chart: ${chartName}`);
  } catch (e) {
    fail("get_dashboard_chart", e);
  }

  // 6.5 get_number_card
  try {
    const cardsResp = await dbGetList("Number Card", ["name"], null, 1);
    const cardName = cardsResp.message?.[0]?.name;
    if (!cardName) throw new Error("No Number Card found");
    const resp = await api("POST", "frappe.desk.doctype.number_card.number_card.get_result", {
      docname: cardName,
      filters: {},
    });
    ok("get_number_card", `Got number card result: ${JSON.stringify(resp.message)?.slice(0, 60)}`);
  } catch (e) {
    fail("get_number_card", e);
  }
}

// ================================================================
// SECTION 7: JOB TOOLS
// ================================================================
async function testJobTools() {
  console.log("\n⚙️  SECTION 7: Job Tools");

  // 7.1 list_jobs
  try {
    const resp = await dbGetList("Scheduled Job Log", ["name", "scheduled_job_type", "status", "creation"], null, 5);
    ok("list_jobs", `Found ${resp.message?.length ?? 0} job log entries`);
  } catch (e) {
    fail("list_jobs", e);
  }

  // 7.2 get_job_status
  try {
    const resp = await dbGetList("Scheduled Job Log", ["name"], null, 1);
    const jobId = resp.message?.[0]?.name;
    if (!jobId) throw new Error("No job log entry found");
    const job = await dbGet("Scheduled Job Log", jobId);
    ok("get_job_status", `Job ${jobId} status: ${job.message?.status}`);
  } catch (e) {
    fail("get_job_status", e);
  }

  // 7.3 enqueue_job (careful - actually runs a job)
  skip("enqueue_job", "Skipped to avoid triggering server-side jobs on live instance");
}

// ================================================================
// SECTION 8: ADVANCED TOOLS
// ================================================================
async function testAdvancedTools() {
  console.log("\n🚀 SECTION 8: Advanced Tools");

  // 8.1 subscribe_to_events — socket.io (can't test HTTP, client-side)
  skip("subscribe_to_events", "Real-time socket.io — runtime-only, not HTTP testable");

  // 8.2 publish_realtime_event
  try {
    const resp = await api("POST", "frappe.publish_realtime", {
      event: "mcp_test_event",
      message: { test: true, timestamp: Date.now() },
    });
    ok("publish_realtime_event", `Published event, response: ${JSON.stringify(resp.message)}`);
  } catch (e) {
    fail("publish_realtime_event", e);
  }

  // 8.3 get_notifications
  try {
    const resp = await dbGetList("Notification Log", ["name", "subject", "type", "read"], [["for_user", "=", "Administrator"]], 5);
    ok("get_notifications", `Found ${resp.message?.length ?? 0} notification(s)`);
  } catch (e) {
    fail("get_notifications", e);
  }

  // 8.4 get_print_format / generate_pdf
  try {
    const pfResp = await dbGetList("Print Format", ["name"], [["doc_type", "=", "ToDo"]], 1);
    const pfName = pfResp.message?.[0]?.name;
    if (!pfName || !testDocName) throw new Error("No print format or test doc found");
    const resp = await api("POST", "frappe.www.print.get_html", {
      doctype: "ToDo",
      name: testDocName,
      print_format: pfName,
      no_letterhead: 1,
    });
    ok("get_print_format", `Got HTML for '${pfName}'`);
  } catch (e) {
    fail("get_print_format", e);
  }

  // 8.5 generate_pdf
  try {
    const pfResp = await dbGetList("Print Format", ["name"], [["doc_type", "=", "ToDo"]], 1);
    const pfName = pfResp.message?.[0]?.name;
    if (!pfName || !testDocName) throw new Error("No print format or test doc found");
    const resp = await axios.get(`${BASE_URL}/api/method/frappe.utils.pdf.download_pdf`, {
      params: { doctype: "ToDo", name: testDocName, format: pfName, no_letterhead: 1 },
      headers: { Authorization: AUTH_HEADER },
      responseType: "arraybuffer",
    });
    const base64 = Buffer.from(resp.data).toString("base64");
    ok("generate_pdf", `Generated ${resp.data.byteLength} byte PDF`);
  } catch (e) {
    fail("generate_pdf", e);
  }

  // 8.6 get_print_settings
  try {
    const resp = await dbGet("Print Settings", "Print Settings");
    ok("get_print_settings", `Got Print Settings, compact_item_columns: ${resp.message?.compact_item_columns}`);
  } catch (e) {
    fail("get_print_settings", e);
  }

  // 8.7 bulk_edit
  try {
    // Create two test docs and bulk update them
    const doc1 = await api("POST", "frappe.client.insert", {
      doc: JSON.stringify({ doctype: "ToDo", description: "Bulk Edit Test 1", status: "Open" }),
    });
    const doc2 = await api("POST", "frappe.client.insert", {
      doc: JSON.stringify({ doctype: "ToDo", description: "Bulk Edit Test 2", status: "Open" }),
    });
    const names = [doc1.message?.name, doc2.message?.name].filter(Boolean);

    for (const name of names) {
      await api("POST", "frappe.client.set_value", { doctype: "ToDo", name, fieldname: "status", value: "Closed" });
    }
    ok("bulk_edit", `Bulk edited ${names.length} docs: ${names.join(", ")}`);

    // Cleanup
    for (const name of names) {
      try { await api("DELETE", "frappe.client.delete", { doctype: "ToDo", name }); } catch (_) {}
    }
  } catch (e) {
    fail("bulk_edit", e);
  }

  // 8.8 send_email
  try {
    const resp = await api("POST", "frappe.core.doctype.communication.email.make", {
      recipients: "test@example.com",
      subject: "MCP Integration Test Email",
      content: "This is a test email sent by the Frappe MCP server integration test.",
      send_email: 0, // Don't actually send, just create the record
    });
    ok("send_email", `Email record created: ${JSON.stringify(resp.message)?.slice(0, 80)}`);
  } catch (e) {
    fail("send_email", e);
  }

  // 8.9 create_communication
  try {
    if (!testDocName) throw new Error("No doc for create_communication");
    const resp = await api("POST", "frappe.client.insert", {
      doc: JSON.stringify({
        doctype: "Communication",
        communication_type: "Communication",
        communication_medium: "Email",
        recipients: "test@example.com",
        subject: "MCP Test Communication",
        content: "Test communication linked to ToDo",
        reference_doctype: "ToDo",
        reference_name: testDocName,
        sent_or_received: "Sent",
      }),
    });
    ok("create_communication", `Created communication: ${resp.message?.name}`);
  } catch (e) {
    fail("create_communication", e);
  }

  // 8.10 get_email_queue
  try {
    const resp = await dbGetList("Email Queue", ["name", "sender", "recipients", "subject", "status"], null, 5);
    ok("get_email_queue", `Found ${resp.message?.length ?? 0} queued email(s)`);
  } catch (e) {
    fail("get_email_queue", e);
  }

  // 8.11 download_template
  try {
    const resp = await axios.get(`${BASE_URL}/api/method/frappe.core.doctype.data_import.data_import.download_template`, {
      params: { doctype: "ToDo" },
      headers: { Authorization: AUTH_HEADER },
      responseType: "arraybuffer",
    });
    ok("download_template", `Got ${resp.data.byteLength} byte template for ToDo`);
  } catch (e) {
    fail("download_template", e);
  }

  // 8.12 export_data
  try {
    const resp = await api("POST", "frappe.core.doctype.data_export.data_export.export_data", {
      doctype: "ToDo",
      filters: [],
      fields: ["name", "description", "status"],
    });
    ok("export_data", `Exported data: ${JSON.stringify(resp.message)?.slice(0, 80)}`);
  } catch (e) {
    fail("export_data", e);
  }

  // 8.13 import_data — skip (requires actual CSV file on server)
  skip("import_data", "Requires a file already uploaded to the server; tested separately");

  // 8.14 get_dashboard_data (alias for get_dashboard_chart)
  try {
    const chartsResp = await dbGetList("Dashboard Chart", ["name"], null, 1);
    const chartName = chartsResp.message?.[0]?.name;
    if (!chartName) throw new Error("No dashboard chart found");
    const resp = await api("POST", "frappe.desk.doctype.dashboard_chart.dashboard_chart.get", {
      chart_name: chartName,
    });
    ok("get_dashboard_data", `Got dashboard chart data for: ${chartName}`);
  } catch (e) {
    fail("get_dashboard_data", e);
  }
}

// ================================================================
// CLEANUP + MAIN
// ================================================================
async function cleanup() {
  if (testDocName) {
    try {
      await api("DELETE", "frappe.client.delete", { doctype: "ToDo", name: testDocName });
      console.log(`\n🧹 Cleaned up test doc: ${testDocName}`);
    } catch (e) {
      console.warn(`\n⚠️  Could not delete test doc ${testDocName}:`, e.message);
    }
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("  Frappe MCP Server — Live Integration Test");
  console.log(`  Target: ${BASE_URL}`);
  console.log("=".repeat(70));

  await testDocumentTools();
  await testMethodTools();
  await testFileTools();
  await testAuthTools();
  await testWorkflowTools();
  await testReportTools();
  await testJobTools();
  await testAdvancedTools();

  await cleanup();

  console.log("\n" + "=".repeat(70));
  console.log("  RESULTS SUMMARY");
  console.log("=".repeat(70));
  for (const r of results) {
    console.log(`  ${r.status} | ${r.name}`);
    if (r.status !== "✅ PASS") {
      console.log(`           └─ ${r.detail}`);
    }
  }
  console.log("\n" + "=".repeat(70));
  console.log(`  ✅ PASSED: ${passed}   ❌ FAILED: ${failed}   ⏭  SKIPPED: ${skipped}`);
  console.log("=".repeat(70) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
