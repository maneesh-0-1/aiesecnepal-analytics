import { format, addMonths as fnAddMonths } from "date-fns";

const ACCESS_TOKEN = (process.env.AIESEC_ACCESS_TOKEN || "") as string;
const GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";

// Helper to fetch a single page with retry logic
async function fetchPage(query: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ACCESS_TOKEN
        },
        body: JSON.stringify({ query })
      });

      const json = await res.json();
      if (!json.data) {
        if (json.errors) {
          console.error("EXPA Query Errors:", JSON.stringify(json.errors, null, 2));
        }
        throw new Error("AIESEC API Error: " + JSON.stringify(json.errors));
      }
      return json.data;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.warn(`Retry ${i + 1}/${retries} failed: ${e.message}. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function fetchApplicationsByStatus(
  mcId: number | null,
  isIcx: boolean,
  statusFilter: string,
  startDate: string,
  endDate: string,
  limit = 1000
) {
  let allData: any[] = [];
  let page = 1;
  const perPage = 1000;

  console.log(`Fetching ${isIcx ? 'ICX' : 'OGX'} ${statusFilter} for MC ${mcId || 'GLOBAL'} (Target: ${limit})...`);

  // Map our internal status key to EXPA filter keys
  const dateFilterKey =
    statusFilter === 'applied' ? 'created_at' :
      statusFilter === 'accepted' ? 'date_matched' :
        statusFilter === 'approved' ? 'date_approved' :
          statusFilter === 'realized' ? 'date_realized' :
            (statusFilter === 'finished' || statusFilter === 'completed') ? 'experience_end_date' :
              'updated_at';

  const mcFilter = mcId ? `${isIcx ? 'opportunity_home_mc' : 'person_home_mc'}: ${mcId},` : '';

  while (allData.length < limit) {
    const query = `
        query {
          allOpportunityApplication(
            filters: {
              ${mcFilter}
              ${dateFilterKey}: { from: "${startDate}", to: "${endDate}" }
            },
            page: ${page},
            per_page: ${perPage}
          ) {
            data {
              id
              status
              created_at
              date_matched
              date_approved
              date_realized
              experience_end_date
              person { 
                id 
                full_name 
                home_lc { id name parent { id name } }
              }
              opportunity { 
                id 
                title 
                host_lc { id name parent { id name } } 
                programme { id short_name_display } 
              }
            }
          }
        }`;

    const result = await fetchPage(query);
    const data = result?.allOpportunityApplication?.data;

    if (!data || data.length === 0) break;

    const filtered = data.map((a: any) => ({
        id: a.id,
        person_id: a.person?.id,
        status: a.status,
        applied_at: a.created_at,
        accepted_at: a.date_matched,
        approved_at: a.date_approved,
        realized_at: a.date_realized,
        finished_at: a.experience_end_date,
        completed_at: a.status === 'completed' ? a.experience_end_date : null,
        // Denormalized geography
        home_lc: a.person?.home_lc?.name,
        home_lc_id: a.person?.home_lc?.id,
        home_mc: a.person?.home_lc?.parent?.name,
        home_mc_id: a.person?.home_lc?.parent?.id,
        host_lc: a.opportunity?.host_lc?.name,
        host_lc_id: a.opportunity?.host_lc?.id,
        host_mc: a.opportunity?.host_lc?.parent?.name,
        host_mc_id: a.opportunity?.host_lc?.parent?.id,
        product: a.opportunity?.programme?.short_name_display || String(a.opportunity?.programme?.id || "")
      }));

    allData = [...allData, ...filtered];
    page++;
    if (data.length < perPage) break;
  }
  return { data: allData.slice(0, limit) };
}

export async function fetchPeopleByIDs(ids: number[]) {
  console.log(`Fetching ${ids.length} people by IDs...`);
  const query = `
    query {
      people(filters: { ids: [${ids.join(',')}] }) {
        data {
          id
          full_name
          created_at
          home_lc { id name parent { id name } }
          home_mc { id name }
        }
      }
    }`;
  const result = await fetchPage(query);
  return {
    data: (result?.people?.data || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      type: 'SIGNUP',
      created_at: p.created_at,
      date: p.created_at,
      home_lc: p.home_lc?.name || "National",
      home_lc_id: p.home_lc?.id || null,
      home_mc: p.home_lc?.parent?.name || p.home_mc?.name,
      home_mc_id: p.home_lc?.parent?.id || p.home_mc?.id
    }))
  };
}

export async function fetchApplicationsByIDs(ids: number[]) {
  console.log(`Fetching ${ids.length} applications by IDs...`);
  const query = `
    query {
      allOpportunityApplication(filters: { ids: [${ids.join(',')}] }) {
        data {
          id
          status
          created_at
          date_matched
          date_approved
          date_realized
          experience_end_date
          person { 
            id 
            full_name 
            home_lc { id name parent { id name } }
          }
          opportunity { 
            id 
            title 
            host_lc { id name parent { id name } } 
            programme { id short_name_display } 
          }
        }
      }
    }`;
  const result = await fetchPage(query);
  return {
    data: (result?.allOpportunityApplication?.data || []).map((a: any) => ({
      id: a.id,
      person_id: a.person?.id,
      status: a.status,
      applied_at: a.created_at,
      accepted_at: a.date_matched,
      approved_at: a.date_approved,
      realized_at: a.date_realized,
      finished_at: a.experience_end_date,
      completed_at: a.status === 'completed' ? a.experience_end_date : null,
      home_lc: a.person?.home_lc?.name,
      home_lc_id: a.person?.home_lc?.id,
      home_mc: a.person?.home_lc?.parent?.name,
      home_mc_id: a.person?.home_lc?.parent?.id,
      host_lc: a.opportunity?.host_lc?.name,
      host_lc_id: a.opportunity?.host_lc?.id,
      host_mc: a.opportunity?.host_lc?.parent?.name,
      host_mc_id: a.opportunity?.host_lc?.parent?.id,
      product: a.opportunity?.programme?.short_name_display || String(a.opportunity?.programme?.id || "")
    }))
  };
}

export async function fetchICXByStatus(status: string, start: string, end: string, mcId: number | null = null, limit = 1000) {
  return fetchApplicationsByStatus(mcId, true, status, start, end, limit);
}

export async function fetchOGXByStatus(status: string, start: string, end: string, mcId: number | null = null, limit = 1000) {
  return fetchApplicationsByStatus(mcId, false, status, start, end, limit);
}

export async function fetchSignUps(startDate: string, endDate: string, mcId: number | null = null, limit = 1000) {
  let allData: any[] = [];
  let page = 1;
  const perPage = 1000;

  console.log(`Fetching MC ${mcId || 'GLOBAL'} Sign-ups (Target: ${limit})...`);

  const mcFilter = mcId ? `home_committee: ${mcId},` : '';

  while (allData.length < limit) {
    const query = `
        query {
          people(
            filters: {
              ${mcFilter}
              registered: { from: "${startDate}", to: "${endDate}" }
            },
            page: ${page},
            per_page: ${perPage}
          ) {
            data {
              id
              full_name
              created_at
              home_lc { id name parent { id name } }
              home_mc { id name }
            }
          }
        }`;

    const result = await fetchPage(query);
    const data = result?.people?.data;

    if (!data || data.length === 0) break;

    const mapped = data.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      type: 'SIGNUP',
      created_at: p.created_at,
      date: p.created_at, 
      home_lc: p.home_lc?.name || "National",
      home_lc_id: p.home_lc?.id || null,
      home_mc: p.home_lc?.parent?.name || p.home_mc?.name,
      home_mc_id: p.home_lc?.parent?.id || p.home_mc?.id
    }));

    allData = [...allData, ...mapped];
    page++;
    if (data.length < perPage) break;
  }
  return { data: allData.slice(0, limit) };
}
