# TrafficFlow train, validation, and test trajectories

This archive contains raw timestamped trajectory data and matching precomputed feature CSVs for developing an unlabeled clustering model.

| Split | Trajectories | Raw observation rows |
|---|---:|---:|
| Train | 120 | 1,440 |
| Validation | 36 | 432 |
| Test | 36 | 432 |

Each trajectory contains 12 points spaced 30 seconds apart. Raw files use `vehicle_id`, `timestamp_utc`, `latitude`, `longitude`, `speed_kmh`, and `heading_deg`. Feature files contain one row per vehicle with path distance, displacement, speed, start/end/mean coordinates, bearing components, and heading-change features.

Use the feature CSVs for clustering and exclude `vehicle_id` from model inputs. Fit any scaler on train features only; use validation features for tuning and keep test features for a final held-out check. These are unlabeled synthetic examples, so there are no cluster targets or supervised accuracy scores. The matching raw files can be used to develop feature extraction and mapping.

The trajectories are generated examples around a Porto-area map extent, not actual vehicle, road, GPS, or camera data.
