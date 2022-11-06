const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let db = null;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("The server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();

const middlewareFunction = (request, response, next) => {
  const autheader = request.headers["authorization"];
  if (autheader !== undefined) {
    let jwtToken = autheader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "asdfghjkl", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

app.get("/states/", middlewareFunction, async (request, response) => {
  const getStatesQuary = `SELECT state_id AS stateId,state_name AS stateName, population FROM state`;
  const dbResponse = await db.all(getStatesQuary);
  response.send(dbResponse);
});

app.get("/states/:stateId/", middlewareFunction, async (request, response) => {
  const { stateId } = request.params;
  const getStateDetailsQuary = `SELECT state_id AS stateId,state_name AS stateName, population FROM state WHERE state_id=${stateId}`;
  const dbResponse = await db.get(getStateDetailsQuary);
  response.send(dbResponse);
});

app.post("/districts/", middlewareFunction, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictDetails = `
    INSERT INTO district 
    (district_name, state_id, cases, cured, active, deaths) 
    VALUES 
    (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    )
    `;
  await db.run(postDistrictDetails);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
    const { districtId } = request.params;
    const getdistrictDetailsQuary = `SELECT district_id AS districtId,district_name AS districtName, state_id AS stateId, 
    cases, cured, active, deaths FROM district WHERE district_id=${districtId}`;
    const dbResponse = await db.get(getdistrictDetailsQuary);
    response.send(dbResponse);
  }
);

app.delete(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
    const { districtId } = request.params;
    const deletedistrictDetailsQuary = `DELETE FROM district WHERE district_id=${districtId}`;
    await db.run(deletedistrictDetailsQuary);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
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
    const updateDistrictDetails = `
    UPDATE district 
    SET 
        district_name='${districtName}',
        state_id='${stateId}',
        cases='${cases}',
        cured='${cured}',
        active='${active}',
        deaths='${deaths}' 
        WHERE district_id=${districtId}`;
    await db.run(updateDistrictDetails);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  middlewareFunction,
  async (request, response) => {
    const { stateId } = request.params;
    const statsQuary = `
    SELECT SUM(cases) AS totalCases, 
    SUM(cured) AS totalCured, 
    SUM(active) AS totalActive, 
    SUM(deaths) AS totalDeaths FROM district WHERE state_id=${stateId} 
    GROUP BY state_id;
    `;
    const dbResponse = await db.get(statsQuary);
    response.send(dbResponse);
  }
);

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuary = `SELECT * FROM user WHERE username='${username}'`;
  const dbUser = await db.get(getUserQuary);
  console.log(dbUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "asdfghjkl");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
