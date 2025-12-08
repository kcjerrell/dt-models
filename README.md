# dt-models

The scripts in this repo fetch and compile all the metadata for every model in the Draw Things [community-models](https://github.com/drawthingsai/community-models) repo. 

It also fetches and parses metadata for the official models in the [draw-things-community](https://github.com/drawthingsai/draw-things-community) repo. (Note: since the official models have to be parsed from Swift, not *all* metadata is present, but the metadata is hardcoded into the app and the CLI anyway. This exists to match a friendly name and model version for each model filename.)

For convenience, these scripts will run periodically and publish the latest data at the following URLs:
- https://kcjerrell.github.io/dt-models/official_models.json
- https://kcjerrell.github.io/dt-models/official_controlnets.json
- https://kcjerrell.github.io/dt-models/official_loras.json
- https://kcjerrell.github.io/dt-models/community_models.json
- https://kcjerrell.github.io/dt-models/community_controlnets.json
- https://kcjerrell.github.io/dt-models/community_loras.json
- https://kcjerrell.github.io/dt-models/community_embeddings.json
- https://kcjerrell.github.io/dt-models/uncurated_models.json
