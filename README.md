## Build your own - Developer setup

### Create a Slack app

1. Create a *workspace app* at [https://api.slack.com/apps?new_app_token=1](https://api.slack.com/apps?new_app_token=1)
2. Add a Slash command (See *Add a Slash Command* section below)
3. Navigate to the **OAuth & Permissions** page, scroll down to **Scopes** section, and make sure the `commands` scope is added.
4. Go to **Install Apps** and intall the app to the selected workspace. (You should get an OAuth access token after the installation)
5. In the mean time, go to **Basic Information** to set up your app info and get your credentials. (You will need the credentials to run the app. See the *Run the app locally* below.)

#### Add a Slash Command
1. Go back to the app settings and click on Slash Commands.
2. Click the 'Create New Command' button and fill in the following:
    * Command: `/weather`
    * Request URL: Your ngrok + /slash
    * Short description
    * Usage hint: `e.g. /weather zip:90210 or /weather city:Los Angeles`
3. Save

#### Add a bot user
1. Go back to the app settings and click on Bot Users.
    * Add display name and default username
    * Save Changes
2. Go back to the app settings and click on Event Subscriptions.
    * Request URL: Your ngrok + /bot
    * Scroll down to Subscribe to Bot Events
    * Click 'Add Bot User Event' button and add 'app.mention' & 'message.channels'
    * Save Changes

### Run the app locally 
1. Get the code
    * run `npm install`
2. Set the following environment variables to `.env` (see `.env.sample`):

    * `SLACK_SIGNING_SECRET`: Your app's Signing Secret (available on the **Basic Information** page)
    * `SLACK_CLIENT_ID`: You need this only when you distribute your app. (available on the **Basic Information** page)
    * `SLACK_CLIENT_SECRET`: You need this only when you distribute your app. (available on the **Basic Information** page)
    * `SLACK_BOT_TOKEN`: You need this if you will be using @weatherbot instead of the Slash Command. (available on the **Basic Information** page)
3. If you're running the app locally, run the app (`npm start`)
4. Download and run the app using ngrok to generate a request URL


