import __LitElement from '@lotsof/lit-element';

import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import __AdvancedSelectElement from '@lotsof/advanced-select-element';

import { __i18n } from '@lotsof/i18n';

import __logoFactory from './assets/logoFactory.js';

import { __isInIframe } from '@lotsof/sugar/is';
import { __set } from '@lotsof/sugar/object';
import { __upperFirst } from '@lotsof/sugar/string';

import {
  __getFormValues,
  __iframeAutoSize,
  __injectHtml,
} from '@lotsof/sugar/dom';

import '@lotsof/json-schema-form';

import __logos from './logos.js';

import __saveComponentValuesSchema from './saveValues/saveValues.schema.json' assert { type: 'json' };

import { html } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  TAdvancedSelectElementItem,
  TAdvancedSelectElementItemsFunctionApi,
} from '@lotsof/advanced-select-element';
import { __hotkey } from '@lotsof/sugar/keyboard';
import { THotkeySettings } from '../../../sugar/src/js/keyboard/hotkey.js';
import '../../src/css/FactoryElement.css';
import {
  TFactoryComponent,
  TFactoryComponentJson,
  TFactoryMediaQuery,
  TFactoryNotification,
  TFactorySpecs,
  TFactoryState,
  TFactoryUpdateObject,
} from '../shared/factory.types.js';

export default class FactoryElement extends __LitElement {
  @property({ type: String })
  public src: string = '/api/specs';

  @property({ type: Object })
  public mediaQueries: Record<string, TFactoryMediaQuery> = {};

  @property({ type: String })
  public mediaQuery: string = 'desktop';

  @property({ type: String })
  public commandPanelHotkey: string = 'cmd+p';

  @property({ type: String })
  public darkModeClass: string = '-dark';

  @state()
  // @ts-ignore
  public specs: TFactorySpecs = {};

  @state()
  public _notifications: TFactoryNotification[] = [];

  @state()
  public _currentComponent: TFactoryComponent | null = null;

  @state()
  public _currentComponentId: string = '';

  @state()
  public _currentMediaQuery: string = '';

  @state()
  public _currentAction: 'saveValues' | null = null;

  @state()
  protected _state: TFactoryState = {};

  private _$iframe?: HTMLIFrameElement;
  private _$canvas?: HTMLDivElement;

  constructor() {
    super('s-factory');
    this.saveState = true;
  }

  public get currentEngine(): string | undefined {
    if (!this.currentComponentId) {
      return;
    }

    const matches = document.location.pathname.match(
      /^\/component\/[a-zA-Z0-9_-]+\/([^\/]+)/,
    );

    if (!matches) {
      return this.currentComponent?.engines[0];
    }

    return matches?.[1];
  }

  public get $commandPanel(): __AdvancedSelectElement {
    return this.querySelector(
      '#s-factory-command-panel',
    ) as __AdvancedSelectElement;
  }

  public get currentComponent(): TFactoryComponentJson | undefined {
    return this.specs.components[this.currentComponentId as string];
  }

  public get currentComponentId(): string | undefined {
    const matches = document.location.pathname.match(/^\/component\/([^\/]+)/);
    return matches?.[1];
  }

  public get currentMediaQuery(): TFactoryMediaQuery | undefined {
    return this.mediaQueries[this._currentMediaQuery];
  }

  public update(changedProperties: any): void {
    super.update(changedProperties);

    // update the media query
    if (changedProperties.has('_currentMediaQuery')) {
      if (this.currentMediaQuery?.max !== -1) {
        this._$canvas?.style.setProperty(
          '--s-factory-canvas-width',
          this.currentMediaQuery?.max + 'px',
        );
      } else {
        this._$canvas?.style.removeProperty('--s-factory-canvas-width');
      }
      setTimeout(() => {
        this._updateIframeSize();
      }, 300);
    }
  }

