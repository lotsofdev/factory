var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
import '../../src/css/FactoryElement.css';
export default class FactoryElement extends __LitElement {
    constructor() {
        super();
        this.src = '/api/specs';
        this.mediaQueries = {};
        this.mediaQuery = 'desktop';
        this.commandPanelHotkey = 'ctrl+p';
        this.specs = {};
        this._currentComponent = null;
        this._currentComponentId = '';
        this._currentMediaQuery = '';
    }
    get currentEngine() {
        var _a;
        if (!this.currentComponentId) {
            return;
        }
        const matches = document.location.pathname.match(/^\/component\/[a-zA-Z0-9_-]+\/([^\/]+)/);
        if (!matches) {
            return (_a = this.currentComponent) === null || _a === void 0 ? void 0 : _a.engines[0];
        }
        return matches === null || matches === void 0 ? void 0 : matches[1];
    }
    get currentComponent() {
        return this.specs.components[this.currentComponentId];
    }
    get currentComponentId() {
        const matches = document.location.pathname.match(/^\/component\/([^\/]+)/);
        return matches === null || matches === void 0 ? void 0 : matches[1];
    }
    get currentMediaQuery() {
        return this.mediaQueries[this._currentMediaQuery];
    }
    update(changedProperties) {
        var _a, _b, _c, _d;
        super.update(changedProperties);
        // update the media query
        if (changedProperties.has('_currentMediaQuery')) {
            if (((_a = this.currentMediaQuery) === null || _a === void 0 ? void 0 : _a.max) !== -1) {
                (_b = this._$canvas) === null || _b === void 0 ? void 0 : _b.style.setProperty('--s-factory-canvas-width', ((_c = this.currentMediaQuery) === null || _c === void 0 ? void 0 : _c.max) + 'px');
            }
            else {
                (_d = this._$canvas) === null || _d === void 0 ? void 0 : _d.style.removeProperty('--s-factory-canvas-width');
            }
            setTimeout(() => {
                this._updateIframeSize();
            }, 300);
        }
    }
    _updateMediaQueries() {
        var _a, _b, _c, _d;
        // get the computed style of the document (iframe)
        const style = (_b = (_a = this._$iframe) === null || _a === void 0 ? void 0 : _a.contentWindow) === null || _b === void 0 ? void 0 : _b.getComputedStyle((_c = this.$iframeDocument) === null || _c === void 0 ? void 0 : _c.documentElement);
        // try to get the media queries from the css variables (sugarcss)
        ['mobile', 'tablet', 'desktop', 'wide'].forEach((media) => {
            var _a, _b;
            const min = parseInt((_a = style === null || style === void 0 ? void 0 : style.getPropertyValue(`--s-media-${media}-min`)) !== null && _a !== void 0 ? _a : '0'), max = parseInt((_b = style === null || style === void 0 ? void 0 : style.getPropertyValue(`--s-media-${media}-max`)) !== null && _b !== void 0 ? _b : '0');
            if (min || max) {
                const query = {
                    name: media,
                    min: min ? min : -1,
                    max: max ? max : -1,
                };
                this.mediaQueries[media] = query;
            }
        });
        // init the media query if not set
        if (!this._currentMediaQuery &&
            Object.keys((_d = this.mediaQueries) !== null && _d !== void 0 ? _d : {}).length) {
            this._currentMediaQuery = Object.keys(this.mediaQueries)[0];
        }
        // make sure we update the UI
        this.requestUpdate();
    }
    _fetchSpecs() {
        return __awaiter(this, void 0, void 0, function* () {
            // fetch the specs from the server
            const request = yield fetch(this.src), json = yield request.json();
            // set the specs
            this.specs = json;
        });
    }
    get $iframeDocument() {
        var _a;
        return (_a = this._$iframe) === null || _a === void 0 ? void 0 : _a.contentDocument;
    }
    mount() {
        return __awaiter(this, void 0, void 0, function* () {
            // if not in an iframe, init the environment
            // by creating an iframe and load the factory deamon
            // inside it
            if (__isInIframe()) {
                return;
            }
            // fetch the specs
            yield this._fetchSpecs();
            // load the environment by
            // creating the iframe etc...
            yield this._initEnvironment();
            // init the listeners like escape key, etc...
            this._initListeners(document);
            this._initListeners(this.$iframeDocument);
            // render component if the current component is set
            if (this.currentComponentId) {
                this._updateComponent(this.currentComponentId, this.currentEngine);
            }
            // init command panel
            this._initCommandPanel();
        });
    }
    _initCommandPanel() {
        __AdvancedSelectElement.define('s-factory-command-panel', __AdvancedSelectElement, {
            items: (api) => {
                var _a, _b, _c;
                switch (true) {
                    case (_a = api.search) === null || _a === void 0 ? void 0 : _a.startsWith('/'):
                        const items = [];
                        for (const [id, component] of Object.entries(this.specs.components)) {
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
                    case (_b = api.search) === null || _b === void 0 ? void 0 : _b.startsWith('@'):
                        return Object.entries(this.mediaQueries).map(([name, query]) => {
                            return {
                                id: `@${name}`,
                                value: `@${name}`,
                                preventSet: true,
                                label: `${__upperFirst(query.name)} - ${query.min}px - ${query.max}px`,
                            };
                        });
                        break;
                    case (_c = api.search) === null || _c === void 0 ? void 0 : _c.startsWith('!'):
                        return Object.entries(this.currentComponent.engines).map(([idx, name]) => {
                            return {
                                id: `!${this.currentComponent.name}/${name}`,
                                value: `!${this.currentComponent.name}/${name}`,
                                preventSet: true,
                                label: `${__upperFirst(name)}`,
                            };
                        });
                        break;
                    default:
                        return [
                            {
                                id: '/',
                                value: '/',
                                preventClose: true,
                                preventSelect: true,
                                label: `<span class="s-factory-command-panel_prefix">/</span>${__i18n('Components')}`,
                            },
                            {
                                id: '!',
                                value: '!',
                                preventClose: true,
                                preventSelect: true,
                                label: `<span class="s-factory-command-panel_prefix">!</span>${__i18n('Switch engine')}`,
                            },
                            {
                                id: '@',
                                value: '@',
                                preventClose: true,
                                preventSelect: true,
                                label: `<span class="s-factory-command-panel_prefix">@</span>${__i18n('Media queries')}`,
                            },
                        ];
                        break;
                }
            },
        });
    }
    _initListeners(context) {
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
            var _a;
            switch (true) {
                case e.key === '§':
                    this.classList.remove('-show-ui');
                    e.preventDefault();
                    (_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.blur();
                    break;
            }
        });
    }
    _initEnvironment() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
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
        (_a = $iframe === null || $iframe === void 0 ? void 0 : $iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document.open();
        (_b = $iframe === null || $iframe === void 0 ? void 0 : $iframe.contentWindow) === null || _b === void 0 ? void 0 : _b.document.write(document.documentElement.outerHTML);
        (_c = $iframe === null || $iframe === void 0 ? void 0 : $iframe.contentWindow) === null || _c === void 0 ? void 0 : _c.document.close();
        (_e = (_d = this.$iframeDocument) === null || _d === void 0 ? void 0 : _d.querySelector(`.${this.cls('_iframe')}`)) === null || _e === void 0 ? void 0 : _e.remove();
        (_g = (_f = this.$iframeDocument) === null || _f === void 0 ? void 0 : _f.querySelector(this.tagName)) === null || _g === void 0 ? void 0 : _g.remove();
        // center the content in the iframe
        const $centerStyle = (_j = (_h = this._$iframe) === null || _h === void 0 ? void 0 : _h.contentDocument) === null || _j === void 0 ? void 0 : _j.createElement('style');
        $centerStyle.innerHTML = `
      body {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
        (_k = $iframe.contentWindow) === null || _k === void 0 ? void 0 : _k.document.head.appendChild($centerStyle);
        // inject the actual website assets into the iframe
        for (let [key, value] of Object.entries((_p = (_o = (_m = (_l = this.specs) === null || _l === void 0 ? void 0 : _l.config) === null || _m === void 0 ? void 0 : _m.project) === null || _o === void 0 ? void 0 : _o.assets) !== null && _p !== void 0 ? _p : {})) {
            switch (true) {
                case value.includes('.js') || value.includes('.ts'):
                    const $script = (_r = (_q = this._$iframe) === null || _q === void 0 ? void 0 : _q.contentDocument) === null || _r === void 0 ? void 0 : _r.createElement('script');
                    $script.src = value;
                    $script === null || $script === void 0 ? void 0 : $script.setAttribute('type', 'module');
                    (_t = (_s = this._$iframe) === null || _s === void 0 ? void 0 : _s.contentDocument) === null || _t === void 0 ? void 0 : _t.head.appendChild($script);
                    break;
                case value.includes('.css'):
                    const $link = (_v = (_u = this._$iframe) === null || _u === void 0 ? void 0 : _u.contentDocument) === null || _v === void 0 ? void 0 : _v.createElement('link');
                    $link.href = value;
                    $link.rel = 'stylesheet';
                    (_x = (_w = this._$iframe) === null || _w === void 0 ? void 0 : _w.contentDocument) === null || _x === void 0 ? void 0 : _x.head.appendChild($link);
                    break;
            }
        }
        // empty page
        document
            .querySelectorAll(`body > *:not(${this.tagName}):not(script):not(.${this.cls('_canvas')})`)
            .forEach(($el) => {
            $el.remove();
        });
    }
    _setIframeContent(html) {
        var _a;
        if (!((_a = this._$iframe) === null || _a === void 0 ? void 0 : _a.contentDocument)) {
            return;
        }
        __injectHtml(this._$iframe.contentDocument.body, html);
        // @TODO    find a better way to resize the iframe correctly
        setTimeout(this._updateIframeSize.bind(this), 50);
        setTimeout(this._updateIframeSize.bind(this), 100);
        setTimeout(this._updateIframeSize.bind(this), 200);
    }
    _updateIframeSize() {
        var _a;
        (_a = this._$iframe) === null || _a === void 0 ? void 0 : _a.dispatchEvent(new CustomEvent('load', {
            bubbles: true,
            cancelable: false,
        }));
    }
    _updateComponent(id, engine) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.currentComponent) {
                return;
            }
            let url = `/api/render/${id}`;
            if (engine) {
                url += `/${engine}`;
            }
            const request = yield fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    values: (_b = (_a = this.currentComponent) === null || _a === void 0 ? void 0 : _a.values) !== null && _b !== void 0 ? _b : {},
                }),
            }), json = yield request.json();
            this.currentComponent.values = json.values;
            this._setIframeContent(json.html);
            this.requestUpdate();
        });
    }
    selectComponent(id, engine) {
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
    selectMediaQuery(name) {
        this._currentMediaQuery = name;
    }
    _applyUpdate(update) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // set the value into the component
            __set((_a = this.currentComponent) === null || _a === void 0 ? void 0 : _a.values, update.path, update.value);
            // update the component
            this._updateComponent(this.currentComponentId, this.currentEngine);
        });
    }
    _renderComponents() {
        return html `
      ${this.specs.components
            ? html `
            <nav class=${this.cls('_components')}>
              <ol class="${this.cls('_components-list')}">
                ${Object.entries(this.specs.components).map(([id, component]) => html `
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
                        ${component.engines.map((engine) => html `
                            <li
                              class="${this.cls('_components-list-item-engine')} ${this.currentEngine === engine
                ? '-active'
                : ''}"
                              @pointerup=${(e) => {
                this.selectComponent(id, engine);
            }}
                            >
                              ${__logos[engine] || engine}
                            </li>
                          `)}
                      </ol>
                    </li>
                  `)}
              </ol>
            </nav>
          `
            : ''}
    `;
    }
    _renderSidebar() {
        return html `<nav class="${this.cls('_sidebar')}">
      <div class="${this.cls('_sidebar-inner')}">
        ${this._renderComponents()}
      </div>
    </nav>`;
    }
    _renderMediaQueries() {
        return html `<nav class="${this.cls('_media-queries')}">
      <ol class="${this.cls('_media-queries-list')}">
        ${Object.entries(this.mediaQueries).map(([name, query]) => html `
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
          `)}
      </ol>
    </nav>`;
    }
    _renderTopbar() {
        return html `<nav class="${this.cls('_topbar')}">
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
            ? html `<div class="${this.cls('_topbar-component')}">
            <h2 class="${this.cls('_topbar-component-name')}">
              ${__upperFirst(this.currentComponent.name)}
            </h2>
            <p class="${this.cls('_topbar-component-version')}">
              ${this.currentComponent.version}
            </p>
            <p class="${this.cls('_topbar-component-engine')}">
              ${__upperFirst(this.currentEngine)}
              ${__logos[this.currentEngine] || this.currentEngine}
            </p>
          </div>`
            : ''}
    </nav>`;
    }
    _renderBottombar() {
        return html `<nav class="${this.cls('_bottombar')}">
      ${this._renderMediaQueries()}
    </nav>`;
    }
    _renderCommandPanel() {
        return html `<nav class="${this.cls('_command-panel')}">
      <s-factory-command-panel
        .verbose=${this.verbose}
        id="s-factory-command-panel"
        mountWhen="direct"
        hotkey=${this.commandPanelHotkey}
        @sFactoryCommandPanel.select=${(e) => {
            let engine, id;
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
    _renderEditor() {
        var _a, _b, _c;
        return html `<div class="${this.cls('_editor')}">
      <div class="${this.cls('_editor-inner')}">
        <s-json-schema-form
          id="s-factory-json-schema-form"
          @sJsonSchemaForm.update=${(e) => {
            this._applyUpdate(Object.assign(Object.assign({}, e.detail.update), { component: this._currentComponent }));
        }}
          id="s-factory-json-schema-form"
          name="s-factory-json-schema-form"
          .buttonClasses=${true}
          .formClasses=${true}
          .verbose=${this.verbose}
          .schema=${(_a = this.currentComponent) === null || _a === void 0 ? void 0 : _a.schema}
          .values=${(_c = (_b = this.currentComponent) === null || _b === void 0 ? void 0 : _b.values) !== null && _c !== void 0 ? _c : {}}
        ></s-json-schema-form>
      </div>
    </div>`;
    }
    render() {
        return html `
      ${this._renderTopbar()} ${this._renderCommandPanel()}
      ${this._renderSidebar()} ${this._renderEditor()}
      ${this._renderBottombar()}
    `;
    }
}
__decorate([
    property({ type: String })
], FactoryElement.prototype, "src", void 0);
__decorate([
    property({ type: Object })
], FactoryElement.prototype, "mediaQueries", void 0);
__decorate([
    property({ type: String })
], FactoryElement.prototype, "mediaQuery", void 0);
__decorate([
    property({ type: String })
], FactoryElement.prototype, "commandPanelHotkey", void 0);
__decorate([
    state()
    // @ts-ignore
], FactoryElement.prototype, "specs", void 0);
__decorate([
    state()
], FactoryElement.prototype, "_currentComponent", void 0);
__decorate([
    state()
], FactoryElement.prototype, "_currentComponentId", void 0);
__decorate([
    state()
], FactoryElement.prototype, "_currentMediaQuery", void 0);
FactoryElement.define('s-factory', FactoryElement);
//# sourceMappingURL=FactoryElement.js.map