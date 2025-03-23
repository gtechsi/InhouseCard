# InHouse Card - Mercado Pago Webhook API

This API handles webhook notifications from Mercado Pago for payment processing in the InHouse Card application.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure the environment variables:
   ```bash
   cp .env.example .env
   ```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `MP_ACCESS_TOKEN`: Mercado Pago access token
- `MP_WEBHOOK_SECRET`: Webhook signature secret
- `LOG_LEVEL`: Winston logger level
- `LOG_FILE`: Log file path

## Running the Server

Development mode:
```bash
npm run server:dev
```

Production mode:
```bash
npm run server
```

## Testing Webhooks Locally

1. Install and use [ngrok](https://ngrok.com/) to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Configure the webhook URL in your Mercado Pago dashboard using the ngrok URL.

3. Use Postman to test the webhook endpoint:
   - URL: `POST http://localhost:3000/webhook`
   - Headers:
     ```
     Content-Type: application/json
     X-Signature: your_signature_here
     ```
   - Body:
     ```json
     {
       "action": "payment.created",
       "data": {
         "id": "123456789"
       }
     }
     ```

## Webhook Payload Structure

Example of a payment notification:

```json
{
  "action": "payment.created",
  "api_version": "v1",
  "data": {
    "id": "123456789"
  },
  "date_created": "2025-03-15T19:20:30.000-04:00",
  "live_mode": true,
  "type": "payment"
}
```

## Error Handling

The API handles various error scenarios:

- Invalid webhook payload (400 Bad Request)
- Invalid signature (401 Unauthorized)
- Server errors (500 Internal Server Error)

All errors are logged to both console and file for debugging.

## Logging

Logs are written to:
- Console (all environments)
- File (configured in .env)

Log levels:
- error: Error events
- warn: Warning events
- info: Informational messages
- debug: Debug information (development only)