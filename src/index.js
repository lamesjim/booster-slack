'use strict';
require('dotenv').config();

const signature = require('./verifySignature');
const axios = require('axios');
const qs = require('qs');
const express = require('express');
const bodyParser = require('body-parser');
const env = require('dotenv').config().parsed;

const apiUrl = 'https://slack.com/api';

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

// Static Web UI
app.get('/', (req, res) => {
  res.send('hello world');
});

/*
 * Sign-in 
 * This part is only needed for distributing your app.
 * Internal integrations do not require the user sign in. You just install it on your workspace! 
 */

app.get('/auth', (req, res) => {
  if (!req.query.code) { // access denied
    res.redirect('/?error=access_denied');
    return;
  }
  const authInfo = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: req.query.code
  };

  axios.post(`${apiUrl}/oauth.access`, qs.stringify(authInfo))
    .then((result) => {
      // The payload data has been modified since the last version!
      // See https://api.slack.com/methods/oauth.access

      console.log(result.data);

      const { access_token, refresh_token, expires_in, error } = result.data;

      if(error) {
        res.sendStatus(401);
        console.log(error);
        return;
      }

      // This link will open the workspace in Slack client, 
      // however, I am calling extra API for the tutorial to show you how to use Web API.
      // res.redirect(`slack://open?team=${team_id}`);

      // When you call Web APIs, you need to check if your access_token (xoxa-) is expired (60min) and if it is, get a fresh access token with your refresh_token (xoxr-).  
      // However, in this scenario, because you are calling this API immediately after the initial OAuth, access_token is not expired thus you can just use it.
      // See the additional code sample in the end of this file.
    
      axios.post(`${apiUrl}/team.info`, qs.stringify({token: access_token})).then((result) => {
        if(!result.data.error) {
          res.redirect(`http://${result.data.team.domain}.slack.com`);
        }
      }).catch((err) => { console.error(err); });

    }).catch((err) => {
      console.error(err);
    });

});


/* 
 * Slash Command
 * Endpoint to receive weatherbot command from Slack.
 */

app.post('/bot', (req, res) => {
  if(!signature.isVerified(req)) { // the request is NOT coming from Slack!
    res.sendStatus(404);
    return;
  }

  // res.sendStatus(200);
  let challenge = JSON.parse(req.rawBody).challenge;
  // res.send({challenge:challenge}) // verify bot URL

  let message = {};
  if (req.body.event.type === 'app_mention') {
    const channel = req.body.event.channel;
    const input = req.body.event.text.split('> ')[1].split(':');
    const type = input[0] === 'city' ? 'q' : 'zip';
    const loc = input[1];
    const query = `http://api.openweathermap.org/data/2.5/weather?${type}=${loc},us&APPID=8df448f87822a2ea04fd6f0dc4e1e7c9`;
    axios.get(query)
        .then((result)=>{
          const headers = {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`
          };

          let current = kelvinToFarenheit(result.data.main.temp),
              high = kelvinToFarenheit(result.data.main.temp_max),
              low = kelvinToFarenheit(result.data.main.temp_max);

          message = `${result.data.name} \n Current: ${current} \n Low: ${low} \n High: ${high}`;

          axios.post(`https://slack.com/api/chat.postMessage`, {text: message, channel:channel}, {headers:headers}).then((res)=>{
            console.log(res.data, '======RESULT======');
          }).catch((e)=>{console.log(e.message)});

        }).catch((e)=>{console.log(e.message)});

  } else {
    message = {
      response_type: 'ephemeral', // private message
      challenge: challenge,
      text: ':sunny: How to use weatherbot',
      attachments:[
        {
          text: 'Type the keyword followed by city or zipcode after the bot, _e.g._ `@weatherbot zip:90210 or @weatherbot city:Los Angeles`'
        }
      ]
    };
    res.json(message);
  }

});

/*
 * Slash Command
 * Endpoint to receive /weather command from Slack.
 */
app.post('/slash', (req, res) => {
  if(!signature.isVerified(req)) { // the request is NOT coming from Slack!
    res.sendStatus(404);
    return;
  }

  let message = {};
  if (req.body.text) {
    const input = req.body.text.split(':');
    const type = input[0] === 'city' ? 'q' : 'zip';
    const loc = input[1];
    const query = `http://api.openweathermap.org/data/2.5/weather?${type}=${loc},us&APPID=8df448f87822a2ea04fd6f0dc4e1e7c9`;
    axios.get(query)
        .then((result)=>{

          let current = kelvinToFarenheit(result.data.main.temp),
              high = kelvinToFarenheit(result.data.main.temp_max),
              low = kelvinToFarenheit(result.data.main.temp_max);

          message = {
              response_type: 'in_channel', // public to the channel
              attachments:[
                  {
                      pretext: `${result.data.name} \n Current: ${current} \n Low: ${low} \n High: ${high}`
                  }
              ]
          };

          res.json(message);
        }).catch((e)=>{console.log(e.message)});

  } else {
    message = {
      response_type: 'ephemeral', // private message
      text: ':sunny: How to use weatherbot',
      attachments:[
        {
          text: 'Type the keyword followed by city or zipcode after the command, _e.g._ `/weatherbot zip:90210 or /weatherbot city:Los Angeles`'
        }
      ]
    };
    res.json(message);
  }

});

const kelvinToFarenheit = (temp) => {
  return ((temp * 9 / 5) - 459.67).toFixed(2).toString() + ' ºF';
};

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


/* Additional notes:

Although, this sample app only uses Slash command after the initial authentication, 
if you want to call Slack Web APIs (such as chat.postMessage`) you need an access token to access the APIs, which expires in 60min.
Once your temporary token expires, you need to call `oauth.access` to get a new token.

I suggest to set your access_token and refresh_token somewhere with an expiry_time (e.g. in millisecond, (new Date()).getTime() + (1000 * 60 * 60))
then each time you need to call an API, check if the current_time > expiry_time.

*/

/* TOKEN ROTATION IMPLEMENTATION EXAMPLE
 * These code are not used in this particular app, but leave here for tutorial purpose
 * Call setAccessToken after the initial OAuth handshake when you receive the first access_token
 * refresh_token should be stored separately somewhere in DB
 * Call getAccessToken immediately before making an API call
 */

const setAccessToken = async (access_token, expires_in) => {
  const data = {
    token: access_token,
    expiry_time: Date().now() + (1000 * expires_in)
  }
  await db.setItem('access_token', data);
}
const getAccessToken = async () => {
  const tokenData = await db.getItem('access_token');
  if(tokenData.expiry_time < Date.now()) {
    return tokenData.token;
  } else {
    const result = await getNewAccessToken();
    return result.data.access_token;
  }
}
const getNewAccessToken = () => {
  const arg = { 
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token'
  };
  return axios.post(`${apiUrl}/oauth.access`, qs.stringify(arg));
};

