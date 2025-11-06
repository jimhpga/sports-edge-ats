export default async function handler(req, res) {
  try {
    // TODO: Replace with your real updater call.
    // For now, return static sample so UI always renders.
    const now = new Date().toISOString();

    const sample = {
      updatedAt: now,
      nfl: [
        {
          commence_time: "2024-09-08T17:00:00Z",
          away_team: "Ravens",
          home_team: "Dolphins",
          picks: {
            ats: { pick: "MIA -7.5", edge_pts: 1.3 },
            ml:  { pick: "MIA",      value: "+340" },
            ou:  { pick: "Under 49.5", edge_pts: 1.1 }
          }
        },
        {
          commence_time: "2024-09-08T20:25:00Z",
          away_team: "Broncos",
          home_team: "Texans",
          picks: {
            ats: { pick: "—", edge_pts: 0.6 },
            ml:  { pick: "HOU", value: "+105" },
            ou:  { pick: "Over 39.5", edge_pts: 1.0 }
          }
        },
        {
          commence_time: "2024-09-09T00:20:00Z",
          away_team: "Patriots",
          home_team: "Bengals",
          picks: {
            ats: { pick: "NE +3.5", edge_pts: 1.2 },
            ml:  { pick: "NE", value: "+155" },
            ou:  { pick: "Under 44.5", edge_pts: 0.9 }
          }
        }
      ],
      ufc: [
        {
          home_team: "Fighter A", away_team: "Fighter B",
          picks: { ml: { pick: "Fighter A", value: "-120" } }
        },
        {
          home_team: "Fighter C", away_team: "Fighter D",
          picks: { ml: { pick: "Fighter D", value: "+140" } }
        }
      ]
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(sample);
  } catch (err) {
    res.status(200).json({ updatedAt: new Date().toISOString(), nfl: [], ufc: [], error: String(err) });
  }
}