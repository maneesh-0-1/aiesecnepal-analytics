
const query = '{ __type(name: "OpportunityApplication") { fields { name } } }';
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
        if (j.errors) console.error(j.errors);
        console.log(j.data.__type.fields.map(f => f.name).sort().join('\n'));
    })
    .catch(console.error);
