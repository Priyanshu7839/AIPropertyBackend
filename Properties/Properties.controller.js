import { supabase } from "../Supabase.js"; // adjust path to your actual client

// ---- helpers ----------------------------------------------------------

// "" / undefined / null / whitespace-only -> null. Everything else passes through unchanged.
const nullable = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

// Sanitizes every top-level key of an object through nullable(). No defaults injected.
const sanitize = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, nullable(v)]));

// True if every value in the sanitized object is null (i.e. nothing usable came in)
const isEmptyPayload = (sanitizedObj) =>
  Object.values(sanitizedObj).every((v) => v === null);

// Tracks every successful insert so we can manually roll back if a later
// step fails. Supabase JS client has no cross-table transaction support,
// so this is the best available rollback without writing a Postgres RPC.
const createRollback = () => {
  const ops = []; // { table, column, value }
  return {
    record: (table, column, value) => ops.push({ table, column, value }),
    run: async () => {
      for (const op of ops.reverse()) {
        try {
          await supabase.from(op.table).delete().eq(op.column, op.value);
        } catch (e) {
          console.error(`Rollback failed for ${op.table}:`, e.message);
        }
      }
    },
  };
};

// ---- controller --------------------------------------------------------

export const createProperty = async (req, res) => {
  const rollback = createRollback();
  let propertyId = null;
  const skipped = []; // tracks what got skipped, returned to caller for visibility

  try {
    const userId = '1';
    // if (!userId) {
    //   return res.status(401).json({ success: false, message: "Unauthorized" });
    // }

    const {
      property = {},
      address,
      details,
      team = [],
      contacts = [],
      utilities = [],
      alerts = [],
      insurance,
      loans = [],
      tenants = [],
      goals = [],
      documents = [],
    } = req.body;

    // ---- 1. PROPERTY ----
    // property_name + category are NOT NULL. If either is missing, the whole
    // record can't be created — this is the one section that must fail loudly
    // rather than silently skip, since every other table depends on property_id.

    const propertyPayload = sanitize({
      property_name: property.property_name,
      category: property.category,
      description: property.description,
      investment_strategy: property.investment_strategy,
      management_start_date: property.management_start_date,
      rent_collection_day: property.rent_collection_day,
      fiscal_year_end: property.fiscal_year_end,
      notes: property.notes,
      status: 'active'
    });

    if (propertyPayload.property_name === null || propertyPayload.category === null) {
      return res.status(400).json({
        success: false,
        message: "property.property_name and property.category are required",
      });
    }

    const { data: createdProperty, error: propertyError } = await supabase
      .from("properties")
      .insert(propertyPayload)
      .select()
      .single();

    if (propertyError) throw propertyError;
    propertyId = createdProperty.property_id;
    rollback.record("properties", "property_id", propertyId);

    // ---- 2. OWNER ----
    // Not user payload-driven — always created from the authenticated user.

    const { error: ownerError } = await supabase.from("property_users").insert(
      sanitize({
        property_id: propertyId,
        user_id: userId,
        role: "owner",
        access_level: "full",
        is_primary_owner: true,
        invite_status: "accepted",
      })
    );
    if (ownerError) throw ownerError;

    // ---- 3. ADDRESS ----

    if (address) {
      const payload = sanitize({
        property_id: propertyId,
        street: address.street,
        unit: address.unit,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        county: address.county,
        latitude: address.latitude,
        longitude: address.longitude,
        formatted_address: address.formatted_address,
        parcel_number: address.parcel_number,
        apn: address.apn,
        legal_description: address.legal_description,
        zoning: address.zoning,
      });

      if (isEmptyPayload({ ...payload, property_id: null })) {
        skipped.push("address");
      } else {
        const { error } = await supabase.from("property_addresses").insert(payload);
        if (error) throw error;
      }
    }

    // ---- 4. DETAILS ----

    if (details) {
      const { property_type, data, ...rest } = details;
      const dataPayload = data ?? (Object.keys(rest).length ? rest : null);

      if (nullable(property_type) === null && dataPayload === null) {
        skipped.push("details");
      } else {
        const { error } = await supabase.from("property_details").insert(
          sanitize({
            property_id: propertyId,
            property_type,
            data: dataPayload,
          })
        );
        if (error) throw error;
      }
    }

    // ---- 5. TEAM ----
    // user_id + role are NOT NULL per row. Rows missing either are skipped individually.

    if (team.length) {
      const rows = [];
      team.forEach((member, i) => {
        const row = sanitize({
          property_id: propertyId,
          user_id: member.user_id,
          role: member.role,
          access_level: member.access_level,
          is_primary_owner: member.is_primary_owner,
          invite_status: member.invite_status,
        });
        if (row.user_id === null || row.role === null) {
          skipped.push(`team[${i}] (missing user_id or role)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_users").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 6. CONTACTS ----
    // name + contact_type are NOT NULL per row.

    if (contacts.length) {
      const rows = [];
      contacts.forEach((c, i) => {
        const row = sanitize({
          property_id: propertyId,
          contact_type: c.contact_type,
          role: c.role,
          name: c.name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          license_number: c.license_number,
          portal_access: c.portal_access,
          invite_status: c.invite_status,
          notes: c.notes,
        });
        if (row.name === null || row.contact_type === null) {
          skipped.push(`contacts[${i}] (missing name or contact_type)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_contacts").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 7. UTILITIES ----
    // utility_type is NOT NULL per row.

    if (utilities.length) {
      const rows = [];
      utilities.forEach((u, i) => {
        const row = sanitize({
          property_id: propertyId,
          utility_type: u.utility_type,
          provider_name: u.provider_name,
          account_number: u.account_number,
          average_monthly_cost: u.average_monthly_cost,
          latest_bill_amount: u.latest_bill_amount,
          latest_bill_date: u.latest_bill_date,
          active: u.active,
        });
        if (row.utility_type === null) {
          skipped.push(`utilities[${i}] (missing utility_type)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_utilities").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 8. ALERTS ----
    // alert_type is NOT NULL per row.

    if (alerts.length) {
      const rows = [];
      alerts.forEach((a, i) => {
        const row = sanitize({
          property_id: propertyId,
          utility_id: a.utility_id,
          alert_type: a.alert_type,
          fixed_amount_threshold: a.fixed_amount_threshold,
          percentage_threshold: a.percentage_threshold,
          ignore_below_amount: a.ignore_below_amount,
          notify_roles: a.notify_roles ?? null,
          enabled: a.enabled,
        });
        if (row.alert_type === null) {
          skipped.push(`alerts[${i}] (missing alert_type)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_alerts").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 9. INSURANCE ----
    // No NOT NULL columns besides property_id/insurance_id — skip only if fully empty.

    if (insurance) {
      const payload = sanitize({
        property_id: propertyId,
        carrier: insurance.carrier,
        policy_number: insurance.policy_number,
        coverage_amount: insurance.coverage_amount,
        annual_premium: insurance.annual_premium,
        deductible: insurance.deductible,
        policy_start_date: insurance.policy_start_date,
        renewal_date: insurance.renewal_date,
        renewal_alert_enabled: insurance.renewal_alert_enabled,
        status: insurance.status,
      });

      if (isEmptyPayload({ ...payload, property_id: null })) {
        skipped.push("insurance");
      } else {
        const { error } = await supabase.from("property_insurance").insert(payload);
        if (error) throw error;
      }
    }

    // ---- 10. LOANS ----
    // lender is NOT NULL per row.

    if (loans.length) {
      const rows = [];
      loans.forEach((l, i) => {
        const row = sanitize({
          property_id: propertyId,
          lender: l.lender,
          loan_type: l.loan_type,
          interest_rate: l.interest_rate,
          original_loan_amount: l.original_loan_amount,
          outstanding_balance: l.outstanding_balance,
          monthly_payment: l.monthly_payment,
          loan_start_date: l.loan_start_date,
          maturity_date: l.maturity_date,
          escrow_included: l.escrow_included,
          status: l.status,
        });
        if (row.lender === null) {
          skipped.push(`loans[${i}] (missing lender)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_loans").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 11. TENANTS + LEASES ----
    // tenant.name is NOT NULL. If missing, skip the tenant AND its lease
    // (a lease can't exist without a tenant_id).

    for (const [i, item] of tenants.entries()) {
      const { tenant = {}, lease } = item;

      const tenantRow = sanitize({
        property_id: propertyId,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        unit: tenant.unit,
        portal_status: tenant.portal_status,
      });

      if (tenantRow.name === null) {
        skipped.push(`tenants[${i}] (missing tenant.name, lease skipped too)`);
        continue;
      }

      const { data: createdTenant, error: tenantError } = await supabase
        .from("property_tenants")
        .insert(tenantRow)
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (lease) {
        const leasePayload = sanitize({
          property_id: propertyId,
          tenant_id: createdTenant.tenant_id,
          unit: lease.unit ?? tenant.unit,
          lease_start_date: lease.lease_start_date,
          lease_end_date: lease.lease_end_date,
          monthly_rent: lease.monthly_rent,
          security_deposit: lease.security_deposit,
          status: lease.status,
        });

        if (isEmptyPayload({ ...leasePayload, property_id: null, tenant_id: null })) {
          skipped.push(`tenants[${i}].lease (all fields empty)`);
        } else {
          const { error: leaseError } = await supabase.from("property_leases").insert(leasePayload);
          if (leaseError) throw leaseError;
        }
      }
    }

    // ---- 12. GOALS ----
    // goal is NOT NULL per row.

    if (goals.length) {
      const rows = [];
      goals.forEach((g, i) => {
        const row = sanitize({ property_id: propertyId, goal: g.goal, active: g.active });
        if (row.goal === null) {
          skipped.push(`goals[${i}] (missing goal)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_goals").insert(rows);
        if (error) throw error;
      }
    }

    // ---- 13. DOCUMENTS ----
    // file_name + file_url are NOT NULL per row.

    if (documents.length) {
      const rows = [];
      documents.forEach((d, i) => {
        const row = sanitize({
          property_id: propertyId,
          entity_type: d.entity_type,
          entity_id: d.entity_id,
          file_name: d.file_name,
          file_url: d.file_url,
          storage_path: d.storage_path,
          category: d.category,
          uploaded_by: userId,
          extracted_data: d.extracted_data ?? null,
        });
        if (row.file_name === null || row.file_url === null) {
          skipped.push(`documents[${i}] (missing file_name or file_url)`);
        } else {
          rows.push(row);
        }
      });
      if (rows.length) {
        const { error } = await supabase.from("property_documents").insert(rows);
        if (error) throw error;
      }
    }

    return res.status(201).json({
      success: true,
      property_id: propertyId,
      skipped, // empty array if nothing was skipped
    });
  } catch (error) {
    console.error("createProperty failed:", error);

    if (propertyId) await rollback.run();

    return res.status(500).json({
      success: false,
      message: error.message ?? "Failed to create property",
    });
  }
};