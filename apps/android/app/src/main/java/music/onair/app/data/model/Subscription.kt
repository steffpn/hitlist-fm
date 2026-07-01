package music.onair.app.data.model

import kotlinx.serialization.Serializable

// GET /admin/subscriptions/me (any authenticated user; returns current user's plan/billing).
// Backend handler: apps/api/src/routes/v1/admin/subscriptions/handlers.ts -> mySubscription.

@Serializable
data class SubscriptionPlanInfo(
    val id: String = "",
    val name: String = "",
    val slug: String = "",
    val tier: String = "",
)

@Serializable
data class SubscriptionBillingInfo(
    val id: String = "",
    val status: String = "",
    val billingInterval: String = "",
    val trialEndsAt: String? = null,
    val currentPeriodEnd: String? = null,
    val cancelAtPeriodEnd: Boolean = false,
    val seatCount: Int = 0,
)

@Serializable
data class SubscriptionInfoResponse(
    val subscription: SubscriptionBillingInfo? = null,
    val plan: SubscriptionPlanInfo? = null,
    val features: List<String> = emptyList(),
)
