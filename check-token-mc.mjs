import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf-8');
const tokenMatch = env.match(/AIESEC_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1] : "";

async function checkToken() {
    const query = `
    query {
      current_user {
        id
        full_name
        home_mc {
          id
          name
        }
        role {
          name
        }
      }
    }`;
    try {
        const res = await fetch("https://gis-api.aiesec.org/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        console.log("Token User Info:", JSON.stringify(data.data?.current_user || data.errors || data, null, 2));
        
        if (data.data?.current_user) {
            const mcId = data.data.current_user.home_mc?.id;
            console.log(`Token belongs to MC ID: ${mcId}`);
            
            // Try to fetch another MC's name to see if it has broad read access
            const mcQuery = `
            query {
              office(id: 1606) {
                name
              }
            }`;
            const res2 = await fetch("https://gis-api.aiesec.org/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ query: mcQuery })
            });
            const data2 = await res2.json();
            console.log("Attempting to fetch Brazil MC info (ID 1606):", JSON.stringify(data2.data?.office || data2.errors, null, 2));
        }
    } catch (e) {
        console.error("Error checking token:", e);
    }
}
checkToken();
