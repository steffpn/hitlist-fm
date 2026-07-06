package music.onair.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import music.onair.app.ui.theme.OnairTheme
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbGradientEnd
import music.onair.app.ui.theme.RbGradientStart
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.components.HitlistMark
import music.onair.app.ui.components.HitlistWordmark

/**
 * First-launch welcome screen. Mirrors the iOS Welcome screen: brand mark,
 * tagline, and login / invite entry points on the flat warm-black base
 * (no radial glow — tokens rule).
 */
@Composable
fun WelcomeScreen(
    onLogin: () -> Unit = {},
    onEnterInvite: () -> Unit = {},
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            HitlistMark(size = 96.dp)
            Spacer(Modifier.height(24.dp))
            HitlistWordmark(style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Know exactly where your music plays.",
                style = MaterialTheme.typography.bodyLarge,
                color = RbTextSecondary,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(48.dp))

            Button(
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(27.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(RbGradientStart, RbGradientEnd),
                                start = Offset(0f, 0f),
                                end = Offset(1000f, 200f),
                            ),
                            shape = RoundedCornerShape(27.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "Log in",
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                    )
                }
            }

            Spacer(Modifier.height(14.dp))

            OutlinedButton(
                onClick = onEnterInvite,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(27.dp),
            ) {
                Text(
                    text = "I have an invite code",
                    style = MaterialTheme.typography.labelLarge,
                    color = RbTextPrimary,
                )
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B0A0A)
@Composable
private fun WelcomeScreenPreview() {
    OnairTheme { WelcomeScreen() }
}
