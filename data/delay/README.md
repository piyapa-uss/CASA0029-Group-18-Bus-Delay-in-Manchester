# `data/delay/` — Bus Delay Dashboard data

This folder holds everything the **Delay & Reliability Dashboard**
([`js/delay.js`](../../js/delay.js)) needs to run, plus the upstream
processing notebooks that document how those inputs were produced.

## What the dashboard actually loads

These three files are the runtime payload — the dashboard fetches them
on page load and nothing else:

| File | Purpose |
|---|---|
| `network_routes.json`  | One record per `(route_short_name, direction_id)` — ordered stops, the routed `path` polyline, and per-period weighted stats. Drives the network map, KPIs, and the route ranking list. |
| `route_details.json`   | Per-route, per-stop, per-period medians + on-time % + a sampled set of raw delay observations. Drives the scatter plot, heatmap, and stop-level KPIs in the route-detail tab. |
| `gm_lad.geojson`       | Greater Manchester Local Authority District boundaries (10 polygons). Rendered as a soft context layer behind the routes and used to label heatmap cells with their LAD name. |

## How those files are built

The dashboard inputs are produced by **`process_delay_data_v4.ipynb`**.
It reads three intermediate aggregator outputs from `stop_metrics/`
(see below) and writes `network_routes.json` + `route_details.json`.

* If `stop_metrics/` is empty or incomplete on first run, the notebook's
  Section 0 cell automatically downloads and extracts the bundle from a
  shared SharePoint folder, so the project can be reproduced end-to-end
  without the raw GTFS feed.
* `gm_lad.geojson` is a one-shot conversion of `gm_lad.gpkg` to
  WGS84 GeoJSON (simplified at ~5 m tolerance) so Leaflet can read it
  in the browser.

## `stop_metrics/` — intermediate aggregator outputs

Per-stop delay statistics extracted from one observation window of
real-time GTFS data. Six files:

* `stop_metrics_v2.gpkg` — per-stop metrics with route geometries
  (the `routes` layer here is what gives us the routed polylines).
* `stop_metrics_weekday_v2.csv` / `stop_metrics_weekend_v2.csv` —
  same per-stop metrics in flat CSV form, split by day type.
* `stop_metrics_all_v2.csv` — combined view (currently unused by the
  dashboard pipeline, kept for completeness).
* `routes_v2.geojson` — the `routes` layer in GeoJSON form
  (kept as a sidecar for tools that prefer GeoJSON over GeoPackage).
* `meta_v2.csv` — per-day metadata for the observation window
  (date, weekday, day type, totals, on-time tolerance, etc.).

These files are not generated in this project — they come out of the
upstream pipeline described next.

## `gtfs_analysis_v2.ipynb` and `gtfs_analysis_data_aggregate_v2.ipynb` — *evidence only*

These two notebooks document the **upstream pipeline that produced
`stop_metrics/`** — they are kept here purely as evidence of how the
data was processed, *not* to be re-run inside this project:

* **`gtfs_analysis_v2.ipynb`** ingests raw GTFS-Realtime arrival feeds,
  joins them against the GTFS-Static schedule, computes per-trip delay
  observations, and routes the inter-stop links to OSM road geometry.
  The original feed dump is several gigabytes per day across the
  observation window and is **too large to redistribute**, which is
  why the notebook is shipped with its outputs embedded but the inputs
  are not included.
* **`gtfs_analysis_data_aggregate_v2.ipynb`** takes the per-trip
  observations from the previous step and aggregates them into the
  per-stop, per-period statistics that land in `stop_metrics/`.

Treat both notebooks as documentation. Re-running them from scratch
requires the raw GTFS-RT bundle, which is not in this repo.
`process_delay_data_v4.ipynb` is the only notebook in this folder that
is intended to be re-run by anyone working on this project.

## Reproducing the dashboard from scratch

```text
1. Open process_delay_data_v4.ipynb.
2. Run all cells. Section 0 will populate stop_metrics/ if needed
   (downloading from SharePoint the first time).
3. The notebook overwrites network_routes.json and route_details.json
   in this folder. Reload the dashboard to see the new data.
```
