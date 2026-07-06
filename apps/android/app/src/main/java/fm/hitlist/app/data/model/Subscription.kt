package fm.hitlist.app.data.model

import kotlinx.serialization.Serializable

// GET /billing/me (any authenticated user; returns current user's plan/billing).
// Backend handler: apps/api/src/routes/v1/billing/handlers.ts -> mySubscription.

@Serializable
data class SubscriptionPlanInfo(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val tier: String = "",
)

@Serializable
data class SubscriptionBillingInfo(
    val id: Int = 0,
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

// POST /billing/checkout — starts a Stripe Checkout session.
// 503 {error:"Billing not configured"} when Stripe keys are absent.
@Serializable
data class CreateCheckoutRequest(
    val planId: Int,
    val billingInterval: String, // "monthly" | "annual"
    val successUrl: String,
    val cancelUrl: String,
)

@Serializable
data class CheckoutResponse(
    val checkoutUrl: String? = null,
)