  private _updateMediaQueries(): void {
    // get the computed style of the document (iframe)
    const style = this._$iframe?.contentWindow?.getComputedStyle(
      this.$iframeDocument?.body as Element,
    );

    // try to get the media queries from the css variables (sugarcss)
    ['mobile', 'tablet', 'desktop', 'wide'].forEach((media) => {
      const min = parseInt(
          style?.getPropertyValue(`--s-media-${media}-min`) ?? '0',
        ),
        max = parseInt(
          style?.getPropertyValue(`--s-media-${media}-max`) ?? '0',
        );

      if (min || max) {
        const query: TFactoryMediaQuery = {
          name: media,
          min: min ? min : -1,
          max: max ? max : -1,
        };
        this.mediaQueries[media] = query;
      }
    });

    // init the media query if not set
    if (
      !this._currentMediaQuery &&
      Object.keys(this.mediaQueries ?? {}).length
    ) {
      this._currentMediaQuery = Object.keys(this.mediaQueries)[0];
    }

    // make sure we update the UI
    this.requestUpdate();
  }

  private async _fetchSpecs(): Promise<void> {
    // fetch the specs from the server
    const request = await fetch(this.src),
      json = await request.json();
    // set the specs
    this.specs = json;
  }

  public get $iframeDocument(): Document | null | undefined {
    return this._$iframe?.contentDocument;
  }

  async mount() {
    // if not in an iframe, init the environment
    // by creating an iframe and load the factory deamon
    // inside it
    if (__isInIframe()) {
      return;
    }

    // fetch the specs
    await this._fetchSpecs();

    // load the environment by
    // creating the iframe etc...
    await this._initEnvironment();

    // init the listeners like escape key, etc...
    this._initListeners(document);
    this._initListeners(this.$iframeDocument as Document);

    // render component if the current component is set
    if (this.currentComponentId) {
      this._updateComponent(this.currentComponentId, this.currentEngine);
    }

    // init command panel
    this._initCommandPanel();

    // restore the ui mode (light/dark)
    this._restoreUiMode();
  }

  private _initCommandPanel(): void {
    __AdvancedSelectElement.define('s-factory-command-panel', {
      items: (api: TAdvancedSelectElementItemsFunctionApi) => {
        switch (true) {
          case api.search?.startsWith('/'):
            const items: TAdvancedSelectElementItem[] = [];

            for (const [id, component] of Object.entries(
              this.specs.components,
            )) {
              for (let engine of component.engines) {
                items.push({
                  id: `/${id}/${engine}`,
                  value: `/${id}/${engine}`,
                  label: `<div class="${this.cls('_command-panel-component')}">
                        <h3 class="${this.cls(
                          '_command-panel-component-name',
                        )}">${__upperFirst(component.name)}</span>
                        <h4 class="${this.cls(
                          '_command-panel-component-engine',
                        )}">${engine}</h4>
                        ${__logos[engine] || ''}
                      </div>`,
                  preventSet: true,
                  engine,
                });
              }
            }

            return items;
            break;
          case api.search?.startsWith('@'):
            return Object.entries(this.mediaQueries).map(([name, query]) => {
              return {
                id: `@${name}`,
                value: `@${name}`,
                preventSet: true,
                label: `${__upperFirst(query.name)} - ${query.min}px - ${
                  query.max
                }px`,
              };
            });

            break;
          case api.search?.startsWith('!'):
            return Object.entries(this.currentComponent.engines).map(
              ([idx, name]) => {
                return {
                  id: `!${this.currentComponent.name}/${name}`,
                  value: `!${this.currentComponent.name}/${name}`,
                  preventSet: true,
                  label: `${__upperFirst(name as string)}`,
                };
              },
            );

            break;
          case api.search?.startsWith('<'):
            return Object.entries(this.currentComponent.savedValues).map(
              ([key, savedData]) => {
                return {
                  id: `<${key}`,
                  value: `<${key}`,
                  preventSet: true,
                  label: (<any>savedData).name,
                };
              },
            );
            break;
          default:
            return [
              {
                id: '/',
                value: '/',
                preventClose: true,
                preventSelect: true,
                label: `<span class="s-factory-command-panel_prefix"
                      >/</span
                    >${__i18n('Components')}`,
              },
              {
                id: '!',
                value: '!',
                preventClose: true,
                preventSelect: true,
                label: `<span class="s-factory-command-panel_prefix"
                      >!</span
                    >${__i18n('Switch engine')}`,
              },
              {
                id: '@',
                value: '@',
                preventClose: true,
                preventSelect: true,
                label: `<span class="s-factory-command-panel_prefix"
                      >@</span
                    >${__i18n('Media queries')}`,
              },
              {
                id: '<',
                value: '<',
                preventClose: true,
                preventSelect: true,
                label: `<span class="s-factory-command-panel_prefix"
                      >&lt;</span
                    >${__i18n('Load values')}`,
              },
              {
                id: '>',
                value: '>',
                label: `<span class="s-factory-command-panel_prefix"
                      >&gt;</span
                    >${__i18n('Save values')}`,
              },
            ];

            break;
        }
      },
    });
  }

