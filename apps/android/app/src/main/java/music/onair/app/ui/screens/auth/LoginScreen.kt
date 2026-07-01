package music.onair.app.ui.screens.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import music.onair.app.ui.components.GradientButton
import music.onair.app.ui.theme.RbAccent
import music.onair.app.ui.theme.RbBackground
import music.onair.app.ui.theme.RbError
import music.onair.app.ui.theme.RbSuccess
import music.onair.app.ui.theme.RbSurface
import music.onair.app.ui.theme.RbSurfaceLight
import music.onair.app.ui.theme.RbTextPrimary
import music.onair.app.ui.theme.RbTextSecondary
import music.onair.app.ui.theme.RbTextTertiary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    vm: AuthViewModel,
    onBack: () -> Unit,
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showForgotSheet by rememberSaveable { mutableStateOf(false) }

    BackHandler { onBack() }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RbAccent,
        unfocusedBorderColor = RbSurfaceLight,
        focusedLabelColor = RbAccent,
        unfocusedLabelColor = RbTextTertiary,
        cursorColor = RbAccent,
        focusedTextColor = RbTextPrimary,
        unfocusedTextColor = RbTextPrimary,
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground),
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(8.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = RbTextSecondary,
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "Welcome back",
                style = MaterialTheme.typography.displayMedium,
                color = RbTextPrimary,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Log in to your onair.music account.",
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextSecondary,
            )

            Spacer(Modifier.height(28.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                colors = fieldColors,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                colors = fieldColors,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            vm.errorMessage?.let { msg ->
                Spacer(Modifier.height(12.dp))
                Text(
                    text = msg,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbError,
                )
            }

            Spacer(Modifier.height(24.dp))

            GradientButton(
                text = "Log in",
                onClick = { vm.login(email, password) },
                enabled = email.isNotBlank() && password.isNotBlank() && !vm.isSubmitting,
                loading = vm.isSubmitting,
            )

            Spacer(Modifier.height(10.dp))

            TextButton(
                onClick = {
                    vm.clearResetMessage()
                    showForgotSheet = true
                },
                modifier = Modifier.align(Alignment.CenterHorizontally),
            ) {
                Text(
                    text = "Forgot password?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = RbTextSecondary,
                )
            }
        }
    }

    if (showForgotSheet) {
        ForgotPasswordSheet(
            vm = vm,
            initialEmail = email,
            onDismiss = {
                showForgotSheet = false
                vm.clearResetMessage()
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForgotPasswordSheet(
    vm: AuthViewModel,
    initialEmail: String,
    onDismiss: () -> Unit,
) {
    var resetEmail by rememberSaveable { mutableStateOf(initialEmail) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = RbSurface,
    ) {
        Column(modifier = Modifier.padding(horizontal = 24.dp)) {
            Text(
                text = "Reset your password",
                style = MaterialTheme.typography.titleLarge,
                color = RbTextPrimary,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Enter your account email and we'll send you a reset link.",
                style = MaterialTheme.typography.bodyMedium,
                color = RbTextSecondary,
            )

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = resetEmail,
                onValueChange = { resetEmail = it },
                label = { Text("Email") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = RbAccent,
                    unfocusedBorderColor = RbSurfaceLight,
                    focusedLabelColor = RbAccent,
                    unfocusedLabelColor = RbTextTertiary,
                    cursorColor = RbAccent,
                    focusedTextColor = RbTextPrimary,
                    unfocusedTextColor = RbTextPrimary,
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            vm.resetMessage?.let { msg ->
                Spacer(Modifier.height(12.dp))
                Text(
                    text = msg,
                    style = MaterialTheme.typography.bodySmall,
                    color = RbSuccess,
                )
            }

            Spacer(Modifier.height(18.dp))

            GradientButton(
                text = "Send reset link",
                onClick = { vm.forgotPassword(resetEmail) },
                enabled = resetEmail.isNotBlank() && !vm.isSendingReset,
                loading = vm.isSendingReset,
            )

            Spacer(Modifier.height(32.dp))
        }
    }
}
