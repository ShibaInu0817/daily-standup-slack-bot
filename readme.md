Setup ngrok

```
npx ngrok http 3000
```


## Add how to setup slack app
coming soon


# 🤖 Slack Standup Bot

This is a simple Slack bot that helps your team run asynchronous daily standups using slash commands and scheduled reminders.

---

## ✨ Features

* 🔀 Schedule recurring daily standups for team members
* 🧢 Ask 3 configurable questions via DM
* 📋 Post answers to a public/private channel as a thread
* 🛠️ Configure your standup schedule and channel using `/standup-config`

---

## 🚀 Live Demo (If Hosted)

> Your bot URL: `https://your-app-name.onrender.com/`

---

## 🧰 Prerequisites

* A [Slack Workspace](https://slack.com/)
* A free [Render](https://render.com/) account
* Node.js & npm installed (if running locally)

---

## 🧱 Folder Structure

```
project-root/
├── src/
│   ├── app.js              # Entry point
│   ├── slack/
│   │   ├── events.js       # Handles incoming Slack messages
│   │   ├── commands.js     # Slash command for configuration
│   │   ├── interact.js     # Modal submission handler
│   │   └── standup.js      # Standup logic (schedule + DM + post)
│   ├── utils/
│   │   └── configStore.js  # Read/write team config
├── .env
├── package.json
└── README.md
```

---

## 🛠️ Slack Bot Setup

1. **Go to Slack API**
   Visit: [https://api.slack.com/apps](https://api.slack.com/apps)

2. **Create a New App**

   * Click **Create New App**
   * Choose **From scratch**
   * App name: `Standup Bot`
   * Workspace: Select your workspace

3. **Add OAuth Scopes**

   Under **OAuth & Permissions → Bot Token Scopes**, add:

   ```text
   commands
   chat:write
   users:read
   im:write
   im:history
   channels:read
   groups:read
   mpim:read
   ```

4. **Install the App to Workspace**
   Go to **OAuth & Permissions** and click **Install App to Workspace**.
   You'll get a **Bot User OAuth Token** — save it!

5. **Enable Interactivity & Commands**

   * **Interactivity**:

     * Enable it
     * Request URL: `https://your-app-name.onrender.com/slack/interact`

   * **Slash Command**:

     * Command: `/standup-config`
     * Request URL: `https://your-app-name.onrender.com/slack/command`
     * Short description: `Configure your daily standup`

6. **Event Subscriptions**

   * Enable events
   * Request URL: `https://your-app-name.onrender.com/slack/events`
   * Subscribe to:

     ```
     message.im
     ```
7. **Allow users to send Slash commands and messages from the messages tab**
    * Go to "App Home" in your Slack app settings
    * Enable "Allow users to send Slash commands and messages from the messages tab"
    * Make sure "Always Show My Bot as Online" is toggled on


---

## 🔐 Environment Variables

Create a `.env` file:

```env
SLACK_BOT_TOKEN=your-bot-user-oauth-token
PORT=3000
```

---

## 📆 Install & Run

### Run Locally

```bash
npm install
npm start
```

---

## ☁️ Deploy to Render (Free Hosting)

1. Go to [https://render.com](https://render.com)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Set Environment:

   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Environment**:

     ```
     SLACK_BOT_TOKEN=your-token
     ```
5. Click **Create Web Service**

**After Deployment:**
Update your Slack app URLs:

* `/slack/command`
* `/slack/events`
* `/slack/interact`

To:
`https://your-app-name.onrender.com/...`

---

## 💭 Prevent Sleeping (Optional)

Render free tier sleeps after 15 minutes. Prevent this using [UptimeRobot](https://uptimerobot.com):

1. Add a new HTTP monitor
2. Ping `https://your-app-name.onrender.com/` every 5 minutes

---

## 🧪 Try It Out!

1. In Slack, type `/standup-config`
2. Set your standup time, days, and report channel
3. You'll get DM'd on schedule to answer standup questions
4. Answers will be posted in the configured channel 🎉

---

## 🧼 Troubleshooting

* **dispatch\_failed**: Your Render app might be asleep or URL is wrong.
* **missing\_scope**: You forgot to add required permissions.
* **timeout**: Slack expects a fast response. Always `res.send()` immediately.

---

## 📘 License

MIT — feel free to copy and improve!

## Fix for "Sending messages to this app has been turned off"

If you're seeing this error when trying to message the bot directly, you need to configure your Slack app with the correct event subscriptions and OAuth scopes:

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and select your app
2. Under "Features" in the sidebar, click on "Event Subscriptions"
3. Make sure it's enabled and add your Request URL (e.g., `https://your-domain.com/slack/events`)
4. Under "Subscribe to bot events", add these event subscriptions:
   - `message.im` (for direct messages to your bot)
   - `app_mention` (for mentions in channels)
5. Then go to "OAuth & Permissions" in the sidebar
6. Under "Scopes", add these Bot Token Scopes:
   - `chat:write` (to send messages)
   - `im:history` (to receive and process direct messages)
   - `im:read` (to access direct message channels)
7. Reinstall your app to apply the new permissions

This will allow users to send direct messages to your bot.

## Running the Bot

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Slack tokens
4. Run the bot: `npm start`

## Features

- Automatically schedules standups based on team timezone
- Collects responses via direct messages
- Posts compiled standups to a specified channel
- Configure schedule via Slack command