  private _initListeners(context: Document): void {
    // popstate
    window.addEventListener('popstate', (e) => {
      if (e.state.id) {
        this._currentComponentId = e.state.id;
      }
    });

    // show/hide UI
    context.addEventListener('keydown', (e) => {
      switch (true) {
        case e.key === '§':
          this.classList.add('-show-ui');
          break;
      }
    });
    context.addEventListener('keyup', (e) => {
      switch (true) {
        case e.key === '§':
          this.classList.remove('-show-ui');
          e.preventDefault();
          (<any>document.activeElement)?.blur();
          break;
      }
    });

    const hotkeySettings: Partial<THotkeySettings> = {
      ctx: context,
    };
    __hotkey(
      'escape',
      (e) => {
        this._currentAction = null;
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+shift+p',
      (e) => {
        this.$commandPanel?.setSearch('');
        this.$commandPanel?.focus();
      },
      hotkeySettings,
    );

    __hotkey(
      'cmd+p',
      (e) => {
        this.$commandPanel?.setSearch('/');
        this.$commandPanel?.focus();
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+g',
      (e) => {
        this.$commandPanel?.setSearch('@');
        this.$commandPanel?.focus();
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+e',
      (e) => {
        this.$commandPanel?.setSearch('!');
        this.$commandPanel?.focus();
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+l',
      (e) => {
        this.$commandPanel?.setSearch('<');
        this.$commandPanel?.focus();
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+s',
      (e) => {
        this._currentAction = 'saveValues';
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+r',
      (e) => {
        this.randomizeComponentValues(this.currentComponentId as string);
      },
      hotkeySettings,
    );
    __hotkey(
      'cmd+m',
      (e) => {
        this.toggleUiMode();
      },
      hotkeySettings,
    );
  }

  private _initEnvironment(): void {
    this.log(`Init the factory environment...`);
    // move the component into the body
    document.body.appendChild(this);

    // create the canvas
    const $canvas = document.createElement('div');
    $canvas.classList.add(this.cls('_canvas'));
    this._$canvas = $canvas;
    this.appendChild($canvas);

    // create the iframe
    const $iframe = document.createElement('iframe');
    $iframe.classList.add(this.cls('_iframe'));
    __iframeAutoSize($iframe, { width: false, height: true });
    this._$iframe = $iframe;

    // listen for the iframe to be loaded
    $iframe.addEventListener('load', () => {
      this._updateMediaQueries();
    });

    // append the iframe to the body
    $canvas.appendChild($iframe);

    // copy the document into the iframe
    $iframe?.contentWindow?.document.open();
    $iframe?.contentWindow?.document.write(document.documentElement.outerHTML);
    $iframe?.contentWindow?.document.close();

    this.$iframeDocument?.querySelector(`.${this.cls('_iframe')}`)?.remove();
    this.$iframeDocument?.querySelector(this.tagName)?.remove();

    // center the content in the iframe
    const $centerStyle = this._$iframe?.contentDocument?.createElement(
      'style',
    ) as HTMLStyleElement;
    $centerStyle.innerHTML = `
      body {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
    $iframe.contentWindow?.document.head.appendChild($centerStyle);

    // inject the actual website assets into the iframe
    for (let [key, value] of Object.entries(
      this.specs?.config?.project?.assets ?? {},
    )) {
      switch (true) {
        case value.includes('.js') || value.includes('.ts'):
          const $script = this._$iframe?.contentDocument?.createElement(
            'script',
          ) as HTMLScriptElement;
          $script.src = value;
          $script?.setAttribute('type', 'module');
          this._$iframe?.contentDocument?.head.appendChild($script);
          break;
        case value.includes('.css'):
          const $link = this._$iframe?.contentDocument?.createElement(
            'link',
          ) as HTMLLinkElement;
          $link.href = value;
          $link.rel = 'stylesheet';
          this._$iframe?.contentDocument?.head.appendChild($link);
          break;
      }
    }

    // empty page
    document
      .querySelectorAll(
        `body > *:not(${this.tagName}):not(script):not(.${this.cls(
          '_canvas',
        )})`,
      )
      .forEach(($el) => {
        $el.remove();
      });
  }

  private _setIframeContent(html: string): void {
    if (!this._$iframe?.contentDocument) {
      return;
    }
    __injectHtml(this._$iframe.contentDocument.body, html);

    // @TODO    find a better way to resize the iframe correctly
    setTimeout(this._updateIframeSize.bind(this), 50);
    setTimeout(this._updateIframeSize.bind(this), 100);
    setTimeout(this._updateIframeSize.bind(this), 200);
  }

  private _updateIframeSize(): void {
    this._$iframe?.dispatchEvent(
      new CustomEvent('load', {
        bubbles: true,
        cancelable: false,
      }),
    );
  }

  private async _updateComponent(id: string, engine?: string): Promise<void> {
    const component: TFactoryComponent = this.specs.components[id];
    if (!component) {
      return;
    }

    let url = `/api/render/${id}`;
    if (engine) {
      url += `/${engine}`;
    }
    const request = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          values: this.currentComponent?.values ?? {},
        }),
      }),
      json = await request.json();
    component.values = json.values;

    this._setIframeContent(json.html);

    this.requestUpdate();
  }

  public getComponentById(id: string): TFactoryComponent | undefined {
    return this.specs.components[id];
  }

  public selectComponent(id: string, engine?: string): void {
    // compose the url
    let url = `/component/${id}`;
    if (engine) {
      url += `/${engine}`;
    }
    // maintain the history
    history.pushState({ id, engine }, '', url);
    // set the current component
    this._currentComponentId = id;
    // render the new component
    this._updateComponent(id, engine);
  }

  public setComponentValues(id: string, values: any): void {
    const component = this.getComponentById(id);
    if (!component) {
      return;
    }
    component.values = values;
    this._updateComponent(component.name, this.currentEngine);
  }

  public toggleUiMode(): void {
    this.setUiMode(this.state.mode === 'dark' ? 'light' : 'dark');
  }

  private _restoreUiMode(): void {
    if (this.state.mode) {
      this.setUiMode(this.state.mode);
    }
  }

  public setUiMode(mode: 'light' | 'dark'): void {
    this.setState({ mode });
    if (mode === 'light') {
      document.body.classList.remove('-dark');
    } else {
      document.body.classList.add('-dark');
    }
  }

  public randomizeComponentValues(id: string): void {
    const component = this.getComponentById(id);
    if (!component) {
      return;
    }
    // update the component with empty values
    component.values = {};
    this._updateComponent(component.name, this.currentEngine);
  }

  private async _saveComponentValues(
    component: TFactoryComponent,
    name: String,
  ): Promise<void> {
    // post the new values to the server
    const request = await fetch(`/api/saveValues/${component.name}`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          values: component.values,
        }),
      }),
      json = await request.json();

    if (json.errors) {
      console.error(json.errors);
      return;
    }

    // update specs
    await this._fetchSpecs();

    // remove the popin
    this._currentAction = null;

    // @TODO   send a notification
    this._sendNotification({
      id: 'valuesSaved',
      message: `Values saved as ${name}`,
      type: 'success',
      timeout: 2000,
    });
  }

  public selectMediaQuery(name: string): void {
    this._currentMediaQuery = name;
  }

  private async _applyUpdate(update: TFactoryUpdateObject): Promise<void> {
    // set the value into the component
    __set(this.currentComponent?.values, update.path, update.value);

    // update the component
    this._updateComponent(
      this.currentComponentId as string,
      this.currentEngine,
    );
  }

  private _handleCommandPanelSelect(item: TAdvancedSelectElementItem): void {
    let engine: string, id: string;

    switch (true) {
      case item.value.startsWith('/'):
      case item.value.startsWith('!'):
        [id, engine] = item.value.slice(1).split('/');
        this.selectComponent(id, engine);
        break;
      case item.value.startsWith('@'):
        const mediaQuery = item.value.slice(1);
        this.selectMediaQuery(mediaQuery);
        break;
      case item.value.startsWith('>'):
        this._currentAction = 'saveValues';
        break;
      case item.value.startsWith('<'):
        this.setComponentValues(
          this.currentComponent.name,
          this.currentComponent.savedValues[item.value.slice(1)]?.values,
        );
        break;
    }
  }

  private _renderComponents(): any {
    return html`
      ${this.specs.components
        ? html`
            <nav class=${this.cls('_components')}>
              <ol class="${this.cls('_components-list')}">
                ${Object.entries(this.specs.components).map(
                  ([id, component]) => html`
                    <li
                      class="${this.cls('_components-list-item')} ${this
                        .currentComponentId === id
                        ? '-active'
                        : ''}"
                    >
                      <span
                        class="${this.cls('_components-list-item-name')}"
                        @pointerup=${(e) => {
                          this.selectComponent(id);
                        }}
                      >
                        ${component.name}
                      </span>
                      <ol class="${this.cls('_components-list-item-engines')}">
                        ${component.engines.map(
                          (engine) => html`
                            <li
                              class="${this.cls(
                                '_components-list-item-engine',
                              )} ${this.currentEngine === engine
                                ? '-active'
                                : ''}"
                              @pointerup=${(e) => {
                                this.selectComponent(id, engine);
                              }}
                            >
                              ${unsafeHTML(__logos[engine] || engine)}
                            </li>
                          `,
                        )}
                      </ol>
                    </li>
                  `,
                )}
              </ol>
            </nav>
          `
        : ''}
    `;
  }

  private async _sendNotification(
    notification: TFactoryNotification,
  ): Promise<void> {
    this._notifications.push(notification);
    if (notification.timeout) {
      setTimeout(() => {
        this._notifications = this._notifications.filter(
          (n) => n !== notification,
        );
      }, notification.timeout);
    }
  }

  private _renderSidebar(): any {
    return html`<nav class="${this.cls('_sidebar')}">
      <div class="${this.cls('_sidebar-inner')}">
        ${this._renderComponents()}
      </div>
    </nav>`;
  }

  private _renderMediaQueries(): any {
    return html`<nav class="${this.cls('_media-queries')}">
      <ol class="${this.cls('_media-queries-list')}">
        ${Object.entries(this.mediaQueries).map(
          ([name, query]) => html`
            <li
              class="${this.cls('_media-queries-list-item')} ${this
                ._currentMediaQuery === name
                ? '-active'
                : ''}"
              @pointerup=${() => {
                this._currentMediaQuery = name;
              }}
            >
              <span class="${this.cls('_media-queries-list-item-name')}"
                >${query.name}</span
              >
            </li>
          `,
        )}
      </ol>
    </nav>`;
  }

  private _renderTopbar(): any {
    return html`<nav class="${this.cls('_topbar')}">
      <h1 class="${this.cls('_topbar-title')}">${__logoFactory}</h1>
      ${this.currentComponent
        ? html`<div class="${this.cls('_topbar-component')}">
            <h2 class="${this.cls('_topbar-component-name')}">
              ${__upperFirst(this.currentComponent.name)}
            </h2>
            <p class="${this.cls('_topbar-component-version')}">
              ${this.currentComponent.version}
            </p>
            <p class="${this.cls('_topbar-component-engine')}">
              ${__upperFirst(this.currentEngine as string)}
              ${unsafeHTML(__logos[this.currentEngine] || this.currentEngine)}
            </p>
          </div>`
        : ''}
    </nav>`;
  }

  private _renderMode(): any {
    return html`
      <button
        class="${this.cls('_bottombar-mode')} ${this.state.mode === 'dark'
          ? '-active'
          : ''}"
        @pointerup=${() => {
          this.toggleUiMode();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
          <path
            d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"
          />
        </svg>
      </button>
    `;
  }

  private _renderBottombar(): any {
    return html`<nav class="${this.cls('_bottombar')}">
      ${this._renderMediaQueries()} ${this._renderMode()}
    </nav>`;
  }

  private _renderCommandPanel(): any {
    return html`<nav class="${this.cls('_command-panel')}">
      <s-factory-command-panel
        .verbose=${this.verbose}
        id="s-factory-command-panel"
        mountWhen="direct"
        hotkey=${this.commandPanelHotkey}
        @sFactoryCommandPanel.select=${(e) => {
          this._handleCommandPanelSelect(e.detail.item);
        }}
      >
        <input
          type="text"
          class="form-input"
          placeholder=${__i18n(`Command panel (${this.commandPanelHotkey})`)}
        />
      </s-factory-command-panel>
    </nav>`;
  }

  private _renderNotifications(): any {
    if (!this._notifications.length) {
      return;
    }

    return html`
      <div class="${this.cls('_notifications')}">
        <ul class="${this.cls('_notifications-list')}">
          ${this._notifications.map(
            (notification) => html`
              <li
                class="${this.cls('_notifications-item')} ${notification.type
                  ? `-${notification.type}`
                  : ''}"
              >
                <span class="${this.cls('_notifications-message')}">
                  ${notification.message}
                </span>
              </li>
            `,
          )}
      </div>
    `;
  }

  private _renderSaveValuesForm(): any {
    return html`
      <div class="popin">
        <form
          class="${this.cls('_save-values-form')} form"
          @submit=${(e) => {
            e.preventDefault();

            // make sure form is valid
            if (!e.target.checkValidity()) {
              return;
            }

            // save the values
            const formValues = __getFormValues(e.target);
            this._saveComponentValues(this.currentComponent, formValues.name);
          }}
        >
          <s-json-schema-form
            id="s-factory-save-values-form"
            .formClasses=${true}
            .schema=${__saveComponentValuesSchema}
            .values=${{}}
          ></s-json-schema-form>
          <code class="${this.cls('_save-values-form-code')}">
            ${JSON.stringify(this.currentComponent?.values, null, 2)}
          </code>
          <input
            type="submit"
            class="button -full"
            value=${__i18n('Save values')}
          />
        </form>
      </div>
    `;
  }

  private _renderEditor(): any {
    return html`<div class="${this.cls('_editor')}">
      <div class="${this.cls('_editor-inner')}">
        <s-json-schema-form
          id="s-factory-json-schema-form"
          @sJsonSchemaForm.update=${(e: CustomEvent) => {
            this._applyUpdate({
              ...e.detail.update,
              component: this._currentComponent,
            });
          }}
          id="s-factory-json-schema-form"
          name="s-factory-json-schema-form"
          .buttonClasses=${true}
          .formClasses=${true}
          .verbose=${this.verbose}
          .schema=${this.currentComponent?.schema}
          .values=${this.currentComponent?.values ?? {}}
        ></s-json-schema-form>
      </div>
    </div>`;
  }

  public render() {
    return html`
      ${this._renderTopbar()} ${this._renderCommandPanel()}
      ${this._renderSidebar()} ${this._renderEditor()}
      ${this._renderBottombar()}
      ${this._currentAction === 'saveValues'
        ? this._renderSaveValuesForm()
        : ''}
      ${this._renderNotifications()}
    `;
  }
}

FactoryElement.define('s-factory');
