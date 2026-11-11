/**
 * Owned concern: compose the controlled browser's input profile and opt-in diagnostics.
 * @baseline GH-3765: Linux headless device defaults can differ from desktop Windows.
 * @decision Declare mouse capabilities at launch; touch cases opt into native emulation.
 * @consequence Focus tests exercise actual CSS media branches without changing product styles.
 */
import { configureChromiumNetworkDiagnostics } from './cypress/node/chromiumNetworkDiagnostics';

function prepareDesktopBrowser(
  browser: Cypress.Browser,
  launch: Cypress.BeforeBrowserLaunchOptions
): Cypress.BeforeBrowserLaunchOptions {
  if (browser.family !== 'chromium') return launch;
  const prefix = '--blink-settings=';
  const settings = new Map(
    launch.args
      .filter((argument) => argument.startsWith(prefix))
      .flatMap((argument) => argument.slice(prefix.length).split(','))
      .map((setting): [string, string] => {
        const separator = setting.indexOf('=');
        return separator < 0
          ? [setting, 'true']
          : [setting.slice(0, separator), setting.slice(separator + 1)];
      })
  );
  settings.set('primaryHoverType', '2');
  settings.set('availableHoverTypes', '2');
  settings.set('primaryPointerType', '4');
  settings.set('availablePointerTypes', '4');
  // Chromium reads one blink-settings argument: retain other callers' settings in it.
  launch.args = launch.args.filter((argument) => !argument.startsWith(prefix));
  launch.args.push(prefix + [...settings].map(([name, value]) => `${name}=${value}`).join(','));
  return launch;
}

export default {
  video: false,
  screenshotOnRunFailure: true,
  e2e: {
    setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
      return configureChromiumNetworkDiagnostics(on, config, prepareDesktopBrowser);
    },
    baseUrl: 'http://127.0.0.1:4173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
};
