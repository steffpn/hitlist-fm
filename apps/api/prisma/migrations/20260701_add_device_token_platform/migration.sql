-- Add platform column to route push notifications (iOS→APNs, Android→FCM).
-- Existing rows default to 'ios' (all current tokens are APNs).
ALTER TABLE "device_tokens" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'ios';
