# [2.1.0](https://github.com/breningham/vite-plugin-exports-updater/compare/v2.0.3...v2.1.0) (2025-08-28)


### Features

* component based exports ([#19](https://github.com/breningham/vite-plugin-exports-updater/issues/19)) ([dc0f0c0](https://github.com/breningham/vite-plugin-exports-updater/commit/dc0f0c090fd2f21e7821ba18e1703ca62424d14e))

## [2.0.3](https://github.com/breningham/vite-plugin-exports-updater/compare/v2.0.2...v2.0.3) (2025-08-28)


### Reverts

* Revert "feat/component based exports ([#15](https://github.com/breningham/vite-plugin-exports-updater/issues/15))" ([#18](https://github.com/breningham/vite-plugin-exports-updater/issues/18)) ([85ca130](https://github.com/breningham/vite-plugin-exports-updater/commit/85ca1303cf5be2a4cce201c787b0703448ffae0b))

## [2.0.2](https://github.com/breningham/vite-plugin-exports-updater/compare/v2.0.1...v2.0.2) (2025-08-21)


### Bug Fixes

* **scss:** correctly export the scss files using the sass key in the package.json ([#12](https://github.com/breningham/vite-plugin-exports-updater/issues/12)) ([dcb1bfd](https://github.com/breningham/vite-plugin-exports-updater/commit/dcb1bfdacf2c155ab0962a247e73baca340c0b7c))

## [2.0.1](https://github.com/breningham/vite-plugin-exports-updater/compare/v2.0.0...v2.0.1) (2025-08-18)


### Bug Fixes

* **CodeQL:** Potential fix for code scanning alert no. 2 ([#2](https://github.com/breningham/vite-plugin-exports-updater/issues/2)) ([5d1cd98](https://github.com/breningham/vite-plugin-exports-updater/commit/5d1cd982b2f8c83e1b090f6d26d2839616b82481))

# [2.0.0](https://github.com/breningham/vite-plugin-exports-updater/compare/v1.2.0...v2.0.0) (2025-08-13)


### Code Refactoring

* simplify CSS handling in buildExportsMap ([5bb1fdb](https://github.com/breningham/vite-plugin-exports-updater/commit/5bb1fdb345cbf9171bf857e878562b161644ac83))


### Features

* enhance entry point and CSS handling in exports updater ([a4d7f78](https://github.com/breningham/vite-plugin-exports-updater/commit/a4d7f788f8cd69c34e8731297e7cd22291716316))


### BREAKING CHANGES

* this commit removes the `css.enabled` option, if you want to disable handling css files, set the css option to `false`

# 1.0.0 (2025-08-13)


### Bug Fixes

* **ci:** correctly use pnpm and setup-node actions ([9b0ee9b](https://github.com/breningham/vite-plugin-exports-updater/commit/9b0ee9be14c3c083103c26c2c0b7f9f8bbfdd687))
* Use Vite's loadConfigFromFile to load vite.config.ts ([47725a6](https://github.com/breningham/vite-plugin-exports-updater/commit/47725a695b4bc73c64f911a876f29fc4af0fbf33))


### Features

* add simple CI ([533f99b](https://github.com/breningham/vite-plugin-exports-updater/commit/533f99befcd043f06d40e1ed90ed0c7a0cab22b4))
* add the ability to disable alias generation ([2864856](https://github.com/breningham/vite-plugin-exports-updater/commit/2864856ab948479914833696f208a193b5555aa7))
* Initial commit of vite-plugin-exports-updater ([e668141](https://github.com/breningham/vite-plugin-exports-updater/commit/e6681410253719b01a3f3655b0bc94ad2ce80f02))
