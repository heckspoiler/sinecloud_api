require("dotenv").config({ path: "./key.env" });
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET, POST",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

let dataCache = null;
let isFetching = false;

const fetchData = async () => {
  try {
    const profileURLs = [
      "kioskradio",
      "trnstnradio",
      "thelotradio",
      "nts-latest",
      "faultradio",
    ];

    const responses = await Promise.all(
      profileURLs.map((profile_url) =>
        fetch(
          `https://soundcloud4.p.rapidapi.com/user/info?profile_url=https%3A%2F%2Fsoundcloud.com%2F${encodeURIComponent(
            profile_url
          )}`,
          {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
              "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
            },
          }
        ).then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          console.log(response);
          return response.json();
        })
      )
    );

    const arr = responses.flatMap((data) =>
      data.tracks.map((track) => ({
        user: data.username,
        track,
      }))
    );

    // Shuffle the array

    shuffleArray(arr);

    // slice the data cache to 500 items

    dataCache = arr.slice(0, 500);

    console.log("Data cache:", dataCache.length);
  } catch (error) {
    console.error(error);
  } finally {
    isFetching = false;
  }
};

const fetchInterval = 60 * 60 * 500; // Fetch every 30 minutes

// Fetch data initially and start the interval
fetchData();
setInterval(() => {
  if (!isFetching) {
    fetchData();
  }
}, fetchInterval);

// shuffle array function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Get the data from the cache

app.get("/api/soundcloud", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 10;

  if (dataCache) {
    const paginatedData = dataCache.slice(offset, offset + limit);
    res.json({
      message: paginatedData,
    });
  } else {
    res.status(500).json({ error: "No data available" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
