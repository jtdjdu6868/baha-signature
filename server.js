const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 3000;

app.get("/", (req, res) => {
	res.send("Hello World");
});


const weather_sign_route = require("./weather_sign/handle.js");

app.use(["/sign/weather_sign.png", "/sign/weather_sign.svg"], weather_sign_route);

const ohboy3am_sign_route = require("./ohboy3am_sign/handle.js");

app.use(["/sign/ohboy3am_sign.png", "/sign/ohboy3am_sign.svg"], ohboy3am_sign_route);

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
