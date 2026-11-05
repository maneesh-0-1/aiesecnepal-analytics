import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const query = `
  query {
    __type(name: "Query") {
      fields {
        name
        args {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
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
  const field = json.data.__type.fields.find(f => f.name === "people");
  const filterArg = field.args.find(a => a.name === "filters");
  console.log("People Filter Type Name:", filterArg.type.name || filterArg.type.ofType.name);
}

introspect().catch(console.error);
