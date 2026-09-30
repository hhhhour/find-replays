# Find Wesnoth Replays

This is a small script to find and download [replays](https://replays.wesnoth.org/) from the [Battle for Wesnoth](https://wesnoth.org/) multiplayer server.

## Usage

> You must have [node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed.

Copy the example `.env` file.

```
cp .env.example .env
```

Set the correct Wesnoth server `VERSION` and the `START_DATE` for your searches in the `.env` file.

```
VERSION="1.18"
START_DATE="2026-08-30"
```

Create a `search.txt` file in the root directory.

```
touch search.txt
```

Add search terms to `search.txt` to identify replays you want to download. The following example shows search terms that will download all replays where the download filename includes `scenario_one` or `scenario_two`.

```
save:scenario_one
save:scenario_two
```

Once you have created the `search.txt` file, run the following command.

```
node ./search.js`
```

The script will download matching replays between the `START_DATE` and yesterday. Replays will appear in the `./replays` directory.

## Search Parameters

The following search parameters are supported in the `search.txt` file.

| Example | Match |
| --- | --- |
| `save:chapter_1` | Match all replays with a save filename that includes the phrase `chapter_1`. |
| `title:hhour` | Match all replays where the `title:` section of the Description includes the phrase `hhour`. |
| `modifications:plan_unit_advance` | Match all replays where the `modifications:` section of the Description includes the phrase `plan_unit_advance`. |
| `era:era_dunefolk_heroes` | Match all replays where the `era:` section of the Description includes the phrase `era_dunefolk_heroes`. |
| `players:synn` | Match all replays where the `players:` section of the Description includes the phrase `synn`. |

All searches are case insensitive. One search term per line. Search results return partial matches. For example, a search for `era:era_default` will return replays that make use of the modifications `era_default` or `era_default_heroes`.
