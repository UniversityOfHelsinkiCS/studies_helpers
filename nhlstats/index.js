const express = require("express");
const app = express();

const getSeason = require('./scrape')
let currentPlayers = null

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
};

app.get("/:year/players.txt", (req, res) => {
  const season = req.params.year
  //const players = season === "20252026" && currentPlayers ? currentPlayers : stats[req.params.year];
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
  console.log("warmup")
  currentPlayers = await getSeason.getSeason("20252026")
  console.log("warmed!")

  const resp = `<div>updated the current year</div>`
  res.send(resp);
});

const setup = async () => {
  console.log("warmup")
  currentPlayers = await getSeason.getSeason("20252026")
  console.log("warmed!")
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//setup()