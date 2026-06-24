import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDB, getFrappeApp, getAuth } from "../../src/core/frappe-client.js";
import { handleToolCall } from "../../src/tools/index.js";
import { readResource } from "../../src/resources/index.js";
import { getPrompt } from "../../src/prompts/index.js";

// Set fake environment variables before importing config
process.env.FRAPPE_URL = "https://example.com";

// Mock the frappe client module
vi.mock("../../src/core/frappe-client.js", () => {
  const mockDb = {
    createDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocList: vi.fn(),
    getCount: vi.fn(),
    getValue: vi.fn(),
    setValue: vi.fn(),
    renameDoc: vi.fn(),
    getSingleValue: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
  };

  const mockCall = {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const mockAuth = {
    loginWithUsernamePassword: vi.fn(),
    logout: vi.fn(),
    getLoggedInUser: vi.fn(),
    forgetPassword: vi.fn(),
  };

  const mockApp = {
    db: () => mockDb,
    call: () => mockCall,
    file: () => ({}),
    auth: () => mockAuth,
  };

  return {
    getFrappeApp: () => mockApp,
    getDB: () => mockDb,
    getFile: () => ({}),
    getAuth: () => mockAuth,
    switchFrappeUser: vi.fn(),
  };
});

describe("Frappe MCP Document Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a document successfully", async () => {
    const mockDb = getDB();
    (mockDb.createDoc as any).mockResolvedValue({ name: "NEW-DOC-1", status: "Open" });

    const result = await handleToolCall("create_document", {
      doctype: "Task",
      document: { subject: "Test subject" },
    });

    expect(mockDb.createDoc).toHaveBeenCalledWith("Task", { subject: "Test subject" });
    expect(result.content[0].text).toContain("NEW-DOC-1");
  });

  it("should get a document successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDoc as any).mockResolvedValue({ name: "DOC-1", status: "Open" });

    const result = await handleToolCall("get_document", {
      doctype: "Task",
      name: "DOC-1",
    });

    expect(mockDb.getDoc).toHaveBeenCalledWith("Task", "DOC-1");
    expect(result.content[0].text).toContain("DOC-1");
  });

  it("should list documents successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDocList as any).mockResolvedValue([{ name: "DOC-1" }, { name: "DOC-2" }]);

    const result = await handleToolCall("list_documents", {
      doctype: "Task",
      fields: ["name"],
      filters: [["status", "=", "Open"]],
    });

    expect(mockDb.getDocList).toHaveBeenCalledWith("Task", {
      fields: ["name"],
      filters: [["status", "=", "Open"]],
      orFilters: undefined,
      limit_start: undefined,
      limit: undefined,
      orderBy: undefined,
      asDict: undefined,
    });
    expect(result.content[0].text).toContain("DOC-1");
  });

  it("should submit a document successfully", async () => {
    const mockDb = getDB();
    (mockDb.submit as any).mockResolvedValue({ name: "SUBMITTED-1", docstatus: 1 });

    const result = await handleToolCall("submit_document", {
      document: { doctype: "Task", name: "TASK-1" },
    });

    expect(mockDb.submit).toHaveBeenCalledWith({ doctype: "Task", name: "TASK-1" });
    expect(result.content[0].text).toContain("SUBMITTED-1");
  });
});

