# Static JSON feeds

Place provided `.json` feed files in `data/` or this folder. The `/static-feeds` page reads every JSON file under `data/` at render time and builds a consolidated view.

Supported shapes:

- a single JSON object
- an array of JSON objects
- an object with a top-level array such as `items`, `records`, `data`, `results`, `listings`, `details`, or `spaces`

## Relationship keys

The current static feed set is primarily connected by `account_id`. Records with the same `account_id` should be treated as one consolidated account group:

- `1_account_48212.json`: account-level record with `account_id: 48212` and `account_code: "48212"`.
- `2_listings_48212.json`: listing records with `account_id: 48212`; each listing has its own `account_listing_id`.
- `3_detail_types_48212.json`: account detail records with `account_id: 48212`; each detail row has its own `detail_id` and `detail_type_id`.
- `4_spaces_48212.json`: space record with `account_id: 48212`; the space has its own `account_space_id`.

Other useful identifiers:

- `account_listing_id`: uniquely identifies a listing row inside the listing feed. Use this for listing-specific URLs, debugging, or deduping listing records.
- `detail_id`: uniquely identifies an account detail row. If a future space feed includes `detail_id`, it can join spaces to a specific detail record.
- `detail_type_id` / `detail_type_name`: identify the kind of account detail row, such as `Account Layout` or `CertificationSubmissions`. Field rows inside details repeat `detail_type_id`.
- `account_space_id`: uniquely identifies a space row in the space feed.
- `category_id` / `category_name`: taxonomy values on listings. These are for category/subcategory routing and filtering, not account-level consolidation.
- `geo_code_id` / `geo_code_name`: location taxonomy values on listings, such as `City Center`. These are for region/location display or filtering, not account-level consolidation.
- `parent_account_id` and `parent_space_id`: hierarchy fields. In the current sample they are `0` or `null`, so they do not create an additional join.

Current consolidation rule: group records by `account_id` first. Keep matching listing, detail, and space records as nested arrays under that account rather than overwriting fields with the same name.

Detail-to-space note: in the current static files, `3_detail_types_48212.json` and `4_spaces_48212.json` do not share a direct detail/space join key. They both connect back to the same account through `account_id: 48212`. If a future space feed includes `detail_id`, then spaces can be nested under the matching detail record; without that, spaces should remain account-level child records.

The space table on `/static-feeds` only shows a selected summary of space fields. The full space object is still preserved in the consolidated JSON under `spaces[]`, including fields such as `account_space_id`, `parent_space_id`, `description`, `area_unit`, `dimension`, `amenities`, and `configurations`.
