export const config = { runtime: 'edge' };
export default async function handler(req) {
  const data = { league:'NBA', updated:new Date().toISOString(), games:[{home:'Lakers',away:'Celtics',spread:-2,edge:'yellow'}] };
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
}
