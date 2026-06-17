# OrderEnvy API v1

Base URL (local): `http://localhost:1979/api/v1`
Base URL (Vercel): `https://<your-app>.vercel.app/api/v1`

## Authentication

Most write endpoints require `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register new account |
| GET | `/auth/confirm/:token` | No | Confirm email (`?from=&inviteToken=` optional) |
| POST | `/auth/login` | No | Login → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | No | Body: `{ refreshToken }` |
| POST | `/auth/logout` | No | Body: `{ refreshToken }` |
| POST | `/auth/forgot-password` | No | Body: `{ email }` |
| POST | `/auth/reset-password` | No | Body: `{ token, newPassword }` |

## Restaurants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants` | Optional | List restaurants (`?lat=&long=&filterDist=25`) |
| GET | `/restaurants/:id` | Optional | Restaurant detail |
| POST | `/restaurants` | Yes | Create restaurant |
| PUT | `/restaurants/:id` | Yes | Update restaurant |
| DELETE | `/restaurants/:id` | Yes | Delete restaurant |
| GET | `/restaurants/:id/checkin` | Yes | Check-in form data |
| POST | `/restaurants/:id/checkin` | Yes | Submit check-in |
| GET | `/restaurants/meta/ratings` | No | Rating emoji metadata |

## Menu Items

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/menu-items/categories` | No | Category list |
| POST | `/restaurants/:id/menu-items` | Yes | Create menu item |
| GET | `/restaurants/:id/menu-items/:menuItemId` | Yes | Menu item detail |
| PUT | `/restaurants/:id/menu-items/:menuItemId` | Yes | Update menu item |
| DELETE | `/restaurants/:id/menu-items/:menuItemId` | Yes | Delete menu item |

## Ratings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/restaurants/:id/ratings` | Yes | Rate restaurant |
| POST | `/restaurants/:id/menu-items/:menuItemId/ratings` | Yes | Rate menu item |
| GET | `/restaurants/:id/ratings/:ratingId` | Yes | Get rating |
| PUT | `/restaurants/:id/ratings/:ratingId` | Yes | Update rating |
| DELETE | `/restaurants/:id/ratings/:ratingId` | Yes | Delete rating |

## Notes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/notes` | Yes | Get note on restaurant |
| POST | `/restaurants/:id/notes` | Yes | Upsert note (`{ body }`) |
| GET | `/restaurants/:id/menu-items/:menuItemId/notes` | Yes | Get note on menu item |
| POST | `/restaurants/:id/menu-items/:menuItemId/notes` | Yes | Upsert note |

## Lists

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/lists` | Yes | User's lists |
| POST | `/lists` | Yes | Create list (`{ name }`) |
| GET | `/lists/:id` | Yes | List detail |
| PUT | `/lists/:id` | Yes | Update list |
| DELETE | `/lists/:id` | Yes | Delete list |
| POST | `/lists/:id/restaurants/:restaurantId` | Yes | Add restaurant |
| DELETE | `/lists/:id/restaurants/:restaurantId` | Yes | Remove restaurant |

## Friends

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/friends/requests` | Yes | Pending friend requests |
| POST | `/friends/request` | Yes | Request friend (`{ username }` or `{ email }`) |
| POST | `/friends/invite` | Yes | Invite by email (`{ email }`) |
| POST | `/friends/confirm/:token` | Yes | Confirm friend request |
| DELETE | `/friends/decline/:token` | Yes | Decline request |
| GET | `/friends/:friendId/activity` | Yes | Friend's recent ratings |
| DELETE | `/friends/:friendId` | Yes | Remove friend |

## Recommendations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recommendations` | Yes | Recommendations for user |
| POST | `/recommendations` | Yes | Create (`{ friendId, restaurantId, menuItemId? }`) |
| DELETE | `/recommendations/:id` | Yes | Delete recommendation |

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Current user profile |
| GET | `/users/:id` | Yes | User profile (self only) |
| PUT | `/users/:id` | Yes | Update profile |
| DELETE | `/users/:id` | Yes | Delete account |

## Location

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/location/latlong/:address` | No | Geocode address |
| GET | `/location/address?lat=&long=` | No | Reverse geocode |

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | `{ ok: true, version: "v1" }` |

## Example: Login and check-in

```bash
# Health check
curl http://localhost:1979/api/v1/health

# Login
curl -X POST http://localhost:1979/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"you@example.com","password":"yourpassword"}'

# List restaurants (with token)
curl http://localhost:1979/api/v1/restaurants \
  -H "Authorization: Bearer <accessToken>"

# Check in
curl -X POST http://localhost:1979/api/v1/restaurants/<restaurantId>/checkin \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"<restaurantId>":{"rating":4,"comment":"Great overall"},"<menuItemId>":{"checked":true,"rating":5,"comment":"Amazing"}}'
```
