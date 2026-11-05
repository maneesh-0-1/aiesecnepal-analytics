import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf-8');
const tokenMatch = env.match(/AIESEC_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1] : "";

async function inspect() {
    const query = `
    query {
      allOpportunityApplication(
        page: 1,
        per_page: 50
      ) {
        data {
          id
          person { home_mc { id name } }
          opportunity { home_mc { id name } }
        }
      }
    }`;
    const res = await fetch("https://gis-api.aiesec.org/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    const apps = data.data?.allOpportunityApplication?.data || [];
    
    console.log(`Fetched ${apps.length} apps.`);
    const mcStats = {};
    apps.forEach(app => {
        const pMc = app.person?.home_mc?.name || "Unknown";
        const oMc = app.opportunity?.home_mc?.name || "Unknown";
        const key = `${pMc} -> ${oMc}`;
        mcStats[key] = (mcStats[key] || 0) + 1;
    });
    console.log("MC Stats (Person MC -> Opp MC):");
    console.log(JSON.stringify(mcStats, null, 2));
}
inspect();
