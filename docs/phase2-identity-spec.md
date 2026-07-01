# Faza 2 — Identitate: Organization / Membership / Artist / OrgEntity

Spec de implementare (compat-preserving; user.role rămâne funcțional până la final).
Se execută DUPĂ ce agentul product-features termină pe apps/api.

## Modele noi (schema.prisma)

```prisma
model Organization {
  id        Int      @id @default(autoincrement())
  name      String
  type      String   // ARTIST_TEAM | LABEL | STATION_GROUP | AGENCY
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  memberships Membership[]
  entities    OrgEntity[]
  subscriptions Subscription[]   // Subscription primește organizationId Int? (nullable în tranziție)
  @@map("organizations")
}

model Membership {
  id             Int    @id @default(autoincrement())
  organizationId Int    @map("organization_id")
  userId         Int    @map("user_id")
  role           String // OWNER | ADMIN | MEMBER | VIEWER
  createdAt      DateTime @default(now()) @map("created_at")
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([organizationId, userId])
  @@index([userId])
  @@map("memberships")
}

model Artist {
  id             Int      @id @default(autoincrement())
  name           String
  nameNormalized String   @unique @map("name_normalized") // lower, fără diacritice
  aliases        String[] @default([])
  verified       Boolean  @default(false)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  orgEntities  OrgEntity[]
  claims       ArtistClaim[]
  @@map("artists")
}

model ArtistClaim {
  id        Int      @id @default(autoincrement())
  artistId  Int      @map("artist_id")
  organizationId Int @map("organization_id")
  requestedById  Int @map("requested_by_id")
  evidence  String?  // link Spotify for Artists / distribuitor
  status    String   @default("PENDING") // PENDING | APPROVED | REJECTED
  decidedById Int?   @map("decided_by_id")
  createdAt DateTime @default(now()) @map("created_at")
  decidedAt DateTime? @map("decided_at")
  artist Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  @@index([status])
  @@map("artist_claims")
}

model OrgEntity {
  id             Int  @id @default(autoincrement())
  organizationId Int  @map("organization_id")
  entityType     String // ARTIST | STATION
  artistId       Int? @map("artist_id")
  stationId      Int? @map("station_id")
  createdAt      DateTime @default(now()) @map("created_at")
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  artist  Artist?  @relation(fields: [artistId], references: [id])
  // stationId fără FK către stations? BA DA: FK normal.
  @@unique([organizationId, entityType, artistId, stationId])
  @@index([artistId])
  @@index([stationId])
  @@map("org_entities")
}
```

Plus: `User.memberships Membership[]`; `Subscription.organizationId Int? @map("organization_id")` + relație.

## Backfill (în migrare, SQL sau script seed rulat o dată)
1. Per user activ non-ADMIN: Organization {name: user.name, type: din rol (ARTIST→ARTIST_TEAM,
   LABEL→LABEL, STATION→STATION_GROUP)} + Membership OWNER.
2. Subscription.organizationId = org-ul 1:1 al userId-ului.
3. Artist canonic: din MonitoredSong (distinct artistName per user ARTIST → un Artist cu
   nameNormalized; merge cu LabelArtist.artistName pe nameNormalized). OrgEntity ARTIST pentru
   org-ul artistului (self) și pentru org-ul labelului (roster). UserScope STATION → OrgEntity STATION.
4. Nimic nu se șterge: monitoredSongs/LabelArtist rămân sursa operațională până la P6 (alt val).

## API minim în acest val
- GET /orgs/me — organizațiile userului + entitățile lor (pentru switcher-ul viitor din clienți).
- POST /auth/signup — self-serve: {email, password, name, accountType: artist|label|station}
  → creează user (role din accountType) + org + membership OWNER + trial pe planul premium al
  rolului (trialDays există pe Plan; Subscription status "trialing" fără Stripe). Verificare email:
  trimite cod prin lib/email.ts (env-gated; fără cheie → loghează); userul e activ imediat dar
  emailVerified=false (câmp nou pe User, default false; backfill true pt userii existenți).
  Rate limit strict. Invitațiile rămân pentru enterprise/admin.
- POST /artists/:id/claim {evidence} (org owner/admin) + GET/PATCH /admin/artist-claims (aprobare
  → OrgEntity + Artist.verified=true la dovadă solidă).
- Fallback rol necunoscut pe clienți = ecran eroare (DEJA în spec-urile F5/F6).

## Ce NU intră în acest val (val ulterior "P6")
- Mutarea filtrării pe entitate (rămâne pe monitoredSongs/scopes).
- Org switcher în clienți; seats în billing; ștergerea users.role.
