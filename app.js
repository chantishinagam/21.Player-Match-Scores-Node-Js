const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Get all players list from player table API1

const convertPlayersListDBObject = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersDetailsQuery = `SELECT * FROM player_details;`;
  const getPlayersDetailsQueryResponse = await db.all(getPlayersDetailsQuery);
  response.send(
    getPlayersDetailsQueryResponse.map((eachItem) =>
      convertPlayersListDBObject(eachItem)
    )
  );
});

//GET a player details based on the player ID API2

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerByIDQuery = `
    SELECT * 
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerByIDResponse = await db.get(getPlayerByIDQuery);
  response.send(convertPlayersListDBObject(getPlayerByIDResponse));
});

//Update a player details based on the player ID API3
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;

  const updatePlayerNameQuery = `
    UPDATE player_details
        SET player_name='${playerName}'
    WHERE player_id=${playerId}`;
  await db.run(updatePlayerNameQuery);
  response.send("Player Details Updated");
});

//Get a match details based on matchId API4

const convertMatchDetailsObject = (objectItem) => {
  return {
    matchId: objectItem.match_id,
    match: objectItem.match,
    year: objectItem.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = ` 
    SELECT * 
        FROM match_details
    WHERE match_id=${matchId}`;
  const getMatchDetailsResponse = await db.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsObject(getMatchDetailsResponse));
});

//GET list of all the matches of a player API5

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `
    SELECT *
        FROM player_match_score
    WHERE 
        player_id=${playerId};`;

  const getMatchesOfPlayerDBResponse = await db.all(getMatchesOfPlayerDBQuery);
  const matchesIdArray = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArray});`;

  const getMatchDetailsResponse = await db.all(getMatchDetailsQuery);
  response.send(
    getMatchDetailsResponse.map((eachMatch) =>
      convertMatchDetailsObject(eachMatch)
    )
  );
});

//Get a list of players of a specific match API6

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfAMatchQuery = `
  SELECT * FROM player_match_score 
  NATURAL JOIN player_details 
  WHERE match_id = ${matchId};`;

  const getPlayersOfAMatchQueryResponse = await db.all(getPlayersOfAMatchQuery);
  response.send(
    getPlayersOfAMatchQueryResponse.map((eachItem) =>
      convertPlayersListDBObject(eachItem)
    )
  );
});

//GET Returns the statistics of the total score, fours, sixes
//  of a specific player based on the player ID API7
const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await db.get(getPlayerStatisticsQuery);
  response.send(
    playerStatsObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});

module.exports = app;
