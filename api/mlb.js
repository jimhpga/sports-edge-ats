export const config = { runtime: 'edge' };
export default async function handler() {
  const data = {
    league: 'MLB',
    updated: new Date().toISOString(),
    games: [{ home: 'Dodgers', away: 'Giants', moneyline: -145, edge: 'red' }]
  };
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}
