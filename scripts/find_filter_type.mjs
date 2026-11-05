
const query = '{ __type(name: "Query") { fields { name args { name type { name kind ofType { name kind } } } } } }';
const token = 'EgWsdboHtPqrGm0XLt94ZO2TCRe8olg2oPgjKIV7KIs';

fetch('https://gis-api.aiesec.org/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': token
    },
    body: JSON.stringify({ query })
})
    .then(r => r.json())
    .then(j => {
        const field = j.data.__type.fields.find(f => f.name === "allOpportunityApplication");
        console.log(JSON.stringify(field.args.find(a => a.name === "filters"), null, 2));
    })
    .catch(console.error);
