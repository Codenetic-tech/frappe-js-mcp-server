/**
 * Quick endpoint probe - test correct API parameters for the failing tools
 */
import axios from "axios";

const BASE_URL = "https://web.codenetic.online";
const AUTH = "token c638874387ff3e8:f63dda7dbe445b6";

async function probe(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}:`, JSON.stringify(result?.data?.message ?? result?.data).slice(0, 200));
  } catch (e) {
    const err = e.response?.data?.exception || e.response?.data?.message || e.message;
    console.error(`❌ ${name}:`, err?.slice(0, 300));
  }
}

const ax = axios.create({ headers: { Authorization: AUTH } });

async function main() {
  // --- 1. search_link correct endpoint ---
  await probe("search_link (search.search_link GET)", () =>
    ax.get(`${BASE_URL}/api/method/frappe.desk.search.search_link`, {
      params: { doctype: "User", txt: "admin", ignore_user_permissions: 0, reference_doctype: "" },
    })
  );

  // --- 2. get_form_meta (getdoc with name) ---
  await probe("get_form_meta (getdoc with name=ToDo)", () =>
    ax.get(`${BASE_URL}/api/method/frappe.desk.form.load.getdoc`, {
      params: { doctype: "ToDo", name: "ToDo" },
    })
  );
  
  // --- 3. validate_document via frappe.client.get ---
  await probe("validate_document (frappe.client.get Administrator)", () =>
    ax.get(`${BASE_URL}/api/method/frappe.client.get`, {
      params: { doctype: "User", name: "Administrator" },
    })
  );

  // --- 4. get_user_permissions via User Permission doctype ---
  await probe("get_user_permissions (getDocList User Permission)", () =>
    ax.get(`${BASE_URL}/api/resource/User Permission`, {
      params: {
        fields: JSON.stringify(["name", "user", "allow", "for_value"]),
        filters: JSON.stringify([["user", "=", "Administrator"]]),
        limit_page_length: 5,
      },
    })
  );

  // --- 5. get_number_card: fetch doc first then call get_result ---
  let numberCardDoc = null;
  await probe("Number Card: fetch list", async () => {
    const r = await ax.get(`${BASE_URL}/api/resource/Number Card`, {
      params: { fields: JSON.stringify(["name"]), limit_page_length: 1 },
    });
    numberCardDoc = r.data?.data?.[0]?.name;
    return r;
  });
  if (numberCardDoc) {
    await probe(`get_number_card: get doc '${numberCardDoc}'`, () =>
      ax.get(`${BASE_URL}/api/resource/Number Card/${numberCardDoc}`)
    );
    const docResp = await ax.get(`${BASE_URL}/api/resource/Number Card/${numberCardDoc}`).catch(() => null);
    if (docResp?.data?.data) {
      await probe("get_number_card: get_result with doc", () =>
        ax.post(`${BASE_URL}/api/method/frappe.desk.doctype.number_card.number_card.get_result`, {
          doc: JSON.stringify(docResp.data.data),
          filters: "{}",
        })
      );
    }
  }

  // --- 6. publish_realtime: try frappe.client.set_value as proxy ---
  await probe("publish_realtime_event (frappe.realtime.publish_realtime)", () =>
    ax.post(`${BASE_URL}/api/method/frappe.realtime.publish_realtime`, {
      event: "mcp_test", message: "hello",
    })
  );

  // --- 7. get_email_queue without subject ---
  await probe("get_email_queue (no subject field)", () =>
    ax.get(`${BASE_URL}/api/resource/Email Queue`, {
      params: {
        fields: JSON.stringify(["name", "sender", "recipients", "status", "creation"]),
        limit_page_length: 5,
      },
    })
  );

  // --- 8. download_template with correct params ---
  await probe("download_template (with file_type + template_type)", async () => {
    const r = await ax.get(`${BASE_URL}/api/method/frappe.core.doctype.data_import.data_import.download_template`, {
      params: { doctype: "ToDo", file_type: "CSV", template_type: "import" },
      responseType: "arraybuffer",
    });
    return { data: { message: `${r.data.byteLength} bytes` } };
  });

  // --- 9. export_data via reportview.export_query ---
  await probe("export_data (reportview.export_query)", () =>
    ax.post(`${BASE_URL}/api/method/frappe.desk.reportview.export_query`, {
      doctype: "ToDo",
      filters: "[]",
      fields: JSON.stringify(["name", "status"]),
      file_format_type: "CSV",
      title: "ToDo",
      csv_delimiter: ",",
    })
  );

  // --- 10. get_print_format via frappe.utils.print ---
  let printFormatName = null;
  await probe("Print Format list for ToDo", async () => {
    const r = await ax.get(`${BASE_URL}/api/resource/Print Format`, {
      params: {
        filters: JSON.stringify([["doc_type", "=", "ToDo"]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: 1,
      },
    });
    printFormatName = r.data?.data?.[0]?.name;
    return r;
  });

  // Try User print format instead
  if (!printFormatName) {
    await probe("Print Format list for User", async () => {
      const r = await ax.get(`${BASE_URL}/api/resource/Print Format`, {
        params: {
          fields: JSON.stringify(["name", "doc_type"]),
          limit_page_length: 3,
        },
      });
      printFormatName = r.data?.data?.[0]?.name;
      return r;
    });
  }

  if (printFormatName) {
    const pf = await ax.get(`${BASE_URL}/api/resource/Print Format/${printFormatName}`);
    const doctype = pf.data?.data?.doc_type;
    
    // Get a doc of that doctype
    let docname = null;
    const docList = await ax.get(`${BASE_URL}/api/resource/${doctype}`, {
      params: { limit_page_length: 1, fields: JSON.stringify(["name"]) },
    }).catch(() => null);
    docname = docList?.data?.data?.[0]?.name;

    if (docname) {
      await probe(`get_print_format (frappe.utils.print) for ${doctype}/${docname}`, async () => {
        const r = await ax.get(`${BASE_URL}/api/method/frappe.utils.print`, {
          params: { doctype, name: docname, format: printFormatName, no_letterhead: 1 },
        });
        return { data: { message: `${String(r.data).slice(0, 100)}` } };
      });

      await probe(`generate_pdf (download_pdf) for ${doctype}/${docname}`, async () => {
        const r = await ax.get(`${BASE_URL}/api/method/frappe.utils.pdf.download_pdf`, {
          params: { doctype, name: docname, format: printFormatName, no_letterhead: 1 },
          responseType: "arraybuffer",
        });
        return { data: { message: `${r.data.byteLength} bytes PDF` } };
      });
    }
  }
}

main();
