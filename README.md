# Aria2 card

> Aria2 card for [Home Assistant](https://www.home-assistant.io/) Lovelace UI

![screenshot](./doc/card.jpg)

## Installing

This card work only when the integration [aria2-integration](https://github.com/deblockt/hass-aria2) in installed.

Copy the file `src/aria2-card.js` on your `configuration/www/` directory. Reload your home assistant frontend.

You can now add the card on your lovelace ui using `custom card` and with the yaml

``` yaml
type: custom:aria2-card
```

## Configuration

There are no configuration available for this card.

By default, only 10 downloads are displayed by the card.