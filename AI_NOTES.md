# AI Notes

Tools used: VS Code workspace tools, file inspection, patch-based edits, and terminal validation.

Decisions I made:

1. I used JWT sessions instead of Auth.js database sessions so the app can store GitHub OAuth data in Prisma without adding the full Auth.js adapter schema.
2. I kept webhook processing on the server and used a database `deliveryId` uniqueness constraint so duplicate GitHub deliveries are handled safely at the persistence layer.
3. I added a retry sweep route that only retries failed action logs with exponential backoff, because downstream APIs are more likely to fail transiently than the webhook verification path.

Hardest bug I had to avoid: firing webhook processing before verifying the HMAC signature would have made forged requests dangerous. I caught that by keeping the signature check in the webhook route before the event insert.

What I would add with more time: configurable rule editing, richer event filtering, and a safer background execution mechanism for webhook follow-up work.
