const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost/3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const getStateObj = (responseObj) => {
  return {
    stateId: responseObj.state_id,
    stateName: responseObj.state_name,
    population: responseObj.population,
  };
};

const getDistrictObject = (responseObj) => {
  return {
    districtId: responseObj.district_id,
    districtName: responseObj.district_name,
    stateId: responseObj.state_id,
    cases: responseObj.cases,
    cured: responseObj.cured,
    active: responseObj.active,
    deaths: responseObj.deaths,
  };
};

const getStateName = (dbObject) => {
  return {
    stateName: dbObject.state_name,
  };
};

//1.GET STATES

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM state ORDER BY state_id;`;
  const dbResponse = await db.all(getStatesQuery);
  response.send(dbResponse.map((stateObj) => getStateObj(stateObj)));
});

//2.GET SPECIFIED STATE

app.get("/states/:stateId/", async (request, response) => {
  const stateDetails = request.body;
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};`;
  const dbResponse = await db.get(getStateQuery);
  response.send(getStateObj(dbResponse));
});

//3.CREATE A DISTRICT

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const newCaseQuery = `
  INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const dbResponse = await db.run(newCaseQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//4.RETURN A DISTRICT

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`;
  let dbResponse = await db.get(getDistrictQuery);
  response.send(getDistrictObject(dbResponse));
});

//5.DELETE A DISTRICT

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id =${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//6.UPDATE A DISTRICT

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateQuery = `
    UPDATE district SET district_name = '${districtName}',state_id = ${stateId},
    cases = ${cases}, cured = ${cured}, active = ${active}, deaths = ${deaths};
    `;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

//7.STATISTICS OF TOTAL CASES

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statisticsQuery = `
    SELECT sum(cases) as totalCases, sum(cured) as totalCured, 
    sum(active) as totalActive, sum(deaths) as totalDeaths FROM district WHERE state_id = ${stateId};`;
  let dbResponse = await db.get(statisticsQuery);
  response.send(dbResponse);
});

//8.GET STATE NAME

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
    SELECT state.state_name FROM state INNER JOIN district 
    ON state.state_id = district.state_id WHERE district.district_id = ${districtId};`;
  let dbResponse = await db.get(getStateQuery);
  response.send(getStateName(dbResponse));
});

module.exports = app;
