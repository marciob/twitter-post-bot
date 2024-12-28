require("dotenv").config(); // Load environment variables

const express = require("express");
const session = require("express-session");
const { TwitterApi } = require("twitter-api-v2");

const app = express();
const port = 3005;

// Use environment variables for sensitive information
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Step 1: Generate the authentication link
app.get("/auth", async (req, res) => {
  const client = new TwitterApi({
    appKey: consumerKey,
    appSecret: consumerSecret,
  });
  const authLink = await client.generateAuthLink(
    "http://localhost:3005/callback"
  );
  req.session.oauth_token = authLink.oauth_token;
  req.session.oauth_token_secret = authLink.oauth_token_secret;
  res.redirect(authLink.url);
});

// Step 2: Handle the callback and obtain access tokens
app.get("/callback", async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const { oauth_token_secret } = req.session;

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
    return res.status(400).send("You denied the app or your session expired!");
  }

  const client = new TwitterApi({
    appKey: consumerKey,
    appSecret: consumerSecret,
    accessToken: oauth_token,
    accessSecret: oauth_token_secret,
  });

  try {
    const {
      client: loggedClient,
      accessToken,
      accessSecret,
    } = await client.login(oauth_verifier);
    req.session.accessToken = accessToken;
    req.session.accessSecret = accessSecret;
    res.send("Authentication successful! You can now post tweets.");
  } catch (error) {
    console.error(error);
    res.status(403).send("Invalid verifier or access tokens!");
  }
});

// Step 3: Post a tweet
app.get("/tweet", async (req, res) => {
  const { accessToken, accessSecret } = req.session;

  if (!accessToken || !accessSecret) {
    return res.status(401).send("Not authenticated");
  }

  const client = new TwitterApi({
    appKey: consumerKey,
    appSecret: consumerSecret,
    accessToken,
    accessSecret,
  });

  try {
    const response = await client.v2.tweet("Hello, world!");
    res.send(`Tweet posted: ${response.data.text}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error posting tweet");
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
