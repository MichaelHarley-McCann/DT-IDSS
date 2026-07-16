# Static JSON feeds

Place provided `.json` feed files in `data/` or this folder. The `/static-feeds` page reads every JSON file under `data/` at render time and builds a consolidated view.

Supported shapes:

- a single JSON object
- an array of JSON objects
- an object with a top-level array such as `items`, `records`, `data`, `results`, `listings`, `details`, or `spaces`
