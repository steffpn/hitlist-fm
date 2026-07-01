package music.onair.app.ui.screens.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import music.onair.app.data.model.CreateCheckoutRequest
import music.onair.app.data.model.SubscriptionInfoResponse
import music.onair.app.data.remote.OnairApi
import retrofit2.HttpException

class SubscriptionViewModel(private val api: OnairApi) : ViewModel() {
    var data by mutableStateOf<SubscriptionInfoResponse?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // ── Checkout state ──
    var isCheckingOut by mutableStateOf(false)
        private set

    /** Stripe Checkout URL to open in a Custom Tab; consumed by the screen. */
    var checkoutUrl by mutableStateOf<String?>(null)
        private set

    /** One-shot message for the snackbar (503 "Billing not configured", etc). */
    var checkoutMessage by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun refresh() = load()

    fun consumeCheckoutUrl() {
        checkoutUrl = null
    }

    fun consumeCheckoutMessage() {
        checkoutMessage = null
    }

    /**
     * POST /billing/checkout for the current role's premium plan.
     * Plan ids follow seed-plans.ts ordering (artist-premium=2, label-premium=4,
     * station-premium=6); the server validates plan.role against the user anyway.
     */
    fun upgrade(role: String) {
        if (isCheckingOut) return
        val planId = when (role.uppercase()) {
            "ARTIST" -> 2
            "LABEL" -> 4
            "STATION" -> 6
            else -> {
                checkoutMessage = "No paid plan is available for your account."
                return
            }
        }
        viewModelScope.launch {
            isCheckingOut = true
            checkoutMessage = null
            try {
                val res = api.createCheckout(
                    CreateCheckoutRequest(
                        planId = planId,
                        billingInterval = "monthly",
                        successUrl = "https://onair.music/billing/success",
                        cancelUrl = "https://onair.music/billing/cancel",
                    ),
                )
                val url = res.checkoutUrl
                if (url.isNullOrBlank()) {
                    checkoutMessage = "Payments aren't enabled yet."
                } else {
                    checkoutUrl = url
                }
            } catch (e: Exception) {
                checkoutMessage = when {
                    e is HttpException && e.code() == 503 -> "Payments aren't enabled yet."
                    e is HttpException && e.code() == 400 -> "This plan isn't available for your account yet."
                    e is HttpException && e.code() == 404 -> "Payments aren't enabled yet."
                    else -> e.message ?: "Couldn't start checkout. Try again."
                }
            } finally {
                isCheckingOut = false
            }
        }
    }

    private fun load() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                data = api.getSubscription()
            } catch (e: Exception) {
                error = e.message ?: "Failed to load subscription"
            } finally {
                isLoading = false
            }
        }
    }
}
