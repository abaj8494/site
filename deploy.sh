#!/bin/bash

# Exit on error
set -e

# 1. Remove the old public folder
rm -rf public

# 2. Build the static site (not the server)
hugo --baseURL https://abaj.ai --appendPort=false --poll 1s --disableFastRender

# 3. Deploy the site using rsync
rsync -vrP ~/Documents/new-site/public/ root@67.219.99.58:/var/www/ai/ \
  --exclude={/projects/dl/kmnist/data/,/code/bookshelf/.git,/code/tikzjax/node_modules/}

