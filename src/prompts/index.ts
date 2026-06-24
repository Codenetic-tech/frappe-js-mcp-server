import { Prompt, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";

export const PROMPTS: Prompt[] = [
  {
    name: "create_sales_order",
    description: "Template to guide creating a new Sales Order in ERPNext.",
    arguments: [
      { name: "customer", description: "Customer name/ID", required: true },
      { name: "item_code", description: "Item code/ID", required: true },
      { name: "qty", description: "Quantity of item", required: true },
      { name: "rate", description: "Unit price of item", required: false },
    ],
  },
  {
    name: "approve_purchase",
    description: "Template for purchase order or purchase receipt approval workflow.",
    arguments: [
      { name: "doctype", description: "DocType (e.g. Purchase Order)", required: true },
      { name: "name", description: "Document ID/name", required: true },
      { name: "action", description: "Approval action (e.g. Approve)", required: true },
    ],
  },
  {
    name: "generate_monthly_report",
    description: "Monthly analytics generation assistant.",
    arguments: [
      { name: "report_name", description: "Name of report (e.g., General Ledger)", required: true },
      { name: "fiscal_year", description: "e.g., 2026", required: true },
    ],
  },
  {
    name: "onboard_new_employee",
    description: "Onboarding assistant guidance for HR.",
    arguments: [
      { name: "employee_name", description: "Full name of employee", required: true },
      { name: "department", description: "Department", required: true },
      { name: "role", description: "Job title", required: true },
    ],
  },
];

export async function getPrompt(name: string, args: Record<string, string>) {
  logger.info(`Getting prompt template: ${name}`);

  switch (name) {
    case "create_sales_order":
      return {
        description: "Guide to create a Sales Order",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please help me create a Sales Order for customer: "${args.customer}".
The order should contain the item: "${args.item_code}" with quantity ${args.qty}${args.rate ? ` at rate ${args.rate}` : ""}.
Use 'create_document' to insert the Sales Order record. Remember to check link fields and item price if needed.`,
            },
          },
        ],
      };

    case "approve_purchase":
      return {
        description: "Guide to execute purchase approval workflow",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please trigger the workflow transition on document "${args.name}" (DocType: "${args.doctype}").
The action to apply is: "${args.action}".
Use 'workflow_transition' tool to apply this transition and verify that it updates the workflow state successfully.`,
            },
          },
        ],
      };

    case "generate_monthly_report":
      return {
        description: "Guide to generate monthly report data",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please run the report "${args.report_name}" for the fiscal year: "${args.fiscal_year}".
Use 'run_query_report' or 'export_report' to fetch and display the report columns and result data.`,
            },
          },
        ],
      };

    case "onboard_new_employee":
      return {
        description: "HR onboarding checklist assistant",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `We need to onboard a new employee named: "${args.employee_name}".
Department: "${args.department}"
Job Role: "${args.role}"

Please help me by creating the corresponding 'Employee' document first with these fields using 'create_document'.`,
            },
          },
        ],
      };

    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  }
}
