export const config = { runtime: 'edge' };
export default async function handler(req) {
  const data = { league:'NFL', updated:new Date().toISOString(), games:[{home:'Seahawks',away:'49ers',spread:-3,edge:'green'}] };
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
}
