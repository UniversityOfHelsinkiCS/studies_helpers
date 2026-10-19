const express = require("express");
const app = express();

const { getSeasonSummary } = require('./scrape')

const CURRENT_SEASON = "2026-27"
const CURRENT_SEASON_ID = "20262027"
const UPDATE_HOUR = 8 // Helsinki time

function dups(players) {
  const seen = new Set();
  return players.filter(player => {
    if (seen.has(player.id)) {
      return false;
    }
    seen.add(player.id);
    return true;
  });
}


function shuffled(array) {
  for (var i = array.length - 1; i >= 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return dups(array);
}

const stats = {
  "2018-19": shuffled([...require("./data-20182019.json")]),
  "2019-20": shuffled([...require("./data-20192020.json")]),
  "2020-21": shuffled([...require("./data-20202021.json")]),
  "2021-22": shuffled([...require("./data-20212022.json")]),
  "2022-23": shuffled([...require("./data-20222023.json")]),
  "2023-24": shuffled([...require("./data-20232024.json")]),
  "2024-25": shuffled([...require("./data-20242025.json")]),
  "2025-26": shuffled([...require("./data-20252026.json")]),
  "2026-27": shuffled([...require("./data-20262027.json")]),
};

// the stats API gives official names (e.g. "Anthony-John (AJ) Greer"), prefer the ones already in the bundled file
const knownNames = new Map(stats[CURRENT_SEASON].map(p => [p.id, p.name]))

const helsinkiDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(new Date())
const helsinkiHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", hour: "numeric", hourCycle: "h23" }).format(new Date()))

let lastUpdated = null
let updating = false

const updateCurrentSeason = async () => {
  if (updating) return
  updating = true
  try {
    const players = await getSeasonSummary(CURRENT_SEASON_ID)
    if (players.length > 0) {
      stats[CURRENT_SEASON] = shuffled(players.map(p => ({ ...p, name: knownNames.get(p.id) || p.name })))
      lastUpdated = helsinkiDate()
      console.log(`updated ${CURRENT_SEASON}: ${players.length} players`)
    }
  } catch (error) {
    console.log(`updating ${CURRENT_SEASON} failed, keeping old data:`, error.message)
  } finally {
    updating = false
  }
}

// check every 10 minutes, update once a day after UPDATE_HOUR
setInterval(() => {
  if (lastUpdated !== helsinkiDate() && helsinkiHour() >= UPDATE_HOUR) {
    updateCurrentSeason()
  }
}, 10 * 60 * 1000)

app.get("/:year/players.txt", (req, res) => {
  const players = stats[req.params.year];

  if (!players) {
    return res.status(400).json({
      error: "following years only available " + Object.keys(stats).join(", "),
    });
  }

  const strings = players.map((p) => {
    return `${p.name};${p.team};;${p.goals};${p.assists}`;
  });

  res.send(strings.join("\n"));
});

app.get("/", (req, res) => {
  const resp = `
  <div>
    <div>usage https://studies.cs.helsinki.fi/:season/players.txt</div>
    <div>following seasons available  ${Object.keys(stats).join(", ")}</div>
  </div>
  `
  res.send(resp);
});

app.get("/:year/players", (req, res) => {
  const players = stats[req.params.year];
  if (!players) {
    return res.status(400).json({
      error: "only following seasons available " + Object.keys(stats).join(", "),
    });
  }

  res.json(players);
});

app.get("/update", async (req, res) => {
  await updateCurrentSeason()
  res.send(`<div>updated the current year</div>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

updateCurrentSeason()