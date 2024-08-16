import __LitElement from '@lotsof/lit-element';

import __AdvancedSelectElement from '@lotsof/advanced-select-element';

import { __isInIframe } from '@lotsof/sugar/is';
import { __set } from '@lotsof/sugar/object';
import { __upperFirst } from '@lotsof/sugar/string';

import { __iframeAutoSize, __injectHtml } from '@lotsof/sugar/dom';

import '@lotsof/json-schema-form';

import __logos from './logos.js';

import { html } from 'lit';
import { property, state } from 'lit/decorators.js';

import { TAdvancedSelectElementItemsFunctionApi } from '@lotsof/advanced-select-element/src/js/AdvancedSelectElement.js';
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
          const componentsItems = Object.entries(this.specs.components).map(
            ([id, component]) => {
              return {
                id,
                value: id,
                label: component.name,
              };
            },
          );

          return componentsItems;
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
        ${this._renderComponents()} ${this._renderComponents()}
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
      <h1 class="${this.cls('_topbar-title')}">Factory</h1>
      ${this.currentComponent
        ? html`<div class="${this.cls('_topbar-component')}">
            <h2 class="${this.cls('_topbar-component-name')}">
              ${__upperFirst(this.currentComponent.name)}
            </h2>
            <p class="${this.cls('_topbar-component-version')}">
              ${this.currentComponent.version}
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
      <s-factory-command-panel>
        <input type="text" class="s-input" placeholder="Type something..." />
      </s-factory-command-panel>
    </nav>`;
  }

  private _renderEditor(): any {
    return html`<div class="${this.cls('_editor')}">
      <div class="${this.cls('_editor-inner')}">
        <s-json-schema-form
          @sJsonSchemaForm.update=${(e: CustomEvent) => {
            this._applyUpdate({
              ...e.detail.update,
              component: this._currentComponent,
            });
          }}
          id="s-factory-json-schema-form"
          name="s-factory-json-schema-form"
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
