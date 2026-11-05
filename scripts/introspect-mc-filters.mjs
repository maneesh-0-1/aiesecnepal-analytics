import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const query = `
  query {
    __type(name: "OpportunityApplicationFilter") {
      inputFields {
        name
      }
    }
  }
`;

async function introspect() {
  const res = await fetch('https://gis-api.aiesec.org/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.AIESEC_ACCESS_TOKEN
    },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  console.log(json.data.__type.inputFields.map(f => f.name).filter(n => n.includes('mc') || n.includes('committee')));
}

introspect().catch(console.error);
