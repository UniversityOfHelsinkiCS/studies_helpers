const axios = require("axios");
const fs = require("fs");

const standings23 = require(`./standings23.json`).standings;
const standings24 = require(`./standings24.json`).standings;
const standings25 = require(`./standings25.json`).standings;

const n1 = standings23.map(t => ({ abr: t.teamAbbrev.default, name: t.teamCommonName.default }) )
const names = n1.concat(standings25.map(t => ({ abr: t.teamAbbrev.default, name: t.teamCommonName.default }) ))

const playerStats = async (player, season) => {
  const playerUrl = `https://api-web.nhle.com/v1/player/${player.playerId}/landing`
  const { data } = await axios.get(playerUrl)

  const seasonStats = data.seasonTotals.filter(t => t.season == season && t.leagueAbbrev == "NHL").reduce((acc, s) => {
    const index = acc.findIndex(a => a.teamCommonName.default == s.teamCommonName.default)
    return index === -1 ? acc.concat(s) : acc
  }, [])

  const gamesPlayed = seasonStats.reduce((acc, s) => acc + s.gamesPlayed, 0)
  const goals = seasonStats.reduce((acc, s) => acc + s.goals, 0)
  const assists = seasonStats.reduce((acc, s) => acc + s.assists, 0)
  const teams = seasonStats.map(s => {
    const foundTeam = names.find(n => n.name === s.teamCommonName.default)
    return foundTeam.abr
  })

  return {
    name: `${data.firstName.default} ${data.lastName.default}`,
    nationality: data.birthCountry, 
    assists, goals,
    team: teams.join(', '),
    games: gamesPlayed,
    id: player.playerId,
  }
  
}

const getPlayers = async (season) => {
  let start = 0;
  const players = [];
  while ( true ) {
    const limit = start + 100;
    const url = `https://api.nhle.com/stats/rest/en/skater/summary?limit=${limit}&start=${start}&sort=points&cayenneExp=seasonId=${season}`
    
    try {
      const { data } = await axios.get(url)

      if ( data.data.length === 0) {
        break;
      }

      players.push(...data.data);
      start += 100;
    } catch (error) {
      console.log(`API request failed, retrying in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Don't increment start, retry the same request
    }
  }

  return players
}

const getSeason = async (season) => {
  const stats = (await getPlayers(season))
  const players = await Promise.all(stats.map(player => playerStats(player, season)));
  return players
}

const do_the_acual_shit = async () => {
  const season = "20252026";
  const fileName = `./data-${season}.json`;
  const players = await getSeason(season)
  fs.writeFileSync(fileName, JSON.stringify(players));
}

//do_the_acual_shit();

module.exports = {
  getSeason
} 