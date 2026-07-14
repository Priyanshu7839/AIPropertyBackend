import fs from "fs";
import jwt from "jsonwebtoken";

const TEAM_ID = "638CC8JN26";
const KEY_ID = "K9SAPQQSKG";
const CLIENT_ID = "com.aipropertyreport.app.service"; // e.g. com.company.app.web

const privateKey = fs.readFileSync("./AuthKey_K9SAPQQSKG.p8");

const token = jwt.sign(
  {},
  privateKey,
  {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: TEAM_ID,
    audience: "https://appleid.apple.com",
    subject: CLIENT_ID,
    header: {
      alg: "ES256",
      kid: KEY_ID,
    },
  }
);

console.log(token);