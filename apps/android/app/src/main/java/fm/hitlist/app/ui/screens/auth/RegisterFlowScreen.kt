package fm.hitlist.app.ui.screens.auth

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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import fm.hitlist.app.ui.components.GradientButton
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbError
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

@Composable
fun RegisterFlowScreen(
    vm: AuthViewModel,
    onBack: () -> Unit,
) {
    var step by remember { mutableStateOf(0) } // 0 = invite code, 1 = account details
    var code by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    BackHandler { if (step == 1) step = 0 else onBack() }

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
            onClick = { if (step == 1) step = 0 else onBack() },
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(8.dp),
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = RbTextSecondary)
        }

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            if (step == 0) {
                Text("Enter your invite code", style = MaterialTheme.typography.displayMedium, color = RbTextPrimary)
                Spacer(Modifier.height(6.dp))
                Text("Format: XXXX-XXXX-XXXX", style = MaterialTheme.typography.bodyMedium, color = RbTextSecondary)
                Spacer(Modifier.height(28.dp))
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase() },
                    label = { Text("Invite code") },
                    singleLine = true,
                    colors = fieldColors,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(24.dp))
                GradientButton(
                    text = "Continue",
                    onClick = { vm.clearError(); step = 1 },
                    enabled = code.trim().length == 14,
                )
            } else {
                Text("Create your account", style = MaterialTheme.typography.displayMedium, color = RbTextPrimary)
                Spacer(Modifier.height(20.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    colors = fieldColors,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    singleLine = true,
                    colors = fieldColors,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    colors = fieldColors,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth(),
                )
                vm.errorMessage?.let { msg ->
                    Spacer(Modifier.height(12.dp))
                    Text(msg, style = MaterialTheme.typography.bodySmall, color = RbError)
                }
                Spacer(Modifier.height(24.dp))
                GradientButton(
                    text = "Create account",
                    onClick = { vm.register(code.trim(), email, password, name) },
                    enabled = name.isNotBlank() && email.isNotBlank() && password.isNotBlank() && !vm.isSubmitting,
                    loading = vm.isSubmitting,
                )
            }
        }
    }
}
