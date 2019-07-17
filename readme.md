# HelpSpot Style Userscript

This script provides some formatting and display tweaks for HelpSpot workspaces and requests. It was made for our specific HelpSpot implementation, but with a little bit of JavaScript and RegEx you should be able to adapt it for your implementation, too.

## Features

The script as I've made it does the following:

On workspace pages:

1. Styles all contents of the workspace table with a monospace font with no underlined headers

2. Shortens and color-codes some request categories, statuses, and inbox labels

3. Displays only the domain of client email addresses, and bolds client emails and IDs

4. Shortens request ages by reformatting `## hours, ## minutes` to `##h ##m` and left-pads single-digit numbers to align places vertically (supports `min`, `hour`, `day`, `week`, `month` units)

5. Adds hover text to "Initial Request", "Latest Public Note" and similar fields, allowing a longer preview of the request than just what is displayed

On request pages: the script detects the request page but does not do anything yet.

## Installation

Once installed, the script should automatically update itself when a new version is pushed to master.

1. Install the Tampermoney extension for Chrome or Firefox

2. Navigate to the Tampermoney dashboard

3. Navigate to the Utilities tab

4. In "Install from URL", enter the URL for the raw contents of script.js on master: `https://raw.githubusercontent.com/Dibasic/helpspot-style-userscript/master/script.js`

5. Click "Install" to confirm when prompted

6. To upgrade the script manually, click the Tampermonkey badge in your browser and then "Check for userscript updates"

## Workspace Setup

The script was made to work with my own custom filters. Contact me if you are my coworker and would like access to this filter. Otherwise, the settings for my "queue" filter are below.

### Match `all` of the following conditions

| Field         |      | Value            |
|---------------|------|------------------|
| `Assigned To` | `Is` | `Logged In User` |
| `Open/Closed` | `Is` | `Open`           |

### Order `Last Public Update` `Descending`

### Columns to display

| Field                   | Width |
|-------------------------|-------|
| `Replied To`            | `10`  |
| `Category`              | `20`  |
| `Status`                | `120` |
| `Age`                   | `60`  |
| `Public Update Count`   | `2`   |
| `Customer ID`           | `80`  |
| `Customer`              | `110` |
| `Initial Request`       | `\*`  |
| `Latest Public Note`    | `\*`  |
| `Attachments`           | `16`  |
| `Latest Public Note By` | `120` |

*\* this column always fills*

## Customization

I've made the script modular enough to add features easily if you know some JavaScript. The script first identifies whether the page is a "workspace" (e.g. the main inbox or your queue) or a "request" (e.g. an individual ticket), assembles a list of functions for each, and then runs each in series. When it detects the automatic refresh popup, it runs the functions again. To add a new feature, implement it as a function in that list.

If you make a feature that you like, please feel free to submit a pull request. Pull requests should be either generic and useful for any future downstreams or specific to our implementation.

## Licensing

This script is released under the MIT License and is provided without warranty. You are free to fork this script and adapt it to your own implementation. Please contact me directly if you are interested in my help with a custom implementation or need a specific relicense.