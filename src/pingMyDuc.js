// ping the MyDuc API
export async function pingMyDuc(env) {
  console.log('pinging MyDuc API');
  const url = `https://nhakhoamyduc-api.onrender.com/api/clients?search=pingFromAwwBot`;
  const response = await fetch(url, {
    method: 'GET',
  });
  const data = await response.json();
  console.log(data);
}
