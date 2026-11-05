
const query = '{ __type(name: "OpportunityApplicationFilter") { inputFields { name type { name kind ofType { name kind } } } } }';
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
        console.log(JSON.stringify(j.data.__type.inputFields, null, 2));
    })
    .catch(console.error);
