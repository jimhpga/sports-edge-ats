export const config = { runtime: 'edge' };
export default async function handler(req) {
  const data = { league:'MLB', updated:new Date().toISOString(), games:[{home:'Dodgers',away:'Giants',edge:'red'}] };
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
}
