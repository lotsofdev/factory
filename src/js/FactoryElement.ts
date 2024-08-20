import __LitElement from '@lotsof/lit-element';

import __AdvancedSelectElement from '@lotsof/advanced-select-element';

import { __i18n } from '@lotsof/i18n';

import { __isInIframe } from '@lotsof/sugar/is';
import { __set } from '@lotsof/sugar/object';
import { __upperFirst } from '@lotsof/sugar/string';

import { __iframeAutoSize, __injectHtml } from '@lotsof/sugar/dom';

import '@lotsof/json-schema-form';

import __logos from './logos.js';

import { html } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  TAdvancedSelectElementItem,
  TAdvancedSelectElementItemsFunctionApi,
} from '@lotsof/advanced-select-element';
import '../../src/css/FactoryElement.css';
import {
  TFactoryComponent,
  TFactoryComponentJson,
  TFactoryMediaQuery,
  TFactorySpecs,
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
  public commandPanelHotkey: string = 'ctrl+p';

  @state()
  // @ts-ignore
  public specs: TFactorySpecs = {};

  @state()
  public _currentComponent: TFactoryComponent | null = null;

  @state()
  public _currentComponentId: string = '';

  @state()
  public _currentMediaQuery: string = '';

  private _$iframe?: HTMLIFrameElement;
  private _$canvas?: HTMLDivElement;

  constructor() {
    super();
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
      this.$iframeDocument?.documentElement as Element,
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
  }

  private _initCommandPanel(): void {
    __AdvancedSelectElement.define(
      's-factory-command-panel',
      __AdvancedSelectElement,
      {
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
                    label: `${__upperFirst(component.name)} - ${engine}`,
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
            default:
              return [
                {
                  id: '/',
                  value: '/',
                  preventClose: true,
                  preventSelect: true,
                  label: `<span class="s-factory-command-panel_prefix">/</span>${__i18n(
                    'Components',
                  )}`,
                },
                {
                  id: '!',
                  value: '!',
                  preventClose: true,
                  preventSelect: true,
                  label: `<span class="s-factory-command-panel_prefix">!</span>${__i18n(
                    'Switch engine',
                  )}`,
                },
                {
                  id: '@',
                  value: '@',
                  preventClose: true,
                  preventSelect: true,
                  label: `<span class="s-factory-command-panel_prefix">@</span>${__i18n(
                    'Media queries',
                  )}`,
                },
              ];

              break;
          }
        },
      },
    );
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
    if (!this.currentComponent) {
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
    this.currentComponent.values = json.values;

    this._setIframeContent(json.html);

    this.requestUpdate();
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
    // update the factory
    this.requestUpdate();
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
                              ${__logos[engine] || engine}
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
      <h1 class="${this.cls('_topbar-title')}">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 40H40V40C40 34.4772 35.5228 30 30 30H10V40Z"
            fill="url(#paint0_radial_3_41)"
            fill-opacity="0.3"
          />
          <path
            d="M0 30H20V35C20 37.7614 17.7614 40 15 40H10C4.47715 40 0 35.5228 0 30V30Z"
            fill="#FFD500"
          />
          <path
            d="M0 5C0 2.23858 2.23858 0 5 0H10C15.5228 0 20 4.47715 20 10V10H0V5Z"
            fill="#FFD500"
          />
          <path
            d="M10 10C10 4.47715 14.4772 0 20 0H35C37.7614 0 40 2.23858 40 5V10H10V10Z"
            fill="url(#paint1_radial_3_41)"
          />
          <path
            d="M20 25H40V20C40 17.2386 37.7614 15 35 15H20V25Z"
            fill="#FFD500"
          />
          <path
            d="M0 15H30V15C30 20.5228 25.5228 25 20 25H0V15Z"
            fill="url(#paint2_radial_3_41)"
          />
          <defs>
            <radialGradient
              id="paint0_radial_3_41"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(40 40) rotate(-162.429) scale(31.4682 94.4047)"
            >
              <stop stop-color="#E7DFBD" />
              <stop offset="1" stop-color="#FBF6E5" />
            </radialGradient>
            <radialGradient
              id="paint1_radial_3_41"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(10) rotate(18.4349) scale(31.6228 94.8683)"
            >
              <stop stop-color="#FFFCEE" />
              <stop offset="1" stop-color="#E3DBB5" />
            </radialGradient>
            <radialGradient
              id="paint2_radial_3_41"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(-2.01166e-06 25) rotate(-18.4349) scale(31.6228 94.8683)"
            >
              <stop stop-color="#E4DBB6" />
              <stop offset="1" stop-color="#FBF7E6" />
            </radialGradient>
          </defs>
        </svg>
      </h1>
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
              ${__logos[this.currentEngine] || this.currentEngine}
            </p>
          </div>`
        : ''}
    </nav>`;
  }

  private _renderBottombar(): any {
    return html`<nav class="${this.cls('_bottombar')}">
      ${this._renderMediaQueries()}
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
          let engine: string, id: string;
          switch (true) {
            case e.detail.item.value.startsWith('/'):
            case e.detail.item.value.startsWith('!'):
              [id, engine] = e.detail.item.value.slice(1).split('/');
              this.selectComponent(id, engine);
              break;
            case e.detail.item.value.startsWith('@'):
              const mediaQuery = e.detail.item.value.slice(1);
              this.selectMediaQuery(mediaQuery);
              break;
          }
        }}
      >
        <input
          type="text"
          class="s-input"
          placeholder=${__i18n(`Command panel (${this.commandPanelHotkey})`)}
        />
      </s-factory-command-panel>
    </nav>`;
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
    `;
  }
}

FactoryElement.define('s-factory', FactoryElement);