describe("Frappe MCP Method & Workflow Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger workflow transition successfully", async () => {
    const mockDb = getDB();
    const mockApp = getFrappeApp();
    (mockDb.getDoc as any).mockResolvedValue({ name: "PO-123", workflow_state: "Draft" });
    (mockApp.call().post as any).mockResolvedValue({ name: "PO-123", workflow_state: "Approved" });

    const result = await handleToolCall("workflow_transition", {
      doctype: "Purchase Order",
      name: "PO-123",
      action: "Approve",
    });

    expect(mockDb.getDoc).toHaveBeenCalledWith("Purchase Order", "PO-123");
    expect(mockApp.call().post).toHaveBeenCalledWith("frappe.model.workflow.apply_workflow_transition", {
      doc: { name: "PO-123", workflow_state: "Draft" },
      action: "Approve",
    });
    expect(result.content[0].text).toContain("Approved");
  });

  it("should execute report runner successfully", async () => {
    const mockApp = getFrappeApp();
    (mockApp.call().post as any).mockResolvedValue({
      columns: ["item_code", "qty"],
      result: [["ITM-001", 10]],
    });

    const result = await handleToolCall("run_query_report", {
      report_name: "Stock Balance",
      filters: { company: "Test Company" },
    });

    expect(mockApp.call().post).toHaveBeenCalledWith("frappe.desk.query_report.run", {
      report_name: "Stock Balance",
      filters: { company: "Test Company" },
    });
    expect(result.content[0].text).toContain("ITM-001");
  });
});

describe("Frappe MCP Auth Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login user successfully", async () => {
    const mockAuth = getAuth();
    (mockAuth.loginWithUsernamePassword as any).mockResolvedValue({
      home_page: "/desk",
      message: "Logged In",
    });

    const result = await handleToolCall("login_user", {
      usr: "admin@example.com",
      pwd: "secretpassword",
    });

    expect(mockAuth.loginWithUsernamePassword).toHaveBeenCalledWith("admin@example.com", "secretpassword");
    expect(result.content[0].text).toContain("Logged In");
  });

  it("should switch user successfully", async () => {
    const result = await handleToolCall("switch_user", {
      type: "api_key",
      apiKey: "12345",
      apiSecret: "abcde",
    });
    expect(result.content[0].text).toContain("Successfully switched user session");
  });
});

describe("Frappe MCP Resources Protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read schema resource successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDoc as any).mockResolvedValue({ name: "Task", fields: [{ fieldname: "subject" }] });

    const result = await readResource("schema://Task");

    expect(mockDb.getDoc).toHaveBeenCalledWith("DocType", "Task");
    expect(result.contents[0].text).toContain("subject");
  });

  it("should read fields schema resource successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDoc as any).mockResolvedValue({ name: "Task", fields: [{ fieldname: "subject" }] });

    const result = await readResource("schema://Task/fields");

    expect(mockDb.getDoc).toHaveBeenCalledWith("DocType", "Task");
    expect(result.contents[0].text).toContain("subject");
  });

  it("should read document data resource successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDoc as any).mockResolvedValue({ name: "TASK-001", subject: "Refactor tests" });

    const result = await readResource("data://Task/TASK-001");

    expect(mockDb.getDoc).toHaveBeenCalledWith("Task", "TASK-001");
    expect(result.contents[0].text).toContain("Refactor tests");
  });
});

describe("Frappe MCP Prompts Protocol", () => {
  it("should get compiled prompts successfully", async () => {
    const result = await getPrompt("create_sales_order", {
      customer: "Cust A",
      item_code: "Item X",
      qty: "5",
    });

    expect(result.description).toContain("Sales Order");
    expect(result.messages[0].content.text).toContain("Cust A");
    expect(result.messages[0].content.text).toContain("Item X");
    expect(result.messages[0].content.text).toContain("5");
  });
});

describe("Frappe MCP New Advanced Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get print settings successfully", async () => {
    const mockDb = getDB();
    (mockDb.getDoc as any).mockResolvedValue({ name: "Print Settings", default_page_size: "A4" });

    const result = await handleToolCall("get_print_settings", {});

    expect(mockDb.getDoc).toHaveBeenCalledWith("Print Settings", "Print Settings");
    expect(result.content[0].text).toContain("A4");
  });

  it("should bulk edit documents successfully", async () => {
    const mockDb = getDB();
    (mockDb.updateDoc as any).mockResolvedValue({ name: "DOC-1", status: "Closed" });

    const result = await handleToolCall("bulk_edit", {
      doctype: "Task",
      names: ["DOC-1", "DOC-2"],
      values: { status: "Closed" },
    });

    expect(mockDb.updateDoc).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toContain("Closed");
  });
});

