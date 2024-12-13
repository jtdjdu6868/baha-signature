const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	const clock_images = require("./clock_image.js");
	const clientIP = req.headers["x-forwarded-for"].split(", ")[0];
	fetch(`http://ip-api.com/json/${clientIP}?fields=33611776`, {}).then((response) => {
		return response.json();
	}).then((jsonGeolocation) => {
		const time = new Date(new Date().toUTCString());
		time.setSeconds(time.getSeconds() + jsonGeolocation.offset);
		const responseText = `
<svg xmlns="http://www.w3.org/2000/svg" version="1.2" viewBox="0 0 660 125" xmlns:xlink="http://www.w3.org/1999/xlink" style="user-select: none; font-family: 'Roboto','Segoe UI','Arial','Microsoft Jhenghei','sans-serif'; font-size: 50px;">
	<image height="125" xlink:href="${clock_images[time.getHours() % 12]}"></image>
	<text fill="#776E66" text-anchor="middle" x="60%" y="50%" alignment-baseline="middle">
		好棒，${time.getHours()}點了！
	</text>
	<!-- 簽名 by 晴空和聲(jtdjdu6868) -->
</svg>
`;
		res.send(responseText);
	});
});

module.exports = router;
