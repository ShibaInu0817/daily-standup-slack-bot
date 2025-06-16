# Slack Standup Bot

A Next.js application that helps teams conduct daily standups through Slack.

## API Documentation

The API documentation is available through Swagger UI at `/api/docs`. This provides interactive documentation for all HTTP endpoints in the application.

### Viewing the Documentation

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000/api/docs
```

The Swagger UI will show all available endpoints, their request/response schemas, and allow you to test them directly from the browser.

## External URLs and Endpoints

### API Endpoints

#### Health Check
- `GET /api/healthcheck`
  - Checks the health of the application
  - Runs timeout checks for active standups
  - Returns "OK" with 200 status if healthy

#### Slack Integration
- `POST /api/slack/events`
  - Handles Slack event subscriptions
  - Processes direct messages for standup responses
  - Verifies Slack request signatures
  - URL Verification endpoint for Slack

- `GET /api/slack/auth`
  - OAuth callback endpoint for Slack app installation
  - Handles the OAuth flow when adding the bot to a workspace
  - Returns HTML success/error page

- `POST /api/slack/command`
  - Handles Slack slash commands
  - Provides channel selection and configuration options
  - Used for setting up standup schedules

- `POST /api/slack/interact`
  - Handles Slack interactive components
  - Processes modal submissions for configuration
  - Manages button clicks and other interactions

#### tRPC API
- `POST /api/trpc/[trpc]`
  - Main tRPC endpoint for all API calls
  - Handles all tRPC procedures
  - Used by both client and server components

### External Service URLs

#### Slack API
- OAuth URL: `https://slack.com/oauth/v2/authorize`
- API Base URL: `https://slack.com/api`

### Environment Variables

Required environment variables:
```env
# Slack Configuration
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_CLIENT_ID="your-client-id"
SLACK_CLIENT_SECRET="your-client-secret"
SLACK_SIGNING_SECRET="your-signing-secret"

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Development URLs

- Local Development: `http://localhost:3000`
- Health Check: `http://localhost:3000/api/healthcheck`
- tRPC Playground: `http://localhost:3000/api/trpc`

### Production Considerations

1. Update `NEXT_PUBLIC_BASE_URL` to your production domain
2. Set up proper SSL/TLS certificates
3. Configure proper CORS settings
4. Set up proper environment variables in production
5. Configure proper logging and monitoring

### Security Notes

1. All Slack endpoints verify request signatures
2. OAuth flow is properly secured
3. Environment variables are validated at runtime
4. API endpoints are protected by proper authentication
5. Request timeouts are implemented

### Rate Limiting

- Slack API has rate limits that are respected
- Health check endpoint runs timeout checks every 5 minutes
- Standup sessions have configurable timeout durations

### Monitoring

- Health check endpoint for basic monitoring
- Console logging for important events
- Error handling and reporting
- Standup session timeout monitoring

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
