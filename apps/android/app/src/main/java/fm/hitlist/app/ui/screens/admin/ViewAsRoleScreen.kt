package fm.hitlist.app.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import fm.hitlist.app.core.ServiceLocator
import fm.hitlist.app.data.model.ConfigureImpersonationRequest
import fm.hitlist.app.data.model.ImpersonationOptions
import fm.hitlist.app.ui.components.CenterError
import fm.hitlist.app.ui.components.CenterLoading
import fm.hitlist.app.ui.components.GlassCard
import fm.hitlist.app.ui.components.GradientButton
import fm.hitlist.app.ui.theme.RbAccent
import fm.hitlist.app.ui.theme.RbBackground
import fm.hitlist.app.ui.theme.RbSurfaceLight
import fm.hitlist.app.ui.theme.RbTextPrimary
import fm.hitlist.app.ui.theme.RbTextSecondary
import fm.hitlist.app.ui.theme.RbTextTertiary

private const val ROLE_ARTIST = "ARTIST"
private const val ROLE_STATION = "STATION"
private const val ROLE_LABEL = "LABEL"

@Composable
fun ViewAsRoleScreen(
    onConfigured: () -> Unit,
    onClose: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var options by remember { mutableStateOf<ImpersonationOptions?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var role by remember { mutableStateOf<String?>(null) }
    val selectedArtists = remember { mutableStateListOf<String>() }
    var busy by remember { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        try {
            options = ServiceLocator.api.getImpersonationOptions()
        } catch (e: Exception) {
            error = e.message ?: "Failed to load options"
        }
    }

    fun configure(req: ConfigureImpersonationRequest) {
        if (busy) return
        scope.launch {
            busy = true
            error = null
            try {
                val res = ServiceLocator.api.configureImpersonation(req)
                ServiceLocator.impersonation.start(res.userId, res.role, res.displayName)
                onConfigured()
            } catch (e: Exception) {
                error = e.message ?: "Failed to configure"
            } finally {
                busy = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RbBackground)
            .statusBarsPadding(),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { if (role != null) role = null else onClose() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = RbTextPrimary)
            }
            Text(
                text = "View as role",
                style = MaterialTheme.typography.titleLarge,
                color = RbTextPrimary,
            )
        }

        val opts = options
        when {
            opts == null && error == null -> CenterLoading()
            opts == null -> CenterError(message = error ?: "Error")
            role == null -> RolePicker(onPick = { role = it })
            role == ROLE_ARTIST -> EntityList(
                items = opts.artists.map { it.name to "${it.plays} plays" },
                busy = busy,
                onPick = { name -> configure(ConfigureImpersonationRequest(role = ROLE_ARTIST, artistName = name)) },
            )
            role == ROLE_STATION -> EntityList(
                items = opts.stations.map { it.name to "Station" },
                busy = busy,
                onPick = { name ->
                    val id = opts.stations.firstOrNull { it.name == name }?.id ?: return@EntityList
                    configure(ConfigureImpersonationRequest(role = ROLE_STATION, stationId = id))
                },
            )
            role == ROLE_LABEL -> LabelPicker(
                artists = opts.artists.map { it.name },
                selected = selectedArtists,
                busy = busy,
                onConfirm = {
                    if (selectedArtists.isNotEmpty()) {
                        configure(ConfigureImpersonationRequest(role = ROLE_LABEL, artistNames = selectedArtists.toList()))
                    }
                },
            )
        }

        error?.let {
            if (opts != null) {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(20.dp),
                )
            }
        }
    }
}

@Composable
private fun RolePicker(onPick: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Pick a role to preview", color = RbTextSecondary, style = MaterialTheme.typography.bodyMedium)
        RoleCard("Artist", "See an artist's dashboard & songs") { onPick(ROLE_ARTIST) }
        RoleCard("Station", "See a radio station's analytics") { onPick(ROLE_STATION) }
        RoleCard("Label", "See a label's roster & insights") { onPick(ROLE_LABEL) }
    }
}

@Composable
private fun RoleCard(title: String, subtitle: String, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = RbTextPrimary)
        Spacer(Modifier.height(2.dp))
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = RbTextTertiary)
    }
}

@Composable
private fun EntityList(
    items: List<Pair<String, String>>,
    busy: Boolean,
    onPick: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        items(items, key = { it.first }) { (name, sub) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(enabled = !busy) { onPick(name) }
                    .padding(vertical = 12.dp, horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(name, style = MaterialTheme.typography.bodyLarge, color = RbTextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(sub, style = MaterialTheme.typography.labelSmall, color = RbTextTertiary)
                }
            }
        }
    }
}

@Composable
private fun LabelPicker(
    artists: List<String>,
    selected: SnapshotStateList<String>,
    busy: Boolean,
    onConfirm: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(artists, key = { it }) { name ->
                val isSelected = selected.contains(name)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            if (isSelected) selected.remove(name) else selected.add(name)
                        }
                        .padding(vertical = 12.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(name, style = MaterialTheme.typography.bodyLarge, color = RbTextPrimary, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(CircleShape)
                            .background(if (isSelected) RbAccent else RbSurfaceLight),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (isSelected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
        GradientButton(
            text = if (selected.isEmpty()) "Select artists" else "View as label (${selected.size})",
            onClick = onConfirm,
            enabled = selected.isNotEmpty() && !busy,
            loading = busy,
            modifier = Modifier.padding(20.dp),
        )
    }
}
