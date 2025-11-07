export const config = { runtime: 'edge' };
export default async function handler() {
  const data = {
    league: 'UFC',
    updated: new Date().toISOString(),
    bouts: [{ event: 'UFC Vegas', red: 'Jones', blue: 'Miocic', edge: 'green' }]
  };
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}
